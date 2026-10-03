// FIX: Import `Request` from express to correctly define AuthenticatedRequest, resolving errors with missing `headers` and `body` properties.
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
// @fix: Import ArtistMastery type.
import { Rarity, Song, User, Vinyl, CollectedSong, Artist, Album as AlbumType, LabelRaid, LabelEvent, TradePost, GlobalActivity, ArtistMastery } from '../types.js'; // Assuming types are accessible

// --- SERVER SETUP ---
try {
  admin.initializeApp();
} catch (error: any) {
  if (error.code !== 'app/duplicate-app') {
    console.error('Firebase Admin initialization error:', error);
  }
}

const db = admin.firestore();
const auth = admin.auth();
const app = express();
app.use(cors());
app.use(express.json());

// --- DEEZER & PACK GEN DATA (Copied from frontend) ---
type Genre = 'Pop' | 'HipHop' | 'Indie' | 'KPop' | 'RnB' | 'Rock';
const GENRE_ARTISTS: Record<Genre, string[]> = {
  Pop: ['Taylor Swift', 'Ariana Grande', 'Justin Bieber', 'Ed Sheeran', 'The Weeknd', 'Billie Eilish', 'Dua Lipa', 'Olivia Rodrigo', 'Harry Styles', 'Post Malone'],
  HipHop: ['Drake', 'Kendrick Lamar', 'J. Cole', 'Travis Scott', 'Kanye West', 'Eminem', 'Jay-Z', 'Lil Wayne', 'Future', '21 Savage'],
  Indie: ['Tame Impala', 'Arctic Monkeys', 'The Strokes', 'Phoebe Bridgers', 'Bon Iver', 'Vampire Weekend', 'The Killers', 'Lana Del Rey', 'Florence + The Machine', 'LCD Soundsystem'],
  KPop: ['BTS', 'BLACKPINK', 'TWICE', 'Stray Kids', 'SEVENTEEN', 'NewJeans', 'LE SSERAFIM', '(G)I-DLE', 'IVE', 'aespa'],
  RnB: ['SZA', 'Frank Ocean', 'Beyoncé', 'Rihanna', 'Daniel Caesar', 'Brent Faiyaz', 'Steve Lacy', 'H.E.R.', 'Giveon', 'Summer Walker'],
  Rock: ['Queen', 'The Beatles', 'Led Zeppelin', 'Pink Floyd', 'Nirvana', 'Foo Fighters', 'Red Hot Chili Peppers', 'AC/DC', 'Guns N\' Roses', 'Metallica']
};

// --- DEEZER API HELPERS (Server-side fetch) ---
const deezerApiFetch = async (path: string) => {
    const url = `https://api.deezer.com/${path}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Deezer API error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching from Deezer: ${url}`, error);
        throw error;
    }
};

const searchArtistId = async (artistName: string): Promise<string | null> => {
    const data = await deezerApiFetch(`search/artist?q=${encodeURIComponent(artistName)}`);
    return data?.data?.[0]?.id || null;
};

const getArtistTopTracks = async (artistId: string): Promise<any[]> => {
    const data = await deezerApiFetch(`artist/${artistId}/top?limit=50`);
    return data?.data || [];
};

const processSingleDeezerTrack = (item: any): Song | null => {
    if (item && item.id && item.preview && item.artist && item.album) {
        return {
            id: String(item.id),
            title: item.title_short || item.title || 'Unknown Title',
            artist: { id: String(item.artist.id), name: item.artist.name },
            album: { id: String(item.album.id), title: item.album.title },
            albumArtUrl: item.album.cover_xl || item.album.cover_big || item.album.cover_medium,
            previewUrl: item.preview,
            rarity: Rarity.Common, // Will be overridden
            isShiny: false, // Will be overridden
        };
    }
    return null;
};


// FIX: Added a server-side data service object to handle database interactions, resolving 'serverDataService' is not defined errors.
const serverDataService = {
    addGlobalActivity: async (activity: Omit<GlobalActivity, 'id'>): Promise<void> => {
        try {
            await db.collection('globalActivity').add(activity);
        } catch (error) {
            console.error("Error in addGlobalActivity:", error);
        }
    },
    logMasteryLevelUp: async (userId: string, artistId: string, level: number): Promise<void> => {
        try {
            await db.collection('masteryLogs').add({
                userId,
                artistId,
                level,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error("Error in logMasteryLevelUp:", error);
        }
    },
    incrementWarScore: async (eventId: string, user: User, points: number): Promise<void> => {
        if (points === 0) return;
        try {
            const eventRef = db.collection('events').doc(eventId);
            // Using dot notation with increment is atomic and also creates the field if it doesn't exist.
            await eventRef.update({
                [`individualScores.${user.id}.score`]: admin.firestore.FieldValue.increment(points),
                [`individualScores.${user.id}.name`]: user.name,
                [`individualScores.${user.id}.pfpUrl`]: user.pfpUrl
            });
        } catch (error) {
            console.error("Error in incrementWarScore:", error);
        }
    }
};

// @fix: Redefined AuthenticatedRequest as a type intersection to ensure properties from Express Request are included.
type AuthenticatedRequest = Request & {
  user?: admin.auth.DecodedIdToken;
};

// --- AUTHENTICATION MIDDLEWARE ---
const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        return res.status(401).send('Unauthorized: No token provided.');
    }
    try {
        req.user = await auth.verifyIdToken(idToken);
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).send('Unauthorized: Invalid token.');
    }
};

// --- SECURE TRADE ENDPOINT ---
app.post('/api/execute-trade', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).send('Unauthorized');
    const { tradeId, offerId, decision } = req.body;

    if (!tradeId || !offerId || !decision || (decision !== 'accepted' && decision !== 'declined')) {
        return res.status(400).send('Missing tradeId, offerId, or valid decision.');
    }

    try {
        const activeWarQuery = await db.collection('events').where('isActive', '==', true).where('theme', '==', 'TRADE_TITANS').limit(1).get();
        const activeWarEvent = activeWarQuery.empty ? null : { id: activeWarQuery.docs[0].id, ...activeWarQuery.docs[0].data() } as LabelEvent;

        await db.runTransaction(async (transaction) => {
            const tradeRef = db.collection('tradePosts').doc(tradeId);
            const tradeDoc = await transaction.get(tradeRef);
            if (!tradeDoc.exists) throw new Error("Trade not found!");

            const tradeData = tradeDoc.data() as TradePost;
            if (tradeData.status === 'closed') throw new Error("Trade is already closed.");
            const offerIndex = tradeData.offers.findIndex(o => o.id === offerId);
            if (offerIndex === -1) throw new Error("Offer not found!");
            
            const offer = tradeData.offers[offerIndex];
            if (offer.status !== 'pending') throw new Error("Offer already processed!");
            
            if (decision === 'accepted') {
                if (tradeData.ownerId !== req.user!.uid) throw new Error("Only the trade owner can accept offers.");

                const sellerId = tradeData.ownerId;
                const buyerId = offer.offeredById;
                const songToGive = tradeData.songToTrade;
                const songsToReceive = offer.songsOffered;

                // Verify both users still own their respective songs
                const songsToGiveRef = db.collection('users').doc(sellerId).collection('collection').doc(songToGive.id);
                const songsToReceiveRefs = songsToReceive.map(s => db.collection('users').doc(buyerId).collection('collection').doc(s.id));
                const allDocs = await transaction.getAll(songsToGiveRef, ...songsToReceiveRefs);
                if (allDocs.some(doc => !doc.exists)) throw new Error("One or more songs in the trade no longer exist in the owners' collections.");

                // Perform the swap
                transaction.delete(songsToGiveRef);
                songsToReceiveRefs.forEach(ref => transaction.delete(ref));
                transaction.set(db.collection('users').doc(buyerId).collection('collection').doc(songToGive.id), { ...songToGive, ownerId: buyerId });
                songsToReceive.forEach(song => transaction.set(db.collection('users').doc(sellerId).collection('collection').doc(song.id), { ...song, ownerId: sellerId }));

                // Update collection sizes
                transaction.update(db.collection('users').doc(sellerId), { collectionSize: admin.firestore.FieldValue.increment(songsToReceive.length - 1) });
                transaction.update(db.collection('users').doc(buyerId), { collectionSize: admin.firestore.FieldValue.increment(1 - songsToReceive.length) });

                // Close trade post
                tradeData.status = 'closed';
                tradeData.offers.forEach(o => o.status = o.id === offerId ? 'accepted' : 'declined');
                transaction.update(tradeRef, { status: 'closed', offers: tradeData.offers });
                
                // Log for events
                transaction.set(db.collection('tradeLogs').doc(), { sellerId, buyerId, timestamp: Date.now() });

                // Update war score if applicable
                if (activeWarEvent) {
                    const [sellerDoc, buyerDoc] = await Promise.all([transaction.get(db.collection('users').doc(sellerId)), transaction.get(db.collection('users').doc(buyerId))]);
                    [sellerDoc, buyerDoc].forEach(doc => {
                        const user = doc.data() as User;
                        if (user && user.labelId) {
                            transaction.update(db.collection('events').doc(activeWarEvent.id), {
                                [`individualScores.${user.id}.score`]: admin.firestore.FieldValue.increment(25),
                                [`individualScores.${user.id}.name`]: user.name,
                                [`individualScores.${user.id}.pfpUrl`]: user.pfpUrl
                            });
                        }
                    });
                }

            } else { // declined
                if (tradeData.ownerId !== req.user!.uid && offer.offeredById !== req.user!.uid) throw new Error("You are not authorized to decline this offer.");
                tradeData.offers[offerIndex].status = 'declined';
                transaction.update(tradeRef, { offers: tradeData.offers });
            }
        });
        res.status(200).json({ message: `Offer ${decision} successfully.` });
    } catch (error: any) {
        res.status(500).send(error.message || 'An internal server error occurred during the trade.');
    }
});

app.post('/api/open-pack', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).send('Unauthorized');
    const userId = req.user.uid;

    try {
        const collectionSnapshot = await db.collection('users').doc(userId).collection('collection').get();
        const existingSongIds = new Set(collectionSnapshot.docs.map(doc => doc.data().song.id));
        
        const packSlots: Genre[] = ['Pop', 'Pop', 'HipHop', 'Indie', 'KPop', Math.random() < 0.5 ? 'RnB' : 'Rock'];
        const newPack: CollectedSong[] = [];
        
        for (const genre of packSlots) {
            let foundSong: Song | null = null;
            let attempts = 0;
            while (!foundSong && attempts < 20) { // Increased attempts for more resilience
                // FIX: Select a new artist inside the loop to retry with a different one if the first fails.
                const artistName = GENRE_ARTISTS[genre][Math.floor(Math.random() * GENRE_ARTISTS[genre].length)];
                const artistId = await searchArtistId(artistName);
                if (artistId) {
                    const tracks = await getArtistTopTracks(artistId);
                    const potentialSongs = tracks.map(processSingleDeezerTrack).filter((s): s is Song => s !== null && !existingSongIds.has(s.id));
                    if (potentialSongs.length > 0) {
                        foundSong = potentialSongs[Math.floor(Math.random() * potentialSongs.length)];
                    }
                }
                attempts++;
            }
            if (foundSong) {
                const collectedSong = await assignSongAttributes(foundSong, userId);
                newPack.push(collectedSong);
                existingSongIds.add(foundSong.id); // Add to set to avoid duplicates within the same pack
            }
        }
        
        if (newPack.length < 6) {
           return res.status(500).send("Could not generate a full pack. This can happen with very large collections. Please try again.");
        }
        
        const batch = db.batch();
        const userRef = db.collection('users').doc(userId);
        const collectionRef = userRef.collection('collection');
        
        newPack.forEach(song => {
            const docRef = collectionRef.doc(song.id);
            batch.set(docRef, song);
        });
        batch.update(userRef, { collectionSize: admin.firestore.FieldValue.increment(newPack.length) });
        
        await batch.commit();

        // Sanitize the pack before sending to remove any potential circular references
        // from Firebase or other libraries. This ensures a clean JSON response.
        const sanitizedPack = newPack.map(cs => ({
            id: cs.id,
            song: {
                id: cs.song.id,
                title: cs.song.title,
                artist: {
                    id: cs.song.artist.id,
                    name: cs.song.artist.name,
                    pictureUrl: cs.song.artist.pictureUrl
                },
                album: {
                    id: cs.song.album.id,
                    title: cs.song.album.title
                },
                albumArtUrl: cs.song.albumArtUrl,
                previewUrl: cs.song.previewUrl,
                releaseDate: cs.song.releaseDate,
                rarity: cs.song.rarity,
                baseRarity: cs.song.baseRarity,
                isShiny: cs.song.isShiny
            },
            serialNumber: cs.serialNumber,
            ownerId: cs.ownerId,
            isPrestige: cs.isPrestige,
            collectedAt: cs.collectedAt,
            prestigedAt: cs.prestigedAt
        }));

        res.status(200).json(sanitizedPack);

    } catch (error: any) {
        console.error("Error opening pack:", error);
        res.status(500).send(error.message || "An internal error occurred while opening the pack.");
    }
});

const assignSongAttributes = async (song: Song, ownerId: string): Promise<CollectedSong> => {
    const collectedSong: CollectedSong = {
        id: `cs_${Date.now()}_${song.id}`,
        song: { ...song },
        ownerId,
        isPrestige: false,
        collectedAt: Date.now(),
    };

    const rarityRoll = Math.random();
    if (rarityRoll < 0.001) collectedSong.song.rarity = Rarity.Mythic; // 0.1%
    else if (rarityRoll < 0.05) collectedSong.song.rarity = Rarity.Rare; // 4.9%
    else if (rarityRoll < 0.25) collectedSong.song.rarity = Rarity.Uncommon; // 20%
    else collectedSong.song.rarity = Rarity.Common;

    if (Math.random() < 0.01) { // 1% Shiny chance
        collectedSong.song.isShiny = true;
    }
    
    if (collectedSong.song.rarity === Rarity.Mythic) {
       await db.runTransaction(async (transaction) => {
            const serialRef = db.collection('mythicSerials').doc(song.id);
            const serialDoc = await transaction.get(serialRef);
            const newSerial = (serialDoc.data()?.count || 0) + 1;
            transaction.set(serialRef, { count: newSerial });
            collectedSong.serialNumber = newSerial;
       });
    }

    return collectedSong;
};


// --- SECURE RAID ENDPOINTS ---
const RAID_COOLDOWN = 4 * 60 * 60 * 1000;

const getDamageValue = (song: CollectedSong): number => {
    const rarityPoints: Record<Rarity, number> = { [Rarity.Common]: 100, [Rarity.Uncommon]: 250, [Rarity.Rare]: 800, [Rarity.Mythic]: 3000, [Rarity.Jailbroken]: 25000 };
    let damage = rarityPoints[song.song.rarity] || 0;
    if (song.song.isShiny) damage *= 1.5;
    if (song.isPrestige) damage *= 2;
    return Math.floor(damage);
};

app.post('/api/set-raid-deck', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).send('Unauthorized');
    const { songIds } = req.body;
    if (!Array.isArray(songIds) || songIds.length !== 10) return res.status(400).send('Invalid deck.');
    try {
        const ownedSongsSnapshot = await db.collection('users').doc(req.user.uid).collection('collection').where(admin.firestore.FieldPath.documentId(), 'in', songIds).get();
        if (ownedSongsSnapshot.size !== 10) return res.status(400).send('You do not own all selected songs.');
        await db.collection('users').doc(req.user.uid).update({ raidDeck: songIds });
        res.status(200).send('Raid deck updated.');
    } catch (error) { res.status(500).send('Internal server error.'); }
});

app.post('/api/attack-raid-boss', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).send('Unauthorized');
    const uid = req.user.uid;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return res.status(404).send('User not found.');
        const currentUser = userDoc.data() as User;

        if (currentUser.raidCooldownUntil && currentUser.raidCooldownUntil > Date.now()) return res.status(429).send("Deck is on cooldown.");
        if (!currentUser.raidDeck || currentUser.raidDeck.length !== 10) return res.status(400).send("A 10-song raid deck must be set.");

        const activeRaidQuery = await db.collection('labelRaids').where('isActive', '==', true).orderBy('startTime', 'desc').limit(1).get();
        if (activeRaidQuery.empty) return res.status(404).send('No active raid.');
        const raidDoc = activeRaidQuery.docs[0];
        const raid = { id: raidDoc.id, ...raidDoc.data() } as LabelRaid;

        let totalDamage = 0, dodgedAttacks = 0;
        await db.runTransaction(async (transaction) => {
            const raidRef = db.collection('labelRaids').doc(raid.id);
            const freshRaidDoc = await transaction.get(raidRef);
            if (!freshRaidDoc.exists) throw new Error("Raid not found.");
            const currentRaid = freshRaidDoc.data() as LabelRaid;
            if (!currentRaid.isActive) throw new Error("Raid is no longer active.");

            const songDocs = await transaction.getAll(...currentUser.raidDeck!.map(id => db.collection('users').doc(uid).collection('collection').doc(id)));
            const deck = songDocs.map(doc => doc.data() as CollectedSong);

            const recentArtists = currentRaid.recentAttacks.artists.slice(-10).map(a => a.id);
            const recentRarities = currentRaid.recentAttacks.rarities.slice(-5).map(r => r.type);
            const newRecentArtists: { id: string, timestamp: number }[] = [];
            const newRecentRarities: { type: Rarity, timestamp: number }[] = [];

            deck.forEach(song => {
                let dodgeChance = 0;
                if (recentArtists.includes(song.song.artist.id)) dodgeChance += 0.5;
                if (recentRarities.includes(song.song.rarity)) dodgeChance += 0.3;
                if (Math.random() < dodgeChance) dodgedAttacks++; else totalDamage += getDamageValue(song);
                newRecentArtists.push({ id: song.song.artist.id, timestamp: Date.now() });
                newRecentRarities.push({ type: song.song.rarity, timestamp: Date.now() });
            });
            
            const userIndex = currentRaid.leaderboard.findIndex(u => u.userId === uid);
            const newLeaderboard = [...currentRaid.leaderboard];
            if (userIndex > -1) newLeaderboard[userIndex].damageDealt += totalDamage;
            else newLeaderboard.push({ userId: uid, userName: currentUser.name, userPfpUrl: currentUser.pfpUrl, damageDealt: totalDamage });
            
            transaction.update(raidRef, { 
                currentHp: admin.firestore.FieldValue.increment(-totalDamage),
                recentAttacks: { artists: [...currentRaid.recentAttacks.artists, ...newRecentArtists].slice(-20), rarities: [...currentRaid.recentAttacks.rarities, ...newRecentRarities].slice(-10) },
                leaderboard: newLeaderboard.sort((a,b) => b.damageDealt - a.damageDealt),
            });
            transaction.update(db.collection('users').doc(uid), { raidCooldownUntil: Date.now() + RAID_COOLDOWN });
        });
        res.status(200).json({ totalDamage, dodgedAttacks });
    } catch (error) { res.status(500).send('Internal server error.'); }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});