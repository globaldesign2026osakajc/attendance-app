/**
 * auth.js - 認証モジュール
 *
 * ログイン、ログアウト、権限管理
 */

const Auth = {
  /**
   * ログイン
   * @param {string} loginId - ログインID
   * @param {string} password - パスワード
   * @param {boolean} rememberMe - ログイン情報を保存するか
   * @returns {Promise<boolean>} - 成功/失敗
   */
  async login(loginId, password, rememberMe = false) {
    try {
      const result = await API.call('login', {
        login_id: loginId,
        password: password
      });

      if (result.success) {
        // トークンとユーザー情報を保存
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('userRole', result.role);
        localStorage.setItem('memberId', result.member_id);
        localStorage.setItem('userName', result.name);

        // ログイン情報を保存（チェックONの場合）
        if (rememberMe) {
          localStorage.setItem('saved_login_id', loginId);
          localStorage.setItem('saved_password', btoa(password)); // Base64エンコード
          localStorage.setItem('remember_me', 'true');
        } else {
          // 保存しない場合は削除
          localStorage.removeItem('saved_login_id');
          localStorage.removeItem('saved_password');
          localStorage.removeItem('remember_me');
        }

        return true;
      }

      return false;

    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  /**
   * ログアウト
   * @param {boolean} clearCredentials - ログイン情報も削除するか
   */
  async logout(clearCredentials = false) {
    const token = localStorage.getItem('authToken');

    // サーバー側のセッションを削除
    if (token) {
      try {
        await API.call('logout', {});
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // ローカルストレージをクリア
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('memberId');
    localStorage.removeItem('userName');

    // ログイン情報も削除する場合
    if (clearCredentials) {
      localStorage.removeItem('saved_login_id');
      localStorage.removeItem('saved_password');
      localStorage.removeItem('remember_me');
    }

    // ログイン画面にリダイレクト
    // 現在のパスがadmin配下かどうかで判定
    const isAdminPage = window.location.pathname.includes('/admin/');
    window.location.href = isAdminPage ? '../index.html' : 'index.html';
  },

  /**
   * ログイン状態チェック
   * @returns {boolean} - ログイン中かどうか
   */
  isLoggedIn() {
    return !!localStorage.getItem('authToken');
  },

  /**
   * 管理者権限チェック
   * @returns {boolean} - 管理者かどうか
   */
  isAdmin() {
    return localStorage.getItem('userRole') === 'staff';
  },

  /**
   * ユーザー情報取得
   * @returns {object} - ユーザー情報
   */
  getUserInfo() {
    return {
      memberId: localStorage.getItem('memberId'),
      name: localStorage.getItem('userName'),
      role: localStorage.getItem('userRole')
    };
  },

  /**
   * 保存済みログイン情報を読み込み
   * @returns {object|null} - 保存済みログイン情報
   */
  loadSavedCredentials() {
    const rememberMe = localStorage.getItem('remember_me') === 'true';

    if (rememberMe) {
      const loginId = localStorage.getItem('saved_login_id');
      const encodedPassword = localStorage.getItem('saved_password');

      if (loginId && encodedPassword) {
        return {
          loginId: loginId,
          password: atob(encodedPassword), // Base64デコード
          rememberMe: true
        };
      }
    }

    return null;
  },

  /**
   * ログイン必須ページでの認証チェック
   */
  requireLogin() {
    if (!this.isLoggedIn()) {
      const isAdminPage = window.location.pathname.includes('/admin/');
      window.location.href = isAdminPage ? '../index.html' : 'index.html';
    }
  },

  /**
   * 管理者必須ページでの権限チェック
   */
  requireAdmin() {
    if (!this.isLoggedIn()) {
      const isAdminPage = window.location.pathname.includes('/admin/');
      window.location.href = isAdminPage ? '../index.html' : 'index.html';
    } else if (!this.isAdmin()) {
      alert('管理者権限が必要です');
      window.location.href = '../home.html';
    }
  },

  /**
   * 管理者の場合、管理画面リンクを表示
   */
  showAdminLinks() {
    if (!this.isAdmin()) return;

    // ナビゲーション内の管理画面リンク
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
      adminLink.style.display = 'flex';
    }

    // ダッシュボードボタン
    const adminDashboardBtn = document.getElementById('adminDashboardBtn');
    if (adminDashboardBtn) {
      adminDashboardBtn.style.display = 'inline-flex';
    }
  }
};
