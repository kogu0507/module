// dev-module/verovio/core-processor.js

//import { loadVerovio } from './loader.js';
import { loadVerovio } from './loader.min.js';
/**
 * CoreProcessor は VerovioToolkit を使い、
 * MEI → SVG/MIDI の変換ロジックを提供します。
 */
export class CoreProcessor {
  /** @private */
  #toolkit = null;
  /** @private */
  #renderOptions = {};

  /**
   * 初期化時にロード済みの Toolkit インスタンスを渡します。
   * @param {verovio.Toolkit} toolkit - 初期化済み Verovio Toolkit
   */
  constructor(toolkit) {
    if (!toolkit) {
      throw new Error('Verovio Toolkit インスタンスが必要です。');
    }
    this.#toolkit = toolkit;
    // オプションを初期適用
    this.#toolkit.setOptions(this.#renderOptions);
  }

  /**
   * レンダリングオプションをマージして設定します。
   * @param {object} options - Verovio の setOptions に渡す設定オブジェクト
   */
  setRenderOptions(options) {
    this.#renderOptions = { ...this.#renderOptions, ...options };
    this.#toolkit.setOptions(this.#renderOptions);
  }

  /**
   * URL から MEI を取得し、指定ページの SVG を生成します。
   * @param {string} url - MEI ファイルの URL
   * @param {number} [page=1] - 表示するページ番号
   * @returns {Promise<string>} SVG 文字列
   */
  async renderSvgFromUrl(url, page = 1) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`MEI の取得に失敗: ${res.status} ${res.statusText}`);
    }
    const mei = await res.text();
    this.#toolkit.loadData(mei);
    return this.#toolkit.renderToSVG(page);
  }

  /**
   * MEI 文字列から指定ページの SVG を生成します。
   * @param {string} meiData - MEI XML 文字列
   * @param {number} [page=1] - 表示するページ番号
   * @returns {string} SVG 文字列
   */
  renderSvgFromMei(meiData, page = 1) {
    this.#toolkit.loadData(meiData);
    return this.#toolkit.renderToSVG(page);
  }

  /**
   * URL から MEI を取得し、MIDI バイナリを返します。
   * @param {string} url - MEI ファイルの URL
   * @returns {Promise<ArrayBuffer>} MIDI データ
   */
  async renderMidiFromUrl(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`MEI の取得に失敗: ${res.status} ${res.statusText}`);
    }
    const mei = await res.text();
    return this._renderMidi(mei);
  }

  /**
   * MEI 文字列から MIDI バイナリを生成します。
   * @param {string} meiData - MEI XML 文字列
   * @returns {ArrayBuffer} MIDI データ
   */
  renderMidiFromMei(meiData) {
    return this._renderMidi(meiData);
  }

  /** @private */
  _renderMidi(mei) {
    this.#toolkit.loadData(mei);
    const base64 = this.#toolkit.renderToMIDI();
    // Base64 → ArrayBuffer
    const bin = atob(base64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 現在ロード中のページ数を返します。
   * @returns {number}
   */
  getPageCount() {
    return this.#toolkit.getPageCount();
  }
}
