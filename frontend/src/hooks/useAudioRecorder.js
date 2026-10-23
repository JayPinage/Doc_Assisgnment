import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder({ onAudioChunk }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recorderError, setRecorderError] = useState(null);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    setRecorderError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      // Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Initialize Web Audio API for raw 16kHz PCM streaming to WebSocket
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      // 4096 samples at 16kHz = 256ms chunk
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (event) => {
        const floatData = event.inputBuffer.getChannelData(0);
        // Convert Float32 [-1.0, 1.0] to 16-bit Int16 PCM
        const pcm16 = new Int16Array(floatData.length);
        for (let i = 0; i < floatData.length; i++) {
          const s = Math.max(-1, Math.min(1, floatData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        if (onAudioChunk) {
          onAudioChunk(pcm16.buffer);
        }
      };

      sourceNode.connect(processor);
      // Connect to destination to keep processor active (silent output)
      processor.connect(audioContext.destination);

      // Concurrently run MediaRecorder for complete local audio download
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const type = mediaRecorder.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type });
          setRecordedAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start microphone capture:', err);
      let errorMsg = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device was detected on your system.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setRecorderError(errorMsg);
      setIsRecording(false);
      throw err;
    }
  }, [onAudioChunk]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }

    // Disconnect and close Web Audio nodes
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch (e) {}
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    // Stop all microphone tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    stopRecording();
    setRecordedAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];
    setRecorderError(null);
  }, [stopRecording, audioUrl]);

  return {
    isRecording,
    recordedAudioBlob,
    audioUrl,
    recorderError,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
