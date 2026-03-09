import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { APP_IDENTITY } from '../utils/constants';

export type PlayerProfile = {
    name: string;
    wins: number;
    gamesPlayed: number;
    bestScore: number;    // in lamports
    totalScore: number;
    lastPlayed: number;   // timestamp
    signature?: string;   // Identity proof
    verified?: boolean;
};

export const DEFAULT_PROFILE: PlayerProfile = {
    name: 'ANON',
    wins: 0,
    gamesPlayed: 0,
    bestScore: 0,
    totalScore: 0,
    lastPlayed: 0,
    verified: false,
};

export const PROFILE_KEY = 'blitz:player:profile';

const HISTORY_KEY = 'blitz:scores:history';

export type HistoryItem = {
    name: string;
    score: number;
    timestamp: number;
};

export function usePlayerProfile() {
    const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
    const [loading, setLoading] = useState(true);

    // Load from storage on mount
    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(PROFILE_KEY);
                if (raw) {
                    setProfile(JSON.parse(raw));
                }
            } catch (e) {
                console.warn('Profile load failed:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const recordGame = useCallback(async (won: boolean, score: number) => {
        try {
            // 1. Update Profile
            const raw = await AsyncStorage.getItem(PROFILE_KEY);
            const current = raw ? JSON.parse(raw) : DEFAULT_PROFILE;
            const updated: PlayerProfile = {
                ...current,
                gamesPlayed: current.gamesPlayed + 1,
                wins: current.wins + (won ? 1 : 0),
                bestScore: Math.max(current.bestScore, score),
                totalScore: current.totalScore + score,
                lastPlayed: Date.now(),
            };
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
            setProfile(updated);

            // 2. Update History (Hall of Fame)
            const rawHist = await AsyncStorage.getItem(HISTORY_KEY);
            let history: HistoryItem[] = rawHist ? JSON.parse(rawHist) : [];
            history.push({ name: updated.name, score, timestamp: Date.now() });
            // Keep only top 5 unique scores or just top 5? User said "top 5 scores"
            history.sort((a, b) => b.score - a.score);
            history = history.slice(0, 5);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.warn('recordGame failed:', e);
        }
    }, []);

    const setName = useCallback(async (name: string) => {
        try {
            const cleanName = name.toUpperCase().trim().slice(0, 12);
            if (!cleanName) return;

            const message = `BLITZ:player:${cleanName}:${Date.now()}`;
            const bytes = new TextEncoder().encode(message);

            let signature = '';
            await transact(async (wallet) => {
                const auth = await wallet.authorize({
                    chain: 'solana:devnet',
                    identity: APP_IDENTITY,
                });
                const result = await wallet.signMessages({
                    addresses: [auth.accounts[0].address],
                    payloads: [bytes],
                });
                // result[0] is the signature Uint8Array
                signature = Buffer.from(result[0]).toString('base64');
            });

            const raw = await AsyncStorage.getItem(PROFILE_KEY);
            const current = raw ? JSON.parse(raw) : DEFAULT_PROFILE;
            const updated = {
                ...current,
                name: cleanName,
                signature,
                verified: !!signature
            };
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
            setProfile(updated);
        } catch (e) {
            console.warn('setName failed:', e);
            throw e; // Rethrow to handle in UI
        }
    }, []);

    // Utility to get profile (PDA helper kept for interface compatibility if needed, but no longer uses PDA)
    const getProfilePda = useCallback(() => null, []);

    // Mocking refetch
    const refetch = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(PROFILE_KEY);
            if (raw) setProfile(JSON.parse(raw));
        } catch (e) { }
    }, []);

    return { profile, loading, recordGame, setName, getProfilePda, refetch };
}

export function useLeaderboard() {
    const [leaders, setLeaders] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaders = useCallback(async () => {
        try {
            setLoading(true);
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            if (raw) {
                setLeaders(JSON.parse(raw));
            }
        } catch (e) {
            console.warn('Leaderboard fetch failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaders();
    }, [fetchLeaders]);

    return { leaders, loading, refetch: fetchLeaders };
}
