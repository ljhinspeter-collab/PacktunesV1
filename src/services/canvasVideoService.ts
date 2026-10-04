const videoCache = new Map<string, string | null>();

export const fetchMusicVideoCanvas = async (artist: string, title: string): Promise<string | null> => {
  if (!artist || !title) return null;
  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cacheKey = `${artist.toLowerCase().trim()} - ${cleanTitle.toLowerCase().trim()}`;
  
  if (videoCache.has(cacheKey)) {
    return videoCache.get(cacheKey) || null;
  }

  // 1. Query iTunes Music Video API
  try {
    const query = encodeURIComponent(`${artist} ${cleanTitle}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=musicVideo&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
        const videoUrl = data.results[0].previewUrl;
        videoCache.set(cacheKey, videoUrl);
        return videoUrl;
      }
    }
  } catch (err) {
    console.warn("Could not fetch music video canvas from iTunes:", err);
  }

  // 2. Try secondary search with just title and first word of artist
  try {
    const shortArtist = artist.split(' ')[0] || artist;
    const query = encodeURIComponent(`${shortArtist} ${cleanTitle}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=musicVideo&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
        const videoUrl = data.results[0].previewUrl;
        videoCache.set(cacheKey, videoUrl);
        return videoUrl;
      }
    }
  } catch {}

  videoCache.set(cacheKey, null);
  return null;
};
