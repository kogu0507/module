// tonejs/core/loader.js
import { loadScript } from '../../library-loader.js'; // library-loader.jsへの相対パス

/**
 * Tone.jsをロードします。
 * @returns {Promise<void>}
 */
export function loadToneJs() {
    return loadScript('Tone.js', 'https://unpkg.com/tone@15.1.22/build/Tone.js');
}