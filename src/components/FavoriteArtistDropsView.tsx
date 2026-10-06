import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import { StarIcon, SparklesIcon, DiamondIcon, ArrowsRightLeftIcon } from './icons';
import { SongPreviewModal } from './SongPreviewModal';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';
import { Rarity, CollectedSong, Artist, User } from '../types';

interface FavoriteMythicDrop {
    id: string;
    songTitle: string;
    artistName: string;
    artistId: string;
    albumTitle: string;
    albumArtUrl: string;
    rarity: Rarity;
    isShiny?: boolean;
    serialNumber?: string;
    ownerId: string;
    ownerName: string;
    ownerPfpUrl: string;
    pulledAt: number;
    packType: string;
}

const POPULAR_ARTISTS_TO_FAVORITE: { id: string; name: string }[] = [
    { id: '1504938', name: 'Sabrina Carpenter' },
    { id: '14316239', name: 'Ken Carson' },
    { id: '15647571', name: 'PinkPantheress' },
    { id: '900', name: 'Nirvana' },
    { id: '1097234', name: 'Chappell Roan' },
    { id: '1138407', name: 'Playboi Carti' },
    { id: '1097', name: 'Deftones' },
    { id: '141094', name: 'Gotye' },
    { id: '466828', name: 'Childish Gambino' },
];

export const FavoriteArtistDropsView: React.FC = () => {
    const userContext = useContext(UserContext);
    const { currentUser, setFavoriteArtists, setViewingUser, users, globalActivityFeed } = userContext || {};
    const [selectedCard, setSelectedCard] = useState<CollectedSong | null>(null);

    const favoriteArtists = currentUser?.favoriteArtists || [];
    const favoriteNamesSet = useMemo(() => {
        return new Set(favoriteArtists.map(a => a.name.toLowerCase()));
    }, [favoriteArtists]);

    // Show only real pulls matching favorite artists
    const liveFavoriteDrops = useMemo(() => {
        const liveList: FavoriteMythicDrop[] = [];
        (globalActivityFeed || []).forEach(act => {
            if ((act.type === 'PULL_MYTHIC' || act.type === 'PULL_JAILBROKEN') && act.song) {
                if (act.id.startsWith('seed_')) return;
                if (act.userId.startsWith('user_') && act.userId !== currentUser?.id) return;
                const lowerTitle = (act.song.title || '').toLowerCase();
                if (lowerTitle.includes('magnolia')) return;
                if (lowerTitle.includes('espresso') && act.userId !== currentUser?.id) return;

                const artistName = (act.song.artistName || '').toLowerCase();
                const isFav = favoriteNamesSet.has(artistName) || 
                              Array.from(favoriteNamesSet).some(fn => artistName.includes(fn) || fn.includes(artistName));
                if (isFav) {
                    liveList.push({
                        id: `act_${act.id}`,
                        songTitle: act.song.title,
                        artistName: act.song.artistName || 'Artist',
                        artistId: act.song.artistId || 'fav_artist',
                        albumTitle: act.song.title,
                        albumArtUrl: act.song.albumArtUrl,
                        rarity: act.song.rarity,
                        isShiny: act.song.isShiny,
                        ownerId: act.userId,
                        ownerName: act.userName,
                        ownerPfpUrl: act.userPfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${act.userName}`,
                        pulledAt: act.timestamp || Date.now(),
                        packType: 'Live Pack Opening',
                    });
                }
            }
        });

        return liveList.sort((a, b) => b.pulledAt - a.pulledAt);
    }, [globalActivityFeed, favoriteNamesSet, currentUser?.id]);

    const handleAddFavorite = (artist: { id: string; name: string }) => {
        if (!currentUser || !setFavoriteArtists) return;
        if (!favoriteArtists.some(f => f.name.toLowerCase() === artist.name.toLowerCase())) {
            const newFav: Artist = {
                id: artist.id,
                name: artist.name,
            };
            setFavoriteArtists([...favoriteArtists, newFav]);
        }
    };

    const handleInspectCard = (drop: FavoriteMythicDrop) => {
        const dummyCollectedSong: CollectedSong = {
            id: `inspect_${drop.id}`,
            song: {
                id: drop.id,
                title: drop.songTitle,
                artist: { id: drop.artistId, name: drop.artistName },
                album: { id: `alb_${drop.id}`, title: drop.albumTitle },
                albumArtUrl: drop.albumArtUrl,
                previewUrl: '',
                rarity: drop.rarity,
                isShiny: drop.isShiny || false,
            },
            ownerId: drop.ownerId,
            collectedAt: drop.pulledAt,
            isPrestige: false,
        };
        setSelectedCard(dummyCollectedSong);
    };

    const handleViewOwner = (ownerId: string, ownerName: string) => {
        if (!setViewingUser) return;
        const found = users?.find(u => u.id === ownerId || u.name.toLowerCase() === ownerName.toLowerCase());
        if (found) {
            setViewingUser(found);
        }
    };

    const formatTimeAgo = (timestamp: number) => {
        const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
        if (diff < 60) return `${diff}s ago`;
        const mins = Math.floor(diff / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ago`;
    };

    return (
        <div className="space-y-6 text-left">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/90 to-gray-900 border border-purple-500/50 rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 mb-2">
                            <StarIcon className="w-4 h-4 text-yellow-300" />
                            FAVORITE ARTIST GRAIL TRACKER
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                            Favorite Artist Mythic & Jailbroken Pulls
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl">
                            Track instantly which collectors pulled Mythics & Jailbrokens from your favorite artists. Offer trades or inspect cards without searching far!
                        </p>
                    </div>

                    <div className="text-left sm:text-right">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Tracking</span>
                        <span className="text-base sm:text-lg font-black text-yellow-300">
                            {favoriteArtists.length} Favorite Artists
                        </span>
                    </div>
                </div>

                {/* Quick Add Favorite Artists Selector */}
                <div className="mt-4 pt-3 border-t border-purple-900/60">
                    <span className="text-[11px] font-bold text-gray-400 block mb-2">
                        ⭐ Quick-Track Popular Artists:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                        {POPULAR_ARTISTS_TO_FAVORITE.map(art => {
                            const isFav = favoriteNamesSet.has(art.name.toLowerCase());
                            return (
                                <button
                                    key={art.id}
                                    onClick={() => handleAddFavorite(art)}
                                    disabled={isFav}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                        isFav
                                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 cursor-default'
                                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 active:scale-95'
                                    }`}
                                >
                                    <span>{isFav ? '✓' : '+'}</span>
                                    <span>{art.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Drops Live List */}
            <div className="space-y-3">
                {liveFavoriteDrops.map((drop) => {
                    const isJailbroken = drop.rarity === Rarity.Jailbroken;
                    return (
                        <div
                            key={drop.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${
                                isJailbroken
                                    ? 'bg-gradient-to-r from-red-950/70 via-black to-slate-950 border-red-500/80 shadow-red-900/20'
                                    : 'bg-gradient-to-r from-purple-950/50 via-gray-900 to-indigo-950/40 border-purple-500/50 shadow-purple-900/10'
                            }`}
                        >
                            {/* Card Details */}
                            <div className="flex items-center gap-4">
                                <div className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 shadow-md ${
                                    isJailbroken ? 'border-red-500 jailbroken-glow' : 'border-purple-400 mythic-glow'
                                }`}>
                                    <img
                                        src={drop.albumArtUrl || DEFAULT_ALBUM_COVER}
                                        alt={drop.songTitle}
                                        onError={handleImageError}
                                        className="w-full h-full object-cover"
                                    />
                                    {drop.isShiny && (
                                        <div className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-cyan-300 text-[10px]">
                                            ✨
                                        </div>
                                    )}
                                </div>

                                <div className="truncate">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                            isJailbroken 
                                                ? 'bg-red-950 text-red-300 border-red-500/80 animate-pulse' 
                                                : 'bg-purple-950 text-purple-300 border-purple-500/60'
                                        }`}>
                                            {isJailbroken ? '🚨 1-OF-1 JAILBROKEN' : `🌟 MYTHIC ${drop.serialNumber || ''}`}
                                        </span>
                                        <span className="text-[10px] text-yellow-300 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                                            ⭐ Favorite Artist
                                        </span>
                                    </div>

                                    <h4 className="text-base font-black text-white mt-1 truncate">
                                        {drop.songTitle}
                                    </h4>
                                    <p className="text-xs text-gray-300 font-semibold truncate">
                                        {drop.artistName} <span className="text-gray-500 font-normal">• {drop.albumTitle}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Owner Info & Actions */}
                            <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-gray-800">
                                <button
                                    onClick={() => handleViewOwner(drop.ownerId, drop.ownerName)}
                                    className="flex items-center gap-2.5 text-left group hover:opacity-90 transition-opacity"
                                >
                                    <img
                                        src={drop.ownerPfpUrl}
                                        alt={drop.ownerName}
                                        className="w-9 h-9 rounded-full object-cover border border-gray-600"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                            {drop.ownerName}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {formatTimeAgo(drop.pulledAt)}
                                        </div>
                                    </div>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleInspectCard(drop)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors flex items-center gap-1 shadow"
                                    >
                                        <span>🔍</span>
                                        <span className="hidden sm:inline">Inspect</span>
                                    </button>
                                    <button
                                        onClick={() => handleViewOwner(drop.ownerId, drop.ownerName)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-md active:scale-95 flex items-center gap-1"
                                    >
                                        <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                                        <span>Trade</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedCard && (
                <SongPreviewModal
                    collectedSong={selectedCard}
                    onClose={() => setSelectedCard(null)}
                    showTradeButton={true}
                />
            )}
        </div>
    );
};
