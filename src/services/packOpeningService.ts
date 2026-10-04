import { Song, CollectedSong, Rarity, Artist } from '../types';
import { GENRE_ARTISTS, Genre } from './topArtistsService';
import { FALLBACK_GENRE_SONGS } from '../data/fallbackSongs';
import { dataService } from './dataService';
import { fetchArtworkFromAppleMusic, fetchAlbumArtwork } from './musicService';
import { DEFAULT_ALBUM_COVER, isPlaceholderCover } from '../utils/imageFallback';
import { mythicSerialService } from './mythicService';

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

const assignSongAttributes = (
  song: Song, 
  ownerId: string,
  options?: { forceMythic?: boolean; shinyMultiplier?: number; isThemedGenrePack?: boolean; isExcludedFromClanWar?: boolean }
): CollectedSong => {
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
    isThemedGenrePack: !!options?.isThemedGenrePack,
    isExcludedFromClanWar: !!options?.isExcludedFromClanWar,
  };

  if (options?.forceMythic) {
    collectedSong.song.rarity = Rarity.Mythic;
    collectedSong.serialNumber = mythicSerialService.getNextSerialNumber(song.id);
    collectedSong.song.baseRarity = Rarity.Common;
  } else {
    const rarityRoll = Math.random();
    // Pure independent RNG - NO cooldown counters, NO forced minimum pack limits
    if (rarityRoll < 0.00167) {
      collectedSong.song.rarity = Rarity.Mythic;
      collectedSong.serialNumber = mythicSerialService.getNextSerialNumber(song.id);
      collectedSong.song.baseRarity = Rarity.Common;
    } else if (rarityRoll < 0.08) {
      collectedSong.song.rarity = Rarity.Rare;
    } else if (rarityRoll < 0.32) {
      collectedSong.song.rarity = Rarity.Uncommon;
    } else {
      collectedSong.song.rarity = Rarity.Common;
    }
  }

  const shinyChance = 0.02 * (options?.shinyMultiplier || 1);
  collectedSong.song.isShiny = Math.random() < shinyChance;

  return collectedSong;
};

export const generateAndOpenPack = async (
  userId: string,
  existingSongIds: Set<string> = new Set(),
  favoriteArtists: Artist[] = [],
  authToken?: string,
  packType: string = 'standard'
): Promise<CollectedSong[]> => {
  // Theme specific artist pools
  const THEME_ARTISTS: Record<string, string[]> = {
    hiphop_royalty: ['Kendrick Lamar', 'Drake', 'J. Cole', 'Travis Scott', 'Kanye West', 'Eminem', '21 Savage', 'Future', 'Playboi Carti', 'Metro Boomin', 'Ken Carson', 'Destroy Lonely', 'A$AP Rocky'],
    retro_legends: ['Queen', 'Michael Jackson', 'Prince', 'Nirvana', 'Fleetwood Mac', 'Madonna', 'Tupac', 'Pink Floyd', 'AC/DC', 'The Beatles', 'David Bowie', 'Guns N\' Roses'],
    kpop_fever: ['BTS', 'BLACKPINK', 'TWICE', 'Stray Kids', 'NewJeans', 'LE SSERAFIM', 'aespa', 'YOASOBI', 'Kenshi Yonezu', 'Ado', 'SEVENTEEN', '(G)I-DLE'],
    indie_gems: ['Tame Impala', 'Arctic Monkeys', 'Phoebe Bridgers', 'Frank Ocean', 'Steve Lacy', 'Clairo', 'Tyler, The Creator', 'Dominic Fike', 'The Strokes', 'Lana Del Rey', 'Gorillaz'],
    pop_2010s_2020s: ['Taylor Swift', 'Ariana Grande', 'Dua Lipa', 'The Weeknd', 'Justin Bieber', 'Katy Perry', 'Bruno Mars', 'Olivia Rodrigo', 'Billie Eilish', 'Harry Styles', 'Rihanna', 'Lady Gaga', 'Ed Sheeran', 'Sabrina Carpenter', 'Chappell Roan', 'Charli xcx', 'Tate McRae', 'Post Malone', 'Shawn Mendes', 'Doja Cat', 'SZA', 'Miley Cyrus'],
  };

  // Check Daily Mythic rules
  let isDailyMythicPack = packType === 'daily_mythic';
  // 20% chance to guarantee a Mythic card in the Daily Mythic Pack
  const mythicTriggered = isDailyMythicPack && Math.random() < 0.20;
  
  // 10% chance that if a Mythic triggers, it picks from user's Favorite Artists
  const favMythicTriggered = mythicTriggered && favoriteArtists.length > 0 && Math.random() < 0.10;

  const mythicSlotIndex = mythicTriggered ? Math.floor(Math.random() * 6) : -1;

  // Standard 5% favorite boost for non-mythic slots
  const favoriteBoostTriggered = favoriteArtists.length > 0 && Math.random() < 0.05;
  const favoriteBoostSlotIndex = (!mythicTriggered && favoriteBoostTriggered)
    ? Math.floor(Math.random() * 6)
    : -1;

  // Genre slot mapping: 100% single-genre if a genre pack is opened
  let packSlots: Genre[];
  if (packType === 'hiphop_royalty') {
    packSlots = ['HipHop', 'HipHop', 'HipHop', 'HipHop', 'HipHop', 'HipHop'];
  } else if (packType === 'kpop_fever') {
    packSlots = ['KPop', 'KPop', 'KPop', 'KPop', 'KPop', 'KPop'];
  } else if (packType === 'indie_gems') {
    packSlots = ['Indie', 'Indie', 'Indie', 'Indie', 'Indie', 'Indie'];
  } else if (packType === 'pop_2010s_2020s') {
    packSlots = ['Pop', 'Pop', 'Pop', 'Pop', 'Pop', 'Pop'];
  } else if (packType === 'retro_legends') {
    packSlots = ['Rock', 'Rock', 'Rock', 'Pop', 'Pop', 'Rock'];
  } else {
    packSlots = [
      'Pop',
      'Pop',
      'HipHop',
      'Indie',
      'KPop',
      Math.random() < 0.5 ? 'RnB' : 'Rock',
    ];
  }

  const newPack: CollectedSong[] = [];
  const packTrackIds = new Set<string>();

  for (let slotIndex = 0; slotIndex < packSlots.length; slotIndex++) {
    const genre = packSlots[slotIndex];
    let chosenRawSong: any = null;

    const isMythicSlot = slotIndex === mythicSlotIndex;
    const isFavBoostedSlot = slotIndex === favoriteBoostSlotIndex || (isMythicSlot && favMythicTriggered);

    // 1. Try favorite artist lookup if triggered
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
      } catch {}
    }

    // 2. Sample from ALL artists of that specific genre (broad 250+ artist pool)
    if (!chosenRawSong) {
      try {
        const fullGenreArtistList = GENRE_ARTISTS[genre] || GENRE_ARTISTS.Pop;
        // Pick a random artist from the entire comprehensive genre roster
        const randomArtist = fullGenreArtistList[Math.floor(Math.random() * fullGenreArtistList.length)];
        const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(randomArtist)}&limit=25&output=jsonp`;
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
      } catch {}
    }

    // 3. Standard genre lookup
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
      } catch {}
    }

    // 4. Fallback to curated hit songs if Deezer offline
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

    // Ensure cover art
    if (isPlaceholderCover(chosenRawSong.albumArtUrl)) {
      try {
        const cover = await fetchAlbumArtwork(chosenRawSong.artist.name, chosenRawSong.album?.title || chosenRawSong.title);
        if (cover && !isPlaceholderCover(cover)) {
          chosenRawSong.albumArtUrl = cover;
        }
      } catch {}
    }

    const isThemedGenrePack = ['hiphop_royalty', 'kpop_fever', 'indie_gems', 'retro_legends', 'pop_2010s_2020s'].includes(packType);
    const isExcludedFromClanWar = packType !== 'standard';
    const shinyMultiplier = packType === 'shiny_rush' ? 5 : 1;
    const collectedSong = assignSongAttributes(chosenRawSong, userId, {
      forceMythic: isMythicSlot,
      shinyMultiplier,
      isThemedGenrePack,
      isExcludedFromClanWar,
    });

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
