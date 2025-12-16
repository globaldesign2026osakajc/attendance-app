// QRチェックイン管理ページ
class CheckinManagement {
  constructor() {
    this.currentEventId = null;
    this.event = null;
    this.checkins = [];
    this.scanner = null;
    this.isScanning = false;
  }

  async init() {
    this.setupEventListeners();
    await this.loadEvents();
  }

  setupEventListeners() {
    // イベント選択
    const eventSelect = document.getElementById('eventSelect');
    if (eventSelect) {
      eventSelect.addEventListener('change', (e) => {
        this.selectEvent(e.target.value);
      });
    }

    // スキャン開始/停止
    const startScanBtn = document.getElementById('startScanBtn');
    if (startScanBtn) {
      startScanBtn.addEventListener('click', () => this.startScanning());
    }

    const stopScanBtn = document.getElementById('stopScanBtn');
    if (stopScanBtn) {
      stopScanBtn.addEventListener('click', () => this.stopScanning());
    }

    // 手動入力
    const manualForm = document.getElementById('manualCheckinForm');
    if (manualForm) {
      manualForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.manualCheckin();
      });
    }

    // 更新
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadCheckins());
    }
  }

  async loadEvents() {
    try {
      const response = await AdminAPI.getEvents();
      const events = response.data || [];

      // 今日以降のイベントのみ
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= today;
      });

      this.renderEventSelect(upcomingEvents);
    } catch (error) {
      showError('イベントの読み込みに失敗しました: ' + error.message);
    }
  }

  renderEventSelect(events) {
    const select = document.getElementById('eventSelect');
    if (!select) return;

    if (events.length === 0) {
      select.innerHTML = '<option value="">イベントがありません</option>';
      return;
    }

    const options = events.map(e =>
      `<option value="${e.id}">${formatDate(e.date)} - ${escapeHtml(e.name)}</option>`
    ).join('');

    select.innerHTML = `
      <option value="">イベントを選択してください</option>
      ${options}
    `;
  }

  async selectEvent(eventId) {
    if (!eventId) {
      this.currentEventId = null;
      this.event = null;
      this.hideCheckinUI();
      return;
    }

    this.currentEventId = eventId;

    try {
      showLoading();
      const response = await AdminAPI.getEvent(eventId);
      this.event = response.data;
      this.showCheckinUI();
      await this.loadCheckins();
    } catch (error) {
      showError('イベント情報の読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  showCheckinUI() {
    const ui = document.getElementById('checkinUI');
    if (ui) {
      ui.style.display = 'block';
    }

    // イベント情報表示
    if (this.event) {
      document.getElementById('selectedEventName').textContent = this.event.title;

      // 日付と時刻を表示
      let dateTimeText = formatDate(this.event.date);
      if (this.event.start_time) {
        dateTimeText += ' ' + formatTime(this.event.start_time);
        if (this.event.end_time) {
          dateTimeText += ' - ' + formatTime(this.event.end_time);
        }
      }
      document.getElementById('selectedEventDate').textContent = dateTimeText;

      document.getElementById('selectedEventLocation').textContent = this.event.location || '未設定';
    }
  }

  hideCheckinUI() {
    const ui = document.getElementById('checkinUI');
    if (ui) {
      ui.style.display = 'none';
    }
  }

  async loadCheckins() {
    if (!this.currentEventId) return;

    try {
      const response = await AdminAPI.request(`getCheckinList&eventId=${this.currentEventId}`);
      this.checkins = response.data || [];
      this.renderCheckins();
      this.updateStats();
    } catch (error) {
      showError('チェックイン情報の読み込みに失敗しました: ' + error.message);
    }
  }

  renderCheckins() {
    const container = document.getElementById('checkinsList');
    if (!container) return;

    if (this.checkins.length === 0) {
      container.innerHTML = '<p class="no-data">チェックイン履歴がありません</p>';
      return;
    }

    // 新しい順にソート
    const sorted = [...this.checkins].sort((a, b) =>
      new Date(b.checkedInAt) - new Date(a.checkedInAt)
    );

    const html = sorted.map(checkin => `
      <div class="checkin-item">
        <div class="checkin-time">${formatTime(checkin.checkedInAt)}</div>
        <div class="checkin-member">
          <div class="member-name">${escapeHtml(checkin.memberName)}</div>
          <div class="member-id">${checkin.memberId}</div>
        </div>
        ${checkin.paymentConfirmed ? `
          <div class="payment-status">
            <span class="status-badge status-confirmed">支払済</span>
          </div>
        ` : ''}
      </div>
    `).join('');

    container.innerHTML = html;
  }

  updateStats() {
    const total = this.event?.expectedAttendees || 0;
    const checkedIn = this.checkins.length;
    const rate = total > 0 ? ((checkedIn / total) * 100).toFixed(1) : 0;

    document.getElementById('expectedCount').textContent = total;
    document.getElementById('checkedInCount').textContent = checkedIn;
    document.getElementById('checkinRate').textContent = rate;

    const rateBar = document.querySelector('.checkin-rate-bar');
    if (rateBar) {
      rateBar.style.width = rate + '%';
    }
  }

  async startScanning() {
    if (this.isScanning) return;

    try {
      const videoElement = document.getElementById('qrVideo');
      if (!videoElement) {
        showError('ビデオ要素が見つかりません');
        return;
      }

      // html5-qrcode ライブラリを使用
      this.scanner = new Html5Qrcode("qrVideo");

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      };

      await this.scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          this.onScanSuccess(decodedText);
        },
        (error) => {
          // スキャンエラーは無視
        }
      );

      this.isScanning = true;
      this.updateScanningUI(true);
    } catch (error) {
      console.error('スキャン開始エラー:', error);
      showError('カメラの起動に失敗しました: ' + error.message);
    }
  }

  async stopScanning() {
    if (!this.isScanning || !this.scanner) return;

    try {
      await this.scanner.stop();
      this.isScanning = false;
      this.updateScanningUI(false);
    } catch (error) {
      console.error('スキャン停止エラー:', error);
    }
  }

  updateScanningUI(isScanning) {
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const status = document.getElementById('scanStatus');

    if (startBtn) startBtn.style.display = isScanning ? 'none' : 'block';
    if (stopBtn) stopBtn.style.display = isScanning ? 'block' : 'none';

    if (status) {
      status.textContent = isScanning ? 'QRコードをスキャンしてください' : 'スキャンを開始してください';
      status.className = isScanning ? 'scan-status scanning' : 'scan-status';
    }
  }

  async onScanSuccess(memberId) {
    // 一時的にスキャンを停止
    await this.stopScanning();

    await this.processCheckin(memberId);

    // 2秒後にスキャン再開
    setTimeout(() => this.startScanning(), 2000);
  }

  async processCheckin(memberId) {
    if (!this.currentEventId) {
      showError('イベントが選択されていません');
      return;
    }

    try {
      showLoading();

      const response = await AdminAPI.request('checkin', {
        method: 'POST',
        body: JSON.stringify({
          eventId: this.currentEventId,
          memberId: memberId
        })
      });

      if (response.success) {
        this.showCheckinSuccess(response.data);

        // 現地払いの場合、支払い確認モーダルを表示
        if (response.data.requiresPayment) {
          this.showPaymentConfirmModal(response.data);
        }

        await this.loadCheckins();
      } else {
        throw new Error(response.error || 'チェックインに失敗しました');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      hideLoading();
    }
  }

  showCheckinSuccess(data) {
    const result = document.getElementById('checkinResult');
    if (!result) return;

    result.innerHTML = `
      <div class="checkin-success">
        <div class="success-icon">✓</div>
        <h3>${escapeHtml(data.memberName)}</h3>
        <p>チェックインしました</p>
        <p class="checkin-time">${formatTime(new Date())}</p>
      </div>
    `;

    result.style.display = 'block';

    // 3秒後に非表示
    setTimeout(() => {
      result.style.display = 'none';
    }, 3000);
  }

  showPaymentConfirmModal(data) {
    const modal = document.getElementById('paymentConfirmModal');
    if (!modal) return;

    document.getElementById('paymentMemberName').textContent = data.memberName;
    document.getElementById('paymentAmount').textContent = data.amount.toLocaleString();

    modal.style.display = 'flex';

    // 確認ボタン
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const skipBtn = document.getElementById('skipPaymentBtn');

    confirmBtn.onclick = async () => {
      await this.confirmPayment(data.memberId);
      modal.style.display = 'none';
    };

    skipBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }

  async confirmPayment(memberId) {
    try {
      showLoading();

      await AdminAPI.request('checkinWithPayment', {
        method: 'POST',
        body: JSON.stringify({
          eventId: this.currentEventId,
          memberId: memberId
        })
      });

      showSuccess('支払いを確認しました');
      await this.loadCheckins();
    } catch (error) {
      showError('支払い確認に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async manualCheckin() {
    const memberIdInput = document.getElementById('manualMemberId');
    if (!memberIdInput) return;

    const memberId = memberIdInput.value.trim();
    if (!memberId) {
      showError('メンバーIDを入力してください');
      return;
    }

    await this.processCheckin(memberId);

    // 入力欄をクリア
    memberIdInput.value = '';
  }
}

// グローバル変数
let checkinManagement;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  checkinManagement = new CheckinManagement();
  await checkinManagement.init();
});

// ページを離れる時にスキャン停止
window.addEventListener('beforeunload', () => {
  if (checkinManagement && checkinManagement.isScanning) {
    checkinManagement.stopScanning();
  }
});
