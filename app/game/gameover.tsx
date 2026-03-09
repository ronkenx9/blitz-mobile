import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useBlitzGame, PlayerStateData } from '../../src/hooks/useBlitzGame';
import { useBlitzActions } from '../../src/hooks/useBlitzActions';
import { useMobileWallet } from '../../src/hooks/useMobileWallet';
import { THEME } from '../../src/theme';
import { ArcadeButton, PixelBox } from '../../src/components/ArcadeUI';
import { useAIGame, AIPlayerState } from '../../src/hooks/useAIGame';
import { APP_IDENTITY } from '../../src/utils/constants';
import { usePlayerProfile } from '../../src/hooks/usePlayerProfile';
import { useSounds } from '../../src/hooks/useSounds';

const { width } = Dimensions.get('window');

export default function GameOverScreen() {
    const { id: gameIdStr, mode } = useLocalSearchParams<{ id: string, mode: 'ai' | 'pvp' }>();
    const { game, allPlayers } = useBlitzGame(gameIdStr);
    const { settleGame } = useBlitzActions(Number(gameIdStr));
    const aiGame = useAIGame();

    const { account } = useMobileWallet();
    const isAi = mode === 'ai';
    const players = isAi ? aiGame.players : allPlayers.map((p: PlayerStateData) => ({
        name: p.player.toBase58().slice(0, 4) + "..." + p.player.toBase58().slice(-4),
        emoji: "👤",
        xp: p.score.toNumber(),
        isYou: p.player.toBase58() === account?.address?.toString(),
    }));

    const winner = isAi ? aiGame.winner : (game?.winner ? players.find(p => p.name.includes(game.winner!.toBase58().slice(0, 4))) : null);

    const { play, stopMusic } = useSounds();

    useEffect(() => {
        stopMusic();
        if (winner?.isYou) {
            play('victory');
        } else {
            play('defeat');
        }
    }, [winner?.isYou]);
    const sortedPlayers = [...players].sort((a, b) => b.xp - a.xp);

    const { recordGame } = usePlayerProfile();

    React.useEffect(() => {
        if (winner && isAi) {
            const playerWon = winner.isYou;
            const playerScore = players.find(p => p.isYou)?.xp || 0;
            recordGame(playerWon, playerScore);
        }
    }, [winner]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>🏆 GAME OVER 🏆</Text>
                    <Text style={styles.subtitle}>ARENA RESULTS SEALED</Text>
                </View>

                <View style={styles.heroSection}>
                    <View style={styles.confettiWrap}>
                        <Text style={styles.confetti}>✨ 🎊 ✨</Text>
                    </View>
                    <PixelBox variant="gold" style={styles.championBox}>
                        <Text style={styles.champLabel}>👑 ARENA CHAMPION 👑</Text>
                        <Text style={styles.champEmoji}>{winner?.emoji || "👤"}</Text>
                        <Text style={styles.champName}>{winner?.name || "???"}</Text>
                        <View style={styles.prizeWrap}>
                            <Text style={styles.prizeVal}>◎ {((winner?.xp || 0) / 1e9).toFixed(3)} SOL</Text>
                            <Text style={styles.prizeLbl}>TOTAL XP EARNED</Text>
                        </View>
                    </PixelBox>
                </View>

                <Text style={styles.sectionLabel}>🕹 FINAL STANDINGS</Text>
                <View style={styles.standingsList}>
                    {sortedPlayers.map((p, i) => (
                        <View key={i} style={[styles.pCard, p.name === winner?.name && styles.pCardWinner]}>
                            <Text style={styles.pRank}>{i + 1}</Text>
                            <Text style={styles.pEmoji}>{p.emoji}</Text>
                            <Text style={styles.pName}>{p.name}{p.isYou ? " ✨" : ""}</Text>
                            <Text style={styles.pScore}>◎ {(p.xp / 1e9).toFixed(3)} SOL</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.actionSection}>
                    {isAi ? (
                        <ArcadeButton
                            title="🏆 COLLECT XP & EXIT"
                            variant="gold"
                            onPress={() => {
                                play('button_tap');
                                router.replace('/');
                            }}
                            style={styles.actionBtn}
                        />
                    ) : (
                        <>
                            <ArcadeButton
                                title="💰 CLAIM REWARDS"
                                variant="gold"
                                onPress={() => {
                                    play('button_tap');
                                    settleGame();
                                }}
                                style={styles.actionBtn}
                            />
                            <ArcadeButton
                                title="🏠 RETURN HOME"
                                variant="purple"
                                onPress={() => {
                                    play('button_tap');
                                    router.replace('/');
                                }}
                                style={styles.actionBtn}
                            />
                        </>
                    )}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>GAME ID: {gameIdStr?.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.footerSub}>VERIFIED BY MAGICBLOCK TEE</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 50,
        paddingBottom: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 14,
        color: THEME.colors.gold,
        letterSpacing: 3,
        textShadowColor: 'rgba(232,184,75,0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    subtitle: {
        fontFamily: THEME.fonts.vt,
        fontSize: 16,
        color: THEME.colors.dim,
        letterSpacing: 2,
        marginTop: 6,
    },
    heroSection: {
        alignItems: 'center',
        marginVertical: 10,
    },
    confettiWrap: {
        marginBottom: -15,
        zIndex: 10,
    },
    confetti: {
        fontSize: 24,
    },
    championBox: {
        width: width * 0.85,
        alignItems: 'center',
        paddingVertical: 24,
    },
    champLabel: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 8,
        color: THEME.colors.gold,
        letterSpacing: 1,
        marginBottom: 16,
    },
    champEmoji: {
        fontSize: 56,
    },
    champName: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 14,
        color: THEME.colors.text,
        marginTop: 12,
        letterSpacing: 2,
    },
    prizeWrap: {
        marginTop: 20,
        backgroundColor: 'rgba(232,184,75,0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: THEME.colors.gold,
        alignItems: 'center',
    },
    prizeVal: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 16,
        color: THEME.colors.gold,
    },
    prizeLbl: {
        fontFamily: THEME.fonts.vt,
        fontSize: 12,
        color: THEME.colors.dim,
        marginTop: 4,
        letterSpacing: 1,
    },
    sectionLabel: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 8,
        color: THEME.colors.dim,
        letterSpacing: 2,
        paddingHorizontal: 16,
        marginTop: 30,
        marginBottom: 12,
    },
    standingsList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    pCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.panel2,
        borderWidth: 1.5,
        borderColor: THEME.colors.border,
        padding: 12,
    },
    pCardWinner: {
        borderColor: THEME.colors.purple,
        backgroundColor: 'rgba(153,69,255,0.06)',
    },
    pRank: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 10,
        color: THEME.colors.gold,
        width: 24,
    },
    pEmoji: {
        fontSize: 20,
        marginHorizontal: 10,
    },
    pName: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 7,
        color: THEME.colors.text,
        flex: 1,
        letterSpacing: 0.5,
    },
    pScore: {
        fontFamily: THEME.fonts.vt,
        fontSize: 16,
        color: THEME.colors.green,
    },
    actionSection: {
        paddingHorizontal: 16,
        marginTop: 30,
        gap: 12,
    },
    actionBtn: {
        width: '100%',
    },
    footer: {
        alignItems: 'center',
        marginTop: 30,
    },
    footerText: {
        fontFamily: THEME.fonts.vt,
        fontSize: 13,
        color: THEME.colors.dim,
        letterSpacing: 1,
    },
    footerSub: {
        fontFamily: THEME.fonts.vt,
        fontSize: 11,
        color: THEME.colors.border,
        marginTop: 4,
        letterSpacing: 1,
    }
});
