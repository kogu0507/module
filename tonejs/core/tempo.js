// tonejs/core/tempo.js
// Tone.js (UMD / window.Tone) 前提

/**
 * BPM を設定します。
 * @param {number} bpm
 */
export function initTempo(bpm) {
  if (typeof Tone === 'undefined') {
    throw new Error('[core/tempo] Tone.js is not loaded. Cannot set tempo.');
  }
  const v = Number.isFinite(bpm) ? bpm : 120;
  Tone.Transport.bpm.value = v;
  console.log(`[core/tempo] テンポが ${v} BPMに設定されました。`);
}

/** Transport を開始（必要に応じてテスト用途で） */
export function startTempo() {
  if (typeof Tone === 'undefined') {
    throw new Error('[core/tempo] Tone.js is not loaded. Cannot start tempo.');
  }
  Tone.Transport.start();
  console.log('[core/tempo] 再生を開始しました。');
}

/** Transport を停止（必要に応じてテスト用途で） */
export function stopTempo() {
  if (typeof Tone === 'undefined') {
    throw new Error('[core/tempo] Tone.js is not loaded. Cannot stop tempo.');
  }
  Tone.Transport.stop();
  console.log('[core/tempo] 再生を停止しました。');
}

/** 現在の BPM を取得します。 */
export function getBpm() {
  if (typeof Tone === 'undefined') {
    throw new Error('[core/tempo] Tone.js is not loaded. Cannot get BPM.');
  }
  return Tone.Transport.bpm.value;
}
