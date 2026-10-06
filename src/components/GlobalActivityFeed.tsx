import React, { useContext, useState, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { GlobalActivity, CollectedSong } from '../types';
import { Rarity } from '../types';
import { DiamondIcon, SparklesIcon, ArrowsRightLeftIcon } from './icons';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';
import { SongPreviewModal } from './SongPreviewModal';

interface EnhancedDropItem {
    id: string;
    userId: string;
    userName: string;
    userPfpUrl?: string;
    songTitle: string;
    artistName: string;
    artistId?: string;
    albumArtUrl: string;
    albumTitle?: string;
    rarity: Rarity;
    isShiny?: boolean;
    timestamp: number;
    source: string;
}

export const GlobalActivityFeed: React.FC = () => {
    const { globalActivityFeed, setViewingUser, users, currentUser } = useContext(UserContext)!;
    const [selectedCard, setSelectedCard] = useState<CollectedSong | null>(null);

    // Strictly filter to Mythic and Jailbroken pulls by REAL users only
    const filteredDrops = useMemo(() => {
        const liveItems: EnhancedDropItem[] = [];

        (globalActivityFeed || []).forEach(act => {
            if ((act.type === 'PULL_MYTHIC' || act.type === 'PULL_JAILBROKEN') && act.song) {
                // Filter out any bot accounts, seed data, and unwanted items
                if (act.id.startsWith('seed_')) return;
                if (act.userId.startsWith('user_') && act.userId !== currentUser?.id) return;

                const lowerTitle = (act.song.title || '').toLowerCase();
                // User explicit requirement: "get rid of magnolia mythic also pulled by a fake person"
                if (lowerTitle.includes('magnolia')) return;
                // User explicit requirement: "get rid of the espresso mythic pulled by the other user w my same name"
                if (lowerTitle.includes('espresso') && act.userId !== currentUser?.id) return;

                const isJb = act.type === 'PULL_JAILBROKEN' || act.song.rarity === Rarity.Jailbroken;
                liveItems.push({
                    id: act.id,
                    userId: act.userId,
                    userName: act.userName,
                    userPfpUrl: act.userPfpUrl,
                    songTitle: act.song.title,
                    artistName: act.song.artistName || 'Artist',
                    artistId: act.song.artistId,
                    albumArtUrl: act.song.albumArtUrl || DEFAULT_ALBUM_COVER,
                    albumTitle: act.song.title,
                    rarity: isJb ? Rarity.Jailbroken : Rarity.Mythic,
                    isShiny: act.song.isShiny,
                    timestamp: act.timestamp || Date.now(),
                    source: isJb ? 'Secret Black Market' : 'Mythic Pack Opening',
                });
            }
        });

        // Deduplicate by ID and sort descending by timestamp
        const map = new Map<string, EnhancedDropItem>();
        liveItems.forEach(item => map.set(item.id, item));
        return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    }, [globalActivityFeed, currentUser?.id]);

    const handleUserClick = (userId: string, userName: string) => {
        const found = users?.find(u => u.id === userId || u.name.toLowerCase() === userName.toLowerCase());
        if (found && setViewingUser) {
            setViewingUser(found);
        }
    };

    const handleInspect = (drop: EnhancedDropItem) => {
        const dummySong: CollectedSong = {
            id: `inspect_${drop.id}`,
            song: {
                id: drop.id,
                title: drop.songTitle,
                artist: { id: drop.artistId || 'art', name: drop.artistName },
                album: { id: `alb_${drop.id}`, title: drop.albumTitle || drop.songTitle },
                albumArtUrl: drop.albumArtUrl,
                previewUrl: '',
                rarity: drop.rarity,
                isShiny: drop.isShiny || false,
            },
            ownerId: drop.userId,
            collectedAt: drop.timestamp,
            isPrestige: false,
        };
        setSelectedCard(dummySong);
    };

    const formatTimeAgo = (timestamp: number) => {
        const diff = Math.floor((Date.now() - timestamp) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="space-y-4">
            {/* Feed Header Notice */}
            <div className="flex items-center justify-between p-3.5 bg-gray-900/80 border border-gray-800 rounded-2xl">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-200">
                        ⚡ Real Players Live Mythic & Jailbroken Pulls
                    </span>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700">
                    {filteredDrops.length} Live Drops
                </span>
            </div>

            {filteredDrops.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-gray-800 p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-3xl">
                        👑
                    </div>
                    <h4 className="text-lg font-black text-white mb-1">No Mythic Pulls Yet</h4>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">
                        No Mythic or Jailbroken cards have been pulled by real collectors yet. Crack open a pack or breach the Black Market to be the first!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredDrops.map((drop) => {
                        const isJailbroken = drop.rarity === Rarity.Jailbroken;
                        const isMythic = drop.rarity === Rarity.Mythic;

                        return (
                            <div 
                                key={drop.id}
                                className={`relative group p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between overflow-hidden ${
                                    isJailbroken 
                                        ? 'bg-gradient-to-br from-red-950/60 via-slate-950 to-black border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.25)]' 
                                        : 'bg-gradient-to-br from-yellow-950/40 via-gray-950 to-slate-900 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                                }`}
                            >
                                {/* Background glow accent */}
                                <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 ${
                                    isJailbroken ? 'bg-red-500' : 'bg-yellow-400'
                                }`} />

                                <div>
                                    {/* Top User Line */}
                                    <div className="flex items-center justify-between mb-3">
                                        <button 
                                            onClick={() => handleUserClick(drop.userId, drop.userName)}
                                            className="flex items-center gap-2 group-hover:opacity-90 text-left transition-opacity"
                                        >
                                            <img 
                                                src={drop.userPfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${drop.userName}`} 
                                                alt={drop.userName}
                                                className="w-7 h-7 rounded-full object-cover border border-gray-700 shadow-sm"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${drop.userName}`;
                                                }}
                                            />
                                            <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors truncate max-w-[120px]">
                                                {drop.userName}
                                            </span>
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                            {isJailbroken ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600/30 text-red-300 border border-red-500/60 font-mono shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                                                    ⚡ 1-OF-1 GRAIL
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 font-mono">
                                                    MYTHIC
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                {formatTimeAgo(drop.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle Song Info */}
                                    <div className="flex items-center gap-3.5 mb-3">
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800 shadow-md">
                                            <img 
                                                src={drop.albumArtUrl} 
                                                alt={drop.songTitle}
                                                onError={handleImageError}
                                                className="w-full h-full object-cover"
                                            />
                                            {drop.isShiny && (
                                                <div className="absolute top-1 right-1">
                                                    <SparklesIcon className="w-3.5 h-3.5 text-cyan-400 drop-shadow" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 text-left">
                                            <h4 className="font-black text-sm text-white truncate">
                                                {drop.songTitle}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-semibold truncate">
                                                {drop.artistName}
                                            </p>
                                            <span className="inline-block mt-1 text-[10px] font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded border border-gray-800">
                                                {drop.source}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Inspect Button */}
                                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 font-medium italic">
                                        Verified Pull
                                    </span>
                                    <button
                                        onClick={() => handleInspect(drop)}
                                        className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors border border-gray-700 flex items-center gap-1 shadow-sm"
                                    >
                                        <span>🔍 Inspect Card</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Song Preview Modal */}
            {selectedCard && (
                <SongPreviewModal 
                    collectedSong={selectedCard}
                    onClose={() => setSelectedCard(null)}
                    showTradeButton={false}
                />
            )}
        </div>
    );
};
