// tonejs/core/play-range.js

import { getBpm } from './tempo.js';

/**
 * 音楽の小節と拍をTone.jsのタイムフォーマットに変換するロジック。
 */

// 1拍の秒数を計算する
const getBeatDuration = (bpm) => {
    return 60 / bpm;
};

/**
 * 小節番号と拍を秒数に変換します。
 * @param {number} measure 小節番号（0から開始）
 * @param {number} beat 拍数（0から開始）
 * @param {number} beatsPerMeasure 1小節あたりの拍数（デフォルト: 4）
 * @returns {number} 変換された秒数
 */
export const measureAndBeatToSeconds = (measure, beat, beatsPerMeasure = 4) => {
    const bpm = getBpm();
    if (bpm === 0) {
        console.error('BPMが設定されていません。先にテンポを設定してください。');
        return 0;
    }
    const totalBeats = (measure * beatsPerMeasure) + beat;
    return totalBeats * getBeatDuration(bpm);
};

/**
 * 小節の開始位置と長さを秒数に変換します。
 * @param {number} startMeasure 再生開始小節（0から開始）
 * @param {number} endMeasure 再生終了小節（0から開始）
 * @param {number} beatsPerMeasure 1小節あたりの拍数（デフォルト: 4）
 * @returns {{ startSeconds: number, durationSeconds: number }}
 */
export const getPlayRangeInSeconds = (startMeasure, endMeasure, beatsPerMeasure = 4) => {
    const bpm = getBpm();
    if (bpm === 0) {
        console.error('BPMが設定されていません。先にテンポを設定してください。');
        return { startSeconds: 0, durationSeconds: 0 };
    }
    const beatDuration = getBeatDuration(bpm);

    const startTotalBeats = startMeasure * beatsPerMeasure;
    const endTotalBeats = endMeasure * beatsPerMeasure;

    const startSeconds = startTotalBeats * beatDuration;
    const durationSeconds = (endTotalBeats - startTotalBeats) * beatDuration;

    return {
        startSeconds,
        durationSeconds
    };
};