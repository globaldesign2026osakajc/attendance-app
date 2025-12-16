/**
 * config.js - 設定ファイル
 *
 * API URLやアプリ設定を管理
 */

const CONFIG = {
  // GAS Web App API URL
  API_URL: 'https://script.google.com/macros/s/AKfycbw2lmbQTiHdGWrXQgJI-wd2-OEErxwA2yuUG-Ca8pBDpABj047jfuDEW16TOHmzGOOc/exec',

  // アプリ名
  APP_NAME: 'グローバルデザイン推進委員会 出欠管理',

  // キャッシュの有効期限（ミリ秒）
  CACHE_TTL: 5 * 60 * 1000, // 5分

  // セッショントークンの有効期限（ミリ秒）
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24時間
};
