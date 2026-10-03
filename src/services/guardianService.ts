import type { GrooveGuardian, GuardianSpecies, CollectedSong, Song } from '../types';
import { Rarity } from '../types';
import { GENRES, Genre } from './topArtistsService';
import { generateGuardianImage } from './aiService';

const GUARDIAN_SPECIES: { species: GuardianSpecies; baseName: string; }[] = [
    { species: 'Synth Sprite', baseName: 'Synth Sprite' },
    { species: 'Rhythm Rock', baseName: 'Rhythm Rock' },
    { species: 'Beat Blob', baseName: 'Beat Blob' },
    { species: 'Melody Moth', baseName: 'Melody Moth' },
    { species: 'Tempo Turtle', baseName: 'Tempo Turtle' },
    { species: 'Chord Chimera', baseName: 'Chord Chimera' },
    { species: 'Groove Gremlin', baseName: 'Groove Gremlin' },
    { species: 'Dub-Dragon', baseName: 'Dub-Dragon' },
    { species: 'Verse Vulture', baseName: 'Verse Vulture' },
    { species: 'Frequency Fox', baseName: 'Frequency Fox' },
];

const GUARDIAN_VARIATIONS = ['Azure', 'Crimson', 'Emerald', 'Golden', 'Violet', 'Obsidian', 'Glitching', 'Cosmic', 'Holographic', 'Sparkling', 'Shadow', 'Sun-Kissed'];

const EVOLUTION_THRESHOLDS = [10, 50, 150, 400, 1000]; // XP needed for each level

const XP_PER_RARITY: Record<Rarity, number> = {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 2,
    [Rarity.Rare]: 5,
    [Rarity.Mythic]: 20,
    [Rarity.Jailbroken]: 100,
};

export const generateGuardianChoices = async (): Promise<{ choices: Omit<GrooveGuardian, 'level' | 'xp' | 'genreAffinities' | 'lastBonusCollectedAt' | 'name'>[], quotaError: boolean }> => {
    const choices: { species: GuardianSpecies; baseName: string; variation: string; fullName: string; }[] = [];
    const usedCombinations = new Set<string>();

    while (choices.length < 5) {
        const speciesData = GUARDIAN_SPECIES[Math.floor(Math.random() * GUARDIAN_SPECIES.length)];
        const variation = GUARDIAN_VARIATIONS[Math.floor(Math.random() * GUARDIAN_VARIATIONS.length)];

        const comboKey = `${variation} ${speciesData.baseName}`;
        if (usedCombinations.has(comboKey)) continue;

        usedCombinations.add(comboKey);
        choices.push({
            species: speciesData.species,
            baseName: speciesData.baseName,
            variation: variation,
            fullName: comboKey,
        });
    }

    let quotaError = false;
    const imagePromises = choices.map(choice => 
        generateGuardianImage(choice.fullName)
            .catch(err => {
                if (err.message === 'API_QUOTA_EXCEEDED') {
                    quotaError = true;
                }
                // Always return a fallback for any error during generation
                return "https://i.imgur.com/7g8f7Tj.png";
            })
    );
    
    const imageUrls = await Promise.all(imagePromises);

    const finalChoices = choices.map((choice, index) => ({
        ...choice,
        imageUrl: imageUrls[index],
    }));

    return { choices: finalChoices, quotaError };
};


export const calculateGuardianUpdateParts = (currentGuardian: GrooveGuardian, fedSongs: CollectedSong[]): { newXp: number, newLevel: number, newAffinities: Record<string, number> } => {
    let newXp = currentGuardian.xp;
    const newAffinities = { ...currentGuardian.genreAffinities };

    for (const song of fedSongs) {
        newXp += XP_PER_RARITY[song.song.rarity] || 0;
        if (song.song.isShiny) {
            newXp += 5; // Shiny bonus
        }
        
        const genre = GENRES.find(g => song.song.artist.name.includes(g)) || 'Other';
        newAffinities[genre] = (newAffinities[genre] || 0) + 1;
    }

    let newLevel = currentGuardian.level;
    while (newLevel < EVOLUTION_THRESHOLDS.length && newXp >= EVOLUTION_THRESHOLDS[newLevel]) {
        newLevel++;
    }
    
    return { newXp, newLevel, newAffinities };
};

export const isBonusAvailable = (guardian: GrooveGuardian): boolean => {
    if (guardian.level < EVOLUTION_THRESHOLDS.length) {
        return false;
    }
    if (!guardian.lastBonusCollectedAt) {
        return true;
    }
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return Date.now() - guardian.lastBonusCollectedAt > twentyFourHours;
};

export const MAX_GUARDIAN_LEVEL = EVOLUTION_THRESHOLDS.length;
