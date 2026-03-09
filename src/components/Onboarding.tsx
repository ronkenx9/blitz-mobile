import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';
import { ArcadeButton, PixelBox } from './ArcadeUI';

interface OnboardingProps {
    visible: boolean;
    onClose: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ visible, onClose }) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <PixelBox variant="purple" style={styles.container}>
                    <Text style={styles.title}>Welcome to BLITZ</Text>
                    <Text style={styles.subtitle}>ARENA PROTOCOL v1.0</Text>

                    <View style={styles.instructionRow}>
                        <Text style={styles.icon}>⚔</Text>
                        <Text style={styles.text}>Connect your wallet or enter the AI ARENA.</Text>
                    </View>

                    <View style={styles.instructionRow}>
                        <Text style={styles.icon}>🔮</Text>
                        <Text style={styles.text}>Estimate the market value of rare items. Bid accurately to survive.</Text>
                    </View>

                    <View style={styles.instructionRow}>
                        <Text style={styles.icon}>👑</Text>
                        <Text style={styles.text}>Highest bidder wins the round. Lowest score is eliminated.</Text>
                    </View>

                    <ArcadeButton
                        title="ENTER ARENA"
                        variant="gold"
                        onPress={onClose}
                        style={styles.closeBtn}
                    />
                </PixelBox>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 4, 10, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 16,
        color: THEME.colors.gold,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: THEME.fonts.vt,
        fontSize: 14,
        color: THEME.colors.dim,
        letterSpacing: 2,
        marginBottom: 32,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 16,
    },
    icon: {
        fontSize: 24,
        color: THEME.colors.purple,
        width: 32,
        textAlign: 'center',
    },
    text: {
        flex: 1,
        fontFamily: THEME.fonts.vt,
        fontSize: 16,
        color: THEME.colors.text,
        lineHeight: 22,
    },
    closeBtn: {
        width: '100%',
        marginTop: 20,
    }
});
