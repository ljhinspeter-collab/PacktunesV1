import React, { useState, useEffect } from 'react';

interface CanvasVideoPlayerProps {
  url: string;
  className?: string;
  startTime?: number; // start offset in seconds
  isWideMode?: boolean;
}

export const CanvasVideoPlayer: React.FC<CanvasVideoPlayerProps> = ({
  url,
  className = "w-full h-full object-cover rounded-md",
  startTime = 12,
  isWideMode = false
}) => {
  const [showOverlayMask, setShowOverlayMask] = useState(true);

  useEffect(() => {
    setShowOverlayMask(true);
    // Keep the dark overlay active for 3.2 seconds while YouTube auto-fades initial UI controls
    const timer = setTimeout(() => {
      setShowOverlayMask(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, [url]);

  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  if (isYouTube) {
    let videoId = "mzB1VGEGcSU";
    if (url.includes("embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0] || videoId;
    } else if (url.includes("watch?v=")) {
      videoId = url.split("watch?v=")[1]?.split("&")[0] || videoId;
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0] || videoId;
    }

    // Start 12 seconds in (right when Juice WRLD enters the iconic chorus/room visuals) with controls disabled
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&start=${startTime}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&iv_load_policy=3&disablekb=1&fs=0&autohide=1`;

    const iframeSizingClass = isWideMode
      ? "absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none border-0"
      : "absolute top-1/2 left-1/2 w-[360%] h-[360%] -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none border-0 scale-110";

    return (
      <div className="relative w-full h-full overflow-hidden pointer-events-none select-none bg-black">
        <iframe
          src={embedUrl}
          title="Music Video Canvas"
          className={iframeSizingClass}
          allow="autoplay; encrypted-media"
          tabIndex={-1}
        />
        {/* Extended dark mask covering YouTube's initial control overlay until it auto-fades */}
        {showOverlayMask && (
          <div className="absolute inset-0 bg-black transition-opacity duration-700 pointer-events-none z-20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {/* Permanent shield preventing touch/click hover triggers */}
        <div className="absolute inset-0 pointer-events-none z-10 bg-transparent" />
      </div>
    );
  }

  return (
    <video
      src={url}
      autoPlay
      loop
      muted
      playsInline
      className={className}
    />
  );
};
