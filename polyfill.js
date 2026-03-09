import 'react-native-get-random-values';
import 'react-native-quick-crypto';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

// KEEP: Structured clone is needed for some Solana dependencies on older RN versions
if (typeof global.structuredClone === 'undefined') {
    const polyfill = function (obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) {
            return obj.map(item => polyfill(item));
        }
        if (obj instanceof Map) return new Map(polyfill(Array.from(obj)));
        if (obj instanceof Set) return new Set(polyfill(Array.from(obj)));

        const clonedObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = polyfill(obj[key]);
            }
        }
        return clonedObj;
    };

    global.structuredClone = polyfill;
    if (typeof globalThis !== 'undefined') globalThis.structuredClone = polyfill;
    if (typeof self !== 'undefined') self.structuredClone = polyfill;

    console.log("✅ [BLITZ] StructuredClone Polyfill Active");
}
