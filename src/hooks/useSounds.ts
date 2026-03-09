import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

const SoundFiles = {
    background_music: require('../../assets/sounds/background_music.wav'),
    bid_locked: require('../../assets/sounds/bid_locked.wav'),
    bids_revealed: require('../../assets/sounds/bids_revealed.wav'),
    bot_thinking: require('../../assets/sounds/bot_thinking.wav'),
    button_tap: require('../../assets/sounds/button_tap.wav'),
    countdown_tick: require('../../assets/sounds/countdown_tick.wav'),
    countdown_urgent: require('../../assets/sounds/countdown_urgent.wav'),
    elimination: require('../../assets/sounds/elimination.wav'),
    round_start: require('../../assets/sounds/round_start.wav'),
    victory: require('../../assets/sounds/victory.wav'),
    defeat: require('../../assets/sounds/defeat.wav'),
};

export type SoundName = keyof typeof SoundFiles;

export function useSounds() {
    const soundCache = useRef<Partial<Record<SoundName, Audio.Sound>>>({});
    const bgMusic = useRef<Audio.Sound | null>(null);
    const isMuted = useRef(false);

    useEffect(() => {
        try {
            // Set audio mode once on mount
            Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            // Preload all SFX at startup
            (async () => {
                for (const [name, file] of Object.entries(SoundFiles)) {
                    if (name === 'background_music') continue;
                    try {
                        const { sound } = await Audio.Sound.createAsync(file, { volume: 0.85 });
                        soundCache.current[name as SoundName] = sound;
                    } catch (e) {
                        console.error(`[Audio] Failed to load ${name}:`, e);
                    }
                }
            })();
        } catch (e) {
            console.warn('Audio init failed silently', e);
        }

        return () => {
            // Cleanup all sounds on unmount
            Object.values(soundCache.current).forEach(s => s?.unloadAsync());
            bgMusic.current?.unloadAsync();
        };
    }, []);

    const play = useCallback(async (name: SoundName) => {
        if (isMuted.current || name === 'background_music') return;
        try {
            const sound = soundCache.current[name];
            if (sound) {
                await sound.setPositionAsync(0);
                await sound.playAsync();
            }
        } catch (e) {
            // Silently fail — never crash over audio
        }
    }, []);

    const startMusic = useCallback(async () => {
        if (isMuted.current) return;
        try {
            // If already playing, do nothing
            if (bgMusic.current) {
                const status = await bgMusic.current.getStatusAsync();
                if (status.isLoaded) return;
                await bgMusic.current.unloadAsync();
                bgMusic.current = null;
            }

            const { sound } = await Audio.Sound.createAsync(
                SoundFiles.background_music,
                { isLooping: true, volume: 0.35, shouldPlay: true }
            );
            bgMusic.current = sound;
        } catch (e) {
            console.warn('BGM failed silently:', e);
        }
    }, []);

    const stopMusic = useCallback(async () => {
        try {
            await bgMusic.current?.stopAsync();
        } catch (e) { }
    }, []);

    const toggleMute = useCallback(async () => {
        isMuted.current = !isMuted.current;
        if (isMuted.current) {
            await bgMusic.current?.setVolumeAsync(0);
        } else {
            await bgMusic.current?.setVolumeAsync(0.35);
        }
        return isMuted.current;
    }, []);

    return { play, startMusic, stopMusic, toggleMute };
}
