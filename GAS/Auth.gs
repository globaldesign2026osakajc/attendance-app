/**
 * Auth.gs - 認証処理
 *
 * ログイン、ログアウト、トークン検証
 */

/**
 * ログイン処理
 */
function login(params) {
  const loginId = params.login_id;
  const password = params.password;

  if (!loginId || !password) {
    return {
      success: false,
      error: 'ログインIDとパスワードを入力してください'
    };
  }

  // メンバー情報を取得
  const member = findRow('members', 'login_id', loginId);

  if (!member) {
    return {
      success: false,
      error: 'ログインIDまたはパスワードが正しくありません'
    };
  }

  // パスワード照合（平文）
  if (member.password !== password) {
    return {
      success: false,
      error: 'ログインIDまたはパスワードが正しくありません'
    };
  }

  // トークン生成
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRE_HOURS * 60 * 60 * 1000);

  // セッションを保存
  addRow('sessions', {
    token: token,
    member_id: member.member_id,
    role: member.role,
    created_at: now,
    expires_at: expiresAt
  });

  return {
    success: true,
    token: token,
    member_id: member.member_id,
    name: member.name,
    role: member.role
  };
}

/**
 * ログアウト処理
 */
function logout(token) {
  if (!token) {
    return {success: false, error: 'トークンが無効です'};
  }

  const session = findRow('sessions', 'token', token);

  if (session) {
    deleteRow('sessions', session.rowIndex);
  }

  return {success: true};
}

/**
 * トークン検証
 */
function isValidToken(token) {
  if (!token) {
    return false;
  }

  const session = findRow('sessions', 'token', token);

  if (!session) {
    return false;
  }

  // 有効期限チェック
  const now = new Date();
  const expiresAt = new Date(session.expires_at);

  if (now > expiresAt) {
    // 期限切れのセッションを削除
    deleteRow('sessions', session.rowIndex);
    return false;
  }

  return true;
}

/**
 * トークンからメンバー情報を取得
 */
function getMemberFromToken(token) {
  if (!token) {
    return null;
  }

  const session = findRow('sessions', 'token', token);

  if (!session) {
    return null;
  }

  // 有効期限チェック
  const now = new Date();
  const expiresAt = new Date(session.expires_at);

  if (now > expiresAt) {
    deleteRow('sessions', session.rowIndex);
    return null;
  }

  return {
    member_id: session.member_id,
    role: session.role
  };
}

/**
 * 管理者権限チェック
 */
function isAdmin(token) {
  const member = getMemberFromToken(token);
  return member && member.role === 'staff';
}
