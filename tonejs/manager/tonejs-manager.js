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
    /** @private */ this._isSetup = false;       // setup 済みフラグ
    /** @private */ this._instrument = null;     // 現在使用中の発音器（Synth/Sampler）
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
    this._isSetup = true;
  }

  get isSetup() { return this._isSetup; }

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

    // getInstrument は１回だけ生成し、同じ実体を使い回す
    const getInstrument = async () => {
      if (this._instrument) return this._instrument;
      this._instrument = (this._instrumentType === 'sampler')
        ? await createSalamanderSampler()
        : createDefaultSynth();
      return this._instrument;
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
  stop() {
    // MIDI 再生の停止
    playerStop();
    // 手動で鳴らした和音/ベルも止める（メソッドがあれば）
    try {
      this._instrument?.releaseAll?.();
    } catch (_) { }
  }

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

    // 次回要求時に作り直す
    this._instrument = null;
  }






  // ================================
  // tonejsManager への追記メソッド
  // ================================
  /**
   * 主和音を鳴らします（同時和音がデフォルト）。
   * @param {Object} opts
   * @param {string[]} opts.notes      - ["C4","E4","G4"] などの音名配列
   * @param {number} [opts.duration=1] - 長さ（秒）
   * @param {boolean} [opts.arpeggiate=false] - アルペジオ再生なら true
   * @param {string} [opts.arpRate="8n"]      - アルペジオの刻み（"8n","16n" など）
   * @param {number} [opts.velocity=0.8]      - ベロシティ（0.0～1.0）
   * @returns {Promise<void>} 再生完了で解決
   */
  async playChord(opts = {}) {
    // —— 安全なデフォルト —— 
    const {
      notes = ["C4", "E4", "G4"],
      duration = 1,
      arpeggiate = false,
      arpRate = "8n",
      velocity = 0.8,
    } = opts;

    // Tone.js がまだロードされていない/セットアップ前なら何もしないで即終了
    if (!this._isSetup) return;


    // 使用する発音器（サンプラー優先 → シンセ → どちらも無ければ何もしない）
    const instrument = await this._ensureInstrument();
    if (!instrument || typeof instrument.triggerAttackRelease !== "function") return;

    // Tone.js の「現在時刻」を取得（Transport 非依存）
    const now = (typeof Tone !== "undefined" && Tone.now) ? Tone.now() : 0;

    if (!arpeggiate) {
      // —— 同時和音：まとめて１発 —— 
      try {
        instrument.triggerAttackRelease(notes, duration, now, velocity);
      } catch (e) {
        console.warn("[tonejsManager] playChord (simultaneous) failed:", e);
      }
      // duration 経過で完了にする
      await new Promise((r) => setTimeout(r, Math.max(0, duration * 1000)));
      return;
    }

    // —— アルペジオ再生（1音ずつ時間をずらして発音）——
    let stepSec = 0.125; // 既定値 1/8秒
    try {
      if (typeof Tone !== "undefined" && Tone.Time) {
        stepSec = Tone.Time(arpRate).toSeconds(); // "8n" などを秒に変換
      }
    } catch (_) { }

    let maxEnd = 0;
    notes.forEach((n, i) => {
      const t = now + stepSec * i;
      try {
        instrument.triggerAttackRelease(n, duration, t, velocity);
        maxEnd = Math.max(maxEnd, t + duration);
      } catch (e) {
        console.warn("[tonejsManager] playChord (arpeggiate) note failed:", n, e);
      }
    });

    // 全音の終了時刻まで待って完了にする
    const waitMs = Math.max(0, (maxEnd - now) * 1000);
    await new Promise((r) => setTimeout(r, waitMs));
  }


  /**
   * 終了ベルを鳴らします。
   * - サンプラーがあれば "C6" などを使って発音
   * - 無ければシンセで短いビープ
   * @param {Object} opts
   * @param {string} [opts.bellId="endBell1"] - 将来切替用のID（今は簡易マッピング）
   * @returns {Promise<void>}
   */
  async playBell(opts = {}) {
    const { bellId = "endBell1" } = opts;
    if (!this._isSetup) return;

    // サンプラー優先／無ければシンセ
    const instrument = await this._ensureInstrument();
    if (!instrument || typeof instrument.triggerAttackRelease !== "function") return;

    // —— 簡易マッピング（必要に応じて拡張）——
    // endBell1: 明るめ短音、endBell2: 低め短音…など
    const preset = {
      endBell1: { note: "C6", dur: 0.2, vel: 0.9 },
      endBell2: { note: "G5", dur: 0.25, vel: 0.9 },
    }[bellId] || { note: "C6", dur: 0.2, vel: 0.9 };

    const now = (typeof Tone !== "undefined" && Tone.now) ? Tone.now() : 0;
    try {
      instrument.triggerAttackRelease(preset.note, preset.dur, now, preset.vel);
    } catch (e) {
      console.warn("[tonejsManager] playBell failed:", e);
    }
    await new Promise((r) => setTimeout(r, Math.max(0, preset.dur * 1000)));
  }

  /** @private */
  async _ensureInstrument() {
    if (this._instrument) return this._instrument;
    this._instrument = (this._instrumentType === 'sampler')
      ? await createSalamanderSampler()
      : createDefaultSynth();
    return this._instrument;
  }

  // 将来：小節指定での再生などはここに拡張予定（v2+）
}
