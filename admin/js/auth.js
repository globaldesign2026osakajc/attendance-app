// 管理者認証チェック
class AdminAuth {
  static async checkAdminAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '../index.html';
      return false;
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getUserInfo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('認証に失敗しました');
      }

      // 管理者権限チェック
      if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
        alert('このページにアクセスする権限がありません');
        window.location.href = '../home.html';
        return false;
      }

      // ユーザー情報を保存
      this.currentUser = data.user;
      this.updateUserDisplay();

      return true;
    } catch (error) {
      console.error('認証エラー:', error);
      localStorage.removeItem('token');
      window.location.href = '../index.html';
      return false;
    }
  }

  static updateUserDisplay() {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');

    if (userNameEl && this.currentUser) {
      userNameEl.textContent = this.currentUser.name;
    }

    if (userRoleEl && this.currentUser) {
      const roleNames = {
        'super_admin': 'スーパー管理者',
        'admin': '管理者'
      };
      userRoleEl.textContent = roleNames[this.currentUser.role] || this.currentUser.role;
    }
  }

  static logout() {
    if (confirm('ログアウトしますか？')) {
      localStorage.removeItem('token');
      window.location.href = '../index.html';
    }
  }

  static getCurrentUser() {
    return this.currentUser;
  }

  static isSuperAdmin() {
    return this.currentUser && this.currentUser.role === 'super_admin';
  }
}

// ページロード時に認証チェック
document.addEventListener('DOMContentLoaded', async () => {
  await AdminAuth.checkAdminAuth();

  // ログアウトボタンのイベント設定
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => AdminAuth.logout());
  }
});
