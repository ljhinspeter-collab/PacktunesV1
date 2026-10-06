import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { CollectedSong } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';

const SpecialSpotlightCard: React.FC<{ collectedSong: CollectedSong }> = ({ collectedSong }) => {
    const { song, serialNumber } = collectedSong;
    const rarityStyles = getRarityStyles(song.rarity);
    const isMythic = song.rarity === Rarity.Mythic;
    const isJailbroken = song.rarity === Rarity.Jailbroken;
    const isShiny = song.isShiny;

    return (
        <div className={`w-[320px] h-[470px] p-6 rounded-2xl shadow-2xl flex flex-col justify-between relative select-none overflow-hidden transition-all duration-300 scale-100 ${
            isJailbroken 
                ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 jailbroken-border jailbroken-glow'
                : isMythic
                ? 'bg-gradient-to-br from-amber-500 via-yellow-600 to-purple-900 mythic-border mythic-glow'
                : 'bg-gradient-to-br from-pink-700 via-purple-800 to-indigo-900 mythic-glow'
        }`}>
            {isJailbroken && <div className="jailbroken-overlay-effect"></div>}

            <div className="absolute top-4 left-4 flex flex-col items-start gap-1 z-10">
                <div className="flex gap-2 items-center">
                    <div className={`text-xs font-black uppercase px-3 py-1 rounded-full shadow-lg ${
                        isMythic ? 'bg-yellow-400 text-black' : isJailbroken ? 'bg-white text-black' : `${rarityStyles.bgColor} ${rarityStyles.textColor}`
                    }`}>
                        {isJailbroken ? '1 OF 1 JAILBROKEN' : isMythic ? 'MYTHIC PULL!' : `${song.rarity} SHINY`}
                    </div>
                    {isShiny && !isMythic && (
                        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-md animate-pulse">
                            SHINY
                        </div>
                    )}
                </div>
                {(isMythic || isJailbroken) && song.baseRarity && (
                    <div className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm ${getRarityStyles(song.baseRarity).bgColor} ${getRarityStyles(song.baseRarity).textColor}`}>
                        Base {song.baseRarity}
                    </div>
                )}
            </div>

            {isMythic && serialNumber && (
                <div className="absolute top-4 right-4 text-xs font-black px-3 py-1 rounded-full shadow-md bg-yellow-400 text-black">
                    #{String(serialNumber).padStart(3, '0')}
                </div>
            )}
            {isJailbroken && (
                <div className="absolute top-4 right-4 text-xs font-black px-3 py-1 rounded-full shadow-md bg-white text-black">
                    #001
                </div>
            )}

            <div className="text-center pt-8">
                <p className={`font-black text-2xl truncate ${isMythic || isJailbroken ? rarityStyles.textGradient : 'text-white'}`}>
                    {song.title}
                </p>
                <p className="text-gray-200 font-bold text-base mt-0.5">{song.artist.name}</p>
            </div>

            <div className="relative w-full aspect-square mx-auto my-3">
                <img 
                    src={song.albumArtUrl || DEFAULT_ALBUM_COVER} 
                    onError={handleImageError} 
                    alt={song.album.title} 
                    className="w-full h-full rounded-xl object-cover shadow-2xl border border-white/20" 
                />
                {isShiny && <div className="absolute inset-0 rounded-xl holographic-overlay" style={{ opacity: 0.6, backgroundBlendMode: 'overlay' }}></div>}
            </div>

            <div className="text-center text-xs font-semibold text-gray-300 truncate">
                {song.album.title}
            </div>
        </div>
    );
};

export const RewardModal: React.FC<{ pack: CollectedSong[], title: string, onClose: () => void }> = ({ pack, title, onClose }) => {
    // Identify special cards in this pack
    const specialCards = pack.filter(
        cs => cs.song.rarity === Rarity.Mythic || cs.song.rarity === Rarity.Jailbroken || cs.song.isShiny
    );

    const [specialIndex, setSpecialIndex] = useState(0);
    const [mode, setMode] = useState<'SPECIAL' | 'SUMMARY'>(
        specialCards.length > 0 ? 'SPECIAL' : 'SUMMARY'
    );

    const currentSpecial = specialCards[specialIndex];

    // Trigger confetti burst on special card reveal
    useEffect(() => {
        if (mode === 'SPECIAL' && currentSpecial) {
            confetti({
                particleCount: 100,
                spread: 90,
                origin: { y: 0.5 }
            });
        }
    }, [mode, specialIndex, currentSpecial]);

    const handleNextSpecial = () => {
        if (specialIndex < specialCards.length - 1) {
            setSpecialIndex(prev => prev + 1);
        } else {
            setMode('SUMMARY');
        }
    };

    return (
        <div 
            className="modal-overlay relative"
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
                className="absolute top-6 right-6 z-30 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="flex flex-col items-center justify-center text-center w-full h-full p-4">
                <h2 className="text-3xl font-black mb-2 z-10 text-white drop-shadow-md">{title}</h2>

                {mode === 'SPECIAL' && currentSpecial ? (
                    <div className="flex flex-col items-center animate-fade-in z-20">
                        <div className="mb-3">
                            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                🔥 HIGH-TIER SPECIAL PULL ({specialIndex + 1}/{specialCards.length})
                            </span>
                        </div>

                        <SpecialSpotlightCard collectedSong={currentSpecial} />

                        <div className="mt-6 z-20">
                            <button
                                onClick={handleNextSpecial}
                                className="px-8 py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-lg rounded-xl shadow-2xl transition-all hover:scale-105"
                            >
                                {specialIndex < specialCards.length - 1 
                                    ? '✨ Next Special Card →' 
                                    : 'Claim Special Pull & View Pack Summary →'
                                }
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-2xl bg-gray-900/95 border border-gray-800 rounded-2xl p-6 z-20 shadow-2xl backdrop-blur-md max-h-[85vh] overflow-y-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
                            <div>
                                <h3 className="text-2xl font-black text-amber-400 flex items-center gap-2">
                                    <span>🎉 Pack Pull Results</span>
                                </h3>
                                <p className="text-xs text-gray-400">All 6 cards added directly to your collection vault!</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total Pulled</span>
                                <p className="text-xl font-black text-white">{pack.length} Cards</p>
                            </div>
                        </div>

                        {/* Top Vault All Button - No scrolling required! */}
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 mb-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-lg rounded-xl shadow-xl transition-all hover:scale-[1.01] active:scale-95"
                        >
                            ⚡ Vault All Cards & Continue
                        </button>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            {pack.map((cs) => {
                                const styles = getRarityStyles(cs.song.rarity);
                                const isMythic = cs.song.rarity === Rarity.Mythic;
                                const isJailbroken = cs.song.rarity === Rarity.Jailbroken;
                                const isShiny = cs.song.isShiny;

                                return (
                                    <div 
                                        key={cs.id}
                                        className={`p-3 rounded-xl bg-gray-800/80 border ${
                                            isJailbroken 
                                                ? 'border-white shadow-lg shadow-white/10' 
                                                : isMythic 
                                                ? 'border-yellow-400 shadow-lg shadow-yellow-500/20' 
                                                : isShiny 
                                                ? 'border-pink-500 shadow-lg shadow-pink-500/20' 
                                                : 'border-gray-700'
                                        } flex flex-col items-center text-center relative overflow-hidden`}
                                    >
                                        <div className="relative w-20 h-20 mb-2">
                                            <img 
                                                src={cs.song.albumArtUrl || DEFAULT_ALBUM_COVER} 
                                                onError={handleImageError}
                                                alt={cs.song.title} 
                                                className="w-full h-full rounded-lg object-cover shadow-md"
                                            />
                                            {isShiny && <div className="absolute inset-0 rounded-lg holographic-overlay opacity-50 pointer-events-none"></div>}
                                        </div>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full mb-1 ${
                                            isMythic ? 'bg-yellow-400 text-black' : isJailbroken ? 'bg-white text-black' : `${styles.bgColor} ${styles.textColor}`
                                        }`}>
                                            {cs.song.rarity} {cs.serialNumber ? `#${cs.serialNumber}` : ''}
                                        </span>
                                        <p className="font-bold text-xs text-white truncate w-full">{cs.song.title}</p>
                                        <p className="text-[10px] text-gray-400 truncate w-full">{cs.song.artist.name}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold text-sm rounded-xl transition-all"
                        >
                            Vault All Cards & Continue
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
