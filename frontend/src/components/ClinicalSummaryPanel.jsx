import React, { useState } from 'react';
import {
  Zap,
  X,
  Copy,
  Check,
  ClipboardList,
  Stethoscope,
  Pill,
  FlaskConical,
  AlertTriangle,
  History,
  CalendarCheck,
  User,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import SummarySection from './SummarySection';
import { formatPrescriptionText, copyToClipboard } from '../services/transcriptionService';

export default function ClinicalSummaryPanel({
  summaryData,
  isProcessingAI,
  onClearSummary,
  analysisError,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyPrescription = async () => {
    if (!summaryData) return;
    try {
      const formattedText = formatPrescriptionText(summaryData);
      await copyToClipboard(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert(`Failed to copy to clipboard: ${err.message}`);
    }
  };

  const patient = summaryData?.patient_details;
  const hasPatientData = Boolean(patient && (patient.name || patient.age || patient.sex || patient.identifiers));

  const hasClinicalSummary = Boolean(summaryData?.clinical_summary);
  const hasChiefComplaint = Boolean(summaryData?.chief_complaint);

  const symptoms = summaryData?.symptoms;
  const hasSymptoms = Boolean(
    symptoms && (symptoms.positive?.length > 0 || symptoms.negative?.length > 0)
  );

  const assessment = summaryData?.assessment;
  const hasAssessment = Boolean(
    assessment &&
      (assessment.provisional_diagnosis ||
        assessment.differential_diagnoses?.length > 0 ||
        assessment.uncertainties)
  );

  const medications = summaryData?.medication_history?.current_medications;
  const hasMedications = Boolean(medications && medications.length > 0);

  const observations = summaryData?.clinical_observations;
  const hasExaminations = Boolean(
    observations &&
      (observations.vital_signs?.length > 0 ||
        observations.examination_findings?.length > 0 ||
        observations.other_observations?.length > 0)
  );

  const allergies = summaryData?.allergies;
  const hasAllergies = Boolean(
    allergies && (allergies.items?.length > 0 || allergies.reactions?.length > 0)
  );

  const pmh = summaryData?.past_medical_history;
  const hasPmh = Boolean(
    pmh && (pmh.conditions?.length > 0 || pmh.surgeries?.length > 0 || pmh.hospitalizations?.length > 0)
  );

  const plan = summaryData?.plan;
  const hasPlan = Boolean(
    plan &&
      (plan.prescriptions?.length > 0 ||
        plan.investigations?.length > 0 ||
        plan.advice?.length > 0 ||
        plan.follow_up)
  );

  return (
    <div className="panel clinical-summary-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <Zap className="panel-title-icon" size={20} />
          <h2 className="panel-title">AI Medical Summary</h2>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-clear-summary"
          onClick={onClearSummary}
          disabled={!summaryData && !analysisError}
          title="Clear current clinical summary without resetting transcript"
        >
          <X size={14} />
          <span>Clear</span>
        </button>
      </div>

      {/* Patient Details Card */}
      <div className="patient-details-card">
        <div className="patient-row-primary">
          <User size={16} className="patient-icon" />
          <span className="patient-name-label">Patient Name:</span>
          <span className="patient-name-value">
            {hasPatientData && patient?.name ? patient.name : 'Dr Tushar'}
          </span>
        </div>
        <div className="patient-row-meta">
          <span className="meta-item">
            <span className="meta-label">Age:</span>{' '}
            <span className="meta-value">
              {hasPatientData && patient?.age ? patient.age : '30'}
            </span>
          </span>
          <span className="meta-divider">•</span>
          <span className="meta-item">
            <span className="meta-label">Gender:</span>{' '}
            <span className="meta-value">
              {hasPatientData && patient?.sex ? patient.sex : 'Male'}
            </span>
          </span>
          {patient?.identifiers && (
            <>
              <span className="meta-divider">•</span>
              <span className="meta-item">
                <span className="meta-label">ID:</span>{' '}
                <span className="meta-value">{patient.identifiers}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Analysis Error Alert */}
      {analysisError && (
        <div className="error-banner">
          <ShieldAlert size={16} className="error-icon" />
          <span className="error-text">{analysisError}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isProcessingAI && (
        <div className="summary-loading-state">
          <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
          <p className="loading-title">Analyzing Consultation Transcript...</p>
          <p className="loading-subtitle">Extracting structured clinical findings via LLM</p>
        </div>
      )}

      {/* Independently Scrollable Sections Container */}
      <div className="summary-scroll-area">
        {/* 1. CLINICAL SUMMARY */}
        <SummarySection
          icon={ClipboardList}
          title="CLINICAL SUMMARY"
          emptyText="AI-generated clinical summary will appear here..."
          hasContent={hasClinicalSummary}
        >
          <p className="narrative-summary-text">{summaryData?.clinical_summary}</p>
        </SummarySection>

        {/* 2. CHIEF COMPLAINTS */}
        <SummarySection
          icon={Stethoscope}
          title="CHIEF COMPLAINTS"
          emptyText="No complaints extracted yet"
          hasContent={hasChiefComplaint}
        >
          <div className="chief-complaint-content">
            <p className="complaint-text">{summaryData?.chief_complaint}</p>
            {summaryData?.history_of_present_illness && (
              <div className="hpi-details-grid">
                {summaryData.history_of_present_illness.onset && (
                  <div className="hpi-tag">
                    <span className="tag-label">Onset:</span> {summaryData.history_of_present_illness.onset}
                  </div>
                )}
                {summaryData.history_of_present_illness.duration && (
                  <div className="hpi-tag">
                    <span className="tag-label">Duration:</span> {summaryData.history_of_present_illness.duration}
                  </div>
                )}
                {summaryData.history_of_present_illness.progression && (
                  <div className="hpi-tag">
                    <span className="tag-label">Progression:</span> {summaryData.history_of_present_illness.progression}
                  </div>
                )}
                {summaryData.history_of_present_illness.aggravating_factors && (
                  <div className="hpi-tag">
                    <span className="tag-label">Aggravating:</span> {summaryData.history_of_present_illness.aggravating_factors}
                  </div>
                )}
                {summaryData.history_of_present_illness.relieving_factors && (
                  <div className="hpi-tag">
                    <span className="tag-label">Relieving:</span> {summaryData.history_of_present_illness.relieving_factors}
                  </div>
                )}
              </div>
            )}
          </div>
        </SummarySection>

        {/* 3. SYMPTOMS */}
        <SummarySection
          icon={ClipboardList}
          title="SYMPTOMS"
          emptyText="No symptoms extracted yet"
          hasContent={hasSymptoms}
        >
          <div className="symptoms-columns">
            {symptoms?.positive?.length > 0 && (
              <div className="symptom-column positive">
                <span className="symptom-column-title">Reported / Present:</span>
                <ul className="symptom-list">
                  {symptoms.positive.map((s, idx) => (
                    <li key={idx} className="symptom-item positive-item">
                      <span className="bullet positive-bullet">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {symptoms?.negative?.length > 0 && (
              <div className="symptom-column negative">
                <span className="symptom-column-title">Explicitly Denied:</span>
                <ul className="symptom-list">
                  {symptoms.negative.map((s, idx) => (
                    <li key={idx} className="symptom-item negative-item">
                      <span className="bullet negative-bullet">✕</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SummarySection>

        {/* 4. CLINICAL IMPRESSION / ASSESSMENT */}
        <SummarySection
          icon={Stethoscope}
          title="CLINICAL IMPRESSION"
          emptyText="No diagnosis inferred"
          hasContent={hasAssessment}
        >
          <div className="assessment-content">
            {assessment?.provisional_diagnosis && (
              <div className="diagnosis-highlight">
                <span className="diagnosis-label">Provisional Diagnosis:</span>
                <span className="diagnosis-value">{assessment.provisional_diagnosis}</span>
              </div>
            )}
            {assessment?.differential_diagnoses?.length > 0 && (
              <div className="differentials-group">
                <span className="differentials-label">Differentials Considered:</span>
                <div className="chips-container">
                  {assessment.differential_diagnoses.map((d, idx) => (
                    <span key={idx} className="chip">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {assessment?.uncertainties && (
              <p className="uncertainty-text">
                <strong>Clinician Notes:</strong> {assessment.uncertainties}
              </p>
            )}
          </div>
        </SummarySection>

        {/* 5. MEDICATION HISTORY */}
        <SummarySection
          icon={Pill}
          title="MEDICATION HISTORY"
          emptyText="No medications extracted yet"
          hasContent={hasMedications}
        >
          <div className="medication-cards-list">
            {medications?.map((med, idx) => (
              <div key={idx} className="medication-item-card">
                <div className="med-header">
                  <span className="med-name">{med.name}</span>
                  {med.dosage && <span className="med-dosage-badge">{med.dosage}</span>}
                </div>
                <div className="med-details">
                  {med.frequency && (
                    <span className="med-detail">
                      <strong>Schedule:</strong> {med.frequency}
                    </span>
                  )}
                  {med.adherence && (
                    <span className="med-detail">
                      <strong>Adherence:</strong> {med.adherence}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SummarySection>

        {/* 6. EXAMINATIONS & TESTS */}
        <SummarySection
          icon={FlaskConical}
          title="EXAMINATIONS & TESTS"
          emptyText="No examinations extracted yet"
          hasContent={hasExaminations}
        >
          <div className="examinations-content">
            {observations?.vital_signs?.length > 0 && (
              <div className="vitals-row">
                <span className="vitals-label">Vital Signs:</span>
                <div className="chips-container">
                  {observations.vital_signs.map((vital, idx) => (
                    <span key={idx} className="vital-chip">
                      {vital}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {observations?.examination_findings?.length > 0 && (
              <div className="findings-group">
                <span className="findings-label">Physical Examination:</span>
                <ul className="findings-list">
                  {observations.examination_findings.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}
            {observations?.other_observations?.length > 0 && (
              <div className="findings-group">
                <span className="findings-label">Other Clinical Notes:</span>
                <ul className="findings-list">
                  {observations.other_observations.map((obs, idx) => (
                    <li key={idx}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SummarySection>

        {/* 7. ALLERGIES */}
        <SummarySection
          icon={AlertTriangle}
          title="ALLERGIES"
          emptyText="No allergies extracted yet"
          hasContent={hasAllergies}
        >
          <div className="allergies-content">
            {allergies?.items?.map((item, idx) => (
              <span key={idx} className="allergy-tag">
                {item}
              </span>
            ))}
            {allergies?.reactions?.length > 0 && (
              <p className="allergy-reactions">
                <strong>Reactions:</strong> {allergies.reactions.join(', ')}
              </p>
            )}
          </div>
        </SummarySection>

        {/* 8. PAST MEDICAL HISTORY */}
        <SummarySection
          icon={History}
          title="PAST MEDICAL HISTORY"
          emptyText="No past medical history extracted"
          hasContent={hasPmh}
        >
          <div className="pmh-content">
            {pmh?.conditions?.length > 0 && (
              <div className="pmh-group">
                <span className="pmh-label">Past Conditions:</span>
                <p className="pmh-text">{pmh.conditions.join(', ')}</p>
              </div>
            )}
            {pmh?.surgeries?.length > 0 && (
              <div className="pmh-group">
                <span className="pmh-label">Previous Surgeries:</span>
                <p className="pmh-text">{pmh.surgeries.join(', ')}</p>
              </div>
            )}
            {pmh?.hospitalizations?.length > 0 && (
              <div className="pmh-group">
                <span className="pmh-label">Hospitalizations:</span>
                <p className="pmh-text">{pmh.hospitalizations.join(', ')}</p>
              </div>
            )}
          </div>
        </SummarySection>

        {/* 9. HISTORY & FOLLOW-UP / PLAN */}
        <SummarySection
          icon={CalendarCheck}
          title="HISTORY & FOLLOW-UP"
          emptyText="No plan or follow-up extracted yet"
          hasContent={hasPlan}
        >
          <div className="plan-content">
            {plan?.prescriptions?.length > 0 && (
              <div className="plan-block">
                <span className="plan-block-title">Prescriptions:</span>
                <ol className="prescriptions-ordered-list">
                  {plan.prescriptions.map((rx, idx) => (
                    <li key={idx}>{rx}</li>
                  ))}
                </ol>
              </div>
            )}
            {plan?.investigations?.length > 0 && (
              <div className="plan-block">
                <span className="plan-block-title">Investigations Ordered:</span>
                <p className="plan-text">{plan.investigations.join(', ')}</p>
              </div>
            )}
            {plan?.advice?.length > 0 && (
              <div className="plan-block">
                <span className="plan-block-title">Clinician Advice:</span>
                <p className="plan-text">{plan.advice.join('; ')}</p>
              </div>
            )}
            {plan?.follow_up && (
              <div className="plan-block">
                <span className="plan-block-title">Follow-up:</span>
                <p className="plan-text">{plan.follow_up}</p>
              </div>
            )}
          </div>
        </SummarySection>

        {/* Clinical Disclaimer */}
        <div className="clinical-disclaimer">
          <p>
            {summaryData?.disclaimer ||
              'AI-generated clinical documentation draft for review by a licensed healthcare professional. Not an autonomous diagnosis or treatment order.'}
          </p>
        </div>
      </div>

      {/* Bottom Action: Copy to Prescription */}
      <div className="panel-footer">
        <button
          type="button"
          className={`btn btn-copy-prescription ${copied ? 'copied' : ''}`}
          onClick={handleCopyPrescription}
          disabled={!summaryData || isProcessingAI}
          title="Format and copy structured clinical documentation draft to clipboard"
        >
          {copied ? (
            <>
              <Check size={18} />
              <span>Copied to Prescription Draft!</span>
            </>
          ) : (
            <>
              <Copy size={18} />
              <span>Copy to Prescription</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
