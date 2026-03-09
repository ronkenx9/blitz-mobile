import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { THEME } from '../src/theme';

export default function LegendsScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>🏆 LEGENDS</Text>
            <Text style={styles.sub}>HALL OF CHAMPIONS</Text>

            <View style={styles.content}>
                <Text style={styles.coming}>— LEADERBOARD COMING SOON —</Text>
                <Text style={styles.hint}>ONLY THE MOST ACCURATE BIDDERS SHALL BE ETCHED IN PORCELAIN.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
    },
    title: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 16,
        color: THEME.colors.gold,
        textAlign: 'center',
        letterSpacing: 4,
        textShadowColor: 'rgba(232,184,75,0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    sub: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 8,
        color: THEME.colors.dim,
        textAlign: 'center',
        marginTop: 12,
        letterSpacing: 2
    },
    content: {
        marginTop: 60,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    coming: {
        fontSize: 18,
        color: THEME.colors.purple,
        textAlign: 'center',
        letterSpacing: 2,
        fontFamily: THEME.fonts.vt,
        marginBottom: 20,
    },
    hint: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.dim,
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 1,
    }
});
