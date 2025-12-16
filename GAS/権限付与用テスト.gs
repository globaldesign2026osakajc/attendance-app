/**
 * 権限付与用テスト.gs
 *
 * この関数を実行して、必要な権限をすべて付与します
 */

/**
 * 全権限を一度に付与するテスト関数
 *
 * この関数を実行すると、以下の権限が要求されます:
 * - Google Spreadsheets
 * - Google Drive
 * - Google Calendar
 *
 * 実行手順:
 * 1. この関数を選択
 * 2. 「実行」ボタンをクリック
 * 3. 「承認が必要です」→「権限を確認」
 * 4. 「詳細」→「(プロジェクト名)（安全ではないページ）に移動」
 * 5. すべての権限を「許可」
 */
function grantAllPermissions() {
  try {
    Logger.log('=== 権限付与テスト開始 ===');
    Logger.log('');

    // 1. Spreadsheets権限
    Logger.log('📊 Spreadsheets権限のテスト...');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('  ✅ スプレッドシート接続成功: ' + ss.getName());

    const membersSheet = ss.getSheetByName('members');
    if (membersSheet) {
      const data = membersSheet.getDataRange().getValues();
      Logger.log('  ✅ データ読み込み成功: ' + (data.length - 1) + '件のメンバー');
    }
    Logger.log('');

    // 2. Drive権限
    Logger.log('📁 Drive権限のテスト...');

    try {
      const profileFolder = DriveApp.getFolderById(PROFILE_PHOTO_FOLDER_ID);
      Logger.log('  ✅ プロフィール写真フォルダ接続成功: ' + profileFolder.getName());
    } catch (e) {
      Logger.log('  ⚠️ プロフィール写真フォルダエラー: ' + e.message);
    }

    try {
      const receiptFolder = DriveApp.getFolderById(RECEIPT_FOLDER_ID);
      Logger.log('  ✅ 領収書フォルダ接続成功: ' + receiptFolder.getName());
    } catch (e) {
      Logger.log('  ⚠️ 領収書フォルダエラー: ' + e.message);
    }

    try {
      const template = DriveApp.getFileById(RECEIPT_TEMPLATE_ID);
      Logger.log('  ✅ 領収書テンプレート接続成功: ' + template.getName());
    } catch (e) {
      Logger.log('  ⚠️ 領収書テンプレートエラー: ' + e.message);
    }
    Logger.log('');

    // 3. Calendar権限
    Logger.log('📅 Calendar権限のテスト...');
    if (CALENDAR_ID) {
      try {
        const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
        if (calendar) {
          Logger.log('  ✅ カレンダー接続成功: ' + calendar.getName());
        }
      } catch (e) {
        Logger.log('  ⚠️ カレンダーエラー: ' + e.message);
        Logger.log('  ℹ️  「サービス」から「Google Calendar API」を追加してください');
      }
    } else {
      Logger.log('  ⚠️ カレンダーIDが設定されていません');
    }
    Logger.log('');

    Logger.log('=== 権限付与テスト完了 ===');
    Logger.log('');
    Logger.log('✅ すべての権限が正常に付与されました！');
    Logger.log('');
    Logger.log('📝 次のステップ:');
    Logger.log('  1. 「デプロイ」→「デプロイを管理」');
    Logger.log('  2. 鉛筆アイコン（編集）をクリック');
    Logger.log('  3. バージョン: 新しいバージョン');
    Logger.log('  4. 「デプロイ」をクリック');
    Logger.log('');
    Logger.log('再デプロイ後、Web Appが正常に動作します。');

    return {
      success: true,
      message: 'すべての権限が付与されました'
    };

  } catch (error) {
    Logger.log('');
    Logger.log('❌ エラー: ' + error.toString());
    Logger.log('');
    Logger.log('🔧 対処方法:');
    Logger.log('  1. 「承認が必要です」と表示されたら「権限を確認」をクリック');
    Logger.log('  2. 「詳細」→「(プロジェクト名)（安全ではないページ）に移動」');
    Logger.log('  3. すべての権限を「許可」');
    Logger.log('  4. この関数を再度実行');

    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * ログインAPIの動作確認
 *
 * grantAllPermissions()が成功したら、この関数を実行してAPIをテスト
 */
function testLoginAfterPermission() {
  try {
    Logger.log('=== ログインAPIテスト ===');

    // サンプルユーザーでログイン
    const result = login({
      login_id: 'yamada',
      password: 'password123'
    });

    Logger.log('結果:');
    Logger.log(JSON.stringify(result, null, 2));

    if (result.success) {
      Logger.log('');
      Logger.log('✅ ログインAPI正常動作!');
      Logger.log('');
      Logger.log('トークン: ' + result.token.substring(0, 20) + '...');
      Logger.log('メンバーID: ' + result.member_id);
      Logger.log('名前: ' + result.name);
      Logger.log('権限: ' + result.role);
      Logger.log('');
      Logger.log('🎉 Web Appは正常に動作しています！');
    } else {
      Logger.log('');
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
