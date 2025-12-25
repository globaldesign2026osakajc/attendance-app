// ダッシュボード管理
class Dashboard {
  constructor() {
    this.stats = null;
    this.charts = {};
  }

  async init() {
    await this.loadStats();
    this.renderStats();
    await this.loadCharts();
  }

  async loadStats() {
    try {
      showLoading();
      const response = await AdminAPI.getDashboardStats();
      this.stats = response.data;
    } catch (error) {
      showError('統計情報の読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  renderStats() {
    if (!this.stats) return;

    // 今月の統計
    document.getElementById('monthlyEvents').textContent = this.stats.monthlyEvents || 0;
    document.getElementById('monthlyAttendance').textContent = this.stats.monthlyAttendance || 0;
    document.getElementById('monthlyRevenue').textContent =
      (this.stats.monthlyRevenue || 0).toLocaleString();
    document.getElementById('activeMembers').textContent = this.stats.activeMembers || 0;

    // 出席率
    const attendanceRate = this.stats.attendanceRate || 0;
    document.getElementById('attendanceRate').textContent = attendanceRate.toFixed(1);

    const rateBar = document.querySelector('.rate-bar');
    if (rateBar) {
      rateBar.style.width = attendanceRate + '%';
    }

    // 最近のイベント
    this.renderRecentEvents();

    // 支払い状況
    this.renderRecentPayments();

    // アラート
    this.renderAlerts();
  }

  renderRecentEvents() {
    const container = document.getElementById('recentEvents');
    if (!container || !this.stats.recentEvents) return;

    const html = this.stats.recentEvents.map(event => `
      <div class="event-item">
        <div class="event-date">${formatDate(event.date)}</div>
        <div class="event-info">
          <div class="event-name">${escapeHtml(event.title)}</div>
          <div class="event-stats">
            出席: ${event.attendanceCount || 0}/${event.totalMembers || 0}
          </div>
        </div>
        <a href="events.html?id=${event.event_id}" class="btn-link">詳細</a>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  renderRecentPayments() {
    const container = document.getElementById('recentPayments');
    if (!container || !this.stats.recentPayments) return;

    const statusLabels = {
      'pending': '未払い',
      'paid': '支払済',
      'confirmed': '確認済'
    };

    const html = this.stats.recentPayments.map(payment => `
      <div class="payment-item">
        <div class="payment-member">${escapeHtml(payment.memberName)}</div>
        <div class="payment-event">${escapeHtml(payment.eventName)}</div>
        <div class="payment-amount">¥${payment.amount.toLocaleString()}</div>
        <span class="status-badge status-${payment.status}">
          ${statusLabels[payment.status] || payment.status}
        </span>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  renderAlerts() {
    const container = document.getElementById('alerts');
    if (!container || !this.stats.alerts) return;

    if (this.stats.alerts.length === 0) {
      container.innerHTML = '<p class="no-alerts">アラートはありません</p>';
      return;
    }

    const html = this.stats.alerts.map(alert => `
      <div class="alert-item alert-${alert.type}">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <div class="alert-title">${escapeHtml(alert.title)}</div>
          <div class="alert-message">${escapeHtml(alert.message)}</div>
        </div>
        ${alert.link ? `<a href="${alert.link}" class="btn-link">確認</a>` : ''}
      </div>
    `).join('');

    container.innerHTML = html;
  }

  async loadCharts() {
    await this.loadAttendanceChart();
    await this.loadRevenueChart();
  }

  async loadAttendanceChart() {
    try {
      const response = await AdminAPI.getAttendanceAnalytics('month');
      const data = response.data;

      const ctx = document.getElementById('attendanceChart');
      if (!ctx) return;

      this.charts.attendance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: '出席者数',
            data: data.values,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
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
    } catch (error) {
      console.error('出席チャートの読み込みに失敗:', error);
    }
  }

  async loadRevenueChart() {
    try {
      const response = await AdminAPI.getPaymentAnalytics('month');
      const data = response.data;

      const ctx = document.getElementById('revenueChart');
      if (!ctx) return;

      this.charts.revenue = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{
            label: '収入（円）',
            data: data.values,
            backgroundColor: '#2196F3'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '¥' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('収入チャートの読み込みに失敗:', error);
    }
  }

  async refresh() {
    // キャッシュをクリアして最新データを取得
    AdminAPI.clearAllCache();
    await this.init();
  }
}

// グローバル変数
let dashboard;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  dashboard = new Dashboard();
  await dashboard.init();

  // 更新ボタン
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => dashboard.refresh());
  }

  // 定期更新（5分ごと）
  setInterval(() => dashboard.refresh(), 5 * 60 * 1000);
});
