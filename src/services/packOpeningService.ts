import { Song, CollectedSong, Rarity, Artist } from '../types';
import { GENRE_ARTISTS, Genre } from './topArtistsService';
import { FALLBACK_GENRE_SONGS } from '../data/fallbackSongs';
import { dataService } from './dataService';
import { fetchAlbumArtwork } from './musicService';
import { DEFAULT_ALBUM_COVER, isPlaceholderCover } from '../utils/imageFallback';
import { mythicSerialService } from './mythicService';

// Retro Legends curated pools: Rock legends for Rock slots, Pop/R&B icons for Pop slots
const RETRO_ROCK_LEGENDS: string[] = [
  'Queen', 'Nirvana', 'Fleetwood Mac', 'Pink Floyd', 'AC/DC', 'The Beatles', 'David Bowie', "Guns N' Roses",
  'Led Zeppelin', 'The Rolling Stones', 'Aerosmith', 'The Who', 'Black Sabbath', 'The Police', 'Dire Straits',
  'The Clash', 'The Doors', 'Boston', 'Van Halen', 'Def Leppard', 'Eagles', 'Creedence Clearwater Revival'
];

const RETRO_POP_LEGENDS: string[] = [
  'Michael Jackson', 'Prince', 'Madonna', 'Whitney Houston', 'George Michael', 'Elton John',
  'Cyndi Lauper', 'Stevie Wonder', 'Phil Collins', 'Janet Jackson', 'Lionel Richie', 'Tina Turner',
  'Donna Summer', 'Earth, Wind & Fire', 'Sade', 'Diana Ross'
];

// Deezer JSONP helper with timeout
const deezerJsonp = (baseUrl: string, timeoutMs: number = 3000): Promise<any> => {
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
    }, timeoutMs);

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

// In-memory artist track cache for instant zero-latency recurring pulls
const artistTrackCache = new Map<string, any[]>();
const artistInFlight = new Map<string, Promise<any[]>>();

/**
 * High-speed dual-engine track discovery:
 * 1. Apple Music / iTunes API (primary): 100ms ultra-fast fetch(), high-res 600x600 artwork, no JSONP throttling
 * 2. Deezer API (secondary fallback)
 */
export const fetchArtistTracksWithTimeout = async (artistName: string, timeoutMs: number = 3000): Promise<any[]> => {
  if (!artistName) return [];
  const normalized = artistName.trim().toLowerCase();
  if (artistTrackCache.has(normalized)) {
    return artistTrackCache.get(normalized)!;
  }
  if (artistInFlight.has(normalized)) {
    return artistInFlight.get(normalized)!;
  }

  const p = (async () => {
    // Engine 1: Apple Music / iTunes Search API
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=30`;
      const response = await fetch(itunesUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.results) && json.results.length > 0) {
          const matchingTracks = json.results.filter((track: any) => {
            if (!track || !track.trackName || !track.artistName) return false;
            const tArtist = track.artistName.toLowerCase();
            return tArtist.includes(normalized) || normalized.includes(tArtist) || tArtist.includes(normalized.split(' ')[0]);
          });

          const candidates = matchingTracks.length > 0 ? matchingTracks : json.results;
          const mapped = candidates.map((track: any) => {
            const highResCover = track.artworkUrl100
              ? track.artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600')
              : DEFAULT_ALBUM_COVER;

            return {
              id: `it_${track.trackId}`,
              title: track.trackName,
              artist: {
                id: String(track.artistId || artistName),
                name: track.artistName || artistName,
                pictureUrl: highResCover,
              },
              album: {
                id: String(track.collectionId || track.trackId),
                title: track.collectionName || track.trackName,
              },
              albumArtUrl: highResCover,
              previewUrl: track.previewUrl || '',
              releaseDate: track.releaseDate ? track.releaseDate.split('T')[0] : '2023-01-01',
              rarity: Rarity.Common,
              isShiny: false,
            };
          });

          if (mapped.length > 0) {
            artistTrackCache.set(normalized, mapped);
            return mapped;
          }
        }
      }
    } catch {
      // Fall through to Deezer
    }

    // Engine 2: Deezer JSONP Search API
    try {
      const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(artistName)}&limit=25&output=jsonp`;
      const data = await deezerJsonp(searchUrl, timeoutMs);
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        const validTracks = data.data.filter((t: any) => t && t.id && t.album && t.artist);
        if (validTracks.length > 0) {
          const mapped = validTracks.map((pick: any) => {
            const cover = pick.album?.cover_xl || pick.album?.cover_big || pick.album?.cover_medium || pick.album?.cover ||
              (pick.md5_image ? `https://e-cdns-images.dzcdn.net/images/cover/${pick.md5_image}/500x500-000000-80-0-0.jpg` : '');

            return {
              id: String(pick.id),
              title: pick.title_short || pick.title,
              artist: {
                id: String(pick.artist.id || pick.artist.name),
                name: pick.artist.name || artistName,
                pictureUrl: pick.artist.picture_big || pick.artist.picture_medium || pick.artist.picture || '',
              },
              album: {
                id: String(pick.album?.id || pick.id),
                title: pick.album?.title || pick.title,
              },
              albumArtUrl: cover || DEFAULT_ALBUM_COVER,
              previewUrl: pick.preview || '',
              releaseDate: pick.release_date || '2023-01-01',
              rarity: Rarity.Common,
              isShiny: false,
            };
          });

          artistTrackCache.set(normalized, mapped);
          return mapped;
        }
      }
    } catch {}

    return [];
  })();

  artistInFlight.set(normalized, p);
  try {
    return await p;
  } finally {
    artistInFlight.delete(normalized);
  }
};

const assignSongAttributes = (
  song: Song, 
  ownerId: string,
  options?: { 
    forceMythic?: boolean; 
    forceShiny?: boolean;
    shinyMultiplier?: number; 
    isThemedGenrePack?: boolean; 
    isExcludedFromClanWar?: boolean;
    elevatedRNG?: boolean;
  }
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
    // Daily Mythic Madness: 97% Mythic with serial number, 3% upgrade to ultra-rare Jailbroken 1 of 1!
    if (Math.random() < 0.03) {
      collectedSong.song.rarity = Rarity.Jailbroken;
      collectedSong.song.baseRarity = Rarity.Common;
    } else {
      collectedSong.song.rarity = Rarity.Mythic;
      collectedSong.serialNumber = mythicSerialService.getNextSerialNumber(song.id);
      collectedSong.song.baseRarity = Rarity.Common;
    }
  } else if (options?.elevatedRNG) {
    // Elevated drop rates for non-guaranteed slots in Daily Mythic
    const rarityRoll = Math.random();
    if (rarityRoll < 0.001) {
      collectedSong.song.rarity = Rarity.Jailbroken;
      collectedSong.song.baseRarity = Rarity.Common;
    } else if (rarityRoll < 0.015) {
      collectedSong.song.rarity = Rarity.Mythic;
      collectedSong.serialNumber = mythicSerialService.getNextSerialNumber(song.id);
      collectedSong.song.baseRarity = Rarity.Common;
    } else if (rarityRoll < 0.15) {
      collectedSong.song.rarity = Rarity.Rare;
    } else if (rarityRoll < 0.45) {
      collectedSong.song.rarity = Rarity.Uncommon;
    } else {
      collectedSong.song.rarity = Rarity.Common;
    }
  } else {
    const rarityRoll = Math.random();
    // Standard pack RNG
    // ~1 in 2,500 cards (0.04%) -> Jailbroken 1 of 1!
    // ~1 in 250 cards (0.4%) -> Mythic (numbered serial drop)!
    // 8% -> Rare
    // 24% -> Uncommon
    // Balance -> Common
    if (rarityRoll < 0.0004) {
      collectedSong.song.rarity = Rarity.Jailbroken;
      collectedSong.song.baseRarity = Rarity.Common;
    } else if (rarityRoll < 0.004) {
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

  // Holographic Shiny card drop
  if (options?.forceShiny) {
    collectedSong.song.isShiny = true;
  } else {
    const shinyChance = 0.03 * (options?.shinyMultiplier || 1);
    collectedSong.song.isShiny = Math.random() < shinyChance;
  }

  return collectedSong;
};

export const generateAndOpenPack = async (
  userId: string,
  existingSongIds: Set<string> = new Set(),
  favoriteArtists: Artist[] = [],
  authToken?: string,
  packType: string = 'standard'
): Promise<CollectedSong[]> => {
  const isDailyMythicPack = packType === 'daily_mythic';
  const isShinyRush = packType === 'shiny_rush';

  // Slot 0 is the guaranteed chase card in Daily Mythic and Shiny Rush
  const mythicSlotIndex = isDailyMythicPack ? 0 : -1;
  const guaranteedShinySlotIndex = isShinyRush ? 0 : -1;

  // 25% chance that Daily Mythic's guaranteed Mythic picks from user's favorite artists
  const favMythicTriggered = isDailyMythicPack && favoriteArtists.length > 0 && Math.random() < 0.25;

  // Standard 5% favorite boost for standard packs
  const favoriteBoostTriggered = !isDailyMythicPack && !isShinyRush && favoriteArtists.length > 0 && Math.random() < 0.05;
  const favoriteBoostSlotIndex = favoriteBoostTriggered ? Math.floor(Math.random() * 6) : -1;

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
    // 4 Rock slots and 2 Pop/R&B slots
    packSlots = ['Rock', 'Rock', 'Rock', 'Pop', 'Pop', 'Rock'];
  } else if (packType === 'daily_mythic') {
    packSlots = ['Pop', 'HipHop', 'Rock', 'Indie', 'KPop', 'RnB'];
  } else if (packType === 'shiny_rush') {
    packSlots = ['Pop', 'HipHop', 'Rock', 'Indie', 'KPop', 'RnB'];
  } else {
    // Standard pack: full vibrant genre mix
    const pool: Genre[] = ['Pop', 'HipHop', 'Rock', 'Indie', 'KPop', 'RnB'];
    packSlots = pool.sort(() => Math.random() - 0.5);
  }

  const isThemedGenrePack = ['hiphop_royalty', 'kpop_fever', 'indie_gems', 'retro_legends', 'pop_2010s_2020s'].includes(packType);
  const isExcludedFromClanWar = packType !== 'standard';

  // Step 1: Strict Upfront Distinct Artist Assignment
  // Guarantees all 6 cards in every single pack are from 6 completely DIFFERENT artists!
  const assignedArtists: string[] = [];
  const usedArtistsThisPack = new Set<string>();

  for (let slotIndex = 0; slotIndex < packSlots.length; slotIndex++) {
    const genre = packSlots[slotIndex];
    const isMythicSlot = slotIndex === mythicSlotIndex;
    const isFavBoostedSlot = slotIndex === favoriteBoostSlotIndex || (isMythicSlot && favMythicTriggered);

    let chosenArtist = '';

    // 1. Favorite artist boost (only if not already used in this pack)
    if (isFavBoostedSlot && favoriteArtists.length > 0) {
      const availableFavs = favoriteArtists.filter(f => !usedArtistsThisPack.has(f.name.toLowerCase()));
      if (availableFavs.length > 0) {
        chosenArtist = availableFavs[Math.floor(Math.random() * availableFavs.length)].name;
      }
    }

    // 2. Select from the appropriate artist pool strictly matching the slot's genre
    if (!chosenArtist) {
      let candidatePool: string[] = [];

      if (packType === 'retro_legends') {
        if (genre === 'Rock') {
          // Strictly 70s-90s Rock legends for Rock slots (never Michael Jackson or pop stars)
          candidatePool = RETRO_ROCK_LEGENDS;
        } else {
          // Strictly 70s-90s Pop & R&B icons for Pop slots (Michael Jackson, Prince, Madonna, etc.)
          candidatePool = RETRO_POP_LEGENDS;
        }
      } else {
        // Use the expansive full genre artist pool (150-350+ artists per genre!)
        candidatePool = GENRE_ARTISTS[genre] || GENRE_ARTISTS.Pop;
      }

      // Filter out any artist already used in this pack to ensure 100% variety
      const unusedCandidates = candidatePool.filter(a => !usedArtistsThisPack.has(a.toLowerCase()));
      const pool = unusedCandidates.length > 0 ? unusedCandidates : candidatePool;
      chosenArtist = pool[Math.floor(Math.random() * pool.length)];
    }

    usedArtistsThisPack.add(chosenArtist.toLowerCase());
    assignedArtists.push(chosenArtist);
  }

  // Step 2: Resolve all 6 slots in parallel with their distinct assigned artists
  const slotPromises = packSlots.map(async (genre, slotIndex) => {
    const isMythicSlot = slotIndex === mythicSlotIndex;
    const isGuaranteedShinySlot = slotIndex === guaranteedShinySlotIndex;
    const artistName = assignedArtists[slotIndex];
    let chosenRawSong: any = null;

    try {
      const validTracks = await fetchArtistTracksWithTimeout(artistName);

      if (validTracks.length > 0) {
        const unowned = validTracks.filter((t: any) => !existingSongIds.has(String(t.id)));
        const pool = unowned.length > 0 ? unowned : validTracks;
        const pick = pool[Math.floor(Math.random() * pool.length)];

        if (pick) {
          chosenRawSong = { ...pick };
        }
      }
    } catch {}

    // Fallback if offline or track fetch fails
    if (!chosenRawSong) {
      const fallbackList = FALLBACK_GENRE_SONGS[genre] || FALLBACK_GENRE_SONGS.Pop;
      // Filter fallback to avoid artists already in the pack
      const uniqueFallback = fallbackList.filter(s => {
        const sArtist = (s.artist?.name || '').toLowerCase();
        return !assignedArtists.some((a, idx) => idx !== slotIndex && a.toLowerCase() === sArtist);
      });
      const candidates = uniqueFallback.length > 0 ? uniqueFallback : fallbackList;
      const unownedFallback = candidates.filter((s) => !existingSongIds.has(s.id));
      const pool = unownedFallback.length > 0 ? unownedFallback : candidates;
      const pick = pool[Math.floor(Math.random() * pool.length)];

      chosenRawSong = {
        ...pick,
        rarity: Rarity.Common,
        isShiny: false,
      };
    }

    // Guarantee cover art right inside parallel slot execution
    if (chosenRawSong && (isPlaceholderCover(chosenRawSong.albumArtUrl) || !chosenRawSong.albumArtUrl)) {
      try {
        const cover = await fetchAlbumArtwork(
          chosenRawSong.artist?.name || artistName,
          chosenRawSong.album?.title || chosenRawSong.title || ''
        );
        if (cover && !isPlaceholderCover(cover)) {
          chosenRawSong.albumArtUrl = cover;
        }
      } catch {}
    }

    return {
      chosenRawSong,
      isMythicSlot,
      isGuaranteedShinySlot,
    };
  });

  const rawSlotResults = await Promise.all(slotPromises);

  // Cross-slot deduplication and attribute assignment
  const newPack: CollectedSong[] = [];
  const packTrackIds = new Set<string>();
  const packArtistNames = new Set<string>();

  for (let i = 0; i < rawSlotResults.length; i++) {
    const { isMythicSlot, isGuaranteedShinySlot } = rawSlotResults[i];
    let songCandidate = rawSlotResults[i].chosenRawSong;
    const currentArtist = (songCandidate.artist?.name || '').toLowerCase();

    // Ensure song ID is unique within this pack
    if (packTrackIds.has(String(songCandidate.id)) || packArtistNames.has(currentArtist)) {
      const genre = packSlots[i];
      const fallbackList = FALLBACK_GENRE_SONGS[genre] || FALLBACK_GENRE_SONGS.Pop;
      const alternate = fallbackList.find(s => 
        !packTrackIds.has(String(s.id)) && 
        !packArtistNames.has((s.artist?.name || '').toLowerCase()) &&
        !existingSongIds.has(String(s.id))
      ) || fallbackList.find(s => !packTrackIds.has(String(s.id))) || fallbackList[0];

      if (alternate) {
        songCandidate = { ...alternate, rarity: Rarity.Common, isShiny: false };
      }
    }

    packTrackIds.add(String(songCandidate.id));
    packArtistNames.add((songCandidate.artist?.name || '').toLowerCase());
    existingSongIds.add(String(songCandidate.id));

    const collectedSong = assignSongAttributes(songCandidate, userId, {
      forceMythic: isMythicSlot,
      forceShiny: isGuaranteedShinySlot,
      elevatedRNG: isDailyMythicPack && !isMythicSlot,
      shinyMultiplier: isShinyRush ? 10 : 1, // 30% per card for Golden Shiny Rush!
      isThemedGenrePack,
      isExcludedFromClanWar,
    });

    newPack.push(collectedSong);
  }

  // 3. Immediately maintain local cache backup so cards are never lost
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

  // 4. Persist to Firestore asynchronously in background so pack reveal is instantaneous!
  if (userId && userId !== 'guest_user') {
    dataService.addSongsToCollection(userId, newPack).catch((dbErr) => {
      console.warn('Could not persist to Firestore directly:', dbErr);
    });
  }

  return newPack;
};
