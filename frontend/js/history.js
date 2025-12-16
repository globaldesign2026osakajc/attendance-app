// 出欠履歴ページ
class AttendanceHistory {
  constructor() {
    this.history = [];
    this.filters = {
      year: new Date().getFullYear(),
      status: 'all'
    };
    this.stats = null;
  }

  async init() {
    this.setupEventListeners();
    await this.loadHistory();
  }

  setupEventListeners() {
    // 年フィルター
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
      this.populateYearFilter();
      yearFilter.addEventListener('change', (e) => {
        this.filters.year = parseInt(e.target.value);
        this.renderHistory();
        this.updateStats();
      });
    }

    // ステータスフィルター
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderHistory();
      });
    }

    // エクスポートボタン
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportHistory());
    }
  }

  populateYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    if (!yearFilter) return;

    const currentYear = new Date().getFullYear();
    const years = [];

    // 過去5年分
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }

    yearFilter.innerHTML = years.map(year =>
      `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
    ).join('');
  }

  async loadHistory() {
    try {
      showLoading();
      const response = await API.getAttendanceHistory();
      this.history = response.data || [];
      this.calculateStats();
      this.renderHistory();
      this.updateStats();
    } catch (error) {
      showError('履歴の読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  calculateStats() {
    const yearHistory = this.history.filter(item => {
      const itemYear = new Date(item.eventDate).getFullYear();
      return itemYear === this.filters.year;
    });

    this.stats = {
      total: yearHistory.length,
      attend: yearHistory.filter(h => h.status === 'attend').length,
      absent: yearHistory.filter(h => h.status === 'absent').length,
      pending: yearHistory.filter(h => h.status === 'pending').length,
      attendanceRate: 0
    };

    if (this.stats.total > 0) {
      this.stats.attendanceRate = (this.stats.attend / this.stats.total * 100).toFixed(1);
    }
  }

  updateStats() {
    if (!this.stats) return;

    document.getElementById('totalEvents').textContent = this.stats.total;
    document.getElementById('attendCount').textContent = this.stats.attend;
    document.getElementById('absentCount').textContent = this.stats.absent;
    document.getElementById('attendanceRate').textContent = this.stats.attendanceRate;

    // 出席率バー
    const rateBar = document.querySelector('.rate-bar');
    if (rateBar) {
      rateBar.style.width = this.stats.attendanceRate + '%';
    }

    // 月別グラフ
    this.renderMonthlyChart();
  }

  renderMonthlyChart() {
    const yearHistory = this.history.filter(item => {
      const itemYear = new Date(item.eventDate).getFullYear();
      return itemYear === this.filters.year;
    });

    // 月別集計
    const monthlyData = new Array(12).fill(0).map(() => ({
      total: 0,
      attend: 0
    }));

    yearHistory.forEach(item => {
      const month = new Date(item.eventDate).getMonth();
      monthlyData[month].total++;
      if (item.status === 'attend') {
        monthlyData[month].attend++;
      }
    });

    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    const labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const attendData = monthlyData.map(d => d.attend);
    const totalData = monthlyData.map(d => d.total);

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '出席',
            data: attendData,
            backgroundColor: '#4CAF50'
          },
          {
            label: '全イベント',
            data: totalData,
            backgroundColor: '#E0E0E0'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  renderHistory() {
    const filteredHistory = this.filterHistory();
    const container = document.getElementById('historyList');

    if (!container) return;

    if (filteredHistory.length === 0) {
      container.innerHTML = '<p class="no-data">履歴がありません</p>';
      return;
    }

    // 月ごとにグループ化
    const groupedByMonth = this.groupByMonth(filteredHistory);

    const html = Object.entries(groupedByMonth).map(([month, items]) => `
      <div class="history-month-group">
        <h3 class="month-header">${month}</h3>
        <div class="history-items">
          ${items.map(item => this.renderHistoryItem(item)).join('')}
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  filterHistory() {
    let filtered = this.history;

    // 年フィルター
    filtered = filtered.filter(item => {
      const itemYear = new Date(item.eventDate).getFullYear();
      return itemYear === this.filters.year;
    });

    // ステータスフィルター
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === this.filters.status);
    }

    // 日付降順にソート
    filtered.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

    return filtered;
  }

  groupByMonth(history) {
    const groups = {};

    history.forEach(item => {
      const date = new Date(item.eventDate);
      const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return groups;
  }

  renderHistoryItem(item) {
    const statusLabels = {
      'attend': '出席',
      'absent': '欠席',
      'pending': '未定'
    };

    const statusIcons = {
      'attend': '✓',
      'absent': '✗',
      'pending': '?'
    };

    const paymentStatus = item.payment ? item.payment.status : null;
    const paymentLabels = {
      'pending': '未払い',
      'paid': '支払済',
      'confirmed': '確認済'
    };

    return `
      <div class="history-item" onclick="window.location.href='event-detail.html?id=${item.eventId}'">
        <div class="history-date">
          <div class="date-day">${new Date(item.eventDate).getDate()}</div>
          <div class="date-weekday">${['日', '月', '火', '水', '木', '金', '土'][new Date(item.eventDate).getDay()]}</div>
        </div>

        <div class="history-content">
          <h4 class="history-event-name">${escapeHtml(item.eventName)}</h4>
          <div class="history-meta">
            <span class="history-time">⏰ ${formatTime(item.eventDate)}</span>
            ${item.eventLocation ? `<span class="history-location">📍 ${escapeHtml(item.eventLocation)}</span>` : ''}
          </div>
          ${item.notes ? `<p class="history-notes">${escapeHtml(item.notes)}</p>` : ''}
        </div>

        <div class="history-status">
          <div class="attendance-badge status-${item.status}">
            <span class="status-icon">${statusIcons[item.status]}</span>
            <span class="status-text">${statusLabels[item.status]}</span>
          </div>
          ${paymentStatus ? `
            <div class="payment-badge status-${paymentStatus}">
              ${paymentLabels[paymentStatus]}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  exportHistory() {
    const filtered = this.filterHistory();

    if (filtered.length === 0) {
      showError('エクスポートするデータがありません');
      return;
    }

    // CSV形式で出力
    const headers = ['日付', 'イベント名', '場所', '出欠', '備考', '支払い状況'];
    const rows = filtered.map(item => [
      formatDate(item.eventDate),
      item.eventName,
      item.eventLocation || '',
      {
        'attend': '出席',
        'absent': '欠席',
        'pending': '未定'
      }[item.status] || '',
      item.notes || '',
      item.payment ? {
        'pending': '未払い',
        'paid': '支払済',
        'confirmed': '確認済'
      }[item.payment.status] || '' : ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `出欠履歴_${this.filters.year}.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('履歴をエクスポートしました');
  }
}

// グローバル変数
let attendanceHistory;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  attendanceHistory = new AttendanceHistory();
  await attendanceHistory.init();
});
