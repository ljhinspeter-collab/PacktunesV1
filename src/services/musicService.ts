import { Song, Rarity, Artist, Album as AlbumType } from '../types';
import { GENRE_ARTISTS } from './topArtistsService';
import { DEFAULT_ALBUM_COVER, isPlaceholderCover } from '../utils/imageFallback';

const artistDiscographyCache = new Map<string, { songs: Song[], timestamp: number }>();
const albumTracksCache = new Map<string, { tracks: Song[], timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const jsonp = (baseUrl: string, callbackName: string = `jsonp_${Date.now()}_${Math.ceil(Math.random() * 100000)}`, timeoutMs: number = 10000): Promise<any> => {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        const script = document.createElement('script');
        const joinChar = baseUrl.includes('?') ? '&' : '?';
        const url = `${baseUrl}${joinChar}callback=${callbackName}`;
        
        const cleanup = () => {
            isSettled = true;
            try {
                delete (window as any)[callbackName];
            } catch {}
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };

        const timer = setTimeout(() => {
            if (!isSettled) {
                cleanup();
                reject(new Error(`JSONP request timed out: ${baseUrl.slice(0, 50)}...`));
            }
        }, timeoutMs);
        
        (window as any)[callbackName] = (data: any) => {
            if (!isSettled) {
                clearTimeout(timer);
                cleanup();
                resolve(data);
            }
        };
        
        script.src = url;
        script.crossOrigin = 'anonymous';
        script.onerror = () => {
            if (!isSettled) {
                clearTimeout(timer);
                cleanup();
                reject(new Error("JSONP script load error"));
            }
        };
        
        document.body.appendChild(script);
    });
};

/**
 * Robust Deezer API fetcher.
 * Primary: calls the backend Express proxy `/api/deezer/*`
 * Fallback: calls direct Deezer JSONP
 */
const fetchDeezerApi = async (endpoint: string): Promise<any> => {
    try {
        const res = await fetch(`/api/deezer${endpoint}`);
        if (res.ok) {
            const data = await res.json();
            if (data && !data.error) {
                return data;
            }
        }
    } catch {}

    // Fallback: client-side JSONP
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const joinChar = cleanEndpoint.includes('?') ? '&' : '?';
    const jsonpUrl = `https://api.deezer.com/${cleanEndpoint}${joinChar}output=jsonp`;
    try {
        return await jsonp(jsonpUrl, undefined, 10000);
    } catch (e) {
        console.warn(`JSONP fallback failed for endpoint ${endpoint}:`, e);
        return null;
    }
};

const extractCoverUrl = (album: any, item: any): string => {
    if (!album && !item) return DEFAULT_ALBUM_COVER;
    const cover = album?.cover_xl || album?.cover_big || album?.cover_medium || album?.cover ||
      (album?.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${album.md5_image}/500x500-000000-80-0-0.jpg` : '') ||
      (item?.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${item.md5_image}/500x500-000000-80-0-0.jpg` : '') ||
      item?.album?.cover_xl || item?.album?.cover_big || item?.album?.cover_medium || item?.album?.cover ||
      (item?.album?.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${item.album.md5_image}/500x500-000000-80-0-0.jpg` : '');
    
    if (isPlaceholderCover(cover)) {
      return DEFAULT_ALBUM_COVER;
    }
    return cover || DEFAULT_ALBUM_COVER;
};

const processSingleDeezerTrack = (item: any): Song | null => {
    if (item && item.id && item.artist && (item.preview || item.title)) {
      const artist: Artist = {
        id: String(item.artist.id || '0'),
        name: item.artist.name || 'Unknown Artist',
      };
      const artistPic = item.artist.picture_xl || item.artist.picture_big || item.artist.picture_medium || item.artist.picture;
      if (artistPic) {
        artist.pictureUrl = artistPic;
      }
      
      const cover = extractCoverUrl(item.album, item);

      let preview = item.preview || '';
      if (preview && !preview.startsWith('http')) {
        preview = `https://${preview}`;
      }

      const song: Song = {
        id: String(item.id),
        title: item.title_short || item.title || 'Unknown Title',
        artist: artist,
        album: { id: String(item.album?.id || item.id), title: item.album?.title || item.title || 'Single' },
        albumArtUrl: cover,
        previewUrl: preview,
        releaseDate: item.release_date || '',
        rarity: Rarity.Common, 
        isShiny: false
      };
      return song;
    }
    return null;
};

export const getTrackDetails = async (trackId: string): Promise<Song | null> => {
    if (!trackId) return null;
    try {
        const data = await fetchDeezerApi(`/track/${trackId}`);
        if (data && !data.error && data.id) {
            return processSingleDeezerTrack(data);
        }
    } catch {}
    return null;
};

const appleArtworkCache = new Map<string, string>();

export const fetchArtworkFromAppleMusic = async (artist: string, titleOrAlbum: string): Promise<string | null> => {
    if (!artist && !titleOrAlbum) return null;
    const cleanTitle = (titleOrAlbum || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = (artist || '').trim();
    const cacheKey = `${cleanArtist.toLowerCase()} - ${cleanTitle.toLowerCase()}`;
    if (appleArtworkCache.has(cacheKey)) {
        return appleArtworkCache.get(cacheKey) || null;
    }

    try {
        const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=5`);
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const match = data.results.find((r: any) => r.artworkUrl100) || data.results[0];
                if (match && match.artworkUrl100) {
                    const hdCover = match.artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600');
                    appleArtworkCache.set(cacheKey, hdCover);
                    return hdCover;
                }
            }
        }
    } catch {}

    try {
        const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=3`);
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
                const hdCover = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600');
                appleArtworkCache.set(cacheKey, hdCover);
                return hdCover;
            }
        }
    } catch {}

    return null;
};

export const fetchAlbumArtwork = async (artistName: string, albumName: string): Promise<string | null> => {
    if (!artistName && !albumName) return null;
    const cleanArtist = (artistName || '').trim();
    const cleanAlbum = (albumName || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cacheKey = `album_art_${cleanArtist.toLowerCase()}_${cleanAlbum.toLowerCase()}`;

    if (appleArtworkCache.has(cacheKey)) {
        return appleArtworkCache.get(cacheKey) || null;
    }

    // 1. Search Deezer by artist + album
    try {
        const query = encodeURIComponent(`${cleanArtist} ${cleanAlbum}`.trim());
        const searchData = await fetchDeezerApi(`/search?q=${query}&limit=5`);
        if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
            const match = searchData.data.find((item: any) => item && !isPlaceholderCover(extractCoverUrl(item.album, item))) || searchData.data[0];
            const cover = extractCoverUrl(match.album, match);
            if (cover && !isPlaceholderCover(cover)) {
                appleArtworkCache.set(cacheKey, cover);
                return cover;
            }
        }
    } catch {}

    // 2. Search Deezer Album API
    try {
        const query = encodeURIComponent(`${cleanArtist} ${cleanAlbum}`.trim());
        const searchData = await fetchDeezerApi(`/search/album?q=${query}&limit=3`);
        if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
            const item = searchData.data.find((it: any) => it && !isPlaceholderCover(it.cover_xl || it.cover_big || it.cover_medium || it.cover)) || searchData.data[0];
            const cover = item.cover_xl || item.cover_big || item.cover_medium || item.cover;
            if (cover && !isPlaceholderCover(cover)) {
                appleArtworkCache.set(cacheKey, cover);
                return cover;
            }
        }
    } catch {}

    // 3. Fallback Apple Music Artwork search
    const appleCover = await fetchArtworkFromAppleMusic(cleanArtist, cleanAlbum);
    if (appleCover && !isPlaceholderCover(appleCover)) {
        appleArtworkCache.set(cacheKey, appleCover);
        return appleCover;
    }

    return null;
};

const KNOWN_EXPLICIT_AUDIO: Record<string, string> = {
    'kencarsonsuccubus': '/audio/kencarson_succubus_explicit.mp3',
    'succubus': '/audio/kencarson_succubus_explicit.mp3',
    'lilnasxindustrybaby': '/audio/lilnasx_industrybaby_explicit.mp3',
    'industrybaby': '/audio/lilnasx_industrybaby_explicit.mp3',
};

export const getSongDetailsWithFallback = async (song: { id?: string; title: string; artist?: { name: string; id?: string }; album?: { title?: string } }): Promise<Song | null> => {
    let resultSong: Song | null = null;
    const artistName = (song.artist?.name || '').trim();
    const cleanTitle = (song.title || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const normKey = `${artistName.toLowerCase().replace(/[^a-z0-9]/g, '')}${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const normTitleKey = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check curated explicit lossless audio first
    const explicitAudio = KNOWN_EXPLICIT_AUDIO[normKey] || KNOWN_EXPLICIT_AUDIO[normTitleKey];

    // 1. Direct Deezer track lookup
    if (song.id && /^\d+$/.test(song.id)) {
        try {
            const direct = await getTrackDetails(song.id);
            if (direct && direct.previewUrl && !isPlaceholderCover(direct.albumArtUrl)) {
                if (explicitAudio) direct.previewUrl = explicitAudio;
                return direct;
            }
            if (direct) {
                resultSong = direct;
            }
        } catch {}
    }

    // 2. Search Deezer by Artist + Title with strict artist & title verification
    const query = `${artistName} ${cleanTitle}`.trim();
    if (query) {
        try {
            const searchData = await fetchDeezerApi(`/search?q=${encodeURIComponent(query)}&limit=15`);
            if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
                const items = searchData.data;
                const match = items.find((item: any) => {
                    if (!item || !item.preview) return false;
                    const itemArtist = (item.artist?.name || '').toLowerCase();
                    const itemTitle = (item.title || item.title_short || '').toLowerCase();
                    const targetArtist = artistName.toLowerCase();
                    const targetTitle = cleanTitle.toLowerCase();
                    return (itemArtist.includes(targetArtist) || targetArtist.includes(itemArtist)) &&
                           (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle));
                }) || items.find((item: any) => item && item.preview) || items[0];

                if (match) {
                    const processed = processSingleDeezerTrack(match);
                    if (processed) {
                        resultSong = processed;
                    }
                }
            }
        } catch {}
    }

    // 3. Fallback search Deezer by Title alone
    if ((!resultSong || !resultSong.previewUrl) && cleanTitle) {
        try {
            const searchData = await fetchDeezerApi(`/search?q=${encodeURIComponent(cleanTitle)}&limit=15`);
            if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
                const match = searchData.data.find((item: any) => item && item.preview) || searchData.data[0];
                if (match) {
                    const processed = processSingleDeezerTrack(match);
                    if (processed) {
                        if (resultSong) {
                            if (!resultSong.previewUrl && processed.previewUrl) resultSong.previewUrl = processed.previewUrl;
                            if (isPlaceholderCover(resultSong.albumArtUrl) && !isPlaceholderCover(processed.albumArtUrl)) resultSong.albumArtUrl = processed.albumArtUrl;
                        } else {
                            resultSong = processed;
                        }
                    }
                }
            }
        } catch {}
    }

    // If still missing cover art, try Apple Music artwork ONLY for visual image, not audio
    if (resultSong && isPlaceholderCover(resultSong.albumArtUrl)) {
        try {
            const appleCover = await fetchArtworkFromAppleMusic(artistName, cleanTitle);
            if (appleCover && !isPlaceholderCover(appleCover)) {
                resultSong.albumArtUrl = appleCover;
            }
        } catch {}
    }

    if (resultSong && explicitAudio) {
        resultSong.previewUrl = explicitAudio;
    }

    return resultSong;
};

const processDeezerArtistResponse = (items: any[]): Artist[] => {
    return items.map(item => {
        const artist: Artist = {
            id: String(item.id),
            name: item.name,
        };
        const pictureUrl = item.picture_xl || item.picture_big || item.picture_medium || item.picture;
        if (pictureUrl) {
            artist.pictureUrl = pictureUrl;
        }
        return artist;
    }).filter(artist => artist.id && artist.name);
};

const processDeezerAlbumResponse = (items: any[]): AlbumType[] => {
    return items.map(item => ({
        id: String(item.id),
        title: item.title,
        coverUrl: item.cover_xl || item.cover_big || item.cover_medium || item.cover || (item.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${item.md5_image}/500x500-000000-80-0-0.jpg` : ''),
        tracklistUrl: item.tracklist
    })).filter(album => album.id && album.title && album.coverUrl);
};

export const getAlbumDetails = async (albumId: string): Promise<AlbumType | null> => {
    try {
        const data = await fetchDeezerApi(`/album/${albumId}`);
        if (data && data.id && !data.error) {
            return {
                id: String(data.id),
                title: data.title,
                coverUrl: data.cover_xl || data.cover_big || data.cover_medium || data.cover || (data.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${data.md5_image}/500x500-000000-80-0-0.jpg` : ''),
                tracklistUrl: data.tracklist
            };
        }
    } catch {}
    return null;
};

export const getArtistAlbums = async (artistId: string): Promise<AlbumType[]> => {
    try {
        const data = await fetchDeezerApi(`/artist/${artistId}/albums?limit=100`);
        if (!data || !data.data) {
            return [];
        }
        return processDeezerAlbumResponse(data.data);
    } catch (error: any) {
        console.error('Deezer Artist Albums Error:', error);
        return [];
    }
};

const processAlbumTrackItems = (items: any[], album: {id: string, title: string, coverUrl: string}, artist: Artist): Song[] => {
  return items
    .map(item => {
      if (!item || !item.id || !item.preview) return null;
      
      const songArtist: Artist = { id: String(artist.id), name: artist.name };
      if (artist.pictureUrl) songArtist.pictureUrl = artist.pictureUrl;
      
      const song: Song = {
        id: String(item.id),
        title: item.title || 'Unknown Title',
        artist: songArtist,
        album: { id: String(album.id), title: album.title },
        albumArtUrl: album.coverUrl,
        previewUrl: item.preview,
        releaseDate: item.release_date || '',
        rarity: Rarity.Common,
        isShiny: false,
      };
      return song;
    })
    .filter((song): song is Song => song !== null);
};

export const getAlbumTracks = async (albumOrId: AlbumType | string, artist?: Artist): Promise<Song[]> => {
    const albumId = typeof albumOrId === 'string' ? albumOrId : albumOrId.id;
    
    const cached = albumTracksCache.get(albumId);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.tracks;
    }

    try {
        const tracksData = await fetchDeezerApi(`/album/${albumId}/tracks?limit=100`);
        if (!tracksData || !tracksData.data) {
            albumTracksCache.set(albumId, { tracks: [], timestamp: Date.now() });
            return [];
        }

        let albumForProcessing: AlbumType;
        let artistForProcessing: Artist;

        if (typeof albumOrId === 'object' && artist) {
            albumForProcessing = albumOrId;
            artistForProcessing = artist;
        } else {
            const albumData = await fetchDeezerApi(`/album/${albumId}`);
            if (!albumData || !albumData.id || albumData.error) {
                console.warn(`Could not fetch details for album ${albumId}`);
                albumTracksCache.set(albumId, { tracks: [], timestamp: Date.now() });
                return [];
            }
            albumForProcessing = {
                id: String(albumData.id),
                title: albumData.title,
                coverUrl: albumData.cover_xl || albumData.cover_big || albumData.cover_medium || albumData.cover || (albumData.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${albumData.md5_image}/500x500-000000-80-0-0.jpg` : ''),
                tracklistUrl: albumData.tracklist,
            };
            const artistData: Artist = { id: String(albumData.artist.id), name: albumData.artist.name };
            const pictureUrl = albumData.artist.picture_xl || albumData.artist.picture_big || albumData.artist.picture_medium;
            if (pictureUrl) artistData.pictureUrl = pictureUrl;
            artistForProcessing = artistData;
        }
        
        const processedTracks = processAlbumTrackItems(tracksData.data, albumForProcessing, artistForProcessing);
        albumTracksCache.set(albumId, { tracks: processedTracks, timestamp: Date.now() });
        return processedTracks;
    } catch (error: any) {
        console.error('Deezer Album Tracks Error:', error);
        return [];
    }
};

export const searchArtists = async (query: string): Promise<Artist[]> => {
    try {
        const data = await fetchDeezerApi(`/search/artist?q=${encodeURIComponent(query)}&limit=50`);
        if (!data || !data.data) return [];
        
        const allResults = processDeezerArtistResponse(data.data);
        const lowerCaseQuery = query.toLowerCase().trim();

        const exactMatches: Artist[] = [];
        const otherMatches: Artist[] = [];

        allResults.forEach(artist => {
            if (artist.name.toLowerCase() === lowerCaseQuery) {
                exactMatches.push(artist);
            } else {
                otherMatches.push(artist);
            }
        });
        
        return [...exactMatches, ...otherMatches];
    } catch (error: any) {
        console.error('Deezer Artist Search Error:', error);
        return [];
    }
};

const processDeezerResponseWithoutRarity = (items: any[]): Song[] => {
  const uniqueSongs = new Map<string, Song>();
  items.forEach(item => {
    const song = processSingleDeezerTrack(item);
    if(song && !uniqueSongs.has(song.id)) uniqueSongs.set(song.id, song);
  });
  return Array.from(uniqueSongs.values());
};

export const getArtistDiscography = async (artistId: string, artistName?: string): Promise<Song[]> => {
    const cached = artistDiscographyCache.get(artistId);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) return cached.songs;
    
    try {
        const data = await fetchDeezerApi(`/artist/${artistId}/top?limit=250`);
        let discography: Song[] = [];
        if (data && Array.isArray(data.data) && data.data.length > 0) {
            discography = processDeezerResponseWithoutRarity(data.data);
        }

        if (discography.length === 0) {
            let searchName = artistName;
            if (!searchName) {
                try {
                    const artistInfo = await fetchDeezerApi(`/artist/${artistId}`);
                    if (artistInfo && artistInfo.name) {
                        searchName = artistInfo.name;
                    }
                } catch {}
            }

            if (searchName) {
                const searchData = await fetchDeezerApi(`/search?q=${encodeURIComponent(searchName)}&limit=100`);
                if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
                    discography = processDeezerResponseWithoutRarity(searchData.data);
                }
            }
        }

        artistDiscographyCache.set(artistId, { songs: discography, timestamp: Date.now() });
        return discography;
    } catch (error) {
        console.error(`Error fetching discography for artist ${artistId}:`, error);
        return [];
    }
};
