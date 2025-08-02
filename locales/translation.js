// src/locales/translation.js

let translationsData = {}; // 読み込まれた翻訳データを保持する
let currentLanguage = 'en'; // デフォルト言語

/**
 * 翻訳データをセットする関数
 * アプリケーション起動時に一度呼び出す
 * @param {Object} data - translations.json から読み込んだデータ
 */
export function setTranslations(data) {
  translationsData = data.translations; // "translations" オブジェクトの下を直接使う
  console.log('Translations loaded:', translationsData);
}

/**
 * 現在の言語を設定する関数
 * @param {string} lang - 'jp', 'en', 'de' など
 */
export function setLanguage(lang) {
  currentLanguage = lang;
  console.log('Language set to:', currentLanguage);
  // 必要であれば、ここでUIを再レンダリングするイベントを発火させる
}

/**
 * キーに対応する翻訳テキストを取得する関数
 * @param {string} key - 翻訳キー（例: 'melody dictation', 'C major'）
 * @returns {string} 翻訳されたテキスト、またはキーが見つからない場合はキー自身
 */
export function t(key) {
  if (translationsData && translationsData[key] && translationsData[key][currentLanguage]) {
    return translationsData[key][currentLanguage];
  }
  // 翻訳が見つからない場合は、キーをそのまま返す（またはエラーログを出す）
  console.warn(`Translation missing for key: "${key}" in language: "${currentLanguage}"`);
  return key;
}

/**
 * 現在の言語を取得する関数
 */
export function getCurrentLanguage() {
  return currentLanguage;
}