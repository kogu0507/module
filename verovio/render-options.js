// module/verovio/render-options.js

/**
 * 標準レンダリングオプションのプリセット集
 * 使いたいプリセットを import して CoreProcessor.setRenderOptions に渡します。
 * 例: import { defaultOptions } from './render-options.js';
 */

/**
 * 標準（デフォルト）のオプション
 */
export const defaultOptions = {
  svgViewBox: false, // 解除しないとレイアウトが変更不可
  adjustPageHeight: true,
  adjustPageWidth: true,
  breaks: 'encoded',

  //pageWidth: 800,     // ページ幅（px）
  scale: 50,          // 拡大縮小率（％）
  spacingStaff: 5,    // 五線間隔
  spacingSystem: 15,  // スタッフグループ間間隔
  footer: "none",
};

/**
 * 高解像度表示向けオプション
 */
export const highResOptions = {
  svgViewBox: false, // 解除しないとレイアウトが変更不可
  adjustPageHeight: true,
  adjustPageWidth: true,
  breaks: 'encoded',

  scale: 150,
  spacingStaff: 5,    // 五線間隔
  spacingSystem: 15,  // スタッフグループ間間隔
  
  footer: "none",
};

/**
 * モバイル表示向けオプション
 */
export const mobileOptions = {
  svgViewBox: false, // 解除しないとレイアウトが変更不可
  adjustPageHeight: true,
  adjustPageWidth: true,
  breaks: 'encoded',

  scale: 40,
  spacingStaff: 5,    // 五線間隔
  spacingSystem: 15,  // スタッフグループ間間隔
  footer: "none",
};

/**
 * 印刷向けオプション
 */
export const printOptions = {
  svgViewBox: false, // 解除しないとレイアウトが変更不可
  adjustPageHeight: true,
  pageWidth: 1000,
  breaks: 'encoded',

  scale: 100,
  //pageHeight: 1400,
  footer: "none",
};

export const svgViewBox = {
  svgViewBox: true,
  adjustPageHeight: true,
  adjustPageWidth: true,
  breaks: 'encoded',

  pageMarginTop: 0,
  pageMarginRight: 0,
  pageMarginLeft: 0,
  pageMarginBottom: 0,


  footer: "none",
};

//pageWidth: 1000,