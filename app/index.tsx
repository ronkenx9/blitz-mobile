import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useMobileWallet } from '../src/hooks/useMobileWallet';
import { useBlitzActions } from '../src/hooks/useBlitzActions';
import { THEME } from '../src/theme';
import { PixelBox, ArcadeButton } from '../src/components/ArcadeUI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Onboarding } from '../src/components/Onboarding';
import { useAIGame } from '../src/hooks/useAIGame';

const bots = [
    { e: "🤖", n: "CRYPTOKNIGHT", s: "AGGRESSIVE" },
    { e: "👾", n: "VOIDMAGE", s: "CONSERVATIVE" },
    { e: "🕹️", n: "SHADOWROGUE", s: "WILDCARD" },
    { e: "⚙️", n: "IRONCLAD", s: "CALCULATED" },
];

const DEFAULT_GAME_ID = 741829563;

export default function LobbyScreen() {
    const { account, connect, disconnect } = useMobileWallet();
    const aiGame = useAIGame();
    const gameActions = useBlitzActions(DEFAULT_GAME_ID);
    const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [gameCreated, setGameCreated] = useState(false);
    const [gameId, setGameId] = useState<number | null>(null);

    useEffect(() => {
        const checkOnboarding = async () => {
            const seen = await AsyncStorage.getItem('blitz_onboarding_seen');
            if (!seen) {
                setShowOnboarding(true);
            }
        };
        checkOnboarding();
    }, []);

    const handleCloseOnboarding = async () => {
        await AsyncStorage.setItem('blitz_onboarding_seen', 'true');
        setShowOnboarding(false);
    };

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            await gameActions.createGame();
            setGameId(DEFAULT_GAME_ID);
            setGameCreated(true);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to create game');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <Onboarding visible={showOnboarding} onClose={handleCloseOnboarding} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.logo}>⚔ BLITZ ⚔</Text>
                    <Text style={styles.tagline}>SEALED-BID BATTLE ROYALE</Text>
                    <View style={styles.badge}>
                        <View style={styles.solDot} />
                        <Text style={styles.badgeText}>POWERED BY SOLANA + MAGICBLOCK TEE</Text>
                    </View>

                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'ai' && styles.modeBtnActive]}
                            onPress={() => setMode('ai')}
                        >
                            <Text style={[styles.modeBtnText, mode === 'ai' && styles.modeBtnTextActive]}>🤖 AI ARENA</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, mode === 'pvp' && styles.modeBtnActive]}
                            onPress={() => setMode('pvp')}
                        >
                            <Text style={[styles.modeBtnText, mode === 'pvp' && styles.modeBtnTextActive]}>⚔ PVP MODE</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {mode === 'ai' ? (
                    <>
                        <View style={styles.walletBar}>
                            <View style={styles.walletDot} />
                            <Text style={styles.walletAddr}>
                                {account ? `${account.address.toString().slice(0, 4)}...${account.address.toString().slice(-4)}` : 'DISCONNECTED'}
                            </Text>
                            <TouchableOpacity onPress={account ? disconnect : connect}>
                                <Text style={styles.walletStatus}>{account ? 'CONNECTED ✓' : 'TAP TO CONNECT'}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionLabel}>OPPONENTS</Text>
                        <View style={styles.botGrid}>
                            {bots.map((b, i) => (
                                <View key={i} style={styles.botCard}>
                                    <View style={styles.botCorner} />
                                    <Text style={styles.botEmoji}>{b.e}</Text>
                                    <Text style={styles.botName}>{b.n}</Text>
                                    <Text style={styles.botStyle}>{b.s}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.actionSection}>
                            <PixelBox style={styles.settingsBox}>
                                <Text style={styles.settingsLabel}>GAME SETTINGS</Text>
                                <View style={styles.settingsRow}>
                                    {[["ROUNDS", "5"], ["PLAYERS", "6"], ["MODE", "SEALED"]].map(([l, v]) => (
                                        <View key={l} style={styles.settingItem}>
                                            <Text style={styles.settingVal}>{v}</Text>
                                            <Text style={styles.settingLbl}>{l}</Text>
                                        </View>
                                    ))}
                                </View>
                            </PixelBox>

                            <ArcadeButton
                                title="⚔ ENTER AI ARENA ⚔"
                                variant="gold"
                                onPress={() => {
                                    aiGame.createAIGame();
                                    const id = Math.floor(Math.random() * 1000000).toString();
                                    router.push(`/game/bidding?id=${id}&mode=ai`);
                                }}
                            />
                            <View style={styles.lobbyInfo}>
                                <Text style={styles.lobbyInfoText}>NO SOL REQUIRED · INSTANT PLAY</Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <View style={styles.pvpSection}>
                        {gameCreated ? (
                            <View style={styles.waitingRoom}>
                                <PixelBox variant="panel2" style={styles.gameIdBox}>
                                    <Text style={styles.sectionLabel}>GAME ID</Text>
                                    <Text style={styles.gameIdText}>#{gameId}</Text>
                                    <Text style={styles.gameIdSubtext}>⏳ WAITING FOR PLAYERS TO JOIN...</Text>
                                </PixelBox>
                                <ArcadeButton
                                    title="▶ START GAME"
                                    variant="gold"
                                    onPress={() => router.push(`/game/bidding?id=${gameId}&mode=pvp`)}
                                    style={{ marginBottom: 12 }}
                                />
                                <ArcadeButton
                                    title="✕ CANCEL"
                                    variant="purple"
                                    onPress={() => setGameCreated(false)}
                                />
                            </View>
                        ) : (
                            <>
                                <View style={[styles.statusMsg, styles.statusInfo]}>
                                    <Text style={styles.statusText}>CONNECT WALLET TO CREATE OR JOIN GAME</Text>
                                </View>

                                {!account && (
                                    <ArcadeButton
                                        title="🔌 CONNECT WALLET"
                                        variant="purple"
                                        style={{ marginVertical: 20 }}
                                        onPress={connect}
                                    />
                                )}
                                {account && (
                                    <ArcadeButton
                                        title="🔓 DISCONNECT"
                                        variant="purple"
                                        style={{ marginVertical: 10 }}
                                        onPress={disconnect}
                                    />
                                )}

                                <Text style={styles.sectionLabel}>CREATE OR JOIN</Text>
                                <View style={styles.actionSection}>
                                    <ArcadeButton
                                        title={isCreating ? "⏳ CREATING..." : "⚔ CREATE GAME"}
                                        disabled={!account || isCreating || isJoining}
                                        onPress={handleCreate}
                                        style={{ marginBottom: 12 }}
                                    />
                                    <ArcadeButton
                                        title={isJoining ? "⏳ JOINING..." : "+ JOIN GAME"}
                                        variant="purple"
                                        disabled={!account || isCreating || isJoining}
                                        onPress={async () => {
                                            setIsJoining(true);
                                            try {
                                                await gameActions.joinGame();
                                                router.push(`/game/bidding?id=${DEFAULT_GAME_ID}&mode=pvp`);
                                            } catch (e: any) {
                                                Alert.alert('Error', e?.message || 'Failed to join game');
                                            } finally {
                                                setIsJoining(false);
                                            }
                                        }}
                                    />
                                </View>
                            </>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.bg },
    scrollContent: { paddingBottom: 60 },
    header: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
    logo: {
        fontFamily: THEME.fonts.pixel, fontSize: 20, color: THEME.colors.gold,
        letterSpacing: 4, textShadowColor: 'rgba(232,184,75,0.8)',
        textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15,
    },
    tagline: { fontFamily: THEME.fonts.vt, fontSize: 16, color: THEME.colors.dim, letterSpacing: 3, marginTop: 4 },
    badge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(153,69,255,0.1)',
        borderWidth: 1, borderColor: 'rgba(153,69,255,0.3)', paddingHorizontal: 10, paddingVertical: 5, marginTop: 12,
    },
    solDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.green, marginRight: 6 },
    badgeText: { fontFamily: THEME.fonts.vt, fontSize: 12, color: THEME.colors.purple, letterSpacing: 1 },
    modeToggle: {
        flexDirection: 'row', borderWidth: 1.5, borderColor: THEME.colors.border,
        marginTop: 20, marginHorizontal: 16, overflow: 'hidden',
    },
    modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    modeBtnActive: { backgroundColor: 'rgba(153,69,255,0.2)' },
    modeBtnText: { fontFamily: THEME.fonts.pixel, fontSize: 8, color: THEME.colors.dim, letterSpacing: 0.5 },
    modeBtnTextActive: { color: THEME.colors.gold },
    walletBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(57,217,138,0.06)',
        borderWidth: 1, borderColor: 'rgba(57,217,138,0.2)', marginHorizontal: 16, padding: 10, marginBottom: 10,
    },
    walletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.green, marginRight: 8 },
    walletAddr: { flex: 1, fontFamily: THEME.fonts.pixel, fontSize: 7, color: THEME.colors.green, letterSpacing: 1 },
    walletStatus: { fontFamily: THEME.fonts.vt, fontSize: 13, color: THEME.colors.dim, letterSpacing: 1 },
    sectionLabel: {
        fontFamily: THEME.fonts.pixel, fontSize: 8, color: THEME.colors.dim,
        letterSpacing: 2, paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
    },
    botGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 13 },
    botCard: {
        width: '46%', margin: '2%', backgroundColor: THEME.colors.panel2,
        borderWidth: 1.5, borderColor: THEME.colors.border, padding: 12,
    },
    botCorner: { position: 'absolute', top: -1.5, left: -1.5, width: 6, height: 6, backgroundColor: THEME.colors.gold },
    botEmoji: { fontSize: 24 },
    botName: { fontFamily: THEME.fonts.pixel, fontSize: 7, color: THEME.colors.text, marginTop: 6, letterSpacing: 0.5 },
    botStyle: { fontFamily: THEME.fonts.vt, fontSize: 13, color: THEME.colors.dim, marginTop: 2, letterSpacing: 1 },
    actionSection: { paddingHorizontal: 16, marginTop: 20 },
    settingsBox: { marginBottom: 16 },
    settingsLabel: { fontFamily: THEME.fonts.pixel, fontSize: 8, color: THEME.colors.dim, letterSpacing: 1, marginBottom: 8 },
    settingsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    settingItem: { alignItems: 'center' },
    settingVal: { fontFamily: THEME.fonts.pixel, fontSize: 12, color: THEME.colors.gold },
    settingLbl: { fontFamily: THEME.fonts.vt, fontSize: 12, color: THEME.colors.dim, marginTop: 2, letterSpacing: 1 },
    lobbyInfo: {
        backgroundColor: 'rgba(153,69,255,0.08)', borderWidth: 1, borderColor: 'rgba(153,69,255,0.2)',
        padding: 10, marginTop: 8, alignItems: 'center',
    },
    lobbyInfoText: { fontFamily: THEME.fonts.vt, fontSize: 14, color: THEME.colors.dim, letterSpacing: 1 },
    pvpSection: { paddingTop: 10 },
    statusMsg: { marginHorizontal: 16, padding: 10, borderWidth: 1, alignItems: 'center' },
    statusInfo: { backgroundColor: 'rgba(79,163,232,0.1)', borderColor: 'rgba(79,163,232,0.3)' },
    statusText: { fontFamily: THEME.fonts.vt, fontSize: 14, color: THEME.colors.blue, letterSpacing: 1 },
    gameIdBox: { marginHorizontal: 16, marginBottom: 20 },
    gameIdText: { fontFamily: THEME.fonts.pixel, fontSize: 14, color: THEME.colors.gold, letterSpacing: 2 },
    gameIdSubtext: { fontFamily: THEME.fonts.vt, fontSize: 13, color: THEME.colors.dim, marginTop: 4, letterSpacing: 1 },
    waitingRoom: { paddingHorizontal: 16, paddingTop: 10 },
});
