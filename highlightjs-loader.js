// highlightjs-loader.js

;(function() {
  // ─── 設定 ─────────────────────────────────────────
  var version = '11.11.0';     // highlight.js の CDN バージョン
  var theme   = 'github-dark'; // 利用する CSS テーマ

  // 既に highlight.js が読み込まれていたら何もしない
  if (window.hljs) return;

  // ─── CSS を追加 ─────────────────────────────────────
  // highlight.js 用のテーマ
  var link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/' +
              version + '/styles/' + theme + '.min.css';
  document.head.appendChild(link);

  // コピーボタン用のスタイル（必要に応じてカスタマイズしてください）
  var style = document.createElement('style');
  style.textContent = `
    /* <pre> を relative にしておくとボタン配置が楽 */
    pre {
      position: relative;
    }
    /* コピーボタンの見た目 */
    .hljs-copy-button {
      position: absolute;
      top: 0.25em;
      right: 0.25em;
      padding: 0.3em 0.6em;
      font-size: 0.75em;
      border: none;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.3s;
    }
    .hljs-copy-button:hover {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  // ─── highlight.js 本体を読み込み ────────────────────────
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/' +
               version + '/highlight.min.js';
  // 読み込みが完了したらハイライトとコピー機能の初期化
  script.onload = function() {
    if (window.hljs && typeof hljs.highlightAll === 'function') {
      // すべての <pre><code> をハイライト
      hljs.highlightAll();
      // ハイライト後にコピー機能を付与
      addCopyButtons();
    } else {
      console.warn('highlight.js の読み込みに失敗した可能性があります');
    }
  };
  script.onerror = function() {
    console.error('highlight.js の読み込みに失敗しました');
  };
  document.head.appendChild(script);

  // ─── コピー機能を追加 ────────────────────────────────────

  /**
   * すべての <pre><code> にコピー用ボタンを追加する
   */
  function addCopyButtons() {
    // <pre><code> をすべて取得
    document.querySelectorAll('pre > code').forEach(function(codeBlock) {
      var pre = codeBlock.parentNode; // 親の <pre>

      // ボタン要素を作成
      var button = document.createElement('button');
      button.className = 'hljs-copy-button';
      button.type = 'button';
      button.innerText = 'Copy'; // 初期表示

      // <pre> の中にボタンを追加
      pre.appendChild(button);

      // クリック時の処理を登録
      button.addEventListener('click', function() {
        copyCodeToClipboard(codeBlock.innerText, button);
      });
    });
  }

  /**
   * 文字列をクリップボードにコピーし、
   * 成功・失敗時にボタン表示を変化させる
   *
   * @param {string} text   コピーするテキスト
   * @param {HTMLButtonElement} button 押されたボタン要素
   */
  function copyCodeToClipboard(text, button) {
    // まずは navigator.clipboard API を試す
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        // 成功したらチェックマークを表示
        showTemporaryMessage(button, '✔', 2000);
      }).catch(function(err) {
        console.error('clipboard API によるコピー失敗:', err);
        // フォールバック
        fallbackCopyText(text, button);
      });
    } else {
      // API が使えない場合は execCommand フォールバック
      fallbackCopyText(text, button);
    }
  }

  /**
   * execCommand を用いたフォールバックコピー
   *
   * @param {string} text
   * @param {HTMLButtonElement} button
   */
  function fallbackCopyText(text, button) {
    // 一時的に textarea を作って選択・コピー
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';  // 表示外に配置
    textarea.style.left     = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      var successful = document.execCommand('copy');
      showTemporaryMessage(button, successful ? '✔' : '✖', 2000);
    } catch (err) {
      console.error('execCommand によるコピー失敗:', err);
      showTemporaryMessage(button, '✖', 2000);
    }

    // 後片付け
    document.body.removeChild(textarea);
  }

  /**
   * ボタンのテキストを一時的に入れ替え、数秒後に元に戻す
   *
   * @param {HTMLButtonElement} button
   * @param {string} message   表示する一時テキスト
   * @param {number} duration  リセットまでのミリ秒
   */
  function showTemporaryMessage(button, message, duration) {
    var original = button.innerText;
    button.innerText = message;
    setTimeout(function() {
      button.innerText = original;
    }, duration);
  }

})();
