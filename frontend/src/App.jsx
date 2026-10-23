import React, { useState, useEffect, useCallback } from 'react';
import { Activity, MessageSquare } from 'lucide-react';
import TranscriptionPanel from './components/TranscriptionPanel';
import ClinicalSummaryPanel from './components/ClinicalSummaryPanel';
import { useTranscriptionSocket } from './hooks/useTranscriptionSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { analyzeTranscript, checkHealth } from './services/api';

export default function App() {
  const [summaryData, setSummaryData] = useState(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [backendReady, setBackendReady] = useState(false);

  // Live WebSocket hook for transcription
  const {
    connectionStatus,
    socketStatus,
    fullTranscript,
    segments,
    wordCount,
    chunkCount,
    socketError,
    sendAudioChunk,
    startTranscription,
    stopTranscription,
    clearTranscription,
  } = useTranscriptionSocket();

  // Microphone capture hook connected to WebSocket streaming
  const {
    isRecording,
    recordedAudioBlob,
    recorderError,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder({
    onAudioChunk: sendAudioChunk,
  });

  // Check backend health on mount
  useEffect(() => {
    checkHealth()
      .then((data) => {
        setBackendReady(data.status === 'ok');
      })
      .catch((err) => {
        console.warn('Backend health check error:', err.message);
        setBackendReady(false);
      });
  }, []);

  // Handle Start Mic
  const handleStartMic = useCallback(async () => {
    setAnalysisError(null);
    try {
      startTranscription();
      await startRecording();
    } catch (err) {
      console.error('Failed to initiate recording session:', err);
    }
  }, [startTranscription, startRecording]);

  // Handle Stop Recording
  const handleStopRecording = useCallback(() => {
    stopRecording();
    stopTranscription();
  }, [stopRecording, stopTranscription]);

  // Handle Clear Session (transcript, audio, counters)
  const handleClearSession = useCallback(() => {
    clearRecording();
    clearTranscription();
  }, [clearRecording, clearTranscription]);

  // Handle Clear Summary only (leaves transcript untouched)
  const handleClearSummary = useCallback(() => {
    setSummaryData(null);
    setAnalysisError(null);
  }, []);

  // Handle Process Transcript with AI
  const handleProcessAI = useCallback(async () => {
    if (!fullTranscript || !fullTranscript.trim()) return;

    // If still recording, stop first
    if (isRecording) {
      handleStopRecording();
    }

    setIsProcessingAI(true);
    setAnalysisError(null);

    try {
      const result = await analyzeTranscript(fullTranscript);
      setSummaryData(result);
    } catch (err) {
      console.error('Error during clinical analysis:', err);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to generate clinical summary. Please ensure your LLM API key is valid.';
      setAnalysisError(msg);
    } finally {
      setIsProcessingAI(false);
    }
  }, [fullTranscript, isRecording, handleStopRecording]);

  return (
    <div className="app-wrapper">
      {/* Top Navbar */}
      <header className="app-navbar">
        <div className="brand-group">
          <div className="brand-icon">
            <Activity size={20} />
          </div>
          <h1 className="brand-title">AetherMed Live Clinical Assistant</h1>
          <span className="brand-badge">VAD + Whisper + LLM</span>
        </div>
        <div className="navbar-meta">
          <div className="nav-indicator">
            <span className="live-dot"></span>
            <span>FastAPI Server</span>
          </div>
        </div>
      </header>

      {/* Main 2-Column Dashboard */}
      <main className="dashboard-main">
        <div className="dashboard-grid">
          {/* Left Panel: Live Medical Transcription */}
          <TranscriptionPanel
            isRecording={isRecording}
            onStartMic={handleStartMic}
            onStopRecording={handleStopRecording}
            onClear={handleClearSession}
            fullTranscript={fullTranscript}
            segments={segments}
            wordCount={wordCount}
            chunkCount={chunkCount}
            socketStatus={socketStatus}
            connectionStatus={connectionStatus}
            onProcessAI={handleProcessAI}
            isProcessingAI={isProcessingAI}
            recordedAudioBlob={recordedAudioBlob}
            recorderError={recorderError}
            socketError={socketError}
          />

          {/* Right Panel: AI Medical Summary */}
          <ClinicalSummaryPanel
            summaryData={summaryData}
            isProcessingAI={isProcessingAI}
            onClearSummary={handleClearSummary}
            analysisError={analysisError}
          />
        </div>
      </main>

      {/* Floating Action Button (matching reference screenshot) */}
      <button
        type="button"
        className="floating-assistant-button"
        title="AI Assistant Chat"
        onClick={() => {
          if (summaryData) {
            alert('Clinical Summary generated. Click "Copy to Prescription" to copy formatted draft.');
          } else {
            alert('Speak into the microphone or click "Start Mic" to begin live medical transcription.');
          }
        }}
      >
        <MessageSquare size={22} />
      </button>
    </div>
  );
}
