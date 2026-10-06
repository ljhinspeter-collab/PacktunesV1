import React, { useState, useEffect, useMemo } from 'react';
import type { CollectedSong } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';
import { SparklesIcon, DiamondIcon, PackageIcon } from './icons';

type ChaseTier = 'jailbroken' | 'shiny_mythic' | 'mythic' | 'shiny' | null;

const getChaseTier = (collectedSong: CollectedSong): ChaseTier => {
    const { song } = collectedSong;
    if (song.rarity === Rarity.Jailbroken) return 'jailbroken';
    if (song.rarity === Rarity.Mythic && song.isShiny) return 'shiny_mythic';
    if (song.rarity === Rarity.Mythic) return 'mythic';
    if (song.isShiny) return 'shiny';
    return null;
};

// Procedural high-energy audio synth for chase card reveals
const playChaseSound = (type: ChaseTier) => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;

        if (type === 'jailbroken') {
            // Dark 808 sub-bass drop & distorted cyber glitch
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(95, now);
            osc.frequency.exponentialRampToValueAtTime(22, now + 0.85);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.85);

            // Glitch noise burst
            const glitchOsc = ctx.createOscillator();
            const glitchGain = ctx.createGain();
            glitchOsc.type = 'square';
            glitchOsc.frequency.setValueAtTime(440, now);
            glitchOsc.frequency.setValueAtTime(880, now + 0.08);
            glitchOsc.frequency.setValueAtTime(220, now + 0.16);
            glitchOsc.frequency.setValueAtTime(110, now + 0.24);
            glitchGain.gain.setValueAtTime(0.15, now);
            glitchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            glitchOsc.connect(glitchGain);
            glitchGain.connect(ctx.destination);
            glitchOsc.start(now);
            glitchOsc.stop(now + 0.4);

        } else if (type === 'shiny_mythic') {
            // Celestial 5-note royal arpeggio with high shimmer harmonics
            [440, 554.37, 659.25, 830.61, 1108.73].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.07);
                gain.gain.setValueAtTime(0.2, now + i * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.07);
                osc.stop(now + 1.4);
            });
        } else if (type === 'mythic') {
            // Triumphant golden celestial chord
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.08);
                gain.gain.setValueAtTime(0.18, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + 1.2);
            });
        } else if (type === 'shiny') {
            // Crystal chime
            [880, 1174.66, 1760].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.06);
                gain.gain.setValueAtTime(0.14, now + i * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.06);
                osc.stop(now + 0.85);
            });
        }
    } catch {}
};

// Standard Pack Card in Stack
const PackRevealCard: React.FC<{ collectedSong: CollectedSong }> = ({ collectedSong }) => {
    const { song, serialNumber } = collectedSong;
    const rarityStyles = getRarityStyles(song.rarity);
    const isMythic = song.rarity === Rarity.Mythic;
    const isJailbroken = song.rarity === Rarity.Jailbroken;
    const isShiny = song.isShiny;

    const getBackgroundStyles = () => {
        if (isJailbroken) {
            return 'bg-gradient-to-br from-gray-900 via-black to-gray-800 jailbroken-border';
        }
        if (isShiny) {
            return 'bg-gradient-to-br from-pink-700 via-purple-800 to-indigo-900';
        }
        switch (song.rarity) {
            case Rarity.Mythic:
                return 'bg-gradient-to-br from-amber-500 via-yellow-600 to-purple-900 mythic-border';
            case Rarity.Rare:
                return `bg-gradient-to-br from-blue-800 to-gray-900 border ${rarityStyles.borderColor}`;
            case Rarity.Uncommon:
                return `bg-gradient-to-br from-green-800 to-gray-900 border ${rarityStyles.borderColor}`;
            case Rarity.Common:
            default:
                return `bg-gradient-to-br from-gray-800 to-gray-900 border ${rarityStyles.borderColor}`;
        }
    };

    return (
        <div className={`w-full h-full p-4 rounded-xl shadow-2xl flex flex-col justify-between relative select-none overflow-hidden ${getBackgroundStyles()} ${isShiny ? 'mythic-glow' : ''} ${isJailbroken ? 'jailbroken-glow' : ''}`}>
            {isJailbroken && <div className="jailbroken-overlay-effect" />}
            <div className="absolute top-4 left-4 flex flex-col items-start gap-1 z-10">
                <div className="flex gap-2 items-center">
                    <div className={`text-sm font-bold px-3 py-1 rounded-full shadow-md ${
                        isMythic ? 'bg-yellow-400 text-black font-extrabold' : isJailbroken ? 'bg-white text-black font-black' : `${rarityStyles.bgColor} ${rarityStyles.textColor}`
                    }`}>
                        {song.rarity}
                    </div>
                    {isShiny && (
                        <div className="bg-gradient-to-r from-cyan-400 to-pink-500 text-white text-sm font-black px-3 py-1 rounded-full shadow-md animate-pulse">
                            ✨ SHINY
                        </div>
                    )}
                </div>
                {(isMythic || isJailbroken) && song.baseRarity && (
                    <div className={`text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm ${getRarityStyles(song.baseRarity).bgColor} ${getRarityStyles(song.baseRarity).textColor}`}>
                        Base {song.baseRarity}
                    </div>
                )}
            </div>

            {isMythic && serialNumber && (
                <div className="absolute top-4 right-4 text-sm font-black px-3 py-1 rounded-full shadow-md bg-yellow-400 text-black border border-yellow-200">
                    #{String(serialNumber).padStart(3, '0')}
                </div>
            )}
            {isJailbroken && (
                <div className="absolute top-4 right-4 text-sm font-black px-3 py-1 rounded-full shadow-md bg-white text-black border border-red-500">
                    1 of 1
                </div>
            )}

            <div className="text-center pt-4">
                <p className={`font-bold text-2xl truncate ${isMythic || isJailbroken ? rarityStyles.textGradient : 'text-white'}`}>
                    {song.title}
                </p>
                <p className="text-gray-300 text-lg truncate font-medium">{song.artist.name}</p>
            </div>
            <div className="relative w-full aspect-square mx-auto my-2">
                <img 
                    src={song.albumArtUrl || DEFAULT_ALBUM_COVER} 
                    onError={handleImageError} 
                    alt={song.album.title} 
                    className="w-full h-full rounded-lg object-cover" 
                />
                {isShiny && <div className="absolute inset-0 rounded-lg holographic-overlay" style={{ opacity: 0.5, backgroundBlendMode: 'overlay' }} />}
            </div>
            <div className="text-center text-xs text-gray-400 truncate">{song.album.title}</div>
        </div>
    );
};

// Over-the-top Cinematic Chase Spotlight Presentation
const ChaseSpotlightView: React.FC<{
    collectedSong: CollectedSong;
    chaseTier: ChaseTier;
    currentIndex: number;
    totalChaseCount: number;
    onNextChase: () => void;
    onSkipToSummary: () => void;
}> = ({ collectedSong, chaseTier, currentIndex, totalChaseCount, onNextChase, onSkipToSummary }) => {
    const { song, serialNumber } = collectedSong;
    const isJailbroken = chaseTier === 'jailbroken';
    const isShinyMythic = chaseTier === 'shiny_mythic';
    const isMythic = chaseTier === 'mythic';
    const isShiny = chaseTier === 'shiny';

    useEffect(() => {
        playChaseSound(chaseTier);
    }, [collectedSong.id, chaseTier]);

    return (
        <div className={`relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-4 select-none ${isJailbroken ? 'spotlight-jailbroken-stage' : ''}`}>
            {/* 1. SHINY ATMOSPHERE (Holographic prismatic aura & stars) */}
            {isShiny && (
                <>
                    <div className="spotlight-shiny-aura" />
                    <div className="spotlight-star-particle top-8 left-12 text-xl">✨</div>
                    <div className="spotlight-star-particle bottom-16 right-10 text-2xl" style={{ animationDelay: '0.6s' }}>✦</div>
                    <div className="spotlight-star-particle top-24 right-16 text-lg" style={{ animationDelay: '1.2s' }}>★</div>
                </>
            )}

            {/* 2. MYTHIC ATMOSPHERE (Blazing golden sunrays, shockwaves, gold embers) */}
            {isMythic && (
                <>
                    <div className="spotlight-mythic-rays" />
                    <div className="spotlight-mythic-shockwave" />
                    <div className="spotlight-gold-particle w-3 h-3 top-10 left-16" style={{ animationDelay: '0.2s' }} />
                    <div className="spotlight-gold-particle w-4 h-4 bottom-20 right-14" style={{ animationDelay: '0.8s' }} />
                    <div className="spotlight-gold-particle w-2.5 h-2.5 top-28 right-20" style={{ animationDelay: '1.4s' }} />
                    <div className="spotlight-gold-particle w-3.5 h-3.5 bottom-32 left-12" style={{ animationDelay: '1.8s' }} />
                </>
            )}

            {/* 3. SHINY MYTHIC ATMOSPHERE (God-tier prismatic gold aurora & cosmic stars) */}
            {isShinyMythic && (
                <>
                    <div className="spotlight-shiny-mythic-aura" />
                    <div className="spotlight-mythic-shockwave" />
                    <div className="spotlight-gold-particle w-4 h-4 top-8 left-14" style={{ animationDelay: '0.3s' }} />
                    <div className="spotlight-gold-particle w-3 h-3 bottom-16 right-12" style={{ animationDelay: '0.9s' }} />
                    <div className="spotlight-star-particle top-16 right-10 text-2xl" style={{ animationDelay: '0.5s' }}>👑</div>
                    <div className="spotlight-star-particle bottom-24 left-10 text-xl" style={{ animationDelay: '1.1s' }}>✨</div>
                </>
            )}

            {/* 4. JAILBROKEN ATMOSPHERE (The coolest cyber-glitch matrix system override) */}
            {isJailbroken && (
                <>
                    <div className="spotlight-jailbroken-aura" />
                    <div className="spotlight-jailbroken-cyber-ring" />
                    <div className="spotlight-cyber-scanner" />
                    {/* Matrix Stream left side */}
                    <div className="spotlight-matrix-stream left-2 top-12 h-64 w-14 hidden sm:block">
                        0xDEAD<br/>BREACH<br/>1_OF_1<br/>ROOT_OK<br/>OVERRIDE<br/>010010<br/>CORRUPT<br/>0xCAFE
                    </div>
                    {/* Matrix Stream right side */}
                    <div className="spotlight-matrix-stream right-2 top-12 h-64 w-14 hidden sm:block text-right">
                        0x7FFF<br/>KERNEL<br/>UNIQUE<br/>BYPASS<br/>LIMIT=0<br/>110101<br/>BREACH<br/>0xBEEF
                    </div>
                </>
            )}

            {/* Top Announcement Badges */}
            <div className="z-20 text-center mb-3">
                {isJailbroken && (
                    <div className="space-y-1">
                        <span className="inline-block px-5 py-2 rounded-full bg-red-600/90 text-white font-black text-xs sm:text-sm tracking-widest border border-red-400 shadow-[0_0_35px_rgba(239,68,68,1)] animate-pulse">
                            ⚠️ SYSTEM OVERRIDE // 1 OF 1 BREACHED ⚠️
                        </span>
                        <p className="text-[11px] font-mono text-red-300 tracking-wider">
                            [SECURITY: COMPROMISED] • [RARITY: UNMEASURABLE] • [UNIQUE: 1 OF 1]
                        </p>
                    </div>
                )}
                {isShinyMythic && (
                    <div className="space-y-1">
                        <span className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 text-black font-black text-xs sm:text-sm tracking-wider shadow-[0_0_35px_rgba(250,204,21,1)] animate-pulse">
                            👑 SHINY MYTHIC GOD-TIER PULL 👑
                        </span>
                        <p className="text-xs text-yellow-300 font-extrabold tracking-wide">
                            HOLOGRAPHIC FOIL + OFFICIAL SERIAL #{String(serialNumber).padStart(3, '0')}
                        </p>
                    </div>
                )}
                {isMythic && (
                    <div className="space-y-1">
                        <span className="inline-block px-5 py-1.5 rounded-full bg-yellow-400 text-black font-black text-xs sm:text-sm tracking-wider shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-pulse">
                            🔥 OFFICIAL MYTHIC DROP // #{String(serialNumber).padStart(3, '0')} 🔥
                        </span>
                        <p className="text-xs text-amber-300 font-bold">
                            EXCLUSIVE NUMBERED EDITION PULL
                        </p>
                    </div>
                )}
                {isShiny && (
                    <div className="space-y-1">
                        <span className="inline-block px-5 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 text-white font-black text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.9)] animate-pulse">
                            ✨ HOLOGRAPHIC SHINY PULL ✨
                        </span>
                        <p className="text-xs text-cyan-300 font-semibold">
                            RARE HOLOGRAPHIC CARD ACQUIRED
                        </p>
                    </div>
                )}
            </div>

            {/* Spotlight Card Presentation */}
            <div className="spotlight-card-enter relative w-[290px] h-[435px] sm:w-[320px] sm:h-[470px] z-20">
                <PackRevealCard collectedSong={collectedSong} />
            </div>

            {/* Controls Below Spotlight Card */}
            <div className="mt-5 z-20 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm justify-center">
                {currentIndex + 1 < totalChaseCount ? (
                    <button
                        onClick={onNextChase}
                        className="w-full py-3 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>Next Chase Card ({currentIndex + 1}/{totalChaseCount})</span>
                        <span>→</span>
                    </button>
                ) : (
                    <button
                        onClick={onSkipToSummary}
                        className="w-full py-3 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>View Pack Summary & Collect</span>
                        <span>→</span>
                    </button>
                )}

                {totalChaseCount > 1 && currentIndex + 1 < totalChaseCount && (
                    <button
                        onClick={onSkipToSummary}
                        className="text-xs text-gray-400 hover:text-white py-1 transition-colors underline font-medium"
                    >
                        Skip to Summary
                    </button>
                )}
            </div>
        </div>
    );
};

// Complete 6-Song Summary Screen
const PackSummaryView: React.FC<{
    pack: CollectedSong[];
    title: string;
    onClose: () => void;
    onOpenAnother?: () => void;
}> = ({ pack, title, onClose, onOpenAnother }) => {
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-3 sm:p-5 text-center select-none z-20">
            {/* Top Action Bar */}
            <div className="w-full bg-gray-900/95 border border-gray-800 rounded-2xl p-4 mb-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ⚡ Pack Summary
                    </span>
                    <h3 className="text-xl font-black text-white mt-0.5">{title}</h3>
                    <p className="text-xs text-gray-400">All 6 cards added to your collection.</p>
                </div>

                {/* Collect All & Open Next */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={onClose}
                        className="flex-1 sm:flex-initial px-8 py-3 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-xl shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>Collect All & Finish</span>
                        <span>✓</span>
                    </button>

                    {onOpenAnother && (
                        <button
                            onClick={onOpenAnother}
                            className="w-full sm:w-auto px-5 py-3 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-xl shadow-purple-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>⚡ Open Next</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 6-Card Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-h-[62vh] overflow-y-auto pr-1">
                {pack.map((item) => {
                    const { song, serialNumber } = item;
                    const isMythic = song.rarity === Rarity.Mythic;
                    const isJailbroken = song.rarity === Rarity.Jailbroken;
                    const isShiny = song.isShiny;
                    const rarityStyles = getRarityStyles(song.rarity);

                    return (
                        <div
                            key={item.id}
                            className={`relative rounded-xl p-3 border transition-all flex flex-col justify-between overflow-hidden text-left ${
                                isJailbroken
                                    ? 'bg-gradient-to-br from-gray-900 via-black to-red-950/80 border-red-500/80 shadow-lg shadow-red-500/20'
                                    : isMythic && isShiny
                                    ? 'bg-gradient-to-br from-amber-950/90 via-purple-950 to-cyan-950 border-yellow-400 shadow-lg shadow-yellow-500/20'
                                    : isMythic
                                    ? 'bg-gradient-to-br from-amber-950/80 via-gray-900 to-purple-950 border-yellow-400'
                                    : isShiny
                                    ? 'bg-gradient-to-br from-pink-950/80 via-gray-900 to-indigo-950 border-cyan-400'
                                    : 'bg-gray-900/90 border-gray-800 hover:border-gray-700'
                            }`}
                        >
                            {/* Card Artwork */}
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2 bg-gray-800">
                                <img
                                    src={song.albumArtUrl || DEFAULT_ALBUM_COVER}
                                    onError={handleImageError}
                                    alt={song.title}
                                    className="w-full h-full object-cover"
                                />
                                {isShiny && (
                                    <div className="absolute inset-0 holographic-overlay opacity-60 pointer-events-none" />
                                )}

                                {/* Serial Number or 1 of 1 Badge */}
                                {isMythic && serialNumber && (
                                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-400 text-black shadow">
                                        #{String(serialNumber).padStart(3, '0')}
                                    </span>
                                )}
                                {isJailbroken && (
                                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-white text-black shadow">
                                        1 of 1
                                    </span>
                                )}
                            </div>

                            {/* Song Meta */}
                            <div>
                                <div className="flex items-center gap-1 mb-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        isMythic ? 'bg-yellow-400 text-black' : isJailbroken ? 'bg-white text-black' : `${rarityStyles.bgColor} ${rarityStyles.textColor}`
                                    }`}>
                                        {song.rarity}
                                    </span>
                                    {isShiny && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                            SHINY
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-bold text-xs text-white truncate">{song.title}</h4>
                                <p className="text-[11px] text-gray-400 truncate">{song.artist.name}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const RewardModal: React.FC<{
    pack: CollectedSong[];
    title: string;
    onClose: () => void;
    initialMode?: 'stack' | 'reveal_all';
    onOpenAnother?: () => void;
}> = ({ pack, title, onClose, initialMode = 'stack', onOpenAnother }) => {
    // Identify all chase cards in the pack sorted by highest tier first
    const chaseCards = useMemo(() => {
        const weight: Record<string, number> = {
            jailbroken: 4,
            shiny_mythic: 3,
            mythic: 2,
            shiny: 1,
        };
        const list: { song: CollectedSong; tier: ChaseTier }[] = [];
        pack.forEach(item => {
            const tier = getChaseTier(item);
            if (tier) {
                list.push({ song: item, tier });
            }
        });
        return list.sort((a, b) => (weight[b.tier!] || 0) - (weight[a.tier!] || 0));
    }, [pack]);

    // Modes: 'stack' | 'spotlight' | 'summary'
    const [viewMode, setViewMode] = useState<'stack' | 'spotlight' | 'summary'>(() => {
        if (initialMode === 'reveal_all') {
            return chaseCards.length > 0 ? 'spotlight' : 'summary';
        }
        return 'stack';
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [spotlightIndex, setSpotlightIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Sync when pack changes or when initialMode updates
    useEffect(() => {
        if (initialMode === 'reveal_all') {
            setSpotlightIndex(0);
            setViewMode(chaseCards.length > 0 ? 'spotlight' : 'summary');
        } else {
            setViewMode('stack');
            setCurrentIndex(0);
            setSpotlightIndex(0);
        }
    }, [pack, initialMode, chaseCards.length]);

    const isLastStackCard = currentIndex >= pack.length - 1;

    // Normal tap-through reveal
    const handleRevealClick = () => {
        if (isAnimating) return;
        if (isLastStackCard) {
            setViewMode('summary');
            return;
        }
        setIsAnimating(true);
        setCurrentIndex(prev => prev + 1);
        setTimeout(() => setIsAnimating(false), 300);
    };

    // Instant "Reveal All" Action
    const handleRevealAll = () => {
        if (chaseCards.length > 0) {
            // Chase spotlight sequence! Give the good pulls the spotlight with epic animation
            setSpotlightIndex(0);
            setViewMode('spotlight');
        } else {
            // No chase pulls -> jump straight to summary!
            setViewMode('summary');
        }
    };

    const handleNextChase = () => {
        if (spotlightIndex + 1 < chaseCards.length) {
            setSpotlightIndex(prev => prev + 1);
        } else {
            setViewMode('summary');
        }
    };

    return (
        <div 
            className="modal-overlay relative overflow-hidden"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            {/* Quick exit button in top-right */}
            <button
                onClick={onClose}
                aria-label="Close pack"
                className="absolute top-5 right-5 z-30 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700/60"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* 1. CHASE SPOTLIGHT VIEW */}
            {viewMode === 'spotlight' && chaseCards[spotlightIndex] && (
                <ChaseSpotlightView
                    collectedSong={chaseCards[spotlightIndex].song}
                    chaseTier={chaseCards[spotlightIndex].tier}
                    currentIndex={spotlightIndex}
                    totalChaseCount={chaseCards.length}
                    onNextChase={handleNextChase}
                    onSkipToSummary={() => setViewMode('summary')}
                />
            )}

            {/* 2. PACK SUMMARY VIEW (WITH VAULT & COLLECT ALL) */}
            {viewMode === 'summary' && (
                <PackSummaryView
                    pack={pack}
                    title={title}
                    onClose={onClose}
                    onOpenAnother={onOpenAnother}
                />
            )}

            {/* 3. DEFAULT 3D STACK REVEAL VIEW */}
            {viewMode === 'stack' && (
                <div className="flex flex-col items-center justify-center text-center w-full h-full p-4">
                    {/* Header with pack title and quick reveal all */}
                    <div className="z-10 flex items-center justify-between w-full max-w-sm mb-2 px-1">
                        <div className="text-left">
                            <h2 className="text-xl sm:text-2xl font-black text-white">{title}</h2>
                            <p className="font-semibold text-white/80 text-xs">
                                Card {Math.min(currentIndex + 1, pack.length)} of {pack.length}
                            </p>
                        </div>
                        <button
                            onClick={handleRevealAll}
                            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 rounded-lg font-black text-xs text-white shadow-lg shadow-purple-500/20 active:scale-95 flex items-center gap-1"
                        >
                            <span>⚡ Reveal All</span>
                            {chaseCards.length > 0 && (
                                <span className="text-[10px] bg-yellow-400 text-black font-black px-1.5 py-0.2 rounded-full">
                                    {chaseCards.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div 
                        onClick={handleRevealClick}
                        className="relative w-[290px] h-[435px] sm:w-[310px] sm:h-[460px] z-10 cursor-pointer my-2"
                    >
                        {pack.map((song, index) => {
                            const isRevealed = index < currentIndex;
                            const isCurrent = index === currentIndex;
                            
                            let transform = '';
                            if (isRevealed) {
                                transform = 'translateY(-150%) rotate(15deg) scale(0.8)';
                            } else if (isCurrent) {
                                transform = 'translateY(0) scale(1)';
                            } else {
                                const stackIndex = index - currentIndex;
                                transform = `translateY(${stackIndex * 15}px) scale(${1 - (stackIndex * 0.05)})`;
                            }

                            return (
                                <div
                                    key={song.id}
                                    className="absolute w-full h-full transition-all duration-500 ease-in-out"
                                    style={{
                                        transform,
                                        zIndex: pack.length - index,
                                        opacity: isRevealed ? 0 : 1
                                    }}
                                >
                                    <PackRevealCard collectedSong={song} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Controls: Tap to Reveal Next & Reveal All Button */}
                    <div className="mt-4 z-20 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-sm">
                        <button
                            onClick={handleRevealClick}
                            className="w-full sm:w-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-md active:scale-95"
                        >
                            {isLastStackCard ? 'View Summary' : 'Tap Card to Next'}
                        </button>

                        <button
                            onClick={handleRevealAll}
                            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 rounded-xl font-black text-xs sm:text-sm text-white transition-all shadow-xl shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>⚡ Reveal All</span>
                            {chaseCards.length > 0 && (
                                <span className="text-[10px] bg-yellow-400 text-black font-black px-1.5 py-0.5 rounded-full">
                                    {chaseCards.length} Chase
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
