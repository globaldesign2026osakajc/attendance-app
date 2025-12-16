// メンバー管理ページ
class MembersManagement {
  constructor() {
    this.members = [];
    this.masters = null;
    this.filters = {
      role: 'all',
      affiliation: 'all',
      search: ''
    };
    this.editingMember = null;
  }

  async init() {
    await this.loadMasters();
    await this.loadMembers();
    this.setupEventListeners();
    this.populateFilters();
  }

  async loadMasters() {
    try {
      const response = await AdminAPI.request('getMasters');
      this.masters = response.data;
    } catch (error) {
      console.error('マスタデータの読み込みエラー:', error);
    }
  }

  async loadMembers() {
    try {
      showLoading();
      const response = await AdminAPI.getMembers();
      this.members = response.data || [];
      this.renderMembers();
      this.updateStats();
    } catch (error) {
      showError('メンバーの読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  setupEventListeners() {
    // 検索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.renderMembers();
      });
    }

    // フィルター
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.filters.role = e.target.value;
        this.renderMembers();
      });
    }

    const affiliationFilter = document.getElementById('affiliationFilter');
    if (affiliationFilter) {
      affiliationFilter.addEventListener('change', (e) => {
        this.filters.affiliation = e.target.value;
        this.renderMembers();
      });
    }

    // 新規追加ボタン
    const addBtn = document.getElementById('addMemberBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showMemberModal());
    }

    // モーダル関連
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeMemberModal());
    }

    const saveMemberBtn = document.getElementById('saveMemberBtn');
    if (saveMemberBtn) {
      saveMemberBtn.addEventListener('click', () => this.saveMember());
    }

    // 写真アップロード
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
    }
  }

  populateFilters() {
    // 所属フィルター
    const affiliationFilter = document.getElementById('affiliationFilter');
    if (affiliationFilter && this.masters && this.masters.affiliations) {
      const options = this.masters.affiliations.map(aff =>
        `<option value="${aff}">${escapeHtml(aff)}</option>`
      ).join('');
      affiliationFilter.innerHTML = `
        <option value="all">すべての所属</option>
        ${options}
      `;
    }
  }

  renderMembers() {
    const filtered = this.filterMembers();
    const container = document.getElementById('membersList');

    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<p class="no-data">メンバーがいません</p>';
      return;
    }

    const html = filtered.map(member => this.renderMemberRow(member)).join('');
    container.innerHTML = html;
  }

  filterMembers() {
    let filtered = this.members;

    // 権限フィルター
    if (this.filters.role !== 'all') {
      filtered = filtered.filter(m => m.role === this.filters.role);
    }

    // 所属フィルター
    if (this.filters.affiliation !== 'all') {
      filtered = filtered.filter(m => m.affiliation === this.filters.affiliation);
    }

    // 検索フィルター
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(search) ||
        (m.kana && m.kana.toLowerCase().includes(search)) ||
        (m.login_id && m.login_id.toLowerCase().includes(search)) ||
        (m.student_number && m.student_number.includes(search))
      );
    }

    // 名前順にソート
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }

  renderMemberRow(member) {
    const roleLabels = {
      'super_admin': 'スーパー管理者',
      'admin': '管理者',
      'member': 'メンバー'
    };

    return `
      <tr class="member-row">
        <td>
          ${member.photo_url
            ? `<img src="${member.photo_url}" alt="${escapeHtml(member.name)}" class="member-photo-thumb">`
            : '<div class="member-photo-placeholder">👤</div>'}
        </td>
        <td>${escapeHtml(member.name)}</td>
        <td>${member.kana ? escapeHtml(member.kana) : '-'}</td>
        <td>${member.login_id ? escapeHtml(member.login_id) : '-'}</td>
        <td>${member.affiliation ? escapeHtml(member.affiliation) : '-'}</td>
        <td>${member.position ? escapeHtml(member.position) : '-'}</td>
        <td>
          <span class="role-badge role-${member.role}">
            ${roleLabels[member.role] || member.role}
          </span>
        </td>
        <td>${member.birthday ? formatDate(member.birthday) : '-'}</td>
        <td class="actions">
          <button class="btn-secondary btn-sm" onclick="membersManagement.editMember('${member.id}')">
            編集
          </button>
          <button class="btn-danger btn-sm" onclick="membersManagement.deleteMember('${member.id}')">
            削除
          </button>
        </td>
      </tr>
    `;
  }

  updateStats() {
    const total = this.members.length;
    const admins = this.members.filter(m => m.role === 'staff').length;
    const regularMembers = this.members.filter(m => m.role === 'member').length;

    document.getElementById('totalMembers').textContent = total;
    document.getElementById('adminCount').textContent = admins;
    document.getElementById('memberCount').textContent = regularMembers;
  }

  showMemberModal(member = null) {
    this.editingMember = member;
    const modal = document.getElementById('memberModal');
    const title = document.getElementById('modalTitle');

    if (member) {
      title.textContent = 'メンバー編集';
      this.fillMemberForm(member);
    } else {
      title.textContent = '新規メンバー追加';
      this.clearMemberForm();
    }

    // プルダウンを設定
    this.populateMemberFormSelects();

    modal.style.display = 'flex';
  }

  closeMemberModal() {
    const modal = document.getElementById('memberModal');
    modal.style.display = 'none';
    this.editingMember = null;
  }

  populateMemberFormSelects() {
    if (!this.masters) return;

    // 所属
    const affiliationSelect = document.getElementById('memberAffiliation');
    if (affiliationSelect && this.masters.affiliations) {
      affiliationSelect.innerHTML = `
        <option value="">選択してください</option>
        ${this.masters.affiliations.map(aff =>
          `<option value="${aff}">${escapeHtml(aff)}</option>`
        ).join('')}
      `;
    }

    // 役職
    const positionSelect = document.getElementById('memberPosition');
    if (positionSelect && this.masters.positions) {
      positionSelect.innerHTML = `
        <option value="">選択してください</option>
        ${this.masters.positions.map(pos =>
          `<option value="${pos}">${escapeHtml(pos)}</option>`
        ).join('')}
      `;
    }

    // 委員会
    const committeeSelect = document.getElementById('memberCommittee');
    if (committeeSelect && this.masters.committees) {
      committeeSelect.innerHTML = `
        <option value="">選択してください</option>
        ${this.masters.committees.map(com =>
          `<option value="${com}">${escapeHtml(com)}</option>`
        ).join('')}
      `;
    }
  }

  fillMemberForm(member) {
    document.getElementById('memberName').value = member.name || '';
    document.getElementById('memberKana').value = member.kana || '';
    document.getElementById('memberLoginId').value = member.login_id || '';
    document.getElementById('memberPassword').value = ''; // パスワードは空欄
    document.getElementById('memberAffiliation').value = member.affiliation || '';
    document.getElementById('memberPosition').value = member.position || '';
    document.getElementById('memberCommittee').value = member.committee || '';
    document.getElementById('memberCompany').value = member.company_name || '';
    document.getElementById('memberBirthday').value = member.birthday || '';
    document.getElementById('memberRole').value = member.role || 'member';

    // 写真プレビュー
    if (member.photo_url) {
      const preview = document.getElementById('photoPreview');
      if (preview) {
        preview.src = member.photo_url;
        preview.style.display = 'block';
      }
    }
  }

  clearMemberForm() {
    document.getElementById('memberName').value = '';
    document.getElementById('memberKana').value = '';
    document.getElementById('memberLoginId').value = '';
    document.getElementById('memberPassword').value = '';
    document.getElementById('memberAffiliation').value = '';
    document.getElementById('memberPosition').value = '';
    document.getElementById('memberCommittee').value = '';
    document.getElementById('memberCompany').value = '';
    document.getElementById('memberBirthday').value = '';
    document.getElementById('memberRole').value = 'member';

    const preview = document.getElementById('photoPreview');
    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
  }

  async handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      showError('ファイルサイズは5MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      showError('JPEGまたはPNG形式の画像を選択してください');
      return;
    }

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('photoPreview');
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }

  async saveMember() {
    // バリデーション
    const name = document.getElementById('memberName').value.trim();
    const loginId = document.getElementById('memberLoginId').value.trim();
    const password = document.getElementById('memberPassword').value;

    if (!name) {
      showError('名前を入力してください');
      return;
    }

    if (!loginId) {
      showError('ログインIDを入力してください');
      return;
    }

    // 新規追加時はパスワード必須
    if (!this.editingMember && !password) {
      showError('パスワードを入力してください');
      return;
    }

    const memberData = {
      name,
      kana: document.getElementById('memberKana').value.trim(),
      login_id: loginId,
      affiliation: document.getElementById('memberAffiliation').value,
      position: document.getElementById('memberPosition').value,
      committee: document.getElementById('memberCommittee').value,
      company_name: document.getElementById('memberCompany').value.trim(),
      birthday: document.getElementById('memberBirthday').value,
      role: document.getElementById('memberRole').value
    };

    // パスワードが入力されている場合のみ追加
    if (password) {
      memberData.password = password;
    }

    try {
      showLoading();

      // 写真アップロード
      const photoInput = document.getElementById('photoInput');
      if (photoInput.files && photoInput.files[0]) {
        const photoUrl = await this.uploadPhoto(photoInput.files[0]);
        if (photoUrl) {
          memberData.photo_url = photoUrl;
        }
      }

      if (this.editingMember) {
        memberData.id = this.editingMember.id;
        await AdminAPI.updateMember(this.editingMember.id, memberData);
        showSuccess('メンバーを更新しました');
      } else {
        await AdminAPI.request('addMember', {
          method: 'POST',
          body: JSON.stringify(memberData)
        });
        showSuccess('メンバーを追加しました');
      }

      this.closeMemberModal();
      await this.loadMembers();
    } catch (error) {
      showError('メンバーの保存に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async uploadPhoto(file) {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result.split(',')[1];
            const response = await AdminAPI.request('uploadProfilePhoto', {
              method: 'POST',
              body: JSON.stringify({
                fileData: base64Data,
                fileName: file.name,
                mimeType: file.type
              })
            });

            if (response.success) {
              resolve(response.data.photoURL);
            } else {
              reject(new Error('写真のアップロードに失敗しました'));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('写真アップロードエラー:', error);
      return null;
    }
  }

  editMember(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (member) {
      this.showMemberModal(member);
    }
  }

  async deleteMember(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) return;

    if (!confirm(`${member.name} を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      showLoading();
      await AdminAPI.request('deleteMember', {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });
      showSuccess('メンバーを削除しました');
      await this.loadMembers();
    } catch (error) {
      showError('メンバーの削除に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async exportMembers() {
    const headers = ['名前', 'ふりがな', 'ログインID', '所属', '役職', '委員会', '会社名', '誕生日', '権限'];
    const rows = this.members.map(m => [
      m.name,
      m.kana || '',
      m.login_id || '',
      m.affiliation || '',
      m.position || '',
      m.committee || '',
      m.company_name || '',
      m.birthday || '',
      { 'super_admin': 'スーパー管理者', 'admin': '管理者', 'member': 'メンバー' }[m.role] || m.role
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `メンバー一覧_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('メンバー一覧をエクスポートしました');
  }
}

// グローバル変数
let membersManagement;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  membersManagement = new MembersManagement();
  await membersManagement.init();

  // エクスポートボタン
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => membersManagement.exportMembers());
  }
});
