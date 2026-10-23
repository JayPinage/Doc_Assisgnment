from typing import List, Optional
from pydantic import BaseModel, Field

class PatientDetails(BaseModel):
    name: Optional[str] = Field(default=None, description="Patient name if stated, else null")
    age: Optional[str] = Field(default=None, description="Patient age if stated, else null")
    sex: Optional[str] = Field(default=None, description="Patient sex/gender if stated, else null")
    identifiers: Optional[str] = Field(default=None, description="Patient IDs or MRN if mentioned, else null")

class HistoryOfPresentIllness(BaseModel):
    onset: Optional[str] = Field(default=None, description="When symptoms began")
    duration: Optional[str] = Field(default=None, description="How long symptoms have persisted")
    progression: Optional[str] = Field(default=None, description="Symptom worsening, stability, or improvement")
    aggravating_factors: Optional[str] = Field(default=None, description="Factors that make symptoms worse")
    relieving_factors: Optional[str] = Field(default=None, description="Factors that relieve symptoms")

class Symptoms(BaseModel):
    positive: List[str] = Field(default_factory=list, description="Symptoms explicitly reported or confirmed present")
    negative: List[str] = Field(default_factory=list, description="Symptoms explicitly denied by patient")

class PastMedicalHistory(BaseModel):
    conditions: List[str] = Field(default_factory=list, description="Past diagnosed illnesses or conditions")
    surgeries: List[str] = Field(default_factory=list, description="Previous surgical operations")
    hospitalizations: List[str] = Field(default_factory=list, description="Past hospital admissions")

class MedicationItem(BaseModel):
    name: str = Field(description="Medication name")
    dosage: Optional[str] = Field(default=None, description="Dosage and strength if stated")
    frequency: Optional[str] = Field(default=None, description="Dosing frequency/schedule if stated")
    adherence: Optional[str] = Field(default=None, description="Patient compliance or adherence if discussed")

class MedicationHistory(BaseModel):
    current_medications: List[MedicationItem] = Field(default_factory=list, description="List of current medications")

class Allergies(BaseModel):
    items: List[str] = Field(default_factory=list, description="Allergic substances (drugs, food, environmental)")
    reactions: List[str] = Field(default_factory=list, description="Documented allergic reactions if mentioned")

class ClinicalObservations(BaseModel):
    vital_signs: List[str] = Field(default_factory=list, description="Vital signs stated aloud with units (e.g., BP 120/80 mmHg, HR 72 bpm, Temp 98.6 F)")
    examination_findings: List[str] = Field(default_factory=list, description="Physical examination findings stated by clinician")
    other_observations: List[str] = Field(default_factory=list, description="Other clinical observations stated during consultation")

class Assessment(BaseModel):
    provisional_diagnosis: Optional[str] = Field(default=None, description="Provisional or working diagnosis stated by clinician")
    differential_diagnoses: List[str] = Field(default_factory=list, description="Differential diagnoses explicitly considered")
    uncertainties: Optional[str] = Field(default=None, description="Clinical uncertainties or qualifications expressed")

class Plan(BaseModel):
    investigations: List[str] = Field(default_factory=list, description="Diagnostic tests, lab work, or imaging ordered")
    prescriptions: List[str] = Field(default_factory=list, description="Prescribed medications, dosing, and durations stated")
    advice: List[str] = Field(default_factory=list, description="Lifestyle advice, precautions, or home remedies")
    follow_up: Optional[str] = Field(default=None, description="Follow-up instructions or return timing")

class ClinicalSummaryResponse(BaseModel):
    patient_details: PatientDetails = Field(default_factory=PatientDetails)
    clinical_summary: str = Field(description="Concise, professionally organized narrative clinical summary")
    chief_complaint: Optional[str] = Field(default=None, description="Primary reason for the visit in patient's terms")
    history_of_present_illness: HistoryOfPresentIllness = Field(default_factory=HistoryOfPresentIllness)
    symptoms: Symptoms = Field(default_factory=Symptoms)
    past_medical_history: PastMedicalHistory = Field(default_factory=PastMedicalHistory)
    medication_history: MedicationHistory = Field(default_factory=MedicationHistory)
    allergies: Allergies = Field(default_factory=Allergies)
    clinical_observations: ClinicalObservations = Field(default_factory=ClinicalObservations)
    assessment: Assessment = Field(default_factory=Assessment)
    plan: Plan = Field(default_factory=Plan)
    disclaimer: str = Field(
        default="AI-generated clinical documentation draft for review by a qualified healthcare professional. Not an autonomous diagnosis or treatment order."
    )
