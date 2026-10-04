import React, { useState, useEffect, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import { TrophyIcon, CalendarDaysIcon, ClockIcon, SparklesIcon } from '../components/icons';
import type { RecordLabel, EventReward, LabelEvent, User } from '../types';
import { updateAllLeaderboards } from '../services/eventService';
import { dataService } from '../services/dataService';
import { ClanDetailsModal } from '../components/ClanDetailsModal';
import { formatEventTheme } from '../utils/themeFormatter';

const COOLDOWN_DURATION = 1 * 24 * 60 * 60 * 1000; // 1 day

const Countdown: React.FC<{ endTime: number, onEnd?: () => void }> = ({ endTime, onEnd }) => {
    const calculateTimeLeft = () => {
        const difference = endTime - Date.now();
        let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        } else if (onEnd) {
            onEnd();
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    return (
        <div className="flex justify-center gap-4 text-center font-mono">
            <div>
                <span className="font-bold text-4xl text-white">{String(timeLeft.days).padStart(2, '0')}</span>
                <span className="text-xs block text-gray-400">DAYS</span>
            </div>
            <div>
                <span className="font-bold text-4xl text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-xs block text-gray-400">HOURS</span>
            </div>
            <div>
                <span className="font-bold text-4xl text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-xs block text-gray-400">MINS</span>
            </div>
            <div>
                <span className="font-bold text-4xl text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-xs block text-gray-400">SECS</span>
            </div>
        </div>
    );
};

const LeaderboardRow: React.FC<{
    rank: number;
    labelName: string;
    labelPfpUrl: string;
    score: number;
    isCurrentUserLabel: boolean;
    onClick?: () => void;
}> = ({ rank, labelName, labelPfpUrl, score, isCurrentUserLabel, onClick }) => {
    
    const getRankColor = () => {
        if (rank === 1) return 'border-yellow-400 bg-yellow-400/10';
        if (rank === 2) return 'border-gray-300 bg-gray-300/10';
        if (rank === 3) return 'border-orange-400 bg-orange-400/10';
        return 'border-gray-700';
    };

    return (
        <div 
            onClick={onClick}
            className={`p-3 rounded-lg border flex items-center gap-4 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.01] hover:border-indigo-500/60' : ''} ${getRankColor()} ${isCurrentUserLabel ? 'ring-2 ring-indigo-500 scale-[1.02] shadow-lg' : 'shadow-md'}`}
        >
            <div className={`w-10 flex-shrink-0 text-center font-bold text-xl ${rank <= 3 ? 'text-white' : 'text-gray-500'}`}>
                #{rank}
            </div>
            <img src={labelPfpUrl} alt={labelName} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"/>
            <div className="flex-grow truncate">
                 <h4 className="font-bold truncate">{labelName}</h4>
                 {onClick && <span className="text-[11px] text-indigo-400 font-medium">Click to view members →</span>}
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-yellow-300">{score.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Points</p>
            </div>
        </div>
    );
};

const CurrentWarView: React.FC<{ contextLabel?: RecordLabel }> = ({ contextLabel }) => {
    const { events, currentUser, recordLabels } = useContext(UserContext)!;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedClan, setSelectedClan] = useState<RecordLabel | null>(null);
    const latestEvent = useMemo(() => events?.[0], [events]);

    const memberLeaderboardData = useMemo(() => {
        if (!contextLabel || !latestEvent?.individualScores) return [];
        
        const scores = latestEvent.individualScores;
        return Object.entries(scores)
            .filter(([userId]) => (contextLabel.memberIds || []).includes(userId))
            // FIX: Cast `data` to its proper type to resolve 'unknown' type error.
            .map(([userId, data]) => {
                const scoreData = data as { name: string; pfpUrl: string; score: number; };
                return {
                    user: { id: userId, name: scoreData.name, pfpUrl: scoreData.pfpUrl },
                    score: scoreData.score,
                };
            })
            .sort((a, b) => b.score - a.score);

    }, [contextLabel, latestEvent]);

    const totalLabelScore = useMemo(() => {
        return memberLeaderboardData.reduce((sum, member) => sum + member.score, 0);
    }, [memberLeaderboardData]);

    const handleRefresh = async () => {
        if (!latestEvent) return;
        setIsRefreshing(true);
        await updateAllLeaderboards(latestEvent);
        setIsRefreshing(false);
    };

    if (!latestEvent) {
         return (
            <div className="text-center text-gray-400 py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
                <p className="text-lg font-semibold text-white">Preparing the next Label War...</p>
            </div>
        );
    }
    
    if (latestEvent.isActive) {
        return (
            <div>
                <div className="text-center mb-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-xs font-bold mb-3">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>Theme: {formatEventTheme(latestEvent.theme)}</span>
                    </div>
                    <TrophyIcon className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                    <h2 className="text-3xl font-bold mb-2">{latestEvent.title}</h2>
                    <p className="text-gray-300 max-w-xl mx-auto mb-4">{latestEvent.description}</p>
                    <div className="text-indigo-300">
                        <p className="text-xs text-gray-400 mb-2">EVENT ENDS IN</p>
                        <Countdown endTime={latestEvent.endTime} />
                    </div>
                </div>

                {contextLabel && (
                    <div className="max-w-3xl mx-auto mb-10">
                        <div className="mb-6 text-center">
                            <p className="text-lg text-gray-400">Your Label's Total Score</p>
                            <p className="text-5xl font-bold text-yellow-300">{totalLabelScore.toLocaleString()}</p>
                        </div>
                        <h3 className="text-2xl font-bold text-center mb-4">Individual Contributions</h3>
                        {memberLeaderboardData.length > 0 ? (
                            <div className="space-y-3">
                                {memberLeaderboardData.map((data, index) => (
                                    <LeaderboardRow 
                                        key={data.user.id}
                                        rank={index + 1}
                                        labelName={data.user.name}
                                        labelPfpUrl={data.user.pfpUrl}
                                        score={data.score}
                                        isCurrentUserLabel={currentUser?.id === data.user.id}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center text-gray-400 py-8 bg-gray-800/50 rounded-lg">
                                <p>No contributions recorded for this war yet.</p>
                                <p className="text-sm mt-1">Be the first to score points for your label!</p>
                            </div>
                        )}
                    </div>
                )}


                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold">{contextLabel ? 'Global War Leaderboard' : 'Live Leaderboard'}</h3>
                        <button onClick={handleRefresh} disabled={isRefreshing} className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50">
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {latestEvent.leaderboard.slice(0, 25).map((data, index) => {
                            const clanObj = recordLabels.find(l => l.id === data.labelId);
                            return (
                                <LeaderboardRow 
                                    key={data.labelId}
                                    rank={index + 1}
                                    labelName={data.name}
                                    labelPfpUrl={data.pfpUrl}
                                    score={data.score}
                                    isCurrentUserLabel={currentUser?.labelId === data.labelId}
                                    onClick={clanObj ? () => setSelectedClan(clanObj) : undefined}
                                />
                            );
                        })}
                    </div>
                </div>
                {selectedClan && <ClanDetailsModal label={selectedClan} onClose={() => setSelectedClan(null)} />}
            </div>
        );
    }

    // Cooldown view
    const nextWarTime = latestEvent.endTime + COOLDOWN_DURATION;
    return (
        <div className="text-center text-gray-400 py-16">
            <ClockIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-2xl font-semibold text-white">The Label War has ended.</p>
            <p className="mt-2 text-lg">Rewards have been distributed to the winners.</p>
            <div className="mt-8">
                 <p className="text-sm text-gray-400 mb-2">NEXT WAR BEGINS IN</p>
                 <Countdown endTime={nextWarTime} />
            </div>
        </div>
    );
};

const AllTimeRankings: React.FC = () => {
    const { recordLabels, currentUser } = useContext(UserContext)!;
    const [selectedClan, setSelectedClan] = useState<RecordLabel | null>(null);

    const labelScores = useMemo(() => {
        const scores = recordLabels.map(label => {
            const score = (label.trophies || []).reduce((acc, trophy) => {
                if (trophy.rank === 1) return acc + 3;
                if (trophy.rank === 2) return acc + 2;
                if (trophy.rank === 3) return acc + 1;
                return acc;
            }, 0);
            return { label, score };
        });
        return scores.sort((a, b) => b.score - a.score).slice(0, 25);
    }, [recordLabels]);

    return (
         <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-center">All-Time Rankings</h3>
            <p className="text-center text-gray-400 mb-6">Labels are ranked based on trophy points from past wars (1st: 3pts, 2nd: 2pts, 3rd: 1pt). Click any clan to see its members.</p>
            <div className="space-y-3">
                {labelScores.map(({ label, score }, index) => (
                    <LeaderboardRow 
                        key={label.id}
                        rank={index + 1}
                        labelName={label.name}
                        labelPfpUrl={label.pfpUrl}
                        score={score}
                        isCurrentUserLabel={currentUser?.labelId === label.id}
                        onClick={() => setSelectedClan(label)}
                    />
                ))}
            </div>
            {selectedClan && <ClanDetailsModal label={selectedClan} onClose={() => setSelectedClan(null)} />}
        </div>
    );
};


export const EventsView: React.FC<{ contextLabel?: RecordLabel }> = ({ contextLabel }) => {
    const { rewards, claimReward, updateCurrentUser } = useContext(UserContext)!;
    const [activeTab, setActiveTab] = useState<'current' | 'all-time'>('current');

    const unclaimedRewards = useMemo(() => (rewards || []).filter(r => !r.claimed), [rewards]);

    const handleClaim = async (rewardId: string) => {
        const rewardPayload = await claimReward(rewardId);
        if (rewardPayload?.title) {
            await updateCurrentUser({ activeTitleId: rewardPayload.title.id });
        }
    };

    return (
        <div>
            <ClaimableRewards rewards={unclaimedRewards} onClaim={handleClaim} />
            
             <div className="flex justify-center border-b border-gray-700 mb-6">
                 <button 
                    onClick={() => setActiveTab('current')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'current' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Current War
                </button>
                 <button 
                    onClick={() => setActiveTab('all-time')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'all-time' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    All-Time Rankings
                </button>
            </div>
            
            {activeTab === 'current' ? <CurrentWarView contextLabel={contextLabel} /> : <AllTimeRankings />}
        </div>
    );
};

const ClaimableRewards: React.FC<{ rewards: EventReward[], onClaim: (id: string) => void }> = ({ rewards, onClaim }) => {
    if (rewards.length === 0) return null;
    return (
        <div className="mb-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-3 text-center text-green-400">Claim Your Rewards!</h3>
            <div className="space-y-3">
                {rewards.map(reward => (
                    <div key={reward.id} className="p-3 bg-gray-700/50 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-white">{reward.eventName} - {reward.rank}{reward.rank === 1 ? 'st' : reward.rank === 2 ? 'nd' : 'rd'} Place</p>
                            <p className="text-sm text-gray-400">Your reward pack is ready to be claimed.</p>
                        </div>
                        <button onClick={() => onClaim(reward.id)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md font-semibold">
                            Claim
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
