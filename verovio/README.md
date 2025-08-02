# Verovio モジュール群

Web アプリケーションで Verovio Toolkit を簡単かつ柔軟に利用するためのモジュール集です。各責務を分離し、ビルド後は `.min.js` ファイルを配布できる構成になっています。

---

## 目的

* WASM ローダーの抽象化 (loader.min.js)
* MEI → SVG/MIDI 変換ロジックの提供 (core-processor.min.js)
* DOM 操作による楽譜表示およびローディング/エラー管理 (score-ui-handler.min.js)
* MEI の移調機能 (transposer.min.js)
* レンダリングオプションのプリセット集 (render-options.js)
* 高レベル API (`VerovioManager`) による統合利用 (verovio-manager.min.js)

---

## ディレクトリ構成

```
module/
├── verovio/
│   ├── loader.min.js               # WASM ローダー
│   ├── core-processor.min.js       # MEI → SVG/MIDI 変換ロジック
│   ├── score-ui-handler.min.js     # DOM 操作による表示管理
│   ├── transposer.min.js           # MEI 移調機能
│   ├── render-options.js           # レンダリングオプションプリセット
│   └── verovio-manager.min.js      # 高レベル API（Facade）
└── examples/
    └── 20250704-test.html          # 確認用テストページ
```

ビルド前は `module/verovio/*.js`、ビルド後は同名の `.min.js` が生成されます。

---

## モジュール一覧

### loader.min.js

* **責務**: Verovio の WASM スクリプトを動的読み込みし、`Toolkit` インスタンスを返します。
* **特徴**: キャッシュ保持、タイムアウト/ポーリング、オプション引数で URL・タイムアウト設定可能。

### core-processor.min.js

* **責務**: Verovio Toolkit を使い、MEI → SVG/MIDI 変換を行います。
* **主なメソッド**:

  * `renderSvgFromUrl(url, { page, measureRange })`
  * `renderSvgFromMei(meiString, { page, measureRange })`
  * `renderMidiFromUrl(url)`
  * `renderMidiFromMei(meiString)`
  * `getPageCount()`

### score-ui-handler.min.js

* **責務**: DOM 操作で SVG 挿入、ローディング/エラー表示を管理。
* **主なメソッド**:

  * `showLoading(elementId)`, `hideLoading(elementId)`
  * `displaySvg(svgString, elementId)`
  * `showError(message, elementId)`

### transposer.min.js

* **責務**: MEI データを指定半音で移調し、移調後の MEI を取得します。
* **主なメソッド**:

  * `transposeMei(meiString, semitones)` → `Promise<string>`

### render-options.js

* **責務**: CoreProcessor に渡すレンダリングオプションのプリセット集。
* **プリセット**:

  * `defaultOptions`, `highResOptions`, `mobileOptions`, `printOptions`, `svgViewBox`

### verovio-manager.min.js

* **責務**: 上記モジュールを統合し、簡単に利用できる高レベル API を提供。  
* **主なメソッド**:
  - `initialize()` → `Promise<void>`
  - `setRenderOptions(options)`
  - **SVG 描画（URL 版）**  
    - `displaySvgFromUrl(meiUrl, elementId, options)`
  - **SVG 描画（MEI 文字列版）** ← 追加  
    - `displaySvgFromMei(meiString, elementId, options)`
  - **移調表示（URL 版）**  
    - `displayTransposedSvgFromUrl(meiUrl, elementId, semitones, options)`
  - **移調表示（MEI 文字列版）** ← 追加  
    - `displayTransposedSvgFromMei(meiString, elementId, semitones, options)`
  - **MIDI 取得（URL 版）**  
    - `getMidiFromUrl(meiUrl, options)`
  - **MIDI 取得（MEI 文字列版）** ← 追加  
    - `getMidiFromMei(meiString, options)`

---

## 使用例

```js
import { VerovioManager } from './module/verovio/verovio-manager.min.js';
import { defaultOptions } from './module/verovio/render-options.js';

(async () => {
  const manager = new VerovioManager();
  await manager.initialize();
  manager.setRenderOptions(defaultOptions);

  // — URL 版: score.mei をフェッチして SVG 表示
  await manager.displaySvgFromUrl(
    'path/to/score.mei',
    'score-container',
    { page: 1, measureRange: '1-5' }
  );

  // — MEI 文字列版: あらかじめ文字列を読み込んでから直接 SVG 表示
  const meiText = await fetch('path/to/score.mei').then(r => r.text());
  await manager.displaySvgFromMei(
    meiText,
    'score-container',
    { page: 2, measureRange: '6-10' }
  );

  // — 移調表示（URL 版 +2半音）
  await manager.displayTransposedSvgFromUrl(
    'path/to/score.mei',
    'score-container',
    2,
    { page: 1 }
  );

  // — 移調表示（MEI 文字列版 +2半音）
  await manager.displayTransposedSvgFromMei(
    meiText,
    'score-container',
    2,
    { page: 1 }
  );

  // — MIDI 取得（URL 版）
  const midiBuffer1 = await manager.getMidiFromUrl('path/to/score.mei');

  // — MIDI 取得（MEI 文字列版）
  const midiBuffer2 = await manager.getMidiFromMei(meiText);
})();

```

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { VerovioManager } from './module/verovio/verovio-manager.min.js';
    (async () => {
      const manager = new VerovioManager();
      await manager.initialize();

      // MEI 文字列版を使用するサンプル
      const meiText = await fetch('sample.mei').then(r => r.text());
      await manager.displaySvgFromMei(meiText, 'score-container');
    })();
  </script>
</head>
<body>
  <div id="score-container"></div>
</body>
</html>

```

---

## CDN(jsDelivr) での読み込み例

```html
<script type="module">
  import { VerovioManager } from
    'https://cdn.jsdelivr.net/gh/<ユーザー名>/<リポジトリ名>@<version>/module/verovio/verovio-manager.min.js';

  (async () => {
    const manager = new VerovioManager();
    await manager.initialize();
    await manager.displaySvgFromUrl('path/to/score.mei', 'score-container');
  })();
</script>
```

---

## ビルド

```bash
# 開発サーバー起動
npm run start

# 本番ビルド: dev-module → module/*.min.js
npm run build
```

---

## ライセンス

MIT © あなたの名前
