import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey, Connection } from '@solana/web3.js';

function toByteArray(base64: string): Uint8Array {
    const binString = atob(base64);
    return Uint8Array.from(binString, (c) => c.charCodeAt(0));
}
import { APP_IDENTITY, MAINNET_URL, PROGRAM_ID } from '../utils/constants';
import * as anchor from '@coral-xyz/anchor';
import idl from '../idl/blitz.json';

export function ProfileScreen() {
    const { profile, loading, setName } = usePlayerProfile();
    const [nameInput, setNameInput] = useState(profile.name);
    const [saving, setSaving] = useState(false);

    // Sync input with profile when loaded
    React.useEffect(() => {
        if (profile.name !== 'ANON') {
            setNameInput(profile.name);
        }
    }, [profile.name]);

    const handleSave = async () => {
        if (!nameInput.trim()) return;
        setSaving(true);
        try {
            await setName(nameInput);
        } catch (e) {
            console.error('Identity binding failed:', e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={st.container}>
            <Text style={st.title}>👤 PROFILE</Text>

            <View style={st.nameRow}>
                <TextInput
                    style={st.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="ENTER CALLSIGN"
                    placeholderTextColor="#64748b"
                    maxLength={12}
                    autoCapitalize="characters"
                />
                <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving}>
                    <Text style={st.saveBtnText}>
                        {saving ? '...' : 'SIGN'}
                    </Text>
                </TouchableOpacity>
            </View>

            {profile.verified && (
                <View style={st.verifiedBadge}>
                    <Text style={st.verifiedText}>✅ IDENTITY VERIFIED ON SOLANA</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator color="#e8b84b" style={{ marginTop: 20 }} />
            ) : (
                <View style={st.statsGrid}>
                    {[
                        ['GAMES', profile.gamesPlayed.toString()],
                        ['WINS', profile.wins.toString()],
                        ['BEST', (profile.bestScore / 1e9).toFixed(3)],
                    ].map(([l, v]) => (
                        <View key={l} style={st.statBox}>
                            <Text style={st.statVal}>{v}</Text>
                            <Text style={st.statLbl}>{l}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={{ marginTop: 30, padding: 16, backgroundColor: '#0e1532', borderWidth: 1, borderColor: '#2a3f5a' }}>
                <Text style={{ fontFamily: 'VT323_400Regular', color: '#64748b', fontSize: 16, textAlign: 'center' }}>
                    LAST PLAYED: {profile.lastPlayed > 0 ? new Date(profile.lastPlayed).toLocaleDateString() : 'NEVER'}
                </Text>
            </View>
        </ScrollView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#06080d', padding: 16 },
    title: {
        fontFamily: 'PressStart2P_400Regular', fontSize: 14, color: '#e8b84b',
        textAlign: 'center', marginTop: 20, marginBottom: 24, letterSpacing: 4
    },
    connectBtn: {
        backgroundColor: 'rgba(153,69,255,0.2)', borderWidth: 1.5,
        borderColor: '#9945ff', padding: 14, alignItems: 'center'
    },
    connectBtnText: { fontFamily: 'PressStart2P_400Regular', fontSize: 9, color: '#9945ff', letterSpacing: 2 },
    addrRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
        backgroundColor: '#0e1532', borderWidth: 1, borderColor: '#2a3f5a', padding: 10
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#39d98a' },
    addr: { fontFamily: 'PressStart2P_400Regular', fontSize: 8, color: '#39d98a' },
    nameRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    nameInput: {
        flex: 1, backgroundColor: '#0e1532', borderWidth: 1.5, borderColor: '#2a3f5a',
        padding: 12, color: '#c8d8e8', fontFamily: 'PressStart2P_400Regular', fontSize: 9
    },
    saveBtn: { backgroundColor: '#e8b84b', padding: 12, justifyContent: 'center' },
    saveBtnText: { fontFamily: 'PressStart2P_400Regular', fontSize: 8, color: '#1a0a00' },
    statsGrid: { flexDirection: 'row', gap: 8 },
    statBox: {
        flex: 1, backgroundColor: '#0e1532', borderWidth: 1, borderColor: '#2a3f5a',
        padding: 12, alignItems: 'center'
    },
    statVal: { fontFamily: 'PressStart2P_400Regular', fontSize: 16, color: '#e8b84b' },
    statLbl: { fontSize: 13, color: '#64748b', letterSpacing: 2, marginTop: 4, fontFamily: 'VT323_400Regular' },
    noProfile: { borderWidth: 1, borderColor: '#2a3f5a', padding: 20, alignItems: 'center' },
    noProfileText: {
        fontFamily: 'PressStart2P_400Regular', fontSize: 7, color: '#64748b',
        textAlign: 'center', lineHeight: 18, letterSpacing: 1
    },
    verifiedBadge: {
        backgroundColor: 'rgba(57, 217, 138, 0.1)',
        borderWidth: 1,
        borderColor: '#39d98a',
        padding: 10,
        marginBottom: 20,
        alignItems: 'center',
    },
    verifiedText: {
        fontFamily: 'VT323_400Regular',
        fontSize: 14,
        color: '#39d98a',
        letterSpacing: 1,
    },
});
