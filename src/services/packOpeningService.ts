import { Song, CollectedSong, Rarity, Artist } from '../types';
import { GENRE_ARTISTS, Genre } from './topArtistsService';
import { FALLBACK_GENRE_SONGS } from '../data/fallbackSongs';
import { dataService } from './dataService';
import { fetchArtworkFromAppleMusic, fetchAlbumArtwork } from './musicService';
import { DEFAULT_ALBUM_COVER, isPlaceholderCover } from '../utils/imageFallback';

const jsonp = (baseUrl: string): Promise<any> => {
  return new Promise((resolve) => {
    const callbackName = `jsonp_${Date.now()}_${Math.ceil(Math.random() * 100000)}`;
    const script = document.createElement('script');
    const url = `${baseUrl}&callback=${callbackName}`;

    const cleanup = () => {
      delete (window as any)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 2500);

    (window as any)[callbackName] = (data: any) => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    script.src = url;
    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };

    document.body.appendChild(script);
  });
};

const assignSongAttributes = (song: Song, ownerId: string): CollectedSong => {
  const collectedSong: CollectedSong = {
    id: `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${song.id}`,
    song: {
      ...song,
      releaseDate: song.releaseDate || '2023-01-01',
      artist: {
        ...song.artist,
        pictureUrl: song.artist.pictureUrl || '',
      },
    },
    ownerId,
    isPrestige: false,
    collectedAt: Date.now(),
  };

  const rarityRoll = Math.random();
  // ~1 in 100 packs (~0.167% per card = ~1.0% chance per 6-card pack)
  if (rarityRoll < 0.00167) {
    collectedSong.song.rarity = Rarity.Mythic;
    collectedSong.serialNumber = Math.floor(Math.random() * 10) + 1;
    collectedSong.song.baseRarity = Rarity.Common;
  } else if (rarityRoll < 0.06) {
    collectedSong.song.rarity = Rarity.Rare;
  } else if (rarityRoll < 0.28) {
    collectedSong.song.rarity = Rarity.Uncommon;
  } else {
    collectedSong.song.rarity = Rarity.Common;
  }

  // 2% Shiny chance
  collectedSong.song.isShiny = Math.random() < 0.02;

  return collectedSong;
};

export const generateAndOpenPack = async (
  userId: string,
  existingSongIds: Set<string> = new Set(),
  favoriteArtists: Artist[] = [],
  authToken?: string
): Promise<CollectedSong[]> => {
  // 1. Try server API if auth token is provided
  if (authToken) {
    try {
      const response = await fetch('/api/open-pack', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const pack: CollectedSong[] = await response.json();
        if (Array.isArray(pack) && pack.length > 0) {
          return pack;
        }
      }
    } catch {
      // Backend unavailable, gracefully fall through to client generator
    }
  }

  // 2. Client-side resilient pack generator
  const packSlots: Genre[] = [
    'Pop',
    'Pop',
    'HipHop',
    'Indie',
    'KPop',
    Math.random() < 0.5 ? 'RnB' : 'Rock',
  ];

  // 1.5% chance that one of the cards in the pack is pulled from the user's favorite artists
  const favoriteBoostTriggered = favoriteArtists.length > 0 && Math.random() < 0.015;
  const favoriteBoostSlotIndex = favoriteBoostTriggered
    ? Math.floor(Math.random() * packSlots.length)
    : -1;

  const newPack: CollectedSong[] = [];
  const packTrackIds = new Set<string>();

  for (let slotIndex = 0; slotIndex < packSlots.length; slotIndex++) {
    const genre = packSlots[slotIndex];
    let chosenRawSong: any = null;

    const isFavBoostedSlot = slotIndex === favoriteBoostSlotIndex;

    // Try favorite artist lookup if this slot triggered the 1.5% boost
    if (isFavBoostedSlot && favoriteArtists.length > 0) {
      try {
        const fav = favoriteArtists[Math.floor(Math.random() * favoriteArtists.length)];
        const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(fav.name)}&limit=25&output=jsonp`;
        const data = await jsonp(searchUrl);

        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const validTracks = data.data.filter((t: any) => t && t.id && t.preview && t.album && t.artist);
          if (validTracks.length > 0) {
            const unowned = validTracks.filter(
              (t: any) => !existingSongIds.has(String(t.id)) && !packTrackIds.has(String(t.id))
            );
            const pool = unowned.length > 0 ? unowned : validTracks;
            const pick = pool[Math.floor(Math.random() * pool.length)];

            if (pick && !packTrackIds.has(String(pick.id))) {
              chosenRawSong = {
                id: String(pick.id),
                title: pick.title_short || pick.title,
                artist: {
                  id: String(pick.artist.id),
                  name: pick.artist.name,
                  pictureUrl: pick.artist.picture_medium || pick.artist.picture || fav.pictureUrl,
                },
                album: {
                  id: String(pick.album.id),
                  title: pick.album.title,
                },
                albumArtUrl: pick.album.cover_xl || pick.album.cover_big || pick.album.cover_medium || pick.album.cover || (pick.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${pick.md5_image}/500x500-000000-80-0-0.jpg` : ''),
                previewUrl: pick.preview,
                releaseDate: pick.release_date || '2023-01-01',
                rarity: Rarity.Common,
                isShiny: false,
              };
            }
          }
        }
      } catch {
        // Fallback to genre lookup if Deezer lookup fails
      }
    }

    // Standard genre lookup if not boosted or if favorite lookup didn't yield a song
    if (!chosenRawSong) {
      try {
        const artistList = GENRE_ARTISTS[genre] || ['Taylor Swift', 'Drake', 'BTS'];
        const randomArtist = artistList[Math.floor(Math.random() * artistList.length)];
        const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(randomArtist)}&limit=15&output=jsonp`;
        const data = await jsonp(searchUrl);

        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const validTracks = data.data.filter((t: any) => t && t.id && t.preview && t.album && t.artist);
          if (validTracks.length > 0) {
            const unowned = validTracks.filter(
              (t: any) => !existingSongIds.has(String(t.id)) && !packTrackIds.has(String(t.id))
            );
            const pool = unowned.length > 0 ? unowned : validTracks;
            const pick = pool[Math.floor(Math.random() * pool.length)];

            if (pick && !packTrackIds.has(String(pick.id))) {
              chosenRawSong = {
                id: String(pick.id),
                title: pick.title_short || pick.title,
                artist: {
                  id: String(pick.artist.id),
                  name: pick.artist.name,
                  pictureUrl: pick.artist.picture_medium || pick.artist.picture,
                },
                album: {
                  id: String(pick.album.id),
                  title: pick.album.title,
                },
                albumArtUrl: pick.album.cover_xl || pick.album.cover_big || pick.album.cover_medium || pick.album.cover || (pick.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${pick.md5_image}/500x500-000000-80-0-0.jpg` : ''),
                previewUrl: pick.preview,
                releaseDate: pick.release_date || '2023-01-01',
                rarity: Rarity.Common,
                isShiny: false,
              };
            }
          }
        }
      } catch {
        // Deezer jsonp failed or offline
      }
    }

    // Fallback to high quality curated hits if Deezer search was empty
    if (!chosenRawSong) {
      const fallbackList = FALLBACK_GENRE_SONGS[genre] || FALLBACK_GENRE_SONGS.Pop;
      const unownedFallback = fallbackList.filter(
        (s) => !existingSongIds.has(s.id) && !packTrackIds.has(s.id)
      );
      const pool = unownedFallback.length > 0 ? unownedFallback : fallbackList;
      const pick = pool[Math.floor(Math.random() * pool.length)];

      chosenRawSong = {
        ...pick,
        rarity: Rarity.Common,
        isShiny: false,
      };
    }

    packTrackIds.add(String(chosenRawSong.id));
    existingSongIds.add(String(chosenRawSong.id));

    // Ensure cover art exists
    if (isPlaceholderCover(chosenRawSong.albumArtUrl)) {
      try {
        const cover = await fetchAlbumArtwork(chosenRawSong.artist.name, chosenRawSong.album?.title || chosenRawSong.title);
        if (cover && !isPlaceholderCover(cover)) {
          chosenRawSong.albumArtUrl = cover;
        }
      } catch {}
    }

    const collectedSong = assignSongAttributes(chosenRawSong, userId);
    newPack.push(collectedSong);
  }

  // 3. Persist to Firestore if user is authenticated with Firebase
  if (userId && userId !== 'guest_user') {
    try {
      await dataService.addSongsToCollection(userId, newPack);
    } catch (dbErr) {
      console.warn('Could not persist to Firestore directly:', dbErr);
    }
  }

  // 4. Always maintain local cache backup so cards are never lost
  try {
    const storageKey = `packtunes_collection_${userId || 'guest_user'}`;
    const saved = localStorage.getItem(storageKey);
    const existing: CollectedSong[] = saved ? JSON.parse(saved) : [];
    const map = new Map<string, CollectedSong>();
    existing.forEach((s) => map.set(s.id, s));
    newPack.forEach((s) => map.set(s.id, s));
    localStorage.setItem(storageKey, JSON.stringify(Array.from(map.values())));
  } catch (err) {
    console.warn('Could not update localStorage cache:', err);
  }

  return newPack;
};
