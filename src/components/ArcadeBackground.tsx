import React from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../theme';

const { width, height } = Dimensions.get('window');

const EMBERS_COUNT = 15;

const SCANLINE_HEIGHT = 4;
const SCANLINE_COUNT = Math.ceil(height / SCANLINE_HEIGHT);

export const Scanlines = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: SCANLINE_COUNT }).map((_, i) => (
            <View
                key={i}
                style={{
                    height: 2,
                    backgroundColor: 'rgba(0,0,0,0.12)',
                    marginTop: 2,
                }}
            />
        ))}
    </View>
);

export const ArcadeBackground = ({ children }: { children: React.ReactNode }) => {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#06080d', '#02040a']}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={['rgba(153,69,255,0.12)', 'transparent', 'rgba(232,184,75,0.06)', 'transparent']}
                locations={[0, 0.4, 0.8, 1]}
                style={StyleSheet.absoluteFill}
            />
            <EmberLayer />
            <View style={{ flex: 1 }}>
                {children}
            </View>
            <Scanlines />
        </View>
    );
};

const EmberLayer = () => {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: EMBERS_COUNT }).map((_, i) => (
                <Ember key={i} />
            ))}
        </View>
    );
};

const Ember = () => {
    const anim = React.useRef(new Animated.Value(0)).current;
    const left = React.useRef(Math.random() * width).current;
    const size = React.useRef(2 + Math.random() * 3).current;
    const color = React.useRef(Math.random() > 0.5 ? THEME.colors.gold : THEME.colors.purple).current;

    React.useEffect(() => {
        const duration = 6000 + Math.random() * 8000;
        const delay = Math.random() * 8000;

        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, {
                    toValue: 1,
                    duration,
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -height],
    });

    const opacity = anim.interpolate({
        inputRange: [0, 0.1, 0.9, 1],
        outputRange: [0, 1, 0.6, 0],
    });

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, (Math.random() - 0.5) * 50],
    });

    return (
        <Animated.View
            style={[
                styles.ember,
                {
                    left,
                    width: size,
                    height: size,
                    backgroundColor: color,
                    opacity,
                    transform: [{ translateY }, { translateX }],
                },
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#02040a',
    },
    ember: {
        position: 'absolute',
        bottom: -10,
        borderRadius: 10,
    },
});
