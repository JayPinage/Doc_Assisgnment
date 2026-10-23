import json
import logging
from typing import Any, Dict
import httpx
from app.core.config import settings
from app.schemas.clinical_summary import (
    ClinicalSummaryResponse,
    PatientDetails,
    HistoryOfPresentIllness,
    Symptoms,
    PastMedicalHistory,
    MedicationHistory,
    Allergies,
    ClinicalObservations,
    Assessment,
    Plan,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert AI clinical documentation assistant specializing in extracting structured medical data from patient-doctor consultation transcripts.

CRITICAL CLINICAL ACCURACY AND SAFETY RULES:
1. NEVER fabricate or assume information not explicitly stated in the transcript.
2. For missing scalar fields (e.g. name, age, onset), use null. NEVER invent placeholder text like "John Doe" or "30 years old".
3. For missing lists, use an empty array [].
4. Strictly distinguish POSITIVE symptoms (symptoms reported as present) from EXPLICITLY NEGATIVE symptoms (symptoms the patient or doctor explicitly denies having, e.g. "no fever", "denies chest pain").
5. DO NOT treat symptoms that were simply not mentioned as negative symptoms.
6. Clinical Observations: Include only vital signs (with units, e.g., BP 130/85 mmHg, HR 78 bpm, Temp 98.6 F) and physical examination findings explicitly stated aloud during the visit.
7. Assessment: Extract provisional or working diagnoses and differential diagnoses explicitly stated by the clinician. Do not turn symptoms or inferences into confirmed diagnoses.
8. Plan: Extract investigations ordered, prescriptions (with exact dosages/frequencies if stated), advice, and follow-up instructions given by the doctor.
9. Clinical Summary: Provide a concise, professional clinical synthesis in coherent narrative form, suitable for an EHR/EMR progress note.

You MUST respond strictly with a valid JSON object matching the following structure:
{
  "patient_details": {
    "name": string or null,
    "age": string or null,
    "sex": string or null,
    "identifiers": string or null
  },
  "clinical_summary": string,
  "chief_complaint": string or null,
  "history_of_present_illness": {
    "onset": string or null,
    "duration": string or null,
    "progression": string or null,
    "aggravating_factors": string or null,
    "relieving_factors": string or null
  },
  "symptoms": {
    "positive": [string, ...],
    "negative": [string, ...]
  },
  "past_medical_history": {
    "conditions": [string, ...],
    "surgeries": [string, ...],
    "hospitalizations": [string, ...]
  },
  "medication_history": {
    "current_medications": [
      {
        "name": string,
        "dosage": string or null,
        "frequency": string or null,
        "adherence": string or null
      }
    ]
  },
  "allergies": {
    "items": [string, ...],
    "reactions": [string, ...]
  },
  "clinical_observations": {
    "vital_signs": [string, ...],
    "examination_findings": [string, ...],
    "other_observations": [string, ...]
  },
  "assessment": {
    "provisional_diagnosis": string or null,
    "differential_diagnoses": [string, ...],
    "uncertainties": string or null
  },
  "plan": {
    "investigations": [string, ...],
    "prescriptions": [string, ...],
    "advice": [string, ...],
    "follow_up": string or null
  },
  "disclaimer": "AI-generated clinical documentation draft for review by a qualified healthcare professional. Not an autonomous diagnosis or treatment order."
}
"""

class ClinicalAnalysisService:
    @staticmethod
    async def analyze_transcript(transcript: str) -> ClinicalSummaryResponse:
        """
        Extracts structured clinical information from a consultation transcript
        using the configured LLM provider.
        """
        clean_transcript = transcript.strip()
        if not clean_transcript:
            raise ValueError("Transcript is empty. Cannot extract clinical information.")

        provider = settings.LLM_PROVIDER.lower().strip()
        user_prompt = f"Extract structured clinical information from this medical consultation transcript:\n\n---\n{clean_transcript}\n---"

        logger.info(f"Initiating clinical analysis using provider '{provider}' and model '{settings.LLM_MODEL}'...")

        raw_json_str = ""
        if provider == "groq":
            raw_json_str = await ClinicalAnalysisService._call_groq(user_prompt)
        elif provider == "openai":
            raw_json_str = await ClinicalAnalysisService._call_openai(user_prompt)
        elif provider == "ollama":
            raw_json_str = await ClinicalAnalysisService._call_ollama(user_prompt)
        elif provider == "custom":
            raw_json_str = await ClinicalAnalysisService._call_custom(user_prompt)
        else:
            # Fallback to Groq if key exists, else OpenAI
            if settings.LLM_API_KEY.startswith("gsk_"):
                raw_json_str = await ClinicalAnalysisService._call_groq(user_prompt)
            else:
                raw_json_str = await ClinicalAnalysisService._call_openai(user_prompt)

        return ClinicalAnalysisService._parse_and_validate(raw_json_str, clean_transcript)

    @staticmethod
    async def _call_groq(user_prompt: str) -> str:
        from groq import AsyncGroq

        if not settings.LLM_API_KEY:
            raise ValueError("GROQ API key is missing. Please set LLM_API_KEY in backend/.env")

        client = AsyncGroq(api_key=settings.LLM_API_KEY)
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL or "llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    @staticmethod
    async def _call_openai(user_prompt: str) -> str:
        from openai import AsyncOpenAI

        if not settings.LLM_API_KEY:
            raise ValueError("OpenAI API key is missing. Please set LLM_API_KEY in backend/.env")

        client = AsyncOpenAI(api_key=settings.LLM_API_KEY)
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    @staticmethod
    async def _call_custom(user_prompt: str) -> str:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            base_url=settings.LLM_BASE_URL or "https://api.openai.com/v1",
            api_key=settings.LLM_API_KEY or "none",
        )
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL or "default",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    @staticmethod
    async def _call_ollama(user_prompt: str) -> str:
        base_url = settings.LLM_BASE_URL or "http://localhost:11434"
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{base_url}/api/chat",
                json={
                    "model": settings.LLM_MODEL or "llama3",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "format": "json",
                    "stream": False,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "{}")

    @staticmethod
    def _parse_and_validate(raw_json_str: str, original_transcript: str) -> ClinicalSummaryResponse:
        """
        Parses raw LLM JSON string and validates against the Pydantic schema.
        Handles markdown code fences if present.
        """
        cleaned = raw_json_str.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[len("```json"):].strip()
        elif cleaned.startswith("```"):
            cleaned = cleaned[len("```"):].strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-len("```")].strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode LLM response as JSON: {cleaned}")
            raise ValueError(f"LLM returned invalid JSON: {str(e)}")

        # Ensure required disclaimer
        data["disclaimer"] = "AI-generated clinical documentation draft for review by a qualified healthcare professional. Not an autonomous diagnosis or treatment order."

        try:
            validated = ClinicalSummaryResponse.model_validate(data)
            return validated
        except Exception as e:
            logger.warning(f"Strict validation warning: {e}. Attempting safe normalization...")
            # Fallback normalization
            return ClinicalSummaryResponse(
                patient_details=PatientDetails(**(data.get("patient_details") or {})),
                clinical_summary=data.get("clinical_summary", "Clinical consultation summary processed."),
                chief_complaint=data.get("chief_complaint"),
                history_of_present_illness=HistoryOfPresentIllness(**(data.get("history_of_present_illness") or {})),
                symptoms=Symptoms(**(data.get("symptoms") or {})),
                past_medical_history=PastMedicalHistory(**(data.get("past_medical_history") or {})),
                medication_history=MedicationHistory(**(data.get("medication_history") or {})),
                allergies=Allergies(**(data.get("allergies") or {})),
                clinical_observations=ClinicalObservations(**(data.get("clinical_observations") or {})),
                assessment=Assessment(**(data.get("assessment") or {})),
                plan=Plan(**(data.get("plan") or {})),
            )
