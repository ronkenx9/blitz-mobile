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
import { ITEM_NAMES } from '../../src/utils/constants';
import { useSounds } from '../../src/hooks/useSounds';

const { width } = Dimensions.get('window');

const opponents = [
    { e: "🤖", n: "CRYPTOK.", thinking: true },
    { e: "👾", n: "VOIDMAGE", thinking: false },
    { e: "🕹️", n: "SHADOWR.", thinking: true },
    { e: "⚙️", n: "IRONCLAD", thinking: false },
];

export default function BiddingScreen() {
    const { id: gameIdStr, mode } = useLocalSearchParams<{ id: string, mode: 'ai' | 'pvp' }>();
    const { game, myState, roundItem: pvpRoundItem } = useBlitzGame(gameIdStr, mode === 'pvp');
    const { submitBid } = useBlitzActions(Number(gameIdStr));
    const { account } = useMobileWallet();
    const aiGame = useAIGame();

    const isAi = mode === 'ai';
    const roundItem = isAi ? aiGame.roundItem : pvpRoundItem;

    // Resolve item name and emoji
    const itemName = roundItem
        ? ITEM_NAMES[roundItem.itemNameIndex % ITEM_NAMES.length]
        : '🔮 MYSTERY ITEM';

    const itemEmoji = itemName.split(' ')[0];
    const itemLabel = itemName.split(' ').slice(1).join(' ');

    const { play } = useSounds();

    const [bidValue, setBidValue] = useState(0.01); // Bid value in SOL
    const [timeLeft, setTimeLeft] = useState(10);
    const [loading, setLoading] = useState(false);
    const [hasBid, setHasBid] = useState(false);
    const [thinkingBots, setThinkingBots] = useState<number[]>([]);

    // Sound effect on round start
    useEffect(() => {
        if (aiGame.gameStarted) {
            play('round_start');
        }
    }, [aiGame.gameStarted]);

    // Countdown sounds
    useEffect(() => {
        if (!hasBid && timeLeft > 0) {
            if (timeLeft <= 3) {
                play('countdown_urgent');
            } else {
                play('countdown_tick');
            }
        }
    }, [timeLeft, hasBid]);

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

    const solVal = bidValue; // bidValue is already in SOL
    const circumference = 2 * Math.PI * 26;
    const strokeDashoffset = circumference - (timeLeft / 10) * circumference;

    const handleBid = async (isExpiry = false) => {
        if (loading || hasBid) return;
        play('bid_locked');
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
                    play('bot_thinking');
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

    // Convert bidValue (0.01-0.10) to a percentage for slider display (0-100)
    const bidPercentForSlider = ((bidValue - 0.01) / 0.09) * 100;

    // Convert slider percentage back to bidValue
    const handleSliderChange = (val: number) => {
        const newBidValue = (val / 100) * 0.09 + 0.01;
        setBidValue(newBidValue);
    };

    const handleQuickBid = (percent: number) => {
        const val = 0.01 + (0.09 * percent);
        setBidValue(val);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>⚔ ROUND {mode === 'ai' ? Math.max(1, aiGame.currentRound) : (game?.currentRound || 1)} / 5</Text>
                </View>

                <PixelBox variant="panel" style={styles.itemCard}>
                    <Text style={styles.itemEmoji}>{itemEmoji}</Text>
                    <Text style={styles.itemName}>{itemLabel}</Text>

                    <View style={styles.cursebox}>
                        <Text style={styles.curseLabel}>WINNER'S CURSE</Text>
                        <Text style={styles.curseFormula}>
                            Score = True Value − Your Bid
                        </Text>
                        <Text style={styles.curseWarning}>
                            Overbid = Penalty
                        </Text>
                    </View>
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
                                strokeDasharray={`${circumference} ${circumference} `}
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
                    <Text style={styles.bidPct}>{(bidPercentForSlider).toFixed(0)}% OF RANGE</Text>
                </View>

                <View style={styles.sliderWrap}>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={100}
                        value={bidPercentForSlider}
                        onValueChange={handleSliderChange}
                        minimumTrackTintColor={THEME.colors.purple}
                        maximumTrackTintColor={THEME.colors.border}
                        thumbTintColor={THEME.colors.crimson}
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
                            onPress={() => {
                                play('button_tap');
                                let newBid = 0.01;
                                if (idx === 1) newBid = 0.01 + (0.09 * 0.25);
                                else if (idx === 2) newBid = 0.01 + (0.09 * 0.50);
                                else if (idx === 3) newBid = 0.01 + (0.09 * 0.75);
                                else if (idx === 4) newBid = 0.10;
                                setBidValue(newBid);
                            }}
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
    cursebox: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: 'rgba(232,184,75,0.2)',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 10,
    },
    curseLabel: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 8,
        color: THEME.colors.gold,
        marginBottom: 6,
    },
    curseFormula: {
        color: '#c8d8e8',
        fontSize: 12,
        marginBottom: 4,
        textAlign: 'center',
    },
    curseWarning: {
        color: THEME.colors.crimson,
        fontSize: 10,
        fontStyle: 'italic',
    },
    actionSection: {
        paddingHorizontal: 16,
        paddingTop: 10,
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
