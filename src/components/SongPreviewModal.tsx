

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

const SongPreview: React.FC<{
    collectedSong: CollectedSong;
    onClose: () => void;
    showTradeButton: boolean;
    onTogglePlayPause: () => void;
    onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    isPlaying: boolean;
    progress: number;
    mythicOwnerName: string;
    isLoadingUrl: boolean;
    canvasVideoUrl: string | null;
    isCanvasActive: boolean;
    onToggleCanvas: () => void;
}> = ({ collectedSong, onClose, showTradeButton, onTogglePlayPause, onSeek, isPlaying, progress, mythicOwnerName, isLoadingUrl, canvasVideoUrl, isCanvasActive, onToggleCanvas }) => {
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

    const jailbrokenTagText = `JAILBROKEN 1 of 1`;

    return (
    <>
        <div
            className={`modal-content rounded-xl shadow-2xl overflow-hidden relative w-full max-w-sm`}
            onClick={(e) => e.stopPropagation()}
        >
             {canvasVideoUrl && isCanvasActive ? (
                <video
                    src={canvasVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover filter blur-xl brightness-40"
                    aria-hidden="true"
                />
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
                                <div className="relative w-full h-full bg-black">
                                    <video
                                        src={canvasVideoUrl}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover rounded-md"
                                    />
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-lg pointer-events-none">
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
                                <div className="w-full bg-black/30 rounded-full h-2 cursor-pointer" onClick={onSeek}>
                                    <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>{new Date(progress / 100 * 30 * 1000).toISOString().substr(14, 5)}</span>
                                    <span>0:30</span>
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
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-20">
                <XMarkIcon className="w-5 h-5 text-white" />
            </button>
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

    // Effect to check if a Spotify-style Music Video Canvas is available
    useEffect(() => {
        let isMounted = true;
        fetchMusicVideoCanvas(displaySong.artist.name, displaySong.title)
            .then((videoUrl) => {
                if (isMounted && videoUrl) {
                    setCanvasVideoUrl(videoUrl);
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, [displaySong.artist.name, displaySong.title]);
    
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
                        setLivePreviewUrl(freshSong.previewUrl);
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
                // If this preview is for a Mythic card, check direct ownership attribution first
                if (collectedSong.song.rarity === Rarity.Mythic) {
                    if (collectedSong.ownerId && userContext?.currentUser && collectedSong.ownerId === userContext.currentUser.id) {
                        if (isMounted) setMythicOwnerName(userContext.currentUser.name);
                        return;
                    }
                    if (collectedSong.ownerId && userContext?.users) {
                        const directOwner = userContext.users.find(u => u.id === collectedSong.ownerId);
                        if (directOwner && directOwner.name) {
                            if (isMounted) setMythicOwnerName(directOwner.name);
                            return;
                        }
                    }
                }

                if (userContext?.findMythicOwnerName) {
                    const ownerName = await userContext.findMythicOwnerName(collectedSong.song.id, collectedSong.serialNumber || 1);
                    if (isMounted) setMythicOwnerName(ownerName || (collectedSong.song.rarity === Rarity.Mythic && userContext.currentUser?.name ? userContext.currentUser.name : 'Not Pulled'));
                } else {
                    if (isMounted) setMythicOwnerName(collectedSong.song.rarity === Rarity.Mythic && userContext?.currentUser?.name ? userContext.currentUser.name : 'Not Pulled');
                }
            } catch (error) {
                console.error("Error fetching #1 mythic owner:", error);
                if (isMounted) setMythicOwnerName(collectedSong.song.rarity === Rarity.Mythic && userContext?.currentUser?.name ? userContext.currentUser.name : 'Not Pulled');
            }
        };
        fetchOwner();
        return () => { isMounted = false; };
    }, [collectedSong, userContext?.findMythicOwnerName, userContext?.currentUser, userContext?.users]);

    // Create and manage audio element, now dependent on the live URL
    useEffect(() => {
        if (!livePreviewUrl || livePreviewUrl.trim() === '') {
            setIsPlaying(false);
            return; 
        }

        const audio = new Audio(livePreviewUrl);
        audioRef.current = audio;
        audio.volume = 0.5;

        const handleTimeUpdate = () => {
            if (!audio.duration) return;
            setProgress((audio.currentTime / audio.duration) * 100);
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handlePause);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        
        // Autoplay with safe catch
        audio.play().catch(() => {
            setIsPlaying(false);
        });
        
        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handlePause);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audioRef.current = null;
        };
    }, [livePreviewUrl]);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio || !livePreviewUrl) return;

        if (audio.paused) {
            audio.play().catch(() => {
                setIsPlaying(false);
            });
        } else {
            audio.pause();
        }
    };
    
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        const newTime = (clickPosition / progressBar.offsetWidth) * audio.duration;
        
        if (isFinite(newTime)) {
             audio.currentTime = newTime;
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