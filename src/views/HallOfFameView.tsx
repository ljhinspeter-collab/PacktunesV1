import React, { useState, useContext, useMemo, useEffect } from 'react';
import { UserContext } from '../contexts/UserContext';
import { TrophyIcon, CrownIcon, RectangleStackIcon, FireIcon, DiamondIcon } from '../components/icons';
import type { RecordLabel, User, Trophy, Song, CollectedSong } from '../types';
import { dataService } from '../services/dataService';
import { getTrackDetails } from '../services/musicService';
import { SongPreviewModal } from '../components/SongPreviewModal';
import { db } from '../services/firebase';
import { collectionGroup, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

type HallTab = 'champions' | 'jailbroken' | 'records';

const ChampionsView: React.FC = () => {
    const { recordLabels } = useContext(UserContext)!;

    const champions = useMemo(() => {
        const champLabels: { label: RecordLabel, trophy: Trophy }[] = [];
        recordLabels.forEach(label => {
            (label.trophies || []).forEach(trophy => {
                if (trophy.rank === 1) {
                    champLabels.push({ label, trophy });
                }
            });
        });
        return champLabels.sort((a, b) => b.trophy.date - a.trophy.date);
    }, [recordLabels]);

    if (champions.length === 0) {
        return <div className="text-center text-gray-400 py-16">The Pantheon of Champions awaits its first victor.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {champions.map(({ label, trophy }) => (
                <div key={`${label.id}-${trophy.eventId}`} className="iridescent-border-bg rounded-xl p-4 flex flex-col items-center text-center">
                    <img src={label.pfpUrl} alt={label.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-900 mb-3" />
                    <h4 className="text-xl font-bold">{label.name}</h4>
                    <p className="text-sm text-gray-400 mt-2">Crowned champions of</p>
                    <p className="font-semibold text-indigo-300">{trophy.eventName}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(trophy.date).toLocaleDateString()}</p>
                </div>
            ))}
        </div>
    );
};

const JailbrokenFindsView: React.FC = () => {
    const { users } = useContext(UserContext)!;
    // FIX: Changed ownerPfpUrl to be explicitly string | undefined to resolve type predicate error.
    type JailbrokenPull = Song & { ownerName: string; collectedAt: number; ownerId: string; collectedSongId: string; songId: string; ownerPfpUrl: string | undefined; };
    const [pulls, setPulls] = useState<JailbrokenPull[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSong, setSelectedSong] = useState<CollectedSong | null>(null);

    useEffect(() => {
        const fetchPulls = async () => {
            setIsLoading(true);
            const owners = await dataService.getAllJailbrokenPulls();
            const songDetailsPromises = owners.map(owner => getTrackDetails(owner.songId));
            const songDetails = await Promise.all(songDetailsPromises);

            const vizeUser = users.find(u => u.name.toLowerCase() === 'vize');
            const knovaUser = users.find(u => u.name.toLowerCase() === 'knova');

            const fetchedPulls = songDetails
                .map((song, index) => {
                    if (!song) return null;
                    const ownerInfo = owners[index];
                    
                    let finalOwnerName = ownerInfo.ownerName;
                    let finalOwnerPfpUrl: string | undefined;

                    if (song.title.toLowerCase().includes('industry baby')) {
                        finalOwnerName = 'Vize';
                        finalOwnerPfpUrl = vizeUser?.pfpUrl;
                    } else {
                        // This is the assumption for "the other song"
                        finalOwnerName = 'Knova';
                        finalOwnerPfpUrl = knovaUser?.pfpUrl;
                    }

                    return { ...song, ...ownerInfo, ownerName: finalOwnerName, ownerPfpUrl: finalOwnerPfpUrl };
                })
                .filter((pull): pull is JailbrokenPull => pull !== null)
                .sort((a, b) => b.collectedAt - a.collectedAt);
            
            setPulls(fetchedPulls);
            setIsLoading(false);
        };

        if (users.length > 0) {
            fetchPulls();
        }
    }, [users]);

    const handleSongClick = async (pull: JailbrokenPull) => {
        // Since we now store ownerId and collectedSongId, we can do a direct lookup.
        const docRef = doc(db, 'users', pull.ownerId, 'collection', pull.collectedSongId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setSelectedSong(docSnap.data() as CollectedSong);
        } else {
            console.error("Could not find the collected song document for this jailbroken pull.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
            </div>
        );
    }
    
    if (pulls.length === 0) {
        return <div className="text-center text-gray-400 py-16">The gallery is empty. The first Jailbroken song has yet to be discovered.</div>;
    }

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-3">
                {pulls.map(pull => (
                    <button key={pull.id} onClick={() => handleSongClick(pull)} className="w-full text-left p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center gap-4 hover:bg-gray-700/70 transition-colors">
                        <img src={pull.albumArtUrl} alt={pull.title} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                        <div className="flex-grow truncate">
                            <p className="font-bold text-lg text-white truncate">{pull.title}</p>
                            <p className="text-base text-gray-400 truncate">{pull.artist.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0 flex items-center gap-3">
                             <div>
                                <p className="font-semibold text-indigo-300">{pull.ownerName}</p>
                                <p className="text-xs text-gray-500">Closed Beta</p>
                            </div>
                            {pull.ownerPfpUrl && (
                                <div className="relative w-12 h-12">
                                    <img src={pull.ownerPfpUrl} alt={pull.ownerName} className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400" />
                                    <div className="prestige-overlay-effect !rounded-full opacity-70"></div>
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
            {selectedSong && (
                <SongPreviewModal 
                    collectedSong={selectedSong}
                    onClose={() => setSelectedSong(null)}
                    showTradeButton={false}
                />
            )}
        </>
    );
};

const RecordBreakersView: React.FC = () => {
    const { users } = useContext(UserContext)!;

    const records = useMemo(() => {
        if (users.length === 0) return {};
        const sortedByCollection = [...users].sort((a, b) => (b.collectionSize || 0) - (a.collectionSize || 0));
        const sortedByStreak = [...users].sort((a, b) => (b.loginStreak || 0) - (a.loginStreak || 0));
        
        return {
            collection: sortedByCollection[0],
            streak: sortedByStreak[0]
        };
    }, [users]);
    
    if (!records.collection && !records.streak) {
         return <div className="text-center text-gray-400 py-16">Records are waiting to be set.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
           {records.collection && (
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col items-center text-center">
                    <RectangleStackIcon className="w-12 h-12 text-indigo-400 mb-3" />
                    <h4 className="text-2xl font-bold">Largest Collection</h4>
                    <p className="text-5xl font-black my-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">{(records.collection.collectionSize || 0).toLocaleString()}</p>
                    <img src={records.collection.pfpUrl} alt={records.collection.name} className="w-16 h-16 rounded-full object-cover border-4 border-gray-600 mt-2" />
                    <p className="mt-2 font-bold text-xl">{records.collection.name}</p>
                </div>
           )}
            {records.streak && (
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col items-center text-center">
                    <FireIcon className="w-12 h-12 text-orange-400 mb-3" />
                    <h4 className="text-2xl font-bold">Longest Login Streak</h4>
                    <p className="text-5xl font-black my-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-400">{(records.streak.loginStreak || 0).toLocaleString()}</p>
                    <img src={records.streak.pfpUrl} alt={records.streak.name} className="w-16 h-16 rounded-full object-cover border-4 border-gray-600 mt-2" />
                    <p className="mt-2 font-bold text-xl">{records.streak.name}</p>
                </div>
           )}
        </div>
    );
};


export const HallOfFameView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<HallTab>('champions');

    const renderContent = () => {
        switch(activeTab) {
            case 'champions': return <ChampionsView />;
            case 'jailbroken': return <JailbrokenFindsView />;
            case 'records': return <RecordBreakersView />;
            default: return null;
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <TrophyIcon className="w-16 h-16 text-yellow-300 mx-auto mb-2" />
                <h2 className="text-4xl font-bold">Hall of Fame</h2>
                <p className="text-gray-400 max-w-lg mx-auto">A monument to the greatest achievements in PackTunes history.</p>
            </div>

            <div className="flex justify-center border-b border-gray-700 mb-6">
                 <button onClick={() => setActiveTab('champions')} className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'champions' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <TrophyIcon className="w-5 h-5"/> Champions
                 </button>
                 <button onClick={() => setActiveTab('jailbroken')} className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'jailbroken' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <DiamondIcon className="w-5 h-5"/> Jailbroken Finds
                 </button>
                 <button onClick={() => setActiveTab('records')} className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'records' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <CrownIcon className="w-5 h-5"/> Record Breakers
                 </button>
            </div>
            
            {renderContent()}
        </div>
    );
};