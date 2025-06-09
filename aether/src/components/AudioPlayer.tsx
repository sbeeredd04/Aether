import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiVolume2, FiDownload } from 'react-icons/fi';
import logger from '../utils/logger';

interface AudioPlayerProps {
  audioSrc: string;
  fileName: string;
  mimeType: string;
  className?: string;
}

// Convert PCM audio data to WAV format that browsers can play
function pcmToWav(pcmData: ArrayBuffer, sampleRate: number = 24000): ArrayBuffer {
  const pcmView = new DataView(pcmData);
  const pcmLength = pcmData.byteLength;
  const wavLength = 44 + pcmLength;
  
  const wav = new ArrayBuffer(wavLength);
  const view = new DataView(wav);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, wavLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, pcmLength, true);
  
  // Copy PCM data
  const wavPcmData = new Uint8Array(wav, 44);
  const pcmArray = new Uint8Array(pcmData);
  wavPcmData.set(pcmArray);
  
  return wav;
}

export default function AudioPlayer({ audioSrc, fileName, mimeType, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  // Process audio data when component mounts or audioSrc changes
  useEffect(() => {
    const processAudio = async () => {
      if (!audioSrc) return;
      
      setIsProcessing(true);
      setError('');
      
      try {
        logger.debug('AudioPlayer: Processing audio', { 
          mimeType, 
          fileName,
          audioSrcLength: audioSrc.length 
        });

        let processedUrl = '';
        
        if (mimeType.includes('pcm') || mimeType.includes('L16')) {
          // Handle PCM audio from Gemini API
          logger.info('AudioPlayer: Converting PCM to WAV format', { mimeType });
          
          // Extract base64 data
          const base64Data = audioSrc.includes('data:') 
            ? audioSrc.split(',')[1] 
            : audioSrc;
          
          // Convert base64 to ArrayBuffer
          const binaryString = atob(base64Data);
          const pcmBuffer = new ArrayBuffer(binaryString.length);
          const pcmView = new Uint8Array(pcmBuffer);
          
          for (let i = 0; i < binaryString.length; i++) {
            pcmView[i] = binaryString.charCodeAt(i);
          }
          
          // Convert PCM to WAV
          const wavBuffer = pcmToWav(pcmBuffer, 24000);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
          processedUrl = URL.createObjectURL(wavBlob);
          
          logger.info('AudioPlayer: PCM conversion completed', { 
            originalSize: pcmBuffer.byteLength,
            wavSize: wavBuffer.byteLength 
          });
        } else {
          // Use audio directly if it's already in a supported format
          processedUrl = audioSrc;
          logger.debug('AudioPlayer: Using audio directly', { mimeType });
        }
        
        setProcessedAudioUrl(processedUrl);
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error('AudioPlayer: Failed to process audio', { 
          error: errorMsg,
          mimeType,
          fileName 
        });
        setError(`Failed to process audio: ${errorMsg}`);
      } finally {
        setIsProcessing(false);
      }
    };
    
    processAudio();
    
    // Cleanup function
    return () => {
      if (processedAudioUrl && processedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(processedAudioUrl);
      }
    };
  }, [audioSrc, mimeType, fileName]);

  // Update audio element when processed URL is ready
  useEffect(() => {
    if (audioRef.current && processedAudioUrl) {
      const audio = audioRef.current;
      audio.src = processedAudioUrl;
      audio.volume = volume;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        logger.debug('AudioPlayer: Audio metadata loaded', { 
          duration: audio.duration,
          fileName 
        });
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        logger.debug('AudioPlayer: Playback ended', { fileName });
      };
      
      const handleError = (e: any) => {
        const errorMsg = e.target?.error?.message || 'Audio playback error';
        logger.error('AudioPlayer: Playback error', { 
          error: errorMsg,
          fileName,
          processedUrl: processedAudioUrl 
        });
        setError(errorMsg);
        setIsPlaying(false);
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [processedAudioUrl, volume, fileName]);

  const togglePlayPause = async () => {
    if (!audioRef.current || isProcessing) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        logger.debug('AudioPlayer: Paused', { fileName });
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        logger.debug('AudioPlayer: Playing', { fileName });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Playback failed';
      logger.error('AudioPlayer: Play/pause failed', { 
        error: errorMsg,
        fileName 
      });
      setError(errorMsg);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!processedAudioUrl) return;
    
    logger.info('AudioPlayer: Starting download', { fileName });
    
    const link = document.createElement('a');
    link.href = processedAudioUrl;
    link.download = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logger.debug('AudioPlayer: Download initiated', { fileName: link.download });
  };

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-3 ${className}`}>
        <div className="text-red-400 text-sm">
          Audio Error: {error}
        </div>
        <div className="text-red-300/70 text-xs mt-1">
          {fileName}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-800/50 rounded-lg p-3 border border-white/10 ${className}`}>
      <audio ref={audioRef} />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isProcessing || !processedAudioUrl}
          className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 
                     flex items-center justify-center text-white transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <FiPause size={14} />
          ) : (
            <FiPlay size={14} className="ml-0.5" />
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-white/60 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          
          <input
            ref={progressRef}
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={!processedAudioUrl}
            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                       [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          
          <span className="text-xs text-white/60 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <FiVolume2 size={14} className="text-white/60" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 
                       [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white 
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={!processedAudioUrl}
          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
          title="Download Audio"
        >
          <FiDownload size={14} className="text-white/70" />
        </button>
      </div>

      {/* File Info */}
      <div className="mt-2 text-xs text-white/50 truncate">
        {fileName}
        {isProcessing && (
          <span className="ml-2 text-purple-400">Processing...</span>
        )}
      </div>
    </div>
  );
} 