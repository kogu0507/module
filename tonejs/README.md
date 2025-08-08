# tonejsディレクトリ README

## ディレクトリ構造
tonejs/
  samples/
    loader-setup-synth-sampler-test.html
    tempo-test.html
    core-processor-test.html
    play-range-test.html


  core/
    loader.js         # script type="module"を挿入してTone.jsをロード
    instrument.js     # 楽器情報を管理（synth.js, sampler.jsを保持、インスタンスを返すのかな？）
    synth.js          # シンセ情報を管理
    sampler.js        # サンプラー情報を管理
    setup.js          # Tone.start()など？
    volume.js         # 複数の独立した音量調整（声部ごとの音量など）
    tempo.js          # 現在のテンポ値を保持・管理
    playlist-timer.js # 再生とインターバルの制御ロジック
    play-range.js    # MIDIデータの小節と再生時間の変換ロジック

  processor/
    core-processor.js # MIDI → JSObject
    tonejs-midi-loader.js

  player/
    midi-player.js    # midiから`play-range.js`を使って再生を実行
    jsobject-player.js
    touch-keyboard.js
    bell-player.js    # 終了を知らせるベルなど
    chord-player.js   # 主和音再生や楽典のサンプル音など
  manager/
    tonejs-manager.js # `playlist-timer.js`を呼び出して全体を制御



## 各コード
AIの方へ：必要な場合はコピペしてくるのでお知らせください。


### `tonejs/core/loader.js` と `module/library-loader.mjs` の要約

#### 概要
`tonejs/core/loader.js` は、`module/library-loader.mjs` の汎用的な機能を利用して、Webアプリケーションに**** **Tone.js** ライブラリを動的にロードする専用モジュールです。

- **`module/library-loader.mjs`**: `<script>` タグを動的に作成して外部ライブラリをロードするためのユーティリティモジュールです。同じライブラリが複数回ロードされるのを防ぐためのキャッシュ機能を持っています。
- **`tonejs/core/loader.js`**: `library-loader` を利用して **Tone.js (v15.1.22)** を特定のURLからロードします。これにより、他のモジュールは `loadToneJs()` を呼び出すだけで Tone.js の読み込みを簡単に行うことができます。

#### 公開されている関数

`tonejs/core/loader.js` からは以下の関数がエクスポートされています。

- **`loadToneJs()`**
  - **目的**: Tone.js ライブラリを非同期でロードします。
  - **引数**: なし。
  - **戻り値**: 読み込みが完了したときに解決する **`Promise<void>`**。
  - **注意**: この関数は、他のTone.js関連モジュールを使用する前に呼び出す必要があります。

#### 補足

`library-loader.mjs` 自体は汎用的なモジュールとして設計されており、**Tone.js 以外のライブラリのロードにも再利用可能**です。`loadedScripts` という内部オブジェクトを使用して、一度読み込まれたスクリプトのURLをキャッシュしています。これにより、同じスクリプトを複数回ロードしようとしても、初回のみ実行される効率的な設計になっています。

---



### `tonejs/core/setup.js` の要約


#### 概要

`tonejs/core/setup.js` は、**** Web Audio APIの基盤となる **AudioContext** を初期化・管理するモジュールです。

Webブラウザでは、ユーザーの操作（クリックなど）がないとオーディオの再生を開始できないため、このモジュールはユーザーのインタラクションをトリガーとして `Tone.start()` を呼び出す役割を担います。

#### 公開されている関数

- **`initToneAudio()`**
  - **目的**: Tone.jsのAudioContextを初期化し、オーディオの再生を可能にします。この関数は一度だけ実行され、2回目以降の呼び出しは無視されます。
  - **引数**: なし。
  - **戻り値**: オーディオコンテキストが開始されると解決する **`Promise<void>`**。
  - **注意**: この関数は、**ユーザーのクリックイベント**などの操作内で呼び出す必要があります。また、このモジュールを使用する前に `loader.js` で **Tone.js** をロードしておく必要があります。

#### 内部変数

- **`_audioStarted`**
  - **目的**: AudioContextがすでに起動済みかどうかを追跡するためのフラグです。これにより、`initToneAudio()` が複数回呼び出されても、初期化処理が重複して実行されるのを防ぎます。
  - **初期値**: `false`

これで、このモジュールの役割をAIに簡潔に伝えることができます。何か他のモジュールの要約が必要でしたら、お知らせください。

---

承知いたしました。いただいたコードを要約し、AIへの引き継ぎに役立つようにまとめます。

---

### `tonejs/core/synth.js` の要約
#### 概要

`tonejs/core/synth.js` は、**Tone.js** の **シンセサイザー** (`Tone.Synth`) のインスタンス作成と、それを使った音の再生に関する機能を提供するモジュールです。

このモジュールは、基本的なシンセサイザーの作成から、特定の音を鳴らす関数までを提供し、今後さまざまな種類のシンセサイザーを扱うための基盤となります。

---

#### 公開されている関数

- **`createDefaultSynth()`**
  - **目的**: デフォルト設定の `Tone.Synth` インスタンスを作成し、メインの出力先に接続します。
  - **引数**: なし。
  - **戻り値**: 設定済みの `Tone.Synth` インスタンス。
  - **注意**: Tone.jsがグローバルスコープにロードされていない場合はエラーをスローします。

- **`playSynthNote(synth, note, duration = "8n")`**
  - **目的**: 指定されたシンセサイザーを使って、特定の音を再生します。
  - **引数**:
    - `synth` (`Tone.Synth`): 音を鳴らすシンセサイザーのインスタンス。
    - `note` (`string`): 再生する音の音名（例: `"C4"`, `"A#3"`）。
    - `duration` (`string`, オプション): 音の長さ（例: `"8n"`）。デフォルトは `"8n"`。
  - **戻り値**: なし。

- **`playSynthTestSound(synth)`**
  - **目的**: テストやデバッグのために、C4の音を短く鳴らします。これは `playSynthNote` のラッパー関数です。
  - **引数**:
    - `synth` (`Tone.Synth`): 音を鳴らすシンセサイザーのインスタンス。
  - **戻り値**: なし。

---

#### 将来的な拡張性

コード内のコメントにあるように、このモジュールは将来的に `FMSynth` や `AMSynth` といった、他の種類のシンセサイザーを作成する関数を追加するための準備がされています。

---




承知いたしました。いただいたコードを要約し、AIへの引き継ぎに役立つようにまとめます。

---

### `tonejs/core/sampler.js` の要約

#### 概要

`tonejs/core/sampler.js` は、**Tone.js** の **サンプラー** (`Tone.Sampler`) を管理するモジュールです。このモジュールは、**サラマンダーグランドピアノ**のサンプルをロードし、それを使って音を再生するための関数を提供します。シンセサイザーと異なり、サンプラーは録音された実際の音源を使用するため、よりリアルな楽器の音を出すことができます。


#### 公開されている関数

- **`createSalamanderSampler()`**
  - **目的**: サラマンダーグランドピアノの音源を非同期でロードし、**`Tone.Sampler`** のインスタンスを作成します。サンプルの読み込みには時間がかかるため、`Promise` を返します。
  - **引数**: なし。
  - **戻り値**: サンプルのロードが完了した **`Tone.Sampler`** インスタンスを解決する `Promise`。
  - **注意**: この関数は、Tone.jsがロードされていない場合はエラーをスローします。

- **`playSamplerNote(sampler, note, duration = "8n")`**
  - **目的**: 指定されたサンプラーを使って、特定の音を再生します。
  - **引数**:
    - `sampler` (`Tone.Sampler`): 音を鳴らすサンプラーのインスタンス。
    - `note` (`string`): 再生する音の音名（例: `"C4"`, `"A#3"`）。
    - `duration` (`string`, オプション): 音の長さ。デフォルトは `"8n"`。
  - **戻り値**: なし。

- **`playSamplerTestSound(sampler)`**
  - **目的**: テストやデバッグ用に、C4の音をサンプラーで鳴らします。これは `playSamplerNote` のラッパー関数です。
  - **引数**:
    - `sampler` (`Tone.Sampler`): 音を鳴らすサンプラーのインスタンス。
  - **戻り値**: なし。

---



### `tonejs/core/tempo.js` の要約


#### 概要

`tonejs/core/tempo.js` は、**Tone.js** の **トランスポート** (`Tone.Transport`) を制御し、プロジェクト全体の時間管理を担うモジュールです。

トランスポートは、音楽の再生・停止やテンポ（BPM）を管理する中核的な機能です。このモジュールは、それを操作するためのシンプルで一貫したインターフェースを提供します。


#### 公開されている関数

- **`initTempo(bpm)`**
  - **目的**: プロジェクトのテンポを **BPM（Beats Per Minute）** で設定します。
  - **引数**:
    - `bpm` (`number`): 設定するBPM値。
  - **戻り値**: なし。

- **`startTempo()`**
  - **目的**: トランスポートを再生し、音楽やシーケンスの再生を開始します。
  - **引数**: なし。
  - **戻り値**: なし。

- **`stopTempo()`**
  - **目的**: トランスポートを停止し、再生中の音楽やシーケンスを止めます。
  - **引数**: なし。
  - **戻り値**: なし。

- **`getBpm()`**
  - **目的**: 現在設定されているBPM値を取得します。
  - **引数**: なし。
  - **戻り値**: 現在のBPMを表す `number`。

---

#### 注意事項

- これらの関数を使用する前に、`loader.js` を使って **Tone.js** を事前にロードしておく必要があります。
- このモジュールは、`Tone.Transport` を直接操作するためのラッパーとして機能します。




### `tonejs/core/volume.js`
複数の独立した音量調整（声部ごとの音量など）。

**現状：未実装**

---

### `tonejs/core/playlist-timer.js`
再生とインターバルの制御ロジック。

**現状：未実装**

---

### `tonejs/core/play-range.js`
MIDIデータの小節と再生時間の変換ロジック。

**現状：未実装**














#### 1. MIDIデータの処理ロジックの定義

* **`processor/core-processor.js`**
    * 目的: MIDIデータをJavaScriptオブジェクトに変換する処理を実装します。この処理が、他のプレイヤーモジュールが利用する音楽データの形式を定義することになります。
    * 作業内容: MIDIファイルやMIDIデータ（バイナリ、Base64など）を受け取り、音符（ノートオン、ノートオフ）、タイミング、ベロシティなどの情報を抽出し、扱いやすいJavaScriptオブジェクトに変換する関数を実装します。

/*
 * ◆ tonejs-midi-loader.mjs
 * - 役割: Skypack経由で @tonejs/midi をロードし、Midi クラスを返す。
 * - 依存: なし
 * - 使い方:
 *   import { loadToneJsMidi } from './tonejs-midi-loader.mjs';
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


↑のコードが使えないかな？


#### 2. 音楽再生のコアロジックの実装

* **`core/play-range.js`**
    * 目的: `processor`で変換されたデータを使って、MIDIデータの小節と再生時間の変換ロジックを実装します。例えば、「3小節目から再生」といった指示を、`Tone.js`が理解できる時間に変換する役割です。
    * 作業内容: 小節番号、拍子、テンポなどの情報から、正確な再生開始・終了時間を計算する関数を実装します。

* **`core/playlist-timer.js`**
    * 目的: 再生とインターバルの制御ロジックを実装します。これは、再生リストの各項目を順次再生したり、特定の区間を繰り返し再生したりする際のタイマーとして機能します。
    * 作業内容: `Tone.Transport`と`Tone.js`のイベントスケジューリング機能（`Tone.Loop`, `Tone.Part`など）を利用して、再生の開始、停止、一時停止、およびインターバル（例: 各曲間の無音時間）を管理するクラスや関数を実装します。

#### 3. プレイヤーモジュールの実装

* **`player/midi-player.js`** と **`player/jsobject-player.js`**
    * 目的: これまでのモジュールを使って、実際に音を鳴らすプレイヤーを実装します。`midi-player.js`は`processor`と`play-range`を活用し、`jsobject-player.js`は`processor`で変換されたJavaScriptオブジェクトを直接扱えるようにします。
    * 作業内容: `initToneAudio()`でAudioContextを開始し、`core/synth.js`や`core/sampler.js`で作成した音源を使い、`core/tempo.js`でテンポを設定して、`play-range`のロジックに基づいて音符をスケジュールします。

これらのモジュールが連携することで、最終的に`tonejs-manager.js`が全体の制御を行う準備が整います。

もし、この中で特定のモジュールから作業を開始したい、といったご希望があれば、お気軽にお申し付けください。













以上が現段階の作業（少しずつモジュールを作っている）
以下は、今後の方向性のメモ

-----












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
