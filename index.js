// Polyfills MUST be the very first thing loaded
import 'node-libs-react-native/globals';
import 'react-native-get-random-values';

// structuredClone polyfill for older RN versions
if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = function (obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
    };
}

// Expo Router entry — registers the root component as "main"
import 'expo-router/entry';
