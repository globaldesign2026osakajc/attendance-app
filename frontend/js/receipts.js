// 領収書・支払い管理ページ
class ReceiptsPage {
  constructor() {
    this.payments = [];
    this.receipts = [];
    this.filters = {
      status: 'all',
      year: new Date().getFullYear()
    };
  }

  async init() {
    this.setupEventListeners();
    await this.loadData();
  }

  setupEventListeners() {
    // タブ切替
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // フィルター
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderPayments();
      });
    }

    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
      this.populateYearFilter();
      yearFilter.addEventListener('change', (e) => {
        this.filters.year = parseInt(e.target.value);
        this.renderPayments();
      });
    }
  }

  populateYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    if (!yearFilter) return;

    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }

    yearFilter.innerHTML = years.map(year =>
      `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
    ).join('');
  }

  switchTab(tabName) {
    // タブボタンの更新
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // タブコンテンツの更新
    const paymentsTab = document.getElementById('paymentsTab');
    const receiptsTab = document.getElementById('receiptsTab');

    if (tabName === 'payments') {
      paymentsTab.style.display = 'block';
      receiptsTab.style.display = 'none';
    } else {
      paymentsTab.style.display = 'none';
      receiptsTab.style.display = 'block';
    }
  }

  async loadData() {
    try {
      showLoading();
      await Promise.all([
        this.loadPayments(),
        this.loadReceipts()
      ]);

      this.renderPayments();
      this.renderReceipts();
      this.renderSummary();
    } catch (error) {
      showError('データの読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async loadPayments() {
    try {
      const response = await API.getPayments();
      this.payments = response.data || [];
    } catch (error) {
      console.error('支払い情報の読み込みに失敗:', error);
      this.payments = [];
    }
  }

  async loadReceipts() {
    try {
      const response = await API.getReceipts();
      this.receipts = response.data || [];
    } catch (error) {
      console.error('領収書情報の読み込みに失敗:', error);
      this.receipts = [];
    }
  }

  renderPayments() {
    const filtered = this.filterPayments();
    const container = document.getElementById('paymentsList');

    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<p class="no-data">支払い情報がありません</p>';
      return;
    }

    const html = filtered.map(payment => this.renderPaymentCard(payment)).join('');
    container.innerHTML = html;
  }

  filterPayments() {
    let filtered = this.payments;

    // 年フィルター
    filtered = filtered.filter(payment => {
      const paymentYear = new Date(payment.eventDate).getFullYear();
      return paymentYear === this.filters.year;
    });

    // ステータスフィルター
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(payment => payment.status === this.filters.status);
    }

    // 日付降順にソート
    filtered.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

    return filtered;
  }

  renderPaymentCard(payment) {
    const statusLabels = {
      'pending': '未払い',
      'paid': '支払済',
      'confirmed': '確認済'
    };

    const statusClass = payment.status || 'pending';
    const statusText = statusLabels[payment.status] || '未払い';

    return `
      <div class="payment-card">
        <div class="payment-header">
          <div class="payment-event">
            <h4>${escapeHtml(payment.eventName)}</h4>
            <p class="payment-date">📅 ${formatDate(payment.eventDate)}</p>
          </div>
          <div class="payment-amount">¥${payment.amount.toLocaleString()}</div>
        </div>

        <div class="payment-body">
          <div class="payment-status">
            <span class="status-label">状態:</span>
            <span class="status-badge status-${statusClass}">${statusText}</span>
          </div>

          ${payment.paidAt ? `
            <div class="payment-info">
              <span class="info-label">支払日:</span>
              <span>${formatDate(payment.paidAt)}</span>
            </div>
          ` : ''}

          ${payment.method ? `
            <div class="payment-info">
              <span class="info-label">支払方法:</span>
              <span>${this.getPaymentMethodLabel(payment.method)}</span>
            </div>
          ` : ''}

          ${payment.notes ? `
            <div class="payment-notes">
              <span class="info-label">備考:</span>
              <p>${escapeHtml(payment.notes)}</p>
            </div>
          ` : ''}
        </div>

        <div class="payment-footer">
          ${payment.status === 'pending' ? `
            <button class="btn-primary btn-sm" onclick="receiptsPage.registerPayment('${payment.id}')">
              支払い登録
            </button>
          ` : ''}

          ${payment.status === 'confirmed' && payment.receiptId ? `
            <button class="btn-secondary btn-sm" onclick="receiptsPage.viewReceipt('${payment.receiptId}')">
              領収書を見る
            </button>
          ` : ''}

          <a href="event-detail.html?id=${payment.eventId}" class="btn-link btn-sm">
            イベント詳細
          </a>
        </div>
      </div>
    `;
  }

  getPaymentMethodLabel(method) {
    const labels = {
      'cash': '現金',
      'bank': '銀行振込',
      'paypay': 'PayPay',
      'line_pay': 'LINE Pay',
      'other': 'その他'
    };
    return labels[method] || method;
  }

  renderReceipts() {
    const container = document.getElementById('receiptsList');
    if (!container) return;

    if (this.receipts.length === 0) {
      container.innerHTML = '<p class="no-data">領収書がありません</p>';
      return;
    }

    const html = this.receipts.map(receipt => this.renderReceiptCard(receipt)).join('');
    container.innerHTML = html;
  }

  renderReceiptCard(receipt) {
    return `
      <div class="receipt-card">
        <div class="receipt-header">
          <div class="receipt-number">領収書 No. ${receipt.receiptNumber}</div>
          <div class="receipt-date">${formatDate(receipt.issuedAt)}</div>
        </div>

        <div class="receipt-body">
          <div class="receipt-info">
            <div class="info-row">
              <span class="info-label">イベント:</span>
              <span>${escapeHtml(receipt.eventName)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">金額:</span>
              <span class="receipt-amount">¥${receipt.amount.toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">発行日:</span>
              <span>${formatDate(receipt.issuedAt)}</span>
            </div>
          </div>
        </div>

        <div class="receipt-footer">
          <button class="btn-primary btn-sm" onclick="receiptsPage.downloadReceipt('${receipt.id}')">
            <span>📥</span> ダウンロード
          </button>
          <button class="btn-secondary btn-sm" onclick="receiptsPage.viewReceipt('${receipt.id}')">
            <span>👁</span> プレビュー
          </button>
        </div>
      </div>
    `;
  }

  renderSummary() {
    // 支払い統計
    const yearPayments = this.payments.filter(p => {
      const year = new Date(p.eventDate).getFullYear();
      return year === this.filters.year;
    });

    const totalAmount = yearPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = yearPayments
      .filter(p => p.status === 'paid' || p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0);
    const unpaidAmount = yearPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    document.getElementById('totalAmount').textContent = totalAmount.toLocaleString();
    document.getElementById('paidAmount').textContent = paidAmount.toLocaleString();
    document.getElementById('unpaidAmount').textContent = unpaidAmount.toLocaleString();

    // 未払い件数
    const unpaidCount = yearPayments.filter(p => p.status === 'pending').length;
    document.getElementById('unpaidCount').textContent = unpaidCount;
  }

  async registerPayment(paymentId) {
    window.location.href = `event-detail.html?id=${this.payments.find(p => p.id === paymentId)?.eventId}`;
  }

  async viewReceipt(receiptId) {
    try {
      showLoading();
      const response = await API.getReceipt(receiptId);
      const receipt = response.data;

      // モーダルで領収書を表示
      this.showReceiptModal(receipt);
    } catch (error) {
      showError('領収書の読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  showReceiptModal(receipt) {
    const modal = document.getElementById('receiptModal');
    if (!modal) return;

    const content = document.getElementById('receiptContent');
    if (content) {
      content.innerHTML = `
        <div class="receipt-preview">
          <div class="receipt-title">領収書</div>
          <div class="receipt-number">No. ${receipt.receiptNumber}</div>

          <div class="receipt-section">
            <div class="receipt-to">
              <div class="label">宛名</div>
              <div class="value">${escapeHtml(receipt.memberName)} 様</div>
            </div>
          </div>

          <div class="receipt-section">
            <div class="receipt-amount-box">
              <div class="label">金額</div>
              <div class="amount-large">¥${receipt.amount.toLocaleString()}</div>
            </div>
          </div>

          <div class="receipt-section">
            <div class="label">但し書き</div>
            <div class="value">${escapeHtml(receipt.eventName)} 参加費として</div>
          </div>

          <div class="receipt-section">
            <div class="label">発行日</div>
            <div class="value">${formatDate(receipt.issuedAt)}</div>
          </div>

          <div class="receipt-section">
            <div class="receipt-issuer">
              <div class="issuer-name">発行者: ${escapeHtml(receipt.issuerName || '管理者')}</div>
            </div>
          </div>
        </div>
      `;
    }

    modal.style.display = 'flex';

    // 閉じるボタン
    const closeBtn = document.getElementById('closeReceiptModal');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = 'none';
      };
    }
  }

  async downloadReceipt(receiptId) {
    try {
      showLoading();
      const response = await API.downloadReceipt(receiptId);

      if (response.data.url) {
        // PDFダウンロード
        window.open(response.data.url, '_blank');
      } else {
        throw new Error('ダウンロードURLの取得に失敗しました');
      }

      showSuccess('領収書をダウンロードしました');
    } catch (error) {
      showError('領収書のダウンロードに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async refresh() {
    await this.loadData();
    showSuccess('更新しました');
  }
}

// グローバル変数
let receiptsPage;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  receiptsPage = new ReceiptsPage();
  await receiptsPage.init();
});
