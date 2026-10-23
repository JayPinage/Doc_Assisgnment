import React, { useRef, useEffect } from 'react';
import {
  Zap,
  Mic,
  Square,
  X,
  Save,
  Download,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import StatusIndicator from './StatusIndicator';
import { exportTranscriptAsTxt, downloadAudioFile } from '../services/transcriptionService';

export default function TranscriptionPanel({
  isRecording,
  onStartMic,
  onStopRecording,
  onClear,
  fullTranscript,
  segments,
  wordCount,
  chunkCount,
  socketStatus,
  connectionStatus,
  onProcessAI,
  isProcessingAI,
  recordedAudioBlob,
  recorderError,
  socketError,
}) {
  const transcriptScrollRef = useRef(null);

  // Auto-scroll to bottom of transcript as new speech arrives
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [fullTranscript, segments]);

  const handleSaveRecording = () => {
    try {
      if (!recordedAudioBlob) {
        alert('No audio recording available yet. Click Start Mic and speak first.');
        return;
      }
      downloadAudioFile(recordedAudioBlob);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportTxt = () => {
    try {
      if (!fullTranscript || !fullTranscript.trim()) {
        alert('No transcript available to export.');
        return;
      }
      exportTranscriptAsTxt(fullTranscript);
    } catch (err) {
      alert(err.message);
    }
  };

  const displayError = recorderError || socketError;

  return (
    <div className="panel transcription-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <Zap className="panel-title-icon" size={20} />
          <h2 className="panel-title">Live Medical Transcription</h2>
        </div>
      </div>

      {/* Button Toolbar */}
      <div className="toolbar-row">
        <button
          type="button"
          className="btn btn-primary btn-start"
          onClick={onStartMic}
          disabled={isRecording}
          title="Start microphone and VAD capture"
        >
          <Mic size={16} />
          <span>Start Mic</span>
        </button>

        <button
          type="button"
          className="btn btn-outline btn-stop"
          onClick={onStopRecording}
          disabled={!isRecording}
          title="Stop recording and flush final speech"
        >
          <Square size={14} className="stop-icon" />
          <span>Stop</span>
        </button>

        <button
          type="button"
          className="btn btn-outline btn-clear"
          onClick={onClear}
          disabled={isRecording && !fullTranscript}
          title="Clear current transcript and counters"
        >
          <X size={15} />
          <span>Clear</span>
        </button>

        <button
          type="button"
          className="btn btn-outline btn-save-audio"
          onClick={handleSaveRecording}
          disabled={!recordedAudioBlob}
          title="Download the captured audio file (.webm/.wav)"
        >
          <Save size={15} className="save-icon" />
          <span>Save Recording</span>
        </button>

        <button
          type="button"
          className="btn btn-outline btn-export-txt"
          onClick={handleExportTxt}
          disabled={!fullTranscript || !fullTranscript.trim()}
          title="Download transcript as .txt"
        >
          <Download size={14} />
          <span>Export TXT</span>
        </button>
      </div>

      {/* Stats Counter & Status Row */}
      <div className="stats-row">
        <div className="counter-badges">
          <span className="counter-pill">
            <FileText size={13} className="counter-icon" />
            <span className="counter-label">WORDS:</span>
            <span className="counter-value">{wordCount}</span>
          </span>
          <span className="counter-pill">
            <Clock size={13} className="counter-icon" />
            <span className="counter-label">CHUNKS:</span>
            <span className="counter-value">{chunkCount}</span>
          </span>
        </div>

        <StatusIndicator
          status={socketStatus}
          connectionStatus={connectionStatus}
          isRecording={isRecording}
        />
      </div>

      {/* Error Notification */}
      {displayError && (
        <div className="error-banner">
          <AlertCircle size={16} className="error-icon" />
          <span className="error-text">{displayError}</span>
        </div>
      )}

      {/* Main Transcript Display Area */}
      <div className="transcript-box" ref={transcriptScrollRef}>
        {fullTranscript && fullTranscript.trim() ? (
          <div className="transcript-content">
            <p className="transcript-text">{fullTranscript}</p>
            {isRecording && (
              <span className="live-typing-indicator" title="VAD Listening...">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            )}
          </div>
        ) : (
          <div className="transcript-empty-state">
            <div className="empty-message-container">
              <Zap size={22} className="empty-state-icon" />
              <p className="empty-state-text-main">
                Ready — click <strong>Start Mic</strong> and speak naturally. VAD will auto-chunk your speech.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action: Process Transcript with AI */}
      <div className="panel-footer">
        <button
          type="button"
          className="btn btn-process-ai"
          onClick={onProcessAI}
          disabled={!fullTranscript || !fullTranscript.trim() || isProcessingAI || isRecording}
          title={
            isRecording
              ? 'Please stop recording first before analyzing'
              : !fullTranscript
              ? 'Record speech or enter transcript first'
              : 'Generate structured medical summary with LLM'
          }
        >
          {isProcessingAI ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Analyzing Consultation with AI...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Process Transcript with AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
