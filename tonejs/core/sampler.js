// tonejs/core/sampler.js
// サンプラーも「接続せず」に返す（toDestinationしない）
// 接続はプレイヤー側（midi-player.js）で専用バスへ行う

/**
 * Salamander Grand Piano サンプルをロードした Tone.Sampler を返します（未接続）。
 * @returns {Promise<any>} ロード済み Sampler（未接続）
 * @throws {Error} Tone.js が未ロードの場合
 */
export function createSalamanderSampler() {
  if (typeof Tone === 'undefined') {
    console.error('[core/sampler] Tone.jsがロードされていません。サンプラーを作成できません。');
    throw new Error('Tone.js is not loaded. Cannot create sampler.');
  }

  return new Promise((resolve, reject) => {
    const sampler = new Tone.Sampler({
      urls: {
        C1: 'C1.mp3',
        C2: 'C2.mp3',
        C3: 'C3.mp3',
        C4: 'C4.mp3',
        C5: 'C5.mp3',
        C6: 'C6.mp3',
        C7: 'C7.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload: () => {
        console.log('[core/sampler] サラマンダーサンプルをロード（未接続）');
        resolve(sampler);
      },
      onerror: (error) => {
        console.error('[core/sampler] サンプラーのロード中にエラー:', error);
        reject(error);
      },
    });

    try {
      sampler.volume.value = 0; // dB
      sampler.attack = 0.001;
      sampler.release = 0.1;
    } catch (e) {
      console.warn('[core/sampler] init params failed:', e);
    }
  });
}

/**
 * 単音テスト（接続は呼び出し側の責務）
 * @param {any} sampler Tone.Sampler
 * @param {string} note
 * @param {string|number} [duration="8n"]
 */
export function playSamplerNote(sampler, note, duration = '8n') {
  if (!sampler || typeof sampler.triggerAttackRelease !== 'function') {
    console.error('[core/sampler] 無効なサンプラーインスタンスが渡されました。');
    return;
  }
  sampler.triggerAttackRelease(note, duration);
  console.log(`[core/sampler] サンプラーで ${note} (${duration}) を発音しました`);
}

/** 簡易テスト用 */
export function playSamplerTestSound(sampler) {
  playSamplerNote(sampler, 'C4', '8n');
}
