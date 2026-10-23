import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # LLM Settings
    LLM_PROVIDER: str = Field(default="groq", description="LLM provider: 'groq', 'openai', 'ollama', or 'custom'")
    LLM_API_KEY: str = Field(default="", description="API key for LLM provider")
    LLM_MODEL: str = Field(default="openai/gpt-oss-120b", description="Model name for clinical summary extraction")
    LLM_BASE_URL: str = Field(default="", description="Optional custom base URL for LLM provider")

    # Whisper Settings
    WHISPER_MODEL_SIZE: str = Field(default="base.en", description="Whisper model: 'tiny.en', 'base.en', 'small.en'")
    WHISPER_DEVICE: str = Field(default="cpu", description="Inference device: 'cpu' or 'cuda'")
    WHISPER_COMPUTE_TYPE: str = Field(default="int8", description="Compute type: 'int8', 'float16', 'float32'")

    # Silero VAD Settings
    VAD_THRESHOLD: float = Field(default=0.5, description="Speech threshold (0.0 to 1.0)")
    VAD_MIN_SPEECH_DURATION_MS: int = Field(default=250, description="Minimum speech duration in milliseconds")
    VAD_SILENCE_DURATION_MS: int = Field(default=600, description="Silence duration to trigger end-of-speech in milliseconds")
    VAD_SPEECH_PAD_MS: int = Field(default=300, description="Padding before and after speech in milliseconds")

    # Audio Settings
    AUDIO_SAMPLE_RATE: int = Field(default=16000, description="Target sample rate for VAD and Whisper")

    # Server Settings
    HOST: str = Field(default="0.0.0.0", description="Host address")
    PORT: int = Field(default=8000, description="Server port")
    FRONTEND_ORIGIN: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
        description="Allowed CORS origins comma-separated"
    )

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]

settings = Settings()
