import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router as api_router
from app.websocket.transcription_handler import TranscriptionSessionHandler
from app.services.vad_service import VadService
from app.services.whisper_service import WhisperService

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("medical_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Medical Transcription & Clinical Summary Backend...")
    logger.info(f"LLM Provider: {settings.LLM_PROVIDER} | Model: {settings.LLM_MODEL}")
    logger.info(f"Whisper Model: {settings.WHISPER_MODEL_SIZE} on {settings.WHISPER_DEVICE}")

    # Pre-warm models asynchronously so startup is fast and first user query is instant
    async def warm_models():
        try:
            logger.info("Pre-warming Silero VAD model...")
            vad = VadService.get_instance()
            logger.info("VAD model ready.")
            logger.info("Pre-warming Whisper model...")
            whisper = WhisperService.get_instance()
            logger.info("Whisper model ready.")
        except Exception as e:
            logger.error(f"Error during model pre-warming: {e}", exc_info=True)

    asyncio.create_task(warm_models())

    yield

    logger.info("Shutting down Medical Transcription Backend...")

app = FastAPI(
    title="AI Medical Transcription & Clinical Summary API",
    description="Real-time speech transcription via VAD & Whisper, and structured clinical summary extraction with LLMs.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router)

# Register WebSocket endpoint
@app.websocket("/ws/transcribe")
async def websocket_transcription_endpoint(websocket: WebSocket):
    handler = TranscriptionSessionHandler(websocket)
    await handler.run()

@app.get("/")
async def root():
    return {
        "app": "AI Medical Transcription & Clinical Summary API",
        "status": "online",
        "docs_url": "/docs",
        "ws_transcribe_url": "/ws/transcribe",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
    )
