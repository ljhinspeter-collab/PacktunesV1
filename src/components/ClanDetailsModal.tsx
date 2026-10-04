import React, { useState, useEffect, useContext, useMemo } from 'react';
import type { RecordLabel, User, Trophy } from '../types';
import { UserContext } from '../contexts/UserContext';
import { dataService } from '../services/dataService';
import { ProfileFrame } from './ProfileFrame';
import { 
    BuildingLibraryIcon, 
    UsersIcon, 
    TrophyIcon, 
    LockClosedIcon, 
    DiamondIcon, 
    RectangleStackIcon, 
    SparklesIcon, 
    XMarkIcon, 
    SearchIcon,
    CheckIcon,
    StarIcon
} from './icons';

interface ClanDetailsModalProps {
    label: RecordLabel;
    onClose: () => void;
    onViewUser?: (user: User) => void;
}

export const ClanDetailsModal: React.FC<ClanDetailsModalProps> = ({ label, onClose, onViewUser }) => {
    const { currentUser, joinLabel, requestToJoinLabel, leaveLabel, setViewingUser } = useContext(UserContext)!;
    const [activeTab, setActiveTab] = useState<'members' | 'trophies'>('members');
    const [members, setMembers] = useState<User[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const isMember = !!(currentUser && (label.memberIds ?? []).includes(currentUser.id));
    const isOwner = currentUser?.id === label.ownerId;
    const hasRequested = !!(currentUser?.pendingLabelRequests?.includes(label.id));
    const memberCount = (label.memberIds ?? []).length;
    const isFull = memberCount >= 25;

    useEffect(() => {
        let isMounted = true;
        setIsLoadingMembers(true);
        if (!label.memberIds || label.memberIds.length === 0) {
            setMembers([]);
            setIsLoadingMembers(false);
            return;
        }

        dataService.getUsersByIds(label.memberIds).then(profiles => {
            if (isMounted) {
                // Sort with owner/leader first, then by prestigeCount/collectionSize
                const sorted = (profiles || []).filter(Boolean).sort((a, b) => {
                    if (a.id === label.ownerId) return -1;
                    if (b.id === label.ownerId) return 1;
                    const aScore = (a.prestigeCount || 0) * 100 + (a.collectionSize || 0);
                    const bScore = (b.prestigeCount || 0) * 100 + (b.collectionSize || 0);
                    return bScore - aScore;
                });
                setMembers(sorted);
                setIsLoadingMembers(false);
            }
        }).catch(() => {
            if (isMounted) {
                setMembers([]);
                setIsLoadingMembers(false);
            }
        });

        return () => { isMounted = false; };
    }, [label.id, label.ownerId, label.memberIds]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const q = searchQuery.toLowerCase().trim();
        return members.filter(m => 
            (m.name || '').toLowerCase().includes(q) ||
            (m.bio || '').toLowerCase().includes(q)
        );
    }, [members, searchQuery]);

    const totalPrestige = useMemo(() => {
        return members.reduce((acc, m) => acc + (m.prestigeCount || 0), 0);
    }, [members]);

    const totalCards = useMemo(() => {
        return members.reduce((acc, m) => acc + (m.collectionSize || 0), 0);
    }, [members]);

    const handleMemberClick = (member: User) => {
        if (onViewUser) {
            onViewUser(member);
        } else if (setViewingUser) {
            setViewingUser(member);
        }
    };

    const handleJoinClick = async () => {
        if (isJoining || isFull || isMember) return;
        setIsJoining(true);
        try {
            if (label.joinType === 'open') {
                await joinLabel(label.id);
            } else {
                await requestToJoinLabel(label.id);
            }
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div 
                className="modal-content w-full max-w-2xl bg-gray-900 border border-gray-700/80 rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header Banner */}
                <div className="relative p-6 bg-gradient-to-b from-indigo-950/70 via-gray-900 to-gray-900 border-b border-gray-800">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title="Close"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        <div className="relative">
                            <img 
                                src={label.pfpUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150'} 
                                alt={label.name} 
                                className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-xl"
                            />
                            {label.joinType === 'request' && (
                                <div className="absolute -top-2 -right-2 p-1.5 bg-amber-600 text-white rounded-full shadow-md" title="Request to Join Required">
                                    <LockClosedIcon className="w-3.5 h-3.5" />
                                </div>
                            )}
                        </div>

                        <div className="flex-grow text-center sm:text-left min-w-0">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                                <h2 className="text-2xl sm:text-3xl font-black text-white truncate">{label.name || 'Unnamed Clan'}</h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    label.joinType === 'open' 
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}>
                                    {label.joinType === 'open' ? 'Open Clan' : 'Request to Join'}
                                </span>
                            </div>

                            <p className="text-sm text-gray-300 line-clamp-2 max-w-xl mb-4">
                                {label.description || 'No description provided.'}
                            </p>

                            {/* Clan Stats Bar */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-gray-300 bg-gray-800/60 py-2 px-4 rounded-xl border border-gray-700/50">
                                <div className="flex items-center gap-1.5 text-indigo-300">
                                    <UsersIcon className="w-4 h-4 text-indigo-400" />
                                    <span>{memberCount} / 25 Members</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-amber-300">
                                    <TrophyIcon className="w-4 h-4 text-amber-400" />
                                    <span>{(label.trophies || []).length} Trophies</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-yellow-300">
                                    <DiamondIcon className="w-4 h-4 text-yellow-400" />
                                    <span>{totalPrestige.toLocaleString()} Clan Prestige</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800 bg-gray-950/40 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'members'
                                ? 'border-b-2 border-indigo-500 text-white bg-indigo-950/20'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <UsersIcon className="w-4 h-4" />
                        Members ({memberCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('trophies')}
                        className={`flex-1 py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'trophies'
                                ? 'border-b-2 border-amber-500 text-white bg-amber-950/20'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <TrophyIcon className="w-4 h-4" />
                        Trophies & Accolades ({(label.trophies || []).length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4">
                    {activeTab === 'members' && (
                        <div>
                            {/* Search bar */}
                            <div className="relative mb-4">
                                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search clan members..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {isLoadingMembers ? (
                                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                    <p className="text-sm">Loading member roster...</p>
                                </div>
                            ) : filteredMembers.length === 0 ? (
                                <div className="py-12 text-center text-gray-400">
                                    {searchQuery ? `No members found matching "${searchQuery}"` : 'No members found in this clan.'}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredMembers.map((member, index) => {
                                        const isClanLeader = member.id === label.ownerId;
                                        const isCurrentUser = member.id === currentUser?.id;

                                        return (
                                            <div
                                                key={member.id}
                                                onClick={() => handleMemberClick(member)}
                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                                                    isCurrentUser
                                                        ? 'bg-indigo-950/40 border-indigo-500/50 hover:border-indigo-400'
                                                        : isClanLeader
                                                        ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/50'
                                                        : 'bg-gray-800/60 border-gray-700/60 hover:bg-gray-700/50 hover:border-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="relative flex-shrink-0">
                                                        {member.activeProfileFrame ? (
                                                            <ProfileFrame 
                                                                pfpUrl={member.pfpUrl || 'https://i.pravatar.cc/150'} 
                                                                frameUrl={member.activeProfileFrame.albumArtUrl} 
                                                                size="sm" 
                                                            />
                                                        ) : (
                                                            <img 
                                                                src={member.pfpUrl || 'https://i.pravatar.cc/150'} 
                                                                alt={member.name} 
                                                                className="w-11 h-11 rounded-full object-cover border border-gray-600" 
                                                            />
                                                        )}
                                                        {isClanLeader && (
                                                            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow" title="Clan Leader">
                                                                ★
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 truncate">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">
                                                                {member.name || 'Collector'}
                                                            </p>
                                                            {isClanLeader ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0">
                                                                    Leader
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-700 text-gray-300 flex-shrink-0">
                                                                    Member
                                                                </span>
                                                            )}
                                                            {isCurrentUser && (
                                                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-900/60 px-1.5 py-0.2 rounded">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        {member.bio && (
                                                            <p className="text-xs text-gray-400 truncate max-w-xs">{member.bio}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Member Stats */}
                                                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                                                    <div className="text-right hidden sm:block">
                                                        <div className="flex items-center justify-end gap-1 text-gray-300">
                                                            <RectangleStackIcon className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="font-semibold">{(member.collectionSize || 0).toLocaleString()}</span>
                                                        </div>
                                                        {(member.prestigeCount || 0) > 0 && (
                                                            <div className="flex items-center justify-end gap-1 text-yellow-400 font-bold text-[11px]">
                                                                <DiamondIcon className="w-3 h-3" />
                                                                <span>{member.prestigeCount} Prestige</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <span className="px-3 py-1 bg-gray-700 hover:bg-indigo-600 text-gray-200 hover:text-white rounded-lg text-xs font-semibold transition-colors">
                                                        Profile
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'trophies' && (
                        <div>
                            {(label.trophies || []).length === 0 ? (
                                <div className="py-16 text-center text-gray-400 space-y-2">
                                    <TrophyIcon className="w-12 h-12 mx-auto text-gray-600" />
                                    <p className="text-base font-semibold">No trophies earned yet</p>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        This clan will earn permanent trophies and bragging rights by placing in the top ranks during Clan Wars.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(label.trophies || []).map((trophy, index) => (
                                        <div 
                                            key={index} 
                                            className="p-4 rounded-xl bg-gray-800/80 border border-amber-500/30 flex items-center gap-4"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                                                <TrophyIcon className="w-6 h-6 text-amber-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-white text-sm truncate">{trophy.eventName}</p>
                                                <p className="text-xs text-amber-300 font-semibold">
                                                    Rank #{trophy.rank} Finish
                                                </p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    {new Date(trophy.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-5 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl font-semibold text-sm transition-colors"
                    >
                        Close
                    </button>

                    <div className="flex items-center gap-2">
                        {isMember ? (
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                                    <CheckIcon className="w-4 h-4" /> You are in this Clan
                                </span>
                                {!isOwner && (
                                    <button
                                        onClick={async () => {
                                            await leaveLabel();
                                            onClose();
                                        }}
                                        className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors"
                                    >
                                        Leave
                                    </button>
                                )}
                            </div>
                        ) : currentUser?.labelId ? (
                            <span className="text-xs text-gray-400 italic">
                                You are in another clan. Leave your clan to join this one.
                            </span>
                        ) : label.joinType === 'open' ? (
                            <button
                                onClick={handleJoinClick}
                                disabled={isFull || isJoining}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isFull ? 'Clan is Full' : isJoining ? 'Joining...' : 'Join Clan'}
                            </button>
                        ) : (
                            <button
                                onClick={handleJoinClick}
                                disabled={isFull || hasRequested || isJoining}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isFull ? 'Clan is Full' : hasRequested ? 'Request Sent' : isJoining ? 'Sending...' : 'Request to Join'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
