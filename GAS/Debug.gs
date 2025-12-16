/**
 * Debug.gs - デバッグ用関数
 *
 * スプレッドシートのデータ構造を確認するためのテスト関数
 */

/**
 * eventsシートのデータをログ出力
 */
function debugEventsSheet() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('events');

    if (!sheet) {
      Logger.log('エラー: eventsシートが見つかりません');
      return;
    }

    Logger.log('シート名: ' + sheet.getName());
    Logger.log('最終行: ' + sheet.getLastRow());
    Logger.log('最終列: ' + sheet.getLastColumn());

    // ヘッダー行を取得
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('ヘッダー: ' + JSON.stringify(headers));

    // データ行を取得（最大5行）
    if (sheet.getLastRow() > 1) {
      const dataRows = Math.min(5, sheet.getLastRow() - 1);
      const data = sheet.getRange(2, 1, dataRows, sheet.getLastColumn()).getValues();

      Logger.log('データ行数: ' + data.length);

      for (let i = 0; i < data.length; i++) {
        Logger.log('--- 行' + (i + 2) + ' ---');
        for (let j = 0; j < headers.length; j++) {
          const value = data[i][j];
          const type = Object.prototype.toString.call(value);
          Logger.log(`  ${headers[j]}: ${value} (型: ${type})`);
        }
      }
    } else {
      Logger.log('データ行がありません');
    }

  } catch (error) {
    Logger.log('エラー発生: ' + error.toString());
  }
}

/**
 * getSheetData関数をテスト
 */
function debugGetSheetData() {
  try {
    Logger.log('=== getSheetData("events") のテスト ===');
    const events = getSheetData('events');

    Logger.log('取得した行数: ' + events.length);

    if (events.length > 0) {
      Logger.log('--- 最初のイベント ---');
      Logger.log(JSON.stringify(events[0], null, 2));

      if (events.length > 1) {
        Logger.log('--- 2番目のイベント ---');
        Logger.log(JSON.stringify(events[1], null, 2));
      }
    } else {
      Logger.log('イベントが取得できませんでした');
    }

  } catch (error) {
    Logger.log('エラー発生: ' + error.toString());
  }
}

/**
 * 日付・時刻のフォーマット関数をテスト
 */
function debugDateTimeFormat() {
  try {
    Logger.log('=== 日付・時刻フォーマットのテスト ===');

    // テスト用の日付
    const testDate = new Date('2025-12-12T00:00:00');
    Logger.log('テスト日付: ' + testDate);
    Logger.log('formatDate: ' + formatDate(testDate));

    // テスト用の時刻（Date型）
    const testTime = new Date('1899-12-30T19:00:00');
    Logger.log('テスト時刻 (Date): ' + testTime);
    Logger.log('formatTime: ' + formatTime(testTime));

    // テスト用の時刻（文字列）
    const testTimeStr = '19:00:00';
    Logger.log('テスト時刻 (String): ' + testTimeStr);
    Logger.log('formatTime: ' + formatTime(testTimeStr));

  } catch (error) {
    Logger.log('エラー発生: ' + error.toString());
  }
}

/**
 * すべてのデバッグテストを実行
 */
function runAllDebugTests() {
  Logger.clear();

  Logger.log('========================================');
  Logger.log('デバッグテスト開始');
  Logger.log('========================================\n');

  debugEventsSheet();
  Logger.log('\n');

  debugGetSheetData();
  Logger.log('\n');

  debugDateTimeFormat();
  Logger.log('\n');

  Logger.log('========================================');
  Logger.log('デバッグテスト完了');
  Logger.log('========================================');
}
