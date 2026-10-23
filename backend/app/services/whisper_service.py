import asyncio
import logging
from typing import Optional, Tuple
import numpy as np
from faster_whisper import WhisperModel
from app.core.config import settings

logger = logging.getLogger(__name__)

class WhisperService:
    _instance: Optional["WhisperService"] = None
    _model: Optional[WhisperModel] = None

    def __init__(self):
        if WhisperService._model is None:
            logger.info(
                f"Loading faster-whisper model '{settings.WHISPER_MODEL_SIZE}' "
                f"on device='{settings.WHISPER_DEVICE}', compute_type='{settings.WHISPER_COMPUTE_TYPE}'..."
            )
            try:
                WhisperService._model = WhisperModel(
                    model_size_or_path=settings.WHISPER_MODEL_SIZE,
                    device=settings.WHISPER_DEVICE,
                    compute_type=settings.WHISPER_COMPUTE_TYPE,
                )
                logger.info("faster-whisper model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load WhisperModel with compute_type={settings.WHISPER_COMPUTE_TYPE}: {e}")
                # Fallback to float32 if int8 is not supported on certain hardware
                logger.info("Attempting fallback to compute_type='float32'...")
                WhisperService._model = WhisperModel(
                    model_size_or_path=settings.WHISPER_MODEL_SIZE,
                    device=settings.WHISPER_DEVICE,
                    compute_type="float32",
                )
                logger.info("faster-whisper model loaded with fallback compute_type='float32'.")

    @classmethod
    def get_instance(cls) -> "WhisperService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def model(self) -> WhisperModel:
        if self._model is None:
            raise RuntimeError("Whisper model is not initialized.")
        return self._model

    def _sync_transcribe(self, audio: np.ndarray) -> str:
        """
        Synchronous transcription of 16kHz float32 audio numpy array.
        Called in a background thread to prevent blocking async event loop.
        """
        if len(audio) == 0:
            return ""

        try:
            # We already have VAD segmented audio, so vad_filter=False
            segments, info = self.model.transcribe(
                audio,
                beam_size=1,
                language="en",
                condition_on_previous_text=False,
                temperature=0.0,
                without_timestamps=True,
            )
            text_parts = []
            for seg in segments:
                text = seg.text.strip()
                if text:
                    text_parts.append(text)
            return " ".join(text_parts).strip()
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}", exc_info=True)
            return ""

    async def transcribe_segment(self, audio: np.ndarray) -> str:
        """
        Asynchronously transcribes an audio segment without blocking the event loop.
        """
        return await asyncio.to_thread(self._sync_transcribe, audio)
