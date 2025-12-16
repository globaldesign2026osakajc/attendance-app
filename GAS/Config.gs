/**
 * Config.gs - 設定ファイル
 *
 * 各種IDや定数を管理
 *
 * ✅ すべてのIDは「APIやID」ファイルから設定済み
 */

// Google Sheets
const SPREADSHEET_ID = '1HeAz2otpzbycIkWjRoUeKsKD1AJht8F4Dy1Cb7W9fNU';

// Google Drive フォルダ
const PROFILE_PHOTO_FOLDER_ID = '1nqo3T6JVZWX8kyu4EQhcw-DQ57QevOAP';
const RECEIPT_FOLDER_ID = '1-NPTHc1bG-yiIZ13E6kr4gueHroKTPGT';

// Google Docs テンプレート
const RECEIPT_TEMPLATE_ID = '1Q74o2tZbvUgSIkKlK1f3EWfb7wfdJ_odlduLpkmElVw';

// Googleカレンダー
// イベント作成時に自動でGoogleカレンダーに登録されます
const CALENDAR_ID = 'globaldesign.2026osakajc@gmail.com';

// セッション設定
const SESSION_EXPIRE_HOURS = 24; // セッショントークン有効期限（時間）

// アップロード制限
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * スプレッドシート取得用関数
 */
function getSpreadsheet() {
  // 現在のスプレッドシートを使用（IDでの指定ではなく、このスクリプトが紐付いているスプレッドシート）
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * シート取得用関数
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  return ss.getSheetByName(sheetName);
}
