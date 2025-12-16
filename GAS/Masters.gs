/**
 * Masters.gs - マスタデータ管理
 *
 * プルダウン用のマスタデータを取得
 */

/**
 * 全マスタデータ取得
 */
function getMasters(token) {
  if (!isValidToken(token)) {
    return {success: false, error: '認証が必要です'};
  }

  const result = {
    hosts: getMasterData('hosts_master', 'host_name'),
    tags: getMasterData('tags_master', 'tag_name'),
    payment_methods: getMasterData('payment_methods_master', 'method_name'),
    dress_codes: getMasterData('dress_codes_master', 'dress_code'),
    positions: getMasterData('positions_master', 'position_name'),
    affiliations: getMasterData('affiliations_master', 'affiliation_name'),
    committees: getMasterData('committees_master', 'committee_name')
  };

  return {
    success: true,
    masters: result
  };
}

/**
 * マスタデータ取得ヘルパー
 */
function getMasterData(sheetName, columnName) {
  const sheet = getSheet(sheetName);

  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const result = [];

  for (let i = 1; i < data.length; i++) {
    const value = data[i][0];
    if (value) {
      result.push(value);
    }
  }

  return result;
}

/**
 * マスタデータ追加（管理者のみ）
 */
function addMasterData(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const masterType = params.master_type; // 'hosts', 'tags', etc.
  const value = params.value;

  if (!masterType || !value) {
    return {success: false, error: '必須項目が不足しています'};
  }

  const sheetMap = {
    'hosts': 'hosts_master',
    'tags': 'tags_master',
    'payment_methods': 'payment_methods_master',
    'dress_codes': 'dress_codes_master',
    'positions': 'positions_master',
    'affiliations': 'affiliations_master',
    'committees': 'committees_master'
  };

  const sheetName = sheetMap[masterType];

  if (!sheetName) {
    return {success: false, error: '無効なマスタタイプです'};
  }

  const sheet = getSheet(sheetName);
  sheet.appendRow([value]);

  return {
    success: true,
    message: 'マスタデータを追加しました'
  };
}

/**
 * マスタデータ削除（管理者のみ）
 */
function deleteMasterData(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const masterType = params.master_type;
  const value = params.value;

  if (!masterType || !value) {
    return {success: false, error: '必須項目が不足しています'};
  }

  const sheetMap = {
    'hosts': 'hosts_master',
    'tags': 'tags_master',
    'payment_methods': 'payment_methods_master',
    'dress_codes': 'dress_codes_master',
    'positions': 'positions_master',
    'affiliations': 'affiliations_master',
    'committees': 'committees_master'
  };

  const sheetName = sheetMap[masterType];

  if (!sheetName) {
    return {success: false, error: '無効なマスタタイプです'};
  }

  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === value) {
      sheet.deleteRow(i + 1);
      return {
        success: true,
        message: 'マスタデータを削除しました'
      };
    }
  }

  return {
    success: false,
    error: 'データが見つかりません'
  };
}
