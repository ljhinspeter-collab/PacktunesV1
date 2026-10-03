import { Song, Rarity, Artist, Album as AlbumType, User, Vinyl, CollectedSong } from '../types';
import { GENRE_ARTISTS, Genre } from './topArtistsService';
import { dataService } from './dataService';
import type { HourlyEvent } from './dailyEventService';

const artistDiscographyCache = new Map<string, { songs: Song[], timestamp: number }>();
const albumTracksCache = new Map<string, { tracks: Song[], timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const jsonp = (baseUrl: string, callbackName: string = `jsonp_${Date.now()}_${Math.ceil(Math.random() * 100000)}`, timeoutMs: number = 4000): Promise<any> => {
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
        script.onerror = (err) => {
            if (!isSettled) {
                clearTimeout(timer);
                cleanup();
                reject(err);
            }
        };
        
        document.body.appendChild(script);
    });
};

const processSingleDeezerTrack = (item: any): Song | null => {
    if (item && item.id && item.preview && item.artist && item.album) {
      const artist: Artist = {
        id: String(item.artist.id),
        name: item.artist.name,
      };
      const artistPic = item.artist.picture_xl || item.artist.picture_big || item.artist.picture_medium;
      if (artistPic) {
        artist.pictureUrl = artistPic;
      }
      
      const song: Song = {
        id: String(item.id),
        title: item.title || 'Unknown Title',
        artist: artist,
        album: { id: String(item.album.id), title: item.album.title || 'Unknown Album' },
        albumArtUrl: item.album.cover_xl || item.album.cover_big || item.album.cover_medium,
        previewUrl: item.preview,
        releaseDate: item.release_date || '',
        // Set default values that will be overwritten later
        rarity: Rarity.Common, 
        isShiny: false
      };
      return song;
    }
    return null;
}

export const getTrackDetails = async (trackId: string): Promise<Song | null> => {
    const url = `https://api.deezer.com/track/${trackId}?output=jsonp`;
    try {
        const data = await jsonp(url);
        if (data && !data.error) {
            return processSingleDeezerTrack(data);
        }
    } catch (error) {
        console.error(`Error fetching details for track ${trackId}:`, error);
    }
    return null;
};

const processDeezerArtistResponse = (items: any[]): Artist[] => {
    return items.map(item => {
        const artist: Artist = {
            id: String(item.id),
            name: item.name,
        };
        const pictureUrl = item.picture_xl || item.picture_big || item.picture_medium;
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
        coverUrl: item.cover_xl || item.cover_big || item.cover_medium,
        tracklistUrl: item.tracklist
    })).filter(album => album.id && album.title && album.coverUrl);
}

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
                coverUrl: albumData.cover_xl || albumData.cover_big || albumData.cover_medium,
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

const getArtistDiscography = async (artistId: string): Promise<Song[]> => {
    const cached = artistDiscographyCache.get(artistId);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) return cached.songs;
    
    const url = `https://api.deezer.com/artist/${artistId}/top?limit=250&output=jsonp`;
    try {
        const data = await jsonp(url);
        if (!data || !data.data) {
            artistDiscographyCache.set(artistId, { songs: [], timestamp: Date.now() });
            return [];
        }
        const discography = processDeezerResponseWithoutRarity(data.data);
        artistDiscographyCache.set(artistId, { songs: discography, timestamp: Date.now() });
        return discography;
    } catch (error) {
        console.error(`Error fetching discography for artist ${artistId}:`, error);
        return [];
    }
};