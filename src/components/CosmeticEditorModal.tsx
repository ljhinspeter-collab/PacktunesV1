import React, { useState, useMemo, useContext, useEffect } from 'react';
import type { User, ArtistMastery, Album, Title } from '../types';
import { UserContext } from '../contexts/UserContext';
import { challenges } from '../services/challengeService';
import { ArtistBadgeIcon } from './ArtistBadgeIcon';
import { getArtistAlbums } from '../services/musicService';
import { CheckCircleIcon } from './icons';

const MAX_ARTIST_BADGES = 3;

const TitleEditor: React.FC<{
    earnedTitles: Title[];
    activeTitleId: string | null;
    onSelect: (titleId: string | null) => void;
}> = ({ earnedTitles, activeTitleId, onSelect }) => {
    if (!earnedTitles || earnedTitles.length === 0) {
        return <div className="text-center text-gray-400 p-8">Win a Label War to earn exclusive titles!</div>;
    }

    return (
        <div>
            <p className="text-sm text-gray-400 mb-4">Select a title to display on your profile. These are earned by achieving 1st place in Label Wars.</p>
            <div className="space-y-3">
                <button
                    onClick={() => onSelect(null)}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${!activeTitleId ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                    <p className="font-semibold">No Title</p>
                </button>
                {earnedTitles.map(title => (
                    <button
                        key={title.id}
                        onClick={() => onSelect(title.id)}
                        className={`w-full p-3 text-left rounded-lg transition-colors ${activeTitleId === title.id ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <p className="font-semibold">{title.name}</p>
                        <p className="text-xs text-gray-400">{title.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export const CosmeticEditorModal: React.FC<{ user: User; onClose: () => void; }> = ({ user, onClose }) => {
    const { updateCurrentUser, recalculateCollectionMastery, currentUserCollection } = useContext(UserContext)!;
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncingMastery, setIsSyncingMastery] = useState(false);
    const [activeTab, setActiveTab] = useState<'badges' | 'frames' | 'titles' | 'themes'>('badges');

    // State for Profile Themes
    const [selectedTheme, setSelectedTheme] = useState<string>(user.profileTheme || 'default');

    // State for Artist Badges
    const [selectedBadgeIds, setSelectedBadgeIds] = useState<Set<string>>(new Set(user.displayedArtistBadges || []));

    // State for Profile Frames
    const [selectedArtistForFrames, setSelectedArtistForFrames] = useState<string | null>(null);
    const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
    const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
    const [selectedFrame, setSelectedFrame] = useState(user.activeProfileFrame);
    
    // State for Titles
    const [selectedTitleId, setSelectedTitleId] = useState(user.activeTitleId || null);

    const allArtistMastery = useMemo(() => {
        const seen = new Set<string>();
        const list: Array<ArtistMastery & { artistId: string }> = [];
        Object.entries(user.artistMastery || {}).forEach(([artistId, mastery]) => {
            if (!mastery || typeof mastery !== 'object' || !mastery.artistName) return;
            const normName = mastery.artistName.trim().toLowerCase();
            if (!seen.has(normName)) {
                seen.add(normName);
                list.push({ ...mastery, artistId });
            }
        });
        return list.sort((a, b) => b.xp - a.xp);
    }, [user.artistMastery]);

    const availableArtistBadges = useMemo(() => {
        return allArtistMastery.filter(m => m.level >= 1 || m.xp >= 1000);
    }, [allArtistMastery]);

    const frameArtists = useMemo(() => {
        return allArtistMastery.filter(m => m.level >= 2 || m.xp >= 2500);
    }, [allArtistMastery]);

    const handleSyncMastery = async () => {
        setIsSyncingMastery(true);
        try {
            await recalculateCollectionMastery();
        } finally {
            setIsSyncingMastery(false);
        }
    };

    const handleBadgeSelect = (artistId: string) => {
        setSelectedBadgeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(artistId)) {
                newSet.delete(artistId);
            } else if (newSet.size < MAX_ARTIST_BADGES) {
                newSet.add(artistId);
            }
            return newSet;
        });
    };
    
    const handleArtistSelectForFrames = async (artistId: string) => {
        setSelectedArtistForFrames(artistId);
        setIsLoadingAlbums(true);
        const albums = await getArtistAlbums(artistId);
        setArtistAlbums(albums);
        setIsLoadingAlbums(false);
    };

    const handleFrameSelect = (album: Album, artistId: string) => {
        setSelectedFrame({ artistId, albumArtUrl: album.coverUrl });
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateCurrentUser({
                displayedArtistBadges: Array.from(selectedBadgeIds),
                activeProfileFrame: selectedFrame || null,
                activeTitleId: selectedTitleId,
                profileTheme: selectedTheme,
            });
            onClose();
        } catch (error) {
            console.error("Failed to save cosmetic changes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-3xl bg-gray-800 rounded-lg p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Customize Profile</h3>
                
                <div className="flex justify-center border-b border-gray-700 mb-4 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('badges')} className={`px-4 sm:px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'badges' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Artist Badges</button>
                    <button onClick={() => setActiveTab('frames')} className={`px-4 sm:px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'frames' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Profile Frames</button>
                    <button onClick={() => setActiveTab('titles')} className={`px-4 sm:px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'titles' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>Titles</button>
                    <button onClick={() => setActiveTab('themes')} className={`px-4 sm:px-6 py-3 font-semibold text-sm transition-colors flex items-center gap-1 ${activeTab === 'themes' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <span>✨ Themes</span>
                    </button>
                </div>

                <div className="flex-grow min-h-0 overflow-y-auto">
                    {activeTab === 'badges' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-gray-400">Select up to {MAX_ARTIST_BADGES} "Artist Follower" badges to display on your profile. Unlocked at Level 1 (1,000 XP).</p>
                                <button
                                    onClick={handleSyncMastery}
                                    disabled={isSyncingMastery}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0 ml-2"
                                >
                                    <span className={isSyncingMastery ? "animate-spin" : ""}>🔄</span>
                                    {isSyncingMastery ? "Syncing..." : "Sync Mastery"}
                                </button>
                            </div>

                            {availableArtistBadges.length > 0 ? (
                                 <div className="flex flex-wrap gap-4 justify-center">
                                    {availableArtistBadges.map(artist => (
                                        <div key={artist.artistId} className="relative">
                                            <ArtistBadgeIcon 
                                                artist={artist}
                                                size="md"
                                                onClick={() => handleBadgeSelect(artist.artistId)}
                                                className="cursor-pointer"
                                            />
                                            {selectedBadgeIds.has(artist.artistId) && (
                                                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 pointer-events-none">
                                                    <CheckCircleIcon className="w-5 h-5 text-white"/>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-900/50 p-6 rounded-xl text-center space-y-3">
                                    <p className="font-bold text-white text-base">No Artist Badges Unlocked Yet</p>
                                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                                        Reach Level 1 (1,000 XP) with any artist by collecting their songs to unlock their badge!
                                    </p>
                                    {allArtistMastery.length > 0 ? (
                                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto text-left max-w-md mx-auto">
                                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Closest to Unlocking:</p>
                                            {allArtistMastery.slice(0, 5).map(m => (
                                                <div key={m.artistId} className="bg-gray-800 p-2.5 rounded-lg flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {m.artistPictureUrl && <img src={m.artistPictureUrl} alt={m.artistName} className="w-6 h-6 rounded-full object-cover"/>}
                                                        <span className="font-semibold text-white">{m.artistName}</span>
                                                    </div>
                                                    <span className="text-indigo-300 font-bold">{m.xp} / 1,000 XP</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleSyncMastery}
                                            disabled={isSyncingMastery}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                                        >
                                            ⚡ Calculate Mastery from {currentUserCollection.length} Songs
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'frames' && (
                         <div>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-gray-400">Select a spinning vinyl frame for your profile picture. Unlocked at Level 2 (2,500 XP).</p>
                                <button
                                    onClick={handleSyncMastery}
                                    disabled={isSyncingMastery}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0 ml-2"
                                >
                                    <span className={isSyncingMastery ? "animate-spin" : ""}>🔄</span>
                                    {isSyncingMastery ? "Syncing..." : "Sync Mastery"}
                                </button>
                            </div>

                            {frameArtists.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-900/50 p-3 rounded-lg">
                                        <h4 className="font-semibold mb-2">1. Select an Artist</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                            {frameArtists.map(artist => (
                                                <button key={artist.artistId} onClick={() => handleArtistSelectForFrames(artist.artistId)} className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${selectedArtistForFrames === artist.artistId ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                                    <img src={artist.artistPictureUrl} alt={artist.artistName} className="w-8 h-8 rounded-full object-cover"/>
                                                    <span className="font-semibold text-sm">{artist.artistName}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                     <div className="bg-gray-900/50 p-3 rounded-lg">
                                        <h4 className="font-semibold mb-2">2. Select an Album</h4>
                                        {isLoadingAlbums ? <p>Loading albums...</p> : (
                                            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                                                {artistAlbums.map(album => (
                                                    <button key={album.id} onClick={() => handleFrameSelect(album, selectedArtistForFrames!)} className="relative aspect-square group">
                                                        <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover rounded-md"/>
                                                        {selectedFrame?.albumArtUrl === album.coverUrl && (
                                                            <div className="absolute inset-0 bg-green-500/70 flex items-center justify-center rounded-md">
                                                                <CheckCircleIcon className="w-8 h-8 text-white"/>
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {selectedFrame && <button onClick={() => setSelectedFrame(null)} className="w-full mt-2 py-1.5 bg-red-600/80 hover:bg-red-700 text-white font-semibold rounded-lg text-xs">Remove Frame</button>}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-900/50 p-6 rounded-xl text-center space-y-3">
                                    <p className="font-bold text-white text-base">No Profile Frames Unlocked Yet</p>
                                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                                        Reach Level 2 (2,500 XP) with any artist to unlock their album art as a spinning vinyl profile frame!
                                    </p>
                                    {allArtistMastery.length > 0 ? (
                                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto text-left max-w-md mx-auto">
                                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Level 2 Unlock Progress:</p>
                                            {allArtistMastery.slice(0, 5).map(m => (
                                                <div key={m.artistId} className="bg-gray-800 p-2.5 rounded-lg flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {m.artistPictureUrl && <img src={m.artistPictureUrl} alt={m.artistName} className="w-6 h-6 rounded-full object-cover"/>}
                                                        <span className="font-semibold text-white">{m.artistName}</span>
                                                    </div>
                                                    <span className="text-indigo-300 font-bold">{m.xp} / 2,500 XP</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleSyncMastery}
                                            disabled={isSyncingMastery}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                                        >
                                            ⚡ Calculate Mastery from {currentUserCollection.length} Songs
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'titles' && (
                        <TitleEditor
                            earnedTitles={user.earnedTitles || []}
                            activeTitleId={selectedTitleId}
                            onSelect={setSelectedTitleId}
                        />
                    )}
                    {activeTab === 'themes' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">Select a Profile Theme to customize the background aura and shelf aesthetic behind your Vinyls and Showcase!</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { id: 'default', name: 'Dark Obsidian', desc: 'Classic dark glass aesthetic', gradient: 'from-gray-900 via-gray-800 to-black', icon: '🌑' },
                                    { id: 'spooky', name: 'Spooky Season 🎃', desc: '🕸 Spiderwebs, glowing ghosts & moonlit purple aura', gradient: 'from-purple-950 via-slate-900 to-black border-purple-500/50', icon: '👻' },
                                    { id: 'gold_stage', name: 'Golden Stage 🌟', desc: 'Radiant golden spotlights & warm stage glow', gradient: 'from-amber-950 via-gray-900 to-black border-yellow-500/50', icon: '✨' },
                                    { id: 'cyberpunk', name: 'Neon Cyberpunk ⚡', desc: 'Cyan & magenta neon grid aura', gradient: 'from-cyan-950 via-fuchsia-950 to-black border-cyan-500/50', icon: '🤖' },
                                    { id: 'nebula', name: 'Cosmic Nebula 🌌', desc: 'Deep space stellar dust & purple galaxy glow', gradient: 'from-indigo-950 via-purple-950 to-black border-indigo-500/50', icon: '⭐' }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTheme(t.id)}
                                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all relative overflow-hidden bg-gradient-to-br ${t.gradient} ${
                                            selectedTheme === t.id ? 'ring-2 ring-purple-400 border-purple-400 shadow-xl scale-[1.02]' : 'border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        <span className="text-2xl">{t.icon}</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-extrabold text-white text-sm">{t.name}</p>
                                                {selectedTheme === t.id && (
                                                    <CheckCircleIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-300 mt-1">{t.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-bold disabled:bg-gray-500">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};