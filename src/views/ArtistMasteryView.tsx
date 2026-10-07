
import React, { useMemo, useState, useContext, useEffect } from 'react';
import type { User, ArtistMastery, Artist } from '../types';
import { MASTERY_LEVELS, UserContext } from '../contexts/UserContext';
import { CrownIcon } from '../components/icons';
import { ArtistDetailModal } from '../components/ArtistDetailModal';

const MasteryProgressBar: React.FC<{ mastery: ArtistMastery, onClick: () => void }> = ({ mastery, onClick }) => {
    const { progressPercent, xpNeededText, levelName } = useMemo(() => {
        const currentLevelIndex = mastery.level; // e.g., level 1 is index 1

        if (currentLevelIndex >= MASTERY_LEVELS.length) {
            // Max level reached
            const maxLevel = MASTERY_LEVELS[MASTERY_LEVELS.length - 1];
            return { progressPercent: 100, xpNeededText: 'MAX', levelName: maxLevel.name };
        }

        const startXP = currentLevelIndex === 0 ? 0 : MASTERY_LEVELS[currentLevelIndex - 1].xpThreshold;
        const endXP = MASTERY_LEVELS[currentLevelIndex].xpThreshold;
        const levelName = currentLevelIndex === 0 ? 'Beginner' : MASTERY_LEVELS[currentLevelIndex - 1].name;
        
        const xpInLevel = mastery.xp - startXP;
        const xpForLevel = endXP - startXP;
        
        const percentage = xpForLevel > 0 ? Math.max(0, Math.min((xpInLevel / xpForLevel) * 100, 100)) : 0;
        
        return { 
            progressPercent: percentage, 
            xpNeededText: String(endXP),
            levelName: levelName
        };
    }, [mastery]);

    return (
        <button onClick={onClick} className="w-full text-left bg-gray-800 p-4 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-4">
                {mastery.artistPictureUrl ? (
                    <img src={mastery.artistPictureUrl} alt={mastery.artistName} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white flex-shrink-0 text-xl">
                        {mastery.artistName.charAt(0)}
                    </div>
                )}
                <div className="flex-grow">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-lg">{mastery.artistName}</h4>
                         <span className="text-sm font-semibold text-indigo-400">Level {mastery.level} - {levelName}</span>
                    </div>
                    <div className="relative w-full bg-gray-700 rounded-full h-4 mt-2">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                            {mastery.xp} / {xpNeededText} XP ({Math.floor(progressPercent)}%)
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

export const ArtistMasteryView: React.FC = () => {
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayLimit, setDisplayLimit] = useState(10);
    const [selectedArtistMastery, setSelectedArtistMastery] = useState<(ArtistMastery & { artistId: string }) | null>(null);
    const [isAutoSyncing, setIsAutoSyncing] = useState(false);
    const { currentUser, currentUserCollection, recalculateCollectionMastery } = useContext(UserContext)!;

    // Reset pagination when search query or filter changes
    useEffect(() => {
        setDisplayLimit(10);
    }, [searchQuery, showFavoritesOnly]);

    const sortedMastery = useMemo(() => {
        if (!currentUser || !currentUser.artistMastery) return [];
        
        const favoriteArtistsMap: Map<string, Artist> = new Map((currentUser.favoriteArtists || []).map(a => [a.id, a]));
        
        // Deduplicate entries by artistName to avoid double showing
        const seenArtists = new Set<string>();
        const masteryEntries: Array<[string, ArtistMastery]> = [];

        Object.entries(currentUser.artistMastery).forEach(([artistId, masteryData]) => {
            if (!masteryData || typeof masteryData !== 'object' || !masteryData.artistName) return;
            const normName = masteryData.artistName.trim().toLowerCase();
            if (!seenArtists.has(normName)) {
                seenArtists.add(normName);
                masteryEntries.push([artistId, masteryData]);
            }
        });

        let filteredEntries = masteryEntries;

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filteredEntries = filteredEntries.filter(([, data]) => 
                data.artistName.toLowerCase().includes(q)
            );
        }

        // Filter by favorites
        if (showFavoritesOnly) {
            filteredEntries = filteredEntries.filter(([artistId, masteryData]) => {
                const favoriteArtist = favoriteArtistsMap.get(artistId);
                const normFavNames = new Set((currentUser.favoriteArtists || []).map(a => a.name.trim().toLowerCase()));
                return !!favoriteArtist || normFavNames.has(masteryData.artistName.trim().toLowerCase());
            });
        }

        return filteredEntries
            .map(([artistId, masteryData]) => {
                const favoriteArtist = favoriteArtistsMap.get(artistId);
                return {
                    ...masteryData,
                    artistPictureUrl: masteryData.artistPictureUrl || favoriteArtist?.pictureUrl,
                    artistId
                };
            })
            .sort((a, b) => {
                if (b.level !== a.level) {
                    return b.level - a.level;
                }
                return b.xp - a.xp;
            });

    }, [currentUser, showFavoritesOnly, searchQuery]);

    const visibleMastery = useMemo(() => {
        return sortedMastery.slice(0, displayLimit);
    }, [sortedMastery, displayLimit]);

    const handleManualSync = async () => {
        setIsAutoSyncing(true);
        try {
            await recalculateCollectionMastery();
        } finally {
            setIsAutoSyncing(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-6">
                <CrownIcon className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold">Artist Mastery</h3>
                <p className="text-gray-400 mb-3">Level up your favorite artists by collecting their songs.</p>
                <button
                    onClick={handleManualSync}
                    disabled={isAutoSyncing}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                    <span className={isAutoSyncing ? "animate-spin" : ""}>🔄</span>
                    {isAutoSyncing ? "Scanning Collection..." : `Sync Collection Mastery (${currentUserCollection.length} cards)`}
                </button>
            </div>

            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-4 relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search artist mastery..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                />
                <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded-full"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex items-center justify-center gap-2 mb-6 p-1 bg-gray-700 rounded-full text-white w-max mx-auto">
                <button 
                    onClick={() => setShowFavoritesOnly(false)} 
                    className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold ${!showFavoritesOnly ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                >
                    All Artists ({sortedMastery.length})
                </button>
                <button 
                    onClick={() => setShowFavoritesOnly(true)} 
                    className={`px-4 py-1.5 rounded-full transition-colors text-sm font-semibold ${showFavoritesOnly ? 'bg-indigo-500' : 'text-gray-300 hover:bg-gray-600/50'}`}
                >
                    Favorites Only
                </button>
            </div>

            {sortedMastery.length > 0 ? (
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="space-y-3">
                        {visibleMastery.map(mastery => (
                            <MasteryProgressBar 
                                key={mastery.artistId || mastery.artistName} 
                                mastery={mastery} 
                                onClick={() => setSelectedArtistMastery(mastery)}
                            />
                        ))}
                    </div>

                    {sortedMastery.length > visibleMastery.length && (
                        <div className="text-center pt-4 pb-2">
                            <button
                                onClick={() => setDisplayLimit(prev => prev + 10)}
                                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-indigo-400 font-bold rounded-2xl text-sm border border-gray-700/80 shadow-lg transition-all hover:scale-105 active:scale-95"
                            >
                                ➕ Load 10 More Artists (Showing {visibleMastery.length} of {sortedMastery.length})
                            </button>
                        </div>
                    )}
                </div>
            ) : isAutoSyncing ? (
                <div className="text-center text-gray-300 py-16 bg-gray-800/60 rounded-2xl border border-indigo-500/30 max-w-xl mx-auto p-8 shadow-xl">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-bold text-white">Syncing Artist Mastery...</p>
                    <p className="text-sm text-gray-400 mt-1">Calculating XP for all {currentUserCollection.length} cards in your collection.</p>
                </div>
            ) : (
                <div className="text-center text-gray-400 py-16 bg-gray-800/40 rounded-2xl border border-gray-700/50 max-w-xl mx-auto p-8">
                    <p className="text-lg font-bold text-white mb-2">
                        {searchQuery ? `No artists found matching "${searchQuery}"` : "No Artist Mastery calculated yet"}
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        {searchQuery 
                            ? "Try searching for a different artist name."
                            : currentUserCollection.length > 0 
                                ? `You have ${currentUserCollection.length} songs in your collection ready to calculate.`
                                : "Open packs to collect songs and earn Artist Mastery!"}
                    </p>
                    {searchQuery ? (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold"
                        >
                            Clear Search
                        </button>
                    ) : currentUserCollection.length > 0 && (
                        <button
                            onClick={handleManualSync}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all"
                        >
                            ⚡ Calculate Mastery Now ({currentUserCollection.length} Songs)
                        </button>
                    )}
                </div>
            )}

            {selectedArtistMastery && (
                <ArtistDetailModal 
                    mastery={selectedArtistMastery}
                    user={currentUser!}
                    onClose={() => setSelectedArtistMastery(null)}
                />
            )}
        </div>
    );
};
