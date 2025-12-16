// イベント詳細ページ
class EventDetail {
  constructor() {
    this.eventId = null;
    this.event = null;
    this.attendance = null;
  }

  async init() {
    // URLからイベントIDを取得
    const params = new URLSearchParams(window.location.search);
    this.eventId = params.get('id');

    if (!this.eventId) {
      showError('イベントIDが指定されていません');
      setTimeout(() => window.location.href = 'events.html', 2000);
      return;
    }

    await this.loadEvent();
    this.setupEventListeners();
  }

  async loadEvent() {
    try {
      showLoading();
      const response = await API.getEvent(this.eventId);
      this.event = response.data.event;
      this.attendance = response.data.attendance;

      this.renderEvent();
    } catch (error) {
      showError('イベント情報の読み込みに失敗しました: ' + error.message);
      setTimeout(() => window.location.href = 'events.html', 2000);
    } finally {
      hideLoading();
    }
  }

  setupEventListeners() {
    // 出欠登録ボタン
    const attendBtn = document.getElementById('attendBtn');
    if (attendBtn) {
      attendBtn.addEventListener('click', () => this.submitAttendance('attend'));
    }

    const absentBtn = document.getElementById('absentBtn');
    if (absentBtn) {
      absentBtn.addEventListener('click', () => this.submitAttendance('absent'));
    }

    const pendingBtn = document.getElementById('pendingBtn');
    if (pendingBtn) {
      pendingBtn.addEventListener('click', () => this.submitAttendance('pending'));
    }

    // 支払い登録ボタン
    const paymentBtn = document.getElementById('submitPaymentBtn');
    if (paymentBtn) {
      paymentBtn.addEventListener('click', () => this.submitPayment());
    }

    // QRチェックインボタン
    const qrBtn = document.getElementById('qrCheckinBtn');
    if (qrBtn) {
      qrBtn.addEventListener('click', () => this.openQRCheckin());
    }
  }

  renderEvent() {
    if (!this.event) return;

    // イベント名
    document.getElementById('eventName').textContent = this.event.title;

    // イベント情報
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

    // 参加費
    if (this.event.fee_amount) {
      document.getElementById('eventFee').textContent = '¥' + this.event.fee_amount.toLocaleString();
    } else {
      document.getElementById('eventFee').textContent = '無料';
    }

    // 締切
    if (this.event.deadline) {
      const deadline = new Date(this.event.deadline);
      const now = new Date();
      const isPastDeadline = deadline < now;

      document.getElementById('eventDeadline').textContent = formatDateTime(this.event.deadline);

      if (isPastDeadline) {
        document.getElementById('eventDeadline').classList.add('text-danger');
        const deadlineNote = document.getElementById('deadlineNote');
        if (deadlineNote) {
          deadlineNote.textContent = '※締切を過ぎています';
          deadlineNote.classList.add('text-danger');
        }
      }
    }

    // 出欠状況
    this.renderAttendanceStatus();

    // 支払い状況
    this.renderPaymentStatus();

    // 統計情報
    this.renderStats();
  }

  renderAttendanceStatus() {
    const statusEl = document.getElementById('attendanceStatus');
    const notesEl = document.getElementById('attendanceNotes');

    if (!this.attendance) {
      statusEl.innerHTML = '<span class="status-badge status-none">未登録</span>';
      return;
    }

    const statusLabels = {
      'attend': '出席',
      'absent': '欠席',
      'pending': '未定'
    };

    const statusClass = this.attendance.status || 'none';
    const statusText = statusLabels[this.attendance.status] || '未登録';

    statusEl.innerHTML = `<span class="status-badge status-${statusClass}">${statusText}</span>`;

    if (this.attendance.notes) {
      notesEl.textContent = this.attendance.notes;
    }

    // ボタンの状態を更新
    this.updateAttendanceButtons();
  }

  updateAttendanceButtons() {
    const currentStatus = this.attendance?.status;

    ['attend', 'absent', 'pending'].forEach(status => {
      const btn = document.getElementById(`${status}Btn`);
      if (btn) {
        if (status === currentStatus) {
          btn.classList.add('active');
          btn.disabled = true;
        } else {
          btn.classList.remove('active');
          btn.disabled = false;
        }
      }
    });

    // 締切チェック
    if (this.event.deadline) {
      const deadline = new Date(this.event.deadline);
      const now = new Date();
      if (deadline < now) {
        ['attendBtn', 'absentBtn', 'pendingBtn'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.disabled = true;
        });
      }
    }
  }

  renderPaymentStatus() {
    const container = document.getElementById('paymentSection');
    if (!container) return;

    // 参加費がない場合は非表示
    if (!this.event.fee_amount) {
      container.style.display = 'none';
      return;
    }

    const statusEl = document.getElementById('paymentStatus');
    const amountEl = document.getElementById('paymentAmount');
    const dateEl = document.getElementById('paymentDate');

    if (!this.attendance || !this.attendance.payment) {
      statusEl.innerHTML = '<span class="status-badge status-pending">未払い</span>';
      amountEl.textContent = '¥' + this.event.fee_amount.toLocaleString();
      return;
    }

    const payment = this.attendance.payment;
    const statusLabels = {
      'pending': '未払い',
      'paid': '支払済',
      'confirmed': '確認済'
    };

    statusEl.innerHTML = `<span class="status-badge status-${payment.status}">${statusLabels[payment.status]}</span>`;
    amountEl.textContent = '¥' + payment.amount.toLocaleString();

    if (payment.paidAt) {
      dateEl.textContent = formatDateTime(payment.paidAt);
    }

    // 支払い登録フォームの表示制御
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
      if (payment.status === 'pending') {
        paymentForm.style.display = 'block';
      } else {
        paymentForm.style.display = 'none';
      }
    }
  }

  renderStats() {
    if (!this.event.stats) return;

    document.getElementById('totalAttendees').textContent = this.event.stats.attendCount || 0;
    document.getElementById('totalMembers').textContent = this.event.stats.totalMembers || 0;

    const attendanceRate = this.event.stats.totalMembers > 0
      ? ((this.event.stats.attendCount / this.event.stats.totalMembers) * 100).toFixed(1)
      : 0;

    document.getElementById('attendanceRate').textContent = attendanceRate;
  }

  async submitAttendance(status) {
    const notes = document.getElementById('attendanceNotesInput')?.value || '';

    try {
      showLoading();
      await API.submitAttendance(this.eventId, status, notes);
      showSuccess('出欠を登録しました');
      await this.loadEvent();
    } catch (error) {
      showError('出欠の登録に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async submitPayment() {
    const method = document.getElementById('paymentMethod')?.value;
    const notes = document.getElementById('paymentNotes')?.value || '';

    if (!method) {
      showError('支払い方法を選択してください');
      return;
    }

    try {
      showLoading();
      await API.submitPayment(this.eventId, this.event.fee_amount, method, notes);
      showSuccess('支払い情報を登録しました');
      await this.loadEvent();
    } catch (error) {
      showError('支払いの登録に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  openQRCheckin() {
    window.location.href = `qr.html?eventId=${this.eventId}`;
  }
}

// グローバル変数
let eventDetail;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  eventDetail = new EventDetail();
  await eventDetail.init();
});
