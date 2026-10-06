import React, { useState, useContext, useMemo, useEffect } from 'react';
import { UserContext } from '../contexts/UserContext';
import { TrophyIcon, CrownIcon, RectangleStackIcon, FireIcon, DiamondIcon, StarIcon, SparklesIcon, VinylIcon } from '../components/icons';
import type { RecordLabel, User, Trophy, Song, CollectedSong } from '../types';
import { dataService } from '../services/dataService';
import { getTrackDetails } from '../services/musicService';
import { SongPreviewModal } from '../components/SongPreviewModal';
import { ClanDetailsModal } from '../components/ClanDetailsModal';
import { db } from '../services/firebase';
import { collectionGroup, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { getTop100Leaderboard, LeaderboardEntry, calculatePlayerScore } from '../services/playerRankingService';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';

type HallTab = 'rankings' | 'champions' | 'jailbroken' | 'records';

const Top100LeaderboardView: React.FC = () => {
    const userContext = useContext(UserContext);
    const { currentUser, currentUserCollection, setViewingUser, users } = userContext || {};
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState<string>('all');
    const [showFormulaModal, setShowFormulaModal] = useState(false);
    const [previewSong, setPreviewSong] = useState<CollectedSong | null>(null);
    const [visibleCount, setVisibleCount] = useState<number>(10);

    const { leaderboard, currentUserRank, currentUserScore } = useMemo(() => {
        return getTop100Leaderboard(currentUser, currentUserCollection, users);
    }, [currentUser, currentUserCollection, users]);

    useEffect(() => {
        setVisibleCount(10);
    }, [search, tierFilter]);

    const filtered = useMemo(() => {
        let list = leaderboard;
        if (tierFilter !== 'all') {
            list = list.filter(item => item.tier.toLowerCase().includes(tierFilter.toLowerCase()));
        }
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            list = list.filter(item => 
                item.name.toLowerCase().includes(q) ||
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.clanName && item.clanName.toLowerCase().includes(q)) ||
                `#${item.rank}`.includes(q)
            );
        }
        return list;
    }, [leaderboard, search, tierFilter]);

    const displayedCollectors = useMemo(() => {
        return filtered.slice(0, visibleCount);
    }, [filtered, visibleCount]);

    const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
    const userLeaderboardEntry = useMemo(() => leaderboard.find(l => l.isCurrentUser), [leaderboard]);

    const handleInspectUser = (entry: LeaderboardEntry) => {
        if (!setViewingUser) return;
        const found = users?.find(u => u.id === entry.id || u.name.toLowerCase() === entry.name.toLowerCase());
        if (found) {
            setViewingUser(found);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header info & Ranking Formula Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-800/60 p-4 rounded-2xl border border-gray-700/80 backdrop-blur-sm">
                <div className="text-left">
                    <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        <span>🏆 Global Top 100 Rankings</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-mono">
                            LIVE LEADERBOARD
                        </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                        Rankings computed from collection volume, mythic & jailbroken pulls, vinyl count, and track hype.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFormulaModal(true)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all border border-indigo-400/30 flex items-center gap-1.5 shadow"
                    >
                        <span>📐 Ranking Formula</span>
                    </button>
                </div>
            </div>

            {/* Current User Standing Banner */}
            {currentUser && (
                <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border-2 border-indigo-500/60 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative">
                            <img
                                src={currentUser.pfpUrl || ''}
                                alt={currentUser.name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400 shadow-md"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-black font-black text-[10px] px-1.5 py-0.5 rounded-full shadow">
                                #{currentUserRank}
                            </span>
                        </div>
                        <div className="text-left">
                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">
                                Your Global Standing
                            </span>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xl font-black text-white">{currentUser.name}</h4>
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                                    Rank #{currentUserRank}
                                </span>
                            </div>
                            <p className="text-xs text-gray-300 mt-0.5">
                                Cumulative Score: <strong className="text-yellow-300 font-mono">{currentUserScore.toLocaleString()} pts</strong>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 w-full sm:w-auto text-center border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-800">
                        <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800">
                            <span className="text-[10px] text-gray-400 block font-bold">Cards</span>
                            <span className="text-xs font-black text-white">{userLeaderboardEntry?.cardsCount || currentUserCollection?.length || 0}</span>
                        </div>
                        <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800">
                            <span className="text-[10px] text-purple-400 block font-bold">Mythics</span>
                            <span className="text-xs font-black text-purple-300">{userLeaderboardEntry?.mythicsCount || 0}</span>
                        </div>
                        <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800">
                            <span className="text-[10px] text-red-400 block font-bold">Jailbrokens</span>
                            <span className="text-xs font-black text-red-300">{userLeaderboardEntry?.jailbrokensCount || 0}</span>
                        </div>
                        <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800">
                            <span className="text-[10px] text-yellow-400 block font-bold">Vinyls</span>
                            <span className="text-xs font-black text-yellow-300">{userLeaderboardEntry?.vinylsCount || currentUser.vinyls?.length || 0}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 2nd Place */}
                {topThree[1] && (
                    <div 
                        onClick={() => handleInspectUser(topThree[1])}
                        className="order-2 md:order-1 bg-gradient-to-b from-slate-800/80 to-gray-900 border-2 border-slate-400/60 rounded-3xl p-5 text-center cursor-pointer hover:scale-[1.02] transition-transform shadow-lg relative group"
                    >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-400 text-black font-black text-xs px-3 py-1 rounded-full shadow-lg">
                            🥈 RANK #2
                        </div>
                        <img 
                            src={topThree[1].pfpUrl} 
                            alt={topThree[1].name} 
                            className="w-20 h-20 rounded-full object-cover border-4 border-slate-400 mx-auto mt-2 mb-3 shadow" 
                        />
                        <h4 className="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">{topThree[1].name}</h4>
                        <p className="text-xs text-slate-300 font-semibold">{topThree[1].title || 'Elite Curator'}</p>
                        <p className="text-xl font-black text-slate-200 font-mono mt-2">{topThree[1].score.toLocaleString()} <span className="text-xs text-gray-400">pts</span></p>
                        
                        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-center gap-3 text-xs text-gray-300">
                            <span>🃏 {topThree[1].cardsCount}</span>
                            <span className="text-purple-300">🌟 {topThree[1].mythicsCount}</span>
                            <span className="text-yellow-300">💿 {topThree[1].vinylsCount}</span>
                        </div>
                    </div>
                )}

                {/* 1st Place (Center Podium) */}
                {topThree[0] && (
                    <div 
                        onClick={() => handleInspectUser(topThree[0])}
                        className="order-1 md:order-2 bg-gradient-to-b from-amber-950/70 via-gray-900 to-black border-2 border-yellow-400 rounded-3xl p-6 text-center cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_0_40px_rgba(250,204,21,0.25)] relative group"
                    >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-xs px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 animate-pulse">
                            <span>👑</span>
                            <span>SUPREME CHAMPION #1</span>
                        </div>
                        <div className="relative w-24 h-24 mx-auto mt-1 mb-3">
                            <img 
                                src={topThree[0].pfpUrl} 
                                alt={topThree[0].name} 
                                className="w-24 h-24 rounded-full object-cover border-4 border-yellow-400 shadow-xl" 
                            />
                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black font-black text-xs p-1 rounded-full shadow">
                                🏆
                            </div>
                        </div>
                        <h4 className="text-2xl font-black text-white group-hover:text-yellow-300 transition-colors">{topThree[0].name}</h4>
                        <p className="text-xs font-bold text-yellow-300 uppercase tracking-widest">{topThree[0].title || 'Veilkeeper'}</p>
                        <p className="text-3xl font-black text-yellow-300 font-mono mt-2">{topThree[0].score.toLocaleString()} <span className="text-sm text-yellow-500/80">pts</span></p>
                        
                        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-around text-xs">
                            <div>
                                <span className="text-[10px] text-gray-400 block">Cards</span>
                                <span className="font-bold text-white">{topThree[0].cardsCount}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-purple-400 block">Mythics</span>
                                <span className="font-bold text-purple-300">{topThree[0].mythicsCount}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-red-400 block">Jailbrokens</span>
                                <span className="font-bold text-red-400">{topThree[0].jailbrokensCount}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-yellow-400 block">Vinyls</span>
                                <span className="font-bold text-yellow-300">{topThree[0].vinylsCount}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                    <div 
                        onClick={() => handleInspectUser(topThree[2])}
                        className="order-3 bg-gradient-to-b from-amber-950/40 to-gray-900 border-2 border-amber-600/60 rounded-3xl p-5 text-center cursor-pointer hover:scale-[1.02] transition-transform shadow-lg relative group"
                    >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg">
                            🥉 RANK #3
                        </div>
                        <img 
                            src={topThree[2].pfpUrl} 
                            alt={topThree[2].name} 
                            className="w-20 h-20 rounded-full object-cover border-4 border-amber-600 mx-auto mt-2 mb-3 shadow" 
                        />
                        <h4 className="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">{topThree[2].name}</h4>
                        <p className="text-xs text-amber-300 font-semibold">{topThree[2].title || 'Grand Master'}</p>
                        <p className="text-xl font-black text-amber-200 font-mono mt-2">{topThree[2].score.toLocaleString()} <span className="text-xs text-gray-400">pts</span></p>
                        
                        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-center gap-3 text-xs text-gray-300">
                            <span>🃏 {topThree[2].cardsCount}</span>
                            <span className="text-purple-300">🌟 {topThree[2].mythicsCount}</span>
                            <span className="text-yellow-300">💿 {topThree[2].vinylsCount}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                <div className="w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Search collector by name, title, or #rank..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
                    {['all', 'supreme', 'hunter', 'curator', 'diamond'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTierFilter(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors flex-shrink-0 ${
                                tierFilter === t 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                        >
                            {t === 'all' ? 'All Top 100' : `${t} Tier`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Collectors Leaderboard Rows */}
            <div className="space-y-2.5">
                {displayedCollectors.map((entry) => {
                    const isUser = entry.isCurrentUser;
                    return (
                        <div
                            key={entry.id}
                            onClick={() => handleInspectUser(entry)}
                            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                                isUser 
                                    ? 'bg-indigo-950/60 border-indigo-400/80 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                                    : 'bg-gray-800/70 hover:bg-gray-700/60 border-gray-700/80'
                            }`}
                        >
                            {/* Left: Rank & Collector Profile */}
                            <div className="flex items-center gap-3.5">
                                <span className={`w-10 text-center font-mono font-black text-sm sm:text-base flex-shrink-0 ${
                                    entry.rank === 1 ? 'text-yellow-400 font-extrabold text-lg' :
                                    entry.rank === 2 ? 'text-slate-300 font-extrabold text-lg' :
                                    entry.rank === 3 ? 'text-amber-500 font-extrabold text-lg' :
                                    entry.rank <= 10 ? 'text-indigo-300' : 'text-gray-400'
                                }`}>
                                    #{entry.rank}
                                </span>

                                <div className="relative flex-shrink-0">
                                    <img
                                        src={entry.pfpUrl}
                                        alt={entry.name}
                                        className="w-11 h-11 rounded-full object-cover border border-gray-600"
                                    />
                                    {isUser && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-gray-900" />
                                    )}
                                </div>

                                <div className="text-left truncate">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm sm:text-base group-hover:text-indigo-300 transition-colors truncate">
                                            {entry.name}
                                        </span>
                                        {isUser && (
                                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-indigo-500 text-white font-mono">
                                                YOU
                                            </span>
                                        )}
                                        {entry.clanName && (
                                            <span className="hidden md:inline-block text-[10px] text-gray-400 px-2 py-0.5 rounded bg-gray-900 border border-gray-700 truncate">
                                                {entry.clanName}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">
                                        {entry.title || entry.tier}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Scores & Stats */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-800">
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    <span className="px-2 py-1 rounded bg-black/40 text-gray-300" title="Total Cards">
                                        🃏 {entry.cardsCount}
                                    </span>
                                    <span className="px-2 py-1 rounded bg-purple-950/50 text-purple-300 border border-purple-500/30" title="Mythics">
                                        🌟 {entry.mythicsCount}
                                    </span>
                                    {entry.jailbrokensCount > 0 && (
                                        <span className="px-2 py-1 rounded bg-red-950/50 text-red-300 border border-red-500/40" title="Jailbrokens">
                                            ☠️ {entry.jailbrokensCount}
                                        </span>
                                    )}
                                    <span className="px-2 py-1 rounded bg-amber-950/40 text-yellow-300 border border-yellow-500/30" title="Golden Vinyls">
                                        💿 {entry.vinylsCount}
                                    </span>
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <span className="text-sm sm:text-base font-black font-mono text-yellow-300 block">
                                        {entry.score.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                                        PTS
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Load 10 More Collectors Button */}
            {visibleCount < filtered.length && (
                <div className="pt-2 pb-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => setVisibleCount(prev => Math.min(filtered.length, prev + 10))}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 border border-indigo-400/30 cursor-pointer"
                    >
                        <span>⬇️ Load 10 More Collectors</span>
                        <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded text-indigo-200">
                            ({displayedCollectors.length} of {filtered.length})
                        </span>
                    </button>
                    {filtered.length > displayedCollectors.length + 10 && (
                        <button
                            onClick={() => setVisibleCount(filtered.length)}
                            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-all border border-gray-700"
                        >
                            Show All ({filtered.length})
                        </button>
                    )}
                </div>
            )}

            {/* Formula Explanation Modal */}
            {showFormulaModal && (
                <div 
                    className="modal-overlay p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowFormulaModal(false);
                    }}
                >
                    <div className="bg-gray-900 border border-indigo-500/60 rounded-3xl p-6 max-w-lg w-full text-center relative shadow-2xl">
                        <button 
                            onClick={() => setShowFormulaModal(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>

                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-300 mx-auto flex items-center justify-center text-2xl mb-3">
                            📐
                        </div>
                        <h3 className="text-xl font-black text-white">How Player Rankings Work</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                            Every user is ranked cumulatively across collection size, chase pulls, rarity, and song popularity.
                        </p>

                        <div className="mt-5 space-y-3 text-left">
                            <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">🃏</span>
                                    <div>
                                        <p className="text-xs font-bold text-white">Cards in Collection</p>
                                        <p className="text-[11px] text-gray-400">Total volume of music gathered</p>
                                    </div>
                                </div>
                                <span className="font-mono font-black text-xs text-indigo-300">+12 pts / card</span>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-800/80 border border-purple-500/40 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">🌟</span>
                                    <div>
                                        <p className="text-xs font-bold text-purple-300">Mythics Pulled</p>
                                        <p className="text-[11px] text-gray-400">Rare holographic numbered masterworks</p>
                                    </div>
                                </div>
                                <span className="font-mono font-black text-xs text-purple-300">+450 pts / mythic</span>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-800/80 border border-red-500/50 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">☠️</span>
                                    <div>
                                        <p className="text-xs font-bold text-red-400">Jailbroken 1-of-1 Cards</p>
                                        <p className="text-[11px] text-gray-400">The most sought-after Grails in PackTunes</p>
                                    </div>
                                </div>
                                <span className="font-mono font-black text-xs text-red-300">+3,200 pts / jailbroken</span>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-800/80 border border-yellow-500/40 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">💿</span>
                                    <div>
                                        <p className="text-xs font-bold text-yellow-300">Golden Vinyls Crafted</p>
                                        <p className="text-[11px] text-gray-400">Complete albums mastered in Shiny</p>
                                    </div>
                                </div>
                                <span className="font-mono font-black text-xs text-yellow-300">+280 pts / vinyl</span>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-800/80 border border-cyan-500/40 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">🔥</span>
                                    <div>
                                        <p className="text-xs font-bold text-cyan-300">Song Popularity & Hype</p>
                                        <p className="text-[11px] text-gray-400">Global listener chart bonuses</p>
                                    </div>
                                </div>
                                <span className="font-mono font-black text-xs text-cyan-300">Up to +5,000 pts</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowFormulaModal(false)}
                            className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ChampionsView: React.FC = () => {
    const { recordLabels } = useContext(UserContext)!;
    const [selectedClan, setSelectedClan] = useState<RecordLabel | null>(null);

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
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {champions.map(({ label, trophy }) => (
                    <div 
                        key={`${label.id}-${trophy.eventId}`} 
                        onClick={() => setSelectedClan(label)}
                        className="iridescent-border-bg rounded-xl p-4 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-transform group shadow-lg"
                    >
                        <img src={label.pfpUrl} alt={label.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-900 mb-3 shadow" />
                        <h4 className="text-xl font-bold group-hover:text-indigo-300 transition-colors">{label.name}</h4>
                        <p className="text-sm text-gray-400 mt-2">Crowned champions of</p>
                        <p className="font-semibold text-indigo-300">{trophy.eventName}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(trophy.date).toLocaleDateString()}</p>
                        <span className="mt-3 text-xs text-indigo-400 font-semibold group-hover:underline">View Clan Members →</span>
                    </div>
                ))}
            </div>
            {selectedClan && <ClanDetailsModal label={selectedClan} onClose={() => setSelectedClan(null)} />}
        </>
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
    const [activeTab, setActiveTab] = useState<HallTab>('rankings');

    const renderContent = () => {
        switch(activeTab) {
            case 'rankings': return <Top100LeaderboardView />;
            case 'champions': return <ChampionsView />;
            case 'jailbroken': return <JailbrokenFindsView />;
            case 'records': return <RecordBreakersView />;
            default: return <Top100LeaderboardView />;
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <TrophyIcon className="w-16 h-16 text-yellow-300 mx-auto mb-2" />
                <h2 className="text-4xl font-bold">Hall of Fame</h2>
                <p className="text-gray-400 max-w-lg mx-auto">A monument to the greatest achievements, top 100 rankings, and rarest grails in PackTunes history.</p>
            </div>

            <div className="flex flex-wrap justify-center border-b border-gray-700 mb-6 gap-1">
                 <button onClick={() => setActiveTab('rankings')} className={`flex items-center gap-2 px-5 py-3 font-bold text-sm transition-colors ${activeTab === 'rankings' ? 'border-b-2 border-yellow-400 text-yellow-300' : 'text-gray-400 hover:text-white'}`}>
                    <TrophyIcon className="w-5 h-5 text-yellow-400"/> Top 100 Rankings
                 </button>
                 <button onClick={() => setActiveTab('champions')} className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-colors ${activeTab === 'champions' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <CrownIcon className="w-5 h-5 text-indigo-400"/> Champions
                 </button>
                 <button onClick={() => setActiveTab('jailbroken')} className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-colors ${activeTab === 'jailbroken' ? 'border-b-2 border-red-500 text-red-300' : 'text-gray-400 hover:text-white'}`}>
                    <DiamondIcon className="w-5 h-5 text-red-400"/> Jailbroken Finds
                 </button>
                 <button onClick={() => setActiveTab('records')} className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-colors ${activeTab === 'records' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <FireIcon className="w-5 h-5 text-orange-400"/> Record Breakers
                 </button>
            </div>
            
            {renderContent()}
        </div>
    );
};