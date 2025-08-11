// tonejs/core/synth.js
// 楽器は「接続せず」に返す（toDestinationしない）
// 接続はプレイヤー側（midi-player.js）で専用バス（_outGain）へ行う

/**
 * デフォルト設定の Tone.Synth を作成して返します（未接続）。
 * @returns {any} Tone.Synth インスタンス（未接続）
 * @throws {Error} Tone.js が未ロードの場合
 */
export function createDefaultSynth() {
  if (typeof Tone === 'undefined') {
    console.error('[core/synth] Tone.jsがロードされていません。シンセを作成できません。');
    throw new Error('Tone.js is not loaded. Cannot create synth.');
  }

  const synth = new Tone.Synth();

  // 安全な初期値（必要に応じて調整）
  try {
    synth.volume.value = 0;      // dB
    synth.envelope.attack = 0.01;
    synth.envelope.release = 0.1;
  } catch (e) {
    console.warn('[core/synth] init params failed:', e);
  }

  console.log('[core/synth] デフォルトシンセサイザーを作成（未接続）');
  return synth;
}

/**
 * 単音テスト（接続は呼び出し側の責務）
 * @param {any} synth Tone.Synth
 * @param {string} note e.g. "C4"
 * @param {string|number} [duration="8n"]
 */
export function playSynthNote(synth, note, duration = '8n') {
  if (!synth || typeof synth.triggerAttackRelease !== 'function') {
    console.error('[core/synth] 無効なシンセサイザーが渡されました。');
    return;
  }
  synth.triggerAttackRelease(note, duration);
  console.log(`[core/synth] シンセで ${note} (${duration}) を発音しました`);
}

/** 簡易テスト用 */
export function playSynthTestSound(synth) {
  playSynthNote(synth, 'C4', '8n');
}
