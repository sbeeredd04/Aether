import React, { useRef, useState, useEffect } from 'react';
import { FiPlay, FiPause, FiVolume2, FiDownload } from 'react-icons/fi';

interface AudioPlayerProps {
  audioSrc: string;
  fileName?: string;
  mimeType?: string;
  autoPlay?: boolean;
  className?: string;
}

export default function AudioPlayer({ 
  audioSrc, 
  fileName = 'audio.wav', 
  mimeType = 'audio/wav',
  autoPlay = false,
  className = ''
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newVolume = parseFloat(e.target.value) / 100;
    
    if (audio) {
      audio.volume = newVolume;
    }
    setVolume(newVolume);
  };

  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = audioSrc;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-neutral-800/50 rounded-lg p-3 space-y-2 ${className}`}>
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        autoPlay={autoPlay}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors"
          >
            {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
          </button>
          
          <div className="text-xs text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FiVolume2 size={14} className="text-white/60" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          
          <button
            onClick={downloadAudio}
            className="text-white/60 hover:text-white transition-colors p-1"
            title="Download Audio"
          >
            <FiDownload size={14} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={progressPercentage}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${progressPercentage}%, #374151 ${progressPercentage}%, #374151 100%)`
          }}
        />
      </div>

      <div className="text-xs text-white/60 truncate">
        {fileName}
      </div>
    </div>
  );
} 