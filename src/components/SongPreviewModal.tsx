

import React, { useState, useRef, useEffect, useContext } from 'react';
import type { CollectedSong, Song } from '../types';
import { Rarity } from '../types';
import { PauseIcon, PlayIcon, VolumeUpIcon, SparklesIcon, DiamondIcon, StarIcon, BuildingLibraryIcon, XMarkIcon, ArrowPathIcon, MusicNoteIcon } from './icons';
import { getRarityStyles } from '../utils/rarity';
import { UserContext } from '../contexts/UserContext';
import { MASTERY_LEVELS } from '../contexts/UserContext'; // Import mastery config
import { getTrackDetails, getSongDetailsWithFallback } from '../services/musicService';
import { DEFAULT_ALBUM_COVER, handleImageError, isPlaceholderCover } from '../utils/imageFallback';
import { fetchMusicVideoCanvas } from '../services/canvasVideoService';
import { CanvasVideoPlayer } from './CanvasVideoPlayer';
import { GENRE_ARTISTS } from '../services/topArtistsService';

const CreateTradeModal: React.FC<{ song: CollectedSong, onClose: () => void }> = ({ song, onClose }) => {
    const { createTradePost } = useContext(UserContext)!;
    const [seeking, setSeeking] = useState('');

    const handleCreateTrade = () => {
        if (!seeking.trim()) return;
        createTradePost(song, seeking);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Create Trade Post</h3>
                <p className="text-gray-400 mb-2">You are offering:</p>
                <div className="p-3 rounded-lg bg-gray-700/50 border border-gray-600 flex items-center gap-3 mb-4">
                    <img src={song.song.albumArtUrl || DEFAULT_ALBUM_COVER} onError={handleImageError} alt={song.song.album.title} className="w-12 h-12 rounded-md object-cover"/>
                    <div className="truncate">
                        <p className="font-semibold text-white truncate">{song.song.title}</p>
                        <p className="text-sm text-gray-400 truncate">{song.song.artist.name}</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">What are you seeking in return?</label>
                    <input 
                        type="text" 
                        value={seeking} 
                        onChange={e => setSeeking(e.target.value)}
                        placeholder="e.g., Any Mythic, Rare Rock songs..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleCreateTrade} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md">Post Trade</button>
                </div>
            </div>
        </div>
    )
};

const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const rem = Math.floor(seconds % 60);
    return `${mins}:${rem.toString().padStart(2, '0')}`;
};

const SongPreview: React.FC<{
    collectedSong: CollectedSong;
    onClose: () => void;
    showTradeButton: boolean;
    onTogglePlayPause: () => void;
    onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    isPlaying: boolean;
    progress: number;
    currentTime: number;
    duration: number;
    mythicOwnerName: string;
    isLoadingUrl: boolean;
    canvasVideoUrl: string | null;
    isCanvasActive: boolean;
    onToggleCanvas: () => void;
}> = ({ 
    collectedSong, 
    onClose, 
    showTradeButton, 
    onTogglePlayPause, 
    onSeek, 
    isPlaying, 
    progress, 
    currentTime,
    duration,
    mythicOwnerName, 
    isLoadingUrl, 
    canvasVideoUrl, 
    isCanvasActive, 
    onToggleCanvas
}) => {
    const { currentUser, updateCurrentUser, updateShowcase } = useContext(UserContext)!;
    const { song, serialNumber, isPrestige } = collectedSong;
    const isMythic = song.rarity === Rarity.Mythic;
    const isJailbroken = song.rarity === Rarity.Jailbroken;
    const isShiny = song.isShiny;
    const isShinyMythic = isMythic && isShiny;
    const rarityStyles = getRarityStyles(song.rarity);
    const [isCreatingTrade, setIsCreatingTrade] = useState(false);
    
    const isFavorite = currentUser!.showcase?.favoriteSongId === collectedSong.id;
    const isRarest = currentUser!.showcase?.rarestSongId === collectedSong.id;
    const isProfileSong = currentUser!.activeStageTheme?.songId === collectedSong.id;

    const canPrestige = false;
    
    const getRarityTagColor = () => {
        if (isJailbroken) return 'jailbroken-border bg-black text-white';
        if (isPrestige) return 'prestige-border bg-gradient-to-r from-yellow-300 to-white text-black';
        if (isShinyMythic) return 'bg-gradient-to-r from-yellow-400 via-cyan-400 to-pink-500 text-black border border-yellow-200 animate-pulse font-black shadow-lg';
        if (isShiny) return 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white animate-pulse';
        switch (song.rarity) {
            case Rarity.Mythic: return 'bg-yellow-400 text-black';
            case Rarity.Rare: return 'bg-blue-500 text-white';
            case Rarity.Uncommon: return 'bg-green-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };
    
    const getImageBorder = () => {
         if (isJailbroken) return 'p-1 jailbroken-glow jailbroken-border';
         if (isPrestige) return 'p-1 prestige-glow prestige-border';
         if (isShinyMythic) return 'p-1 shiny-mythic-glow shiny-mythic-border';
         if (isShiny) return 'p-1 shiny-glow border-2 border-cyan-400';
         switch (song.rarity) {
            case Rarity.Mythic: return 'mythic-border mythic-glow p-1';
            case Rarity.Rare: return 'border-4 border-blue-400';
            case Rarity.Uncommon: return 'border-4 border-green-400';
            default: return 'border-4 border-gray-400/50';
        }
    };

    const handlePin = (slot: 'favoriteSongId' | 'rarestSongId') => {
        updateShowcase({ [slot]: collectedSong.id });
    };

    const handleUnpin = (slot: 'favoriteSongId' | 'rarestSongId') => {
        updateShowcase({ [slot]: undefined });
    };
    
    const handleSetProfileSong = () => {
        updateCurrentUser({
            activeStageTheme: {
                artistId: song.artist.id,
                artistName: song.artist.name,
                songId: collectedSong.id,
                albumArtUrl: song.albumArtUrl,
            }
        });
    };

    const handleRemoveProfileSong = () => {
        updateCurrentUser({ activeStageTheme: null });
    };

    const [detailStyle, setDetailStyle] = useState<'default' | 'soundmap'>(() => {
        return (localStorage.getItem('packtunes_song_detail_style') as 'soundmap' | 'default') || 'default';
    });

    const [isWideMode, setIsWideMode] = useState<boolean>(() => {
        return localStorage.getItem('packtunes_wide_video_mode') === 'true';
    });

    const handleToggleWideMode = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsWideMode(prev => {
            const next = !prev;
            localStorage.setItem('packtunes_wide_video_mode', String(next));
            return next;
        });
    };

    useEffect(() => {
        const handleStyleChange = () => {
            const current = (localStorage.getItem('packtunes_song_detail_style') as 'soundmap' | 'default') || 'default';
            setDetailStyle(current);
        };
        window.addEventListener('packtunes_song_detail_style_changed', handleStyleChange);
        return () => window.removeEventListener('packtunes_song_detail_style_changed', handleStyleChange);
    }, []);

    const jailbrokenTagText = `JAILBROKEN 1 of 1`;

    const isSpecialCard = isMythic || isJailbroken || isShinyMythic;

    if (isSpecialCard) {
        const getSoundmapGlowColor = () => {
            if (isShinyMythic) return 'border-amber-400/90 shadow-[0_0_60px_rgba(251,191,36,0.6)]';
            if (isJailbroken) return 'border-red-500/90 shadow-[0_0_65px_rgba(239,68,68,0.9),_inset_0_0_35px_rgba(239,68,68,0.4)] ring-2 ring-red-500/60 animate-pulse';
            return 'border-amber-400/90 shadow-[0_0_60px_rgba(251,191,36,0.5)]';
        };

        const serialTag = isJailbroken
            ? '1 of 1'
            : isMythic
            ? `#${String(serialNumber || 1).padStart(3, '0')}`
            : null;

        const detectGenre = (s: Song): string => {
            if ((s as any).genre && (s as any).genre !== 'Hip Hop' && (s as any).genre !== 'Unknown') {
                return (s as any).genre;
            }
            const artistName = s.artist?.name;
            if (artistName) {
                for (const [genreKey, artistList] of Object.entries(GENRE_ARTISTS)) {
                    if (artistList.some(name => name.toLowerCase() === artistName.toLowerCase())) {
                        if (genreKey === 'HipHop') return 'Hip Hop';
                        if (genreKey === 'KPop') return 'K-Pop';
                        if (genreKey === 'RnB') return 'R&B';
                        return genreKey; // Pop, Indie, Rock
                    }
                }
            }
            return (s as any).genre || 'Pop';
        };

        const songGenre = detectGenre(song);

        const getGenrePillStyle = (genreStr: string) => {
            const lower = (genreStr || '').toLowerCase();
            if (lower.includes('hip hop') || lower.includes('hip-hop') || lower.includes('rap')) {
                return 'bg-amber-900/90 text-amber-200 border-amber-500/70';
            }
            if (lower.includes('pop') && !lower.includes('k-pop') && !lower.includes('kpop')) {
                return 'bg-blue-900/90 text-blue-200 border-blue-500/70';
            }
            if (lower.includes('indie') || lower.includes('alt') || lower.includes('folk')) {
                return 'bg-emerald-900/90 text-emerald-200 border-emerald-500/70';
            }
            if (lower.includes('k-pop') || lower.includes('kpop') || lower.includes('j-pop') || lower.includes('jpop')) {
                return 'bg-yellow-900/90 text-yellow-200 border-yellow-500/70';
            }
            if (lower.includes('rock') || lower.includes('metal') || lower.includes('punk')) {
                return 'bg-purple-900/90 text-purple-200 border-purple-500/70';
            }
            if (lower.includes('r&b') || lower.includes('soul')) {
                return 'bg-rose-900/90 text-rose-200 border-rose-500/70';
            }
            if (lower.includes('edm') || lower.includes('electronic') || lower.includes('house') || lower.includes('dance')) {
                return 'bg-cyan-900/90 text-cyan-200 border-cyan-500/70';
            }
            return 'bg-slate-900/90 text-slate-200 border-slate-600/70';
        };

        const containerClasses = isWideMode
            ? `modal-content relative w-[96vw] max-w-2xl sm:max-w-3xl aspect-[16/9] max-h-[85vh] rounded-[2rem] border-2 ${getSoundmapGlowColor()} overflow-hidden select-none shadow-2xl bg-black flex flex-col justify-between transition-all duration-300`
            : `modal-content relative w-[92vw] max-w-sm sm:max-w-md aspect-[9/16] max-h-[88vh] rounded-[2.5rem] border-2 ${getSoundmapGlowColor()} overflow-hidden select-none shadow-2xl bg-black flex flex-col justify-between transition-all duration-300`;

        return (
            <div className={containerClasses} onClick={(e) => e.stopPropagation()}>
                {/* 100% Full-Fill Video Canvas / Artwork Background */}
                {canvasVideoUrl && isCanvasActive ? (
                    <div className="absolute inset-0 w-full h-full bg-black rounded-[inherit] overflow-hidden">
                        <CanvasVideoPlayer 
                            url={canvasVideoUrl} 
                            className="w-full h-full object-cover rounded-[inherit]" 
                            isWideMode={isWideMode}
                            isPlaying={isPlaying}
                            isMuted={true}
                            currentTime={currentTime}
                        />
                    </div>
                ) : (
                    <img
                        src={!isPlaceholderCover(song.albumArtUrl) ? song.albumArtUrl : DEFAULT_ALBUM_COVER}
                        alt={song.title}
                        onError={handleImageError}
                        className="absolute inset-0 w-full h-full object-cover rounded-[inherit]"
                    />
                )}

                {/* Top Controls Overlay inside Video */}
                <div className={`relative z-20 flex items-center justify-between transition-all duration-300 ${
                    isWideMode 
                        ? 'p-2 sm:p-2.5 bg-transparent' 
                        : 'p-3 pt-3.5 sm:p-4 sm:pt-5 bg-gradient-to-b from-black/85 via-black/40 to-transparent'
                }`}>
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar pr-1">
                        <button
                            onClick={onClose}
                            className={`rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/20 shadow-lg active:scale-95 flex-shrink-0 ${
                                isWideMode ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8 sm:w-9 sm:h-9'
                            }`}
                            title="Close"
                        >
                            <span className={`${isWideMode ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold leading-none -mt-0.5`}>‹</span>
                        </button>

                        {/* Canvas Toggle Pill Badge */}
                        {canvasVideoUrl && (
                            <button
                                onClick={onToggleCanvas}
                                className={`bg-black/60 backdrop-blur-md text-emerald-400 border border-emerald-500/40 font-extrabold rounded-full shadow-lg flex items-center gap-1 hover:bg-black/80 transition-all flex-shrink-0 ${
                                    isWideMode ? 'text-[9px] px-2 py-1' : 'text-[10px] sm:text-[11px] px-2.5 py-1'
                                }`}
                            >
                                <span className={`${isWideMode ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-emerald-400 animate-pulse`}></span>
                                {isCanvasActive ? 'CANVAS' : 'NO CANVAS'}
                            </button>
                        )}

                        {/* Small Play/Pause Pill Button */}
                        <button
                            onClick={onTogglePlayPause}
                            disabled={isLoadingUrl}
                            className={`bg-black/60 backdrop-blur-md text-white border border-white/30 font-extrabold rounded-full shadow-lg flex items-center gap-1 hover:bg-black/80 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 ${
                                isWideMode ? 'text-[9px] px-2 py-1' : 'text-[10px] sm:text-[11px] px-2.5 py-1'
                            }`}
                        >
                            {isPlaying ? (
                                <>
                                    <PauseIcon className={`${isWideMode ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-400`} />
                                    <span>Pause</span>
                                </>
                            ) : (
                                <>
                                    <PlayIcon className={`${isWideMode ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-400`} />
                                    <span>Play</span>
                                </>
                            )}
                        </button>

                        {/* Widescreen 16:9 Toggle Pill Button */}
                        <button
                            onClick={handleToggleWideMode}
                            className={`bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/40 font-extrabold rounded-full shadow-lg flex items-center gap-1 hover:bg-black/80 transition-all active:scale-95 flex-shrink-0 ${
                                isWideMode ? 'text-[9px] px-2 py-1' : 'text-[10px] sm:text-[11px] px-2.5 py-1'
                            }`}
                            title={isWideMode ? "Switch to Default Portrait View" : "Switch to 16:9 Widescreen View"}
                        >
                            <span>{isWideMode ? '↔ DEFAULT' : '↔ WIDE'}</span>
                        </button>
                    </div>

                    {/* Top Right Serial # Badge (Only for Mythic / Jailbroken) */}
                    {serialTag && (
                        <div className={`font-black rounded-full shadow-xl tracking-wider flex-shrink-0 ml-1 ${
                            isJailbroken
                                ? 'bg-black/90 text-red-400 border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.7)] backdrop-blur-md animate-pulse font-mono'
                                : 'bg-white/90 backdrop-blur-sm text-black border border-gray-200'
                        } ${
                            isWideMode ? 'text-[9px] px-2 py-0.5' : 'text-xs px-2.5 sm:px-3 py-1'
                        }`}>
                            {serialTag}
                        </div>
                    )}
                </div>

                {/* Bottom Overlay Info Panel directly over Video Canvas */}
                <div className={`relative z-20 flex flex-col transition-all duration-300 ${
                    isWideMode 
                        ? 'p-2 sm:p-3 bg-transparent gap-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]' 
                        : 'pt-20 pb-5 px-4 bg-gradient-to-t from-black via-black/80 to-transparent gap-1.5'
                }`}>
                    {/* Title */}
                    <h2 className={`font-black text-white tracking-wide uppercase leading-tight line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] ${
                        isWideMode ? 'text-xs sm:text-sm' : 'text-xl sm:text-2xl'
                    }`}>
                        {song.title}
                    </h2>

                    {/* Artist Name */}
                    <p className={`font-bold text-gray-200 truncate drop-shadow-[0_2px_4px_rgba(0,0,0,1)] ${
                        isWideMode ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm text-gray-300'
                    }`}>{song.artist.name}</p>

                    {/* Soundmap Pills Row (Rarity, Genre, #1 Owner) */}
                    <div className={`flex items-center overflow-x-auto no-scrollbar whitespace-nowrap font-extrabold ${
                        isWideMode ? 'gap-1 pt-0.5 text-[9px]' : 'gap-1.5 pt-1 text-[11px]'
                    }`}>
                        {/* Rarity Pill */}
                        <div className={`rounded-full shadow-lg flex items-center flex-shrink-0 backdrop-blur-md ${
                            isWideMode ? 'px-2 py-0.5 gap-0.5' : 'px-2.5 py-1 gap-1'
                        } ${
                            isShinyMythic
                                ? 'bg-gradient-to-r from-amber-400/90 via-yellow-300/90 to-amber-500/90 text-black border border-yellow-200/80'
                                : isJailbroken
                                ? 'bg-black/90 text-red-400 border border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse'
                                : 'bg-gradient-to-r from-yellow-400/90 via-amber-300/90 to-yellow-500/90 text-black border border-yellow-200/80'
                        }`}>
                            <DiamondIcon className={isWideMode ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                            <span>
                                {isJailbroken ? 'Jailbroken 1 of 1' : isShinyMythic ? 'Shiny Mythic' : 'Mythic'}
                            </span>
                        </div>

                        {/* Genre Pill */}
                        <div className={`rounded-full shadow-lg flex items-center flex-shrink-0 backdrop-blur-md border ${
                            isWideMode ? 'px-2 py-0.5' : 'px-2.5 py-1'
                        } ${getGenrePillStyle(songGenre)}`}>
                            <span>{songGenre}</span>
                        </div>

                        {/* #1 Owner Pill */}
                        <div className={`bg-gray-900/80 text-gray-200 border border-gray-700/80 rounded-full shadow-lg flex items-center flex-shrink-0 backdrop-blur-md ${
                            isWideMode ? 'px-2 py-0.5' : 'px-2.5 py-1'
                        }`}>
                            <span>#1 Owner: <strong className="text-yellow-400 pl-0.5">{mythicOwnerName}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
    <>
        <div
            className={`modal-content rounded-xl shadow-2xl overflow-hidden relative w-full max-w-sm`}
            onClick={(e) => e.stopPropagation()}
        >
             {canvasVideoUrl && isCanvasActive ? (
                <div className="absolute inset-0 w-full h-full filter blur-xl brightness-40">
                  <CanvasVideoPlayer url={canvasVideoUrl} className="w-full h-full object-cover" />
                </div>
             ) : (
                <img 
                    src={!isPlaceholderCover(song.albumArtUrl) ? song.albumArtUrl : DEFAULT_ALBUM_COVER} 
                    alt="" 
                    onError={handleImageError}
                    className="absolute inset-0 w-full h-full object-cover filter blur-lg brightness-50" 
                    aria-hidden="true" 
                />
             )}
             <div className="absolute inset-0 bg-black/30"></div>
             {isJailbroken && <div className="jailbroken-scanlines"></div>}

            <div className="relative max-h-[90vh] overflow-y-auto">
                <div className="p-3 pt-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col items-start gap-1">
                            <div className={`font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow ${getRarityTagColor()}`}>
                                 {isJailbroken ? <span className="glitch-text" data-text={jailbrokenTagText}>{jailbrokenTagText}</span> : isPrestige ? 'PRESTIGE' : (isShiny ? 'SHINY ' : '') + song.rarity} {isMythic && `#${String(serialNumber).padStart(3, '0')}`}
                            </div>
                            {song.baseRarity && song.rarity !== Rarity.Jailbroken && song.rarity !== Rarity.Mythic && (
                                <div className={`text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm ${getRarityStyles(song.baseRarity).bgColor} ${getRarityStyles(song.baseRarity).textColor}`}>
                                    Base Rarity: {song.baseRarity}
                                </div>
                            )}
                        </div>

                        {canvasVideoUrl && (
                            <button
                                onClick={onToggleCanvas}
                                title={isCanvasActive ? "Switch to album cover" : "Switch to Spotify video canvas"}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md ${
                                    isCanvasActive 
                                        ? 'bg-emerald-500/90 text-white ring-1 ring-emerald-300' 
                                        : 'bg-black/60 text-gray-400 hover:text-white border border-gray-600'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${isCanvasActive ? 'bg-white animate-pulse' : 'bg-gray-500'}`}></span>
                                {isCanvasActive ? 'CANVAS ON' : 'CANVAS OFF'}
                            </button>
                        )}
                    </div>
                    
                    <div className="relative w-full aspect-square mx-auto">
                        <div className={`relative w-full h-full rounded-lg shadow-lg overflow-hidden ${getImageBorder()}`}>
                            {canvasVideoUrl && isCanvasActive ? (
                                <div className="relative w-full h-full bg-black rounded-md overflow-hidden">
                                    <CanvasVideoPlayer url={canvasVideoUrl} className="w-full h-full object-cover rounded-md" />
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-lg pointer-events-none z-10">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        CANVAS
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={!isPlaceholderCover(song.albumArtUrl) ? song.albumArtUrl : DEFAULT_ALBUM_COVER}
                                    alt={song.album.title}
                                    onError={handleImageError}
                                    className={`w-full h-full object-cover rounded-md`}
                                />
                            )}
                            {!isCanvasActive && (
                                <>
                                    {isShinyMythic ? (
                                        <div className="shiny-mythic-overlay-effect !rounded-md"></div>
                                    ) : (
                                        <>
                                            {isJailbroken && <div className="jailbroken-overlay-effect !rounded-md"></div>}
                                            {isPrestige && <div className="prestige-overlay-effect !rounded-md"></div>}
                                            {isShiny && !isPrestige && <div className="shiny-overlay-effect !rounded-md"></div>}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white truncate">{song.title}</h2>
                        <p className="text-base text-gray-300 truncate">{song.artist.name}</p>
                        <p className="text-xs text-gray-400 mt-1 truncate">{song.album.title}</p>
                    </div>

                    {isShinyMythic ? (
                        <div className="mt-2 text-center p-3 shiny-mythic-border bg-gradient-to-r from-amber-500/30 via-cyan-500/20 to-pink-500/30 rounded-xl shadow-xl animate-pulse">
                            <p className="font-black text-sm text-yellow-300 tracking-wider flex items-center justify-center gap-1.5 uppercase drop-shadow">
                                ✨💎 ULTRA-RARE SHINY MYTHIC
                            </p>
                            <p className="text-xs text-cyan-200 mt-1 font-bold">
                                PRISMATIC HOLOGRAPHIC FOIL • SERIAL #{String(serialNumber || 1).padStart(3, '0')}
                            </p>
                        </div>
                    ) : isJailbroken ? (
                        <div className="mt-2 text-center p-2 jailbroken-border bg-black/30 rounded-lg">
                            <p className="font-bold text-lg text-white tracking-widest">JAILBROKEN</p>
                            <p className="text-xs text-gray-300">ONE OF ONE</p>
                        </div>
                    ) : isPrestige ? (
                         <div className="mt-2 text-center p-2 prestige-border bg-black/30 rounded-lg">
                            <p className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-white to-yellow-400 tracking-widest">PRESTIGE</p>
                            <p className="text-xs text-gray-300">SERIAL #{String(serialNumber).padStart(3, '0')}</p>
                        </div>
                    ) : null}

                    {!isJailbroken && (
                         <div className="mt-2 text-center p-2 bg-black/30 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider">#1 Mythic Owner</p>
                            <p className={`font-bold text-lg ${mythicOwnerName === 'Not Pulled' || mythicOwnerName === 'loading...' ? 'text-gray-500' : 'text-yellow-400'}`}>
                                {mythicOwnerName}
                            </p>
                        </div>
                    )}
                    
                    <div className="mt-1">
                        {isLoadingUrl ? (
                            <div className="text-center text-gray-400 text-sm py-2">Loading Preview...</div>
                        ) : (
                            <>
                                <div className="w-full bg-black/30 rounded-full h-2 cursor-pointer relative overflow-hidden" onClick={onSeek}>
                                    <div className="bg-indigo-400 h-2 rounded-full transition-all duration-100" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1 font-mono">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 mt-1">
                        <button onClick={onTogglePlayPause} disabled={isLoadingUrl} className="p-4 w-14 h-14 bg-black/30 rounded-full flex items-center justify-center hover:bg-black/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isPlaying ? <PauseIcon className="w-8 h-8 text-white" /> : <PlayIcon className="w-8 h-8 text-white pl-1" />}
                        </button>
                    </div>

                    {showTradeButton && (
                        <div className="mt-2 border-t border-white/20 pt-3 space-y-2">
                            {isProfileSong ? (
                                <button onClick={handleRemoveProfileSong} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <MusicNoteIcon className="w-5 h-5"/>
                                    Unset as Profile Song
                                </button>
                            ) : (
                                <button onClick={handleSetProfileSong} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <MusicNoteIcon className="w-5 h-5"/>
                                    Set as Profile Song
                                </button>
                            )}
                             {isFavorite ? (
                                <button onClick={() => handleUnpin('favoriteSongId')} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <StarIcon className="w-5 h-5"/>
                                    Unpin from Favorite
                                </button>
                            ) : (
                                <button onClick={() => handlePin('favoriteSongId')} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <StarIcon className="w-5 h-5"/>
                                    Pin as Favorite Song
                                </button>
                            )}

                            {isRarest ? (
                                <button onClick={() => handleUnpin('rarestSongId')} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <DiamondIcon className="w-5 h-5"/>
                                    Unpin from Rarest Gem
                                </button>
                            ) : (
                                <button onClick={() => handlePin('rarestSongId')} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <DiamondIcon className="w-5 h-5"/>
                                    Pin as Rarest Gem
                                </button>
                            )}
                            
                            <button 
                                onClick={() => setIsCreatingTrade(true)} 
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                                disabled={isJailbroken}
                                title={isJailbroken ? "Jailbroken songs are unique and cannot be traded." : ""}
                            >
                                Create Trade Post
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {isCreatingTrade && <CreateTradeModal song={collectedSong} onClose={() => setIsCreatingTrade(false)} />}
    </>
    );
};


export const SongPreviewModal: React.FC<{
  collectedSong: CollectedSong;
  onClose: () => void;
  showTradeButton: boolean;
}> = ({ collectedSong, onClose, showTradeButton }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(30);
    const [mythicOwnerName, setMythicOwnerName] = useState('loading...');
    const userContext = useContext(UserContext);

    const [displaySong, setDisplaySong] = useState<Song>(collectedSong.song);
    const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(collectedSong.song.previewUrl || null);
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [canvasVideoUrl, setCanvasVideoUrl] = useState<string | null>(null);
    const [isCanvasActive, setIsCanvasActive] = useState(true);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const isMythicOrJailbroken = displaySong.rarity === Rarity.Mythic || displaySong.rarity === Rarity.Jailbroken;

    // Effect to check if a Spotify-style Music Video Canvas is available (ONLY for Mythics & Jailbrokens)
    useEffect(() => {
        let isMounted = true;
        if (!isMythicOrJailbroken) {
            setCanvasVideoUrl(null);
            return;
        }
        fetchMusicVideoCanvas(displaySong.artist.name, displaySong.title)
            .then((videoUrl) => {
                if (isMounted && videoUrl) {
                    setCanvasVideoUrl(videoUrl);
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, [displaySong.artist.name, displaySong.title, isMythicOrJailbroken]);
    
    // Effect to fetch the live preview URL for audio with search fallback
    useEffect(() => {
        let isMounted = true;
        setIsLoadingUrl(true);
        getSongDetailsWithFallback(collectedSong.song).then(freshSong => {
            if (isMounted) {
                if (freshSong) {
                    const validArt = freshSong.albumArtUrl && !isPlaceholderCover(freshSong.albumArtUrl);
                    setDisplaySong((prev: Song) => ({
                        ...prev,
                        ...(validArt ? { albumArtUrl: freshSong.albumArtUrl } : {}),
                        ...(freshSong.previewUrl ? { previewUrl: freshSong.previewUrl } : {}),
                        album: { ...prev.album, title: freshSong.album?.title || prev.album?.title }
                    }));

                    if (freshSong.previewUrl) {
                        setLivePreviewUrl(prev => prev === freshSong.previewUrl ? prev : freshSong.previewUrl);
                    }

                    // Update collection item in context/Firestore if fixed
                    if (userContext?.currentUser && collectedSong.id) {
                        const updates: any = {};
                        if (validArt && collectedSong.song.albumArtUrl !== freshSong.albumArtUrl) {
                            updates['song.albumArtUrl'] = freshSong.albumArtUrl;
                            collectedSong.song.albumArtUrl = freshSong.albumArtUrl;
                        }
                        if (freshSong.previewUrl && collectedSong.song.previewUrl !== freshSong.previewUrl) {
                            updates['song.previewUrl'] = freshSong.previewUrl;
                            collectedSong.song.previewUrl = freshSong.previewUrl;
                        }
                        if (Object.keys(updates).length > 0) {
                            import('firebase/firestore').then(({ doc, updateDoc }) => {
                                import('../services/firebase').then(({ db }) => {
                                    updateDoc(doc(db, 'users', userContext.currentUser!.id, 'collection', collectedSong.id), updates).catch(() => {});
                                });
                            });
                        }
                    }
                }
                setIsLoadingUrl(false);
            }
        }).catch(() => {
            if (isMounted) {
                setIsLoadingUrl(false);
            }
        });
        return () => { isMounted = false; };
    }, [collectedSong.id, collectedSong.song]);

    useEffect(() => {
        let isMounted = true;
        const fetchOwner = async () => {
            try {
                if (userContext?.findMythicOwnerName && collectedSong.song.rarity === Rarity.Mythic) {
                    const ownerName = await userContext.findMythicOwnerName(collectedSong.song.id, 1);
                    if (isMounted) setMythicOwnerName(ownerName || 'Not Pulled');
                } else {
                    if (isMounted) setMythicOwnerName('Not Pulled');
                }
            } catch (error) {
                console.error("Error fetching #1 mythic owner:", error);
                if (isMounted) setMythicOwnerName('Not Pulled');
            }
        };
        fetchOwner();
        return () => { isMounted = false; };
    }, [collectedSong.song.id, collectedSong.song.rarity, userContext?.findMythicOwnerName]);

    // Create and manage audio element
    useEffect(() => {
        if (!livePreviewUrl || livePreviewUrl.trim() === '') {
            return; 
        }

        let currentSource = livePreviewUrl;
        let triedProxy = false;
        let audio: HTMLAudioElement | null = new Audio(currentSource);
        audioRef.current = audio;
        audio.volume = 0.85;

        const handleError = () => {
            if (!triedProxy && currentSource.startsWith('http')) {
                triedProxy = true;
                const proxyUrl = `/api/deezer/audio-proxy?url=${encodeURIComponent(currentSource)}`;
                currentSource = proxyUrl;
                if (audio) {
                    audio.src = proxyUrl;
                    audio.load();
                    if (isPlaying) {
                        audio.play().catch(() => setIsPlaying(false));
                    }
                }
            } else {
                setIsPlaying(false);
            }
        };

        const handleTimeUpdate = () => {
            if (!audio || !audio.duration) return;
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration);
            setProgress((audio.currentTime / audio.duration) * 100);
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };
        
        audio.addEventListener('error', handleError);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        
        return () => {
            if (audio) {
                audio.pause();
                audio.removeEventListener('error', handleError);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('play', handlePlay);
                audio.removeEventListener('pause', handlePause);
            }
            audioRef.current = null;
        };
    }, [livePreviewUrl]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => {
                setIsPlaying(true);
            }).catch(() => {
                if (audio.src && !audio.src.includes('/api/deezer/audio-proxy') && livePreviewUrl) {
                    audio.src = `/api/deezer/audio-proxy?url=${encodeURIComponent(livePreviewUrl)}`;
                    audio.load();
                    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                } else {
                    setIsPlaying(false);
                }
            });
        }
    };
    
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        const targetDuration = duration > 0 ? duration : (audioRef.current?.duration || 30);
        const newTime = Math.max(0, Math.min(targetDuration, (clickPosition / progressBar.offsetWidth) * targetDuration));
        
        if (isFinite(newTime)) {
             setCurrentTime(newTime);
             setProgress(targetDuration > 0 ? (newTime / targetDuration) * 100 : 0);
             if (audioRef.current) {
                 audioRef.current.currentTime = newTime;
             }
        }
    };

    const isJailbroken = displaySong.rarity === Rarity.Jailbroken;

    return (
        <div className={`modal-overlay ${isJailbroken ? 'jailbroken-modal' : ''}`} onClick={onClose}>
        <SongPreview 
            collectedSong={{ ...collectedSong, song: displaySong }} 
            onClose={onClose} 
            showTradeButton={showTradeButton}
            isPlaying={isPlaying}
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            onTogglePlayPause={togglePlayPause}
            onSeek={handleSeek}
            mythicOwnerName={mythicOwnerName}
            isLoadingUrl={isLoadingUrl}
            canvasVideoUrl={canvasVideoUrl}
            isCanvasActive={isCanvasActive}
            onToggleCanvas={() => setIsCanvasActive(prev => !prev)}
        />
        </div>
    );
};