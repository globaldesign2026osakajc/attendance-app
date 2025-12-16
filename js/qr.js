// QRコードチェックインページ
class QRCheckin {
  constructor() {
    this.eventId = null;
    this.event = null;
    this.scanner = null;
    this.isScanning = false;
  }

  async init() {
    // URLからイベントIDを取得
    const params = new URLSearchParams(window.location.search);
    this.eventId = params.get('eventId');

    if (this.eventId) {
      await this.loadEvent();
    }

    this.setupEventListeners();
    this.initScanner();
  }

  async loadEvent() {
    try {
      const response = await API.getEvent(this.eventId);
      this.event = response.data.event;
      this.renderEventInfo();
    } catch (error) {
      console.error('イベント情報の読み込みに失敗:', error);
    }
  }

  renderEventInfo() {
    if (!this.event) return;

    const eventInfo = document.getElementById('eventInfo');
    if (eventInfo) {
      let timeText = '';
      if (this.event.start_time) {
        timeText = formatTime(this.event.start_time);
        if (this.event.end_time) {
          timeText += ' - ' + formatTime(this.event.end_time);
        }
      }

      eventInfo.innerHTML = `
        <h3>${escapeHtml(this.event.title)}</h3>
        <p>📅 ${formatDate(this.event.date)} ${timeText}</p>
        <p>📍 ${escapeHtml(this.event.location || '未設定')}</p>
      `;
    }
  }

  setupEventListeners() {
    // スキャン開始/停止
    const startBtn = document.getElementById('startScanBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startScanning());
    }

    const stopBtn = document.getElementById('stopScanBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopScanning());
    }

    // カメラ切替
    const switchCameraBtn = document.getElementById('switchCameraBtn');
    if (switchCameraBtn) {
      switchCameraBtn.addEventListener('click', () => this.switchCamera());
    }

    // 手動チェックイン
    const manualCheckinBtn = document.getElementById('manualCheckinBtn');
    if (manualCheckinBtn) {
      manualCheckinBtn.addEventListener('click', () => this.showManualCheckinModal());
    }

    const submitManualBtn = document.getElementById('submitManualBtn');
    if (submitManualBtn) {
      submitManualBtn.addEventListener('click', () => this.submitManualCheckin());
    }

    const closeManualBtn = document.getElementById('closeManualBtn');
    if (closeManualBtn) {
      closeManualBtn.addEventListener('click', () => this.closeManualModal());
    }
  }

  async initScanner() {
    try {
      // QRコードスキャナーの初期化
      const videoElement = document.getElementById('qrVideo');
      if (!videoElement) {
        console.error('ビデオ要素が見つかりません');
        return;
      }

      // html5-qrcode ライブラリを使用
      this.scanner = new Html5Qrcode("qrVideo");

      // カメラ一覧を取得
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        this.cameras = cameras;
        this.currentCameraIndex = 0;
      }
    } catch (error) {
      console.error('スキャナーの初期化に失敗:', error);
      showError('カメラの初期化に失敗しました');
    }
  }

  async startScanning() {
    if (this.isScanning) return;

    try {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      };

      const cameraId = this.cameras && this.cameras.length > 0
        ? this.cameras[this.currentCameraIndex].id
        : undefined;

      await this.scanner.start(
        cameraId || { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          this.onScanSuccess(decodedText, decodedResult);
        },
        (errorMessage) => {
          // スキャンエラーは無視（継続的にスキャン）
        }
      );

      this.isScanning = true;
      this.updateScanningUI(true);
    } catch (error) {
      console.error('スキャン開始に失敗:', error);
      showError('カメラの起動に失敗しました: ' + error.message);
    }
  }

  async stopScanning() {
    if (!this.isScanning) return;

    try {
      await this.scanner.stop();
      this.isScanning = false;
      this.updateScanningUI(false);
    } catch (error) {
      console.error('スキャン停止に失敗:', error);
    }
  }

  async switchCamera() {
    if (!this.cameras || this.cameras.length <= 1) {
      showError('利用可能なカメラが他にありません');
      return;
    }

    try {
      await this.stopScanning();
      this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
      await this.startScanning();
    } catch (error) {
      console.error('カメラ切替に失敗:', error);
      showError('カメラの切り替えに失敗しました');
    }
  }

  updateScanningUI(isScanning) {
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const scanStatus = document.getElementById('scanStatus');

    if (startBtn) startBtn.style.display = isScanning ? 'none' : 'block';
    if (stopBtn) stopBtn.style.display = isScanning ? 'block' : 'none';

    if (scanStatus) {
      if (isScanning) {
        scanStatus.textContent = 'QRコードをスキャンしてください';
        scanStatus.className = 'scan-status scanning';
      } else {
        scanStatus.textContent = 'スキャンを開始してください';
        scanStatus.className = 'scan-status';
      }
    }
  }

  async onScanSuccess(decodedText, decodedResult) {
    // スキャン成功時の処理
    console.log('QRコードを読み取りました:', decodedText);

    // 一時的にスキャンを停止
    await this.stopScanning();

    try {
      // QRコードからデータを解析
      const qrData = JSON.parse(decodedText);

      if (!qrData.eventId || !qrData.userId) {
        throw new Error('無効なQRコードです');
      }

      // チェックイン処理
      await this.processCheckin(qrData.eventId, qrData.userId);
    } catch (error) {
      if (error instanceof SyntaxError) {
        showError('QRコードの形式が正しくありません');
      } else {
        showError('チェックインに失敗しました: ' + error.message);
      }

      // エラー時は自動的にスキャン再開
      setTimeout(() => this.startScanning(), 2000);
    }
  }

  async processCheckin(eventId, userId) {
    try {
      showLoading();

      // イベントIDが指定されている場合は一致確認
      if (this.eventId && this.eventId !== eventId) {
        throw new Error('このイベントのQRコードではありません');
      }

      // チェックインAPI呼び出し
      const response = await API.qrCheckin(eventId, userId);

      if (response.success) {
        showSuccess(`チェックイン完了: ${response.data.userName}`);
        this.showCheckinSuccess(response.data);

        // 3秒後にスキャン再開
        setTimeout(() => this.startScanning(), 3000);
      } else {
        throw new Error(response.error || 'チェックインに失敗しました');
      }
    } catch (error) {
      showError(error.message);
      setTimeout(() => this.startScanning(), 2000);
    } finally {
      hideLoading();
    }
  }

  showCheckinSuccess(data) {
    const resultDiv = document.getElementById('checkinResult');
    if (!resultDiv) return;

    resultDiv.innerHTML = `
      <div class="checkin-success">
        <div class="success-icon">✓</div>
        <h3>${escapeHtml(data.userName)}</h3>
        <p>チェックインしました</p>
        <p class="checkin-time">${formatTime(new Date())}</p>
      </div>
    `;

    resultDiv.style.display = 'block';

    // 3秒後に非表示
    setTimeout(() => {
      resultDiv.style.display = 'none';
    }, 3000);
  }

  showManualCheckinModal() {
    const modal = document.getElementById('manualCheckinModal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('memberSearch').value = '';
      document.getElementById('memberList').innerHTML = '';
    }

    // メンバー一覧を読み込む
    this.loadMembersForManual();
  }

  closeManualModal() {
    const modal = document.getElementById('manualCheckinModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async loadMembersForManual() {
    try {
      const response = await API.getMembers();
      this.members = response.data || [];
      this.renderMemberList();
    } catch (error) {
      console.error('メンバー一覧の読み込みに失敗:', error);
    }
  }

  renderMemberList() {
    const searchInput = document.getElementById('memberSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    const filtered = this.members.filter(member =>
      member.name.toLowerCase().includes(searchTerm) ||
      (member.studentNumber && member.studentNumber.includes(searchTerm))
    );

    const container = document.getElementById('memberList');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<p class="no-data">メンバーが見つかりません</p>';
      return;
    }

    const html = filtered.map(member => `
      <div class="member-item" onclick="qrCheckin.selectMember('${member.id}')">
        <div class="member-name">${escapeHtml(member.name)}</div>
        <div class="member-info">
          ${member.grade ? `${member.grade} ` : ''}
          ${member.studentNumber || ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = html;

    // 検索イベント
    if (searchInput && !searchInput.dataset.listenerAdded) {
      searchInput.addEventListener('input', () => this.renderMemberList());
      searchInput.dataset.listenerAdded = 'true';
    }
  }

  async selectMember(memberId) {
    if (!this.eventId) {
      showError('イベントが選択されていません');
      return;
    }

    try {
      showLoading();
      await this.processCheckin(this.eventId, memberId);
      this.closeManualModal();
    } catch (error) {
      showError('チェックインに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }
}

// グローバル変数
let qrCheckin;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  qrCheckin = new QRCheckin();
  await qrCheckin.init();
});

// ページを離れる時にスキャン停止
window.addEventListener('beforeunload', () => {
  if (qrCheckin && qrCheckin.isScanning) {
    qrCheckin.stopScanning();
  }
});
