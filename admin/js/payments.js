// 支払い管理ページ
class PaymentsManagement {
  constructor() {
    this.payments = [];
    this.currentTab = 'unpaid';
    this.filters = {
      event: 'all',
      member: '',
      method: 'all'
    };
  }

  async init() {
    this.setupEventListeners();
    await this.loadPayments();
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
    const eventFilter = document.getElementById('eventFilter');
    if (eventFilter) {
      eventFilter.addEventListener('change', (e) => {
        this.filters.event = e.target.value;
        this.renderPayments();
      });
    }

    const memberSearch = document.getElementById('memberSearch');
    if (memberSearch) {
      memberSearch.addEventListener('input', (e) => {
        this.filters.member = e.target.value;
        this.renderPayments();
      });
    }

    const methodFilter = document.getElementById('methodFilter');
    if (methodFilter) {
      methodFilter.addEventListener('change', (e) => {
        this.filters.method = e.target.value;
        this.renderPayments();
      });
    }

    // 更新ボタン
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadPayments());
    }

    // エクスポートボタン
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportPayments());
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;

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
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
      if (content.id === `${tabName}Tab`) {
        content.style.display = 'block';
      } else {
        content.style.display = 'none';
      }
    });

    this.renderPayments();
  }

  async loadPayments() {
    try {
      showLoading();
      const response = await AdminAPI.request('getPayments');
      this.payments = response.data || [];
      this.renderPayments();
      this.updateStats();
      this.populateEventFilter();
    } catch (error) {
      showError('支払い情報の読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  populateEventFilter() {
    const eventFilter = document.getElementById('eventFilter');
    if (!eventFilter) return;

    // ユニークなイベントを抽出
    const events = [...new Map(this.payments.map(p => [p.eventId, p])).values()];

    const options = events.map(p =>
      `<option value="${p.eventId}">${escapeHtml(p.eventName)}</option>`
    ).join('');

    eventFilter.innerHTML = `
      <option value="all">すべてのイベント</option>
      ${options}
    `;
  }

  renderPayments() {
    const container = document.getElementById(`${this.currentTab}List`);
    if (!container) return;

    const filtered = this.filterPayments();

    if (filtered.length === 0) {
      container.innerHTML = '<p class="no-data">データがありません</p>';
      return;
    }

    const html = filtered.map(payment => this.renderPaymentRow(payment)).join('');
    container.innerHTML = html;
  }

  filterPayments() {
    let filtered = this.payments;

    // タブによるフィルター
    switch (this.currentTab) {
      case 'unpaid':
        filtered = filtered.filter(p => !p.paid && !p.isCancellationFee);
        break;
      case 'paid':
        filtered = filtered.filter(p => p.paid && !p.isCancellationFee);
        break;
      case 'cancellation':
        filtered = filtered.filter(p => p.isCancellationFee);
        break;
    }

    // イベントフィルター
    if (this.filters.event !== 'all') {
      filtered = filtered.filter(p => p.eventId === this.filters.event);
    }

    // メンバー検索
    if (this.filters.member) {
      const search = this.filters.member.toLowerCase();
      filtered = filtered.filter(p =>
        p.memberName.toLowerCase().includes(search)
      );
    }

    // 支払い方法フィルター
    if (this.filters.method !== 'all') {
      filtered = filtered.filter(p => p.paymentMethod === this.filters.method);
    }

    // 日付降順
    filtered.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

    return filtered;
  }

  renderPaymentRow(payment) {
    const methodLabels = {
      'cash': '現地払い',
      'bank': '銀行振込',
      'paypay': 'PayPay',
      'line_pay': 'LINE Pay'
    };

    return `
      <tr class="payment-row">
        <td>${formatDate(payment.eventDate)}</td>
        <td>${escapeHtml(payment.eventName)}</td>
        <td>${escapeHtml(payment.memberName)}</td>
        <td>¥${payment.amount.toLocaleString()}</td>
        <td>${methodLabels[payment.paymentMethod] || payment.paymentMethod}</td>
        <td>
          ${payment.isCancellationFee
            ? '<span class="badge badge-warning">キャンセル料</span>'
            : '<span class="badge badge-info">参加費</span>'}
        </td>
        <td>
          ${payment.paid
            ? `<span class="status-badge status-confirmed">支払済</span><br><small>${formatDate(payment.paidAt)}</small>`
            : '<span class="status-badge status-pending">未払い</span>'}
        </td>
        <td class="actions">
          ${!payment.paid ? `
            <button class="btn-primary btn-sm" onclick="paymentsManagement.confirmPayment('${payment.id}')">
              支払い確認
            </button>
          ` : ''}
          ${payment.paid && !payment.receiptIssued ? `
            <button class="btn-secondary btn-sm" onclick="paymentsManagement.issueReceipt('${payment.id}')">
              領収書発行
            </button>
          ` : ''}
          ${payment.receiptIssued ? `
            <a href="${payment.receiptUrl}" target="_blank" class="btn-link btn-sm">
              領収書表示
            </a>
          ` : ''}
        </td>
      </tr>
    `;
  }

  updateStats() {
    // 未払い
    const unpaid = this.payments.filter(p => !p.paid && !p.isCancellationFee);
    const unpaidAmount = unpaid.reduce((sum, p) => sum + p.amount, 0);

    document.getElementById('unpaidCount').textContent = unpaid.length;
    document.getElementById('unpaidAmount').textContent = unpaidAmount.toLocaleString();

    // 支払済
    const paid = this.payments.filter(p => p.paid && !p.isCancellationFee);
    const paidAmount = paid.reduce((sum, p) => sum + p.amount, 0);

    document.getElementById('paidCount').textContent = paid.length;
    document.getElementById('paidAmount').textContent = paidAmount.toLocaleString();

    // キャンセル料
    const cancellation = this.payments.filter(p => p.isCancellationFee);
    const cancellationUnpaid = cancellation.filter(p => !p.paid);
    const cancellationAmount = cancellationUnpaid.reduce((sum, p) => sum + p.amount, 0);

    document.getElementById('cancellationCount').textContent = cancellationUnpaid.length;
    document.getElementById('cancellationAmount').textContent = cancellationAmount.toLocaleString();
  }

  async confirmPayment(paymentId) {
    const payment = this.payments.find(p => p.id === paymentId);
    if (!payment) return;

    if (!confirm(`${payment.memberName}さんの支払いを確認しますか？\n金額: ¥${payment.amount.toLocaleString()}`)) {
      return;
    }

    try {
      showLoading();
      await AdminAPI.request('confirmPayment', {
        method: 'POST',
        body: JSON.stringify({ paymentId })
      });
      showSuccess('支払いを確認しました');
      await this.loadPayments();
    } catch (error) {
      showError('支払い確認に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async issueReceipt(paymentId) {
    const payment = this.payments.find(p => p.id === paymentId);
    if (!payment) return;

    // 領収書発行画面へ遷移
    window.location.href = `receipts.html?paymentId=${paymentId}`;
  }

  exportPayments() {
    const filtered = this.filterPayments();

    if (filtered.length === 0) {
      showError('エクスポートするデータがありません');
      return;
    }

    const headers = [
      'イベント日',
      'イベント名',
      'メンバー名',
      '金額',
      '支払い方法',
      '種別',
      '状態',
      '支払日'
    ];

    const rows = filtered.map(p => [
      formatDate(p.eventDate),
      p.eventName,
      p.memberName,
      p.amount,
      { 'cash': '現地払い', 'bank': '銀行振込', 'paypay': 'PayPay', 'line_pay': 'LINE Pay' }[p.paymentMethod] || p.paymentMethod,
      p.isCancellationFee ? 'キャンセル料' : '参加費',
      p.paid ? '支払済' : '未払い',
      p.paid ? formatDate(p.paidAt) : ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `支払い管理_${this.currentTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('支払いデータをエクスポートしました');
  }
}

// グローバル変数
let paymentsManagement;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  paymentsManagement = new PaymentsManagement();
  await paymentsManagement.init();
});
