import React, { useRef, useEffect } from 'react';

export interface CanvasVideoPlayerProps {
  url: string;
  className?: string;
  startTime?: number;
  isWideMode?: boolean;
  isPlaying?: boolean;
  isMuted?: boolean;
  currentTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
  onCanPlay?: () => void;
}

export const CanvasVideoPlayer: React.FC<CanvasVideoPlayerProps> = ({
  url,
  className = "w-full h-full object-cover rounded-md",
  isPlaying = false,
  isMuted = true,
  currentTime,
  onTimeUpdate,
  onEnded,
  onDurationChange,
  onCanPlay,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!url) return null;

  const isYouTube = url.startsWith('youtube:') || url.includes('youtube.com') || url.includes('youtu.be');

  if (isYouTube) {
    let videoId = 'UTHLKHL_whs';
    let start = 124;
    let end = 175;

    if (url.startsWith('youtube:')) {
      const parts = url.split(':');
      if (parts[1]) videoId = parts[1];
      if (parts[2]) start = parseInt(parts[2], 10);
      if (parts[3]) end = parseInt(parts[3], 10);
    } else {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) videoId = match[1];
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&start=${start}&end=${end}&modestbranding=1&rel=0&enablejsapi=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`;

    return (
      <div className="relative w-full h-full overflow-hidden bg-black rounded-[inherit] pointer-events-none">
        <iframe
          src={embedUrl}
          title="Canvas Music Video"
          className="absolute w-[160%] h-[160%] -top-[30%] -left-[30%] border-0 object-cover pointer-events-none select-none"
          allow="autoplay; encrypted-media"
        />
      </div>
    );
  }

  // Handle play/pause state and volume for standard HTML5 video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.loop = true;

    if (video.paused) {
      video.play().catch(() => {});
    }
  }, [url]);

  // Handle seeking when currentTime changes from parent (wraps seamlessly across video duration)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentTime === undefined || currentTime === null) return;
    const vidDur = video.duration;
    if (vidDur && vidDur > 0) {
      const targetTime = currentTime % vidDur;
      if (Math.abs(video.currentTime - targetTime) > 0.6) {
        video.currentTime = targetTime;
      }
    } else {
      if (Math.abs(video.currentTime - currentTime) > 0.6) {
        video.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && onTimeUpdate) {
      onTimeUpdate(video.currentTime, video.duration || 0);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && onDurationChange && video.duration) {
      onDurationChange(video.duration);
    }
  };

  return (
    <video
      ref={videoRef}
      src={url}
      autoPlay
      loop={isMuted}
      muted={isMuted}
      playsInline
      className={className}
      style={{ pointerEvents: 'none' }}
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnded}
      onLoadedMetadata={handleLoadedMetadata}
      onCanPlay={onCanPlay}
    />
  );
};


