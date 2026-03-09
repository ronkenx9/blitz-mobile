import { useEffect, useState, useMemo } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { mainnetConnection, getGamePda, getPlayerStatePda, getRoundItemPda } from '../utils/anchor';
import idl from '../idl/blitz.json';
import type { Blitz } from '../idl/blitz';
import { useMobileWallet } from './useMobileWallet';

export type GameData = {
    gameId: anchor.BN;
    creator: anchor.web3.PublicKey;
    playerCount: number;
    players: anchor.web3.PublicKey[];
    eliminated: boolean[];
    currentRound: number;
    roundActive: boolean;
    roundStartTime: anchor.BN;
    currentItemValue: anchor.BN;
    status: any;
    winner: anchor.web3.PublicKey | null;
    totalPot: anchor.BN;
};

export type PlayerStateData = {
    gameId: anchor.BN;
    player: anchor.web3.PublicKey;
    score: anchor.BN;
    currentBid: anchor.BN | null;
    hasBidThisRound: boolean;
    isEliminated: boolean;
};

export type RoundItemData = {
    gameId: anchor.BN;
    round: number;
    itemNameIndex: number;
    marketValue: anchor.BN;
    winningBid: anchor.BN | null;
    winner: anchor.web3.PublicKey | null;
};

export function useBlitzGame(gameIdStr?: string) {
    const { account } = useMobileWallet();
    const [game, setGame] = useState<GameData | null>(null);
    const [myState, setMyState] = useState<PlayerStateData | null>(null);
    const [roundItem, setRoundItem] = useState<RoundItemData | null>(null);
    const [allPlayers, setAllPlayers] = useState<PlayerStateData[]>([]);
    const [error, setError] = useState<string | null>(null);

    const gameId = useMemo(() => {
        return gameIdStr ? new anchor.BN(gameIdStr) : null;
    }, [gameIdStr]);

    // Read-only provider for polling (no wallet needed)
    const mainnetProvider = useMemo(() => {
        const dummyWallet = {
            publicKey: anchor.web3.PublicKey.default,
            signTransaction: async () => { throw new Error("Read-only"); },
            signAllTransactions: async () => { throw new Error("Read-only"); }
        };
        return new anchor.AnchorProvider(mainnetConnection, dummyWallet as any, { commitment: 'confirmed' });
    }, []);

    const programMainnet = useMemo(() => {
        return new Program(idl as any, mainnetProvider);
    }, [mainnetProvider]);

    const refetch = async () => {
        if (!programMainnet || !gameId) return;
        try {
            const [gamePda] = getGamePda(gameId.toNumber());

            const accountInfo = await mainnetConnection.getAccountInfo(gamePda);
            if (!accountInfo) {
                setGame(null);
                setMyState(null);
                setAllPlayers([]);
                setError(null);
                return;
            }

            const gameData = await (programMainnet.account as any).game.fetch(gamePda);
            setGame(gameData as unknown as GameData);
            setError(null);

            // Fetch My State if connected
            if (account?.address) {
                const myPk = new anchor.web3.PublicKey(account.address);
                const [myStatePda] = getPlayerStatePda(gameId.toNumber(), myPk);
                try {
                    const myStateData = await (programMainnet.account as any).playerState.fetch(myStatePda);
                    setMyState(myStateData as unknown as PlayerStateData);
                } catch {
                    setMyState(null);
                }
            }

            // Fetch Round Item
            if (gameData.currentRound > 0) {
                const [roundItemPda] = getRoundItemPda(gameId.toNumber(), gameData.currentRound);
                try {
                    const riData = await (programMainnet.account as any).roundItem.fetch(roundItemPda);
                    setRoundItem(riData as unknown as RoundItemData);
                } catch {
                    setRoundItem(null);
                }
            }

            // Fetch All Players
            const players: PlayerStateData[] = [];
            for (let i = 0; i < gameData.playerCount; i++) {
                const playerPubkey = gameData.players[i];
                if (playerPubkey.equals(anchor.web3.PublicKey.default)) continue;
                const [pda] = getPlayerStatePda(gameId.toNumber(), playerPubkey);
                try {
                    const pData = await (programMainnet.account as any).playerState.fetch(pda);
                    players.push(pData as unknown as PlayerStateData);
                } catch {
                    // ignore
                }
            }
            setAllPlayers(players);

        } catch (err: any) {
            console.warn("Game fetch error:", err?.message?.slice(0, 80));
            setError(err?.message || "Unknown error");
        }
    };

    useEffect(() => {
        if (!programMainnet || !gameId) return;

        refetch();
        const interval = setInterval(refetch, 2000);
        return () => clearInterval(interval);
    }, [programMainnet, gameId, account]);

    return {
        game,
        myState,
        allPlayers,
        roundItem,
        error,
        refetch,
        programMainnet,
    };
}
