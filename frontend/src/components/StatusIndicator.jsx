import React from 'react';
import { Mic, MicOff, Radio, Volume2, Loader2, Wifi, WifiOff } from 'lucide-react';

export default function StatusIndicator({ status, connectionStatus, isRecording }) {
  const getStatusBadge = () => {
    if (status === 'speaking') {
      return (
        <span className="status-badge speaking">
          <Volume2 className="icon animate-pulse" size={14} />
          <span>Speaking (VAD Active)</span>
        </span>
      );
    }
    if (status === 'listening' || (isRecording && status === 'recording')) {
      return (
        <span className="status-badge listening">
          <span className="pulse-dot"></span>
          <span>Listening for speech...</span>
        </span>
      );
    }
    if (status === 'processing') {
      return (
        <span className="status-badge processing">
          <Loader2 className="icon animate-spin" size={14} />
          <span>Processing Audio...</span>
        </span>
      );
    }
    if (status === 'stopped') {
      return (
        <span className="status-badge stopped">
          <MicOff className="icon" size={14} />
          <span>Stopped</span>
        </span>
      );
    }
    return (
      <span className="status-badge ready">
        <Radio className="icon" size={14} />
        <span>Ready</span>
      </span>
    );
  };

  return (
    <div className="status-container">
      {getStatusBadge()}
      <div className={`connection-badge ${connectionStatus}`}>
        {connectionStatus === 'connected' ? (
          <span title="Server connected">
            <Wifi size={13} className="text-emerald-500" />
            <span className="connection-text">Live WS</span>
          </span>
        ) : (
          <span title="Reconnecting...">
            <WifiOff size={13} className="text-amber-500" />
            <span className="connection-text">Connecting</span>
          </span>
        )}
      </div>
    </div>
  );
}
