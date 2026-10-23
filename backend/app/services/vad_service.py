import collections
import logging
from typing import List, Optional, Tuple
import numpy as np
import faster_whisper.vad as f_vad
from app.core.config import settings

logger = logging.getLogger(__name__)

class VadService:
    _instance: Optional["VadService"] = None
    _model = None

    def __init__(self):
        if VadService._model is None:
            logger.info("Initializing Silero VAD model...")
            VadService._model = f_vad.get_vad_model()
            logger.info("Silero VAD model initialized successfully.")

    @classmethod
    def get_instance(cls) -> "VadService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def model(self):
        return self._model

    def create_session(
        self,
        threshold: Optional[float] = None,
        min_speech_duration_ms: Optional[int] = None,
        min_silence_duration_ms: Optional[int] = None,
        speech_pad_ms: Optional[int] = None,
        sample_rate: int = 16000,
    ) -> "VadStreamSession":
        return VadStreamSession(
            model=self.model,
            threshold=threshold or settings.VAD_THRESHOLD,
            min_speech_duration_ms=min_speech_duration_ms or settings.VAD_MIN_SPEECH_DURATION_MS,
            min_silence_duration_ms=min_silence_duration_ms or settings.VAD_SILENCE_DURATION_MS,
            speech_pad_ms=speech_pad_ms or settings.VAD_SPEECH_PAD_MS,
            sample_rate=sample_rate,
        )


class VadStreamSession:
    """
    Stateful streaming VAD session for an active WebSocket connection.
    Buffers incoming audio samples, detects speech onset and conclusion using Silero VAD,
    and returns segmented speech audio for transcription.
    """

    def __init__(
        self,
        model,
        threshold: float = 0.5,
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 600,
        speech_pad_ms: int = 300,
        sample_rate: int = 16000,
    ):
        self.model = model
        self.threshold = threshold
        self.sample_rate = sample_rate

        # Silero VAD operates on 512 samples per frame (32ms at 16kHz)
        self.frame_size = 512
        self.frame_duration_ms = (self.frame_size / self.sample_rate) * 1000.0  # 32ms

        self.min_speech_frames = max(1, int(min_speech_duration_ms / self.frame_duration_ms))
        self.min_silence_frames = max(1, int(min_silence_duration_ms / self.frame_duration_ms))
        self.pad_frames_count = max(1, int(speech_pad_ms / self.frame_duration_ms))

        # Ring buffer for pre-speech audio frames
        self.ring_buffer = collections.deque(maxlen=self.pad_frames_count)

        # Active state
        self.triggered = False
        self.speech_frames: List[np.ndarray] = []
        self.silence_frames_count = 0
        self.leftover_samples = np.zeros(0, dtype=np.float32)

        # Statistics
        self.total_speech_segments_detected = 0
        self.is_currently_speaking = False

    def process_samples(self, new_samples: np.ndarray) -> Tuple[List[np.ndarray], bool]:
        """
        Accepts new float32 audio samples.
        Returns a tuple: (list of completed speech segments as np.ndarray, is_speaking boolean).
        """
        if len(new_samples) == 0:
            return [], self.is_currently_speaking

        # Combine leftover samples from previous call with new samples
        if len(self.leftover_samples) > 0:
            audio = np.concatenate([self.leftover_samples, new_samples])
        else:
            audio = new_samples

        num_frames = len(audio) // self.frame_size
        if num_frames == 0:
            self.leftover_samples = audio
            return [], self.is_currently_speaking

        usable_length = num_frames * self.frame_size
        process_audio = audio[:usable_length]
        self.leftover_samples = audio[usable_length:]

        completed_segments = []

        # Process frame by frame
        for i in range(0, usable_length, self.frame_size):
            frame = process_audio[i : i + self.frame_size]
            try:
                # Silero VAD ONNX call: shape (1, 512)
                prob_output = self.model(frame.reshape(1, self.frame_size))
                speech_prob = float(prob_output[0, 0, 0])
            except Exception as e:
                logger.error(f"Error during Silero VAD frame inference: {e}")
                speech_prob = 0.0

            is_speech = speech_prob >= self.threshold

            if not self.triggered:
                # Idle / silence state
                if is_speech:
                    # Speech onset detected!
                    self.triggered = True
                    self.is_currently_speaking = True
                    self.silence_frames_count = 0
                    # Prepend pre-speech ring buffer so beginning consonants are preserved
                    self.speech_frames = list(self.ring_buffer)
                    self.speech_frames.append(frame)
                else:
                    self.ring_buffer.append(frame)
            else:
                # Currently within speech segment
                self.speech_frames.append(frame)
                if is_speech:
                    self.silence_frames_count = 0
                    self.is_currently_speaking = True
                else:
                    self.silence_frames_count += 1
                    # Check if silence duration reached the end-of-speech threshold
                    if self.silence_frames_count >= self.min_silence_frames:
                        self.triggered = False
                        self.is_currently_speaking = False
                        # Only accept if duration is at least min_speech_frames
                        if len(self.speech_frames) >= self.min_speech_frames:
                            segment_audio = np.concatenate(self.speech_frames)
                            completed_segments.append(segment_audio)
                            self.total_speech_segments_detected += 1
                        self.speech_frames = []
                        self.silence_frames_count = 0
                        self.ring_buffer.clear()

        return completed_segments, self.is_currently_speaking

    def flush(self) -> List[np.ndarray]:
        """
        Flushes remaining buffered speech frames when recording stops.
        Ensures that the final spoken phrase is not lost even if silence duration
        was not yet satisfied when user clicked Stop Recording.
        """
        completed = []
        if self.speech_frames and len(self.speech_frames) >= 2:
            segment_audio = np.concatenate(self.speech_frames)
            completed.append(segment_audio)
            self.total_speech_segments_detected += 1

        self.triggered = False
        self.is_currently_speaking = False
        self.speech_frames = []
        self.silence_frames_count = 0
        self.ring_buffer.clear()
        self.leftover_samples = np.zeros(0, dtype=np.float32)

        return completed

    def reset(self):
        """Resets the session state."""
        self.triggered = False
        self.is_currently_speaking = False
        self.speech_frames = []
        self.silence_frames_count = 0
        self.ring_buffer.clear()
        self.leftover_samples = np.zeros(0, dtype=np.float32)
        self.total_speech_segments_detected = 0
