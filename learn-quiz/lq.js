// module/learn-quiz/lq.js
// Learn-Quiz 共通ロジック
// - 複数 .lq-quiz ブロックを独立初期化
// - 学習/出題モード切替（data-action）
// - .lq-a の id を a1,a2... に再採番＋ .lq-reveal の aria-controls 同期
// - 本文から FAQ JSON-LD を自動生成（data-lq-jsonld="auto"）
// 依存なし（Vanilla JS）

(function(){
  // 初期化関数（1ブロック分）
  function initQuiz(root){
    const list = root.querySelector('.lq-list');
    const controls = root.querySelector('.lq-controls');
    if(!list || !controls) return;

    // 1) 回答IDの自動再採番（a1, a2, ...）＋ aria-controls 同期
    function reindexAnswers(){
      const answers = list.querySelectorAll('.lq-a');
      answers.forEach((a, idx) => {
        const newId = 'a' + (idx + 1);
        a.id = newId;
        const art = a.closest('article');
        if (art) {
          const btn = art.querySelector('.lq-reveal');
          if (btn) btn.setAttribute('aria-controls', newId);
        }
      });
    }

    // 2) 学習/出題モード
    function startLearningMode(){
      list.querySelectorAll('.lq-a').forEach(a => a.classList.remove('lq-hidden'));
      list.querySelectorAll('.lq-reveal').forEach(b => {
        b.classList.add('lq-hidden');
        b.setAttribute('aria-expanded','false');
      });
    }

    function startQuizMode(){
      // data-lq-shuffle="true" のときのみシャッフル
      const doShuffle = (root.getAttribute('data-lq-shuffle') || 'true').toLowerCase() === 'true';
      if (doShuffle) {
        const items = Array.from(list.children);
        items.sort(() => Math.random() - 0.5).forEach(el => list.appendChild(el));
      }
      list.querySelectorAll('.lq-a').forEach(a => a.classList.add('lq-hidden'));
      list.querySelectorAll('.lq-reveal').forEach(b => b.classList.remove('lq-hidden'));
    }

    // 3) 「答えを見る」(イベント委任)
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.lq-reveal');
      if (!btn) return;
      const target = root.querySelector('#' + btn.getAttribute('aria-controls'));
      if (target) {
        target.classList.remove('lq-hidden');
        btn.setAttribute('aria-expanded','true');
        btn.classList.add('lq-hidden');
      }
    });

    // 4) FAQ JSON-LD 自動生成（本文から作成）
    function generateFAQJsonLd(){
      const mode = (root.getAttribute('data-lq-jsonld') || 'auto').toLowerCase();
      if (mode !== 'auto') return;

      const items = [];
      const qs = list.querySelectorAll('li article');
      qs.forEach((art) => {
        const qEl = art.querySelector('.lq-q');
        const aEl = art.querySelector('.lq-a');
        if (!qEl || !aEl) return;

        // 「正解：〜」の1行目＋ <small>解説を併合
        const lines = aEl.innerText.split('\n').map(s => s.trim()).filter(Boolean);
        const firstLine = lines[0] || '';
        const small = aEl.querySelector('small');
        const expl = small ? small.innerText.trim().replace(/\s+/g, ' ') : '';
        const answerText = expl ? `${firstLine}（${expl}）` : firstLine;

        items.push({
          "@type":"Question",
          "name": qEl.innerText.trim(),
          "acceptedAnswer": { "@type":"Answer", "text": answerText }
        });
      });

      // 既存の自動生成分を削除（重複防止）
      root.querySelectorAll('script[data-generated="lq-faq"]').forEach(s => s.remove());
      if (items.length === 0) return;

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-generated','lq-faq');
      script.textContent = JSON.stringify({
        "@context":"https://schema.org",
        "@type":"FAQPage",
        "mainEntity": items
      });
      // 本文リスト直後に挿入
      list.insertAdjacentElement('afterend', script);
    }

    // 5) コントロール（data-action）
    controls.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-action]');
      if(!btn) return;
      const action = btn.getAttribute('data-action');
      if(action === 'learn'){
        startLearningMode();
        generateFAQJsonLd(); // 一応同期
      }else if(action === 'quiz'){
        startQuizMode();
        // FAQ内容は変わらないので再生成不要
      }
    });

    // 初期化ルーチン
    reindexAnswers();
    const defaultMode = (root.getAttribute('data-lq-default-mode') || 'learn').toLowerCase();
    if (defaultMode === 'quiz') startQuizMode(); else startLearningMode();
    generateFAQJsonLd();
  }

  // ページ内の全 .lq-quiz を初期化
  function initAll(){
    document.querySelectorAll('.lq-quiz').forEach(initQuiz);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
