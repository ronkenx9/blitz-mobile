import { useRef } from 'react';
import { PublicKey, SystemProgram, Transaction, Connection } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
    getAuthToken,
    waitUntilPermissionActive
} from "@magicblock-labs/ephemeral-rollups-sdk";
import {
    mainnetConnection,
    getGamePda,
    getPlayerStatePda,
    getVaultPda,
    getPermissionPda,
    getRoundItemPda,
    BLITZ_PROGRAM_ID
} from '../utils/anchor';
import {
    TEE_VALIDATOR,
    TEE_URL,
    PERMISSION_PROGRAM_ID,
    VRF_DEFAULT_QUEUE,
    VRF_PROGRAM_ID,
    DELEGATION_PROGRAM_ID,
    MAGIC_PROGRAM_ID,
    MAGIC_CONTEXT_ID
} from '../utils/constants';
import idl from '../idl/blitz.json';
import type { Blitz } from '../idl/blitz';
import { useMobileWallet } from './useMobileWallet';

export function useBlitzActions(gameIdNumber: number) {
    const { account, signAndSendTransactions, signMessage, connection } = useMobileWallet();
    const teeAuthTokenRef = useRef<string | null>(null);

    const publicKey = account ? new PublicKey(account.address) : null;

    const getAuthTokenCached = async () => {
        if (!publicKey) throw new Error('Wallet not connected');

        if (teeAuthTokenRef.current) return teeAuthTokenRef.current;

        // ephe-sdk getAuthToken - This will trigger the signMessage prompt via the SDK
        const auth = await getAuthToken(TEE_URL, publicKey, signMessage as any);
        teeAuthTokenRef.current = auth.token;
        return auth.token;
    };

    const getProgram = (conn: Connection = mainnetConnection) => {
        if (!publicKey) throw new Error("Wallet not connected");
        // Create a minimal wallet adapter for Anchor
        const walletAdapter = {
            publicKey,
            signTransaction: async (tx: Transaction) => tx, // will be signed during send
            signAllTransactions: async (txs: Transaction[]) => txs,
        };
        const provider = new anchor.AnchorProvider(conn, walletAdapter as any, { commitment: 'confirmed' });
        return new Program(idl as any, provider);
    };

    const getTeeProgram = async () => {
        if (!publicKey) throw new Error("Wallet not connected");

        const token = await getAuthTokenCached();

        const teeEndpoint = `${TEE_URL}?token=${token}`;
        const teeConn = new Connection(teeEndpoint, {
            wsEndpoint: `wss://tee.magicblock.app?token=${token}`,
            commitment: 'confirmed'
        });

        const walletAdapter = {
            publicKey,
            signTransaction: async (tx: Transaction) => tx,
            signAllTransactions: async (txs: Transaction[]) => txs,
        };
        const provider = new anchor.AnchorProvider(teeConn, walletAdapter as any, { commitment: 'confirmed' });
        return new Program(idl as any, provider);
    };

    const buildAndSend = async (tx: Transaction, conn: Connection) => {
        if (!publicKey) throw new Error("Wallet not connected");
        const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const slot = await conn.getSlot();
        const sigs = await signAndSendTransactions([tx as any], slot);
        return sigs[0];
    };

    const createGame = async () => {
        const program = getProgram();
        const gameId = new anchor.BN(gameIdNumber);
        const [gamePda] = getGamePda(gameIdNumber);
        const [playerStatePda] = getPlayerStatePda(gameIdNumber, publicKey!);
        const [vaultPda] = getVaultPda(gameIdNumber);

        const tx = await program.methods.createGame(gameId)
            .accounts({
                game: gamePda,
                playerState: playerStatePda,
                vault: vaultPda,
                creator: publicKey!,
                systemProgram: SystemProgram.programId,
            } as any)
            .transaction();

        return buildAndSend(tx, mainnetConnection);
    };

    const joinGame = async () => {
        const program = getProgram();
        const gameId = new anchor.BN(gameIdNumber);
        const [gamePda] = getGamePda(gameIdNumber);
        const [playerStatePda] = getPlayerStatePda(gameIdNumber, publicKey!);
        const [vaultPda] = getVaultPda(gameIdNumber);

        const tx = await program.methods.joinGame(gameId)
            .accounts({
                game: gamePda,
                playerState: playerStatePda,
                vault: vaultPda,
                player: publicKey!,
                systemProgram: SystemProgram.programId,
            } as any)
            .transaction();

        return buildAndSend(tx, mainnetConnection);
    };

    const delegateGame = async () => {
        const program = getProgram();
        const [gamePda] = getGamePda(gameIdNumber);
        const validator = new PublicKey(TEE_VALIDATOR);

        const tx1 = await program.methods.delegateGame()
            .accounts({
                payer: publicKey!,
                validator,
                game: gamePda,
                bufferGame: PublicKey.findProgramAddressSync(
                    [Buffer.from('buffer'), gamePda.toBuffer()],
                    new PublicKey(DELEGATION_PROGRAM_ID))[0],
                delegationRecordGame: PublicKey.findProgramAddressSync(
                    [Buffer.from('delegation'), gamePda.toBuffer()],
                    new PublicKey(DELEGATION_PROGRAM_ID))[0],
                delegationMetadataGame: PublicKey.findProgramAddressSync(
                    [Buffer.from('delegation-metadata'), gamePda.toBuffer()],
                    new PublicKey(DELEGATION_PROGRAM_ID))[0],
                ownerProgram: BLITZ_PROGRAM_ID,
                delegationProgram: new PublicKey(DELEGATION_PROGRAM_ID),
                systemProgram: SystemProgram.programId,
            } as any)
            .transaction();
        await buildAndSend(tx1, mainnetConnection);
    };

    const delegatePlayerState = async () => {
        const program = getProgram();
        const gameId = new anchor.BN(gameIdNumber);
        const [playerStatePda] = getPlayerStatePda(gameIdNumber, publicKey!);
        const permissionPda = getPermissionPda(playerStatePda);
        const validator = new PublicKey(TEE_VALIDATOR);

        const tx2 = await program.methods.delegatePlayerState(gameId)
            .accounts({
                payer: publicKey!,
                validator,
                playerState: playerStatePda,
                bufferPlayerState: PublicKey.findProgramAddressSync(
                    [Buffer.from('buffer'), playerStatePda.toBuffer()],
                    new PublicKey(DELEGATION_PROGRAM_ID))[0],
                delegationRecordPlayerState: PublicKey.findProgramAddressSync(
                    [Buffer.from('delegation'), playerStatePda.toBuffer()],
                    new PublicKey(DELEGATION_PROGRAM_ID))[0],
                delegationMetadataPlayerState: PublicKey.findProgramAddressSync(
                    [Buffer.from('delegation-metadata'), playerStatePda.toBuffer()],
                    new PublicKey(DELEGATION_PROGRAM_ID))[0],
                ownerProgram: BLITZ_PROGRAM_ID,
                delegationProgram: new PublicKey(DELEGATION_PROGRAM_ID),
                systemProgram: SystemProgram.programId,
            } as any)
            .transaction();
        await buildAndSend(tx2, mainnetConnection);

        const tx3 = await program.methods.createBidPermission(gameId)
            .accounts({
                playerState: playerStatePda,
                permission: permissionPda,
                player: publicKey!,
                permissionProgram: new PublicKey(PERMISSION_PROGRAM_ID),
                systemProgram: SystemProgram.programId,
            } as any)
            .transaction();
        await buildAndSend(tx3, mainnetConnection);

        await waitUntilPermissionActive(TEE_URL, playerStatePda);
    };

    const startRound = async (clientSeed: number = Math.floor(Math.random() * 255)) => {
        const program = await getTeeProgram();
        const [gamePda] = getGamePda(gameIdNumber);

        const gameAcc = await (program.account as any).game.fetch(gamePda);
        const [roundItemPda] = getRoundItemPda(gameIdNumber, gameAcc.currentRound + 1);

        const tx = await program.methods.startRound(clientSeed)
            .accounts({
                payer: publicKey!,
                game: gamePda,
                roundItem: roundItemPda,
                oracleQueue: new PublicKey(VRF_DEFAULT_QUEUE),
                systemProgram: SystemProgram.programId,
                programIdentity: PublicKey.findProgramAddressSync([Buffer.from("identity")], new PublicKey(VRF_PROGRAM_ID))[0],
                vrfProgram: new PublicKey(VRF_PROGRAM_ID),
                slotHashes: new PublicKey("SysvarS1otHashes111111111111111111111111111"),
            } as any)
            .transaction();

        return buildAndSend(tx, program.provider.connection as Connection);
    };

    const submitBid = async (lamports: number) => {
        const program = await getTeeProgram();
        const gameId = new anchor.BN(gameIdNumber);
        const [gamePda] = getGamePda(gameIdNumber);
        const [playerStatePda] = getPlayerStatePda(gameIdNumber, publicKey!);

        const tx = await program.methods.submitBid(gameId, new anchor.BN(lamports))
            .accounts({
                game: gamePda,
                playerState: playerStatePda,
                player: publicKey!,
            } as any)
            .transaction();

        return buildAndSend(tx, program.provider.connection as Connection);
    };

    const resolveRound = async () => {
        const program = await getTeeProgram();
        const gameId = new anchor.BN(gameIdNumber);
        const [gamePda] = getGamePda(gameIdNumber);

        const gameAcc = await (program.account as any).game.fetch(gamePda);
        const [roundItemPda] = getRoundItemPda(gameIdNumber, gameAcc.currentRound);

        const playerStates = gameAcc.players
            .filter((p: PublicKey) => !p.equals(PublicKey.default))
            .map((p: PublicKey) => ({
                pubkey: getPlayerStatePda(gameIdNumber, p)[0],
                isSigner: false,
                isWritable: true,
            }));

        const tx = await program.methods.resolveRound(gameId)
            .accounts({
                game: gamePda,
                roundItem: roundItemPda,
                payer: publicKey!,
            } as any)
            .remainingAccounts(playerStates)
            .transaction();

        return buildAndSend(tx, program.provider.connection as Connection);
    };

    const revealRoundBids = async () => {
        const program = await getTeeProgram();
        const teeConn = program.provider.connection as Connection;
        const gameId = new anchor.BN(gameIdNumber);
        const [gamePda] = getGamePda(gameIdNumber);

        const gameAcc = await (program.account as any).game.fetch(gamePda);

        const playerStatePdas = gameAcc.players
            .filter((pk: PublicKey) => !pk.equals(PublicKey.default))
            .map((pk: PublicKey) => ({
                pubkey: getPlayerStatePda(gameIdNumber, pk)[0],
                isSigner: false,
                isWritable: true,
            }));

        const firstPlayerPda = playerStatePdas[0]?.pubkey;
        if (!firstPlayerPda) throw new Error('No players found in game');
        const permissionPda = getPermissionPda(firstPlayerPda);

        const tx = await program.methods
            .revealRoundPermissions(gameId)
            .accounts({
                permission: permissionPda,
                permissionProgram: new PublicKey(PERMISSION_PROGRAM_ID),
                payer: publicKey!,
            } as any)
            .remainingAccounts(playerStatePdas)
            .transaction();

        return buildAndSend(tx, teeConn);
    };

    const settleGame = async () => {
        const program = await getTeeProgram();
        const [gamePda] = getGamePda(gameIdNumber);
        const [vaultPda] = getVaultPda(gameIdNumber);

        const gameAccount = await (program.account as any).game.fetch(gamePda);
        const winner = gameAccount.winner;
        if (!winner) throw new Error("No winner decided yet");

        const tx = await program.methods.settleGame()
            .accounts({
                game: gamePda,
                vault: vaultPda,
                winner: winner,
                payer: publicKey!,
                magicProgram: new PublicKey(MAGIC_PROGRAM_ID),
                magicContext: new PublicKey(MAGIC_CONTEXT_ID),
            } as any)
            .transaction();

        return buildAndSend(tx, program.provider.connection as Connection);
    };

    return {
        createGame,
        joinGame,
        delegateGame,
        delegatePlayerState,
        getAuthTokenCached,
        startRound,
        submitBid,
        resolveRound,
        revealRoundBids,
        settleGame
    };
}
