import logging
from fastapi import APIRouter, HTTPException, status
from app.core.config import settings
from app.schemas.transcription import AnalyzeRequest, HealthResponse
from app.schemas.clinical_summary import ClinicalSummaryResponse
from app.services.clinical_analysis_service import ClinicalAnalysisService
from app.services.vad_service import VadService
from app.services.whisper_service import WhisperService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["API"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint verifying system readiness and model loading status.
    """
    vad_ready = False
    whisper_ready = False

    try:
        vad = VadService.get_instance()
        vad_ready = vad.model is not None
    except Exception:
        vad_ready = False

    try:
        whisper = WhisperService.get_instance()
        whisper_ready = whisper.model is not None
    except Exception:
        whisper_ready = False

    return HealthResponse(
        status="ok",
        whisper_loaded=whisper_ready,
        vad_loaded=vad_ready,
        llm_provider=settings.LLM_PROVIDER,
        llm_model=settings.LLM_MODEL,
    )

@router.post(
    "/analyze",
    response_model=ClinicalSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract structured clinical information from medical transcript"
)
async def analyze_transcript(request: AnalyzeRequest):
    """
    Accepts full consultation transcript, runs LLM-based clinical extraction,
    and returns validated structured clinical summary.
    """
    clean_transcript = request.transcript.strip()
    if not clean_transcript:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript is empty. Please provide a transcript of the consultation."
        )

    try:
        logger.info(f"Processing transcript of length {len(clean_transcript)} characters for clinical extraction...")
        summary_response = await ClinicalAnalysisService.analyze_transcript(clean_transcript)
        return summary_response
    except ValueError as ve:
        logger.error(f"Validation or configuration error during analysis: {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Error during clinical analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical analysis failed: {str(e)}"
        )
