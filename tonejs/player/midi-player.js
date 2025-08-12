// tonejs/player/midi-player.js
//
// v1-final：再生ウィンドウ方式 + ゴースト音対策の最終版
//  - すべての Transport イベントIDを記録し、stop()で確実に clear()
//  - stop/cancel の二重バリア + 出力バスの短フェードでスパイク抑止
//  - 各ノートの再生区間を [start,end) に厳格クリップして triggerAttackRelease
//
// 依存：Tone.js（UMD / window.Tone）/ core/setup.js / core/synth.js
import { initToneAudio } from '../core/setup.js';
import { createDefaultSynth } from '../core/synth.js';

// 内部状態
let _synth = null;            // 現在の楽器
let _getInstrument = null;    // 注入ファクトリ（Sampler 等）
let _midi = null;             // @tonejs/midi の Midi インスタンス
let _totalEndSeconds = null;  // 全曲の (time+duration) 最大値

let _isPlaying = false;
let _isStopping = false;

let _onPlayStartCallback = () => {};
let _onPlayEndCallback = () => {};

let _watchdogId = null;
let _doneCalled = false;
let _scheduledIds = [];       // Transport イベントIDの記録

// 出力専用バス（プレイヤー最終段）
let _outGain = null;          // Tone.Gain → toDestination

// -- 公開API -----------------------------------------------------

/**
 * 再生準備（AudioContext起動、楽器準備、出力バス構築）
 * @param {{midi:any, getInstrument?:()=>Promise<any>|any}} opts
 */
export async function setupMidiPlayer({ midi, getInstrument } = {}) {
  if (!midi) throw new Error('[midi-player] setupMidiPlayer: "midi" is required.');
  if (typeof Tone === 'undefined') throw new Error('[midi-player] Tone.js not loaded.');

  // AudioContext をユーザー操作後に確実に起動
  await initToneAudio();

  _midi = midi;
  _getInstrument = (typeof getInstrument === 'function') ? getInstrument : null;

  // 出力バス（プレイヤーの最終段）
  if (!_outGain) {
    _outGain = new Tone.Gain(1).toDestination();
  }

  // ★ ここが重要：楽器は dispose しない。必要に応じて「差し替え」だけ行う。
  // TonejsManager 側で instrument タイプが変わった場合、_getInstrument() は新しい実体を返すはず。
  if (_getInstrument) {
    const candidate = await _getInstrument();
    if (candidate !== _synth) {
      // 古い楽器は「切断のみ」。dispose は絶対にしない（Transportコールバックが残っている可能性があるため）
      try { _synth?.disconnect?.(); } catch {}
      _synth = candidate;
      // 二重接続ガードで接続
      try {
        if (!_synth._connectedToOut) {
          _synth.disconnect?.();           // 念のため一旦切って
          _synth.connect?.(_outGain);      // 出力バスへ接続
          _synth._connectedToOut = true;   // 自前フラグで多重接続防止
        }
      } catch {}
    } else {
      // 同一実体なら、出力バスが再生成されていても良いように接続だけ保証
      try {
        if (!_synth._connectedToOut) {
          _synth.disconnect?.();
          _synth.connect?.(_outGain);
          _synth._connectedToOut = true;
        }
      } catch {}
    }
  } else {
    // 注入ファクトリが無い場合はデフォルトシンセ（PolySynth）を一度だけ生成し、以後使い回す
    if (!_synth) {
      _synth = createDefaultSynth();
      try {
        _synth.disconnect?.();
        _synth.connect?.(_outGain);
        _synth._connectedToOut = true;
      } catch {}
    } else {
      try {
        if (!_synth._connectedToOut) {
          _synth.disconnect?.();
          _synth.connect?.(_outGain);
          _synth._connectedToOut = true;
        }
      } catch {}
    }
  }

  // 再生範囲計算（そのまま）
  _totalEndSeconds = computeTotalEndSeconds(_midi);
  console.log(`[midi-player] totalEndSeconds = ${_totalEndSeconds.toFixed(3)}s`);
}


/** 再生中か？ */
export function isPlaying() { return _isPlaying; }

/** 再生開始フック設定 */
export function setOnPlayStart(callback) { _onPlayStartCallback = callback || (()=>{}); }
/** 再生終了フック設定 */
export function setOnPlayEnd(callback) { _onPlayEndCallback = callback || (()=>{}); }

/** 全再生 */
export function playAll(onDone) {
  ensureReady();
  playBySeconds(0, _totalEndSeconds, onDone);
}

/**
 * 指定秒範囲を再生（[start,end)）
 * @param {number} startSeconds
 * @param {number} endSeconds
 * @param {Function} [onDone]
 */
export function playBySeconds(startSeconds, endSeconds, onDone) {
  ensureReady();
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
    throw new Error('[midi-player] playBySeconds requires numeric startSeconds and endSeconds.');
  }
  if (endSeconds <= startSeconds) {
    console.warn('[midi-player] endSeconds <= startSeconds. Nothing to play.');
    stop(); onDone && onDone(); return;
  }

  // 既存再生を完全停止・掃除
  hardStopAndClear();

  _isPlaying = true;
  _isStopping = false;
  _doneCalled = false;

  try { _onPlayStartCallback(); } catch (e) { console.error(e); }

  try { _outGain.gain.cancelScheduledValues(0); _outGain.gain.value = 1; } catch {}

  try { Tone.Transport.stop(); } catch {}
  try { Tone.Transport.cancel(0); } catch {}
  clearAllScheduled();

  const EPS = 1e-6;
  const winStart = startSeconds;
  const winEnd   = endSeconds - EPS;

  // ノートをスケジュール（曲頭基準秒）
  const ids = [];
  for (const track of _midi.tracks) {
    for (const note of track.notes) {
      const nStart = note.time;
      const nEnd   = note.time + note.duration;
      if (nEnd <= winStart || nStart >= winEnd) continue;

      const when    = Math.max(nStart, winStart);
      const maxEnd  = Math.min(nEnd,   winEnd);
      const playDur = Math.max(0, maxEnd - when);
      if (playDur <= 0) continue;

      const id = Tone.Transport.schedule((time) => {
        try { _synth.triggerAttackRelease(note.name, playDur, time, note.velocity); }
        catch (e) { console.error('[midi-player] triggerAttackRelease failed:', e); }
      }, when);
      ids.push(id);
    }
  }
  _scheduledIds.push(...ids);

  // 終了直前の短フェード（出力専用バスで 3ms）
  const MUTE_MARGIN = 0.003;
  if (endSeconds > startSeconds + MUTE_MARGIN) {
    const idMute = Tone.Transport.scheduleOnce((time) => {
      try { _outGain.gain.rampTo(0, 0.003, time); } catch {}
    }, endSeconds - MUTE_MARGIN);
    _scheduledIds.push(idMute);
  }

  // releaseAll（対応楽器のみ）
  const RELEASE_EPS = 0.0005;
  if (typeof _synth?.releaseAll === 'function' && endSeconds > startSeconds + RELEASE_EPS) {
    const idRel = Tone.Transport.scheduleOnce((time) => {
      try { _synth.releaseAll(time); } catch {}
    }, endSeconds - RELEASE_EPS);
    _scheduledIds.push(idRel);
  }

  // 再生終端で停止
  const idEnd = Tone.Transport.scheduleOnce((time) => {
    safeStopAndFinish(onDone, time);
  }, endSeconds);
  _scheduledIds.push(idEnd);

  // 再生
  Tone.Transport.start(undefined, startSeconds);

  // ウォッチドッグ（保険）
  const duration = Math.max(0, endSeconds - startSeconds);
  _watchdogId = setTimeout(() => {
    if (!_isPlaying || _doneCalled) return;
    console.warn('[midi-player] Watchdog fired. Forcing stop.');
    safeStopAndFinish(onDone, undefined);
  }, (duration + 0.25) * 1000);
}

/** 手動停止（できればユーザー操作で） */
export function stop(timeArg) {
  if (_isStopping) return;
  _isStopping = true;

  if (_watchdogId) { clearTimeout(_watchdogId); _watchdogId = null; }

  if (_isPlaying) {
    _isPlaying = false;

    clearAllScheduled();

    try {
      try { _synth?.releaseAll?.(timeArg); } catch {}

      if (typeof timeArg === 'number' && Number.isFinite(timeArg)) {
        Tone.Transport.stop(timeArg);
        Tone.Transport.cancel(timeArg + 0.05);
      } else {
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
      }
    } catch (e) {
      console.error('[midi-player] stop error:', e);
    }

    try { _onPlayEndCallback(); } catch (e) { console.error(e); }

    try { _outGain.gain.cancelScheduledValues(0); _outGain.gain.rampTo(1, 0.005); } catch {}
  }

  _isStopping = false;
}

// -- 内部ユーティリティ ------------------------------------------

function computeTotalEndSeconds(midi) {
  let maxEnd = 0;
  for (const track of midi.tracks) {
    for (const n of track.notes) {
      const end = n.time + n.duration;
      if (end > maxEnd) maxEnd = end;
    }
  }
  return maxEnd;
}

function ensureReady() {
  if (typeof Tone === 'undefined') throw new Error('[midi-player] Tone.js not loaded.');
  if (!_midi) throw new Error('[midi-player] Not set up. Call setupMidiPlayer() first.');
  if (!_synth) throw new Error('[midi-player] Instrument is not ready.');
  if (!_outGain) _outGain = new Tone.Gain(1).toDestination();
}

function clearAllScheduled() {
  for (const id of _scheduledIds) {
    try { Tone.Transport.clear(id); } catch {}
  }
  _scheduledIds.length = 0;
}

function hardStopAndClear() {
  try { Tone.Transport.stop(); } catch {}
  try { Tone.Transport.cancel(0); } catch {}
  clearAllScheduled();
  if (_watchdogId) { clearTimeout(_watchdogId); _watchdogId = null; }
}

function safeStopAndFinish(done, timeArg) {
  if (_doneCalled) return;
  _doneCalled = true;
  try {
    if (typeof timeArg === 'number' && Number.isFinite(timeArg)) {
      stop(timeArg);
    } else {
      stop();
    }
  } catch (e) { console.error(e); }
  try { done && done(); } catch (e) { console.error(e); }
}
