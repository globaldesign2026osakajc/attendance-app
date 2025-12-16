// 管理者用イベント詳細ページ
class AdminEventDetail {
  constructor() {
    this.eventId = null;
    this.event = null;
    this.attendances = [];
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    this.eventId = params.get('id');

    if (!this.eventId) {
      showError('イベントIDが指定されていません');
      setTimeout(() => window.location.href = 'events.html', 2000);
      return;
    }

    await this.loadData();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 更新ボタン
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadData());
    }

    // 編集ボタン
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        window.location.href = `event-form.html?id=${this.eventId}`;
      });
    }

    // エクスポートボタン
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportAttendances());
    }

    // 一括操作
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    if (bulkActionBtn) {
      bulkActionBtn.addEventListener('click', () => this.performBulkAction());
    }

    // フィルター
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => this.renderAttendances());
    }

    // 検索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderAttendances());
    }
  }

  async loadData() {
    try {
      showLoading();
      await Promise.all([
        this.loadEvent(),
        this.loadAttendances()
      ]);

      this.renderEvent();
      this.renderAttendances();
      this.renderStats();
    } catch (error) {
      showError('データの読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async loadEvent() {
    const response = await AdminAPI.getEvent(this.eventId);
    this.event = response.data;
  }

  async loadAttendances() {
    const response = await AdminAPI.getAttendances(this.eventId);
    this.attendances = response.data || [];
  }

  renderEvent() {
    if (!this.event) return;

    document.getElementById('eventName').textContent = this.event.title;
    document.getElementById('eventDate').textContent = formatDate(this.event.date);

    // 時刻表示（start_timeとend_timeを使用）
    let timeText = '';
    if (this.event.start_time) {
      timeText = formatTime(this.event.start_time);
      if (this.event.end_time) {
        timeText += ' - ' + formatTime(this.event.end_time);
      }
    }
    document.getElementById('eventTime').textContent = timeText || '未設定';

    document.getElementById('eventLocation').textContent = this.event.location || '未設定';

    if (this.event.description) {
      document.getElementById('eventDescription').textContent = this.event.description;
    }

    if (this.event.fee_amount) {
      document.getElementById('eventFee').textContent = '¥' + this.event.fee_amount.toLocaleString();
    } else {
      document.getElementById('eventFee').textContent = '無料';
    }

    if (this.event.deadline) {
      document.getElementById('eventDeadline').textContent = formatDateTime(this.event.deadline);
    }
  }

  renderStats() {
    if (!this.attendances) return;

    const total = this.attendances.length;
    const attending = this.attendances.filter(a => a.status === 'attend').length;
    const absent = this.attendances.filter(a => a.status === 'absent').length;
    const pending = this.attendances.filter(a => a.status === 'pending').length;
    const noResponse = this.attendances.filter(a => !a.status || a.status === 'none').length;

    document.getElementById('totalMembers').textContent = total;
    document.getElementById('attendingCount').textContent = attending;
    document.getElementById('absentCount').textContent = absent;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('noResponseCount').textContent = noResponse;

    const attendanceRate = total > 0 ? ((attending / total) * 100).toFixed(1) : 0;
    document.getElementById('attendanceRate').textContent = attendanceRate;

    const rateBar = document.querySelector('.rate-bar');
    if (rateBar) {
      rateBar.style.width = attendanceRate + '%';
    }

    // 支払い統計
    if (this.event.fee_amount) {
      const paid = this.attendances.filter(a =>
        a.payment && (a.payment.status === 'paid' || a.payment.status === 'confirmed')
      ).length;
      const unpaid = this.attendances.filter(a =>
        !a.payment || a.payment.status === 'pending'
      ).length;

      document.getElementById('paidCount').textContent = paid;
      document.getElementById('unpaidCount').textContent = unpaid;

      const totalRevenue = paid * this.event.fee_amount;
      document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();
    }
  }

  renderAttendances() {
    const filtered = this.filterAttendances();
    const container = document.getElementById('attendancesList');

    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<p class="no-data">該当するデータがありません</p>';
      return;
    }

    const html = filtered.map(attendance => this.renderAttendanceRow(attendance)).join('');
    container.innerHTML = html;
  }

  filterAttendances() {
    let filtered = this.attendances;

    // ステータスフィルター
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter && statusFilter.value !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter.value);
    }

    // 検索フィルター
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
      const search = searchInput.value.toLowerCase();
      filtered = filtered.filter(a =>
        a.memberName.toLowerCase().includes(search) ||
        (a.studentNumber && a.studentNumber.includes(search))
      );
    }

    // 名前順にソート
    filtered.sort((a, b) => a.memberName.localeCompare(b.memberName));

    return filtered;
  }

  renderAttendanceRow(attendance) {
    const statusLabels = {
      'attend': '出席',
      'absent': '欠席',
      'pending': '未定',
      'none': '未登録'
    };

    const statusClass = attendance.status || 'none';
    const statusText = statusLabels[attendance.status] || '未登録';

    const paymentStatus = attendance.payment?.status || 'pending';
    const paymentLabels = {
      'pending': '未払い',
      'paid': '支払済',
      'confirmed': '確認済'
    };

    return `
      <tr class="attendance-row">
        <td>
          <input type="checkbox" class="attendance-checkbox" value="${attendance.id}">
        </td>
        <td>${escapeHtml(attendance.memberName)}</td>
        <td>${attendance.grade || '-'}</td>
        <td>${attendance.studentNumber || '-'}</td>
        <td>
          <select class="status-select" onchange="adminEventDetail.updateAttendanceStatus('${attendance.id}', this.value)">
            <option value="attend" ${statusClass === 'attend' ? 'selected' : ''}>出席</option>
            <option value="absent" ${statusClass === 'absent' ? 'selected' : ''}>欠席</option>
            <option value="pending" ${statusClass === 'pending' ? 'selected' : ''}>未定</option>
            <option value="none" ${statusClass === 'none' ? 'selected' : ''}>未登録</option>
          </select>
        </td>
        ${this.event.fee_amount ? `
          <td>
            <select class="payment-select" onchange="adminEventDetail.updatePaymentStatus('${attendance.id}', this.value)">
              <option value="pending" ${paymentStatus === 'pending' ? 'selected' : ''}>未払い</option>
              <option value="paid" ${paymentStatus === 'paid' ? 'selected' : ''}>支払済</option>
              <option value="confirmed" ${paymentStatus === 'confirmed' ? 'selected' : ''}>確認済</option>
            </select>
          </td>
        ` : ''}
        <td>${attendance.notes ? escapeHtml(attendance.notes) : '-'}</td>
        <td>
          ${attendance.checkedInAt ? formatTime(attendance.checkedInAt) : '-'}
        </td>
      </tr>
    `;
  }

  async updateAttendanceStatus(attendanceId, status) {
    try {
      await AdminAPI.updateAttendance(attendanceId, status);
      showSuccess('出欠を更新しました');
      await this.loadData();
    } catch (error) {
      showError('出欠の更新に失敗しました: ' + error.message);
      await this.loadData(); // エラー時も再読み込み
    }
  }

  async updatePaymentStatus(attendanceId, status) {
    try {
      const attendance = this.attendances.find(a => a.id === attendanceId);
      if (!attendance || !attendance.payment) return;

      await AdminAPI.updatePayment(attendance.payment.id, status);
      showSuccess('支払い状況を更新しました');
      await this.loadData();
    } catch (error) {
      showError('支払い状況の更新に失敗しました: ' + error.message);
      await this.loadData();
    }
  }

  performBulkAction() {
    const checkboxes = document.querySelectorAll('.attendance-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length === 0) {
      showError('対象を選択してください');
      return;
    }

    const action = document.getElementById('bulkAction')?.value;
    if (!action) {
      showError('操作を選択してください');
      return;
    }

    // 一括操作の実装（必要に応じて）
    console.log('一括操作:', action, selectedIds);
  }

  exportAttendances() {
    const headers = ['名前', '学年', '学籍番号', '出欠', '備考', 'チェックイン時刻'];

    if (this.event.fee_amount) {
      headers.splice(4, 0, '支払い状況');
    }

    const rows = this.attendances.map(a => {
      const row = [
        a.memberName,
        a.grade || '',
        a.studentNumber || '',
        {
          'attend': '出席',
          'absent': '欠席',
          'pending': '未定'
        }[a.status] || '未登録',
        a.notes || '',
        a.checkedInAt ? formatTime(a.checkedInAt) : ''
      ];

      if (this.event.fee_amount) {
        row.splice(4, 0, {
          'pending': '未払い',
          'paid': '支払済',
          'confirmed': '確認済'
        }[a.payment?.status] || '未払い');
      }

      return row;
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${this.event.title}_出欠一覧.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('出欠データをエクスポートしました');
  }
}

// グローバル変数
let adminEventDetail;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  adminEventDetail = new AdminEventDetail();
  await adminEventDetail.init();
});
