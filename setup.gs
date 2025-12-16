/**
 * 出欠管理システム用スプレッドシート自動作成スクリプト
 * 
 * 使い方：
 * 1. 新しいGoogleスプレッドシートを作成
 * 2. 「拡張機能」→「Apps Script」を開く
 * 3. このコードを貼り付け
 * 4. 関数「createAllSheets」を実行
 * 5. 権限の承認を求められたら承認する
 */

function createAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 既存のシートを削除（「シート1」など）
  const sheets = ss.getSheets();
  if (sheets.length === 1 && sheets[0].getName().includes('シート')) {
    // デフォルトシートのみの場合は後で削除
  }
  
  // 各シートを作成
  createMembersSheet(ss);
  createEventsSheet(ss);
  createAttendanceSheet(ss);
  createPaymentsSheet(ss);
  createReceiptsSheet(ss);
  createCheckinSheet(ss);
  createSessionsSheet(ss);
  createHostsMasterSheet(ss);
  createTagsMasterSheet(ss);
  createPaymentMethodsMasterSheet(ss);
  createDressCodesMasterSheet(ss);
  createPositionsMasterSheet(ss);
  createAffiliationsMasterSheet(ss);
  createCommitteesMasterSheet(ss);
  
  // デフォルトシートを削除
  const defaultSheet = ss.getSheetByName('シート1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
  }
  
  // スプレッドシート名を変更
  ss.rename('出欠管理システム');
  
  Logger.log('すべてのシートの作成が完了しました！');
  SpreadsheetApp.getUi().alert('✅ すべてのシートの作成が完了しました！');
}

// 1. members（メンバー一覧）
function createMembersSheet(ss) {
  const sheet = ss.insertSheet('members');
  
  const headers = [
    'member_id', 'name', 'login_id', 'password', 'kana',
    'affiliation', 'position', 'birthday', 'PhotoURL', 'role', 'committee', 'company_name', 'registered_at'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const sampleData = [
    'M001', '山田太郎', 'yamada', password123'', 'ヤマダタロウ',
    '営業部', '委員長', '1990-01-01', '', 'admin', 'グローバルデザイン推進委員会', '株式会社サンプル', new Date()
  ];
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  
  // 列幅調整
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✓ members シート作成完了');
}

// 2. events（イベント一覧）
function createEventsSheet(ss) {
  const sheet = ss.insertSheet('events');
  
  const headers = [
    'event_id', 'title', 'date', 'start_time', 'end_time', 'location', 'map_url', 
    'host', 'description', 'attendance_type', 'custom_options', 'memo', 'urgent', 
    'attendance_deadline', 'registration_deadline', 'cancellation_fee_date', 
    'fee_amount', 'fee_currency', 'payment_methods', 'dress_code', 'dress_code_note', 
    'tags', 'notes', 'target_group', 'visibility', 'qr_enabled', 'csv_enabled', 
    'calendar_sync', 'display_fields', 'receipt_note_default', 'receipt_enabled'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const sampleData = [
    'EVT001', '6月定例会', '2025-06-15', '19:00', '21:00', '大阪会館', 
    'https://maps.google.com/', 'グローバルデザイン推進委員会', 
    '6月の定例会議です', 'A', '', '', false, 
    '2025-06-14', '2025-06-10', '2025-06-08', 
    5000, 'JPY', '現地払い,銀行振込', 'スーツ', '', 
    '委員会,月例会', '', '全員', '全員に公開', true, true, 
    true, '{"date":true,"time":true,"location":true}', '会費として', true
  ];
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  
  // 列幅調整
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✓ events シート作成完了');
}

// 3. attendance（出欠登録）
function createAttendanceSheet(ss) {
  const sheet = ss.insertSheet('attendance');
  
  const headers = [
    'attendance_id', 'event_id', 'member_id', 'status', 
    'selected_option', 'memo', 'registered_at'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const sampleData = [
    'ATT001', 'EVT001', 'M001', '参加', '', '', new Date()
  ];
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✓ attendance シート作成完了');
}

// 4. payments（支払い管理）
function createPaymentsSheet(ss) {
  const sheet = ss.insertSheet('payments');
  
  const headers = [
    'payment_id', 'event_id', 'member_id', 'payment_method', 'amount', 
    'paid', 'paid_at', 'paid_by_admin', 'receipt_issued', 
    'receipt_number', 'receipt_url', 'receipt_issued_at', 'notes'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const sampleData = [
    'PAY001', 'EVT001', 'M001', '現地払い', 5000, 
    false, '', false, false, '', '', '', ''
  ];
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✓ payments シート作成完了');
}

// 5. receipts（領収書発行履歴）
function createReceiptsSheet(ss) {
  const sheet = ss.insertSheet('receipts');

  const headers = [
    'receipt_id', 'receipt_number', 'event_id', 'member_id', 'member_ids',
    'is_combined', 'company_name', 'amount', 'receipt_note', 'detail_note',
    'issued_at', 'pdf_url'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  sheet.autoResizeColumns(1, headers.length);

  Logger.log('✓ receipts シート作成完了');
}

// 6. checkin（実出席記録）
function createCheckinSheet(ss) {
  const sheet = ss.insertSheet('checkin');
  
  const headers = [
    'checkin_id', 'event_id', 'member_id', 'checked_in_at'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const sampleData = [
    'CHK001', 'EVT001', 'M001', new Date()
  ];
  sheet.getRange(2, 1, 1, sampleData.length).setValues([sampleData]);
  
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✓ checkin シート作成完了');
}

// 7. sessions（セッション管理）
function createSessionsSheet(ss) {
  const sheet = ss.insertSheet('sessions');
  
  const headers = [
    'token', 'member_id', 'role', 'created_at', 'expires_at'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✓ sessions シート作成完了');
}

// 8. hosts_master（主催者マスタ）
function createHostsMasterSheet(ss) {
  const sheet = ss.insertSheet('hosts_master');
  
  const headers = ['host_name'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const data = [
    ['グローバルデザイン推進委員会'],
    ['総務委員会'],
    ['渉外委員会'],
    ['会員拡大委員会']
  ];
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  
  sheet.autoResizeColumn(1);
  
  Logger.log('✓ hosts_master シート作成完了');
}

// 9. tags_master（タグマスタ）
function createTagsMasterSheet(ss) {
  const sheet = ss.insertSheet('tags_master');
  
  const headers = ['tag_name'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const data = [
    ['委員会'],
    ['月例会'],
    ['総会'],
    ['委員会事業'],
    ['遠征事業'],
    ['他委員会事業'],
    ['理事会'],
    ['懇親会']
  ];
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  
  sheet.autoResizeColumn(1);
  
  Logger.log('✓ tags_master シート作成完了');
}

// 10. payment_methods_master（支払い方法マスタ）
function createPaymentMethodsMasterSheet(ss) {
  const sheet = ss.insertSheet('payment_methods_master');
  
  const headers = ['method_name'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const data = [
    ['現地払い'],
    ['銀行振込'],
    ['当日お渡し'],
    ['後日お渡し'],
    ['不明']
  ];
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  
  sheet.autoResizeColumn(1);
  
  Logger.log('✓ payment_methods_master シート作成完了');
}

// 11. dress_codes_master（服装規定マスタ）
function createDressCodesMasterSheet(ss) {
  const sheet = ss.insertSheet('dress_codes_master');
  
  const headers = ['dress_code'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const data = [
    ['スーツ'],
    ['ビジネスカジュアル'],
    ['カジュアル'],
    ['正装'],
    ['自由'],
    ['指定なし']
  ];
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  
  sheet.autoResizeColumn(1);
  
  Logger.log('✓ dress_codes_master シート作成完了');
}

// 12. positions_master（役職マスタ）
function createPositionsMasterSheet(ss) {
  const sheet = ss.insertSheet('positions_master');
  
  const headers = ['position_name'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const data = [
    ['委員長'],
    ['副委員長'],
    ['幹事'],
    ['会計'],
    ['書記'],
    ['委員'],
    ['一般会員']
  ];
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  
  sheet.autoResizeColumn(1);
  
  Logger.log('✓ positions_master シート作成完了');
}

// 13. affiliations_master（所属マスタ）
function createAffiliationsMasterSheet(ss) {
  const sheet = ss.insertSheet('affiliations_master');
  
  const headers = ['affiliation_name'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const data = [
    ['営業部'],
    ['企画部'],
    ['総務部'],
    ['人事部'],
    ['経理部'],
    ['開発部']
  ];
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  
  sheet.autoResizeColumn(1);
  
  Logger.log('✓ affiliations_master シート作成完了');
}

// 14. committees_master（委員会マスタ）
function createCommitteesMasterSheet(ss) {
  const sheet = ss.insertSheet('committees_master');
  
  const headers = ['committee_name'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // サンプルデータ
  const data = [
    ['グローバルデザイン推進委員会'],
    ['総務委員会'],
    ['渉外委員会'],
    ['会員拡大委員会']
  ];
  sheet.getRange(2, 1, data.length, 1).setValues(data);
  
  sheet.autoResizeColumn(1);
  
  Logger.log('✓ committees_master シート作成完了');
}