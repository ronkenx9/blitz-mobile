import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { useBlitzGame } from '../../src/hooks/useBlitzGame';
import { useBlitzActions } from '../../src/hooks/useBlitzActions';
import { useMobileWallet } from '../../src/hooks/useMobileWallet';
import { useAIGame } from '../../src/hooks/useAIGame';
import { THEME } from '../../src/theme';
import { ArcadeButton, PixelBox } from '../../src/components/ArcadeUI';

const { width } = Dimensions.get('window');

const opponents = [
    { e: "🤖", n: "CRYPTOK.", thinking: true },
    { e: "👾", n: "VOIDMAGE", thinking: false },
    { e: "🕹️", n: "SHADOWR.", thinking: true },
    { e: "⚙️", n: "IRONCLAD", thinking: false },
];

export default function BiddingScreen() {
    const { id: gameIdStr, mode } = useLocalSearchParams<{ id: string, mode: 'ai' | 'pvp' }>();
    const { game, myState, roundItem } = useBlitzGame(gameIdStr);
    const { submitBid } = useBlitzActions(Number(gameIdStr));
    const { account } = useMobileWallet();
    const aiGame = useAIGame();

    const [bidPercent, setBidPercent] = useState(50);
    const [timeLeft, setTimeLeft] = useState(10);
    const [loading, setLoading] = useState(false);
    const [hasBid, setHasBid] = useState(false);
    const [thinkingBots, setThinkingBots] = useState<number[]>([]);

    // Timer Logic
    useEffect(() => {
        if (hasBid) return;

        if (timeLeft <= 0) {
            handleBid(true);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, hasBid]);

    const solVal = (bidPercent / 100 * 0.09 + 0.01);
    const circumference = 2 * Math.PI * 26;
    const strokeDashoffset = circumference - (timeLeft / 10) * circumference;

    const handleBid = async (isExpiry = false) => {
        if (loading || hasBid) return;
        setHasBid(true);
        setLoading(true);

        const currentBidLamports = solVal * 1e9;

        try {
            if (mode === 'ai') {
                // 1. Submit Player Bid locally
                aiGame.submitPlayerBid(currentBidLamports);
                await new Promise(r => setTimeout(r, 100)); // Brief pause for state propagation

                // 2. Stagger bot "thinking" animations
                const aiBots = opponents;
                for (let i = 0; i < aiBots.length; i++) {
                    await new Promise(r => setTimeout(r, 600));
                    setThinkingBots(prev => [...prev, i]);
                }

                // 3. After bots "think", submit their bids
                aiGame.submitBotBids();
                await new Promise(r => setTimeout(r, 800));

                // 4. Final check before navigation
                router.push({
                    pathname: '/game/reveal',
                    params: { id: gameIdStr, mode: 'ai' }
                });
            } else {
                // PVP Mode: Backend Anchor call
                if (!account) throw new Error("Wallet not connected");
                await submitBid(currentBidLamports);
                // Transition will be handled by game state poll in reveal screen
                router.push({
                    pathname: '/game/reveal',
                    params: { id: gameIdStr, mode: 'pvp' }
                });
            }
        } catch (err) {
            console.error("Bid error:", err);
            setHasBid(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>⚔ ROUND {mode === 'ai' ? Math.max(1, aiGame.currentRound) : (game?.currentRound || 1)} / 5</Text>
                </View>

                <PixelBox variant="purple" style={styles.itemCard}>
                    <Text style={styles.itemEmoji}>{mode === 'ai' ? '💎' : '💎'}</Text>
                    <Text style={styles.itemName}>
                        {mode === 'ai' ? (aiGame.roundItem ? `ITEM #${aiGame.roundItem.itemNameIndex}` : "SOLANA DIAMOND") : (roundItem ? `ITEM #${roundItem.itemNameIndex}` : "SOLANA DIAMOND")}
                    </Text>
                    <Text style={styles.itemHint}>ESTIMATE THE TRUE MARKET VALUE</Text>
                </PixelBox>

                <View style={styles.countdownRing}>
                    <View style={styles.ringWrap}>
                        <Svg width="60" height="60" style={styles.ringSvg}>
                            <Circle
                                cx="30" cy="30" r="26"
                                stroke={THEME.colors.border}
                                strokeWidth="4"
                                fill="none"
                            />
                            <Circle
                                cx="30" cy="30" r="26"
                                stroke={THEME.colors.gold}
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${circumference} ${circumference}`}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="square"
                            />
                        </Svg>
                        <View style={styles.ringNumContainer}>
                            <Text style={styles.ringNum}>{timeLeft}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bidDisplay}>
                    <Text style={styles.bidSol}>
                        ◎ {solVal.toFixed(3)}
                    </Text>
                    <Text style={styles.bidPct}>{bidPercent.toFixed(0)}% OF RANGE</Text>
                </View>

                <View style={styles.sliderWrap}>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={100}
                        value={bidPercent}
                        onValueChange={setBidPercent}
                        minimumTrackTintColor={THEME.colors.purple}
                        maximumTrackTintColor={THEME.colors.border}
                        thumbTintColor={THEME.colors.gold}
                    />
                    <View style={styles.rangeLabels}>
                        <Text style={styles.rangeText}>0.010 SOL</Text>
                        <Text style={styles.rangeText}>0.100 SOL</Text>
                    </View>
                </View>

                <View style={styles.quickBids}>
                    {["MIN", "25%", "50%", "75%", "MAX"].map((l, idx) => (
                        <TouchableOpacity
                            key={l}
                            style={styles.qb}
                            onPress={() => setBidPercent(idx * 25)}
                        >
                            <Text style={styles.qbText}>{l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ArcadeButton
                    title={hasBid ? "🔮 BID LOCKED" : "🔮 LOCK IN BID"}
                    variant="gold"
                    disabled={loading || hasBid}
                    onPress={handleBid}
                    style={styles.bidBtn}
                />

                <Text style={styles.sectionLabel}>OPPONENTS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.oppStrip}>
                    {opponents.map((o, i) => {
                        const isThinking = !thinkingBots.includes(i) && hasBid;
                        const hasFinished = thinkingBots.includes(i);

                        return (
                            <View key={i} style={[styles.oppChip, isThinking && styles.oppChipThinking]}>
                                <Text style={[styles.oppChipText, isThinking && styles.oppChipTextThinking]}>
                                    {o.e} {o.n}
                                </Text>
                                {isThinking ? (
                                    <View style={styles.thinkDot} />
                                ) : hasFinished ? (
                                    <Text style={styles.check}>✓</Text>
                                ) : (
                                    <View style={[styles.thinkDot, { backgroundColor: THEME.colors.dim }]} />
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
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
        paddingBottom: 40,
    },
    roundBadge: {
        alignItems: 'center',
        padding: 10,
    },
    roundText: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 8,
        color: THEME.colors.purple,
        letterSpacing: 2,
    },
    itemCard: {
        marginHorizontal: 16,
        marginVertical: 10,
        padding: 20,
        alignItems: 'center',
    },
    itemEmoji: {
        fontSize: 32,
    },
    itemName: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 10,
        color: THEME.colors.gold,
        marginVertical: 8,
        letterSpacing: 1,
        textShadowColor: 'rgba(232,184,75,0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    itemHint: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.dim,
        letterSpacing: 1,
    },
    countdownRing: {
        alignItems: 'center',
        marginVertical: 10,
    },
    ringWrap: {
        width: 60,
        height: 60,
        position: 'relative',
    },
    ringSvg: {
        transform: [{ rotate: '-90deg' }],
    },
    ringNumContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringNum: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 14,
        color: THEME.colors.gold,
    },
    bidDisplay: {
        alignItems: 'center',
        marginVertical: 10,
    },
    bidSol: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 18,
        color: THEME.colors.gold,
        textShadowColor: 'rgba(232,184,75,0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },
    bidPct: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.dim,
        letterSpacing: 1,
        marginTop: 4,
    },
    sliderWrap: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    rangeLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    rangeText: {
        fontFamily: THEME.fonts.vt,
        fontSize: 12,
        color: THEME.colors.dim,
    },
    quickBids: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 6,
        marginBottom: 16,
    },
    qb: {
        flex: 1,
        backgroundColor: THEME.colors.panel2,
        borderWidth: 1,
        borderColor: THEME.colors.border,
        paddingVertical: 8,
        alignItems: 'center',
    },
    qbText: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 6,
        color: THEME.colors.dim,
        letterSpacing: 0.5,
    },
    bidBtn: {
        marginHorizontal: 16,
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
    oppStrip: {
        paddingHorizontal: 16,
    },
    oppChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.panel2,
        borderWidth: 1,
        borderColor: THEME.colors.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 8,
    },
    oppChipThinking: {
        borderColor: THEME.colors.purple,
    },
    oppChipText: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.dim,
        letterSpacing: 1,
    },
    oppChipTextThinking: {
        color: THEME.colors.purple,
    },
    thinkDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: THEME.colors.purple,
        marginLeft: 6,
    },
    check: {
        fontSize: 12,
        color: THEME.colors.green,
        marginLeft: 6,
    }
});
