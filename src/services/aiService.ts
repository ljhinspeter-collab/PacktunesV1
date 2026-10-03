import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { CollectedSong } from '../types';

const getApiKey = (): string => {
  if (typeof process !== 'undefined') {
    if (process.env?.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    if (process.env?.API_KEY) return process.env.API_KEY;
  }
  if (typeof import.meta !== 'undefined') {
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.VITE_GEMINI_API_KEY) return metaEnv.VITE_GEMINI_API_KEY;
    if (metaEnv?.VITE_API_KEY) return metaEnv.VITE_API_KEY;
  }
  return '';
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateRaidBossImage = async (bossName: string): Promise<string> => {
  if (!ai) return "https://i.imgur.com/r5s2hYf.png";

  try {
    const prompt = `A dramatic, epic, cinematic digital painting of a raid boss monster named '${bossName}'. It should look like a glitching, ethereal being made of television static and dark energy. Dark, moody lighting. Pixel art style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in Gemini response.");
  } catch (error) {
    console.warn("Raid boss image generated with fallback:", error);
    return "https://i.imgur.com/r5s2hYf.png";
  }
};

export const generateGuardianImage = async (guardianName: string): Promise<string> => {
  if (!ai) return "https://i.imgur.com/7g8f7Tj.png";

  try {
    const prompt = `A cute, friendly, small, pokemon-style digital monster called a "Groove Guardian". Its name is '${guardianName}'. It should look like it's made of musical energy. Stylized, vibrant, colorful, simple background.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in Gemini response.");
  } catch (error: any) {
    console.warn(`Guardian image generated with fallback for "${guardianName}":`, error);
    return "https://i.imgur.com/7g8f7Tj.png";
  }
};

export const generateObscureStat = async (title: string, artist: string): Promise<string> => {
  if (!ai) return "Its frequency is known to attract cosmic vinyl dust.";

  try {
    const prompt = `Generate a short, fun, obscure, fictional statistic for the song "${title}" by ${artist}. Be creative, whimsical, and keep it under 15 words. For example: "The bassline is rumored to sync with planetary orbits." or "Was recorded in a single take during a meteor shower." Do not use quotes in your response.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = (response.text || '').trim();
    if (!text) {
      throw new Error("Received an empty response from the AI.");
    }

    return text;
  } catch (error) {
    console.warn("Using fallback obscure stat:", error);
    return "Its frequency is known to attract cosmic vinyl dust.";
  }
};

const THEME_DEFAULTS: Record<string, { title: string; description: string }> = {
  MYTHIC_MASTERS: {
    title: "Mythic Masters Clash",
    description: "Hunt down legendary Mythic pressings and achieve peak artist mastery to dominate this week's label leaderboard!",
  },
  SHINY_SHOWCASE: {
    title: "Shiny Showcase Spectacle",
    description: "Collect shimmering holographic vinyls and light up your label's trophy case for bonus prestige.",
  },
  VINYL_VANGUARDS: {
    title: "Vinyl Vanguards Cup",
    description: "Craft golden lacquer editions and forge unbreakable records for your record label.",
  },
  TRADE_TITANS: {
    title: "Trade Titans Summit",
    description: "Negotiate legendary swaps in the Trade Hub to propel your label to the top of the charts.",
  },
  MASTERY_MARATHON: {
    title: "Mastery Marathon Rally",
    description: "Level up your favorite artists and unlock exclusive badges to earn massive label points.",
  },
  RARITY_RUSH: {
    title: "Rarity Rush Frenzy",
    description: "Rip open booster packs and hunt down Rare and Mythic tracks before the competition ends.",
  },
  FRESH_FACES: {
    title: "Fresh Faces Breakthrough",
    description: "Discover rising underground artists and expand your label discography with fresh sounds.",
  },
};

export const generateEventDetails = async (theme: string): Promise<{ title: string; description: string }> => {
  const fallback = THEME_DEFAULTS[theme] || {
    title: `Weekly Challenge: ${theme.replace(/_/g, ' ')}`,
    description: "A new weekly challenge has begun! Compete with other labels to prove your worth.",
  };

  if (!ai) return fallback;

  try {
    const prompt = `Based on the theme "${theme}", generate a cool, music-themed event name and a two-sentence description for a week-long competition for Record Labels. The theme indicates how labels get points.
    - MYTHIC_MASTERS: collecting Mythic songs (100 pts) and achieving max artist mastery (50 pts).
    - SHINY_SHOWCASE: collecting Shiny songs.
    - VINYL_VANGUARDS: crafting Golden Vinyls.
    - TRADE_TITANS: completing trades with other users.
    - MASTERY_MARATHON: leveling up artist mastery.
    - RARITY_RUSH: collecting Rare or Mythic songs.
    - FRESH_FACES: discovering new artists.
    Return a JSON object with "title" and "description" keys.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["title", "description"],
        },
      },
    });

    const jsonString = (response.text || '').trim();
    if (!jsonString) {
      return fallback;
    }

    const parsed = JSON.parse(jsonString);
    if (parsed.title && parsed.description) {
      return parsed;
    }
    return fallback;
  } catch (error) {
    console.warn("Using default event details for theme", theme);
    return fallback;
  }
};

export const generateBattleReport = async (
  challengerName: string,
  opponentName: string,
  challengerDeck: CollectedSong[],
  opponentDeck: CollectedSong[],
  winnerName: string
): Promise<string> => {
  const fallback = `${winnerName} emerged victorious after a legendary clash of titans! The sheer power of their collection was too much to handle.`;
  if (!ai) return fallback;

  try {
    const formatSong = (cs: CollectedSong) => `"${cs.song.title}" (${cs.isPrestige ? 'Prestige ' : ''}${cs.song.isShiny ? 'Shiny ' : ''}${cs.song.rarity})`;
    const challengerSongs = challengerDeck.map(formatSong).join(', ');
    const opponentSongs = opponentDeck.map(formatSong).join(', ');

    const prompt = `You are a hype, energetic music battle commentator. Write a short, exciting battle report for a 'Song Battle'.
    - The challenger is ${challengerName}, who played: ${challengerSongs}.
    - The opponent is ${opponentName}, who played: ${opponentSongs}.
    - The winner was ${winnerName}.
    Keep the report to 2-3 sentences. Describe the battle with flair, maybe mentioning one key song matchup that turned the tide. Be creative and fun!`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = (response.text || '').trim();
    if (!text) {
      return fallback;
    }

    return text;
  } catch (error) {
    console.warn("Using default battle report:", error);
    return fallback;
  }
};
