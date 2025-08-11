# Tonejs ライブラリ

## 概要
Tone.js を活用したアプリケーションを構築するためのモジュール群です。  
Verovio から取得した MIDI データの解析・再生・楽器管理などの基盤機能を、独立したモジュールとして提供します。  
機能ごとの再利用性と保守性を高め、効率的な開発を可能にします。

---

## 今回の目標（v1）
- **Verovio側で生成されたMIDIデータをTone.jsで再生する**ことに専念
- 楽器はシンセまたはサンプラーのいずれかを選択
- AudioContextの初期化や音量・テンポなど基本的な制御を提供

## 次回以降に回す予定
- 小節範囲のリアルタイム制御（Tone.js側でのスケジューリング）
- プレイリストのシーケンス管理
- タッチキーボード・和音再生・ベル再生などのインタラクティブ機能

---

## ディレクトリ構造
```

tonejs/
├── samples/
│   ├── ...
│
├── core/
│   ├── loader.js          # Tone.js の動的ロード
│   ├── synth.js           # シンセサイザー機能
│   ├── sampler.js         # サンプラー機能
│   ├── setup.js           # AudioContext の初期化
│   ├── volume.js          # 音量調整 (未実装)
│   └── tempo.js           # テンポ管理
│
├── processor/
│   ├── core-processor.js  # MIDIデータ解析（@tonejs/midiを使用）テンポ変化は未対応
│   └── tonejs-midi-loader.js
│
├── player/
│   ├── midi-player.js     # MIDI再生機能
│   ├── jsobject-player.js # JSオブジェクト再生機能 (未実装)
│   ├── touch-keyboard.js  # タッチキーボード (未実装)
│   ├── bell-player.js     # ベル再生 (未実装)
│   └── chord-player.js    # 和音再生 (未実装)
│
└── manager/
    └── tonejs-manager.js  # 全体制御

```

## メモ
- getPlayRangeInSecondsFromOne の計算が 分母（拍子の分割）を使わず beatsPerMeasure と BPM のみなら、その旨を記載しておくと誤解が減ります。
- Salamanderの C1..C7 はだいたい取れますが、CDN都合で稀に404が出ることがあります。onerror ログ済みでOKですが、READMEに「回線/キャッシュ依存で初回遅延あり」と注意書きがあると現場で助かるはず。
- midi-player.setupMidiPlayer() は initToneAudio() を呼びますが、Tone.js自体のロード（loadToneJs()）は前段で完了している前提。READMEのクイックスタートに 1)loadToneJs() → 2) initToneAudio() → 3) MIDI解析 → 4) プレイヤーsetup の順序を 箇条書きで書いておくと、初心者が迷いません。
- 将来 *.min.js を用意するなら、CDN（jsDelivr/GH Pages）での想定パスを README末尾に「例：https://cdn.jsdelivr.net/gh/kogu0507/module@<version>/tonejs/core/...」と型を提示しておくと運用が揃います。
- https://cdn.jsdelivr.net/gh/kogu0507/dev@main/tonejs/core/...(開発用)



## 開発中のコード一覧

### `tonejs/core/loader.js`と`module/library-loader.js`
```javascript
// tonejs/core/loader.js
import { loadScript } from '../../library-loader.js'; // library-loader.jsへの相対パス

/**
 * Tone.jsをロードします。
 * @returns {Promise<void>}
 */
export function loadToneJs() {
    return loadScript('Tone.js', 'https://unpkg.com/tone@15.1.22/build/Tone.js');
}
```

```javascript
// module/library-loader.js
// —————————————————————————————————————————————————
// 汎用的に <script> を追加して外部ライブラリをロードするユーティリティ
// 既にロード済みなら再度読み込まない
// —————————————————————————————————————————————————

const loadedScripts = {};

/**
 * 外部スクリプトを動的に追加し、読み込み完了を待ちます。
 *
 * @param {string} name  識別用のキー（例: 'Tone.js', 'Verovio'）
 * @param {string} url   スクリプトのURL
 * @returns {Promise<void>}
 */
export function loadScript(name, url) {
  // すでに読み込み済みなら即解決
  if (loadedScripts[name]) {
    console.log(`[library-loader] ${name} is already loaded.`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    script.onload = () => {
      console.log(`[library-loader] ${name} loaded from ${url}`);
      loadedScripts[name] = true;
      resolve();
    };

    script.onerror = (ev) => {
      const msg = `[library-loader] Error loading ${name} from ${url}`;
      console.error(msg, ev);
      reject(new Error(msg));
    };

    document.head.appendChild(script);
  });
}

```

### `tonejs/core/synth.js`
```javascript
// tonejs/core/synth.js

/**
 * デフォルト設定のTone.Synthインスタンスを作成し、出力に接続します。
 * この関数はTone.jsがグローバルスコープにロードされていることを前提とします。
 *
 * @returns {Tone.Synth} 設定済みのTone.Synthインスタンス。
 * @throws {Error} Tone.jsがロードされていない場合にスローされます。
 */
export function createDefaultSynth() {
    // Tone.jsが利用可能かチェック
    if (typeof Tone === 'undefined') {
        console.error("[core/synth] Tone.jsがロードされていません。シンセを作成できません。");
        throw new Error("Tone.js is not loaded. Cannot create synth.");
    }

    // デフォルトのシンセサイザーを作成し、メイン出力に接続
    const synth = new Tone.Synth().toDestination();
    console.log("[core/synth] デフォルトシンセサイザーが作成されました。");
    return synth;
}

/**
 * 指定されたシンセサイザーを使用して、特定の音を鳴らします。
 *
 * @param {Tone.Synth} synth
 * 音を鳴らすために使用するTone.Synthのインスタンス。
 * @param {string} note
 * 鳴らす音の音名（例: "C4", "A#3"）。
 * @param {string} duration
 * 音の長さ（例: "8n" = 8分音符, "4n" = 4分音符）。
 */
export function playSynthNote(synth, note, duration = "8n") {
    if (!synth || typeof synth.triggerAttackRelease !== 'function') {
        console.error("[core/synth] 無効なシンセサイザーインスタンスが渡されました。");
        return;
    }

    synth.triggerAttackRelease(note, duration);
    console.log(`[core/synth] シンセで ${note} (${duration}) の音が鳴りました！`);
}

/**
 * 読み込みテストを目的とした、シンセでC4の音を鳴らす関数です。
 * 実際のアプリケーションでは、この関数はテストやデバッグでのみ使用することを推奨します。
 *
 * @param {Tone.Synth} synth
 * 音を鳴らすために使用するTone.Synthのインスタンス。
 */
export function playSynthTestSound(synth) {
    playSynthNote(synth, "C4", "8n");
}


// 将来的に、FMSynthやAMSynthなど、他の種類のシンセサイザーを作成する関数をここに追加できます。
// 例:
/*
export function createFMSynth() {
    if (typeof Tone === 'undefined') {
        console.error("[core/synth] Tone.jsがロードされていません。FMSynthを作成できません。");
        throw new Error("Tone.js is not loaded. Cannot create FMSynth.");
    }
    const fmSynth = new Tone.FMSynth().toDestination();
    console.log("[core/synth] FMシンセサイザーが作成されました。");
    return fmSynth;
}
*/

```

### `tonejs/core/sampler.js`
```javascript
// tonejs/core/sampler.js
// SamplerはTone.jsがグローバルスコープにロードされていることを前提とします。

/**
 * サラマンダーグランドピアノのサンプルをロードしたTone.Samplerインスタンスを作成し、出力に接続します。
 * サンプルのロードには時間がかかる場合があります。
 *
 * @returns {Promise<Tone.Sampler>} ロードが完了したTone.Samplerインスタンスを解決するPromise。
 * @throws {Error} Tone.jsがロードされていない場合にスローされます。
 */
export function createSalamanderSampler() {
    if (typeof Tone === 'undefined') {
        console.error("[core/sampler] Tone.jsがロードされていません。サンプラーを作成できません。");
        throw new Error("Tone.js is not loaded. Cannot create sampler.");
    }

    // Tone.Samplerのインスタンスを作成し、サンプルをロード
    // サラマンダーグランドピアノのサンプルは、Tone.jsの公式デモページで利用されているCDNから取得します。
    return new Promise((resolve, reject) => {
        const sampler = new Tone.Sampler({
            urls: {
                "C1": "C1.mp3",
                "C2": "C2.mp3",
                "C3": "C3.mp3",
                "C4": "C4.mp3",
                "C5": "C5.mp3",
                "C6": "C6.mp3",
                "C7": "C7.mp3",
            },
            baseUrl: "https://tonejs.github.io/audio/salamander/", // サンプルのベースURL
            onload: () => {
                console.log("[core/sampler] サラマンダーサンプラーのサンプルがロードされました。");
                sampler.toDestination(); // メイン出力に接続
                resolve(sampler); // ロード完了後、サンプラーインスタンスを解決
            },
            onerror: (error) => {
                console.error("[core/sampler] サラマンダーサンプラーのロード中にエラーが発生しました:", error);
                reject(error); // エラー発生時、Promiseを拒否
            }
        });
    });
}

/**
 * 指定されたサンプラーを使用して、特定の音を鳴らします。
 *
 * @param {Tone.Sampler} sampler
 * 音を鳴らすために使用するTone.Samplerのインスタンス。
 * @param {string} note
 * 鳴らす音の音名（例: "C4", "A#3"）。
 * @param {string} duration
 * 音の長さ（例: "8n" = 8分音符, "4n" = 4分音符）。
 */
export function playSamplerNote(sampler, note, duration = "8n") {
    if (!sampler || typeof sampler.triggerAttackRelease !== 'function') {
        console.error("[core/sampler] 無効なサンプラーインスタンスが渡されました。");
        return;
    }

    sampler.triggerAttackRelease(note, duration);
    console.log(`[core/sampler] サンプラーで ${note} (${duration}) の音が鳴りました！`);
}

/**
 * 読み込みテストを目的とした、サンプラーでC4の音を鳴らす関数です。
 *
 * @param {Tone.Sampler} sampler
 * 音を鳴らすために使用するTone.Samplerのインスタンス。
 */
export function playSamplerTestSound(sampler) {
    playSamplerNote(sampler, "C4", "8n");
}

```
### `tonejs/core/setup.js`
```javascript
// tonejs/core/setup.js

// Tone.jsがグローバルスコープにロードされていることを前提としています。
// このモジュールを使用する前に、loader.jsでTone.jsをロードする必要があります。

/** AudioContext がすでに起動済みかどうか */
let _audioStarted = false;

/**
 * Tone.js の AudioContext をユーザー操作内で一度だけ再開します。
 * ユーザーのインタラクション（クリックなど）後に呼び出す必要があります。
 * 2 回目以降の呼び出しでは何もしません。
 *
 * @returns {Promise<void>} オーディオコンテキストが開始されると解決するPromise。
 * @throws {Error} Tone.jsがロードされていない場合、またはオーディオ初期化中にエラーが発生した場合にスローされます。
 */
export async function initToneAudio() {
    if (typeof Tone === 'undefined') {
        throw new Error('[core/setup] Tone.js がロードされていません。');
    }

    if (_audioStarted) {
        // すでに起動済みならスキップ
        return;
    }

    try {
        await Tone.start();
        _audioStarted = true;
        console.log("[core/setup] オーディオコンテキストが開始されました。");
    } catch (error) {
        console.error("[core/setup] オーディオの初期化中にエラーが発生しました:", error);
        throw error;
    }
}

```
### `tonejs/core/tempo.js`
```javascript
// tonejs/core/tempo.js

// Tone.jsがグローバルスコープにロードされていることを前提としています。
// このモジュールを使用する前に、loader.jsでTone.jsをロードする必要があります。


/**
* トランスポートのBPM（テンポ）を設定します。
 *
 * @param {number} bpm 設定するBPM。
 * @throws {Error} Tone.jsがロードされていない場合にスローされます。
 */
export function initTempo(bpm) {
    if (typeof Tone === 'undefined') {
        throw new Error("[core/tempo] Tone.js is not loaded. Cannot set tempo.");
    }
    
    // Tone.TransportのBPMを設定
    Tone.Transport.bpm.value = bpm;
    console.log(`[core/tempo] テンポが ${bpm} BPMに設定されました。`);
}

/**
 * 再生を開始します。
 * * @throws {Error} Tone.jsがロードされていない場合にスローされます。
 */
export function startTempo() {
    if (typeof Tone === 'undefined') {
        throw new Error("[core/tempo] Tone.js is not loaded. Cannot start tempo.");
    }
    
    // トランスポートを開始
    Tone.Transport.start();
    console.log("[core/tempo] 再生を開始しました。");
}

/**
 * 再生を停止します。
 * * @throws {Error} Tone.jsがロードされていない場合にスローされます。
 */
export function stopTempo() {
    if (typeof Tone === 'undefined') {
        throw new Error("[core/tempo] Tone.js is not loaded. Cannot stop tempo.");
    }
    
    // トランスポートを停止
    Tone.Transport.stop();
    console.log("[core/tempo] 再生を停止しました。");
}

/**
 * 現在のBPMを取得します。
 * * @returns {number} 現在のBPM。
 * @throws {Error} Tone.jsがロードされていない場合にスローされます。
 */
export function getBpm() {
    if (typeof Tone === 'undefined') {
        throw new Error("[core/tempo] Tone.js is not loaded. Cannot get BPM.");
    }
    
    return Tone.Transport.bpm.value;
}
```
### `tonejs/processor/core-processor.js`
```javascript
// processor/core-processor.js

import { loadToneJsMidi } from './tonejs-midi-loader.js';
import { initTempo } from '../core/tempo.js';

/**
 * MIDIデータを解析し、Tone.jsのMidiオブジェクトに変換します。
 * さらに、楽曲のテンポと拍子記号の情報を抽出します。
 * @param {ArrayBuffer|string} midiData MIDIファイルのArrayBufferまたはBase64文字列。
 * @returns {Promise<{midi: object, timeSignature: object}>} Tone.jsのMidiオブジェクトと拍子記号を解決するPromise。
 */
export async function processMidiData(midiData) {
    try {
        const Midi = await loadToneJsMidi();
        const midi = new Midi(midiData);

        // MIDIヘッダーからテンポ情報を抽出し、tempo.jsに設定
        if (midi.header && midi.header.tempos && midi.header.tempos.length > 0) {
            const firstTempo = midi.header.tempos[0].bpm;
            initTempo(firstTempo);
            console.log(`[core-processor] MIDIからBPMを検出しました: ${firstTempo}`);
        } else {
            initTempo(120);
            console.warn('[core-processor] MIDIにテンポ情報が見つかりませんでした。デフォルトの120BPMを使用します。');
        }

        // MIDIヘッダーから拍子記号を抽出し、プレイレンジ計算のために返却する
        let timeSignature = { beatsPerMeasure: 4, subdivision: 4 }; // デフォルトは4/4拍子
        if (midi.header && midi.header.timeSignatures && midi.header.timeSignatures.length > 0) {
            const firstSignature = midi.header.timeSignatures[0];
            timeSignature = {
                // テストコードの形式に合わせ、`timeSignature`配列から取得
                beatsPerMeasure: firstSignature.timeSignature[0], // 分子
                subdivision: firstSignature.timeSignature[1] // 分母
            };
            console.log(`[core-processor] MIDIから拍子記号を検出しました: ${timeSignature.beatsPerMeasure}/${timeSignature.subdivision}`);
        } else {
            console.warn('[core-processor] MIDIに拍子記号が見つかりませんでした。デフォルトの4/4拍子を使用します。');
        }

        // 拍子記号も追加して返す
        return {
            midi: midi,
            timeSignature: timeSignature
        };
    } catch (e) {
        console.error('[core-processor] MIDIデータの解析に失敗しました:', e);
        throw e;
    }
}
```
### `tonejs/processor/tonejs-midi-loader.js`
```javascript
/*
 * ◆ tonejs-midi-loader.js
 * - 役割: Skypack経由で @tonejs/midi をロードし、Midi クラスを返す。
 * - 依存: なし
 * - 使い方:
 *   import { loadToneJsMidi } from './tonejs-midi-loader.js';
 *   const Midi = await loadToneJsMidi();
 *   const midi = new Midi();
 */

export async function loadToneJsMidi() {
    console.log('[tonejs-midi-loader] Skypack経由で @tonejs/midi をロード開始...');

    try {
        // SkypackからESMとしてインポート
        const module = await import('https://cdn.skypack.dev/@tonejs/midi@2.0.28');
        
        if (!module || typeof module.Midi !== 'function') {
            throw new Error('Midi クラスが見つかりません！');
        }

        console.log('[tonejs-midi-loader] @tonejs/midi ロード成功！');
        return module.Midi;

    } catch (e) {
        console.error('[tonejs-midi-loader] @tonejs/midi ロード失敗:', e);
        throw e;
    }
}

```
### `tonejs/player/midi-player.js`
```javascript
// tonejs/player/midi-player.js
//
// v1方針：このプレイヤーは「秒ウィンドウ」で再生する。
//  - 全再生：start=0, end=曲末秒 を使う
//  - 部分再生：startSeconds/endSeconds を呼び出し元（Manager等）で決めて渡す
//  - 小節→秒 への変換は Verovio 側（または上位レイヤ）で行う
//
// 依存：
//  - Tone.js（UMD / window.Tone）
//  - core/setup.js（initToneAudio）
//  - core/synth.js（createDefaultSynth）
//  - （テンポは processor/core-processor.js で初期化済みの前提）

import { initToneAudio } from '../core/setup.js';
import { createDefaultSynth } from '../core/synth.js';

// -------------------------------------------------------
// 内部状態
// -------------------------------------------------------
let _synth = null;             // 現在の再生用インストゥルメント（デフォは Synth）
let _getInstrument = null;     // 外部から注入されるインストゥルメントファクトリ（Sampler 切替用）
let _midi = null;              // @tonejs/midi の Midi インスタンス
let _totalEndSeconds = null;   // 全曲の最終終了秒（time+duration の最大値）をキャッシュ

let _isPlaying = false;
let _isStopping = false;

let _onPlayStartCallback = () => {};
let _onPlayEndCallback = () => {};

let _watchdogId = null;
let _doneCalled = false;

// -------------------------------------------------------
// 公開API
// -------------------------------------------------------

/**
 * プレイヤーのセットアップ。
 * - AudioContextを（必要なら）起動
 * - インストゥルメントを準備（デフォルトは Synth、必要なら注入関数で上書き）
 *
 * @param {object} opts
 * @param {object} opts.midi           @tonejs/midi の Midi インスタンス
 * @param {function(): Promise<AudioNode>|function(): AudioNode} [opts.getInstrument]
 *        楽器作成関数（例：サンプラーを返す）。戻り値は Tone の発音ノードに繋がるもの。
 *        未指定時は Synth を作成します。
 */
export async function setupMidiPlayer({ midi, getInstrument } = {}) {
    if (!midi) throw new Error('[midi-player] setupMidiPlayer: "midi" is required.');
    if (typeof Tone === 'undefined') throw new Error('[midi-player] Tone.js not loaded.');

    await initToneAudio(); // クリック内から呼ばれていることが前提

    _midi = midi;
    _getInstrument = typeof getInstrument === 'function' ? getInstrument : null;

    // 楽器を初期化（注入優先・なければデフォルトSynth）
    if (_synth && typeof _synth.dispose === 'function') {
        try { _synth.dispose(); } catch {}
        _synth = null;
    }
    _synth = _getInstrument ? await _getInstrument() : createDefaultSynth();

    // 全曲の終了秒をキャッシュ（初回のみ計算）
    _totalEndSeconds = computeTotalEndSeconds(_midi);
    console.log(`[midi-player] totalEndSeconds = ${_totalEndSeconds.toFixed(3)}s`);
}

/** 再生中かを返す */
export function isPlaying() {
    return _isPlaying;
}

/** 再生開始フック */
export function setOnPlayStart(callback) {
    _onPlayStartCallback = callback || (() => {});
}

/** 再生終了フック */
export function setOnPlayEnd(callback) {
    _onPlayEndCallback = callback || (() => {});
}

/**
 * 全再生（曲頭から曲末まで）
 * @param {Function} [onDone] 完了時に呼ばれるコールバック
 */
export function playAll(onDone) {
    ensureReady();
    playBySeconds(0, _totalEndSeconds, onDone);
}

/**
 * 指定秒範囲を再生（v1基本API）
 * @param {number} startSeconds 再生開始秒（曲頭=0）
 * @param {number} endSeconds   再生終了秒（この時点で止める）
 * @param {Function} [onDone]   完了時のコールバック
 */
export function playBySeconds(startSeconds, endSeconds, onDone) {
    ensureReady();

    if (typeof startSeconds !== 'number' || typeof endSeconds !== 'number') {
        throw new Error('[midi-player] playBySeconds requires numeric startSeconds and endSeconds.');
    }
    if (endSeconds <= startSeconds) {
        console.warn('[midi-player] endSeconds <= startSeconds. Nothing to play.');
        stop(); // 念のため
        onDone && onDone();
        return;
    }

    // 既に再生中なら一旦止める
    if (_isPlaying) {
        console.warn('[midi-player] Already playing. Stopping current playback before starting new one.');
        stop(); // クリーン
    }

    _isPlaying = true;
    _isStopping = false;
    _doneCalled = false;

    try { _onPlayStartCallback(); } catch (e) { console.error(e); }

    // Transport をクリーンアップして、タイムラインを再構築
    try { Tone.Transport.stop(); } catch {}
    try { Tone.Transport.cancel(0); } catch {}

    // ノートをスケジュール（曲頭からの絶対秒で登録し、start(offset) で途中から再生）
    // @tonejs/midi の note.time / note.duration は秒なのでそのまま使える
    _midi.tracks.forEach(track => {
        track.notes.forEach(note => {
            const t = note.time;
            if (t >= startSeconds && t < endSeconds) {
                // Transport.schedule のコールバック引数 time は AudioContext 時刻
                Tone.Transport.schedule((time) => {
                    try {
                        _synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);
                    } catch (e) {
                        console.error('[midi-player] triggerAttackRelease failed:', e);
                    }
                }, t); // "when" は曲頭からの絶対秒
            }
        });
    });

    // ★ 終了イベント：Transport の「終端」に停止予約
    //   cancel はほんの少し先に（境界競合を避けるため 0.001s だけ先へ）
    const CANCEL_EPS = 0.001;
    Tone.Transport.scheduleOnce((time /* AudioContext 時刻 */) => {
        safeStopAndFinish(onDone, time, CANCEL_EPS);
    }, endSeconds);

    // 再生開始（offset=startSeconds）
    Tone.Transport.start(undefined, startSeconds);

    // 念のためのウォッチドッグ（スケジューラ取りこぼし保険）
    const duration = Math.max(0, endSeconds - startSeconds);
    _watchdogId = setTimeout(() => {
        if (!_isPlaying || _doneCalled) return;
        console.warn('[midi-player] Watchdog fired. Forcing stop.');
        safeStopAndFinish(onDone, undefined, CANCEL_EPS);
    }, (duration + 0.25) * 1000);
}

/**
 * 停止（手動停止）
 * - scheduleOnce の time（AudioContext時刻）が渡された場合はそれを尊重
 * - 渡されない場合は即時停止→全キャンセル
 */
export function stop(timeArg) {
    if (_isStopping) return;
    _isStopping = true;

    // ウォッチドッグ解除
    if (_watchdogId) {
        clearTimeout(_watchdogId);
        _watchdogId = null;
    }

    if (_isPlaying) {
        _isPlaying = false;

        try {
            if (timeArg !== undefined) {
                Tone.Transport.stop(timeArg);
                Tone.Transport.cancel(timeArg + 0.001); // ほんの少し先をキャンセル
            } else {
                Tone.Transport.stop();
                Tone.Transport.cancel(0);
            }
        } catch (e) {
            console.error('[midi-player] stop error:', e);
        }

        try { _onPlayEndCallback(); } catch (e) { console.error(e); }
    }

    _isStopping = false;
}

// -------------------------------------------------------
// 内部ユーティリティ
// -------------------------------------------------------

/** 全トラック全ノートの (time + duration) の最大値（秒）を返す */
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
    if (typeof Tone === 'undefined') {
        throw new Error('[midi-player] Tone.js not loaded.');
    }
    if (!_midi) {
        throw new Error('[midi-player] Not set up. Call setupMidiPlayer() first.');
    }
    if (!_synth) {
        throw new Error('[midi-player] Instrument is not ready.');
    }
}

function safeStopAndFinish(done, timeArg, eps = 0.001) {
    if (_doneCalled) return;
    _doneCalled = true;
    try { stop(timeArg !== undefined ? timeArg : undefined - eps); } catch (e) { console.error(e); }
    try { done && done(); } catch (e) { console.error(e); }
}


```
### `tonejs/manager/tonejs-manager.js`
```javascript
// tonejs/manager/tonejs-manager.js
//
// 役割：上位アプリからの窓口。ロード順や「全再生/部分再生」の分岐、
//       楽器の選択（synth/sampler）をまとめる。
// v1方針：
//  - 小節→秒 への変換は Verovio 側で行い、Manager には秒で渡す（measures対応は将来）。
//  - 引数なし play() は全再生。play({ seconds: [s, e] }) で部分再生。
//  - サンプラーは遅延ロードがあり得るため、注入関数で midi-player に渡す。
// 依存：
//  - core/loader.js（Tone本体ローダ）
//  - processor/core-processor.js（MIDI解析：BPM/拍子抽出）
//  - core/synth.js / core/sampler.js
//  - player/midi-player.js（このモジュールが実再生）
//
// 注意：クリック/タップ等のユーザー操作内で setup() / play() を呼ぶこと。

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
  isPlaying as playerIsPlaying
} from '../player/midi-player.js';

export class TonejsManager {
  constructor() {
    /** @private */ this._midi = null;           // @tonejs/midi の Midi インスタンス
    /** @private */ this._timeSignature = null;  // { beatsPerMeasure, subdivision }（v1では未使用でも保持）
    /** @private */ this._instrumentType = 'synth'; // 'synth' | 'sampler'
  }

  /**
   * 初期化。Tone.jsロードとイベントフックを設定。
   * @param {object} [opts]
   * @param {'synth'|'sampler'} [opts.instrument='synth'] 使用する楽器
   * @param {function} [opts.onPlayStart]
   * @param {function} [opts.onPlayEnd]
   */
  async setup(opts = {}) {
    const { instrument = 'synth', onPlayStart, onPlayEnd } = opts;
    await loadToneJs(); // UMDで Tone を読み込む

    this._instrumentType = instrument;

    // イベントフックを midi-player に橋渡し
    setOnPlayStart(typeof onPlayStart === 'function' ? onPlayStart : null);
    setOnPlayEnd(typeof onPlayEnd === 'function' ? onPlayEnd : null);
  }

  /**
   * Verovioから受け取ったMIDI（ArrayBuffer or Base64）を解析・準備。
   * - @tonejs/midi に通し、BPM等を初期化（processMidiDataが担当）
   * - 再生用に midi-player をセットアップ（楽器は synth/sampler のどちらか）
   *
   * @param {ArrayBuffer|string} midiData
   */
  async loadFromVerovio(midiData) {
    const { midi, timeSignature } = await processMidiData(midiData);
    this._midi = midi;
    this._timeSignature = timeSignature;

    // 楽器ファクトリ（注入）。Samplerはロード完了まで待つ必要があるためasync対応。
    const getInstrument = async () => {
      if (this._instrumentType === 'sampler') {
        // サンプラーは重い＆遅い。UI上はロード中表示など行うと親切。
        return await createSalamanderSampler();
      } else {
        return createDefaultSynth();
      }
    };

    await setupMidiPlayer({ midi: this._midi, getInstrument });
  }

  /**
   * 再生API（v1）
   * - 引数なし：全再生
   * - { seconds: [start, end] }：部分再生（秒ウィンドウ）
   *
   * @param {object} [opts]
   * @param {[number, number]} [opts.seconds] [startSeconds, endSeconds]
   * @param {Function} [opts.onDone] 完了時コールバック
   */
  async play(opts = {}) {
    if (!this._midi) throw new Error('[TonejsManager] MIDI not loaded. Call loadFromVerovio() first.');
    const { seconds, onDone } = opts;

    if (!seconds) {
      // 全再生
      playerPlayAll(onDone);
      return;
    }
    const [s, e] = seconds;
    playerPlayBySeconds(s, e, onDone);
  }

  /** 明示停止（ユーザー操作の停止ボタン等から呼ぶ） */
  stop() {
    playerStop();
  }

  /** 再生中か？ */
  isPlaying() {
    return playerIsPlaying();
  }

  /** ランタイムで楽器を切り替える（次回 setup/load 時に反映） */
  setInstrument(instrument /* 'synth' | 'sampler' */) {
    if (instrument !== 'synth' && instrument !== 'sampler') {
      console.warn('[TonejsManager] Unknown instrument type:', instrument);
      return;
    }
    this._instrumentType = instrument;
  }

  // --- 将来拡張のためのスタブ（v2+予定） -------------------------
  // async playByMeasures({ measures: [m1, m2], onDone }) {
  //   // v1では Verovio 側で秒に変換してから play({ seconds }) を呼ぶ想定。
  //   // 将来ここに「小節→秒」ユーティリティを入れる場合はこのメソッドを実装。
  // }
}

```





## 使い方

```html
<button id="load">Load MIDI</button>
<button id="playAll">Play All</button>
<button id="playPart">Play 2.0s - 5.0s</button>
<button id="stop">Stop</button>

<script type="module">
import { TonejsManager } from './tonejs/manager/tonejs-manager.js';

// 例：ArrayBufferのMIDIを持っている前提（Verovioから取得）
async function fetchMidiArrayBuffer(url) {
  const res = await fetch(url);
  return await res.arrayBuffer();
}

const mgr = new TonejsManager();
await mgr.setup({
  instrument: 'synth', // 'sampler' にすると Salamander をロード
  onPlayStart: () => console.log('▶ start'),
  onPlayEnd:   () => console.log('■ end'),
});

document.getElementById('load').addEventListener('click', async () => {
  const buf = await fetchMidiArrayBuffer('./path/to/example.mid');
  await mgr.loadFromVerovio(buf);
  console.log('loaded');
});

document.getElementById('playAll').addEventListener('click', () => {
  mgr.play(); // 引数なし → 全再生
});

document.getElementById('playPart').addEventListener('click', () => {
  mgr.play({ seconds: [2.0, 5.0] }); // 秒ウィンドウで部分再生
});

document.getElementById('stop').addEventListener('click', () => {
  mgr.stop();
});
</script>

```



つまり“迷子イベント＋二重経路”を潰したのが効いてます。根っこは Transportの残イベント or 出力経路の取りこぼし でしたね。




































































### `TonejsManager` APIリファレンス

`TonejsManager`は、Tone.jsを使ったオーディオ処理をよりシンプルに扱うための高レベルなAPIを提供します。このクラス一つで、MIDI再生、JSオブジェクトからの再生、タッチキーボードの操作など、様々な機能を簡単に利用できます。

#### 1\. セットアップ

最初に`TonejsManager`のインスタンスを作成し、`setup()`メソッドを呼び出してオーディオコンテキストを初期化します。

```javascript
import { TonejsManager } from './module/tonejs/manager/tonejs-manager.js';

(async () => {
  const manager = new TonejsManager();
  await manager.setup();
  console.log('Tone.js is ready!');
})();
```

-----

#### 2\. MIDIファイルの再生

URLまたはテキストデータからMIDIを読み込み、再生します。`playRangeFromUrl()`と`playRangeFromMidi()`は、指定した小節の範囲を再生するのに便利です。

```javascript
// URLからMIDIを読み込み、1小節目から8小節目までを再生
const midiUrl = 'sample.midi';
await manager.playRangeFromUrl(midiUrl, '1-8');

// MIDIテキストデータから再生
const midiData = await fetch(midiUrl).then(r => r.text());
await manager.playRangeFromMidi(midiData, '1-8');
```

-----

#### 3\. JSオブジェクトからの再生

JavaScriptの配列形式のノートデータから音を再生します。

```javascript
const notes = [
  { time: '0:0', note: 'C4', duration: '8n' },
  { time: '0:2', note: 'E4', duration: '8n' },
  { time: '0:4', note: 'G4', duration: '8n' },
  { time: '1:0', note: 'C5', duration: '4n' }
];

await manager.playFromJSObject(notes);
```

-----

#### 4\. プレイリストの再生

複数の再生ステップとインターバルを組み合わせたプレイリストを、順番に実行します。

```javascript
const playlist = [
  { type: 'play', barStart: 1, barEnd: 8, label: '通奏' },
  { type: 'interval', duration: 20 },
  { type: 'play', barStart: 1, barEnd: 4, label: '前半' },
  { type: 'interval', duration: 20 },
  // ...
];

await manager.playPlaylist(playlist);
```

-----

#### 5\. タッチキーボード

HTML要素を指定して、動的にタッチキーボードを生成します。キーボードの演奏イベントを購読することも可能です。

```javascript
// <div id="keyboard-container"></div> にキーボードを生成
manager.createKeyboard('#keyboard-container');

// キーボードの楽器をピアノサンプラーに変更
manager.setKeyboardInstrument('piano-sampler');

// キーボードの鍵盤が押されたときのイベントを購読
manager.on('keyboardNoteOn', (note) => {
  console.log(`Note On: ${note}`);
});
```




作るべきサンプルを整理整頓
- 聴音実施ページ
  - プレイリストに応じて小節範囲を指定して再生する
  - ユーザーがタッチキーボードで音を確認できる
- 聴音後訓練ページ
  - テンポを変更（速書き、ゆっくり聴く）
  - 音量を変更（一部の声部の音量を調整したりミュートしたり）
  - （移調はVerovioで楽譜もMIDIも再作成）
- 楽典ページ
  - 譜例の音を鳴らす
  - 譜例をタッチキーボードで弾いてみる
- そのほか
  - MIDIデータで音を鳴らす
  - MIDIファイルで音を鳴らす（URL）
  - JSオブジェクトで音を鳴らす
  - タッチキーボードのコンポーネント






はい、承知いたしました。ご提示いただいたリストをもとに、具体的なユースケースを想定したサンプルコードのドラフトを作成します。

これらのサンプルは、`TonejsManager`が提供する高レベルAPIをどのように利用するかを具体的に示しており、開発時のユースケースの漏れを防ぐのに役立ちます。

### 聴音実施ページ

聴音練習を行うための再生と入力の機能を組み合わせたサンプルです。プレイリストに従ってMIDIを再生し、ユーザーはタッチキーボードで音を確認できます。

```html
<div id="player-ui">
    <button id="start-playlist">プレイリストを開始</button>
</div>
<div id="keyboard-container"></div>

<script type="module">
import { TonejsManager } from './module/tonejs/manager/tonejs-manager.js';

(async () => {
    const manager = new TonejsManager();
    await manager.setup();
    
    // MIDIデータを取得 (これは通奏低音の課題を想定)
    const midiUrl = 'bass-and-soprano.midi';
    const midiData = await fetch(midiUrl).then(r => r.text());

    // プレイリストの定義
    const playlist = [
        { type: 'play', barStart: 1, barEnd: 4, label: '課題演奏' },
        { type: 'interval', duration: 15 }, // 15秒間考える時間
        { type: 'play', barStart: 1, barEnd: 4, label: '課題演奏' },
        { type: 'interval', duration: 15 },
        { type: 'bell' }, // 終了を知らせるベル
    ];

    // 再生機にMIDIデータをロード
    manager.loadMidi(midiData);

    // プレイリストの再生
    document.getElementById('start-playlist').addEventListener('click', async () => {
        await manager.playPlaylist(playlist);
    });

    // タッチキーボードの表示と楽器設定
    manager.createKeyboard('#keyboard-container');
    // 初期楽器は未定だが、ピアノやオルガンなどが考えられる
    // manager.setKeyboardInstrument('piano-sampler'); 
})();
</script>
```

-----

### 聴音後訓練ページ

聴音後に、テンポやパートごとの音量を調整して復習するためのサンプルです。

```html
<div id="player-ui">
    <button id="play-all">通奏</button>
    <button id="play-part">ソプラノパートのみ</button>
    
    <label>テンポ: <input type="range" id="tempo-slider" min="60" max="240" value="120"></label>
    
    <label>ソプラノ <input type="checkbox" id="mute-soprano" checked></label>
    <label>バス <input type="checkbox" id="mute-bass" checked></label>
</div>

<script type="module">
import { TonejsManager } from './module/tonejs/manager/tonejs-manager.js';

(async () => {
    const manager = new TonejsManager();
    await manager.setup();

    const midiUrl = 'bass-and-soprano.midi';
    await manager.loadMidi(await fetch(midiUrl).then(r => r.text()));
    
    // テンポの変更
    document.getElementById('tempo-slider').addEventListener('input', (e) => {
        manager.setTempo(e.target.value);
    });

    // パートのミュート/ミュート解除
    document.getElementById('mute-soprano').addEventListener('change', (e) => {
        manager.setPartMute(0, !e.target.checked); // 0番目のトラックをソプラノと想定
    });
    document.getElementById('mute-bass').addEventListener('change', (e) => {
        manager.setPartMute(1, !e.target.checked); // 1番目のトラックをバスと想定
    });

    // 再生ボタンの処理
    document.getElementById('play-all').addEventListener('click', () => {
        manager.playAll(); // 全体を再生するメソッドを想定
    });
})();
</script>
```

-----

### 楽典ページ

譜例の再生や、タッチキーボードでの試奏を可能にするためのサンプルです。

```html
<div>
    <button id="play-example">和音の譜例を鳴らす</button>
</div>
<div id="keyboard-container"></div>

<script type="module">
import { TonejsManager } from './module/tonejs/manager/tonejs-manager.js';

(async () => {
    const manager = new TonejsManager();
    await manager.setup();
    
    // 和音の譜例データをJSオブジェクトとして定義
    const chordExample = [
        { time: '0:0', notes: ['C4', 'E4', 'G4'] },
        { time: '0:2', notes: ['D4', 'F4', 'A4'] },
        // ...
    ];

    document.getElementById('play-example').addEventListener('click', async () => {
        await manager.playFromJSObject(chordExample);
    });

    // ユーザーが譜例をタッチキーボードで弾いてみる
    manager.createKeyboard('#keyboard-container');
    // このページでは、特定の楽器（ピアノなど）に固定する
    // manager.setKeyboardInstrument('piano'); 
})();
</script>
```





// core-processor.js
import tonejs/loader
import tonejs/tonejs-midi-loader.js
/**
 * CoreProcessor は @tonejs/midi を使い、
 * MIDI → JSObject の変換ロジックを提供します。
 */
class CoreProcessor{
  #midiData = null;
  #JSObjectData = null;
  #tonejsMidi = null;  

}





---

ご提示いただいたディレクトリ構成は、Tone.jsを使った音楽アプリケーションの骨組みとして非常に良く整理されていますね。この構成で開発を進めるにあたり、まずどこから着手すべきかについて、段階を追って説明します。

---

### ステップ1: 環境構築と最小限の音出し

まず最初にやるべきは、**Tone.jsが正しくロードされ、音が鳴るかを確認する**ことです。これが全ての土台になります。

1.  **`core/loader.js` の実装**:
    * HTMLファイルを用意し、`type="module"` を指定して `loader.js` を読み込みます。
    * `loader.js` 内でTone.jsを動的にインポートする処理を書きます。これにより、Tone.jsのモジュールをプロジェクト内で使えるようになります。

2.  **`core/setup.js` の実装**:
    * Tone.jsが提供する `Tone.start()` を呼び出す処理を記述します。Webブラウザによっては、ユーザーの操作（クリックなど）がないとオーディオコンテキストが開始されないため、この処理は必須です。
    * `Tone.start()` の呼び出しを、ユーザーのインタラクション（ボタンクリックなど）をトリガーに行うようにすると良いでしょう。

3.  **最小限の音出しテスト**:
    * `loader.js` と `setup.js` を使って、**Synthのインスタンスを作成し、簡単な音階を鳴らす**テストコードを書いてみましょう。
    * 例えば、C4の音を鳴らすだけのシンプルなコードで、音が出ることを確認します。

**この段階で、`core/loader.js` と `core/setup.js` が機能し、ブラウザで音が鳴ることを確認できれば、最初の大きなハードルはクリアです。**

---

### ステップ2: 楽器とテンポの管理

次に、アプリケーションの核となる部分、つまり**楽器とテンポを管理する機能**を構築します。

1.  **`core/synth.js` と `core/sampler.js` の実装**:
    * それぞれのファイルで、対応するTone.jsのクラス（`Tone.Synth` や `Tone.Sampler`）をラップするクラスや関数を作成します。
    * 例えば、`Synth` クラスは `new Tone.Synth().toDestination()` のような形でインスタンスを返し、音色設定などのメソッドを持つようにします。

2.  **`core/instrument.js` の実装**:
    * `synth.js` と `sampler.js` をインポートし、**どの楽器を使うかを管理する**ロジックを実装します。
    * `getInstrument(instrumentName)` のようなメソッドを作り、引数に応じて `Synth` または `Sampler` のインスタンスを返すようにします。

3.  **`core/tempo.js` の実装**:
    * 現在のテンポ（BPM）を保持し、変更する機能を作成します。
    * Tone.jsの `Tone.Transport.bpm.value` を設定する処理が中心になります。

---

### ステップ3: MIDIデータの処理と再生

いよいよ、MIDIデータを扱えるようにする部分です。

1.  **`processor/core-processor.js` の実装**:
    * MIDIファイルを読み込み、Tone.jsで扱いやすいJavaScriptオブジェクト形式に変換するロジックを実装します。
    * この処理は非同期になることが多いため、`async/await` を使うと良いでしょう。

2.  **`core/play-range.js` の実装**:
    * MIDIデータの小節番号やタイムスタンプを、Tone.jsの再生時間（秒数や拍数）に変換するユーティリティ関数を作成します。
    * 例: 「2小節目から4小節目まで」という情報を、Tone.jsの `start('2m')` や `stop('4m')` に変換できるようにします。

3.  **`player/midi-player.js` の実装**:
    * `core-processor.js` で変換したMIDIオブジェクトと、`core/instrument.js` で作成した楽器を使って、実際に**音を鳴らす**ロジックを実装します。
    * `play()` や `stop()` といった、再生を制御する主要なメソッドを定義します。Tone.jsの `Tone.Transport` を使ってスケジューリングを行います。

---

### まとめ

結論として、ご提示の通り **`core/loader.js` と `manager/tonejs-manager.js` のテストから始めるのが良い出発点**です。ただし、`manager/tonejs-manager.js` は全体を制御する最終段階のコンポーネントなので、まずは**`loader.js`と`setup.js`を使って、単発の音を鳴らす**という最小限の機能を実現することに焦点を当てるのが最も効率的です。

その後、段階的に`instrument`や`tempo`、`processor`といった核となる機能を実装していけば、迷うことなくプロジェクトを前進させられるでしょう。
