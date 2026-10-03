import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, Unsubscribe, doc, deleteField, query, where, orderBy, limit, writeBatch, runTransaction, increment, arrayRemove, arrayUnion, addDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

import type { User, Song, CollectedSong, Artist, TradePost, TradeOffer, Badge, Vinyl, Mixtape, ArtistMastery, Showcase, RecordLabel, LabelEvent, LabelRaid, SongBattle, GlobalActivity, Chat, Message, LabelChatMessage, UserContextType, EventReward, RoomLayout, GrooveGuardian, LabyrinthRoom, LabyrinthRequirement, Title } from '../types';
import { auth, db } from '../services/firebase';
import { dataService, LATEST_DATA_VERSION } from '../services/dataService';
import { generateBattleReport } from '../services/aiService';
import { challenges } from '../services/challengeService';
import { Rarity } from '../types';
// FIX: Import searchSongs which is now correctly exported from musicService
import { getAlbumTracks, getTrackDetails, searchArtists } from '../services/musicService';
import { useNotification } from './NotificationContext';
import type { HourlyEvent } from '../services/dailyEventService';
import { manageEventCycle } from '../services/eventService';
import { manageRaidCycle, attackRaidBoss as performRaidAttack } from '../services/raidService';
import { GENRES } from '../services/topArtistsService';
import { generateAndOpenPack } from '../services/packOpeningService';
// FIX: Implement missing UserContextType functions
import { calculateGuardianUpdateParts, isBonusAvailable } from '../services/guardianService';
import { isRoomUnlocked, validateContribution } from '../services/labyrinthService';


export const MASTERY_LEVELS = [
    { level: 1, name: "Follower", xpThreshold: 100 },
    { level: 2, name: "Apprentice", xpThreshold: 500 },
    { level: 3, name: "Adept", xpThreshold: 2000 },
    { level: 4, name: "Master", xpThreshold: 8000 },
];

const XP_PER_RARITY = {
    [Rarity.Common]: 8,
    [Rarity.Uncommon]: 15,
    [Rarity.Rare]: 30,
    [Rarity.Mythic]: 250,
    [Rarity.Jailbroken]: 0,
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentUserCollection, setCurrentUserCollection] = useState<CollectedSong[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [tradePosts, setTradePosts] = useState<TradePost[]>([]);
    const [recordLabels, setRecordLabels] = useState<RecordLabel[]>([]);
    const [events, setEvents] = useState<LabelEvent[]>([]);
    const [labelRaids, setLabelRaids] = useState<LabelRaid[]>([]);
    const [songBattles, setSongBattles] = useState<SongBattle[]>([]);
    const [globalActivityFeed, setGlobalActivityFeed] = useState<GlobalActivity[]>([]);
    
    const [rewardPack, setRewardPack] = useState<CollectedSong[] | null>(null);
    const [isOpeningPack, setIsOpeningPack] = useState(false);
    
    const [viewingUser, setViewingUserState] = useState<User | null>(null);
    const [viewingUserCollection, setViewingUserCollection] = useState<CollectedSong[]>([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [viewingUserShowcaseSongs, setViewingUserShowcaseSongs] = useState<{ favoriteSong?: CollectedSong, rarestSong?: CollectedSong } | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
    const [activeChatMessages, setActiveChatMessages] = useState<Message[]>([]);
    const [activeLabelChatMessages, setActiveLabelChatMessages] = useState<LabelChatMessage[]>([]);
    const [rewards, setRewards] = useState<EventReward[]>([]);
    
    const [viewingRoomForUser, setViewingRoomForUser] = useState<User | null>(null);
    const previousBadgesRef = useRef<Badge[]>([]);
    const userSessionIdRef = useRef<string | null>(null);
    const dailyCheckPerformed = useRef(false);
    const mythicFixRun = useRef(false);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setFirebaseUser(user);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        const unsubscribers: Unsubscribe[] = [];

        if (firebaseUser) {
            const userId = firebaseUser.uid;
            
            manageEventCycle();
            manageRaidCycle();

            // Pre-load cached collection if available so collection displays immediately
            try {
                const saved = localStorage.getItem(`packtunes_collection_${userId}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCurrentUserCollection(parsed);
                    }
                }
            } catch {}
            
            unsubscribers.push(onSnapshot(doc(db, 'users', userId), (userDoc) => {
                if (userDoc.exists()) {
                    const userData = userDoc.data() as User;
                    setCurrentUser(userData);
                } else {
                    console.error(`Firestore document for user ${userId} not found! Signing out.`);
                    firebaseSignOut(auth);
                    addNotification({ type: 'generic', message: "User profile not found. Please try signing up again." });
                }
            }));
            
            unsubscribers.push(onSnapshot(collection(db, 'users', userId, 'collection'), (snapshot) => {
                const collectionData = snapshot.docs.map(doc => doc.data() as CollectedSong);
                // Deduplicate and filter out any incomplete documents
                const map = new Map<string, CollectedSong>();
                collectionData.forEach(item => {
                    if (item && item.id && item.song && item.song.title) map.set(item.id, item);
                });
                const uniqueCollection = Array.from(map.values());
                setCurrentUserCollection(uniqueCollection);
                try {
                    localStorage.setItem(`packtunes_collection_${userId}`, JSON.stringify(uniqueCollection));
                } catch {}
            }));
            
            unsubscribers.push(onSnapshot(collection(db, 'users', userId, 'rewards'), (snapshot) => {
                const rewardsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as EventReward);
                setRewards(rewardsData);
            }));

            unsubscribers.push(onSnapshot(collection(db, 'users'), s => {
                const userList = s.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        name: data.name || 'Collector',
                        pfpUrl: data.pfpUrl || 'https://i.pravatar.cc/150',
                        friendIds: Array.isArray(data.friendIds) ? data.friendIds : [],
                        favoriteArtists: Array.isArray(data.favoriteArtists) ? data.favoriteArtists : [],
                        collectionSize: typeof data.collectionSize === 'number' ? data.collectionSize : 0,
                        prestigeCount: typeof data.prestigeCount === 'number' ? data.prestigeCount : 0,
                        ...data,
                    } as User;
                });
                setUsers(userList);
            }));

            unsubscribers.push(onSnapshot(collection(db, 'tradePosts'), s => {
                const posts = s.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        seeking: data.seeking || 'Any offers',
                        status: data.status || 'open',
                        createdAt: data.createdAt || Date.now(),
                        ownerName: data.ownerName || 'User',
                        ownerPfpUrl: data.ownerPfpUrl || 'https://i.pravatar.cc/150',
                        offers: Array.isArray(data.offers) ? data.offers : [],
                        ...data,
                    } as TradePost;
                }).filter(p => p && p.songToTrade && p.songToTrade.song);
                setTradePosts(posts);
            }));

            unsubscribers.push(onSnapshot(collection(db, 'recordLabels'), s => {
                const labels = s.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        name: data.name || 'Unnamed Label',
                        description: data.description || '',
                        pfpUrl: data.pfpUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150',
                        ownerId: data.ownerId || '',
                        memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
                        joinType: data.joinType || 'open',
                        pendingRequests: Array.isArray(data.pendingRequests) ? data.pendingRequests : [],
                        trophies: Array.isArray(data.trophies) ? data.trophies : [],
                        ...data,
                    } as RecordLabel;
                });
                setRecordLabels(labels);
            }));
            unsubscribers.push(onSnapshot(query(collection(db, 'events'), orderBy('startTime', 'desc')), s => setEvents(s.docs.map(d => ({id: d.id, ...d.data()}) as LabelEvent))));
            unsubscribers.push(onSnapshot(query(collection(db, 'labelRaids'), orderBy('startTime', 'desc')), s => setLabelRaids(s.docs.map(d => ({id: d.id, ...d.data()}) as LabelRaid))));
            unsubscribers.push(onSnapshot(collection(db, 'songBattles'), s => setSongBattles(s.docs.map(d => ({id: d.id, ...d.data()}) as SongBattle))));
            unsubscribers.push(onSnapshot(query(collection(db, 'globalActivity'), orderBy('timestamp', 'desc'), limit(50)), s => setGlobalActivityFeed(s.docs.map(d => ({id: d.id, ...d.data()}) as GlobalActivity))));
            
             unsubscribers.push(onSnapshot(query(collection(db, 'chats'), where('participantIds', 'array-contains', userId)), (snapshot) => {
                setChats(snapshot.docs.map(doc => doc.data() as Chat));
            }));
        } else {
            setCurrentUser(null);
            setCurrentUserCollection([]);
            setUsers([]);
            setTradePosts([]);
            setRecordLabels([]);
            setEvents([]);
            setLabelRaids([]);
            setSongBattles([]);
            setGlobalActivityFeed([]);
            setChats([]);
            setActiveChatIdState(null);
            setViewingUserState(null);
            setActiveLabelChatMessages([]);
            setRewards([]);
        }

        return () => unsubscribers.forEach(unsub => unsub());
    }, [firebaseUser, addNotification]);

    useEffect(() => {
        if (currentUser) {
            // If the user ID has changed (new login) or it's the first load, reset the baseline.
            if (userSessionIdRef.current !== currentUser.id) {
                userSessionIdRef.current = currentUser.id;
                previousBadgesRef.current = currentUser.earnedBadges;
                return; // Don't notify on the first pass for a new user session
            }

            // Now, we are in a subsequent update for the same user. Compare for new badges.
            const oldBadges = new Set(previousBadgesRef.current.map(b => b.name));
            currentUser.earnedBadges.forEach(badge => {
                if (!oldBadges.has(badge.name)) {
                    addNotification({
                        type: 'challenge',
                        message: `Achievement: ${badge.name}`,
                    });
                }
            });
            // Update the ref for the next comparison.
            previousBadgesRef.current = currentUser.earnedBadges;

        } else {
            // User signed out, reset session tracking.
            userSessionIdRef.current = null;
            previousBadgesRef.current = [];
        }
    }, [currentUser, addNotification]);
    
     useEffect(() => {
        if (currentUser && currentUserCollection.length > 0 && !mythicFixRun.current) {
            mythicFixRun.current = true;
            dataService.fixNullMythicSerials(currentUser, currentUserCollection)
                .then(() => console.log("Mythic serial number scan complete."))
                .catch(err => console.error("Mythic serial scan failed:", err));
        }
    }, [currentUser, currentUserCollection]);

    useEffect(() => {
        let unsubscribe: Unsubscribe | null = null;
        if (activeChatId) {
            const messagesRef = collection(db, 'chats', activeChatId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'));
            unsubscribe = onSnapshot(q, (snapshot) => {
                setActiveChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Message));
            }, (error) => {
                console.warn('Error listening to chat messages:', error);
                setActiveChatMessages([]);
            });
        } else {
            setActiveChatMessages([]);
        }
        return () => { if (unsubscribe) unsubscribe(); };
    }, [activeChatId]);

    useEffect(() => {
        let unsubscribe: Unsubscribe | null = null;
        if (currentUser?.labelId) {
            const messagesRef = collection(db, 'recordLabels', currentUser.labelId, 'chatMessages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
            unsubscribe = onSnapshot(q, (snapshot) => {
                setActiveLabelChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as LabelChatMessage));
            }, (error) => {
                console.warn('Error listening to label chat messages:', error);
                setActiveLabelChatMessages([]);
            });
        } else {
            setActiveLabelChatMessages([]);
        }
        return () => { if (unsubscribe) unsubscribe(); };
    }, [currentUser?.labelId]);
    
    const isSameDay = (d1: number, d2: number) => {
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
    };

    const checkForDailyLoginReward = useCallback(async () => {
        if (!currentUser || (currentUser.lastLogin && isSameDay(currentUser.lastLogin, Date.now()))) {
            return;
        }

        console.log("Processing daily login...");
        const yesterday = Date.now() - 24 * 60 * 60 * 1000;
        const newStreak = (currentUser.lastLogin && isSameDay(currentUser.lastLogin, yesterday))
            ? (currentUser.loginStreak || 0) + 1
            : 1;

        let updates: any = {
            lastLogin: Date.now(),
            loginStreak: newStreak
        };
        
        await updateCurrentUser(updates);
        addNotification({ type: 'generic', message: `Welcome back! Your login streak is now ${newStreak}.` });

    }, [currentUser, addNotification]);

    const dailyLoginCheckRef = useRef(checkForDailyLoginReward);
    useEffect(() => {
        dailyLoginCheckRef.current = checkForDailyLoginReward;
    });

    useEffect(() => {
        if (currentUser && !dailyCheckPerformed.current) {
            dailyCheckPerformed.current = true;
            (async () => {
                try {
                    await dailyLoginCheckRef.current();
                } catch (error) {
                    console.error("Error during daily login check:", error);
                    addNotification({ type: 'generic', message: 'Failed to process daily login.' });
                }
            })();
        }
        if (!currentUser) {
            dailyCheckPerformed.current = false;
        }
    }, [currentUser, addNotification]);

    const findMythicOwnerName = useCallback(
        (songId: string, serialNumber: number) => dataService.findMythicOwnerName(songId, serialNumber),
        []
    );
    
    const signIn = (email: string, password?: string) => {
        if (!password) return Promise.reject("Password is required.");
        return signInWithEmailAndPassword(auth, email, password).then(() => {});
    };
    const signUp = async (email: string, password: string, name: string, bio: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await dataService.createUserProfile(userCredential.user.uid, email, name, bio);
    };
    const signOut = () => firebaseSignOut(auth);
    
    const continueAsGuest = () => {
        let initialCollection: CollectedSong[] = [];
        try {
            const saved = localStorage.getItem('packtunes_collection_guest_user');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) initialCollection = parsed;
            }
        } catch {}
        setCurrentUserCollection(initialCollection);

        const guestUser: User = {
            id: 'guest_user',
            email: 'collector@packtunes.app',
            name: 'Guest Collector',
            bio: 'Unboxing music packs on PackTunes.',
            pfpUrl: 'https://i.pravatar.cc/150?u=packtunes_collector',
            favoriteArtists: [],
            friendIds: [],
            earnedBadges: [],
            vinyls: [],
            artistMastery: {},
            mixtapes: [],
            featuredMixtapeId: null,
            showcase: { proudestVinylIds: [] },
            playlistSongIds: [],
            labelId: null,
            pendingLabelRequests: [],
            dataVersion: LATEST_DATA_VERSION,
            prestigeCount: 0,
            collectionSize: initialCollection.length,
            shinyHuntArtistId: null,
            inventory: { shinyPolishers: 3, shinyCharms: 1 },
        };
        setCurrentUser(guestUser);
        setIsLoading(false);
    };

    const openNewPack = async () => {
        if (isOpeningPack) return;
        setIsOpeningPack(true);

        try {
            const userId = currentUser?.id || auth.currentUser?.uid || 'guest_user';
            const token = await auth.currentUser?.getIdToken().catch(() => undefined);
            const existingSongIds = new Set(currentUserCollection.map((cs) => cs.song.id));
            const favoriteArtists = currentUser?.favoriteArtists || [];

            const newPack = await generateAndOpenPack(userId, existingSongIds, favoriteArtists, token);
            setRewardPack(newPack);

            // Deduplicate immediately by song instance ID so collection never has duplicate entries
            setCurrentUserCollection((prev) => {
                const map = new Map<string, CollectedSong>();
                prev.forEach(item => map.set(item.id, item));
                newPack.forEach(item => map.set(item.id, item));
                const updated = Array.from(map.values());
                try {
                    localStorage.setItem(`packtunes_collection_${userId}`, JSON.stringify(updated));
                } catch {}
                return updated;
            });

            if (currentUser) {
                setCurrentUser((prev) => prev ? {
                    ...prev,
                    collectionSize: (prev.collectionSize || 0) + newPack.length
                } : null);
            }
        } catch (error) {
            console.error("Error opening pack:", error);
            addNotification({ type: 'generic', message: (error as Error).message || "Failed to open pack." });
        } finally {
            setIsOpeningPack(false);
        }
    };
    
    // FIX: Changed `data` type to `any` to allow for Firestore's dot notation for nested field updates.
    const updateCurrentUser = (data: any) => dataService.updateUser(currentUser!.id, data);
    const setFavoriteArtists = (artists: Artist[]) => updateCurrentUser({ favoriteArtists: artists });
    const addFriend = (friendId: string) => updateCurrentUser({ friendIds: arrayUnion(friendId) });
    const removeFriend = (friendId: string) => updateCurrentUser({ friendIds: arrayRemove(friendId) });
    const updateShowcase = (data: Partial<Showcase>) => {
        const updateData: {[key: string]: any} = {};
        if (data.favoriteSongId !== undefined) updateData['showcase.favoriteSongId'] = data.favoriteSongId || deleteField();
        if (data.rarestSongId !== undefined) updateData['showcase.rarestSongId'] = data.rarestSongId || deleteField();
        if (data.proudestVinylIds !== undefined) updateData['showcase.proudestVinylIds'] = data.proudestVinylIds;
        return dataService.updateUser(currentUser!.id, updateData);
    };

    const updatePlaylist = async (songIds: string[]) => {
        if (!currentUser) return;
        await updateCurrentUser({ playlistSongIds: songIds });
    };
    
    const setViewingUser = useCallback((user: User | null) => {
        setViewingUserState(user);
        setIsProfileModalOpen(!!user);
        if (user) {
            dataService.getShowcaseSongs(user.id, user.showcase)
                .then(setViewingUserShowcaseSongs);
            dataService.getCollectionForUser(user.id)
                .then(setViewingUserCollection);
        } else {
            setViewingUserShowcaseSongs(null);
            setViewingUserCollection([]);
        }
    }, []);
    const setActiveChatId = (chatId: string | null) => {
        setActiveChatIdState(chatId);
    };

    const getOrCreateChat = async (otherUser: User) => {
        if (!currentUser) return;
        const chatId = await dataService.getOrCreateChat(currentUser, otherUser);
        setActiveChatId(chatId);
    };

    const sendMessage = async (chatId: string, text: string) => {
        if (!currentUser) return;
        await dataService.sendMessage(chatId, currentUser.id, text);
    };
    
    const sendLabelChatMessage = async (text: string) => {
        if (!currentUser || !currentUser.labelId) return;
        await dataService.sendLabelChatMessage(currentUser.labelId, currentUser, text);
    };
    
    const toggleLabelMessageReaction = async (messageId: string, emoji: string) => {
        if (!currentUser || !currentUser.labelId) return;
        await dataService.toggleReaction(currentUser.labelId, messageId, emoji, currentUser.id);
    };

    const createTradePost = async (songToTrade: CollectedSong, seeking: string) => {
        if (!currentUser) throw new Error("User not logged in");
        await dataService.createTradePost(currentUser, songToTrade, seeking);
        addNotification({ type: 'generic', message: 'Trade post created successfully!' });
    };

    const cancelTradePost = async (tradeId: string) => {
        await dataService.cancelTradePost(tradeId);
        addNotification({ type: 'generic', message: 'Trade post cancelled.' });
    };

    const makeOffer = async (tradePost: TradePost, songsOffered: CollectedSong[]) => {
        if (!currentUser) throw new Error("User not logged in");
        await dataService.makeOffer(tradePost.id, currentUser, songsOffered);
        addNotification({ type: 'generic', message: `Offer sent for ${tradePost.songToTrade.song.title}!` });
    };

    const reviewOffer = async (tradeId: string, offerId: string, decision: 'accepted' | 'declined') => {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Authentication error. Please sign in again.");
    
        const response = await fetch('/api/execute-trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ tradeId, offerId, decision })
        });
    
        if (!response.ok) {
            const errorText = await response.text();
            addNotification({ type: 'generic', message: `Trade failed: ${errorText}` });
            throw new Error(errorText || 'Failed to process the offer.');
        }
        
        addNotification({ type: 'generic', message: `Offer ${decision} successfully.` });
    };

    const prestigeSong = async (mythicToPrestigeId: string, shinyIdsToSacrifice: string[]) => {
        if (!currentUser) return;
        const mythic = currentUserCollection.find(cs => cs.id === mythicToPrestigeId);
        if (!mythic) return;

        await dataService.prestigeSong(currentUser.id, mythic.song.artist.id, mythicToPrestigeId, shinyIdsToSacrifice);
        
        addNotification({ type: 'generic', message: `Prestige successful for ${mythic.song.title}!` });
        await dataService.addGlobalActivity({
            type: 'CRAFT_PRESTIGE',
            userId: currentUser.id,
            userName: currentUser.name,
            userPfpUrl: currentUser.pfpUrl,
            song: {
                title: mythic.song.title,
                artistName: mythic.song.artist.name,
                artistId: mythic.song.artist.id,
                albumArtUrl: mythic.song.albumArtUrl,
                rarity: mythic.song.rarity,
                isShiny: mythic.song.isShiny,
                isPrestige: true,
            },
            timestamp: Date.now(),
        });
    };
    
    const createMixtape = async (name: string, description: string) => {
        if (!currentUser) return;
        const newMixtape: Mixtape = { id: `mix_${Date.now()}`, name, description, songIds: [] };
        const updatedMixtapes = [...currentUser.mixtapes, newMixtape];
        await updateCurrentUser({ mixtapes: updatedMixtapes });
    };

    const updateMixtape = async (mixtapeId: string, updates: Partial<Mixtape>) => {
        if (!currentUser) return;
        const updatedMixtapes = currentUser.mixtapes.map(m => m.id === mixtapeId ? { ...m, ...updates } : m);
        await updateCurrentUser({ mixtapes: updatedMixtapes });
    };

    const deleteMixtape = async (mixtapeId: string) => {
        if (!currentUser) return;
        const updatedMixtapes = currentUser.mixtapes.filter(m => m.id !== mixtapeId);
        const updates: Partial<User> = { mixtapes: updatedMixtapes };
        if (currentUser.featuredMixtapeId === mixtapeId) {
            updates.featuredMixtapeId = null;
        }
        await updateCurrentUser(updates);
    };

    const setFeaturedMixtape = async (mixtapeId: string | null) => {
        await updateCurrentUser({ featuredMixtapeId: mixtapeId });
    };
    
    const createLabel = async (name: string, description: string, pfpUrl: string, joinType: 'open' | 'request') => {
        if (!currentUser) return;
        await dataService.createLabel(currentUser, name, description, pfpUrl, joinType);
    };

    const joinLabel = async (labelId: string) => {
        if (!currentUser) return;
        await dataService.joinLabel(currentUser.id, labelId);
    };

    const leaveLabel = async () => {
        if (!currentUser || !currentUser.labelId) return;
        await dataService.leaveLabel(currentUser.id, currentUser.labelId);
    };

    const updateLabelDetails = async (labelId: string, details: Partial<RecordLabel>) => {
        await dataService.updateLabelDetails(labelId, details);
    };

    const requestToJoinLabel = async (labelId: string) => {
        if (!currentUser) return;
        await dataService.requestToJoinLabel(currentUser, labelId);
    };

    const reviewJoinRequest = async (labelId: string, userId: string, decision: 'accept' | 'decline') => {
        await dataService.reviewJoinRequest(labelId, userId, decision);
    };

    const getDeckPower = (deck: CollectedSong[]) => deck.reduce((sum, song) => {
        let power = { [Rarity.Common]: 1, [Rarity.Uncommon]: 2, [Rarity.Rare]: 4, [Rarity.Mythic]: 10, [Rarity.Jailbroken]: 100 }[song.song.rarity] || 0;
        if (song.song.isShiny) power *= 1.5;
        if (song.isPrestige) power *= 2;
        return sum + power;
    }, 0);

    const challengeUser = async (opponentId: string, deck: CollectedSong[]) => {
        if (!currentUser) return;
        const opponent = users.find(u => u.id === opponentId);
        if (!opponent) return;

        const newBattle: Omit<SongBattle, 'id'> = {
            challengerId: currentUser.id,
            challengerName: currentUser.name,
            challengerPfpUrl: currentUser.pfpUrl,
            opponentId: opponent.id,
            opponentName: opponent.name,
            opponentPfpUrl: opponent.pfpUrl,
            challengerDeck: deck,
            status: 'pending',
            createdAt: Date.now(),
        };
        await addDoc(collection(db, 'songBattles'), newBattle);
    };

    const acceptBattle = async (battleId: string, deck: CollectedSong[]) => {
        if (!currentUser) return;
        const battleRef = doc(db, 'songBattles', battleId);
        const battleDoc = await getDoc(battleRef);
        if (!battleDoc.exists()) throw new Error("Battle not found");

        const battle = battleDoc.data() as SongBattle;
        
        const challengerPower = getDeckPower(battle.challengerDeck);
        const opponentPower = getDeckPower(deck);

        const winnerId = opponentPower >= challengerPower ? currentUser.id : battle.challengerId;
        const winnerName = winnerId === currentUser.id ? currentUser.name : battle.challengerName;

        const report = await generateBattleReport(battle.challengerName, currentUser.name, battle.challengerDeck, deck, winnerName);
        
        await updateDoc(battleRef, { 
            opponentDeck: deck, 
            status: 'complete', 
            completedAt: Date.now(), 
            winnerId: winnerId,
            battleReport: report
        });
    };

    const declineBattle = async (battleId: string) => {
        await deleteDoc(doc(db, 'songBattles', battleId));
    };

    const backupData = async () => Promise.resolve();
    const restoreData = async (file: File) => Promise.resolve();

    const claimReward = async (rewardId: string): Promise<EventReward['rewards'] | null> => {
        if (!currentUser) return null;
        const rewardRef = doc(db, 'users', currentUser.id, 'rewards', rewardId);
        const rewardDoc = await getDoc(rewardRef);
        if (!rewardDoc.exists() || rewardDoc.data().claimed) return null;
        
        const rewardData = rewardDoc.data() as EventReward;
        
        const updates: any = {};
        if (rewardData.rewards.shinyCharms) updates['inventory.shinyCharms'] = increment(rewardData.rewards.shinyCharms);
        if (rewardData.rewards.shinyPolishers) updates['inventory.shinyPolishers'] = increment(rewardData.rewards.shinyPolishers);
        if (rewardData.rewards.masteryXp) updates['inventory.masteryXp'] = increment(rewardData.rewards.masteryXp);
        if (rewardData.rewards.title) updates['earnedTitles'] = arrayUnion(rewardData.rewards.title);

        await updateCurrentUser(updates);
        await updateDoc(rewardRef, { claimed: true });
        addNotification({ type: 'generic', message: 'Reward claimed!' });
        return rewardData.rewards;
    };
    
    const applyMasteryXp = async (artistId: string, amount: number) => {
        if (!currentUser || (currentUser.inventory.masteryXp || 0) < amount) return;
        
        const oldLevel = currentUser.artistMastery[artistId]?.level ?? 0;
        const newXp = (currentUser.artistMastery[artistId]?.xp || 0) + amount;
        let totalWarPoints = 0;

        let newLevel = 0;
        for (const levelInfo of MASTERY_LEVELS) {
            if (newXp >= levelInfo.xpThreshold) newLevel = levelInfo.level;
            else break;
        }
        
        if (newLevel > oldLevel) {
            const masteryInfo = currentUser.artistMastery[artistId];
            for (let level = oldLevel + 1; level <= newLevel; level++) {
                addNotification({
                    type: 'mastery',
                    message: `${masteryInfo.artistName} Mastery Level ${level} Unlocked!`,
                });
                dataService.logMasteryLevelUp(currentUser.id, artistId, level)
                    .catch(err => console.error("Failed to log mastery level up:", err));
                dataService.addGlobalActivity({
                    type: 'ARTIST_MASTERY_UP',
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userPfpUrl: currentUser.pfpUrl,
                    artistMastery: {
                        artistName: masteryInfo.artistName,
                        artistPictureUrl: masteryInfo.artistPictureUrl,
                        level: level,
                    },
                    timestamp: Date.now(),
                }).catch(err => console.error("Failed to add mastery to global activity feed:", err));
            }
            
            const activeWarEvent = events.find(e => e.isActive);
            if (activeWarEvent && currentUser.labelId) {
                if (activeWarEvent.theme === 'MASTERY_MARATHON') {
                    for (let level = oldLevel + 1; level <= newLevel; level++) {
                        const masteryPoints = { 1: 10, 2: 25, 3: 50, 4: 100 }[level] || 0;
                        totalWarPoints += masteryPoints;
                    }
                }
                if (activeWarEvent.theme === 'MYTHIC_MASTERS') {
                    for (let level = oldLevel + 1; level <= newLevel; level++) {
                        if (level === 4) {
                            totalWarPoints += 50;
                        }
                    }
                }
            }
        }

        const updates: any = {
            [`artistMastery.${artistId}.xp`]: increment(amount),
            [`artistMastery.${artistId}.level`]: newLevel,
            'inventory.masteryXp': increment(-amount)
        };
        await updateCurrentUser(updates);
        
        if (totalWarPoints > 0) {
            const activeWarEvent = events.find(e => e.isActive);
            if (activeWarEvent && currentUser.labelId) {
                await dataService.incrementWarScore(activeWarEvent.id, currentUser, totalWarPoints);
            }
        }
    };

    const activateShinyCharm = async () => {
        if (!currentUser || (currentUser.inventory.shinyCharms || 0) < 1) return;
        await updateCurrentUser({
            'inventory.shinyCharms': increment(-1),
            shinyCharmUntil: Date.now() + 24 * 60 * 60 * 1000,
        });
        addNotification({ type: 'generic', message: 'Shiny Charm activated for 24 hours!' });
    };

    const applyShinyPolisher = async (collectedSongId: string) => {
        if (!currentUser || (currentUser.inventory.shinyPolishers || 0) < 1) return;
        
        await dataService.applyShinyPolisherToSong(currentUser.id, collectedSongId);
        await updateCurrentUser({ 'inventory.shinyPolishers': increment(-1) });
        addNotification({ type: 'generic', message: 'Song polished to Shiny!' });

        // Check for Golden Vinyl completion
        const polishedSong = currentUserCollection.find(cs => cs.id === collectedSongId);
        if (!polishedSong) return;

        const albumId = polishedSong.song.album.id;
        const hasVinyl = (currentUser.vinyls || []).some(v => v.albumId === albumId);
        if (hasVinyl) return;

        const updatedCollection = currentUserCollection.map(cs => 
            cs.id === collectedSongId ? { ...cs, song: { ...cs.song, isShiny: true } } : cs
        );
        
        const albumTracks = await getAlbumTracks(albumId);
        if (albumTracks.length === 0) return;

        const allShiny = albumTracks.every(track => 
            updatedCollection.some(cs => cs.song.id === track.id && cs.song.isShiny)
        );

        if (allShiny) {
            const newVinyls = [...(currentUser.vinyls || [])];
            const craftedAt = Date.now();
            newVinyls.push({ 
                albumId: albumId, 
                albumName: polishedSong.song.album.title, 
                albumArtUrl: polishedSong.song.albumArtUrl, 
                artistName: polishedSong.song.artist.name, 
                tracks: albumTracks, 
                craftedAt 
            });
            
            await updateCurrentUser({ vinyls: newVinyls });
            
            addNotification({ type: 'vinyl', message: `Golden Vinyl Unlocked: ${polishedSong.song.album.title}!` });
            
            await dataService.addGlobalActivity({ 
                type: 'COMPLETE_VINYL', 
                userId: currentUser.id, 
                userName: currentUser.name, 
                userPfpUrl: currentUser.pfpUrl, 
                vinyl: { albumName: polishedSong.song.album.title, artistName: polishedSong.song.artist.name, albumArtUrl: polishedSong.song.albumArtUrl }, 
                timestamp: craftedAt 
            });
        }
    };

    const setRaidDeck = async (songIds: string[]) => {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Authentication error.");
        await fetch('/api/set-raid-deck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ songIds })
        });
    };

    const attackRaidBoss = async () => {
        if (!currentUser || !labelRaids[0]?.isActive) return;
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Authentication error.");
        
        const response = await fetch('/api/attack-raid-boss', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorText = await response.text();
            addNotification({type: 'generic', message: errorText});
        } else {
            const { totalDamage, dodgedAttacks } = await response.json();
            addNotification({type: 'generic', message: `You dealt ${totalDamage.toLocaleString()} damage! (${dodgedAttacks} attacks dodged).`});
        }
    };

    const updateUserRoom = async (layout: RoomLayout) => {
        await updateCurrentUser({ room: layout });
    };

    // FIX: Implement missing UserContextType functions
    const chooseInitialGuardian = useCallback(async (guardian: Omit<GrooveGuardian, 'level' | 'xp' | 'genreAffinities' | 'lastBonusCollectedAt' | 'name'>) => {
        if (!currentUser) return;
        const newGuardian: GrooveGuardian = {
            ...guardian,
            name: guardian.fullName, // Default name
            level: 1,
            xp: 0,
            genreAffinities: {},
        };
        await updateCurrentUser({ grooveGuardian: newGuardian });
        addNotification({ type: 'generic', message: `You have bonded with ${newGuardian.name}!` });
    }, [currentUser, addNotification]);

    const feedGuardian = useCallback(async (songIds: string[]) => {
        if (!currentUser || !currentUser.grooveGuardian) return;

        const songsToFeed = currentUserCollection.filter(cs => songIds.includes(cs.id));
        if (songsToFeed.length === 0) return;

        const { newXp, newLevel, newAffinities } = calculateGuardianUpdateParts(currentUser.grooveGuardian, songsToFeed);

        const newGuardian: GrooveGuardian = {
            ...currentUser.grooveGuardian,
            xp: newXp,
            level: newLevel,
            genreAffinities: newAffinities,
        };
        
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', currentUser.id);
        batch.update(userRef, { grooveGuardian: newGuardian, collectionSize: increment(-songIds.length) });

        songIds.forEach(id => {
            const songRef = doc(db, 'users', currentUser.id, 'collection', id);
            batch.delete(songRef);
        });

        await batch.commit();

        if (newLevel > currentUser.grooveGuardian.level) {
            addNotification({ type: 'generic', message: `${newGuardian.name} has reached Level ${newLevel}!` });
        } else {
            addNotification({ type: 'generic', message: `You fed ${songIds.length} song(s) to ${newGuardian.name}.` });
        }
    }, [currentUser, currentUserCollection, addNotification]);

    const claimGuardianBonus = useCallback(async () => {
        if (!currentUser || !currentUser.grooveGuardian) return;

        if (isBonusAvailable(currentUser.grooveGuardian)) {
            const bonusAmount = 100; // e.g., 100 mastery XP
            
            const newGuardian = {
                ...currentUser.grooveGuardian,
                lastBonusCollectedAt: Date.now(),
            };

            await updateCurrentUser({
                grooveGuardian: newGuardian,
                'inventory.masteryXp': increment(bonusAmount)
            });

            addNotification({ type: 'generic', message: `Your Guardian found ${bonusAmount} Mastery XP!` });
        } else {
            addNotification({ type: 'generic', message: "You've already collected your daily bonus." });
        }
    }, [currentUser, addNotification]);

    const abandonAndResetGuardian = useCallback(async () => {
        if (!currentUser || !currentUser.grooveGuardian) return;
        
        await updateCurrentUser({
            grooveGuardian: deleteField()
        });

        addNotification({ type: 'generic', message: 'You have abandoned your Guardian. You can now find a new egg.' });
    }, [currentUser, addNotification]);

    const contributeToLabyrinthRoom = useCallback(async (roomId: string, requirementId: string, songIds: string[]) => {
        if (!currentUser || !currentUser.labelId) throw new Error("User is not in a label.");

        const label = recordLabels.find(l => l.id === currentUser.labelId);
        if (!label || !label.labyrinth) throw new Error("Label or labyrinth not found.");
        
        const room = label.labyrinth.map[roomId];
        if (!room) throw new Error("Room not found.");

        const requirement = room.requirements.find(r => r.id === requirementId);
        if (!requirement) throw new Error("Requirement not found.");

        const songsToContribute = currentUserCollection.filter(cs => songIds.includes(cs.id));
        if (songsToContribute.length !== songIds.length) throw new Error("Some songs were not found in your collection.");

        if (!validateContribution(songsToContribute, requirement)) {
            throw new Error("The selected songs do not meet the requirement.");
        }

        const dailyContributions = currentUser.labyrinthContributions || { count: 0, lastContributionDate: 0 };
        const today = new Date();
        const lastContributionDay = new Date(dailyContributions.lastContributionDate);
        const isSameDay = today.getFullYear() === lastContributionDay.getFullYear() &&
                          today.getMonth() === lastContributionDay.getMonth() &&
                          today.getDate() === lastContributionDay.getDate();
        
        const dailyCount = isSameDay ? dailyContributions.count : 0;
        if (dailyCount + songIds.length > 10) {
            throw new Error(`You can only contribute ${10 - dailyCount} more songs today.`);
        }

        const newLabyrinth = JSON.parse(JSON.stringify(label.labyrinth));
        const newRoom = newLabyrinth.map[roomId] as LabyrinthRoom;
        
        if (!newRoom.contributions[requirementId]) {
            newRoom.contributions[requirementId] = [];
        }

        const contributionsSoFar = newRoom.contributions[requirementId].length;
        if (contributionsSoFar + songIds.length > requirement.count) {
            throw new Error("This contribution would exceed the requirement count.");
        }

        songIds.forEach(songId => {
            newRoom.contributions[requirementId].push({ userId: currentUser.id, userName: currentUser.name, songId });
        });
        
        const roomNowComplete = isRoomUnlocked(newRoom);
        if (roomNowComplete && !newRoom.isComplete) {
            newRoom.isComplete = true;
            if (!newLabyrinth.unlockedRoomIds.includes(room.id)) {
                newLabyrinth.unlockedRoomIds.push(room.id);
                addNotification({ type: 'generic', message: `Your label unlocked Room ${room.id}!` });
            }
        }
        
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', currentUser.id);
        const labelRef = doc(db, 'recordLabels', currentUser.labelId);

        batch.update(labelRef, { labyrinth: newLabyrinth });
        batch.update(userRef, {
            'labyrinthContributions.count': isSameDay ? increment(songIds.length) : songIds.length,
            'labyrinthContributions.lastContributionDate': Date.now(),
            collectionSize: increment(-songIds.length),
        });

        songIds.forEach(id => {
            const songRef = doc(db, 'users', currentUser.id, 'collection', id);
            batch.delete(songRef);
        });

        await batch.commit();
        addNotification({ type: 'generic', message: `You contributed ${songIds.length} songs!` });
    }, [currentUser, currentUserCollection, recordLabels, addNotification]);

    const claimLabyrinthTreasure = useCallback(async (roomId: string) => {
        if (!currentUser || !currentUser.labelId) throw new Error("User is not in a label.");

        const label = recordLabels.find(l => l.id === currentUser.labelId);
        if (!label || !label.labyrinth) throw new Error("Label or labyrinth not found.");

        if (label.labyrinth.claimedTreasures?.[roomId]?.includes(currentUser.id)) {
            addNotification({ type: 'generic', message: "You have already claimed this treasure." });
            return;
        }

        const reward = { masteryXp: 500, shinyCharms: 1 };
        
        const newLabyrinth = JSON.parse(JSON.stringify(label.labyrinth));
        if (!newLabyrinth.claimedTreasures) {
            newLabyrinth.claimedTreasures = {};
        }
        if (!newLabyrinth.claimedTreasures[roomId]) {
            newLabyrinth.claimedTreasures[roomId] = [];
        }
        newLabyrinth.claimedTreasures[roomId].push(currentUser.id);

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', currentUser.id);
        const labelRef = doc(db, 'recordLabels', currentUser.labelId);

        batch.update(labelRef, { labyrinth: newLabyrinth });
        batch.update(userRef, {
            'inventory.masteryXp': increment(reward.masteryXp),
            'inventory.shinyCharms': increment(reward.shinyCharms),
        });

        await batch.commit();

        addNotification({ type: 'generic', message: `You claimed the treasure! +${reward.masteryXp} XP and +${reward.shinyCharms} Shiny Charm!` });
    }, [currentUser, recordLabels, addNotification]);

    const resyncGoldenVinyls = async () => {
        if (!currentUser) return;
        addNotification({ type: 'generic', message: 'Scanning collection for missing vinyls...' });
    
        try {
            const existingVinylAlbumIds = new Set(currentUser.vinyls.map(v => v.albumId));
            
            // 1. Get all shiny songs and create a map for quick lookup
            const shinySongs = currentUserCollection.filter(cs => cs.song.isShiny);
            const shinySongMap = new Map<string, CollectedSong>();
            shinySongs.forEach(cs => shinySongMap.set(cs.song.id, cs));
    
            // 2. Identify unique album IDs ONLY from shiny songs, and filter out those that already have a vinyl
            const candidateAlbumIds = [...new Set(shinySongs.map(cs => cs.song.album.id))]
                .filter(id => !existingVinylAlbumIds.has(id));
    
            const newlyCraftedVinyls: Vinyl[] = [];
    
            // 3. Verify full completion for the candidates
            for (const albumId of candidateAlbumIds) {
                // FIX: Cast albumId to string to resolve potential type inference issue.
                const albumTracks = await getAlbumTracks(albumId as string);
                if (albumTracks.length === 0) continue; // Skip if album tracklist can't be fetched
    
                // Check if every track from the official album exists as a shiny in the user's collection
                const allTracksPresentAndShiny = albumTracks.every(track => shinySongMap.has(track.id));
    
                if (allTracksPresentAndShiny) {
                    // All tracks are shiny, award the vinyl!
                    const representativeSong = albumTracks[0];
                    const craftedAt = Date.now();
                    newlyCraftedVinyls.push({
                        // FIX: Cast albumId to string to ensure it matches the Vinyl type.
                        albumId: albumId as string,
                        albumName: representativeSong.album.title,
                        albumArtUrl: representativeSong.albumArtUrl,
                        artistName: representativeSong.artist.name,
                        tracks: albumTracks,
                        craftedAt,
                    });
                }
            }
            
            // 4. Award missing vinyls
            if (newlyCraftedVinyls.length > 0) {
                const updatedVinyls = [...currentUser.vinyls, ...newlyCraftedVinyls];
                await updateCurrentUser({ vinyls: updatedVinyls });
    
                newlyCraftedVinyls.forEach(vinyl => {
                    addNotification({ type: 'vinyl', message: `Golden Vinyl Awarded: ${vinyl.albumName}!` });
                    dataService.addGlobalActivity({ 
                        type: 'COMPLETE_VINYL', 
                        userId: currentUser.id, 
                        userName: currentUser.name, 
                        userPfpUrl: currentUser.pfpUrl, 
                        vinyl: { albumName: vinyl.albumName, artistName: vinyl.artistName, albumArtUrl: vinyl.albumArtUrl }, 
                        timestamp: vinyl.craftedAt 
                    });
                });
            } else {
                addNotification({ type: 'generic', message: 'No missing vinyls found. Your collection is up to date!' });
            }
    
        } catch (error) {
            console.error("Error resyncing vinyls:", error);
            addNotification({ type: 'generic', message: 'An error occurred during sync.' });
        }
    };

    const resyncBadgesAndMastery = async () => {
        if (!currentUser) return;

        addNotification({ type: 'generic', message: 'Scanning artist mastery for missing images...' });

        try {
            const masteryUpdates: { [key: string]: any } = {};
            let imagesFixed = 0;
            const masteryEntries = Object.entries(currentUser.artistMastery);

            for (const [artistId, masteryData] of masteryEntries) {
                // Check if it's a valid mastery object with level >= 1 and a missing picture
                if (masteryData && typeof masteryData === 'object' && (masteryData as ArtistMastery).level >= 1 && !(masteryData as ArtistMastery).artistPictureUrl) {
                    try {
                        // Fetch artist from API
                        const artistResults = await searchArtists((masteryData as ArtistMastery).artistName);
                        if (artistResults.length > 0 && artistResults[0].pictureUrl) {
                            // Prepare the update using dot notation for Firestore
                            masteryUpdates[`artistMastery.${artistId}.artistPictureUrl`] = artistResults[0].pictureUrl;
                            imagesFixed++;
                        }
                    } catch (e) {
                        console.warn(`Could not find image for artist during resync: ${(masteryData as ArtistMastery).artistName}`, e);
                    }
                }
            }
            
            // Only commit updates if there's anything to fix
            if (Object.keys(masteryUpdates).length > 0) {
                await updateCurrentUser(masteryUpdates);
                addNotification({ type: 'generic', message: `Resync complete! ${imagesFixed} artist image(s) repaired.` });
            } else {
                addNotification({ type: 'generic', message: 'All artist images are up to date!' });
            }

        } catch (error) {
            console.error("Error during artist mastery resync:", error);
            addNotification({ type: 'generic', message: 'An error occurred during the image sync.' });
        }
    };

    const value: UserContextType = {
        isLoading,
        currentUser,
        currentUserCollection,
        users,
        tradePosts,
        recordLabels,
        events,
        labelRaids,
        songBattles,
        globalActivityFeed,
        signIn,
        signUp,
        signOut,
        findMythicOwnerName,
        updateCurrentUser,
        setFavoriteArtists,
        addFriend,
        removeFriend,
        createTradePost,
        cancelTradePost,
        makeOffer,
        reviewOffer,
        prestigeSong,
        createMixtape,
        updateMixtape,
        deleteMixtape,
        setFeaturedMixtape,
        updateShowcase,
        updatePlaylist,
        createLabel,
        joinLabel,
        leaveLabel,
        updateLabelDetails,
        requestToJoinLabel,
        reviewJoinRequest,
        challengeUser,
        acceptBattle,
        declineBattle,
        backupData,
        restoreData,
        viewingUser,
        isProfileModalOpen,
        viewingUserCollection,
        viewingUserShowcaseSongs,
        setViewingUser,
        chats,
        activeChatId,
        activeChatMessages,
        setActiveChatId,
        getOrCreateChat,
        sendMessage,
        activeLabelChatMessages,
        sendLabelChatMessage,
        toggleLabelMessageReaction,
        rewards,
        claimReward,
        applyMasteryXp,
        activateShinyCharm,
        applyShinyPolisher,
        setRaidDeck,
        attackRaidBoss,
        viewingRoomForUser,
        setViewingRoomForUser,
        updateUserRoom,
        chooseInitialGuardian,
        feedGuardian,
        claimGuardianBonus,
        abandonAndResetGuardian,
        contributeToLabyrinthRoom,
        claimLabyrinthTreasure,
        resyncGoldenVinyls,
        resyncBadgesAndMastery,
        openNewPack,
        isOpeningPack,
        rewardPack,
        setRewardPack,
        continueAsGuest,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};