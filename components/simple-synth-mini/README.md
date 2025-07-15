
## `README.md`

```markdown
# Simple Synth Mini (SSM)

**SVG ベースのピアノ鍵盤コンポーネント + Web Audio API**

---

## 📂 ファイル構成

```

simple-synth-mini/
├─ index.html       # デモページ
├─ style.css        # 全体スタイル
├─ script.js        # コンポーネント本体
└─ README.md        # このドキュメント

````

---

## 🔧 導入方法

1. リポジトリをクローンまたはダウンロード  
2. `index.html` をブラウザで開くだけ

---

## ⚙️ 使い方

HTML 内に以下のように `<div class="ssm-simple-synth-mini" …>` を置くだけで鍵盤が動きます。

```html
<div class="ssm-simple-synth-mini"
     data-volume-slider="true"
     data-octaves="1"
     data-start-note="C4"
     data-sound-enabled="true"
     data-instrument="sine"
     data-show-note-labels="true">
</div>
<script src="script.js"></script>
<link rel="stylesheet" href="style.css">
````

---

## 🔣 data- 属性一覧

| 属性                      | 説明                                           | デフォルト   |
| ----------------------- | -------------------------------------------- | ------- |
| `data-volume-slider`    | ボリュームスライダーを表示するか                             | `false` |
| `data-octaves`          | 表示するオクターブ数（整数）                               | `1`     |
| `data-start-note`       | 開始ノート名（例：`C4`）                               | `C4`    |
| `data-sound-enabled`    | 音を鳴らすか（true: 鳴る / false: 鳴らない）               | `true`  |
| `data-instrument`       | 波形タイプ（`sine`/`square`/`sawtooth`/`triangle`） | `sine`  |
| `data-show-note-labels` | 音名ラベルを表示するか                                  | `true`  |

---

## 🎛️ カスタムイベント

* **`ssm-key-down`**
  鍵盤を押した瞬間に発火

  * `detail.note`：ノート名（例: `C4`）
  * `detail.frequency`：周波数（Hz）
  * `detail.midi`：MIDI ノート番号
  * `detail.instrument`：波形タイプ

* **`ssm-key-up`**
  鍵盤を離した瞬間に発火

  * `detail.note`：ノート名
  * `detail.midi`：MIDI ノート番号

---

## 🛠️ 動的設定変更

外部から `data-` 属性を書き換えたあと、以下を呼ぶと再描画されます：

```js
const el = document.querySelector('.ssm-simple-synth-mini');
el.dataset.octaves = '2';
el._synth.updateSettings();
```

---

## 📄 ライセンス

MIT License — 詳細は `LICENSE` ファイル参照

```
