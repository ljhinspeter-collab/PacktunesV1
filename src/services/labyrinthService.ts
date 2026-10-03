import type { Labyrinth, LabyrinthRoom, LabyrinthRequirement, CollectedSong } from '../types';
import { Rarity } from '../types';

const generateRequirements = (id: string, description: string, count: number, rarity: Rarity | Rarity[], isShiny: boolean = false): LabyrinthRequirement => ({
    id,
    description,
    count,
    filters: { rarity, isShiny },
});

export const generateNewLabyrinth = (): Labyrinth => {
    const map: Record<string, LabyrinthRoom | null> = {};
    const size = 10;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            map[`${y}-${x}`] = null;
        }
    }

    // Define rooms (Layout is 10x10 grid, (0,0) is top-left)
    map['9-4'] = { id: '9-4', type: 'start', requirements: [], contributions: {}, isComplete: true };
    
    // Path 1 (Main Path)
    map['8-4'] = { id: '8-4', type: 'lock', requirements: [generateRequirements('r-8-4', '15 Common Songs', 15, Rarity.Common)], contributions: {}, isComplete: false };
    map['7-4'] = { id: '7-4', type: 'lock', requirements: [generateRequirements('r-7-4', '40 Common Songs', 40, Rarity.Common)], contributions: {}, isComplete: false };
    map['6-4'] = { id: '6-4', type: 'lock', requirements: [generateRequirements('r-6-4', '10 Uncommon Songs', 10, Rarity.Uncommon)], contributions: {}, isComplete: false };
    map['5-4'] = { id: '5-4', type: 'lock', requirements: [generateRequirements('r-5-4', '30 Uncommon Songs', 30, Rarity.Uncommon)], contributions: {}, isComplete: false };
    map['4-4'] = { id: '4-4', type: 'lock', requirements: [generateRequirements('r-4-4', '5 Rare Songs', 5, Rarity.Rare)], contributions: {}, isComplete: false };
    map['3-4'] = { id: '3-4', type: 'lock', requirements: [generateRequirements('r-3-4', '15 Rare Songs', 15, Rarity.Rare)], contributions: {}, isComplete: false };
    map['2-4'] = { id: '2-4', type: 'lock', requirements: [generateRequirements('r-2-4', '25 Rare Songs', 25, Rarity.Rare)], contributions: {}, isComplete: false };
    map['1-4'] = { id: '1-4', type: 'lock', requirements: [generateRequirements('r-1-4', '1 Shiny Rare Song', 1, Rarity.Rare, true)], contributions: {}, isComplete: false };
    map['0-4'] = { id: '0-4', type: 'boss', requirements: [generateRequirements('r-0-4', '2 Mythic Songs', 2, Rarity.Mythic)], contributions: {}, isComplete: false };

    // Branch A (Left from 6-4)
    map['6-3'] = { id: '6-3', type: 'lock', requirements: [generateRequirements('r-6-3', '20 Uncommon Songs', 20, Rarity.Uncommon)], contributions: {}, isComplete: false };
    map['6-2'] = { id: '6-2', type: 'lock', requirements: [generateRequirements('r-6-2', '3 Shiny Commons', 3, Rarity.Common, true)], contributions: {}, isComplete: false };
    map['6-1'] = { id: '6-1', type: 'treasure', requirements: [], contributions: {}, isComplete: false };
    map['5-2'] = { id: '5-2', type: 'lock', requirements: [generateRequirements('r-5-2', '35 Uncommon Songs', 35, Rarity.Uncommon)], contributions: {}, isComplete: false };
    map['4-2'] = { id: '4-2', type: 'lock', requirements: [generateRequirements('r-4-2', '10 Rare Songs', 10, Rarity.Rare)], contributions: {}, isComplete: false };
    map['3-2'] = { id: '3-2', type: 'lock', requirements: [generateRequirements('r-3-2', '2 Shiny Uncommons', 2, Rarity.Uncommon, true)], contributions: {}, isComplete: false };
    map['2-2'] = { id: '2-2', type: 'lock', requirements: [generateRequirements('r-2-2', '15 Rare Songs', 15, Rarity.Rare)], contributions: {}, isComplete: false }; // Connects back to main path

    // Branch B (Right from 6-4)
    map['6-5'] = { id: '6-5', type: 'lock', requirements: [generateRequirements('r-6-5', '20 Uncommon Songs', 20, Rarity.Uncommon)], contributions: {}, isComplete: false };
    map['6-6'] = { id: '6-6', type: 'lock', requirements: [generateRequirements('r-6-6', '50 Common Songs', 50, Rarity.Common)], contributions: {}, isComplete: false };
    map['6-7'] = { id: '6-7', type: 'lock', requirements: [generateRequirements('r-6-7', '3 Shiny Commons', 3, Rarity.Common, true)], contributions: {}, isComplete: false };
    map['6-8'] = { id: '6-8', type: 'treasure', requirements: [], contributions: {}, isComplete: false };

    // Branch C (Right from 3-4)
    map['3-5'] = { id: '3-5', type: 'lock', requirements: [generateRequirements('r-3-5', '10 Rare Songs', 10, Rarity.Rare)], contributions: {}, isComplete: false };
    map['3-6'] = { id: '3-6', type: 'lock', requirements: [generateRequirements('r-3-6', '2 Shiny Uncommons', 2, Rarity.Uncommon, true)], contributions: {}, isComplete: false };
    map['3-7'] = { id: '3-7', type: 'lock', requirements: [generateRequirements('r-3-7', '60 Common Songs', 60, Rarity.Common)], contributions: {}, isComplete: false };
    map['4-7'] = { id: '4-7', type: 'lock', requirements: [generateRequirements('r-4-7', '35 Uncommon Songs', 35, Rarity.Uncommon)], contributions: {}, isComplete: false };
    map['5-7'] = { id: '5-7', type: 'lock', requirements: [generateRequirements('r-5-7', '3 Shiny Commons', 3, Rarity.Common, true)], contributions: {}, isComplete: false }; // Connects to 6-7

    // Branch D (Left from 3-4)
    map['3-3'] = { id: '3-3', type: 'lock', requirements: [generateRequirements('r-3-3', '10 Rare Songs', 10, Rarity.Rare)], contributions: {}, isComplete: false };
    map['3-2-alt'] = { id: '3-2-alt', type: 'lock', requirements: [generateRequirements('r-3-2-2', '2 Shiny Uncommon Songs', 2, Rarity.Uncommon, true)], contributions: {}, isComplete: false };
    
    // Upper path from 3-2
    map['2-1'] = { id: '2-1', type: 'lock', requirements: [generateRequirements('r-2-1', '25 Rare Songs', 25, Rarity.Rare)], contributions: {}, isComplete: false };
    map['1-1'] = { id: '1-1', type: 'lock', requirements: [generateRequirements('r-1-1', '40 Uncommon Songs', 40, Rarity.Uncommon)], contributions: {}, isComplete: false };
    map['0-1'] = { id: '0-1', type: 'treasure', requirements: [], contributions: {}, isComplete: false };

    // Upper path from 3-6
    map['2-6'] = { id: '2-6', type: 'lock', requirements: [generateRequirements('r-2-6', '25 Rare Songs', 25, Rarity.Rare)], contributions: {}, isComplete: false };
    map['1-6'] = { id: '1-6', type: 'lock', requirements: [generateRequirements('r-1-6', '4 Shiny Uncommon Songs', 4, Rarity.Uncommon, true)], contributions: {}, isComplete: false };
    map['0-6'] = { id: '0-6', type: 'treasure', requirements: [], contributions: {}, isComplete: false };

    // Final connector paths
    map['1-2'] = { id: '1-2', type: 'lock', requirements: [generateRequirements('r-1-2', '3 Shiny Rare Songs', 3, Rarity.Rare, true)], contributions: {}, isComplete: false };
    map['1-3'] = { id: '1-3', type: 'lock', requirements: [generateRequirements('r-1-3', '75 Common Songs', 75, Rarity.Common)], contributions: {}, isComplete: false };
    map['1-5'] = { id: '1-5', type: 'lock', requirements: [generateRequirements('r-1-5', '75 Uncommon Songs', 75, Rarity.Uncommon)], contributions: {}, isComplete: false };

    return {
        map,
        unlockedRoomIds: ['9-4'],
        claimedTreasures: {},
    };
};

export const validateContribution = (songs: CollectedSong[], requirement: LabyrinthRequirement): boolean => {
    if (songs.length === 0) {
        return false;
    }
    
    for (const song of songs) {
        if (requirement.filters.rarity) {
            if (Array.isArray(requirement.filters.rarity)) {
                if (!requirement.filters.rarity.includes(song.song.rarity)) return false;
            } else {
                if (song.song.rarity !== requirement.filters.rarity) return false;
            }
        }
        if (requirement.filters.isShiny !== undefined && song.song.isShiny !== requirement.filters.isShiny) {
            return false;
        }
        // Genre filter can be added here
    }
    
    return true;
};

export const isRoomUnlocked = (room: LabyrinthRoom): boolean => {
    return room.requirements.every(req => (room.contributions[req.id]?.length || 0) >= req.count);
};
