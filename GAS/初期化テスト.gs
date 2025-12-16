/**
 * 初期化テスト.gs
 *
 * 初回実行用のテスト関数
 * このファイルをApps Scriptに追加して、testConnection()を実行してください
 * 権限の承認が必要な場合は、承認画面が表示されます
 */

/**
 * スプレッドシート接続テスト
 *
 * この関数を実行して権限を付与してください:
 * 1. Apps Scriptエディタでこの関数を選択
 * 2. 上部の「▶実行」ボタンをクリック
 * 3. 「承認が必要です」と表示されたら権限を付与
 */
function testConnection() {
  try {
    // スプレッドシート接続テスト
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ スプレッドシート接続成功: ' + ss.getName());

    // シート一覧を取得
    const sheets = ss.getSheets();
    Logger.log('📋 シート数: ' + sheets.length);

    sheets.forEach(sheet => {
      Logger.log('  - ' + sheet.getName());
    });

    // members シートのデータ確認
    const membersSheet = ss.getSheetByName('members');
    if (membersSheet) {
      const data = membersSheet.getDataRange().getValues();
      Logger.log('👥 メンバー数（ヘッダー除く）: ' + (data.length - 1));
    }

    // Google Drive接続テスト
    const profileFolder = DriveApp.getFolderById(PROFILE_PHOTO_FOLDER_ID);
    Logger.log('✅ プロフィール写真フォルダ接続成功: ' + profileFolder.getName());

    const receiptFolder = DriveApp.getFolderById(RECEIPT_FOLDER_ID);
    Logger.log('✅ 領収書フォルダ接続成功: ' + receiptFolder.getName());

    // Google Docs接続テスト
    const template = DriveApp.getFileById(RECEIPT_TEMPLATE_ID);
    Logger.log('✅ 領収書テンプレート接続成功: ' + template.getName());

    // カレンダー接続テスト（設定されている場合）
    if (CALENDAR_ID) {
      const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
      if (calendar) {
        Logger.log('✅ カレンダー接続成功: ' + calendar.getName());
      }
    }

    Logger.log('');
    Logger.log('🎉 すべての接続テストが成功しました！');
    Logger.log('Web Appとして正常に動作します。');

    return {
      success: true,
      message: 'すべての接続テストが成功しました'
    };

  } catch (error) {
    Logger.log('❌ エラー: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * ログインAPIテスト
 *
 * testConnection()が成功したら、この関数を実行してログイン機能をテスト
 */
function testLoginAPI() {
  try {
    const result = login({
      login_id: 'yamada',
      password: 'password123'
    });

    Logger.log('ログインテスト結果:');
    Logger.log(JSON.stringify(result, null, 2));

    if (result.success) {
      Logger.log('✅ ログインAPIが正常に動作しています');
    } else {
      Logger.log('❌ ログイン失敗: ' + result.error);
    }

    return result;

  } catch (error) {
    Logger.log('❌ エラー: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * マスタデータ取得テスト
 */
function testMastersAPI() {
  try {
    // まずログインしてトークンを取得
    const loginResult = login({
      login_id: 'yamada',
      password: 'password123'
    });

    if (!loginResult.success) {
      Logger.log('❌ ログイン失敗');
      return loginResult;
    }

    Logger.log('✅ ログイン成功');

    // マスタデータを取得
    const mastersResult = getMasters(loginResult.token);

    Logger.log('マスタデータ取得結果:');
    Logger.log(JSON.stringify(mastersResult, null, 2));

    return mastersResult;

  } catch (error) {
    Logger.log('❌ エラー: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
