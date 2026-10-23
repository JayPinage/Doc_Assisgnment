import { useState, useRef, useEffect, useCallback } from 'react';

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/transcribe';

export function useTranscriptionSocket(url = DEFAULT_WS_URL) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const [socketStatus, setSocketStatus] = useState('ready'); // 'ready' | 'recording' | 'listening' | 'speaking' | 'stopped'
  const [fullTranscript, setFullTranscript] = useState('');
  const [segments, setSegments] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [socketError, setSocketError] = useState(null);

  const socketRef = useRef(null);
  const isManuallyClosedRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus('connecting');
    setSocketError(null);
    isManuallyClosedRef.current = false;

    try {
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        setSocketError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'transcript_update') {
            if (data.segment) {
              setSegments((prev) => [...prev, data.segment]);
            }
            if (data.full_transcript !== undefined) {
              setFullTranscript(data.full_transcript);
            }
            if (data.word_count !== undefined) {
              setWordCount(data.word_count);
            }
            if (data.chunk_count !== undefined) {
              setChunkCount(data.chunk_count);
            }
            if (data.status) {
              setSocketStatus(data.status);
            }
          } else if (data.type === 'status') {
            setSocketStatus(data.status);
            if (data.word_count !== undefined) setWordCount(data.word_count);
            if (data.chunk_count !== undefined) setChunkCount(data.chunk_count);
          } else if (data.type === 'completed') {
            if (data.full_transcript !== undefined) {
              setFullTranscript(data.full_transcript);
            }
            if (data.word_count !== undefined) setWordCount(data.word_count);
            if (data.chunk_count !== undefined) setChunkCount(data.chunk_count);
            setSocketStatus('stopped');
          } else if (data.type === 'cleared') {
            setFullTranscript('');
            setSegments([]);
            setWordCount(0);
            setChunkCount(0);
            setSocketStatus('ready');
          } else if (data.type === 'error') {
            console.error('WebSocket backend reported error:', data.error);
            setSocketError(data.error);
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket message as JSON:', event.data);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        setSocketError('WebSocket connection error. Ensure FastAPI server is running on port 8000.');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        socketRef.current = null;
        if (!isManuallyClosedRef.current) {
          // Attempt graceful reconnect after a short delay
          setTimeout(() => {
            if (!isManuallyClosedRef.current) {
              connect();
            }
          }, 3000);
        }
      };
    } catch (err) {
      console.error('Error initiating WebSocket:', err);
      setConnectionStatus('disconnected');
      setSocketError(err.message);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      isManuallyClosedRef.current = true;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendAudioChunk = useCallback((arrayBuffer) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(arrayBuffer);
    }
  }, []);

  const startTranscription = useCallback(() => {
    setSocketError(null);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'start' }));
      setSocketStatus('recording');
    } else {
      connect();
      // Retry sending start once open
      setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'start' }));
          setSocketStatus('recording');
        }
      }, 500);
    }
  }, [connect]);

  const stopTranscription = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    setSocketStatus('stopped');
  }, []);

  const clearTranscription = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'clear' }));
    }
    setFullTranscript('');
    setSegments([]);
    setWordCount(0);
    setChunkCount(0);
    setSocketStatus('ready');
    setSocketError(null);
  }, []);

  return {
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
    reconnect: connect,
  };
}
