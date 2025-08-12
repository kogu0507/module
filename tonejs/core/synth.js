// tonejs/core/synth.js
// 楽器は「接続せず」に返す（toDestinationしない）
// 接続はプレイヤー側（midi-player.js）で専用バス（_outGain）へ行う

/**
 * デフォルト設定の PolySynth(Tone.Synth) を作成して返します（未接続）。
 * 和音（配列）を triggerAttackRelease に渡せます。
 * @returns {any} Tone.PolySynth インスタンス（未接続）
 * @throws {Error} Tone.js が未ロードの場合
 */
export function createDefaultSynth() {
  if (typeof Tone === 'undefined') {
    console.error('[core/synth] Tone.jsがロードされていません。シンセを作成できません。');
    throw new Error('Tone.js is not loaded. Cannot create synth.');
  }

  // v15系で広く動く生成方法：Voiceに Tone.Synth を使う PolySynth
  // maxPolyphony は必要に応じて調整（12〜24程度）
  const poly = new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 12,
    // voice のデフォルト Envelope を少しだけ短めに
    // （環境により無視される場合もあるので try/catch 下で set も行います）
    envelope: { attack: 0.01, release: 0.1 },
  });

  // 安全な初期値（必要に応じて調整）
  try {
    poly.volume.value = 0; // dB
    // 念のため set 経由でも反映を試みる（将来のTone変更に備えて）
    poly.set?.({ envelope: { attack: 0.01, release: 0.1 } });
  } catch (e) {
    console.warn('[core/synth] init params failed:', e);
  }

  console.log('[core/synth] デフォルトPolySynthを作成（未接続）');
  return poly;
}

/**
 * 単音テスト（接続は呼び出し側の責務）
 * PolySynth でも単音はそのまま鳴らせます。
 * @param {any} synth Tone.PolySynth
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
