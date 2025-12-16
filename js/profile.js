// プロフィールページ
class ProfilePage {
  constructor() {
    this.user = null;
    this.isEditing = false;
  }

  async init() {
    await this.loadProfile();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 編集モード切替
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.toggleEditMode());
    }

    // 保存ボタン
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveProfile());
    }

    // キャンセルボタン
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelEdit());
    }

    // パスワード変更
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => this.showPasswordChangeModal());
    }

    // パスワード変更モーダル
    const submitPasswordBtn = document.getElementById('submitPasswordBtn');
    if (submitPasswordBtn) {
      submitPasswordBtn.addEventListener('click', () => this.changePassword());
    }

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closePasswordModal());
    }

    // LINE連携
    const linkLineBtn = document.getElementById('linkLineBtn');
    if (linkLineBtn) {
      linkLineBtn.addEventListener('click', () => this.linkLine());
    }

    const unlinkLineBtn = document.getElementById('unlinkLineBtn');
    if (unlinkLineBtn) {
      unlinkLineBtn.addEventListener('click', () => this.unlinkLine());
    }

    // 通知設定
    const notificationToggles = document.querySelectorAll('.notification-toggle');
    notificationToggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        this.updateNotificationSetting(e.target.name, e.target.checked);
      });
    });
  }

  async loadProfile() {
    try {
      showLoading();
      const response = await API.getUserInfo();
      this.user = response.data;
      this.renderProfile();
    } catch (error) {
      showError('プロフィールの読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  renderProfile() {
    if (!this.user) return;

    // 基本情報
    document.getElementById('userName').textContent = this.user.name;
    document.getElementById('userEmail').textContent = this.user.email;
    document.getElementById('userRole').textContent = this.getRoleLabel(this.user.role);
    document.getElementById('userGrade').textContent = this.user.grade || '未設定';
    document.getElementById('userStudent').textContent = this.user.studentNumber || '未設定';

    // 編集フォーム
    document.getElementById('editName').value = this.user.name;
    document.getElementById('editEmail').value = this.user.email;
    document.getElementById('editGrade').value = this.user.grade || '';
    document.getElementById('editStudentNumber').value = this.user.studentNumber || '';
    document.getElementById('editPhone').value = this.user.phone || '';

    // LINE連携状態
    const lineStatus = document.getElementById('lineStatus');
    const linkLineBtn = document.getElementById('linkLineBtn');
    const unlinkLineBtn = document.getElementById('unlinkLineBtn');

    if (this.user.lineLinked) {
      lineStatus.innerHTML = '<span class="status-badge status-confirmed">連携済み</span>';
      if (linkLineBtn) linkLineBtn.style.display = 'none';
      if (unlinkLineBtn) unlinkLineBtn.style.display = 'inline-block';
    } else {
      lineStatus.innerHTML = '<span class="status-badge status-pending">未連携</span>';
      if (linkLineBtn) linkLineBtn.style.display = 'inline-block';
      if (unlinkLineBtn) unlinkLineBtn.style.display = 'none';
    }

    // 通知設定
    if (this.user.notifications) {
      document.getElementById('notifyEvent').checked = this.user.notifications.event !== false;
      document.getElementById('notifyReminder').checked = this.user.notifications.reminder !== false;
      document.getElementById('notifyPayment').checked = this.user.notifications.payment !== false;
    }

    // 統計情報
    this.renderStats();
  }

  renderStats() {
    if (!this.user.stats) return;

    document.getElementById('totalEvents').textContent = this.user.stats.totalEvents || 0;
    document.getElementById('attendedEvents').textContent = this.user.stats.attendedEvents || 0;

    const attendanceRate = this.user.stats.totalEvents > 0
      ? ((this.user.stats.attendedEvents / this.user.stats.totalEvents) * 100).toFixed(1)
      : 0;

    document.getElementById('attendanceRate').textContent = attendanceRate;

    const rateBar = document.querySelector('.rate-bar');
    if (rateBar) {
      rateBar.style.width = attendanceRate + '%';
    }

    document.getElementById('totalPaid').textContent =
      '¥' + (this.user.stats.totalPaid || 0).toLocaleString();
  }

  getRoleLabel(role) {
    const labels = {
      'super_admin': 'スーパー管理者',
      'admin': '管理者',
      'member': 'メンバー'
    };
    return labels[role] || role;
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;

    const viewMode = document.getElementById('viewMode');
    const editMode = document.getElementById('editMode');

    if (this.isEditing) {
      viewMode.style.display = 'none';
      editMode.style.display = 'block';
    } else {
      viewMode.style.display = 'block';
      editMode.style.display = 'none';
    }
  }

  async saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const grade = document.getElementById('editGrade').value.trim();
    const studentNumber = document.getElementById('editStudentNumber').value.trim();
    const phone = document.getElementById('editPhone').value.trim();

    if (!name || !email) {
      showError('名前とメールアドレスは必須です');
      return;
    }

    try {
      showLoading();
      await API.updateProfile({
        name,
        email,
        grade,
        studentNumber,
        phone
      });

      showSuccess('プロフィールを更新しました');
      await this.loadProfile();
      this.toggleEditMode();
    } catch (error) {
      showError('プロフィールの更新に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  cancelEdit() {
    this.toggleEditMode();
    this.renderProfile(); // 元の値に戻す
  }

  showPasswordChangeModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
      modal.style.display = 'flex';
      // フィールドをクリア
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    }
  }

  closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('すべての項目を入力してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('新しいパスワードが一致しません');
      return;
    }

    if (newPassword.length < 8) {
      showError('パスワードは8文字以上にしてください');
      return;
    }

    try {
      showLoading();
      await API.changePassword(currentPassword, newPassword);
      showSuccess('パスワードを変更しました');
      this.closePasswordModal();
    } catch (error) {
      showError('パスワードの変更に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async linkLine() {
    try {
      showLoading();
      const response = await API.getLINELinkURL();

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('LINE連携URLの取得に失敗しました');
      }
    } catch (error) {
      showError('LINE連携の開始に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async unlinkLine() {
    if (!confirm('LINE連携を解除しますか？')) return;

    try {
      showLoading();
      await API.unlinkLINE();
      showSuccess('LINE連携を解除しました');
      await this.loadProfile();
    } catch (error) {
      showError('LINE連携の解除に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async updateNotificationSetting(key, value) {
    try {
      const settings = {
        [key]: value
      };

      await API.updateNotificationSettings(settings);
      showSuccess('通知設定を更新しました');
    } catch (error) {
      showError('通知設定の更新に失敗しました: ' + error.message);
      // エラー時は元に戻す
      await this.loadProfile();
    }
  }
}

// グローバル変数
let profilePage;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  profilePage = new ProfilePage();
  await profilePage.init();
});
