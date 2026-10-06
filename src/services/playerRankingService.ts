import { User, CollectedSong, Rarity } from '../types';
import { DEFAULT_ALBUM_COVER } from '../utils/imageFallback';

export interface LeaderboardEntry {
    rank: number;
    id: string;
    name: string;
    pfpUrl: string;
    title?: string;
    clanName?: string;
    score: number;
    cardsCount: number;
    mythicsCount: number;
    jailbrokensCount: number;
    vinylsCount: number;
    tier: 'Supreme Titan' | 'Mythic Hunter' | 'Grand Curator' | 'Diamond Elite' | 'Master Collector' | 'Rising Star';
    topGrail: {
        title: string;
        artist: string;
        coverUrl: string;
        rarity: Rarity;
        isShiny?: boolean;
    };
    isCurrentUser?: boolean;
}

export interface ScoreBreakdown {
    cardsPoints: number;
    mythicsPoints: number;
    jailbrokensPoints: number;
    vinylsPoints: number;
    popularityBonus: number;
    totalScore: number;
}

/**
 * Calculates a player's cumulative ranking score based on:
 * 1. Total cards in collection
 * 2. Total Mythics pulled
 * 3. Total Jailbrokens pulled (highest prestige)
 * 4. Popularity of their pulled songs
 * 5. Total Golden Vinyls owned
 */
export function calculatePlayerScore(
    user: Partial<User>,
    collection?: CollectedSong[]
): { score: number; breakdown: ScoreBreakdown; counts: { cards: number; mythics: number; jailbrokens: number; vinyls: number } } {
    const cards = collection || [];
    const totalCards = cards.length > 0 ? cards.length : (user.collectionSize || 0);

    let mythicsCount = 0;
    let jailbrokensCount = 0;
    let totalPopularity = 0;

    if (cards.length > 0) {
        cards.forEach(cs => {
            if (cs.song.rarity === Rarity.Mythic) mythicsCount++;
            if (cs.song.rarity === Rarity.Jailbroken) jailbrokensCount++;
            const pop = (cs.song as any).popularity || 75;
            totalPopularity += pop;
        });
    } else {
        mythicsCount = (user as any).mythicsCount || 0;
        jailbrokensCount = (user as any).jailbrokensCount || 0;
        totalPopularity = totalCards * 70;
    }

    const vinylsCount = user.vinyls?.length || (user as any).vinylsCount || 0;

    // Weighting Algorithm
    const cardsPoints = totalCards * 12;
    const mythicsPoints = mythicsCount * 450;
    const jailbrokensPoints = jailbrokensCount * 3200;
    const vinylsPoints = vinylsCount * 280;
    const popularityBonus = Math.min(5000, Math.round(totalPopularity * 0.15));

    const totalScore = cardsPoints + mythicsPoints + jailbrokensPoints + vinylsPoints + popularityBonus;

    return {
        score: totalScore,
        breakdown: {
            cardsPoints,
            mythicsPoints,
            jailbrokensPoints,
            vinylsPoints,
            popularityBonus,
            totalScore,
        },
        counts: {
            cards: totalCards,
            mythics: mythicsCount,
            jailbrokens: jailbrokensCount,
            vinyls: vinylsCount,
        },
    };
}

export function getRankTier(rank: number): LeaderboardEntry['tier'] {
    if (rank <= 3) return 'Supreme Titan';
    if (rank <= 10) return 'Mythic Hunter';
    if (rank <= 25) return 'Grand Curator';
    if (rank <= 50) return 'Diamond Elite';
    if (rank <= 75) return 'Master Collector';
    return 'Rising Star';
}

/**
 * Builds the real player leaderboard:
 * Uses ONLY real user accounts created in the system.
 * If there are 3 real accounts, it displays 3. Once there are more than 100, the top 100 show.
 * No bot accounts or fake accounts allowed.
 */
export function getTop100Leaderboard(
    currentUser?: User | null,
    currentUserCollection?: CollectedSong[],
    registeredUsers?: User[]
): {
    leaderboard: LeaderboardEntry[];
    currentUserRank: number;
    currentUserScore: number;
} {
    const userMap = new Map<string, User>();

    // 1. Add registered users (filter out any legacy fake bot IDs)
    (registeredUsers || []).forEach(u => {
        if (!u || !u.id) return;
        if (u.id.startsWith('seed_') || (u.id.startsWith('user_') && u.id !== currentUser?.id)) return;
        userMap.set(u.id, u);
    });

    // 2. Ensure currentUser is included
    if (currentUser && currentUser.id) {
        userMap.set(currentUser.id, currentUser);
    }

    const realUsers = Array.from(userMap.values());
    if (realUsers.length === 0 && currentUser) {
        realUsers.push(currentUser);
    }

    // 3. Compute score for each real user
    const entries: (Omit<LeaderboardEntry, 'rank'> & { isCurrentUser: boolean })[] = realUsers.map(user => {
        const isCurrent = currentUser?.id === user.id;
        const col = isCurrent ? currentUserCollection : undefined;
        const { score, counts } = calculatePlayerScore(user, col);

        let topGrail = {
            title: 'Collector Collection',
            artist: user.name || 'Collector',
            coverUrl: user.pfpUrl || DEFAULT_ALBUM_COVER,
            rarity: Rarity.Common,
            isShiny: false,
        };

        if (isCurrent && currentUserCollection && currentUserCollection.length > 0) {
            const best = currentUserCollection.find(c => c.song.rarity === Rarity.Jailbroken) ||
                         currentUserCollection.find(c => c.song.rarity === Rarity.Mythic) ||
                         currentUserCollection.find(c => c.song.isShiny) ||
                         currentUserCollection[0];
            if (best) {
                topGrail = {
                    title: best.song.title,
                    artist: best.song.artist.name,
                    coverUrl: best.song.albumArtUrl || DEFAULT_ALBUM_COVER,
                    rarity: best.song.rarity,
                    isShiny: !!best.song.isShiny,
                };
            }
        }

        return {
            id: user.id,
            name: user.name || 'Collector',
            pfpUrl: user.pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.name || user.id}`,
            title: user.activeTitleId ? 'Ranked Collector' : (counts.jailbrokens > 0 ? 'Grail Master' : 'Collector'),
            clanName: (user as any).recordLabelName || undefined,
            score,
            cardsCount: counts.cards,
            mythicsCount: counts.mythics,
            jailbrokensCount: counts.jailbrokens,
            vinylsCount: counts.vinyls,
            tier: 'Master Collector',
            topGrail,
            isCurrentUser: isCurrent,
        };
    });

    // 4. Sort descending by score
    entries.sort((a, b) => b.score - a.score);

    // 5. Rank up to Top 100
    const ranked: LeaderboardEntry[] = entries.slice(0, 100).map((player, idx) => ({
        ...player,
        rank: idx + 1,
        tier: getRankTier(idx + 1),
    }));

    // 6. Find current user's rank
    const currentIdx = entries.findIndex(e => e.isCurrentUser);
    const currentUserRank = currentIdx !== -1 ? currentIdx + 1 : 1;
    const currentUserScore = currentIdx !== -1 ? entries[currentIdx].score : 0;

    return {
        leaderboard: ranked,
        currentUserRank,
        currentUserScore,
    };
}
