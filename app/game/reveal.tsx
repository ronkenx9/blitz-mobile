import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useBlitzGame, PlayerStateData } from '../../src/hooks/useBlitzGame';
import { useBlitzActions } from '../../src/hooks/useBlitzActions';
import { useMobileWallet } from '../../src/hooks/useMobileWallet';
import { useAIGame, AIPlayerState } from '../../src/hooks/useAIGame';
import { THEME } from '../../src/theme';
import { PixelBox } from '../../src/components/ArcadeUI';


export default function RevealScreen() {
    const { id: gameIdStr, mode } = useLocalSearchParams<{ id: string, mode: 'ai' | 'pvp' }>();
    const { game, roundItem: pvpRoundItem, allPlayers } = useBlitzGame(gameIdStr);
    const { account } = useMobileWallet();
    const aiGame = useAIGame();

    const isAi = mode === 'ai';
    const roundItem = isAi ? aiGame.roundItem : pvpRoundItem;
    const players = isAi ? aiGame.players : [];

    // Resolve AI round on load
    useEffect(() => {
        if (isAi && aiGame.gameStarted && !aiGame.gameOver) {
            console.log("[Reveal] Triggering aiGame.resolveRound()");
            aiGame.resolveRound();
        }
    }, []);

    // If player is eliminated, auto-resolve the rest of the game smoothly
    useEffect(() => {
        if (isAi && aiGame.gameStarted) {
            const me = aiGame.players.find(p => p.isYou);
            if (me?.isEliminated && !aiGame.gameOver) {
                const runAsync = async () => {
                    await new Promise(r => setTimeout(r, 2000)); // Let user digest elimination
                    await aiGame.autoResolveGame();
                    router.replace({ pathname: '/game/gameover', params: { id: gameIdStr, mode: 'ai' } });
                };
                runAsync();
            }
        }
    }, [aiGame.players, aiGame.gameOver]);

    const pvpPlayers = allPlayers.map((p: PlayerStateData) => ({
        name: p.player.toBase58().slice(0, 4) + "..." + p.player.toBase58().slice(-4),
        emoji: "👤",
        currentBid: p.currentBid?.toNumber() || 0,
        isYou: p.player.toBase58() === account?.address?.toString(),
        xp: p.score.toNumber(),
        isEliminated: p.isEliminated
    }));

    const activePlayers = isAi ? players : pvpPlayers;
    const sortedPlayers = [...activePlayers].sort((a, b) => b.currentBid - a.currentBid);
    const highestBid = Math.max(...activePlayers.map(p => p.currentBid), 0);
    const tv = roundItem?.marketValue ?
        (typeof roundItem.marketValue === 'number' ? roundItem.marketValue : (roundItem.marketValue as any).toNumber())
        : 0;

    const handleNext = () => {
        if (isAi) {
            if (aiGame.gameOver) {
                router.push({ pathname: '/game/gameover', params: { id: gameIdStr, mode: 'ai' } });
            } else {
                aiGame.startRound();
                router.push({ pathname: '/game/bidding', params: { id: gameIdStr, mode: 'ai' } });
            }
        } else {
            // PVP mode: transition is based on chain data, but allow manual jump to next round if available
            router.push({ pathname: '/game/bidding', params: { id: gameIdStr, mode: 'pvp' } });
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.revealHeader}>
                    <Text style={styles.revealTitle}>⚡ BIDS REVEALED ⚡</Text>
                    <Text style={styles.revealItem}>💎 {roundItem ? `ITEM #${roundItem.itemNameIndex}` : "SOLANA DIAMOND"}</Text>
                    <Text style={styles.revealTrue}>
                        TRUE VALUE: <Text style={styles.greenText}>
                            ◎ {(tv / 1e9).toFixed(3)}
                        </Text>
                    </Text>
                </View>

                <Text style={styles.sectionLabel}>👁 ROUND {isAi ? Math.max(1, aiGame.currentRound) : (game?.currentRound || 1)} RESULTS</Text>
                <View style={styles.revealCards}>
                    {sortedPlayers.length > 0 ? sortedPlayers.map((p, i) => {
                        const isWinner = p.currentBid === highestBid && p.currentBid > 0;
                        const accuracy = tv > 0 ? (1 - Math.abs(tv - p.currentBid) / tv) : 0;

                        return (
                            <View key={i} style={[
                                styles.revCard,
                                isWinner && styles.revCardWinner,
                                p.isYou && styles.revCardYou,
                                p.isEliminated && styles.revCardElim
                            ]}>
                                <View style={styles.revRankContainer}>
                                    <Text style={styles.revRank}>{isWinner ? "👑" : p.isEliminated ? "✝" : i + 1}</Text>
                                </View>
                                <Text style={styles.revEmoji}>{p.emoji}</Text>
                                <View style={styles.revInfo}>
                                    <Text style={styles.revName}>{p.name}{p.isYou ? " ✨" : ""}</Text>
                                    <Text style={styles.revBid}>{p.currentBid === 0 ? "FAILED" : `◎ ${(p.currentBid / 1e9).toFixed(3)}`}</Text>
                                </View>
                                <View>
                                    {isWinner ? (
                                        <Text style={[styles.revDelta, styles.pos]}>
                                            +{Math.round(accuracy * 100)}% ACC
                                        </Text>
                                    ) : (
                                        <Text style={styles.revDeltaAlt}>{p.isEliminated ? "💀 ELIM" : "—"}</Text>
                                    )}
                                </View>
                            </View>
                        );
                    }) : (
                        <Text style={styles.revealTrue}>Syncing PVP data...</Text>
                    )}
                </View>

                {isAi && aiGame.lastEliminated && (
                    <View style={styles.elimBanner}>
                        <Text style={styles.elimBannerText}>💀 {aiGame.lastEliminated} ELIMINATED</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={handleNext}
                >
                    <View style={styles.corner} />
                    <Text style={styles.nextBtnText}>
                        {isAi && aiGame.gameOver ? "🏆 FINAL RESULTS →" : "⚔ NEXT ROUND →"}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 40,
        paddingBottom: 60,
    },
    revealHeader: {
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    revealTitle: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 11,
        color: THEME.colors.gold,
        letterSpacing: 2,
        textShadowColor: 'rgba(232,184,75,0.7)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },
    revealItem: {
        fontFamily: THEME.fonts.vt,
        fontSize: 18,
        color: THEME.colors.text,
        letterSpacing: 2,
        marginTop: 6,
    },
    revealTrue: {
        fontFamily: THEME.fonts.vt,
        fontSize: 15,
        color: THEME.colors.dim,
        marginTop: 2,
    },
    greenText: {
        color: THEME.colors.green,
    },
    sectionLabel: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 7,
        color: THEME.colors.dim,
        letterSpacing: 2,
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 8,
    },
    revealCards: {
        paddingHorizontal: 16,
        gap: 8,
    },
    revCard: {
        backgroundColor: THEME.colors.panel2,
        borderWidth: 1.5,
        borderColor: THEME.colors.border,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    revCardWinner: {
        borderColor: THEME.colors.gold,
        backgroundColor: 'rgba(232,184,75,0.06)',
    },
    revCardYou: {
        borderLeftWidth: 4,
        borderLeftColor: THEME.colors.purple,
    },
    revCardElim: {
        opacity: 0.45,
        borderColor: 'rgba(196,30,58,0.3)',
    },
    revRankContainer: {
        width: 24,
    },
    revRank: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 10,
        color: THEME.colors.gold,
    },
    revEmoji: {
        fontSize: 20,
        marginHorizontal: 10,
    },
    revInfo: {
        flex: 1,
    },
    revName: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 6,
        color: THEME.colors.text,
        letterSpacing: 0.5,
    },
    revBid: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.blue,
        marginTop: 2,
    },
    revDelta: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
    },
    revDeltaAlt: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.dim,
    },
    pos: { color: THEME.colors.green },
    neg: { color: THEME.colors.crimson },
    elimBanner: {
        backgroundColor: 'rgba(196,30,58,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.3)',
        marginHorizontal: 16,
        padding: 10,
        marginTop: 16,
        alignItems: 'center',
    },
    elimBannerText: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.crimson,
        letterSpacing: 2,
    },
    nextBtn: {
        backgroundColor: 'rgba(153,69,255,0.15)',
        borderWidth: 1.5,
        borderColor: THEME.colors.purple,
        marginHorizontal: 16,
        padding: 14,
        marginTop: 20,
        alignItems: 'center',
        position: 'relative',
    },
    nextBtnText: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 8,
        color: THEME.colors.purple,
        letterSpacing: 2,
    },
    corner: {
        position: 'absolute',
        top: -1.5,
        left: -1.5,
        width: 6,
        height: 6,
        backgroundColor: THEME.colors.purple,
    }
});
