/**
 * Members.gs - メンバー管理
 *
 * メンバーの取得、登録、更新、削除、プロフィール編集
 */

/**
 * メンバー一覧取得
 */
function getMembers(token) {
  // 認証チェック（管理者でなくてもログイン済みなら取得可能）
  const member = getMemberFromToken(token);

  if (!member) {
    return {success: false, error: '認証が必要です'};
  }

  const members = getSheetData('members');

  // パスワードは返さない、カラーコードを追加
  const result = members.map(member => {
    const {password, ...memberWithoutPassword} = member;

    // 所属のカラーコードを取得
    if (memberWithoutPassword.affiliation) {
      memberWithoutPassword.affiliation_color = getAffiliationColor(memberWithoutPassword.affiliation);
    }

    return memberWithoutPassword;
  });

  return {
    success: true,
    members: result
  };
}

/**
 * 自分のプロフィール取得
 */
function getMemberProfile(token) {
  const member = getMemberFromToken(token);

  if (!member) {
    return {success: false, error: '認証が必要です'};
  }

  const profile = findRow('members', 'member_id', member.member_id);

  if (!profile) {
    return {success: false, error: 'メンバー情報が見つかりません'};
  }

  // パスワードは返さない
  const {password, ...profileWithoutPassword} = profile;

  return {
    success: true,
    profile: profileWithoutPassword
  };
}

/**
 * 自分のプロフィール更新（一般ユーザー用）
 */
function updateMemberProfile(token, dataStr) {
  const member = getMemberFromToken(token);

  if (!member) {
    return {success: false, error: '認証が必要です'};
  }

  const data = parseJSON(dataStr);

  if (!data) {
    return {success: false, error: 'データが不正です'};
  }

  const profile = findRow('members', 'member_id', member.member_id);

  if (!profile) {
    return {success: false, error: 'メンバー情報が見つかりません'};
  }

  // 更新可能な項目のみ
  const updateData = {};

  if (data.kana !== undefined) updateData.kana = data.kana;
  if (data.affiliation !== undefined) updateData.affiliation = data.affiliation;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.committee !== undefined) updateData.committee = data.committee;
  if (data.company_name !== undefined) updateData.company_name = data.company_name;
  if (data.birthday !== undefined) updateData.birthday = data.birthday;
  if (data.PhotoURL !== undefined) updateData.PhotoURL = data.PhotoURL;
  if (data['あだ名'] !== undefined) updateData['あだ名'] = data['あだ名'];
  if (data['LINE名'] !== undefined) updateData['LINE名'] = data['LINE名'];
  if (data['入会年度'] !== undefined) updateData['入会年度'] = data['入会年度'];
  if (data['出向先'] !== undefined) updateData['出向先'] = data['出向先'];
  if (data['電話番号'] !== undefined) updateData['電話番号'] = data['電話番号'];
  if (data['業種'] !== undefined) updateData['業種'] = data['業種'];
  if (data['アレルギー'] !== undefined) updateData['アレルギー'] = data['アレルギー'];
  if (data['好きなもの'] !== undefined) updateData['好きなもの'] = data['好きなもの'];
  if (data['嫌いなもの'] !== undefined) updateData['嫌いなもの'] = data['嫌いなもの'];
  if (data['好きな国'] !== undefined) updateData['好きな国'] = data['好きな国'];
  if (data['好きな言葉'] !== undefined) updateData['好きな言葉'] = data['好きな言葉'];
  if (data['一言'] !== undefined) updateData['一言'] = data['一言'];

  updateRow('members', profile.rowIndex, updateData);

  return {
    success: true,
    message: 'プロフィールを更新しました'
  };
}

/**
 * プロフィール写真アップロード
 */
function uploadProfilePhoto(token, params) {
  const loginMember = getMemberFromToken(token);

  if (!loginMember) {
    return {success: false, error: '認証が必要です'};
  }

  const fileData = params.file_data;
  const fileName = params.file_name;
  const mimeType = params.mime_type;
  const targetMemberId = params.member_id; // 管理者が他のメンバーの写真をアップする場合

  if (!fileData || !fileName) {
    return {success: false, error: 'ファイルデータが必要です'};
  }

  // アップロード対象のメンバーIDを決定
  let memberId = loginMember.member_id;

  // 管理者が他のメンバーの写真をアップロードする場合
  if (targetMemberId && targetMemberId !== loginMember.member_id) {
    if (!isAdmin(token)) {
      return {success: false, error: '他のメンバーの写真をアップロードするには管理者権限が必要です'};
    }
    memberId = targetMemberId;
  }

  try {
    // 対象メンバーの情報を取得
    const profile = findRow('members', 'member_id', memberId);

    if (!profile) {
      return {success: false, error: 'メンバー情報が見つかりません'};
    }

    // 既存の写真ファイルを削除
    if (profile.PhotoURL) {
      try {
        // URLからファイルIDを抽出（複数のパターンに対応）
        let fileIdMatch = profile.PhotoURL.match(/[?&]id=([^&]+)/);
        if (!fileIdMatch) {
          fileIdMatch = profile.PhotoURL.match(/\/d\/([^\/]+)/);
        }
        if (fileIdMatch && fileIdMatch[1]) {
          const oldFile = DriveApp.getFileById(fileIdMatch[1]);
          oldFile.setTrashed(true);
        }
      } catch (e) {
        // 既存ファイルの削除に失敗しても続行
        Logger.log('既存ファイル削除エラー: ' + e.toString());
      }
    }

    // Base64デコード
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileData),
      mimeType,
      memberId + '_' + new Date().getTime() + '_' + fileName
    );

    // Google Driveに保存
    const folder = DriveApp.getFolderById(PROFILE_PHOTO_FOLDER_ID);
    const file = folder.createFile(blob);

    // 共有設定（リンクを知っている全員が閲覧可能）
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 画像として直接表示できるURLを生成（サムネイル形式）
    const fileId = file.getId();
    const photoUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

    // メンバー情報を更新
    updateRow('members', profile.rowIndex, {PhotoURL: photoUrl});

    return {
      success: true,
      photo_url: photoUrl,
      message: 'プロフィール写真をアップロードしました'
    };
  } catch (e) {
    return {
      success: false,
      error: 'アップロードに失敗しました: ' + e.toString()
    };
  }
}

/**
 * パスワード変更
 */
function changePassword(token, dataStr) {
  const member = getMemberFromToken(token);

  if (!member) {
    return {success: false, error: '認証が必要です'};
  }

  const data = parseJSON(dataStr);

  if (!data || !data.current_password || !data.new_password) {
    return {success: false, error: '現在のパスワードと新しいパスワードを入力してください'};
  }

  const profile = findRow('members', 'member_id', member.member_id);

  if (!profile) {
    return {success: false, error: 'メンバー情報が見つかりません'};
  }

  // 現在のパスワードを確認
  if (profile.password !== data.current_password) {
    return {success: false, error: '現在のパスワードが正しくありません'};
  }

  // パスワードの長さチェック
  if (data.new_password.length < 8) {
    return {success: false, error: 'パスワードは8文字以上にしてください'};
  }

  // パスワード更新
  updateRow('members', profile.rowIndex, {password: data.new_password});

  return {
    success: true,
    message: 'パスワードを変更しました'
  };
}

/**
 * メンバー追加（管理者のみ）
 */
function addMember(token, dataStr) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const data = parseJSON(dataStr);

  if (!data || !data.name || !data.login_id || !data.password) {
    return {success: false, error: '必須項目が不足しています'};
  }

  // login_idの重複チェック
  const existingMember = findRow('members', 'login_id', data.login_id);

  if (existingMember) {
    return {success: false, error: 'このログインIDは既に使用されています'};
  }

  const sheet = getSheet('members');
  const memberId = generateUniqueId('M', sheet);

  const newMember = {
    member_id: memberId,
    name: data.name,
    login_id: data.login_id,
    password: data.password,
    kana: data.kana || '',
    affiliation: data.affiliation || '',
    position: data.position || '',
    birthday: data.birthday || '',
    PhotoURL: '',
    role: data.role || 'member',
    committee: data.committee || '',
    registered_at: new Date(),
    'あだ名': data['あだ名'] || '',
    'LINE名': data['LINE名'] || '',
    '入会年度': data['入会年度'] || '',
    '出向先': data['出向先'] || '',
    '電話番号': data['電話番号'] || '',
    company_name: data.company_name || '',
    '業種': data['業種'] || '',
    'アレルギー': data['アレルギー'] || '',
    '好きなもの': data['好きなもの'] || '',
    '嫌いなもの': data['嫌いなもの'] || '',
    '好きな国': data['好きな国'] || '',
    '好きな言葉': data['好きな言葉'] || '',
    '一言': data['一言'] || ''
  };

  addRow('members', newMember);

  return {
    success: true,
    member_id: memberId,
    message: 'メンバーを追加しました'
  };
}

/**
 * メンバー更新（管理者のみ）
 */
function updateMember(token, dataStr) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const data = parseJSON(dataStr);

  if (!data || !data.member_id) {
    return {success: false, error: 'メンバーIDが必要です'};
  }

  const memberRow = findRow('members', 'member_id', data.member_id);

  if (!memberRow) {
    return {success: false, error: 'メンバーが見つかりません'};
  }

  // login_idを変更する場合、重複チェック
  if (data.login_id && data.login_id !== memberRow.login_id) {
    const existingMember = findRow('members', 'login_id', data.login_id);
    if (existingMember) {
      return {success: false, error: 'このログインIDは既に使用されています'};
    }
  }

  updateRow('members', memberRow.rowIndex, data);

  return {
    success: true,
    message: 'メンバー情報を更新しました'
  };
}

/**
 * メンバー削除（管理者のみ）
 */
function deleteMember(token, memberId) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  if (!memberId) {
    return {success: false, error: 'メンバーIDが必要です'};
  }

  const member = findRow('members', 'member_id', memberId);

  if (!member) {
    return {success: false, error: 'メンバーが見つかりません'};
  }

  deleteRow('members', member.rowIndex);

  return {
    success: true,
    message: 'メンバーを削除しました'
  };
}
