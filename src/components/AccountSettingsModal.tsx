import React, { useContext, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { MusicNoteIcon, StarIcon, DiamondIcon } from './icons';
import type { CollectedSong } from '../types';

export const AccountSettingsModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const { signOut, resyncGoldenVinyls, resyncBadgesAndMastery, currentUser, updateCurrentUser, updateShowcase, currentUserCollection } = useContext(UserContext)!;
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingBadges, setIsSyncingBadges] = useState(false);

    const [songDetailStyle, setSongDetailStyle] = useState<'default' | 'soundmap'>(() => {
        return (localStorage.getItem('packtunes_song_detail_style') as 'soundmap' | 'default') || 'default';
    });

    const handleSync = async () => {
        setIsSyncing(true);
        await resyncGoldenVinyls();
        setIsSyncing(false);
    }

    const handleBadgeSync = async () => {
        setIsSyncingBadges(true);
        await resyncBadgesAndMastery();
        setIsSyncingBadges(false);
    }

    const handleToggleStyle = (style: 'default' | 'soundmap') => {
        localStorage.setItem('packtunes_song_detail_style', style);
        setSongDetailStyle(style);
        window.dispatchEvent(new Event('packtunes_song_detail_style_changed'));
    };

    const mySongs: CollectedSong[] = currentUserCollection || [];

    const currentFavoriteId = currentUser?.showcase?.favoriteSongId;
    const currentRarestId = currentUser?.showcase?.rarestSongId;
    const currentThemeSongId = currentUser?.activeStageTheme?.songId;

    const handleSelectThemeSong = (songId: string) => {
        if (!songId) {
            updateCurrentUser({ activeStageTheme: null });
            return;
        }
        const found = mySongs.find((s: CollectedSong) => s.id === songId);
        if (found) {
            updateCurrentUser({
                activeStageTheme: {
                    artistId: found.song.artist.id,
                    artistName: found.song.artist.name,
                    songId: found.id,
                    albumArtUrl: found.song.albumArtUrl,
                }
            });
        }
    };

    const handleSelectFavorite = (songId: string) => {
        updateShowcase({ favoriteSongId: songId || undefined });
    };

    const handleSelectRarest = (songId: string) => {
        updateShowcase({ rarestSongId: songId || undefined });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-6">Account Settings</h3>
                
                <div className="space-y-6">

                     {/* Profile Showcase & Theme Song Manager */}
                     <div>
                         <h4 className="text-lg font-semibold mb-3 text-gray-300">Profile Showcase & Pins</h4>
                          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                             <div>
                                <label className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <MusicNoteIcon className="w-4 h-4 text-emerald-400" /> Set Profile Theme Song:
                                </label>
                                <select
                                    value={currentThemeSongId || ''}
                                    onChange={(e) => handleSelectThemeSong(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">-- None (No Profile Song) --</option>
                                    {mySongs.map((s: CollectedSong) => (
                                        <option key={s.id} value={s.id}>
                                            {s.song.title} — {s.song.artist.name} ({s.song.rarity})
                                        </option>
                                    ))}
                                </select>
                             </div>

                             <div>
                                <label className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <StarIcon className="w-4 h-4 text-yellow-400" /> Pin Favorite Song:
                                </label>
                                <select
                                    value={currentFavoriteId || ''}
                                    onChange={(e) => handleSelectFavorite(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                                >
                                    <option value="">-- None (Unpinned) --</option>
                                    {mySongs.map((s: CollectedSong) => (
                                        <option key={s.id} value={s.id}>
                                            {s.song.title} — {s.song.artist.name} ({s.song.rarity})
                                        </option>
                                    ))}
                                </select>
                             </div>

                             <div>
                                <label className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <DiamondIcon className="w-4 h-4 text-purple-400" /> Pin Rarest Gem:
                                </label>
                                <select
                                    value={currentRarestId || ''}
                                    onChange={(e) => handleSelectRarest(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value="">-- None (Unpinned) --</option>
                                    {mySongs.map((s: CollectedSong) => (
                                        <option key={s.id} value={s.id}>
                                            {s.song.title} — {s.song.artist.name} ({s.song.rarity})
                                        </option>
                                    ))}
                                </select>
                             </div>
                          </div>
                     </div>

                     {/* Data Management */}
                     <div>
                         <h4 className="text-lg font-semibold mb-3 text-gray-300">Data Management</h4>
                          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                             <div>
                                <p className="text-sm text-gray-400 mb-3">If you think a Golden Vinyl is missing after completing a shiny album, you can manually resync your collection.</p>
                                <button onClick={handleSync} disabled={isSyncing} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors disabled:bg-gray-500">
                                    {isSyncing ? 'Syncing...' : 'Resync Golden Vinyls'}
                                </button>
                             </div>
                             <div>
                                <p className="text-sm text-gray-400 mb-3">If your badges or artist images appear incorrect (especially after an update), run this to repair your data.</p>
                                <button onClick={handleBadgeSync} disabled={isSyncingBadges} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors disabled:bg-gray-500">
                                    {isSyncingBadges ? 'Resyncing...' : 'Resync Badges & Mastery'}
                                </button>
                             </div>
                          </div>
                     </div>

                     {/* Sign Out */}
                     <div>
                         <h4 className="text-lg font-semibold mb-3 text-gray-300">Authentication</h4>
                          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                             <p className="text-sm text-gray-400 mb-3">Sign out of your current account.</p>
                             <button onClick={signOut} className="w-full py-2 bg-red-600/80 hover:bg-red-700 rounded-md font-semibold transition-colors">
                                Sign Out
                             </button>
                          </div>
                     </div>
                </div>

                <div className="flex justify-end mt-8">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Close</button>
                </div>
            </div>
        </div>
    );
};
