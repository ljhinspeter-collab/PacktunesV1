import { collection, doc, getDocs, query, orderBy, limit, runTransaction, where, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { LabelEvent, EventTheme, RecordLabel, User, EventReward, Title } from '../types';
import { generateEventDetails } from './aiService';
import { dataService } from './dataService';
import { getTitleForWar } from '../data/titles';

const WAR_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOLDOWN_DURATION = 1 * 24 * 60 * 60 * 1000; // 1 day
const CYCLE_DURATION = WAR_DURATION + COOLDOWN_DURATION;

// FIX: Add FRESH_FACES to the list of possible event themes
const EVENT_THEMES: EventTheme[] = ['MYTHIC_MASTERS', 'SHINY_SHOWCASE', 'VINYL_VANGUARDS', 'TRADE_TITANS', 'MASTERY_MARATHON', 'RARITY_RUSH', 'FRESH_FACES'];

const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const getLatestEvent = async (): Promise<LabelEvent | null> => {
    const q = query(collection(db, 'events'), orderBy('startTime', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LabelEvent;
};

const startNewWar = async (previousWarNumber: number) => {
    const now = Date.now();
    const warNumber = previousWarNumber + 1;
    
    // Deterministically pick a theme
    const themeIndex = Math.floor(pseudoRandom(warNumber) * EVENT_THEMES.length);
    const theme = EVENT_THEMES[themeIndex];

    const { title, description } = await generateEventDetails(theme);

    const newEvent: Omit<LabelEvent, 'id'> = {
        title,
        description,
        theme,
        startTime: now,
        endTime: now + WAR_DURATION,
        isActive: true,
        leaderboard: [],
        warNumber,
        individualScores: {},
    };

    await dataService.addEvent(newEvent);
    console.log(`Started new Label War #${warNumber}: ${title}`);
};

const endCurrentWar = async (event: LabelEvent) => {
    console.log(`Ending Label War #${event.warNumber}: ${event.title}`);
    
    // Final score calculation
    const finalLeaderboard = await updateAllLeaderboards(event, true);
    
    // Top 3 labels
    const winners = finalLeaderboard.slice(0, 3);
    if (winners.length === 0) {
        console.log("No participating labels, ending war without rewards.");
        await dataService.endEvent(event.id, finalLeaderboard);
        return;
    }

    const rewardPromises: Promise<void>[] = [];

    // Distribute Trophies
    const trophyPromises = winners.map((winner, index) => {
        const rank = index + 1;
        const trophy = {
            eventId: event.id,
            eventName: event.title,
            theme: event.theme,
            rank,
            date: Date.now(),
            warNumber: event.warNumber,
        };
        return dataService.addTrophyToLabel(winner.labelId, trophy);
    });
    await Promise.all(trophyPromises);
    
    // Distribute Rewards
    // Rank 1
    if (winners[0]) {
        const title: Title = {
            id: `war-${event.warNumber}`,
            name: getTitleForWar(event.warNumber),
            description: `Awarded for 1st place in the ${event.warNumber}th Label War.`,
            warNumber: event.warNumber,
        };
        const rewards: EventReward['rewards'] = { shinyCharms: 2, shinyPolishers: 1, masteryXp: 1500, title };
        rewardPromises.push(dataService.distributeRewardsToLabel(event, winners[0].labelId, 1, rewards));
    }
    // Rank 2
    if (winners[1]) {
        const rewards: EventReward['rewards'] = { shinyCharms: 1, shinyPolishers: 1 };
        rewardPromises.push(dataService.distributeRewardsToLabel(event, winners[1].labelId, 2, rewards));
    }
    // Rank 3
    if (winners[2]) {
        const rewards: EventReward['rewards'] = { shinyCharms: 1 };
        rewardPromises.push(dataService.distributeRewardsToLabel(event, winners[2].labelId, 3, rewards));
    }
    await Promise.all(rewardPromises);

    await dataService.endEvent(event.id, finalLeaderboard);
    console.log(`War #${event.warNumber} ended. Rewards distributed.`);
};

export const manageEventCycle = async () => {
    try {
        // Read the latest event outside of a transaction. The logic is idempotent,
        // so race conditions are not critical. The timestamp checks will prevent
        // creating duplicate or premature events.
        const latestEvent = await getLatestEvent();
        const now = Date.now();

        if (!latestEvent) {
            // First time ever, start the first war.
            await startNewWar(0);
            return;
        }

        if (latestEvent.isActive) {
            if (now >= latestEvent.endTime) {
                // War has just ended, need to process it.
                await endCurrentWar(latestEvent);
            }
        } else { // In cooldown
            if (now >= latestEvent.endTime + COOLDOWN_DURATION) {
                // Cooldown is over, start a new war.
                await startNewWar(latestEvent.warNumber);
            }
        }
    } catch (error) {
        console.error("Error in manageEventCycle:", error);
    }
};

export const updateAllLeaderboards = async (event: LabelEvent, isFinal: boolean = false): Promise<LabelEvent['leaderboard']> => {
    const allLabels = await dataService.getAllLabels();
    const eventDoc = await getDoc(doc(db, 'events', event.id));
    const individualScores = eventDoc.data()?.individualScores || {};

    const labelScores = new Map<string, { name: string, pfpUrl: string, score: number }>();

    for (const label of allLabels) {
        let totalScore = 0;
        (label.memberIds || []).forEach(memberId => {
            if (individualScores[memberId]) {
                totalScore += individualScores[memberId].score;
            }
        });

        if (totalScore > 0 || (event.leaderboard || []).some(l => l.labelId === label.id)) {
            labelScores.set(label.id, {
                name: label.name,
                pfpUrl: label.pfpUrl,
                score: totalScore
            });
        }
    }
    
    const newLeaderboard = Array.from(labelScores.entries()).map(([labelId, data]) => ({
        labelId,
        ...data
    })).sort((a,b) => b.score - a.score);

    await dataService.updateEventLeaderboard(event.id, newLeaderboard);
    return newLeaderboard;
};