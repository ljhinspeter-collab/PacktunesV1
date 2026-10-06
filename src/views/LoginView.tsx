import React, { useState, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { VinylIcon } from '../components/icons';
import { dataService } from '../services/dataService';

type AuthMode = 'signIn' | 'signUp';

export const LoginView: React.FC = () => {
    const { signIn, signUp, continueAsGuest, users } = useContext(UserContext)!;
    const [mode, setMode] = useState<AuthMode>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            if (mode === 'signIn') {
                await signIn(email, password);
            } else {
                const trimmedName = name.trim();
                if (!trimmedName) {
                    setError("Please enter a username.");
                    setIsLoading(false);
                    return;
                }

                // Check username uniqueness
                const isTakenLocally = (users || []).some(u => (u.name || '').trim().toLowerCase() === trimmedName.toLowerCase());
                if (isTakenLocally) {
                    setError("Username taken. Please choose a different username.");
                    setIsLoading(false);
                    return;
                }

                const isTakenRemote = await dataService.isUsernameTaken(trimmedName);
                if (isTakenRemote) {
                    setError("Username taken. Please choose a different username.");
                    setIsLoading(false);
                    return;
                }

                await signUp(email, password, trimmedName, bio);
            }
        } catch (authError: any) {
            let friendlyMessage = "An authentication error occurred. Please try again.";
            if (authError.code) {
                switch (authError.code) {
                    case 'auth/email-already-in-use':
                        friendlyMessage = "This email is already registered. Please try signing in instead.";
                        break;
                    case 'auth/wrong-password':
                    case 'auth/invalid-credential':
                        friendlyMessage = "Incorrect password or email. Please try again.";
                        break;
                    case 'auth/user-not-found':
                        friendlyMessage = "No account found with this email. Please sign up first.";
                        break;
                    case 'auth/invalid-email':
                        friendlyMessage = "Please enter a valid email address.";
                        break;
                    case 'auth/weak-password':
                        friendlyMessage = "Password should be at least 6 characters long.";
                        break;
                    case 'auth/unauthorized-domain':
                        friendlyMessage = "This web domain is not yet listed in Firebase Authorized Domains. Use 'Continue as Guest' below to play immediately!";
                        break;
                    case 'auth/operation-not-allowed':
                        friendlyMessage = "Email sign-in is disabled in Firebase Console. Use 'Continue as Guest' below to play immediately!";
                        break;
                    case 'auth/network-request-failed':
                        friendlyMessage = "Network error connecting to Firebase. Use 'Continue as Guest' below to play immediately!";
                        break;
                    default:
                        // Keep the original message for unexpected errors
                        friendlyMessage = authError.message;
                        break;
                }
            }
            setError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4">
            <div className="mb-8 text-center">
                <h1 className="text-5xl font-bold tracking-tight text-white flex items-center justify-center gap-4">
                  <VinylIcon className="w-12 h-12 text-indigo-400" />
                  PackTunes
                </h1>
                 <p className="mt-3 text-lg text-gray-400">Your cloud-synced music collection.</p>
            </div>
            
            <div className="w-full max-w-sm bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-center border-b border-gray-600 mb-6">
                    <button onClick={() => { setMode('signIn'); setError(null); }} className={`w-1/2 pb-3 font-semibold text-center ${mode === 'signIn' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}>Sign In</button>
                    <button onClick={() => { setMode('signUp'); setError(null); }} className={`w-1/2 pb-3 font-semibold text-center ${mode === 'signUp' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}>Sign Up</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signUp' && (
                        <>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Display Name"
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                required
                            />
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Bio (optional)"
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                rows={2}
                            />
                        </>
                    )}
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                        required
                    />
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-lg transition-colors shadow-lg disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {isLoading ? (
                             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                            mode === 'signIn' ? 'Sign In' : 'Create Account'
                        )}
                    </button>

                    {continueAsGuest && (
                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={continueAsGuest}
                                className="w-full py-2.5 px-4 bg-gray-700/60 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg text-sm border border-gray-600 transition-colors"
                            >
                                Continue as Guest (Instant Access)
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};