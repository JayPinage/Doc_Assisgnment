from typing import Optional, List
from pydantic import BaseModel, Field

class TranscriptSegment(BaseModel):
    id: int = Field(description="Segment index")
    text: str = Field(description="Transcribed text for this segment")
    start: float = Field(default=0.0, description="Start timestamp in seconds")
    end: float = Field(default=0.0, description="End timestamp in seconds")
    is_final: bool = Field(default=True, description="Whether this segment is finalized")

class TranscriptUpdateMessage(BaseModel):
    type: str = Field(default="transcript_update", description="Message type")
    segment: Optional[TranscriptSegment] = Field(default=None, description="Latest transcribed segment")
    full_transcript: str = Field(default="", description="Full cumulative transcript")
    word_count: int = Field(default=0, description="Total word count")
    chunk_count: int = Field(default=0, description="Total speech chunks processed")
    status: str = Field(default="listening", description="Status: listening, speaking, processing, stopped")

class StatusMessage(BaseModel):
    type: str = Field(default="status", description="Message type")
    status: str = Field(description="Current recording/processing status")
    message: Optional[str] = Field(default=None, description="Status detail message")
    word_count: int = Field(default=0)
    chunk_count: int = Field(default=0)

class ErrorMessage(BaseModel):
    type: str = Field(default="error", description="Message type")
    error: str = Field(description="Error message")
    code: Optional[str] = Field(default=None, description="Error code")

class AnalyzeRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="Complete medical consultation transcript to analyze")

class HealthResponse(BaseModel):
    status: str = Field(default="ok")
    whisper_loaded: bool
    vad_loaded: bool
    llm_provider: str
    llm_model: str
