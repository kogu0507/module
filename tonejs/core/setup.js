// tonejs/core/setup.js
// Tone.js (UMD / window.Tone) が既にロードされている前提

/** @type {boolean} AudioContext を開始済みかどうかのフラグ */
let _audioStarted = false;

/**
 * Tone.js の AudioContext を一度だけ開始します。
 * ユーザー操作（クリック等）の中で呼び出してください。
 * 2回目以降は何もしません。
 * @returns {Promise<void>}
 */
export async function initToneAudio() {
  if (typeof Tone === 'undefined') {
    throw new Error('[core/setup] Tone.js がロードされていません。');
  }
  if (_audioStarted) return;

  try {
    await Tone.start();
    _audioStarted = true;
    console.log('[core/setup] オーディオコンテキストが開始されました。');
  } catch (error) {
    console.error('[core/setup] オーディオ初期化エラー:', error);
    throw error;
  }
}
