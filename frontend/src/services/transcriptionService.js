/**
 * Export transcript as a downloadable .txt file
 */
export function exportTranscriptAsTxt(transcript, filename) {
  if (!transcript || !transcript.trim()) {
    throw new Error('No transcript available to export.');
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = filename || `Medical_Transcript_${timestamp}.txt`;

  const header = `=====================================================
MEDICAL CONSULTATION TRANSCRIPT
Generated: ${now.toLocaleString()}
Disclaimer: AI-generated transcript for clinical review.
=====================================================\n\n`;

  const blob = new Blob([header + transcript.trim()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Save captured audio recording as a downloadable audio file
 */
export function downloadAudioFile(audioBlob, filename) {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('No recorded audio available to save.');
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = audioBlob.type.includes('wav') ? 'wav' : 'webm';
  const name = filename || `Medical_Recording_${timestamp}.${ext}`;

  const url = URL.createObjectURL(audioBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Format structured clinical summary into readable medical note text for clipboard
 */
export function formatPrescriptionText(summaryData) {
  if (!summaryData) return '';

  const {
    patient_details,
    clinical_summary,
    chief_complaint,
    history_of_present_illness,
    symptoms,
    past_medical_history,
    medication_history,
    allergies,
    clinical_observations,
    assessment,
    plan,
    disclaimer,
  } = summaryData;

  const lines = [];
  lines.push('=====================================================');
  lines.push('CLINICAL CONSULTATION SUMMARY & PRESCRIPTION DRAFT');
  lines.push('=====================================================');
  lines.push(`Date: ${new Date().toLocaleDateString()}`);

  // Patient Details
  lines.push('\n[ PATIENT DETAILS ]');
  lines.push(`Name: ${patient_details?.name || 'Not documented'}`);
  lines.push(`Age: ${patient_details?.age || 'Not documented'} | Gender: ${patient_details?.sex || 'Not documented'}`);
  if (patient_details?.identifiers) {
    lines.push(`ID/MRN: ${patient_details.identifiers}`);
  }

  // Chief Complaint
  if (chief_complaint) {
    lines.push('\n[ CHIEF COMPLAINT ]');
    lines.push(chief_complaint);
  }

  // Clinical Summary
  if (clinical_summary) {
    lines.push('\n[ CLINICAL SUMMARY ]');
    lines.push(clinical_summary);
  }

  // HPI
  if (history_of_present_illness) {
    const hpi = history_of_present_illness;
    const hpiItems = [];
    if (hpi.onset) hpiItems.push(`Onset: ${hpi.onset}`);
    if (hpi.duration) hpiItems.push(`Duration: ${hpi.duration}`);
    if (hpi.progression) hpiItems.push(`Progression: ${hpi.progression}`);
    if (hpi.aggravating_factors) hpiItems.push(`Aggravating Factors: ${hpi.aggravating_factors}`);
    if (hpi.relieving_factors) hpiItems.push(`Relieving Factors: ${hpi.relieving_factors}`);
    if (hpiItems.length > 0) {
      lines.push('\n[ HISTORY OF PRESENT ILLNESS ]');
      lines.push(hpiItems.join('; '));
    }
  }

  // Symptoms
  if (symptoms) {
    if (symptoms.positive?.length > 0 || symptoms.negative?.length > 0) {
      lines.push('\n[ SYMPTOMS ]');
      if (symptoms.positive?.length > 0) {
        lines.push(`Reported / Positive: ${symptoms.positive.join(', ')}`);
      }
      if (symptoms.negative?.length > 0) {
        lines.push(`Explicitly Denied: ${symptoms.negative.join(', ')}`);
      }
    }
  }

  // Past Medical History
  if (past_medical_history) {
    const pmh = past_medical_history;
    const items = [];
    if (pmh.conditions?.length > 0) items.push(`Conditions: ${pmh.conditions.join(', ')}`);
    if (pmh.surgeries?.length > 0) items.push(`Surgeries: ${pmh.surgeries.join(', ')}`);
    if (pmh.hospitalizations?.length > 0) items.push(`Hospitalizations: ${pmh.hospitalizations.join(', ')}`);
    if (items.length > 0) {
      lines.push('\n[ PAST MEDICAL HISTORY ]');
      lines.push(items.join('\n'));
    }
  }

  // Medications
  if (medication_history?.current_medications?.length > 0) {
    lines.push('\n[ CURRENT MEDICATIONS ]');
    medication_history.current_medications.forEach((med, idx) => {
      let desc = `${idx + 1}. ${med.name}`;
      if (med.dosage) desc += ` - ${med.dosage}`;
      if (med.frequency) desc += ` (${med.frequency})`;
      if (med.adherence) desc += ` [Adherence: ${med.adherence}]`;
      lines.push(desc);
    });
  }

  // Allergies
  if (allergies?.items?.length > 0) {
    lines.push('\n[ ALLERGIES ]');
    let allergyText = allergies.items.join(', ');
    if (allergies.reactions?.length > 0) {
      allergyText += ` (Reactions: ${allergies.reactions.join(', ')})`;
    }
    lines.push(allergyText);
  }

  // Observations & Vitals
  if (clinical_observations) {
    const obs = clinical_observations;
    const obsItems = [];
    if (obs.vital_signs?.length > 0) obsItems.push(`Vitals: ${obs.vital_signs.join(' | ')}`);
    if (obs.examination_findings?.length > 0) obsItems.push(`Physical Exam: ${obs.examination_findings.join('; ')}`);
    if (obs.other_observations?.length > 0) obsItems.push(`Other: ${obs.other_observations.join('; ')}`);
    if (obsItems.length > 0) {
      lines.push('\n[ CLINICAL OBSERVATIONS & VITALS ]');
      lines.push(obsItems.join('\n'));
    }
  }

  // Assessment
  if (assessment) {
    lines.push('\n[ ASSESSMENT & IMPRESSION ]');
    if (assessment.provisional_diagnosis) {
      lines.push(`Provisional Diagnosis: ${assessment.provisional_diagnosis}`);
    }
    if (assessment.differential_diagnoses?.length > 0) {
      lines.push(`Differential Diagnoses: ${assessment.differential_diagnoses.join(', ')}`);
    }
    if (assessment.uncertainties) {
      lines.push(`Clinical Uncertainty / Notes: ${assessment.uncertainties}`);
    }
  }

  // Plan & Prescription
  if (plan) {
    lines.push('\n[ PLAN & PRESCRIPTION ]');
    if (plan.prescriptions?.length > 0) {
      lines.push('Prescriptions:');
      plan.prescriptions.forEach((rx, idx) => lines.push(`  ${idx + 1}. ${rx}`));
    }
    if (plan.investigations?.length > 0) {
      lines.push(`Investigations Ordered: ${plan.investigations.join(', ')}`);
    }
    if (plan.advice?.length > 0) {
      lines.push(`Advice: ${plan.advice.join('; ')}`);
    }
    if (plan.follow_up) {
      lines.push(`Follow-up: ${plan.follow_up}`);
    }
  }

  lines.push('\n-----------------------------------------------------');
  lines.push(disclaimer || 'Draft clinical summary for physician review and sign-off.');
  lines.push('-----------------------------------------------------');

  return lines.join('\n');
}

/**
 * Copies formatted clinical note to clipboard
 */
export async function copyToClipboard(text) {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
  await navigator.clipboard.writeText(text);
  return true;
}
