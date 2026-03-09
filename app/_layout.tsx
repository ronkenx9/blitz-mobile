import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { ArcadeBackground } from '../src/components/ArcadeBackground';
import { THEME } from '../src/theme';
import { usePathname, router } from 'expo-router';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { clusterApiUrl } from '@solana/web3.js';
import { useSounds } from '../src/hooks/useSounds';
import { useState, useEffect } from 'react';

const SOLANA_CHAIN = 'solana:devnet';
const SOLANA_ENDPOINT = clusterApiUrl('devnet');
const APP_IDENTITY = {
    name: 'BLITZ',
    uri: 'https://blitz.solana.app',
    icon: 'favicon.ico',
};

const PHASES = [
    { key: 'lobby', icon: '⚔', label: 'LOBBY', href: '/' },
    { key: 'legends', icon: '🏆', label: 'LEGENDS', href: '/legends' },
    { key: 'profile', icon: '👤', label: 'PROFILE', href: '/profile' },
    { key: 'bidding', icon: '🔮', label: 'BID', href: '/game/bidding' },
    { key: 'reveal', icon: '👁', label: 'REVEAL', href: '/game/reveal' },
    { key: 'gameover', icon: '👑', label: 'OVER', href: '/game/gameover' },
];

export default function RootLayout() {
    const pathname = usePathname();
    const [fontsLoaded] = useFonts({
        PressStart2P_400Regular,
        VT323_400Regular,
    });

    const { startMusic, toggleMute, play } = useSounds();
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (fontsLoaded) {
            const timer = setTimeout(() => {
                startMusic();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [fontsLoaded]);

    const handleMuteToggle = async () => {
        const muted = await toggleMute();
        setIsMuted(muted);
    };

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, backgroundColor: THEME.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={THEME.colors.gold} />
            </View>
        );
    }

    const currentKey = pathname === '/' ? 'lobby' :
        pathname.includes('/game/bidding') ? 'bidding' :
            pathname.includes('/game/reveal') ? 'reveal' :
                pathname.includes('/game/gameover') ? 'gameover' :
                    pathname.includes('/legends') ? 'legends' :
                        pathname.includes('/profile') ? 'profile' : 'lobby';

    const navigateToPhase = (key: string, href: string) => {
        play('button_tap');
        // Only allow manual navigation to Lobby and Legends for now
        // Only allow switching to Lobby, Legends or Profile outside of active game
        // to prevent game state desync
        if (key === 'lobby' || key === 'legends' || key === 'profile') {
            router.push(href as any);
        }
    };

    return (
        <MobileWalletProvider chain={SOLANA_CHAIN} endpoint={SOLANA_ENDPOINT} identity={APP_IDENTITY}>
            <ArcadeBackground>
                <View style={{ flex: 1 }}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: 'transparent' },
                            animation: 'fade',
                            animationDuration: 200,
                        }}
                    />

                    {/* Bottom Navigation Bar */}
                    <View style={styles.tabBar}>
                        {PHASES.map(p => {
                            const isActive = currentKey === p.key;
                            const isInActiveGame = currentKey === 'bidding' || currentKey === 'reveal';

                            let isLocked = false;
                            if (p.key === 'legends' || p.key === 'profile') {
                                isLocked = isInActiveGame;
                            } else if (p.key === 'lobby') {
                                isLocked = false;
                            } else {
                                isLocked = !isActive;
                            }

                            return (
                                <TouchableOpacity
                                    key={p.key}
                                    style={[styles.tab, isActive && styles.activeTab]}
                                    onPress={() => navigateToPhase(p.key, p.href)}
                                    disabled={isLocked}
                                >
                                    <Text style={[styles.tabIcon, isActive && { color: THEME.colors.gold }]}>
                                        {p.icon}
                                    </Text>
                                    <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Mute Toggle */}
                        <TouchableOpacity
                            style={styles.tab}
                            onPress={handleMuteToggle}
                        >
                            <Text style={styles.tabIcon}>
                                {isMuted ? '🔇' : '🔊'}
                            </Text>
                            <Text style={styles.tabLabel}>
                                {isMuted ? 'UNMUTE' : 'MUTE'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ArcadeBackground>
        </MobileWalletProvider>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        backgroundColor: THEME.colors.panel,
        borderTopWidth: 1,
        borderTopColor: THEME.colors.border,
        paddingBottom: 24, // Safe area
        height: 80,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    activeTab: {
        borderTopWidth: 2,
        borderTopColor: THEME.colors.purple,
        backgroundColor: 'rgba(153,69,255,0.08)',
    },
    tabIcon: {
        fontSize: 16,
        color: THEME.colors.dim
    },
    tabLabel: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 5,
        color: THEME.colors.dim,
        marginTop: 6,
        letterSpacing: 1
    },
    activeLabel: {
        color: THEME.colors.gold
    },
});
