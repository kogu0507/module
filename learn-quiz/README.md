# Learn-Quiz (lq)
汎用「学習モード／出題モード」クイズ・コンポーネント。  
- 複数ブロック対応（1ページに複数の `.lq-quiz` を置ける）
- 回答IDの自動再採番（`a1, a2, ...`）＋開示ボタン同期
- 本文から FAQ JSON-LD を自動生成（`data-lq-jsonld="auto"`）
- 依存なし（Vanilla JS）

## CDN
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kogu0507/module@vX.Y.Z/learn-quiz/lq.min.css">
<script defer src="https://cdn.jsdelivr.net/gh/kogu0507/module@vX.Y.Z/learn-quiz/lq.min.js"></script>
````

## HTML テンプレ

```html
<section class="lq-quiz" aria-labelledby="quiz-title"
         data-lq-jsonld="auto" data-lq-default-mode="learn" data-lq-shuffle="true">
  <h1 id="quiz-title" class="lq-heading">（ページタイトル）</h1>

  <div class="lq-controls" role="group" aria-label="表示モード切替">
    <button type="button" class="lq-btn" data-action="learn">学習モード</button>
    <button type="button" class="lq-btn lq-btn--secondary" data-action="quiz">出題モード</button>
  </div>

  <ol class="lq-list" id="qa-list">
    <li class="lq-item">
      <article class="lq-card">
        <p class="lq-q">（問題文）</p>
        <div class="lq-a" id="a1">
          正解：（…）<br>
          <small>解説：（任意）</small>
        </div>
        <p class="lq-action">
          <button type="button" class="lq-reveal lq-btn lq-btn--ghost lq-hidden"
                  aria-controls="a1" aria-expanded="false">答えを見る</button>
        </p>
      </article>
    </li>
  </ol>

  <noscript><p class="lq-noscript">※現在は学習モード表示です。</p></noscript>
</section>
```

## data 属性

* `data-lq-jsonld`: `auto|off` … FAQ 構造化データを本文から自動生成（推奨：auto）
* `data-lq-default-mode`: `learn|quiz` … 初期表示モード（既定：learn）
* `data-lq-shuffle`: `true|false` … 出題モードでシャッフル（既定：true）

## 注意

* JSON-LD は本文の DOM から生成するため、**本文と完全一致**します。
* 既存の SEO プラグイン（Yoast 等）との重複を避けたい場合は、そちらの FAQ ブロックを使わないでください。
