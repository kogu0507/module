// tonejs/manager/tonejs-manager.js
//
// 役割：上位アプリからの窓口。ロード順管理、楽器選択、全再生/部分再生の分岐。
// v1方針：小節→秒は Verovio 側で処理し、Manager は「秒ウィンドウ」で受ける。

import { loadToneJs } from '../core/loader.js';
import { processMidiData } from '../processor/core-processor.js';
import { createDefaultSynth } from '../core/synth.js';
import { createSalamanderSampler } from '../core/sampler.js';

import {
  setupMidiPlayer,
  setOnPlayStart,
  setOnPlayEnd,
  playAll as playerPlayAll,
  playBySeconds as playerPlayBySeconds,
  stop as playerStop,
  isPlaying as playerIsPlaying,
} from '../player/midi-player.js';

export class TonejsManager {
  constructor() {
    /** @private */ this._midi = null;              // @tonejs/midi の Midi
    /** @private */ this._timeSignature = null;     // { beatsPerMeasure, subdivision }（v1では保持のみ）
    /** @private */ this._instrumentType = 'synth'; // 'synth' | 'sampler'
  }

  /**
   * 初期化（Tone.js のロード & 再生イベントフック）
   * @param {{instrument?: 'synth'|'sampler', onPlayStart?:Function, onPlayEnd?:Function}} [opts]
   */
  async setup(opts = {}) {
    const { instrument = 'synth', onPlayStart, onPlayEnd } = opts;
    await loadToneJs();

    this._instrumentType = instrument;
    setOnPlayStart(typeof onPlayStart === 'function' ? onPlayStart : null);
    setOnPlayEnd(typeof onPlayEnd === 'function' ? onPlayEnd : null);
  }

  /**
   * Verovio からの MIDI（ArrayBuffer / Base64 等）を受け取り、再生準備。
   * - @tonejs/midi 解析（BPM/拍子反映）
   * - 楽器ファクトリ（synth/sampler）を注入してプレイヤーをセットアップ
   * @param {ArrayBuffer|string|Uint8Array} midiData
   */
  async loadFromVerovio(midiData) {
    const { midi, timeSignature } = await processMidiData(midiData);
    this._midi = midi;
    this._timeSignature = timeSignature;

    const getInstrument = async () => {
      if (this._instrumentType === 'sampler') return await createSalamanderSampler();
      return createDefaultSynth();
    };

    await setupMidiPlayer({ midi: this._midi, getInstrument });
  }

  /**
   * 再生API：
   * - 引数なし → 全再生
   * - { seconds:[start,end] } → 部分再生（秒ウィンドウ）
   * @param {{seconds?:[number,number], onDone?:Function}} [opts]
   */
  async play(opts = {}) {
    if (!this._midi) throw new Error('[TonejsManager] MIDI not loaded. Call loadFromVerovio() first.');
    const { seconds, onDone } = opts || {};
    if (!seconds) { playerPlayAll(onDone); return; }
    const [s, e] = seconds;
    playerPlayBySeconds(s, e, onDone);
  }

  /** 停止 */
  stop() { playerStop(); }

  /** 再生中か？ */
  isPlaying() { return playerIsPlaying(); }

  /**
   * 楽器タイプを切替（次回 load/setup で反映）
   * @param {'synth'|'sampler'} instrument
   */
  setInstrument(instrument) {
    if (instrument !== 'synth' && instrument !== 'sampler') {
      console.warn('[TonejsManager] Unknown instrument type:', instrument);
      return;
    }
    this._instrumentType = instrument;
  }

  // 将来：小節指定での再生などはここに拡張予定（v2+）
}
