// module/verovio/verovio-manager.js

import { loadVerovio } from './loader.min.js';
import { CoreProcessor } from './core-processor.min.js';
import { ScoreUIHandler } from './score-ui-handler.min.js';
import { Transposer } from './transposer.min.js';

/**
 * VerovioManager は VerovioToolkit のロードから
 * コア処理、UI 表示、移調までを統合した
 * 高レベル API を提供します。
 */
export class VerovioManager {
  /** @private VerovioToolkit インスタンス */
  #toolkit = null;
  /** @private MEI→SVG／MIDI 変換用コア */
  #core = null;
  /** @private SVG 表示・エラー管理UI */
  #ui = null;
  /** @private MEI 移調ユーティリティ */
  #transposer = null;
  /** @private 初期化 Promise のキャッシュ */
  _initPromise = null;

  /**
   * Verovio および関連モジュールを初期化します。
   * ２回目以降は既存の Promise を返します。
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initPromise) {
      return this._initPromise;
    }
    this._initPromise = (async () => {
      // Verovio のロード
      this.#toolkit = await loadVerovio();
      // コア・UI・移調クラスを生成
      this.#core = new CoreProcessor(this.#toolkit);
      this.#ui = new ScoreUIHandler();
      this.#transposer = new Transposer(this.#toolkit);
      console.log('VerovioManager initialized');
    })();
    return this._initPromise;
  }

  /** @private 初期化済みかチェック */
  _ensureInit() {
    if (!this.#toolkit) {
      throw new Error('initialize() を先に呼び出してください。');
    }
  }

  /**
   * レンダリングオプションを設定します。
   * @param {import('./render-options.js').RenderOptions} options
   */
  setRenderOptions(options) {
    this._ensureInit();
    this.#core.setRenderOptions(options);
  }

  /**
   * MEI の URL からテキストを取得します。
   * @param {string} meiUrl
   * @returns {Promise<string>}
   * @private
   */
  async _loadMei(meiUrl) {
    const res = await fetch(meiUrl);
    if (!res.ok) {
      throw new Error(`MEI の取得に失敗 (${res.status})`);
    }
    return res.text();
  }

  /**
   * MEI 文字列から SVG を生成し、画面に表示します。
   * @param {string} mei            - MEI XML 文字列
   * @param {string} targetId       - 表示先要素の ID
   * @param {object} [options]      - オプション
   * @param {number} [options.page=1]
   * @param {string} [options.measureRange='']
   */
  async displaySvgFromMei(
    mei,
    targetId,
    { page = 1, measureRange = '' } = {}
  ) {
    this._ensureInit();
    this.#ui.showLoading(targetId);
    try {
      // コア処理で SVG を取得
      const svg = await this.#core.renderSvgFromMei(mei, { page, measureRange });
      // UI に描画
      this.#ui.displaySvg(svg, targetId);
    } catch (error) {
      console.error('displaySvgFromMei error:', error);
      this.#ui.showError('楽譜の表示に失敗しました。', targetId);
      throw error;
    }
  }

  /**
   * URL から MEI を取得し、そのまま displaySvgFromMei に委譲します。
   * @param {string} meiUrl
   * @param {string} targetId
   * @param {object} [options]
   */
  async displaySvgFromUrl(
    meiUrl,
    targetId,
    options = { page: 1, measureRange: '' }
  ) {
    // MEI テキストを取得
    const mei = await this._loadMei(meiUrl);
    // MEI 文字列版のメソッドに委譲
    return this.displaySvgFromMei(mei, targetId, options);
  }

  /**
   * MEI 文字列から MIDI を生成して返却します。
   * @param {string} mei
   * @param {object} [options]
   * @param {string} [options.measureRange]
   * @returns {Promise<ArrayBuffer>}
   */
  async getMidiFromMei(mei, { measureRange } = {}) {
    this._ensureInit();
    if (measureRange) {
      // 範囲指定ありなら SVG→現在の MIDI を取得
      await this.#core.renderSvgFromMei(mei, { page: 1, measureRange });
      return this.#core.renderCurrentMidi();
    }
    // 範囲指定なし
    return this.#core.renderMidiFromMei(mei);
  }

  /**
   * URL から MEI を取得し、そのまま getMidiFromMei に委譲します。
   * @param {string} meiUrl
   * @param {object} [options]
   * @param {string} [options.measureRange]
   * @returns {Promise<ArrayBuffer>}
   */
  async getMidiFromUrl(meiUrl, options = {}) {
    const mei = await this._loadMei(meiUrl);
    return this.getMidiFromMei(mei, options);
  }

  /**
   * MEI 文字列を移調して SVG を描画します。
   * @param {string} mei
   * @param {string} targetId
   * @param {number} semitones
   * @param {object} [options]
   * @param {number} [options.page=1]
   * @param {string} [options.measureRange='']
   */
  async displayTransposedSvgFromMei(
    mei,
    targetId,
    semitones,
    { page = 1, measureRange = '' } = {}
  ) {
    this._ensureInit();
    this.#ui.showLoading(targetId);
    try {
      // MEI を移調
      const transposed = await this.#transposer.transposeMei(mei, semitones);
      // 文字列版のレンダリングに委譲
      const svg = await this.#core.renderSvgFromMei(transposed, { page, measureRange });
      this.#ui.displaySvg(svg, targetId);
    } catch (error) {
      console.error('displayTransposedSvgFromMei error:', error);
      this.#ui.showError('移調表示に失敗しました。', targetId);
      throw error;
    }
  }

  /**
   * URL から MEI を取得し、移調処理 → SVG 描画を行います。
   * @param {string} meiUrl
   * @param {string} targetId
   * @param {number} semitones
   * @param {object} [options]
   */
  async displayTransposedSvgFromUrl(
    meiUrl,
    targetId,
    semitones,
    options = { page: 1, measureRange: '' }
  ) {
    const mei = await this._loadMei(meiUrl);
    return this.displayTransposedSvgFromMei(mei, targetId, semitones, options);
  }
}
