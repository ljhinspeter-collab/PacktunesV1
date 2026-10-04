import React, { useContext, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { PackageIcon, SparklesIcon, DiamondIcon, FireIcon } from '../components/icons';

interface PackOption {
    id: string;
    title: string;
    badge: string;
    description: string;
    perks: string[];
    gradient: string;
    borderColor: string;
    textColor: string;
    glowClass: string;
}

const PACK_OPTIONS: PackOption[] = [
    {
        id: 'daily_mythic',
        title: 'Daily Mythic Madness',
        badge: '🔥 1 CLAIM DAILY',
        description: 'Extreme rarity pack with boosted Mythic drop rates!',
        perks: ['🔥 20% Mythic Card Rate', '⭐ 10% Favorite Artist Mythic', '✨ Serial #001-#010 Drops', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-amber-500 via-yellow-600 to-amber-900',
        borderColor: 'border-yellow-400',
        textColor: 'text-amber-300',
        glowClass: 'shadow-yellow-500/40 ring-2 ring-yellow-400/50',
    },
    {
        id: 'shiny_rush',
        title: 'Golden Shiny Rush',
        badge: '✨ 5 CLAIMS DAILY',
        description: 'Massively boosted holographic & shiny pull rates.',
        perks: ['✨ 5x Shiny Card Drop Rate (10%/card)', '💎 5 Daily Claims Max', '🌟 High Prestige & Serial Synergy', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-emerald-600 via-teal-700 to-cyan-900',
        borderColor: 'border-emerald-400',
        textColor: 'text-emerald-300',
        glowClass: 'shadow-emerald-500/30',
    },
    {
        id: 'hiphop_royalty',
        title: 'Hip Hop Royalty',
        badge: '🎤 20 DAILY LIMIT',
        description: 'Pulls strictly from the greatest rap & trap pioneers.',
        perks: ['👑 Kendrick, Drake, J. Cole, Travis Scott, Ye', '🔥 100% Hip-Hop Card Guarantee', '📊 Shared 20 Daily Genre Packs Cap', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-red-600 via-rose-800 to-amber-900',
        borderColor: 'border-red-500',
        textColor: 'text-red-300',
        glowClass: 'shadow-red-500/30',
    },
    {
        id: 'retro_legends',
        title: '80s & 90s Vintage Legends',
        badge: '🎸 20 DAILY LIMIT',
        description: 'Timeless rock, pop, and hip hop classics.',
        perks: ['⚡ Queen, Michael Jackson, Prince, Nirvana', '🎧 Fleetwood Mac, Madonna, Tupac, Biggie', '📊 Shared 20 Daily Genre Packs Cap', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-purple-600 via-fuchsia-800 to-indigo-900',
        borderColor: 'border-fuchsia-400',
        textColor: 'text-fuchsia-300',
        glowClass: 'shadow-fuchsia-500/30',
    },
    {
        id: 'kpop_fever',
        title: 'K-Pop & J-Pop Fever',
        badge: '🌸 20 DAILY LIMIT',
        description: 'High-energy idols, viral anthems, and anime OSTs.',
        perks: ['🌸 BTS, BLACKPINK, TWICE, Stray Kids', '💖 100% K-Pop / J-Pop Card Guarantee', '📊 Shared 20 Daily Genre Packs Cap', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-pink-500 via-rose-600 to-purple-800',
        borderColor: 'border-pink-400',
        textColor: 'text-pink-300',
        glowClass: 'shadow-pink-500/30',
    },
    {
        id: 'indie_gems',
        title: 'Indie & Underground Gems',
        badge: '🌿 20 DAILY LIMIT',
        description: 'Alternative, indie rock, and bedroom pop favorites.',
        perks: ['🌿 Tame Impala, Arctic Monkeys, Phoebe Bridgers', '🌊 100% Indie Card Guarantee', '📊 Shared 20 Daily Genre Packs Cap', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-cyan-600 via-blue-800 to-slate-900',
        borderColor: 'border-cyan-400',
        textColor: 'text-cyan-300',
        glowClass: 'shadow-cyan-500/30',
    },
    {
        id: 'standard',
        title: 'Standard Unlimited Pack',
        badge: '📦 UNLIMITED CLASSIC',
        description: 'A balanced mix of all genres and eras.',
        perks: ['🎵 Full catalog access across all genres', '⭐ 5% Favorite Artist Card Chance', '♾️ 100% Unlimited Openings All Day', '🏆 The ONLY Pack that counts for Clan War Scores'],
        gradient: 'from-indigo-700 via-purple-800 to-pink-800',
        borderColor: 'border-indigo-500',
        textColor: 'text-indigo-300',
        glowClass: 'shadow-indigo-500/30',
    },
];

export const PacksView: React.FC = () => {
    const userContext = useContext(UserContext);
    const [selectedPackId, setSelectedPackId] = useState<string>('daily_mythic');
    const [holoStyle, setHoloStyle] = useState({});

    if (!userContext) {
        return null;
    }

    const { openNewPack, isOpeningPack, currentUser } = userContext;
    const selectedPack = PACK_OPTIONS.find(p => p.id === selectedPackId) || PACK_OPTIONS[0];

    const userId = currentUser?.id || 'guest_user';
    const todayDateString = new Date().toDateString();
    const storageKey = `packtunes_last_daily_mythic_date_${userId}`;
    const shinyStorageKey = `packtunes_shiny_claims_${userId}_${todayDateString}`;
    const genreStorageKey = `packtunes_genre_claims_${userId}_${todayDateString}`;

    const [lastMythicClaimDate, setLastMythicClaimDate] = useState<string>(() => {
        return localStorage.getItem(storageKey) || '';
    });

    const [shinyClaimsToday, setShinyClaimsToday] = useState<number>(() => {
        const val = localStorage.getItem(shinyStorageKey);
        return val ? parseInt(val, 10) : 0;
    });

    const [genreClaimsToday, setGenreClaimsToday] = useState<number>(() => {
        const val = localStorage.getItem(genreStorageKey);
        return val ? parseInt(val, 10) : 0;
    });

    const isMythicClaimedToday = lastMythicClaimDate === todayDateString;
    const isShinyRushDepleted = shinyClaimsToday >= 5;

    const isSelectedGenrePack = ['hiphop_royalty', 'kpop_fever', 'indie_gems', 'retro_legends'].includes(selectedPack.id);
    const isGenreLimitReached = genreClaimsToday >= 20;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const holoX = (x / rect.width) * 100;
        const holoY = (y / rect.height) * 100;

        const rotateX = -((y / rect.height) * 20 - 10);
        const rotateY = (x / rect.width) * 20 - 10;
        
        setHoloStyle({
            '--holoX': `${holoX}%`,
            '--holoY': `${holoY}%`,
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        });
    };

    const handleMouseLeave = () => {
        setHoloStyle({
            transform: 'rotateX(0deg) rotateY(0deg)',
        });
    };
    
    const handleOpenPack = async () => {
        if (selectedPack.id === 'daily_mythic' && isMythicClaimedToday) {
            alert("You have already claimed your 1 Daily Mythic Pack for today! Check back tomorrow or open Unlimited Standard Packs!");
            return;
        }

        if (selectedPack.id === 'shiny_rush' && isShinyRushDepleted) {
            alert("You have reached your 5 Golden Shiny Rush Packs for today! Check back tomorrow or open Unlimited Standard Packs!");
            return;
        }

        if (isSelectedGenrePack && isGenreLimitReached) {
            alert("You have reached your 20 Daily Genre Packs limit for today! Check back tomorrow or open Unlimited Standard Packs!");
            return;
        }

        try {
            await openNewPack(selectedPack.id);
            if (selectedPack.id === 'daily_mythic') {
                localStorage.setItem(storageKey, todayDateString);
                setLastMythicClaimDate(todayDateString);
            } else if (selectedPack.id === 'shiny_rush') {
                const nextCount = shinyClaimsToday + 1;
                localStorage.setItem(shinyStorageKey, String(nextCount));
                setShinyClaimsToday(nextCount);
            } else if (isSelectedGenrePack) {
                const nextCount = genreClaimsToday + 1;
                localStorage.setItem(genreStorageKey, String(nextCount));
                setGenreClaimsToday(nextCount);
            }
        } catch (error) {
            console.error("Failed to open pack:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center pt-4 pb-12 px-2 max-w-5xl mx-auto">
            <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
                    <FireIcon className="w-4 h-4 text-amber-400 animate-pulse" /> Daily Rotation Active
                </span>
                <h2 className="text-3xl font-extrabold text-white">Daily Themed Packs</h2>
                <p className="text-gray-400 text-sm mt-1 max-w-lg mx-auto">
                    Choose your pack edition! Each pack awards 6 collectible cards. No cooldowns — pull back-to-back Mythics anytime!
                </p>
            </div>

            {/* Pack Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full mb-8">
                {PACK_OPTIONS.map((pack) => {
                    const isSelected = pack.id === selectedPackId;
                    const isDailyMythicAndClaimed = pack.id === 'daily_mythic' && isMythicClaimedToday;

                    return (
                        <button
                            key={pack.id}
                            onClick={() => setSelectedPackId(pack.id)}
                            className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                                isSelected
                                    ? `bg-gray-800 ${pack.borderColor} ring-2 ring-indigo-500/80 shadow-lg ${pack.glowClass} scale-[1.02]`
                                    : 'bg-gray-900/80 border-gray-800 hover:bg-gray-800/80 hover:border-gray-700'
                            }`}
                        >
                            {isSelected && (
                                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-indigo-500/30 to-transparent rounded-bl-full pointer-events-none" />
                            )}
                            <div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gray-800/90 border border-gray-700/80 ${pack.textColor}`}>
                                        {pack.badge}
                                    </span>
                                    {isDailyMythicAndClaimed && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/40">
                                            ✓ CLAIMED
                                        </span>
                                    )}
                                    {pack.id === 'shiny_rush' && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                            isShinyRushDepleted 
                                                ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        }`}>
                                            {shinyClaimsToday}/5 Claims
                                        </span>
                                    )}
                                    {['hiphop_royalty', 'kpop_fever', 'indie_gems', 'retro_legends'].includes(pack.id) && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                            isGenreLimitReached 
                                                ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                                                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                        }`}>
                                            {genreClaimsToday}/20 Genre
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-extrabold text-sm text-white mt-2 leading-tight">{pack.title}</h4>
                                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{pack.description}</p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400">6 Song Cards</span>
                                {isSelected ? (
                                    <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                                        Selected <SparklesIcon className="w-3 h-3" />
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-gray-500 hover:text-gray-300">Select →</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Active Selected Pack Details */}
            <div className="w-full max-w-xl bg-gray-900/90 border border-gray-800 rounded-2xl p-4 mb-8 shadow-xl text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-800 border ${selectedPack.borderColor} ${selectedPack.textColor}`}>
                            {selectedPack.badge}
                        </span>
                        <h3 className="text-lg font-bold text-white">{selectedPack.title}</h3>
                    </div>
                    <ul className="text-xs text-gray-300 space-y-1 pt-1">
                        {selectedPack.perks.map((perk, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 font-medium">
                                <span className="text-indigo-400">•</span> {perk}
                            </li>
                        ))}
                    </ul>
                </div>

                {selectedPack.id === 'daily_mythic' && (
                    <div className={`flex-shrink-0 rounded-xl p-3 text-center sm:w-44 border ${
                        isMythicClaimedToday 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-amber-500/10 border-amber-500/30'
                    }`}>
                        <DiamondIcon className="w-6 h-6 text-yellow-400 mx-auto mb-1 animate-bounce" />
                        {isMythicClaimedToday ? (
                            <>
                                <p className="text-xs font-extrabold text-green-300">CLAIMED FOR TODAY</p>
                                <p className="text-[10px] text-green-400/80">Resets at midnight</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs font-extrabold text-yellow-300">20% MYTHIC RATE</p>
                                <p className="text-[10px] text-yellow-400/80">1 Claim per Day</p>
                            </>
                        )}
                    </div>
                )}
                {selectedPack.id === 'shiny_rush' && (
                    <div className={`flex-shrink-0 rounded-xl p-3 text-center sm:w-44 border ${
                        isShinyRushDepleted 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                        <SparklesIcon className="w-6 h-6 text-emerald-400 mx-auto mb-1 animate-pulse" />
                        {isShinyRushDepleted ? (
                            <>
                                <p className="text-xs font-extrabold text-red-300">5/5 CLAIMS USED</p>
                                <p className="text-[10px] text-red-400/80">Resets at midnight</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs font-extrabold text-emerald-300">{5 - shinyClaimsToday} CLAIMS LEFT</p>
                                <p className="text-[10px] text-emerald-400/80">5 Claims Daily Limit</p>
                            </>
                        )}
                    </div>
                )}
                {isSelectedGenrePack && (
                    <div className={`flex-shrink-0 rounded-xl p-3 text-center sm:w-44 border ${
                        isGenreLimitReached 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : 'bg-purple-500/10 border-purple-500/30'
                    }`}>
                        <PackageIcon className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                        {isGenreLimitReached ? (
                            <>
                                <p className="text-xs font-extrabold text-red-300">20/20 GENRE USED</p>
                                <p className="text-[10px] text-red-400/80">Resets at midnight</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs font-extrabold text-purple-300">{20 - genreClaimsToday} GENRE LEFT</p>
                                <p className="text-[10px] text-purple-400/80">20 Claims Daily Cap</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 3D Interactive Pack Opening Display */}
            <div 
                className="pack-perspective w-72 h-96"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    onClick={handleOpenPack}
                    disabled={isOpeningPack || (selectedPack.id === 'daily_mythic' && isMythicClaimedToday) || (selectedPack.id === 'shiny_rush' && isShinyRushDepleted) || (isSelectedGenrePack && isGenreLimitReached)}
                    className={`pack-3d w-full h-full bg-gradient-to-br ${selectedPack.gradient} rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 transition-transform border ${selectedPack.borderColor} ${
                        (selectedPack.id === 'daily_mythic' && isMythicClaimedToday) || (selectedPack.id === 'shiny_rush' && isShinyRushDepleted) || (isSelectedGenrePack && isGenreLimitReached) ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    style={holoStyle}
                >
                    {isOpeningPack ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                            <p className="text-lg font-bold text-white">Opening {selectedPack.title}...</p>
                            <p className="text-xs text-white/70 mt-1">Summoning 6 Song Cards...</p>
                        </div>
                    ) : selectedPack.id === 'daily_mythic' && isMythicClaimedToday ? (
                        <div className="flex flex-col items-center text-center">
                            <DiamondIcon className="w-20 h-20 text-gray-400 mb-2 opacity-60" />
                            <span className="text-xl font-black text-white/90">CLAIMED TODAY</span>
                            <span className="mt-2 text-xs font-medium text-green-300 bg-black/50 px-3 py-1 rounded-full border border-green-500/40">
                                Resets Tomorrow
                            </span>
                        </div>
                    ) : selectedPack.id === 'shiny_rush' && isShinyRushDepleted ? (
                        <div className="flex flex-col items-center text-center">
                            <SparklesIcon className="w-20 h-20 text-gray-400 mb-2 opacity-60" />
                            <span className="text-xl font-black text-white/90">5/5 USED TODAY</span>
                            <span className="mt-2 text-xs font-medium text-red-300 bg-black/50 px-3 py-1 rounded-full border border-red-500/40">
                                Resets Tomorrow
                            </span>
                        </div>
                    ) : isSelectedGenrePack && isGenreLimitReached ? (
                        <div className="flex flex-col items-center text-center">
                            <PackageIcon className="w-20 h-20 text-gray-400 mb-2 opacity-60" />
                            <span className="text-xl font-black text-white/90">20/20 GENRE USED</span>
                            <span className="mt-2 text-xs font-medium text-purple-300 bg-black/50 px-3 py-1 rounded-full border border-purple-500/40">
                                Open Standard Unlimited!
                            </span>
                        </div>
                    ) : (
                        <>
                            {selectedPack.id === 'daily_mythic' ? (
                                <DiamondIcon className="w-24 h-24 text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-pulse" />
                            ) : (
                                <PackageIcon className="w-24 h-24 text-white/90 drop-shadow-lg" />
                            )}
                            <span className="mt-4 text-2xl font-black text-white tracking-wider drop-shadow-md">
                                TAP TO OPEN
                            </span>
                            <span className="mt-1 text-xs font-semibold text-white/80 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                                {selectedPack.title}
                            </span>
                        </>
                    )}
                    <div className="pack-holographic rounded-2xl"></div>
                </button>
            </div>
        </div>
    );
};