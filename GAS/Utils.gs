/**
 * Utils.gs - ユーティリティ関数
 *
 * 共通で使用する便利な関数群
 */

/**
 * ランダムなトークンを生成
 */
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * ユニークIDを生成（例: M001, EVT001）
 */
function generateUniqueId(prefix, sheet) {
  const data = sheet.getDataRange().getValues();
  let maxNum = 0;

  for (let i = 1; i < data.length; i++) {
    const id = data[i][0];
    if (id && id.toString().startsWith(prefix)) {
      const num = parseInt(id.toString().replace(prefix, ''));
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const newNum = maxNum + 1;
  return prefix + newNum.toString().padStart(3, '0');
}

/**
 * シートから全データを取得（ヘッダー付き）
 */
function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);

  // シートが存在しない場合は空配列を返す
  if (!sheet) {
    Logger.log('Warning: Sheet "' + sheetName + '" not found');
    return [];
  }

  const data = sheet.getDataRange().getValues();

  if (data.length === 0) {
    return [];
  }

  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const value = data[i][j];
      const header = headers[j];

      // 日付・時刻カラムを文字列にフォーマット
      if (value instanceof Date) {
        if (header === 'date' || header === 'birthday' || header.includes('_date')) {
          row[header] = formatDate(value);
        } else if (header === 'start_time' || header === 'end_time' || header.includes('_time')) {
          row[header] = formatTime(value);
        } else if (header.includes('deadline') || header.includes('_at')) {
          row[header] = formatDateTime(value);
        } else {
          row[header] = value;
        }
      } else {
        row[header] = value;
      }
    }
    rows.push(row);
  }

  return rows;
}

/**
 * シートから条件に一致する行を検索
 */
function findRow(sheetName, columnName, value) {
  const sheet = getSheet(sheetName);

  // シートが存在しない場合はnullを返す
  if (!sheet) {
    Logger.log('Warning: Sheet "' + sheetName + '" not found');
    return null;
  }

  const data = sheet.getDataRange().getValues();

  if (data.length === 0) {
    return null;
  }

  const headers = data[0];
  const columnIndex = headers.indexOf(columnName);

  if (columnIndex === -1) {
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][columnIndex] === value) {
      const row = {rowIndex: i + 1};
      for (let j = 0; j < headers.length; j++) {
        const cellValue = data[i][j];
        const header = headers[j];

        // 日付・時刻カラムを文字列にフォーマット
        if (cellValue instanceof Date) {
          if (header === 'date' || header === 'birthday' || header.includes('_date') ||
              header === 'attendance_deadline' || header === 'registration_deadline' || header === 'cancellation_fee_date') {
            row[header] = formatDate(cellValue);
          } else if (header === 'start_time' || header === 'end_time' || header.includes('_time')) {
            row[header] = formatTime(cellValue);
          } else if (header.includes('deadline') || header.includes('_at')) {
            row[header] = formatDateTime(cellValue);
          } else {
            row[header] = cellValue;
          }
        } else {
          row[header] = cellValue;
        }
      }
      return row;
    }
  }

  return null;
}

/**
 * シートに行を追加
 */
function addRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = [];

  for (let i = 0; i < headers.length; i++) {
    values.push(rowData[headers[i]] || '');
  }

  sheet.appendRow(values);
}

/**
 * シートの行を更新
 */
function updateRow(sheetName, rowIndex, rowData) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = [];

  for (let i = 0; i < headers.length; i++) {
    if (rowData.hasOwnProperty(headers[i])) {
      values.push(rowData[headers[i]]);
    } else {
      const currentValue = sheet.getRange(rowIndex, i + 1).getValue();
      values.push(currentValue);
    }
  }

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
}

/**
 * シートの行を削除
 */
function deleteRow(sheetName, rowIndex) {
  const sheet = getSheet(sheetName);
  sheet.deleteRow(rowIndex);
}

/**
 * 日付を文字列にフォーマット（YYYY-MM-DD）
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日時を文字列にフォーマット（YYYY-MM-DD HH:MM:SS）
 */
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 時刻を文字列にフォーマット（HH:MM:SS）
 */
function formatTime(time) {
  if (!time) return '';

  // 既に文字列の場合はそのまま返す
  if (typeof time === 'string') {
    return time;
  }

  // Dateオブジェクトの場合
  const d = new Date(time);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * JSONをパース（エラー処理付き）
 */
function parseJSON(jsonString) {
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    }
    return jsonString;
  } catch (e) {
    return null;
  }
}

/**
 * 所属のカラーコードを取得
 */
function getAffiliationColor(affiliation) {
  if (!affiliation) return null;

  try {
    const affiliations = getSheetData('affiliations_master');
    const affiliationData = affiliations.find(a => a.affiliation_name === affiliation);

    if (affiliationData && affiliationData['カラーコード']) {
      return affiliationData['カラーコード'];
    }

    return null;
  } catch (error) {
    Logger.log('Error getting affiliation color: ' + error);
    return null;
  }
}

/**
 * すべての所属とカラーコードのマップを取得
 */
function getAffiliationColors() {
  try {
    const affiliations = getSheetData('affiliations_master');
    const colorMap = {};

    affiliations.forEach(affiliation => {
      if (affiliation.affiliation_name && affiliation['カラーコード']) {
        colorMap[affiliation.affiliation_name] = affiliation['カラーコード'];
      }
    });

    return colorMap;
  } catch (error) {
    Logger.log('Error getting affiliation colors: ' + error);
    return {};
  }
}

/**
 * Base64エンコード
 */
function base64Encode(str) {
  return Utilities.base64Encode(str);
}

/**
 * Base64デコード
 */
function base64Decode(str) {
  return Utilities.base64Decode(str);
}
