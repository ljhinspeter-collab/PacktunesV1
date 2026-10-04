// Elegant SVG fallback image for songs & vinyl albums when art is unavailable or fails to load
export const DEFAULT_ALBUM_COVER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="60%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#030712"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#grad)"/>
  <circle cx="200" cy="200" r="160" fill="#0b0f19" stroke="#374151" stroke-width="4"/>
  <circle cx="200" cy="200" r="120" fill="none" stroke="#1f2937" stroke-width="2"/>
  <circle cx="200" cy="200" r="80" fill="none" stroke="#1f2937" stroke-width="2"/>
  <circle cx="200" cy="200" r="45" fill="url(#gold)" stroke="#78350f" stroke-width="3"/>
  <circle cx="200" cy="200" r="12" fill="#030712"/>
  <path d="M190 190 L190 210 L212 200 Z" fill="#ffffff" opacity="0.9"/>
</svg>
`)}`;

export const DEFAULT_VINYL_COVER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="goldVinyl" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#eab308"/>
      <stop offset="70%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </radialGradient>
  </defs>
  <circle cx="200" cy="200" r="190" fill="url(#goldVinyl)" stroke="#fef08a" stroke-width="6"/>
  <circle cx="200" cy="200" r="150" fill="none" stroke="#ca8a04" stroke-width="3" opacity="0.7"/>
  <circle cx="200" cy="200" r="110" fill="none" stroke="#ca8a04" stroke-width="3" opacity="0.7"/>
  <circle cx="200" cy="200" r="70" fill="#1e1b4b" stroke="#fde047" stroke-width="4"/>
  <circle cx="200" cy="200" r="18" fill="#fde047"/>
</svg>
`)}`;

export const isPlaceholderCover = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (
    trimmed === '' || 
    trimmed === '/default-album.png' || 
    trimmed === DEFAULT_ALBUM_COVER || 
    trimmed === DEFAULT_VINYL_COVER
  ) {
    return true;
  }
  if (trimmed.startsWith('data:image/svg+xml')) {
    return true;
  }
  // Check for Deezer's empty MD5 placeholder (d41d8cd98f00b204e9800998ecf8427e = MD5 of empty string "")
  if (
    trimmed.includes('d41d8cd98f00b204e9800998ecf8427e') ||
    trimmed.includes('/images/cover//') ||
    trimmed.includes('/images/artist//') ||
    trimmed.includes('dzcdn.net/images/cover/d41d8') ||
    trimmed.includes('images/cover//')
  ) {
    return true;
  }
  return false;
};

export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl: string = DEFAULT_ALBUM_COVER) => {
  const target = e.currentTarget;
  if (target.src !== fallbackUrl) {
    target.src = fallbackUrl;
  }
};
