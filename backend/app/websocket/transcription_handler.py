import json
import logging
import time
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.services.audio_processing import bytes_to_float32
from app.services.vad_service import VadService, VadStreamSession
from app.services.whisper_service import WhisperService

logger = logging.getLogger(__name__)

class TranscriptionSessionHandler:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.vad_service = VadService.get_instance()
        self.whisper_service = WhisperService.get_instance()
        self.vad_session: VadStreamSession = self.vad_service.create_session()

        self.full_transcript_segments = []
        self.chunk_count = 0
        self.session_start_time = time.time()
        self.is_active = False
        self.prev_speaking_state = False

    @property
    def full_transcript(self) -> str:
        return " ".join([seg["text"] for seg in self.full_transcript_segments]).strip()

    @property
    def word_count(self) -> int:
        text = self.full_transcript
        return len(text.split()) if text else 0

    async def run(self):
        await self.websocket.accept()
        logger.info("WebSocket client connected to /ws/transcribe")

        await self._send_json({
            "type": "status",
            "status": "ready",
            "message": "Connected to medical transcription server",
            "word_count": 0,
            "chunk_count": 0,
        })

        try:
            while True:
                message = await self.websocket.receive()

                if "bytes" in message and message["bytes"] is not None:
                    # Incoming raw audio data
                    await self._handle_audio_bytes(message["bytes"])
                elif "text" in message and message["text"] is not None:
                    # Incoming control command (JSON)
                    await self._handle_text_control(message["text"])

        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected cleanly.")
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket session: {e}", exc_info=True)
            try:
                await self._send_json({"type": "error", "error": f"Transcription error: {str(e)}"})
            except Exception:
                pass
        finally:
            self._cleanup()

    async def _handle_audio_bytes(self, raw_bytes: bytes):
        """
        Receives raw PCM audio from frontend, runs VAD, and transcribes completed speech chunks.
        """
        if not self.is_active or len(raw_bytes) == 0:
            return

        try:
            # Browser sends 16-bit Int16 PCM at 16kHz
            samples = bytes_to_float32(raw_bytes, dtype="int16")
            if len(samples) == 0:
                return

            completed_segments, is_speaking = self.vad_session.process_samples(samples)

            # Notify frontend of speech activity change (speaking vs listening)
            if is_speaking != self.prev_speaking_state:
                self.prev_speaking_state = is_speaking
                await self._send_json({
                    "type": "status",
                    "status": "speaking" if is_speaking else "listening",
                    "word_count": self.word_count,
                    "chunk_count": self.chunk_count,
                })

            # Process any completed speech segments produced by VAD
            for segment_audio in completed_segments:
                await self._transcribe_and_emit(segment_audio)

        except Exception as e:
            logger.error(f"Error processing audio chunk: {e}", exc_info=True)
            await self._send_json({"type": "error", "error": f"Audio processing error: {str(e)}"})

    async def _transcribe_and_emit(self, segment_audio):
        """
        Transcribes a completed VAD speech segment and emits update to frontend.
        """
        duration_sec = len(segment_audio) / 16000.0
        # Transcribe with faster-whisper asynchronously
        text = await self.whisper_service.transcribe_segment(segment_audio)
        text = text.strip()

        if text:
            self.chunk_count += 1
            segment_data = {
                "id": self.chunk_count,
                "text": text,
                "duration": round(duration_sec, 2),
                "timestamp": round(time.time() - self.session_start_time, 2),
                "is_final": True,
            }
            self.full_transcript_segments.append(segment_data)

            await self._send_json({
                "type": "transcript_update",
                "segment": segment_data,
                "full_transcript": self.full_transcript,
                "word_count": self.word_count,
                "chunk_count": self.chunk_count,
                "status": "listening",
            })
            logger.info(f"Transcribed speech chunk #{self.chunk_count} ({duration_sec:.1f}s): '{text}'")

    async def _handle_text_control(self, raw_text: str):
        try:
            data = json.loads(raw_text)
            command = data.get("type")

            if command == "start":
                logger.info("Session start command received.")
                self.is_active = True
                self.session_start_time = time.time()
                await self._send_json({
                    "type": "status",
                    "status": "recording",
                    "message": "Recording started. Listening for speech...",
                    "word_count": self.word_count,
                    "chunk_count": self.chunk_count,
                })

            elif command == "stop":
                logger.info("Session stop command received. Flushing pending audio...")
                self.is_active = False

                # Flush remaining buffered speech in VAD
                flushed_segments = self.vad_session.flush()
                for segment_audio in flushed_segments:
                    await self._transcribe_and_emit(segment_audio)

                await self._send_json({
                    "type": "status",
                    "status": "stopped",
                    "message": "Recording stopped.",
                    "word_count": self.word_count,
                    "chunk_count": self.chunk_count,
                })

                await self._send_json({
                    "type": "completed",
                    "full_transcript": self.full_transcript,
                    "word_count": self.word_count,
                    "chunk_count": self.chunk_count,
                })

            elif command == "clear":
                logger.info("Session clear command received.")
                self.vad_session.reset()
                self.full_transcript_segments = []
                self.chunk_count = 0
                self.is_active = False
                await self._send_json({
                    "type": "cleared",
                    "status": "ready",
                    "full_transcript": "",
                    "word_count": 0,
                    "chunk_count": 0,
                })

            elif command == "ping":
                await self._send_json({"type": "pong"})

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON control message received: {raw_text}")

    async def _send_json(self, data: dict):
        try:
            await self.websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.warning(f"Could not send JSON message to WebSocket client: {e}")

    def _cleanup(self):
        self.is_active = False
        self.vad_session.reset()
        self.full_transcript_segments.clear()
        logger.info("Cleaned up WebSocket transcription session resources.")
