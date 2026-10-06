import { Song, Rarity, Artist, Album as AlbumType, User, Vinyl, CollectedSong } from '../types';
import { GENRE_ARTISTS, Genre } from './topArtistsService';
import { dataService } from './dataService';
import type { HourlyEvent } from './dailyEventService';

import { DEFAULT_ALBUM_COVER, isPlaceholderCover } from '../utils/imageFallback';

const artistDiscographyCache = new Map<string, { songs: Song[], timestamp: number }>();
const albumTracksCache = new Map<string, { tracks: Song[], timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const jsonp = (baseUrl: string, callbackName: string = `jsonp_${Date.now()}_${Math.ceil(Math.random() * 100000)}`, timeoutMs: number = 3000): Promise<any> => {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        const script = document.createElement('script');
        const url = `${baseUrl}&callback=${callbackName}`;
        
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

      const song: Song = {
        id: String(item.id),
        title: item.title_short || item.title || 'Unknown Title',
        artist: artist,
        album: { id: String(item.album?.id || item.id), title: item.album?.title || item.title || 'Single' },
        albumArtUrl: cover,
        previewUrl: item.preview || '',
        releaseDate: item.release_date || '',
        // Set default values that will be overwritten later
        rarity: Rarity.Common, 
        isShiny: false
      };
      return song;
    }
    return null;
};

export const getTrackDetails = async (trackId: string): Promise<Song | null> => {
    if (!trackId) return null;
    const url = `https://api.deezer.com/track/${trackId}?output=jsonp`;
    try {
        const data = await jsonp(url);
        if (data && !data.error && data.id) {
            return processSingleDeezerTrack(data);
        }
    } catch {
        // Silently return null so fallback searches proceed seamlessly
    }
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

    // Fallback: search as album
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
        const searchUrl = `https://api.deezer.com/search?q=${query}&limit=5&output=jsonp`;
        const searchData = await jsonp(searchUrl);
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
        const searchUrl = `https://api.deezer.com/search/album?q=${query}&limit=3&output=jsonp`;
        const searchData = await jsonp(searchUrl);
        if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
            const item = searchData.data.find((it: any) => it && !isPlaceholderCover(it.cover_xl || it.cover_big || it.cover_medium || it.cover)) || searchData.data[0];
            const cover = item.cover_xl || item.cover_big || item.cover_medium || item.cover;
            if (cover && !isPlaceholderCover(cover)) {
                appleArtworkCache.set(cacheKey, cover);
                return cover;
            }
        }
    } catch {}

    // 3. Search Deezer by Album alone if artist didn't match
    if (cleanAlbum && cleanAlbum.length > 2) {
        try {
            const query = encodeURIComponent(cleanAlbum);
            const searchUrl = `https://api.deezer.com/search?q=${query}&limit=5&output=jsonp`;
            const searchData = await jsonp(searchUrl);
            if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
                const match = searchData.data.find((item: any) => item && !isPlaceholderCover(extractCoverUrl(item.album, item)));
                if (match) {
                    const cover = extractCoverUrl(match.album, match);
                    if (cover && !isPlaceholderCover(cover)) {
                        appleArtworkCache.set(cacheKey, cover);
                        return cover;
                    }
                }
            }
        } catch {}
    }

    // 4. Search Apple Music / iTunes
    const appleCover = await fetchArtworkFromAppleMusic(cleanArtist, cleanAlbum);
    if (appleCover && !isPlaceholderCover(appleCover)) {
        appleArtworkCache.set(cacheKey, appleCover);
        return appleCover;
    }

    // 5. Search Apple Music by Album alone
    if (cleanAlbum && cleanAlbum.length > 2) {
        try {
            const query = encodeURIComponent(cleanAlbum);
            const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=3`);
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
                    const hdCover = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600');
                    if (!isPlaceholderCover(hdCover)) {
                        appleArtworkCache.set(cacheKey, hdCover);
                        return hdCover;
                    }
                }
            }
        } catch {}
    }

    return null;
};

export const getSongDetailsWithFallback = async (song: { id?: string; title: string; artist?: { name: string; id?: string }; album?: { title?: string } }): Promise<Song | null> => {
    let resultSong: Song | null = null;
    const artistName = (song.artist?.name || '').trim();
    const cleanTitle = (song.title || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

    // 1. Direct Deezer track lookup (only accept if valid preview and non-placeholder cover)
    if (song.id && /^\d+$/.test(song.id)) {
        try {
            const direct = await getTrackDetails(song.id);
            if (direct && direct.previewUrl && !isPlaceholderCover(direct.albumArtUrl)) {
                return direct;
            }
            if (direct) {
                resultSong = direct;
            }
        } catch {}
    }

    // 2. Search Deezer by Artist + Clean Title
    const query = `${artistName} ${cleanTitle}`.trim();
    if (query) {
        try {
            const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10&output=jsonp`;
            const searchData = await jsonp(searchUrl);
            if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
                // Find track with valid preview and non-placeholder cover
                const match = searchData.data.find((item: any) => item && item.preview && !isPlaceholderCover(extractCoverUrl(item.album, item))) || 
                              searchData.data.find((item: any) => item && item.preview) || 
                              searchData.data[0];
                if (match) {
                    const processed = processSingleDeezerTrack(match);
                    if (processed) {
                        resultSong = processed;
                    }
                }
            }
        } catch {
            // Silently fall through to iTunes API search
        }
    }

    // 3. Fallback search Deezer by Title alone
    if ((!resultSong || !resultSong.previewUrl) && cleanTitle && cleanTitle !== query) {
        try {
            const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(cleanTitle)}&limit=10&output=jsonp`;
            const searchData = await jsonp(searchUrl);
            if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
                const match = searchData.data.find((item: any) => item && item.preview && !isPlaceholderCover(extractCoverUrl(item.album, item))) || 
                              searchData.data.find((item: any) => item && item.preview) || 
                              searchData.data[0];
                if (match) {
                    const processed = processSingleDeezerTrack(match);
                    if (processed) {
                        resultSong = processed;
                    }
                }
            }
        } catch {}
    }

    // 4. Fallback search on Apple Music / iTunes for Audio Preview and HD Artwork
    const lacksCover = !resultSong || isPlaceholderCover(resultSong.albumArtUrl);
    const lacksPreview = !resultSong || !resultSong.previewUrl;

    if (lacksCover || lacksPreview) {
        try {
            const itunesQuery = encodeURIComponent(`${artistName} ${cleanTitle}`.trim());
            const res = await fetch(`https://itunes.apple.com/search?term=${itunesQuery}&entity=song&limit=5`);
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const item = data.results.find((r: any) => (r.previewUrl || r.artworkUrl100) && (artistName.length < 3 || r.artistName?.toLowerCase().includes(artistName.toLowerCase()) || artistName.toLowerCase().includes(r.artistName?.toLowerCase()))) || data.results[0];
                    const itunesArt = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600') : '';
                    const itunesPreview = item.previewUrl || '';
                    const itunesAlbum = item.collectionName || song.album?.title || 'Single';

                    if (resultSong) {
                        if (lacksCover && itunesArt && !isPlaceholderCover(itunesArt)) resultSong.albumArtUrl = itunesArt;
                        if (lacksPreview && itunesPreview) resultSong.previewUrl = itunesPreview;
                    } else {
                        resultSong = {
                            id: song.id || String(item.trackId || Date.now()),
                            title: item.trackName || song.title || 'Unknown Title',
                            artist: {
                                id: song.artist?.id || String(item.artistId || '0'),
                                name: item.artistName || artistName || 'Unknown Artist',
                            },
                            album: {
                                id: String(item.collectionId || '0'),
                                title: itunesAlbum,
                            },
                            albumArtUrl: itunesArt || DEFAULT_ALBUM_COVER,
                            previewUrl: itunesPreview,
                            releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '2023-01-01',
                            rarity: Rarity.Common,
                            isShiny: false
                        };
                    }
                }
            }
        } catch {}
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
}

export const getAlbumDetails = async (albumId: string): Promise<AlbumType | null> => {
    try {
        const data = await jsonp(`https://api.deezer.com/album/${albumId}?output=jsonp`);
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
    const url = `https://api.deezer.com/artist/${artistId}/albums?limit=100&output=jsonp`;
    try {
        const data = await jsonp(url);
        if (!data || !data.data) {
            return [];
        }
        return processDeezerAlbumResponse(data.data);
    } catch (error: any) {
        console.error('Deezer Artist Albums Error:', error);
        throw new Error('Could not fetch artist albums.');
    }
}

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

    const tracksUrl = `https://api.deezer.com/album/${albumId}/tracks?limit=100&output=jsonp`;

    try {
        const tracksData = await jsonp(tracksUrl);
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
            const albumDetailsUrl = `https://api.deezer.com/album/${albumId}?output=jsonp`;
            const albumData = await jsonp(albumDetailsUrl);
            // FIX: Handle cases where Deezer API returns an error or no data for an album ID, preventing crashes.
            if (!albumData || !albumData.id || albumData.error) {
                console.warn(`Could not fetch details for album ${albumId}. It may no longer exist.`);
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
        // FIX: Return an empty array on error to prevent cascading failures in functions like `resyncGoldenVinyls`.
        return [];
    }
}

export const searchArtists = async (query: string): Promise<Artist[]> => {
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=50&output=jsonp`;
    try {
        const data = await jsonp(url);
        if (!data || !data.data) return [];
        
        const allResults = processDeezerArtistResponse(data.data);

        // Sort results to prioritize exact matches
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
        throw new Error('Could not fetch artists.');
    }
};

const getScaledRarity = (index: number, totalTracks: number): Rarity => {
    if (totalTracks <= 1) return Rarity.Rare;
    let rareCount: number;
    let uncommonCount: number;
    if (totalTracks >= 40) {
        rareCount = 5;
        uncommonCount = 10;
    } else {
        rareCount = Math.max(1, Math.round(totalTracks * 0.08));
        uncommonCount = Math.max(1, Math.round(totalTracks * 0.20));
        if (rareCount + uncommonCount >= totalTracks) {
            uncommonCount = Math.max(0, totalTracks - rareCount);
        }
    }
    const uncommonStartIndex = rareCount;
    const commonStartIndex = rareCount + uncommonCount;
    if (index < uncommonStartIndex) return Rarity.Rare;
    if (index < commonStartIndex) return Rarity.Uncommon;
    return Rarity.Common;
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
    
    const url = `https://api.deezer.com/artist/${artistId}/top?limit=250&output=jsonp`;
    try {
        const data = await jsonp(url);
        let discography: Song[] = [];
        if (data && Array.isArray(data.data) && data.data.length > 0) {
            discography = processDeezerResponseWithoutRarity(data.data);
        }

        // Fallback: If Deezer top endpoint has 0 items and artist name or artist details can be retrieved
        if (discography.length === 0) {
            let searchName = artistName;
            if (!searchName) {
                try {
                    const artistInfo = await jsonp(`https://api.deezer.com/artist/${artistId}?output=jsonp`);
                    if (artistInfo && artistInfo.name) {
                        searchName = artistInfo.name;
                    }
                } catch {}
            }

            if (searchName) {
                const searchData = await jsonp(`https://api.deezer.com/search?q=${encodeURIComponent(searchName)}&limit=100&output=jsonp`);
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