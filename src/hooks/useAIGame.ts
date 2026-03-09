import { useState, useCallback, useEffect } from 'react';
import { ITEM_NAMES } from '../utils/constants';

// ── AI BOT PERSONALITIES ──
export type BotPersonality = {
    name: string;
    emoji: string;
    style: string;
    quote: string;
    /** Given the true value, returns the bot's bid */
    bidStrategy: (trueValue: number, round: number, prevPlayerBid?: number) => number;
};

export const AI_BOTS: BotPersonality[] = [
    {
        name: 'CRYPTOKNIGHT',
        emoji: '🤖',
        style: 'AGGRESSIVE',
        quote: '"I\'d rather win than be right."',
        bidStrategy: (tv) => {
            // Overbids 5-25% above true value
            const mult = 1.05 + Math.random() * 0.20;
            return Math.round(tv * mult);
        },
    },
    {
        name: 'VOIDMAGE',
        emoji: '👾',
        style: 'CONSERVATIVE',
        quote: '"Patience is the ultimate weapon."',
        bidStrategy: (tv) => {
            // Bids 55-75% of true value
            const mult = 0.55 + Math.random() * 0.20;
            return Math.round(tv * mult);
        },
    },
    {
        name: 'SHADOWROGUE',
        emoji: '🕹️',
        style: 'WILDCARD',
        quote: '"Chaos is a ladder."',
        bidStrategy: (tv) => {
            // Random 20-160% of value
            const mult = 0.20 + Math.random() * 1.40;
            return Math.round(tv * mult);
        },
    },
    {
        name: 'IRONCLAD',
        emoji: '⚙️',
        style: 'CALCULATED',
        quote: '"Math doesn\'t lie."',
        bidStrategy: (tv) => {
            // Bids 85-105% of true value (close to fair)
            const mult = 0.85 + Math.random() * 0.20;
            return Math.round(tv * mult);
        },
    },
    {
        name: 'ORACLE',
        emoji: '🔮',
        style: 'ADAPTIVE',
        quote: '"I see through you."',
        bidStrategy: (tv, _round, prevPlayerBid) => {
            // Humanize: Add 15% random swing to oracle
            const jitter = 0.85 + Math.random() * 0.30;
            if (prevPlayerBid && prevPlayerBid > 0) {
                const delta = (Math.random() * 0.2 - 0.1);
                return Math.round(prevPlayerBid * (1 + delta) * jitter);
            }
            return Math.round(tv * jitter);
        },
    },
];

// ── PLAYER/BOT STATE ──
export type AIPlayerState = {
    name: string;
    emoji: string;
    isBot: boolean;
    isYou: boolean;
    xp: number; // For cumulative SOL display (actually score in lamports)
    score: number; // Current round delta or cumulative total
    currentBid: number;
    hasBid: boolean;
    isEliminated: boolean;
    style?: string;
    quote?: string;
};

export type AIRoundItem = {
    itemNameIndex: number;
    marketValue: number; // lamports
};

export type AIGamePhase = 'lobby' | 'bidding' | 'reveal' | 'gameover';

// ── SINGLETON STATE ──
let globalPlayers: AIPlayerState[] = [];
let globalCurrentRound = 0;
let globalRoundItem: AIRoundItem | null = null;
let globalGameStarted = false;
let globalGameOver = false;
let globalLastPlayerBid = 0;
let globalBotBidTimers: string[] = [];
let globalLastEliminated: string | null = null;
let globalIsResolved = false;
let listeners: Array<(s: any) => void> = [];

const notify = () => {
    const s = {
        players: globalPlayers,
        currentRound: globalCurrentRound,
        roundItem: globalRoundItem,
        gameStarted: globalGameStarted,
        gameOver: globalGameOver,
        botBidTimers: globalBotBidTimers,
        lastEliminated: globalLastEliminated,
        isResolved: globalIsResolved,
    };
    listeners.forEach(l => l(s));
};

// ── THE HOOK ──
export function useAIGame() {
    const [state, setState] = useState({
        players: globalPlayers,
        currentRound: globalCurrentRound,
        roundItem: globalRoundItem,
        gameStarted: globalGameStarted,
        gameOver: globalGameOver,
        botBidTimers: globalBotBidTimers,
        lastEliminated: globalLastEliminated,
        isResolved: globalIsResolved,
    });

    useEffect(() => {
        const l = (s: any) => setState({ ...s });
        listeners.push(l);
        return () => {
            listeners = listeners.filter(x => x !== l);
        };
    }, []);

    const totalRounds = 5;

    // Start a new round — generate random item
    const startRound = useCallback(() => {
        const itemIndex = Math.floor(Math.random() * ITEM_NAMES.length);
        const value = 10_000_000 + Math.floor(Math.random() * 90_000_000);

        globalRoundItem = { itemNameIndex: itemIndex, marketValue: value };
        globalCurrentRound += 1;
        globalBotBidTimers = [];
        globalLastEliminated = null;
        globalLastPlayerBid = 0;
        globalIsResolved = false;

        // Reset bids for all players
        globalPlayers = globalPlayers.map(p => ({
            ...p,
            currentBid: 0,
            hasBid: false,
        }));
        notify();
    }, []);

    // Create the AI game — instant
    const createAIGame = useCallback(() => {
        globalPlayers = [
            {
                name: 'YOU',
                emoji: '⚔️',
                isBot: false,
                isYou: true,
                xp: 0,
                score: 0,
                currentBid: 0,
                hasBid: false,
                isEliminated: false,
            },
            ...AI_BOTS.map(bot => ({
                name: bot.name,
                emoji: bot.emoji,
                isBot: true,
                isYou: false,
                xp: 0,
                score: 0,
                currentBid: 0,
                hasBid: false,
                isEliminated: false,
                style: bot.style,
                quote: bot.quote,
            })),
        ];
        globalCurrentRound = 0;
        globalGameStarted = true;
        globalGameOver = false;
        globalBotBidTimers = [];
        globalLastEliminated = null;
        startRound();
        notify();
    }, [startRound]);

    // Player submits their bid
    const submitPlayerBid = useCallback((bidLamports: number) => {
        console.log(`[AI] Submitting Player Bid: ${bidLamports}`);
        globalLastPlayerBid = bidLamports;
        globalPlayers = globalPlayers.map(p => {
            if (p.isYou) {
                console.log(`[AI] Found Player to update bid: ${p.name}`);
                return { ...p, currentBid: bidLamports, hasBid: true };
            }
            return p;
        });
        notify();
    }, []);

    // AI bots submit their bids (called with staggered delays from the UI)
    const submitBotBids = useCallback(() => {
        if (!globalRoundItem) return;

        const tv = globalRoundItem.marketValue;
        const newPlayers = [...globalPlayers];

        for (let i = 0; i < newPlayers.length; i++) {
            const p = newPlayers[i];
            if (!p.isBot || p.isEliminated) continue;

            const bot = AI_BOTS.find(b => b.name === p.name);
            if (!bot) continue;

            const bid = bot.bidStrategy(tv, globalCurrentRound, globalLastPlayerBid);
            // Increased range for bot bids 0.1x to 2.0x
            const clampedBid = Math.max(tv * 0.1, Math.min(tv * 2.0, bid));
            newPlayers[i] = { ...p, currentBid: clampedBid, hasBid: true };
        }

        globalPlayers = newPlayers;
        notify();
    }, []);

    // Resolve the round — find winner, apply Winner's Curse, eliminate lowest
    const resolveRound = useCallback(() => {
        if (!globalRoundItem || globalIsResolved) {
            console.log("[AI] resolveRound skipped: already resolved or no item");
            return;
        }

        const tv = globalRoundItem.marketValue;
        let updated = [...globalPlayers];

        console.log(`[AI] Resolving Winner's Curse. True Value: ${tv}`);

        // 1. Find highest bidder among non-eliminated
        let highestBid = 0;
        let highestIdx = -1;

        for (let i = 0; i < updated.length; i++) {
            if (updated[i].isEliminated) continue;
            if (updated[i].currentBid > highestBid) {
                highestBid = updated[i].currentBid;
                highestIdx = i;
            }
        }

        // Reset current round scores
        updated = updated.map(p => ({ ...p, score: 0 }));

        // 2. Apply Winner's Curse ONLY to winner
        if (highestIdx >= 0) {
            const delta = tv - highestBid; // lamports (positive = underbid, negative = overbid)
            updated[highestIdx] = {
                ...updated[highestIdx],
                score: delta,
                xp: updated[highestIdx].xp + delta
            };
            console.log(`[AI] Winner: ${updated[highestIdx].name} | Delta: ${delta}`);
        }

        // 3. Find lowest cumulative score (xp) among non-eliminated
        if (globalCurrentRound > 1) { // Grace period for Round 1
            let lowestScore = Infinity;
            let lowestIdx = -1;

            for (let i = 0; i < updated.length; i++) {
                if (updated[i].isEliminated) continue;
                if (updated[i].xp < lowestScore) {
                    lowestScore = updated[i].xp;
                    lowestIdx = i;
                }
            }

            if (lowestIdx >= 0) {
                globalLastEliminated = updated[lowestIdx].name;
                updated[lowestIdx] = { ...updated[lowestIdx], isEliminated: true };
                console.log(`[AI] Eliminated: ${updated[lowestIdx].name}`);
            }
        }

        globalPlayers = updated;
        globalIsResolved = true;

        // 4. Check if game is over
        const remaining = updated.filter(p => !p.isEliminated);
        if (remaining.length <= 1 || globalCurrentRound >= totalRounds) {
            globalGameOver = true;
        }

        notify();
    }, [totalRounds]);

    const autoResolveGame = useCallback(async () => {
        while (!globalGameOver) {
            startRound();
            // Stagger for visual feedback
            await new Promise(r => setTimeout(r, 600));
            submitBotBids();
            await new Promise(r => setTimeout(r, 600));
            resolveRound();
            await new Promise(r => setTimeout(r, 1000));
        }
        notify();
    }, [startRound, submitBotBids, resolveRound]);

    // Get the winner
    const winner = state.gameOver
        ? [...state.players].sort((a, b) => b.xp - a.xp)[0] || null
        : null;

    return {
        players: state.players,
        currentRound: state.currentRound,
        totalRounds,
        roundItem: state.roundItem,
        gameStarted: state.gameStarted,
        gameOver: state.gameOver,
        winner,
        createAIGame,
        startRound,
        submitPlayerBid,
        submitBotBids,
        resolveRound,
        autoResolveGame,
        isResolved: state.isResolved,
        botBidTimers: state.botBidTimers,
        lastEliminated: state.lastEliminated,
        setBotBidTimers: (timers: string[]) => {
            globalBotBidTimers = timers;
            notify();
        },
    };
}
