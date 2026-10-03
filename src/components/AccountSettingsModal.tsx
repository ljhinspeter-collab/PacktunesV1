import React, { useContext, useState } from 'react';
import { UserContext } from '../contexts/UserContext';

export const AccountSettingsModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const { signOut, resyncGoldenVinyls, resyncBadgesAndMastery } = useContext(UserContext)!;
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingBadges, setIsSyncingBadges] = useState(false);

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-6">Account Settings</h3>
                
                <div className="space-y-6">
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