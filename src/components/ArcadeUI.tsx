import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { THEME } from '../theme';

interface PixelBoxProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'panel' | 'panel2' | 'gold' | 'purple';
}

export const PixelBox = ({ children, style: customStyle, variant = 'panel' }: PixelBoxProps) => {
    const getColors = () => {
        switch (variant) {
            case 'panel2': return { bg: THEME.colors.panel2, border: THEME.colors.border };
            case 'gold': return { bg: 'rgba(232,184,75,0.1)', border: THEME.colors.gold };
            case 'purple': return { bg: 'rgba(153,69,255,0.1)', border: THEME.colors.purple };
            default: return { bg: THEME.colors.panel, border: THEME.colors.border };
        }
    };

    const { bg, border } = getColors();

    return (
        <View style={[styles.pixelBox, { backgroundColor: bg, borderColor: border }, customStyle]}>
            {/* Corner accents */}
            <View style={[styles.corner, { top: -2, left: -2, backgroundColor: THEME.colors.gold }]} />
            <View style={[styles.corner, { bottom: -2, right: -2, backgroundColor: THEME.colors.gold }]} />
            {children}
        </View>
    );
};

interface ArcadeButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'gold' | 'purple';
    style?: ViewStyle;
    disabled?: boolean;
}

export const ArcadeButton = ({ title, onPress, variant = 'purple', style: customStyle, disabled }: ArcadeButtonProps) => {
    const isGold = variant === 'gold';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.button,
                {
                    backgroundColor: isGold ? THEME.colors.gold : THEME.colors.purple,
                    opacity: disabled ? 0.5 : 1,
                    shadowColor: isGold ? THEME.colors.gold : THEME.colors.purple,
                },
                customStyle
            ]}
        >
            <View style={[styles.corner, { top: -1, left: -1, backgroundColor: THEME.colors.gold2, width: 6, height: 6 }]} />
            <View style={[styles.corner, { bottom: -1, right: -1, backgroundColor: THEME.colors.gold2, width: 6, height: 6 }]} />
            <Text style={[styles.buttonText, { color: isGold ? '#1a0a00' : 'white' }]}>{title}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    pixelBox: {
        borderWidth: 1.5,
        padding: 12,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 6,
        height: 6,
    },
    button: {
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    buttonText: {
        fontFamily: THEME.fonts.pixel,
        fontSize: 10,
        letterSpacing: 2,
        textAlign: 'center',
    },
});
