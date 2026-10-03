import React, { useState, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { isBonusAvailable, MAX_GUARDIAN_LEVEL } from '../services/guardianService';
import { FeedGuardianModal } from '../components/FeedGuardianModal';
import { GuardianEggView } from './GuardianEggView';

export const GuardianView: React.FC = () => {
    const { currentUser, claimGuardianBonus, abandonAndResetGuardian } = useContext(UserContext)!;
    const [isFeeding, setIsFeeding] = useState(false);

    const handleAbandon = () => {
        if (window.confirm("Are you sure you want to abandon your Guardian? This is permanent and all progress (level, XP) will be lost. You will be able to hatch a new egg.")) {
            abandonAndResetGuardian();
        }
    };

    if (!currentUser) {
        return <p>Loading...</p>;
    }
    
    if (!currentUser.grooveGuardian) {
        return <GuardianEggView />;
    }

    const { name, imageUrl, level, xp, genreAffinities } = currentUser.grooveGuardian;
    const bonusAvailable = isBonusAvailable(currentUser.grooveGuardian);
    
    const sortedAffinities = Object.entries(genreAffinities).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 3);

    return (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div className="relative">
                <img src={imageUrl} alt={name} className="w-64 h-64 object-contain" />
            </div>
            <div className="text-center">
                <h2 className="text-3xl font-bold">{name}</h2>
                <p className="text-indigo-400 font-semibold">Level {level} / {MAX_GUARDIAN_LEVEL}</p>
                <p className="text-gray-400">{xp.toLocaleString()} Total XP</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h3 className="font-bold mb-3 text-center">Top Genre Affinities</h3>
                    <div className="space-y-2">
                        {sortedAffinities.map(([genre, count]) => (
                            <div key={genre}>
                                <div className="flex justify-between text-sm font-semibold mb-1">
                                    <span>{genre}</span>
                                    <span>{count as number} songs</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${((count as number) / Math.max(1, sortedAffinities[0][1] as number)) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col items-center justify-center text-center">
                    <h3 className="font-bold text-lg">Feed Your Guardian</h3>
                    <p className="text-sm text-gray-400 my-2">Feed duplicate or unwanted songs to your Guardian to help it level up and evolve!</p>
                    <button 
                        onClick={() => setIsFeeding(true)}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white transition-colors"
                    >
                        Feed Songs
                    </button>
                </div>
            </div>

            {level >= MAX_GUARDIAN_LEVEL && (
                 <div className="w-full p-4 bg-yellow-400/10 rounded-lg border border-yellow-500 text-center">
                    <h3 className="font-bold text-xl text-yellow-300">Daily Bonus Unlocked!</h3>
                    <p className="text-sm text-yellow-400/80 my-2">Your Guardian has reached its final form and can now find a small bonus for you each day.</p>
                     <button 
                        onClick={claimGuardianBonus}
                        disabled={!bonusAvailable}
                        className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {bonusAvailable ? 'Claim Daily Bonus' : 'Bonus Claimed Today'}
                    </button>
                </div>
            )}

            {isFeeding && <FeedGuardianModal onClose={() => setIsFeeding(false)} />}

            <div className="w-full mt-8 pt-6 border-t border-red-500/30">
                <h3 className="text-center text-xl font-bold text-red-400">Danger Zone</h3>
                <p className="text-center text-sm text-gray-400 mt-1 mb-4">Abandoning your Guardian is permanent. All progress, levels, and XP will be lost forever.</p>
                <button
                    onClick={handleAbandon}
                    className="w-full py-3 bg-red-600/80 hover:bg-red-700 text-white font-semibold rounded-lg text-lg transition-colors"
                >
                    Abandon Guardian
                </button>
            </div>
        </div>
    );
};