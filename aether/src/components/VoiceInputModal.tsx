import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
import logger from '../utils/logger';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptComplete: (transcript: string) => void;
}

export default function VoiceInputModal({ isOpen, onClose, onTranscriptComplete }: VoiceInputModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string>('');
  const [volume, setVolume] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    if (isOpen && SpeechRecognition) {
      logger.debug('VoiceInputModal: Initializing speech recognition');
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          logger.debug('VoiceInputModal: Final transcript added', { 
            finalTranscript,
            totalLength: (transcript + finalTranscript).length 
          });
        }
        setInterimTranscript(interimText);
      };
      
      recognition.onerror = (event: any) => {
        const errorMessage = event.error || 'Unknown error';
        logger.error('VoiceInputModal: Speech recognition error', { 
          error: errorMessage,
          type: event.type,
          timestamp: Date.now()
        });
        setError(`Speech recognition error: ${errorMessage}`);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        logger.debug('VoiceInputModal: Speech recognition ended');
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      cleanup();
    };
  }, [isOpen, transcript]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTranscript('');
      setInterimTranscript('');
      setError('');
      setVolume(0);
    } else {
      document.body.style.overflow = 'unset';
      cleanup();
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const setupAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      const updateVolume = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
          setVolume(average / 255);
          
          if (isRecording) {
            animationRef.current = requestAnimationFrame(updateVolume);
          }
        }
      };
      
      updateVolume();
      
    } catch (err) {
      logger.error('VoiceInputModal: Microphone access failed', { error: err });
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const startRecording = async () => {
    if (!recognitionRef.current || !isSupported) return;
    
    setError('');
    setTranscript('');
    setInterimTranscript('');
    
    try {
      logger.info('VoiceInputModal: Starting voice recording');
      await setupAudioVisualization();
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      logger.error('VoiceInputModal: Failed to start recording', { error: err });
      setError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      logger.info('VoiceInputModal: Stopping voice recording');
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    cleanup();
  };

  const handleComplete = () => {
    const finalText = transcript.trim();
    if (finalText) {
      logger.info('VoiceInputModal: Completing with transcript', { 
        transcriptLength: finalText.length,
        preview: finalText.substring(0, 50) + (finalText.length > 50 ? '...' : '')
      });
      onTranscriptComplete(finalText);
      onClose();
    }
  };

  const handleRetry = () => {
    setTranscript('');
    setInterimTranscript('');
    setError('');
    if (isRecording) {
      stopRecording();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <div className="relative z-10 bg-neutral-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-400 text-lg mb-2">Not Supported</div>
            <p className="text-white/70 mb-4">
              Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div className="relative z-10 bg-neutral-900 rounded-xl border border-white/10 p-6 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Voice Input</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Microphone Visualization */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!error}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-400 scale-110' 
                  : 'bg-purple-600 hover:bg-purple-500'
              } ${error ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRecording ? <FiMicOff size={32} /> : <FiMic size={32} />}
            </button>
            
            {/* Volume visualization */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-pulse"
                   style={{ 
                     transform: `scale(${1 + volume * 0.5})`,
                     opacity: 0.3 + volume * 0.7 
                   }} 
              />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-4">
          {isRecording ? (
            <div className="text-green-400 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Listening... Speak now
            </div>
          ) : transcript ? (
            <div className="text-blue-400">Recording stopped. Review your text below.</div>
          ) : (
            <div className="text-white/70">Click the microphone to start recording</div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}

        {/* Transcript Display */}
        {(transcript || interimTranscript) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Transcript:
            </label>
            <div className="min-h-[100px] max-h-[200px] overflow-y-auto p-3 bg-neutral-800 border border-white/10 rounded-lg">
              <div className="text-white whitespace-pre-wrap">
                {transcript}
                {interimTranscript && (
                  <span className="text-blue-300 opacity-70">{interimTranscript}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {transcript && (
            <>
              <button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                           bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
              >
                <FiRefreshCw size={16} />
                Retry
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                           bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                <FiCheck size={16} />
                Use Text
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-white/50 text-center">
          {isRecording 
            ? "Click the microphone again to stop recording"
            : "Make sure your microphone is enabled and speak clearly"
          }
        </div>
      </div>
    </div>
  );
} 