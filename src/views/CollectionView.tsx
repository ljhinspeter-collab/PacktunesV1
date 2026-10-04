import React, { useState, useMemo, useContext, useRef, useEffect, useCallback } from 'react';
import type { CollectedSong, User, Vinyl, Mixtape, Showcase, ChallengeLevel, ArtistMastery, Title, Artist } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { SearchBar } from '../components/SearchBar';
import { SongPreviewModal } from '../components/SongPreviewModal';
import { UserContext } from '../contexts/UserContext';
import { RarityFilter } from '../components/RarityFilter';
import { CollectionStats } from '../components/CollectionStats';
import { SparklesIcon, StarIcon, VinylIcon, CrownIcon, BroadcastIcon, DiamondIcon, Cog6ToothIcon, PencilIcon, VolumeUpIcon, PlayIcon, PauseIcon, ClockIcon, RectangleStackIcon, XCircleIcon, Squares2x2Icon, Bars4Icon } from '../components/icons';
import { FavoritesView } from './FavoritesView';
import { VinylPlayerModal } from '../components/VinylPlayerModal';
import { ArtistMasteryView } from './ArtistMasteryView';
import { RadioView } from './RadioView';
import { RadioPlayerModal } from '../components/RadioPlayerModal';
import { DiscoverView } from './DiscoverView';
import { AccountSettingsModal } from '../components/AccountSettingsModal';
import { challenges } from '../services/challengeService';
import { BadgeIcon } from '../components/Badge';
import { ProfileFrame } from '../components/ProfileFrame';
import { getTrackDetails, getSongDetailsWithFallback, fetchAlbumArtwork } from '../services/musicService';
import { CosmeticEditorModal } from '../components/CosmeticEditorModal';
import { ArtistBadgeIcon } from '../components/ArtistBadgeIcon';
import { SongListItem } from '../components/SongListItem';
import { SongCard } from '../components/SongCard';
import { CanvasShowcaseView } from '../components/CanvasShowcaseView';
import { DEFAULT_VINYL_COVER, DEFAULT_ALBUM_COVER, handleImageError, isPlaceholderCover } from '../utils/imageFallback';

const ShowcaseItem: React.FC<{
    title: string;
    item: CollectedSong | Vinyl | undefined;
    onClick: () => void;
}> = ({ title, item, onClick }) => {
    
    const renderContent = () => {
        if (!item) {
            return (
                <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-2">
                    <p className="text-gray-500 text-xs text-center">Nothing showcased</p>
                </div>
            )
        }
        
        if ('albumId' in item) { // It's a Vinyl
             return (
                <button onClick={onClick} className="group w-full h-full relative">
                    <div className="absolute inset-0 bg-black rounded-full transition-transform duration-300 group-hover:scale-105"></div>
                    <img 
                        src={!isPlaceholderCover(item.albumArtUrl) ? item.albumArtUrl : DEFAULT_VINYL_COVER} 
                        onError={(e) => handleImageError(e, DEFAULT_VINYL_COVER)}
                        alt={item.albumName} 
                        className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] rounded-full object-cover" 
                    />
                </button>
            )
        } else { // It's a CollectedSong
            const rarityStyles = getRarityStyles(item.song.rarity);
            let compactBackgroundClasses = 'bg-gray-800';
            if (item.song.rarity === Rarity.Jailbroken) {
                compactBackgroundClasses = 'jailbroken-glow jailbroken-border';
            } else if(item.isPrestige) {
                compactBackgroundClasses = 'prestige-glow prestige-border';
            } else if (item.song.isShiny) {
                compactBackgroundClasses = 'shiny-glow bg-gradient-to-br from-cyan-800 via-purple-900 to-gray-900';
            } else if (item.song.rarity === Rarity.Mythic) {
                compactBackgroundClasses = 'mythic-glow mythic-border bg-gradient-to-br from-purple-900 via-gray-900';
            }
             return (
                <button onClick={onClick} className={`relative w-full h-full rounded-md overflow-hidden group ${compactBackgroundClasses}`}>
                    <img 
                        src={!isPlaceholderCover(item.song.albumArtUrl) ? item.song.albumArtUrl : DEFAULT_ALBUM_COVER} 
                        onError={handleImageError}
                        alt={item.song.album.title} 
                        className="w-full h-full object-cover" 
                    />
                    {!item.isPrestige && <div className={`absolute inset-x-0 bottom-0 h-0.5 ${rarityStyles.borderColor.replace('border-', 'bg-')}`}></div>}
                </button>
            )
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-28">
                {renderContent()}
            </div>
            <p className="text-xs font-semibold text-gray-400">{title}</p>
        </div>
    )
};


const ProfileEditModal: React.FC<{ user: User, onSave: (data: Partial<User>) => void, onClose: () => void }> = ({ user, onSave, onClose }) => {
    const [name, setName] = useState(user.name);
    const [bio, setBio] = useState(user.bio);
    const [pfpUrl, setPfpUrl] = useState(user.pfpUrl);

    const handleSave = () => {
        onSave({ name, bio, pfpUrl });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Edit Profile</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                        <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" rows={2}></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Profile Picture URL</label>
                        <input type="text" value={pfpUrl} onChange={e => setPfpUrl(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md">Save</button>
                </div>
            </div>
        </div>
    );
};


const VinylCard: React.FC<{
    vinyl: Vinyl;
    onClick: () => void;
    onPin: () => void;
    isPinned: boolean;
    canPin: boolean;
    pinDisabled: boolean;
}> = ({ vinyl, onClick, onPin, isPinned, canPin, pinDisabled }) => {
    let pinTitle = '';
    if (isPinned) {
        pinTitle = "Unpin from showcase";
    } else if (pinDisabled) {
        pinTitle = "Showcase is full (3/3)";
    } else {
        pinTitle = "Pin to showcase";
    }

    const artistName = vinyl.artistName || vinyl.tracks?.[0]?.artist?.name || '';
    const [coverUrl, setCoverUrl] = useState<string>(
        vinyl.albumArtUrl && !isPlaceholderCover(vinyl.albumArtUrl)
            ? vinyl.albumArtUrl
            : ''
    );

    useEffect(() => {
        let isMounted = true;
        const needsCover = !coverUrl || isPlaceholderCover(coverUrl);
        if (needsCover && (artistName || vinyl.albumName)) {
            fetchAlbumArtwork(artistName, vinyl.albumName).then(art => {
                if (isMounted && art && !isPlaceholderCover(art)) {
                    setCoverUrl(art);
                    vinyl.albumArtUrl = art;
                }
            });
        }
        return () => { isMounted = false; };
    }, [artistName, vinyl.albumName, coverUrl]);

    return (
        <div className="flex flex-col items-center w-36 p-2 rounded-xl bg-gray-900/60 border border-yellow-500/20 hover:border-yellow-500/50 transition-all shadow-md group">
            <div className="relative w-28 h-28">
                <button onClick={onClick} className="w-full h-full relative cursor-pointer group-hover:scale-105 transition-transform duration-300">
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-700 rounded-full shadow-lg p-0.5">
                        <div className="w-full h-full bg-black rounded-full flex items-center justify-center p-1.5">
                            <img 
                                src={coverUrl && !isPlaceholderCover(coverUrl) ? coverUrl : (!isPlaceholderCover(vinyl.albumArtUrl) ? vinyl.albumArtUrl : DEFAULT_VINYL_COVER)} 
                                alt={vinyl.albumName} 
                                onError={(e) => handleImageError(e, DEFAULT_VINYL_COVER)}
                                className="w-full h-full rounded-full object-cover shadow-inner" 
                            />
                        </div>
                    </div>
                </button>
                {canPin && (
                    <button 
                        onClick={onPin} 
                        title={pinTitle}
                        disabled={pinDisabled && !isPinned}
                        className={`absolute -top-1 -right-1 p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md z-10 ${isPinned ? 'bg-amber-500 text-black font-bold' : 'bg-black/80 text-gray-300 hover:text-white'}`}>
                        <StarIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            <p className="text-xs text-center mt-2 font-semibold text-white truncate w-full" title={vinyl.albumName}>{vinyl.albumName}</p>
            {artistName && <p className="text-[11px] text-center text-amber-400/80 truncate w-full" title={artistName}>{artistName}</p>}
        </div>
    );
};

const VinylShelfView: React.FC<{
    vinyls: Vinyl[];
    onPlay: (vinyl: Vinyl) => void;
    onPin: (albumId: string) => void;
    proudestVinylIds: string[];
    canPin: boolean;
}> = ({ vinyls, onPlay, onPin, proudestVinylIds, canPin }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [displayCount, setDisplayCount] = useState(24);

    const filteredVinyls = useMemo(() => {
        if (!searchTerm.trim()) return vinyls;
        const q = searchTerm.toLowerCase().trim();
        return vinyls.filter(v => 
            v.albumName.toLowerCase().includes(q) || 
            (v.artistName && v.artistName.toLowerCase().includes(q)) ||
            (v.tracks && v.tracks.some(t => t.title.toLowerCase().includes(q) || t.artist?.name?.toLowerCase().includes(q)))
        );
    }, [vinyls, searchTerm]);

    const visibleVinyls = useMemo(() => {
        return filteredVinyls.slice(0, displayCount);
    }, [filteredVinyls, displayCount]);

    if (!vinyls || vinyls.length === 0) {
        return (
            <div className="text-center text-gray-400 p-8 border-2 border-dashed border-gray-600 rounded-xl bg-gray-900/40 max-w-lg mx-auto">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center p-0.5">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                        <StarIcon className="w-8 h-8 text-yellow-400" />
                    </div>
                </div>
                <p className="font-bold text-lg text-white">Your Golden Vinyl shelf is empty.</p>
                <p className="text-sm mt-2 text-gray-300">
                    Collect the <span className="font-bold text-cyan-300">SHINY</span> version of every song from an album to earn a Golden Vinyl and unlock a special player!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800/60 p-3 rounded-xl border border-gray-700">
                <div className="text-sm text-gray-300 font-medium">
                    Total Golden Vinyls: <span className="font-bold text-amber-400">{vinyls.length}</span>
                    {searchTerm && ` (${filteredVinyls.length} match)`}
                </div>
                <div className="w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Search shelf by album or artist..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setDisplayCount(24);
                        }}
                        className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
                {visibleVinyls.map(vinyl => {
                    const isPinned = (proudestVinylIds || []).includes(vinyl.albumId);
                    const pinDisabled = !isPinned && (proudestVinylIds || []).length >= 3;
                    return (
                        <VinylCard
                            key={vinyl.albumId}
                            vinyl={vinyl}
                            onClick={() => onPlay(vinyl)}
                            isPinned={isPinned}
                            onPin={() => onPin(vinyl.albumId)}
                            canPin={canPin}
                            pinDisabled={pinDisabled}
                        />
                    );
                })}
            </div>

            {displayCount < filteredVinyls.length && (
                <div className="text-center pt-4">
                    <button
                        onClick={() => setDisplayCount(prev => prev + 24)}
                        className="px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold rounded-lg shadow-md transition-all">
                        Load More ({filteredVinyls.length - displayCount} remaining)
                    </button>
                </div>
            )}
        </div>
    );
};

const TitleDisplay: React.FC<{ title: Title; className?: string }> = ({ title, className }) => {
    const [showInfo, setShowInfo] = useState(false);
    const baseClasses = "px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold rounded-full text-sm shadow-lg transform hover:scale-105 transition-transform";
    
    return (
        <div className="relative mt-2">
            <button
                onClick={() => setShowInfo(s => !s)}
                className={`${baseClasses} ${className || ''}`}
                data-text={title.name}
            >
                {title.name}
            </button>
            {showInfo && (
                <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs text-center z-10 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                >
                    {title.description}
                </div>
            )}
        </div>
    );
};


type ProfileViewTab = 'collection' | 'showcase' | 'playlist' | 'vinyls' | 'stats' | 'mastery' | 'discover' | 'radio' | 'boosts';

export const ProfileView: React.FC<{ user: User }> = ({ user }) => {
  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<CollectedSong | null>(null);
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All');
  const [showShinyOnly, setShowShinyOnly] = useState(false);
  const [showPrestigeOnly, setShowPrestigeOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isShowingFavorites, setIsShowingFavorites] = useState(false);
  const [isShowingAccount, setIsShowingAccount] = useState(false);
  const [isCosmeticEditorOpen, setIsCosmeticEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileViewTab>('collection');
  const [sortMode, setSortMode] = useState<'top' | 'recent'>('top');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [playingVinyl, setPlayingVinyl] = useState<Vinyl | null>(null);
  const [playingRadio, setPlayingRadio] = useState<Mixtape | null>(null);
  const userContext = useContext(UserContext);
  const { currentUser, currentUserCollection, viewingUserCollection, updateCurrentUser, updateShowcase } = userContext!;
  const isCurrentUser = currentUser?.id === user.id;
  const collection = isCurrentUser ? currentUserCollection : viewingUserCollection;
  
  const stageAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isStagePlaying, setIsStagePlaying] = useState(false);

  const handleSongClick = useCallback((song: CollectedSong) => {
    setSelectedSong(song);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // If a theme is set, fetch details and prepare the audio element.
    if (user.activeStageTheme) {
        const songToPlay = collection.find(cs => cs.id === user.activeStageTheme!.songId);
        if (songToPlay) {
            getSongDetailsWithFallback(songToPlay.song).then(freshSong => {
                if (isMounted) {
                    const previewToPlay = freshSong?.previewUrl || songToPlay.song.previewUrl;
                    if (previewToPlay) {
                        const newAudio = new Audio(previewToPlay);
                        newAudio.loop = true;
                        newAudio.volume = 0.3;
                        stageAudioRef.current = newAudio;
                        
                        newAudio.onplay = () => setIsStagePlaying(true);
                        newAudio.onpause = () => setIsStagePlaying(false);
                    }
                }
            });
        }
    }

    // The cleanup function runs on unmount or when dependencies change.
    // It always reads the latest value from the ref, preventing race conditions.
    return () => {
        isMounted = false;
        if (stageAudioRef.current) {
            stageAudioRef.current.pause();
            stageAudioRef.current.src = '';
            stageAudioRef.current = null;
        }
        // Ensure playback state is reset.
        setIsStagePlaying(false);
    };
}, [user.activeStageTheme?.songId, collection]);


  const hasJailbrokenSong = useMemo(() => collection.some(cs => cs.song.rarity === Rarity.Jailbroken), [collection]);

  const filteredSongs = useMemo(() => {
    // Deduplicate by collectedSong.id to ensure zero duplicate cards in the grid
    const map = new Map<string, CollectedSong>();
    collection.forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
    let songs = Array.from(map.values());

    if (showFavoritesOnly) {
      const favoriteArtistIds = new Set(user.favoriteArtists.map(a => a.id));
      songs = songs.filter(item => favoriteArtistIds.has(item.song.artist.id));
    }
    if (showPrestigeOnly) {
      songs = songs.filter(item => item.isPrestige);
    }
    if (showShinyOnly) {
      songs = songs.filter(item => item.song.isShiny);
    }
    if (rarityFilter !== 'All') {
      songs = songs.filter(item => item.song.rarity === rarityFilter);
    }
    if (query.trim()) {
      const lowerCaseQuery = query.toLowerCase();
      songs = songs.filter(
        (item) =>
          item.song.title.toLowerCase().includes(lowerCaseQuery) ||
          item.song.artist.name.toLowerCase().includes(lowerCaseQuery)
      );
    }
    
    if (sortMode === 'recent') {
        return [...songs].sort((a, b) => b.collectedAt - a.collectedAt);
    }

    const rarityOrder = [Rarity.Jailbroken, Rarity.Mythic, Rarity.Rare, Rarity.Uncommon, Rarity.Common];
    const getRarityValue = (rarity: Rarity) => rarityOrder.indexOf(rarity);

    return [...songs].sort((a, b) => {
        const prestigeDiff = (b.isPrestige ? 1 : 0) - (a.isPrestige ? 1 : 0);
        if (prestigeDiff !== 0) return prestigeDiff;

        const aIsJailbroken = a.song.rarity === Rarity.Jailbroken;
        const bIsJailbroken = b.song.rarity === Rarity.Jailbroken;
        if (aIsJailbroken !== bIsJailbroken) {
            return bIsJailbroken ? 1 : -1;
        }

        const shinyDiff = (b.song.isShiny ? 1 : 0) - (a.song.isShiny ? 1 : 0);
        if (shinyDiff !== 0) return shinyDiff;
        
        const rarityDiff = getRarityValue(a.song.rarity) - getRarityValue(b.song.rarity);
        if (rarityDiff !== 0) return rarityDiff;

        const artistCompare = a.song.artist.name.localeCompare(b.song.artist.name);
        if (artistCompare !== 0) return artistCompare;
        return a.song.title.localeCompare(b.song.title);
    });

  }, [query, collection, rarityFilter, showShinyOnly, showPrestigeOnly, showFavoritesOnly, user.favoriteArtists, sortMode]);
  
  const radioToPlay = useMemo(() => {
      if (!user.featuredMixtapeId) return null;
      return user.mixtapes.find(m => m.id === user.featuredMixtapeId) || null;
  }, [user.featuredMixtapeId, user.mixtapes]);
  
  const showcaseItems = useMemo(() => {
      const collectionMap = new Map((collection || []).map(cs => [cs.id, cs]));
      const vinylMap = new Map((user?.vinyls || []).map(v => [v.albumId, v]));
      
      return {
          favoriteSong: user?.showcase?.favoriteSongId ? collectionMap.get(user.showcase.favoriteSongId) : undefined,
          rarestSong: user?.showcase?.rarestSongId ? collectionMap.get(user.showcase.rarestSongId) : undefined,
          proudestVinyls: user?.showcase?.proudestVinylIds?.map(id => vinylMap.get(id)).filter((v): v is Vinyl => !!v) || [],
      }
  }, [user?.showcase, collection, user?.vinyls]);

  const allBadgesMap = useMemo(() => {
    const map = new Map<string, ChallengeLevel>();
    challenges.forEach(challenge => {
        challenge.levels.forEach(level => {
            map.set(level.badge.name, level);
        });
    });
    return map;
  }, []);
  
  const displayedChallengeBadges = useMemo(() => {
      const earnedBadgeDetails = (user?.earnedBadges || [])
          .map(b => allBadgesMap.get(b.name))
          .filter((level): level is ChallengeLevel => !!level && level.challengeId !== 'artist-mastery');

      const groupedByChallenge: Record<string, ChallengeLevel[]> = {};
      earnedBadgeDetails.forEach(level => {
          if (!groupedByChallenge[level.challengeId]) {
              groupedByChallenge[level.challengeId] = [];
          }
          groupedByChallenge[level.challengeId].push(level);
      });

      return Object.values(groupedByChallenge)
          .map(group => group.sort((a, b) => b.level - a.level)[0])
          .sort((a,b) => a.challengeId.localeCompare(b.challengeId));
  }, [user?.earnedBadges, allBadgesMap]);

  const displayedArtistBadges = useMemo(() => {
    if (!user?.displayedArtistBadges || !user?.artistMastery) return [];
    const favoriteArtistsMap = new Map((user.favoriteArtists || []).map(a => [a.id, a]));
    return user.displayedArtistBadges
        .map(artistId => {
            const mastery = user.artistMastery[artistId];
            if (!mastery || typeof mastery !== 'object') return null;
            
            const favoriteArtist = favoriteArtistsMap.get(artistId);
            return {
                ...mastery,
                artistPictureUrl: (mastery as ArtistMastery).artistPictureUrl || (favoriteArtist as Artist | undefined)?.pictureUrl,
            };
        })
        .filter((mastery): mastery is NonNullable<typeof mastery> => !!mastery);
  }, [user?.displayedArtistBadges, user?.artistMastery, user?.favoriteArtists]);

  const activeTitle = useMemo(() => {
    if (!user.activeTitleId || !user.earnedTitles) return null;
    return user.earnedTitles.find(t => t.id === user.activeTitleId) || null;
  }, [user.activeTitleId, user.earnedTitles]);

  const handlePinVinyl = (vinylId: string) => {
      if (!isCurrentUser) return;
      const currentPins = user.showcase?.proudestVinylIds || [];
      const isPinned = currentPins.includes(vinylId);
      let newPins;
      if (isPinned) {
          newPins = currentPins.filter(id => id !== vinylId);
      } else {
          if (currentPins.length < 3) {
              newPins = [...currentPins, vinylId];
          } else {
              return;
          }
      }
      updateShowcase({ proudestVinylIds: newPins });
  };
  
   const toggleStageAudio = () => {
        const audio = stageAudioRef.current;
        if (audio) {
            if (audio.paused) {
                audio.play().catch(() => setIsStagePlaying(false));
            } else {
                audio.pause();
            }
        }
    };


  return (
    <div className="relative">
      {user.activeStageTheme && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
            <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                style={{ backgroundImage: `url(${user.activeStageTheme.albumArtUrl})`, filter: 'blur(20px) brightness(0.4)', transform: 'scale(1.1)' }}
            ></div>
             <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
             <div className="absolute inset-0 animate-[stage-light-pulse_8s_ease-in-out_infinite]"></div>
             <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 text-center">
                 <h3 className="text-6xl font-black text-white/50 opacity-50 tracking-widest uppercase [text-shadow:_0_0_20px_rgba(255,255,255,0.3)]">{user.activeStageTheme.artistName}</h3>
             </div>
        </div>
      )}
      <div className={`flex flex-col md:flex-row items-start gap-6 mb-8 p-6 rounded-lg border ${user.activeStageTheme ? 'bg-transparent border-transparent' : 'bg-gray-800/50 border-gray-700'}`}>
        <div className="flex-shrink-0 flex flex-col items-center w-full md:w-auto">
            {user.activeProfileFrame ? (
                 <ProfileFrame pfpUrl={user.pfpUrl} frameUrl={user.activeProfileFrame.albumArtUrl} size="lg" />
            ) : (
                <img src={user.pfpUrl} crossOrigin="anonymous" alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-600"/>
            )}
            <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2 justify-center">
                    {displayedChallengeBadges.map(level => (
                        <BadgeIcon key={level.badge.name} badge={level.badge} level={level.level} size="sm" />
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-gray-700">
                    {displayedArtistBadges.map(mastery => (
                        <ArtistBadgeIcon key={mastery.artistName} artist={mastery} size="sm" />
                    ))}
                </div>
            </div>
        </div>
        <div className="flex-grow w-full">
          <div className="flex justify-between items-start">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold">{user.name}</h2>
                {activeTitle && (
                    <TitleDisplay 
                        title={activeTitle} 
                        className={user.name.toLowerCase() === 'vize' && activeTitle.id === 'title-exclusive-veilkeeper' ? 'veilkeeper-title-effect' : ''}
                    />
                )}
                <p className="text-gray-400 mt-1 max-w-lg">{user.bio}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                 {isCurrentUser ? (
                      <>
                          <button onClick={() => setIsCosmeticEditorOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                            <SparklesIcon className="w-4 h-4" />
                            Customize
                          </button>
                          <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                              <PencilIcon className="w-4 h-4" />
                              Edit
                          </button>
                          <button onClick={() => setIsShowingAccount(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                              <Cog6ToothIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => setIsShowingFavorites(true)} className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600/80 hover:bg-yellow-600 rounded-md font-semibold transition-colors text-sm">
                              <StarIcon className="w-4 h-4" />
                          </button>
                      </>
                  ) : radioToPlay && (
                       <button onClick={() => setPlayingRadio(radioToPlay)} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600/80 hover:bg-green-600 rounded-md font-semibold transition-colors">
                            <BroadcastIcon className="w-5 h-5" />
                            Tune In
                        </button>
                  )}
            </div>
          </div>

          {user.activeStageTheme && isCurrentUser && (
            <div className="flex flex-col items-center my-4">
              <button onClick={toggleStageAudio} className="relative w-24 h-24 group">
                  <div className="absolute inset-0 bg-black rounded-full shadow-lg"></div>
                  <img 
                      src={user.activeStageTheme.albumArtUrl || DEFAULT_ALBUM_COVER} 
                      onError={handleImageError}
                      alt="Profile Song"
                      className={`absolute inset-2 w-20 h-20 rounded-full object-cover transition-transform duration-1000 ${isStagePlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
                      style={{ animationPlayState: isStagePlaying ? 'running' : 'paused' }}
                  />
                  <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 rounded-full border-2 border-gray-800 flex items-center justify-center">
                      {isStagePlaying 
                        ? <PauseIcon className="w-3 h-3 text-gray-800" /> 
                        : <PlayIcon className="w-3 h-3 text-gray-800 pl-0.5" />}
                  </div>
              </button>
              <p className="text-xs text-gray-400 mt-2">Profile Song</p>
            </div>
          )}

           <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col items-center gap-6">
                <div className="flex justify-around items-start w-full">
                    <ShowcaseItem title="Favorite Song" item={showcaseItems.favoriteSong} onClick={() => showcaseItems.favoriteSong && setSelectedSong(showcaseItems.favoriteSong)} />
                    <ShowcaseItem title="Rarest Gem" item={showcaseItems.rarestSong} onClick={() => showcaseItems.rarestSong && setSelectedSong(showcaseItems.rarestSong)} />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-2 h-24 items-center">
                        {[0, 1, 2].map(i => {
                            const vinyl = showcaseItems.proudestVinyls[i];
                            return (
                                <div key={i} className="w-20 h-20">
                                    {vinyl ? (
                                        <button onClick={() => setPlayingVinyl(vinyl)} className="group w-full h-full relative">
                                            <div className="absolute inset-0 bg-black rounded-full transition-transform duration-300 group-hover:scale-105"></div>
                                            <img 
                                                src={vinyl.albumArtUrl || DEFAULT_VINYL_COVER} 
                                                onError={(e) => handleImageError(e, DEFAULT_VINYL_COVER)}
                                                alt={vinyl.albumName} 
                                                className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] rounded-full object-cover" 
                                            />
                                        </button>
                                    ) : (
                                        <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-full"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs font-semibold text-gray-400">Showcased Vinyls</p>
                </div>
           </div>
        </div>
      </div>

      <div className="flex justify-start sm:justify-center overflow-x-auto border-b border-gray-700 mb-6 no-scrollbar">
        <button 
            onClick={() => setActiveTab('collection')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'collection' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Collection
        </button>
        <button 
            onClick={() => setActiveTab('showcase')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors flex items-center gap-1.5 ${activeTab === 'showcase' ? 'border-b-2 border-emerald-400 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Showcase
        </button>
        {isCurrentUser && <button 
            onClick={() => setActiveTab('playlist')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'playlist' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            My Playlist
        </button>}
         <button 
            onClick={() => setActiveTab('vinyls')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'vinyls' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Golden Vinyls
        </button>
        {isCurrentUser && <button 
            onClick={() => setActiveTab('boosts')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'boosts' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Boosts
        </button>}
        <button 
            onClick={() => setActiveTab('stats')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'stats' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Statistics
        </button>
         <button 
            onClick={() => setActiveTab('mastery')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'mastery' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Mastery
        </button>
        <button 
            onClick={() => setActiveTab('discover')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'discover' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Discover
        </button>
         {isCurrentUser && <button 
            onClick={() => setActiveTab('radio')}
            className={`flex-shrink-0 px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'radio' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Radio
        </button>}
      </div>

      {activeTab === 'collection' && (
        <>
            <div className="max-w-lg mx-auto mb-4">
                <SearchBar query={query} setQuery={setQuery} onSearch={() => {}} isLoading={false} placeholder="Search your collection..."/>
            </div>

            <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
              <RarityFilter activeFilter={rarityFilter} setFilter={setRarityFilter} hasJailbrokenSong={hasJailbrokenSong} />
              <button 
                onClick={() => setShowShinyOnly(prev => !prev)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5 ${showShinyOnly ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                <SparklesIcon className="w-4 h-4" />
                Shiny
              </button>
              <button 
                onClick={() => setShowPrestigeOnly(prev => !prev)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5 ${showPrestigeOnly ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                <DiamondIcon className="w-4 h-4" />
                Prestige
              </button>
              <button 
                onClick={() => setShowFavoritesOnly(prev => !prev)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5 ${showFavoritesOnly ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                <StarIcon className="w-4 h-4" />
                Favorites
              </button>
            </div>

            <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-2 p-1 bg-gray-700 rounded-full text-white">
                    <button 
                        onClick={() => setSortMode('top')}
                        className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold ${sortMode === 'top' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                    >
                        Top Songs
                    </button>
                    <button 
                        onClick={() => setSortMode('recent')}
                        className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold ${sortMode === 'recent' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                    >
                        Most Recent
                    </button>
                </div>
                 <div className="flex items-center gap-2 p-1 bg-gray-700 rounded-full text-white">
                    <button title="Grid View" onClick={() => setViewMode('grid')} className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}>
                        <Squares2x2Icon className="w-5 h-5" />
                    </button>
                    <button title="List View" onClick={() => setViewMode('list')} className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}>
                        <Bars4Icon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {filteredSongs.length > 100 && (
                <div className="text-center text-sm text-gray-400 mb-4 bg-gray-800 p-2 rounded-md max-w-lg mx-auto">
                    Showing the {sortMode === 'recent' ? '100 most recent' : 'top 100'} results for performance. Use filters to narrow your search.
                </div>
            )}

            {collection.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                <p className="text-lg">This collection is empty.</p>
                {isCurrentUser && <p className="mt-1">Go to the 'Packs' tab to get some songs!</p>}
                </div>
            ) : filteredSongs.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                <p className="text-lg">No songs match your filters.</p>
                </div>
            ) : (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredSongs.slice(0, 100).map(song => (
                            <SongCard key={song.id} collectedSong={song} onClick={handleSongClick} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1">
                      {filteredSongs.slice(0, 100).map(song => (
                          <SongListItem key={song.id} collectedSong={song} onClick={handleSongClick} />
                      ))}
                    </div>
                )
            )}
        </>
      )}

      {activeTab === 'showcase' && (
        <CanvasShowcaseView 
            user={user} 
            collection={collection} 
            onSongClick={handleSongClick} 
        />
      )}
      {activeTab === 'playlist' && isCurrentUser && <PlaylistEditorView />}
      {activeTab === 'vinyls' && (
           <VinylShelfView
               vinyls={user.vinyls || []}
               onPlay={(vinyl) => setPlayingVinyl(vinyl)}
               onPin={(albumId) => handlePinVinyl(albumId)}
               proudestVinylIds={user.showcase?.proudestVinylIds || []}
               canPin={isCurrentUser}
           />
      )}
      
      {activeTab === 'boosts' && isCurrentUser && <BoostsView />}
      {activeTab === 'stats' && <CollectionStats user={user} collection={collection} />}
      {activeTab === 'mastery' && <ArtistMasteryView />}
      {activeTab === 'discover' && <DiscoverView />}
      {activeTab === 'radio' && isCurrentUser && <RadioView />}
      
      {selectedSong && (
        <SongPreviewModal
            key={selectedSong.id}
            collectedSong={selectedSong}
            onClose={() => setSelectedSong(null)}
            showTradeButton={isCurrentUser}
        />
      )}
      {isCurrentUser && (
        <>
            {isEditingProfile && (
                <ProfileEditModal
                    user={user}
                    onClose={() => setIsEditingProfile(false)}
                    onSave={updateCurrentUser}
                />
            )}
            {isShowingAccount && (
                <AccountSettingsModal 
                    onClose={() => setIsShowingAccount(false)}
                />
            )}
            {isCosmeticEditorOpen && (
                <CosmeticEditorModal
                    user={user}
                    onClose={() => setIsCosmeticEditorOpen(false)}
                />
            )}
        </>
      )}
      {isShowingFavorites && (
          <div className="modal-overlay" onClick={() => setIsShowingFavorites(false)}>
              <div className="modal-content w-full max-w-3xl h-[80vh] bg-gray-800 rounded-lg p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex-shrink-0 mb-4">
                     <button onClick={() => setIsShowingFavorites(false)} className="absolute top-4 right-4 p-1.5 bg-gray-700 rounded-full hover:bg-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                  </div>
                  <div className="flex-grow overflow-y-auto">
                      <FavoritesView />
                  </div>
              </div>
          </div>
      )}
      {playingVinyl && <VinylPlayerModal key={playingVinyl.albumId} vinyl={playingVinyl} onClose={() => setPlayingVinyl(null)} />}
      {playingRadio && radioToPlay && <RadioPlayerModal key={radioToPlay.id} mixtape={radioToPlay} user={user} onClose={() => setPlayingRadio(null)} />}
    </div>
  );
};

const PlaylistSongItemDetails: React.FC<{song: CollectedSong}> = ({ song }) => {
    return (
        <div className="flex items-center gap-3">
            <img 
                src={!isPlaceholderCover(song.song.albumArtUrl) ? song.song.albumArtUrl : DEFAULT_ALBUM_COVER} 
                alt={song.song.album.title} 
                onError={handleImageError}
                className="w-12 h-12 rounded-sm object-cover flex-shrink-0" 
            />
            <div className="flex-grow truncate">
                <p className="font-semibold text-white truncate text-sm">{song.song.title}</p>
                <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                <div className="text-xs text-gray-300 font-semibold mt-1 flex items-center gap-2">
                    {song.song.isShiny && !song.isPrestige && <SparklesIcon className="w-4 h-4 text-cyan-400" />}
                    {song.isPrestige ? (
                        <span className="text-yellow-400">Prestige #{String(song.serialNumber).padStart(3,'0')}</span>
                    ) : song.song.rarity === Rarity.Jailbroken ? (
                        <span className="text-white">Jailbroken 1 of 1</span>
                    ) : song.song.rarity === Rarity.Mythic ? (
                         <span className={getRarityStyles(song.song.rarity).textColor}>Mythic #{String(song.serialNumber).padStart(3,'0')}</span>
                    ) : (
                        <span className={getRarityStyles(song.song.rarity).textColor}>{song.song.rarity}</span>
                    )}
                </div>
            </div>
        </div>
    );
};


const PlaylistSongSelectItem: React.FC<{ song: CollectedSong; onAdd: () => void; }> = ({ song, onAdd }) => (
    <div className="w-full text-left p-2 rounded-md flex items-center justify-between gap-2 bg-gray-700/50">
        <PlaylistSongItemDetails song={song} />
        <button onClick={onAdd} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-md text-xs font-semibold self-center flex-shrink-0">Add</button>
    </div>
);

const PlaylistDraggableItem: React.FC<{
    song: CollectedSong;
    onRemove: () => void;
    index: number;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    draggedOverIndex: number | null;
}> = ({ song, onRemove, index, onDragStart, onDragEnter, onDragEnd, draggedOverIndex }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`p-2 rounded-md flex items-center justify-between gap-2 bg-gray-700/50 cursor-grab transition-shadow ${draggedOverIndex === index ? 'drag-over-hint' : ''}`}
        >
            <PlaylistSongItemDetails song={song} />
            <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-400 transition-colors self-center flex-shrink-0">
                <XCircleIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

const PlaylistEditorView: React.FC = () => {
    const { currentUser, currentUserCollection, updatePlaylist } = useContext(UserContext)!;
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All');
    const [showShinyOnly, setShowShinyOnly] = useState(false);
    const [showPrestigeOnly, setShowPrestigeOnly] = useState(false);
    const collectionList = currentUserCollection || [];
    const hasJailbrokenSong = useMemo(() => collectionList.some(cs => cs?.song?.rarity === Rarity.Jailbroken), [collectionList]);

    const playlistSongIds = useMemo(() => currentUser?.playlistSongIds || [], [currentUser]);
    
    const { songsInPlaylist, availableSongs } = useMemo(() => {
        const songMap = new Map(collectionList.map(cs => [cs.id, cs]));
        const playlistSongs = playlistSongIds.map(id => songMap.get(id)).filter((s): s is CollectedSong => !!s);
        const playlistIdSet = new Set(playlistSongIds);
        const nonPlaylistSongs = collectionList.filter(cs => !playlistIdSet.has(cs.id));
        return { songsInPlaylist: playlistSongs, availableSongs: nonPlaylistSongs };
    }, [collectionList, playlistSongIds]);

    const filteredAvailableSongs = useMemo(() => {
        let songs = availableSongs;
        if (showPrestigeOnly) { songs = songs.filter(item => item?.isPrestige); }
        if (showShinyOnly) { songs = songs.filter(item => item?.song?.isShiny); }
        if (rarityFilter !== 'All') { songs = songs.filter(item => item?.song?.rarity === rarityFilter); }

        if (!searchQuery) return songs;
        const lowerQuery = searchQuery.toLowerCase();
        return songs.filter(cs => 
            (cs?.song?.title || '').toLowerCase().includes(lowerQuery) || 
            (cs?.song?.artist?.name || '').toLowerCase().includes(lowerQuery)
        );
    }, [availableSongs, searchQuery, rarityFilter, showShinyOnly, showPrestigeOnly]);

    const addSong = (songId: string) => {
        const newSongIds = [...playlistSongIds, songId];
        updatePlaylist(newSongIds);
    };

    const removeSong = (songId: string) => {
        const newSongIds = playlistSongIds.filter(id => id !== songId);
        updatePlaylist(newSongIds);
    };
    
    const draggedItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        draggedItem.current = index;
    };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragOverItem.current = index;
        setDraggedOverIndex(index);
    };
    const handleDragEnd = () => {
        if (draggedItem.current === null || dragOverItem.current === null || draggedItem.current === dragOverItem.current) {
            setDraggedOverIndex(null);
            return;
        };

        const newSongIds = [...playlistSongIds];
        const draggedSongId = newSongIds.splice(draggedItem.current, 1)[0];
        newSongIds.splice(dragOverItem.current, 0, draggedSongId);
        
        updatePlaylist(newSongIds);
        
        draggedItem.current = null;
        dragOverItem.current = null;
        setDraggedOverIndex(null);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-center">My Playlist</h2>
            <p className="text-gray-400 text-center mb-6">Curate a playlist of your most valuable songs for others to see on your profile. Drag songs in the playlist to reorder them.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="font-semibold mb-2">Your Collection</h3>
                    <SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={()=>{}} isLoading={false} placeholder="Search songs..." />
                    <div className="flex justify-center items-center gap-2 my-4 flex-wrap">
                        <RarityFilter activeFilter={rarityFilter} setFilter={setRarityFilter} hasJailbrokenSong={hasJailbrokenSong} />
                        <button 
                          onClick={() => setShowShinyOnly(prev => !prev)}
                          className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 ${showShinyOnly ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                          <SparklesIcon className="w-3 h-3" /> Shiny
                        </button>
                        <button 
                          onClick={() => setShowPrestigeOnly(prev => !prev)}
                          className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 ${showPrestigeOnly ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                          <DiamondIcon className="w-3 h-3" /> Prestige
                        </button>
                    </div>

                    <div className="mt-2 space-y-1 max-h-[22rem] overflow-y-auto pr-2">
                        {filteredAvailableSongs.slice(0, 100).map(song => (
                            <PlaylistSongSelectItem key={song.id} song={song} onAdd={() => addSong(song.id)} />
                        ))}
                        {filteredAvailableSongs.length > 100 && (
                            <p className="text-xs text-gray-500 text-center py-2">
                                Showing top 100 of {filteredAvailableSongs.length} songs. Use search to find specific tracks.
                            </p>
                        )}
                        {filteredAvailableSongs.length === 0 && (
                            <p className="text-center text-gray-500 p-6 text-sm">No available songs match your filters.</p>
                        )}
                    </div>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="font-semibold mb-2">Playlist Songs ({songsInPlaylist.length})</h3>
                    <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-2">
                        {songsInPlaylist.length > 0 ? songsInPlaylist.map((song, index) => (
                            <PlaylistDraggableItem
                                key={song.id}
                                song={song}
                                onRemove={() => removeSong(song.id)}
                                index={index}
                                onDragStart={handleDragStart}
                                onDragEnter={handleDragEnter}
                                onDragEnd={handleDragEnd}
                                draggedOverIndex={dragOverItem.current}
                            />
                        )) : <p className="text-center text-gray-500 p-8">Add songs from your collection to start building your playlist.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ApplyMasteryXpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { currentUser, applyMasteryXp } = useContext(UserContext)!;
    const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
    const [amount, setAmount] = useState<number>(1);
    const [amountStr, setAmountStr] = useState<string>("1");

    const totalXp = currentUser?.inventory?.masteryXp || 0;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAmountStr(val);
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0) {
            setAmount(Math.min(num, totalXp));
        } else if (val === '') {
            setAmount(0);
        }
    };

    const handleApply = async () => {
        if (!selectedArtistId || amount <= 0) return;
        try {
            await applyMasteryXp(selectedArtistId, amount);
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    const artistMasteryMap = currentUser?.artistMastery || {};
    const selectedArtistMastery = selectedArtistId ? artistMasteryMap[selectedArtistId] : null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-2xl bg-gray-800 rounded-lg p-6 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Apply Mastery XP</h3>
                <p className="text-gray-300 mb-4">You have <span className="font-bold text-indigo-400">{totalXp.toLocaleString()} XP</span> available. Select an artist and choose how much to apply.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Artist Selection */}
                    <div className="bg-gray-900/50 p-2 rounded-lg">
                        <p className="font-semibold text-sm mb-2 px-1">1. Select Artist</p>
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {Object.entries(artistMasteryMap)
                                .filter((entry): entry is [string, ArtistMastery] => !!entry[1] && typeof entry[1] === 'object')
                                .sort(([, a], [, b]) => (b?.xp || 0) - (a?.xp || 0))
                                .map(([artistId, mastery]) => (
                                <button 
                                    key={artistId}
                                    onClick={() => setSelectedArtistId(artistId)}
                                    className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors ${selectedArtistId === artistId ? 'bg-indigo-600/50 ring-2 ring-indigo-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                                >
                                    <img src={mastery.artistPictureUrl || '/default-artist.png'} alt={mastery.artistName} className="w-10 h-10 rounded-full object-cover"/>
                                    <div>
                                        <p className="font-semibold">{mastery.artistName}</p>
                                        <p className="text-xs text-gray-400">Lvl {mastery.level} | {(mastery.xp || 0).toLocaleString()} XP</p>
                                    </div>
                                </button>
                            ))}
                            {Object.keys(artistMasteryMap).length === 0 && (
                                <p className="text-center text-gray-500 p-4 text-xs">No artist masteries yet. Open packs to discover artists!</p>
                            )}
                        </div>
                    </div>
                    {/* Amount Selection */}
                    <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col justify-center">
                        <p className="font-semibold text-sm mb-2">2. Choose Amount</p>
                        {selectedArtistMastery ? (
                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="range"
                                        min="1"
                                        max={Math.max(1, totalXp)}
                                        value={amount}
                                        onChange={(e) => {
                                             const val = parseInt(e.target.value, 10);
                                             setAmount(val);
                                             setAmountStr(String(val));
                                         }}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <input
                                        type="number"
                                        value={amountStr}
                                        onChange={handleAmountChange}
                                        onBlur={() => setAmountStr(String(amount))}
                                        className="w-full mt-3 bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-center text-xl font-bold"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-400">{selectedArtistMastery.artistName}'s XP</p>
                                    <p className="text-lg font-semibold">{(selectedArtistMastery.xp || 0).toLocaleString()} <span className="text-green-400">+ {amount.toLocaleString()}</span> &rarr; {((selectedArtistMastery.xp || 0) + amount).toLocaleString()}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">Select an artist first.</div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleApply} disabled={!selectedArtistId || amount <= 0 || amount > totalXp} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:bg-gray-500">Apply {amount > 0 ? amount.toLocaleString() : ''} XP</button>
                </div>
            </div>
        </div>
    );
};


const BoostsView: React.FC = () => {
    const { currentUser, activateShinyCharm, applyShinyPolisher, currentUserCollection } = useContext(UserContext)!;
    const [isPolisherModalOpen, setIsPolisherModalOpen] = useState(false);
    const [isXpModalOpen, setIsXpModalOpen] = useState(false);

    const inventory = currentUser?.inventory || { shinyCharms: 0, shinyPolishers: 0, masteryXp: 0 };
    const isCharmActive = !!(currentUser?.shinyCharmUntil && currentUser.shinyCharmUntil > Date.now());

    const handleActivateCharm = () => {
        if (inventory.shinyCharms > 0 && !isCharmActive) {
            activateShinyCharm();
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto">
             <h2 className="text-3xl font-bold mb-6 text-center">Boosts & Items</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shiny Charm */}
                <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col items-center text-center">
                    <SparklesIcon className="w-16 h-16 text-cyan-400 mb-3" />
                    <h3 className="text-xl font-bold">Shiny Charm</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Triples your personal shiny chance for 24 hours. Stacks with Shiny Hunt!</p>
                    <p className="font-bold text-2xl mb-4">x{inventory.shinyCharms || 0}</p>
                    {isCharmActive ? (
                         <div className="px-4 py-2 rounded-full bg-green-500/20 text-green-300 font-semibold flex items-center gap-2">
                             <ClockIcon className="w-5 h-5" />
                             Active
                         </div>
                    ) : (
                        <button 
                            onClick={handleActivateCharm} 
                            disabled={(inventory.shinyCharms || 0) === 0 || isCharmActive}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Activate
                        </button>
                    )}
                </div>

                {/* Shiny Polisher */}
                <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col items-center text-center">
                    <SparklesIcon className="w-16 h-16 text-yellow-300 mb-3" />
                    <h3 className="text-xl font-bold">Shiny Polisher</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">A rare consumable that permanently turns one non-shiny song in your collection into a Shiny version.</p>
                    <p className="font-bold text-2xl mb-4">x{inventory.shinyPolishers || 0}</p>
                    <button 
                        onClick={() => setIsPolisherModalOpen(true)}
                        disabled={(inventory.shinyPolishers || 0) === 0}
                        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Use
                    </button>
                </div>

                {/* Mastery XP */}
                <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col items-center text-center md:col-span-2">
                    <RectangleStackIcon className="w-16 h-16 text-indigo-400 mb-3" />
                    <h3 className="text-xl font-bold">Mastery XP Pool</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">A pool of unassigned XP earned from events and rewards. Apply it to any artist to boost their mastery.</p>
                    <p className="font-bold text-4xl mb-4 text-indigo-300">{(inventory.masteryXp || 0).toLocaleString()} <span className="text-2xl">XP</span></p>
                    <button 
                        onClick={() => setIsXpModalOpen(true)}
                        disabled={(inventory.masteryXp || 0) === 0}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Use
                    </button>
                </div>
            </div>
            {isPolisherModalOpen && (
                <ShinyPolisherModal 
                    collection={currentUserCollection}
                    onUse={async (songId) => {
                        try {
                            await applyShinyPolisher(songId);
                            setIsPolisherModalOpen(false);
                        } catch (error) {
                            console.error("Failed to apply polisher:", error);
                        }
                    }}
                    onClose={() => setIsPolisherModalOpen(false)}
                />
            )}
            {isXpModalOpen && <ApplyMasteryXpModal onClose={() => setIsXpModalOpen(false)} />}
        </div>
    )
}

const ShinyPolisherModal: React.FC<{
    collection: CollectedSong[];
    onClose: () => void;
    onUse: (songId: string) => void;
}> = ({ collection, onClose, onUse }) => {
    const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const polishableSongs = useMemo(() => {
        return (collection || []).filter(cs => 
            cs && cs.song &&
            !cs.song.isShiny && 
            cs.song.rarity !== Rarity.Mythic &&
            cs.song.rarity !== Rarity.Jailbroken &&
            (
                searchQuery.trim() === '' ||
                (cs.song.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (cs.song.artist?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [collection, searchQuery]);
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-2xl bg-gray-800 rounded-lg p-6 flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Use Shiny Polisher</h3>
                <p className="text-gray-400 mb-2">Select a non-shiny, non-Mythic song from your collection to make it shiny forever.</p>
                <div className="mb-4">
                    <SearchBar 
                        query={searchQuery}
                        setQuery={setSearchQuery}
                        onSearch={() => {}}
                        isLoading={false}
                        placeholder="Search for a song to polish..."
                    />
                </div>
                <div className="flex-grow bg-gray-900/50 p-2 rounded-lg overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {polishableSongs.slice(0, 80).map(song => (
                             <div 
                                key={song.id} 
                                onClick={() => setSelectedSongId(song.id)} 
                                className={`w-full p-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-3 border ${selectedSongId === song.id ? 'bg-indigo-900/40 border-yellow-400 ring-2 ring-yellow-400/50' : 'bg-gray-800/80 border-gray-700 hover:bg-gray-700/80'}`}
                             >
                                <img 
                                    src={!isPlaceholderCover(song.song.albumArtUrl) ? song.song.albumArtUrl : DEFAULT_ALBUM_COVER} 
                                    alt={song.song.album.title} 
                                    onError={handleImageError}
                                    className="w-12 h-12 rounded object-cover flex-shrink-0" 
                                />
                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold text-white truncate text-sm">{song.song.title}</p>
                                    <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                                    <span className="text-xs font-semibold text-cyan-400">{song.song.rarity}</span>
                                </div>
                                {selectedSongId === song.id && (
                                    <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full flex-shrink-0">Selected</span>
                                )}
                            </div>
                        ))}
                        {polishableSongs.length > 80 && (
                            <div className="col-span-full py-2 text-center text-xs text-gray-500">
                                Showing 80 of {polishableSongs.length} songs. Use search to find other songs.
                            </div>
                        )}
                        {polishableSongs.length === 0 && (
                            <div className="col-span-full py-8 text-center text-gray-400 text-sm">
                                No eligible songs to polish.
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={() => selectedSongId && onUse(selectedSongId)} disabled={!selectedSongId} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Apply Polish
                    </button>
                </div>
            </div>
        </div>
    )
};