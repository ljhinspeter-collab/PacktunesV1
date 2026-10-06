import React, { useContext, useState, useRef } from 'react';
import { UserContext } from '../contexts/UserContext';
import { PackageIcon, SparklesIcon, DiamondIcon, FireIcon } from '../components/icons';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';

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

const GENRE_PACK_IDS = ['hiphop_royalty', 'kpop_fever', 'indie_gems', 'retro_legends', 'pop_2010s_2020s'];

const PACK_OPTIONS: PackOption[] = [
    {
        id: 'daily_mythic',
        title: 'Daily Mythic Madness',
        badge: '🔥 1 CLAIM DAILY',
        description: 'Extreme rarity pack with a guaranteed numbered Mythic card!',
        perks: ['🔥 100% Guaranteed Mythic Card', '⚡ 3% Chance for Jailbroken 1 of 1', '⭐ 25% Favorite Artist Mythic Roll', '✨ Numbered Serials #001-#010'],
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
        perks: ['✨ Guaranteed Shiny Hologram Card', '🌟 30% Boosted Shiny Rate (avg 2-3)', '💎 5 Daily Claims Max', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-emerald-600 via-teal-700 to-cyan-900',
        borderColor: 'border-emerald-400',
        textColor: 'text-emerald-300',
        glowClass: 'shadow-emerald-500/30',
    },
    {
        id: 'pop_2010s_2020s',
        title: '2010s & 2020s Pop Hits',
        badge: '✨ 100 PACK CYCLE',
        description: 'Billboard-topping pop anthems, chart-toppers, and viral hits.',
        perks: ['🌟 300+ Pop Icons & Chart-Toppers', '🎤 6 Distinct Artists Per Pack Guaranteed', '🔄 100 Pack Cycle (Recharge with 100 Standard)', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-violet-600 via-fuchsia-600 to-pink-700',
        borderColor: 'border-fuchsia-400',
        textColor: 'text-fuchsia-300',
        glowClass: 'shadow-fuchsia-500/30',
    },
    {
        id: 'hiphop_royalty',
        title: 'Hip Hop Royalty',
        badge: '🎤 100 PACK CYCLE',
        description: 'Pulls strictly from the greatest rap & trap pioneers.',
        perks: ['👑 350+ Hip-Hop & Rap Legends Pool', '🔥 100% Hip-Hop Cards (6 Unique Artists)', '🔄 100 Pack Cycle (Recharge with 100 Standard)', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-red-600 via-rose-800 to-amber-900',
        borderColor: 'border-red-500',
        textColor: 'text-red-300',
        glowClass: 'shadow-red-500/30',
    },
    {
        id: 'retro_legends',
        title: '80s & 90s Vintage Legends',
        badge: '🎸 100 PACK CYCLE',
        description: 'Timeless rock, pop, and R&B classics with clean genre separation.',
        perks: ['🎸 Classic Rock: Queen, Nirvana, Led Zep, AC/DC', '👑 Pop & R&B: Michael Jackson, Prince, Madonna', '🔄 100 Pack Cycle (Recharge with 100 Standard)', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-purple-600 via-fuchsia-800 to-indigo-900',
        borderColor: 'border-fuchsia-400',
        textColor: 'text-fuchsia-300',
        glowClass: 'shadow-fuchsia-500/30',
    },
    {
        id: 'kpop_fever',
        title: 'K-Pop & J-Pop Fever',
        badge: '🌸 100 PACK CYCLE',
        description: 'High-energy idols, viral anthems, and anime OSTs.',
        perks: ['🌸 150+ Top K-Pop & J-Pop Idols & Groups', '💖 100% K-Pop Guarantee (6 Unique Artists)', '🔄 100 Pack Cycle (Recharge with 100 Standard)', '⚠️ Excluded from Clan War Scores'],
        gradient: 'from-pink-500 via-rose-600 to-purple-800',
        borderColor: 'border-pink-400',
        textColor: 'text-pink-300',
        glowClass: 'shadow-pink-500/30',
    },
    {
        id: 'indie_gems',
        title: 'Indie & Underground Gems',
        badge: '🌿 100 PACK CYCLE',
        description: 'Alternative, indie rock, and bedroom pop favorites.',
        perks: ['🌿 250+ Indie, Alternative & Bedroom Icons', '🌊 100% Indie Guarantee (6 Unique Artists)', '🔄 100 Pack Cycle (Recharge with 100 Standard)', '⚠️ Excluded from Clan War Scores'],
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
    const packButtonRef = useRef<HTMLButtonElement | null>(null);

    if (!userContext) {
        return null;
    }

    const { openNewPack, isOpeningPack, currentUser } = userContext;
    const selectedPack = PACK_OPTIONS.find(p => p.id === selectedPackId) || PACK_OPTIONS[0];

    const userId = currentUser?.id || 'guest_user';
    const todayDateString = new Date().toDateString();
    const storageKey = `packtunes_last_daily_mythic_date_${userId}`;
    const shinyStorageKey = `packtunes_shiny_claims_${userId}_${todayDateString}`;
    const genreCycleStorageKey = `packtunes_genre_cycle_genre_count_${userId}`;
    const standardRechargeStorageKey = `packtunes_genre_cycle_standard_count_${userId}`;

    const [lastMythicClaimDate, setLastMythicClaimDate] = useState<string>(() => {
        return localStorage.getItem(storageKey) || '';
    });

    const [shinyClaimsToday, setShinyClaimsToday] = useState<number>(() => {
        const val = localStorage.getItem(shinyStorageKey);
        return val ? parseInt(val, 10) : 0;
    });

    // Track 100 Genre Pack cycle and 100 Standard Pack recharge
    const [genreCycleCount, setGenreCycleCount] = useState<number>(() => {
        const val = localStorage.getItem(genreCycleStorageKey);
        if (val !== null) return parseInt(val, 10) || 0;
        // Migration from old daily key if available
        const oldVal = localStorage.getItem(`packtunes_genre_claims_${userId}_${todayDateString}`);
        return oldVal ? parseInt(oldVal, 10) || 0 : 0;
    });

    const [standardRechargeCount, setStandardRechargeCount] = useState<number>(() => {
        const val = localStorage.getItem(standardRechargeStorageKey);
        return val ? parseInt(val, 10) || 0 : 0;
    });

    const [showCycleResetToast, setShowCycleResetToast] = useState<boolean>(false);

    const isMythicClaimedToday = lastMythicClaimDate === todayDateString;
    const isShinyRushDepleted = shinyClaimsToday >= 5;

    const isSelectedGenrePack = GENRE_PACK_IDS.includes(selectedPack.id);
    const isGenreLocked = genreCycleCount >= 100;

    // Direct DOM style updates on mouse move: 0 React re-renders, perfectly smooth 120fps tilt!
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!packButtonRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const holoX = (x / rect.width) * 100;
        const holoY = (y / rect.height) * 100;

        const rotateX = -((y / rect.height) * 20 - 10);
        const rotateY = (x / rect.width) * 20 - 10;
        
        packButtonRef.current.style.setProperty('--holoX', `${holoX}%`);
        packButtonRef.current.style.setProperty('--holoY', `${holoY}%`);
        packButtonRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
        if (!packButtonRef.current) return;
        packButtonRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };
    
    const handleOpenPack = async (packIdToOpen?: string, autoRevealAll: boolean = false) => {
        const targetPackId = packIdToOpen || selectedPack.id;
        const targetPack = PACK_OPTIONS.find(p => p.id === targetPackId) || selectedPack;
        if (targetPackId !== selectedPackId) {
            setSelectedPackId(targetPackId);
        }

        if (targetPack.id === 'daily_mythic' && isMythicClaimedToday) {
            alert("You have already claimed your 1 Daily Mythic Pack for today! Check back tomorrow or open Unlimited Standard Packs!");
            return;
        }

        if (targetPack.id === 'shiny_rush' && isShinyRushDepleted) {
            alert("You have reached your 5 Golden Shiny Rush Packs for today! Check back tomorrow or open Unlimited Standard Packs!");
            return;
        }

        const isTargetGenre = GENRE_PACK_IDS.includes(targetPack.id);
        if (isTargetGenre && isGenreLocked) {
            alert(`Genre packs are currently locked! Open ${100 - standardRechargeCount} more Standard Packs to recharge the cycle and unlock 100 new Genre Packs!`);
            return;
        }

        try {
            await openNewPack(targetPack.id, autoRevealAll);
            if (targetPack.id === 'daily_mythic') {
                localStorage.setItem(storageKey, todayDateString);
                setLastMythicClaimDate(todayDateString);
            } else if (targetPack.id === 'shiny_rush') {
                const nextCount = shinyClaimsToday + 1;
                localStorage.setItem(shinyStorageKey, String(nextCount));
                setShinyClaimsToday(nextCount);
            } else if (isTargetGenre) {
                const nextGenre = genreCycleCount + 1;
                localStorage.setItem(genreCycleStorageKey, String(nextGenre));
                setGenreCycleCount(nextGenre);
            } else if (targetPack.id === 'standard') {
                if (isGenreLocked) {
                    const nextStandard = standardRechargeCount + 1;
                    if (nextStandard >= 100) {
                        // 100 Standard packs opened -> Reset revolving cycle!
                        localStorage.setItem(genreCycleStorageKey, '0');
                        localStorage.setItem(standardRechargeStorageKey, '0');
                        setGenreCycleCount(0);
                        setStandardRechargeCount(0);
                        setShowCycleResetToast(true);
                        setTimeout(() => setShowCycleResetToast(false), 6000);
                    } else {
                        localStorage.setItem(standardRechargeStorageKey, String(nextStandard));
                        setStandardRechargeCount(nextStandard);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to open pack:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center pt-4 pb-12 px-2 max-w-5xl mx-auto">
            {/* Celebration Toast on Cycle Reset */}
            {showCycleResetToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl border border-emerald-400/60 flex items-center gap-3 animate-bounce max-w-md w-full">
                    <SparklesIcon className="w-7 h-7 text-yellow-300 animate-spin flex-shrink-0" />
                    <div className="text-left">
                        <p className="font-extrabold text-sm sm:text-base">🎉 Genre Packs Recharged & Unlocked!</p>
                        <p className="text-xs text-emerald-100">You opened 100 Standard Packs! Your 100 Genre Pack cycle has reset.</p>
                    </div>
                </div>
            )}

            <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
                    <FireIcon className="w-4 h-4 text-amber-400 animate-pulse" /> Daily Rotation & Genre Cycles
                </span>
                <h2 className="text-3xl font-extrabold text-white">Daily Themed Packs</h2>
                <p className="text-gray-400 text-sm mt-1 max-w-lg mx-auto">
                    Choose your pack edition! Each pack awards 6 collectible cards. No cooldowns — pull back-to-back Mythics anytime!
                </p>
            </div>

            {/* Revolving Genre Pack Cycle Tracker Card */}
            <div className={`w-full max-w-3xl rounded-2xl p-4 sm:p-5 mb-8 transition-all duration-300 border shadow-xl text-left ${
                isGenreLocked 
                    ? 'bg-gradient-to-r from-amber-950/70 via-gray-900 to-indigo-950/70 border-amber-500/50 shadow-amber-500/10'
                    : 'bg-gradient-to-r from-purple-950/70 via-gray-900 to-pink-950/70 border-purple-500/40 shadow-purple-500/10'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                        <span className={`p-2 rounded-xl border text-lg ${
                            isGenreLocked ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                            {isGenreLocked ? '🔒' : '⚡'}
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm sm:text-base font-extrabold text-white">
                                    {isGenreLocked ? 'Genre Packs Locked (Recharging)' : 'Genre Pack Cycle Active'}
                                </h4>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                    isGenreLocked 
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                        : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                }`}>
                                    {isGenreLocked ? 'RECHARGING WITH STANDARD' : '100 PACK CYCLE'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {isGenreLocked 
                                    ? `Open 100 Standard Packs to unlock Genre Packs again (${100 - standardRechargeCount} remaining)`
                                    : `Open up to 100 Genre Packs (${100 - genreCycleCount} remaining before Standard Pack recharge)`}
                            </p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-800">
                        <span className={`text-base sm:text-lg font-black ${isGenreLocked ? 'text-amber-300' : 'text-purple-300'}`}>
                            {isGenreLocked 
                                ? `${standardRechargeCount} / 100 Standard`
                                : `${genreCycleCount} / 100 Genre`}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                            {isGenreLocked ? `${100 - standardRechargeCount} to unlock` : `${100 - genreCycleCount} left in cycle`}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800/90 rounded-full h-3.5 p-0.5 border border-gray-700/60 overflow-hidden relative">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            isGenreLocked
                                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                                : 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                        }`}
                        style={{ width: `${isGenreLocked ? Math.min(standardRechargeCount, 100) : Math.min(genreCycleCount, 100)}%` }}
                    />
                </div>

                {isGenreLocked && (
                    <div className="mt-3.5 pt-3 border-t border-gray-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
                            ⚡ Opening Standard Unlimited packs recharges your genre cycle progress!
                        </span>
                        <button
                            onClick={() => setSelectedPackId('standard')}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
                        >
                            Open Standard Pack →
                        </button>
                    </div>
                )}
            </div>

            {/* Pack Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full mb-8">
                {PACK_OPTIONS.map((pack) => {
                    const isSelected = pack.id === selectedPackId;
                    const isDailyMythicAndClaimed = pack.id === 'daily_mythic' && isMythicClaimedToday;

                    return (
                        <div
                            key={pack.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedPackId(pack.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedPackId(pack.id);
                                }
                            }}
                            className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer select-none ${
                                isSelected
                                    ? `bg-gray-800 ${pack.borderColor} ring-2 ring-indigo-500/80 shadow-lg ${pack.glowClass} scale-[1.02]`
                                    : 'bg-gray-900/80 border-gray-800 hover:bg-gray-800/80 hover:border-gray-700'
                            }`}
                        >
                            {isSelected && (
                                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-indigo-500/30 to-transparent rounded-bl-full pointer-events-none" />
                            )}
                            <div>
                                <div className="flex items-center justify-between gap-1 flex-wrap">
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
                                    {GENRE_PACK_IDS.includes(pack.id) && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                            isGenreLocked 
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                        }`}>
                                            {isGenreLocked ? `🔒 Need ${100 - standardRechargeCount} Std` : `${100 - genreCycleCount} Left`}
                                        </span>
                                    )}
                                    {pack.id === 'standard' && isGenreLocked && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                            ⚡ Recharge: {standardRechargeCount}/100
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-extrabold text-sm text-white mt-2 leading-tight">{pack.title}</h4>
                                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{pack.description}</p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-gray-400">6 Songs</span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPack(pack.id, true);
                                        }}
                                        disabled={isOpeningPack || isDailyMythicAndClaimed || (pack.id === 'shiny_rush' && isShinyRushDepleted) || (GENRE_PACK_IDS.includes(pack.id) && isGenreLocked)}
                                        className="px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-[10px] shadow active:scale-95 disabled:opacity-40 transition-all flex items-center gap-0.5"
                                        title={`Instant Reveal All for ${pack.title}`}
                                    >
                                        <span>⚡ Reveal All</span>
                                    </button>
                                    {isSelected ? (
                                        <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                                            <SparklesIcon className="w-3 h-3" />
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-gray-500 hover:text-gray-300">Select</span>
                                    )}
                                </div>
                            </div>
                        </div>
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
                        isGenreLocked 
                            ? 'bg-amber-500/10 border-amber-500/30' 
                            : 'bg-purple-500/10 border-purple-500/30'
                    }`}>
                        <PackageIcon className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                        {isGenreLocked ? (
                            <>
                                <p className="text-xs font-extrabold text-amber-300">100/100 GENRE USED</p>
                                <p className="text-[10px] text-amber-400/80">Need {100 - standardRechargeCount} Standard</p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs font-extrabold text-purple-300">{100 - genreCycleCount} GENRE LEFT</p>
                                <p className="text-[10px] text-purple-400/80">100 Pack Cycle Cap</p>
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
                    ref={packButtonRef}
                    onClick={() => handleOpenPack(selectedPack.id, false)}
                    disabled={isOpeningPack || (selectedPack.id === 'daily_mythic' && isMythicClaimedToday) || (selectedPack.id === 'shiny_rush' && isShinyRushDepleted) || (isSelectedGenrePack && isGenreLocked)}
                    className={`pack-3d w-full h-full bg-gradient-to-br ${selectedPack.gradient} rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 transition-transform border ${selectedPack.borderColor} ${
                        (selectedPack.id === 'daily_mythic' && isMythicClaimedToday) || (selectedPack.id === 'shiny_rush' && isShinyRushDepleted) || (isSelectedGenrePack && isGenreLocked) ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
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
                    ) : isSelectedGenrePack && isGenreLocked ? (
                        <div className="flex flex-col items-center text-center">
                            <PackageIcon className="w-20 h-20 text-gray-400 mb-2 opacity-60" />
                            <span className="text-xl font-black text-white/90">GENRE LOCKED</span>
                            <span className="mt-2 text-xs font-medium text-amber-300 bg-black/50 px-3 py-1 rounded-full border border-amber-500/40">
                                Open {100 - standardRechargeCount} Standard to Recharge
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

            {/* Instant Reveal All Button directly below the 3D Pack */}
            <div className="mt-6 flex flex-col items-center gap-2 w-full max-w-sm">
                <button
                    onClick={() => handleOpenPack(selectedPack.id, true)}
                    disabled={isOpeningPack || (selectedPack.id === 'daily_mythic' && isMythicClaimedToday) || (selectedPack.id === 'shiny_rush' && isShinyRushDepleted) || (isSelectedGenrePack && isGenreLocked)}
                    className="w-full py-3.5 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-xl shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-purple-400/40"
                >
                    <span>⚡ Reveal All (Instant Open)</span>
                </button>
                <p className="text-xs text-gray-400 font-medium">
                    Auto-spotlights Mythics, Shinies & Jailbrokens • 1-click vaulting
                </p>
            </div>
        </div>
    );
};
