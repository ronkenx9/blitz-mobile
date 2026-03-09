import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLeaderboard } from '../hooks/usePlayerProfile';
import { THEME } from '../theme';

export function LegendsScreen() {
    const { leaders, loading, refetch } = useLeaderboard();

    return (
        <ScrollView style={st.container}>
            <Text style={st.title}>🏆 LEGENDS</Text>
            <Text style={st.sub}>HALL OF CHAMPIONS</Text>

            {loading ? (
                <ActivityIndicator color={THEME.colors.gold} style={{ marginTop: 40 }} />
            ) : leaders.length === 0 ? (
                <Text style={st.empty}>NO CHAMPIONS YET{"\n"}BE THE FIRST</Text>
            ) : (
                leaders.map((p, i) => (
                    <View key={i} style={[st.row, i === 0 && st.firstRow]}>
                        <Text style={[st.rank, i === 0 && st.goldRank]}>
                            {i === 0 ? '👑' : i + 1}
                        </Text>
                        <Text style={st.name}>{p.name || 'UNKNOWN'}</Text>
                        <View style={st.right}>
                            <Text style={st.wins}>{(p.score / 1e9).toFixed(3)} SOL</Text>
                            <Text style={st.games}>{new Date(p.timestamp).toLocaleDateString()}</Text>
                        </View>
                    </View>
                ))
            )}

            <TouchableOpacity style={st.refreshBtn} onPress={refetch}>
                <Text style={st.refreshText}>↻ REFRESH</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#06080d', padding: 16 },
    title: {
        fontFamily: 'PressStart2P_400Regular', fontSize: 14, color: '#e8b84b',
        textAlign: 'center', marginTop: 20, letterSpacing: 4
    },
    sub: {
        fontFamily: 'VT323_400Regular', fontSize: 16, color: '#64748b',
        textAlign: 'center', marginBottom: 24, letterSpacing: 2
    },
    empty: {
        fontFamily: 'PressStart2P_400Regular', fontSize: 8, color: '#64748b',
        textAlign: 'center', marginTop: 100, lineHeight: 20
    },
    row: {
        flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8,
        backgroundColor: '#0e1532', borderWidth: 1, borderColor: '#2a3f5a'
    },
    firstRow: { borderColor: '#e8b84b', backgroundColor: 'rgba(232,184,75,0.05)' },
    rank: { fontFamily: 'PressStart2P_400Regular', fontSize: 10, color: '#64748b', width: 40 },
    goldRank: { color: '#e8b84b' },
    name: { fontFamily: 'PressStart2P_400Regular', fontSize: 8, color: '#c8d8e8', flex: 1 },
    right: { alignItems: 'flex-end' },
    wins: { fontFamily: 'VT323_400Regular', fontSize: 16, color: '#e8b84b' },
    games: { fontFamily: 'VT323_400Regular', fontSize: 12, color: '#64748b' },
    refreshBtn: { marginTop: 20, padding: 16, alignItems: 'center' },
    refreshText: { fontFamily: 'PressStart2P_400Regular', fontSize: 8, color: '#2a3f5a' }
});
