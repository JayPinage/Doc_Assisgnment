import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout for LLM inference
});

/**
 * Health check endpoint verifying backend connectivity and model readiness.
 */
export async function checkHealth() {
  const response = await apiClient.get('/api/health');
  return response.data;
}

/**
 * Analyze completed transcript with LLM to extract structured clinical data.
 * @param {string} transcript
 */
export async function analyzeTranscript(transcript) {
  if (!transcript || !transcript.trim()) {
    throw new Error('Transcript is empty. Please record speech before analyzing.');
  }

  const response = await apiClient.post('/api/analyze', {
    transcript: transcript.trim(),
  });
  return response.data;
}

export default apiClient;
