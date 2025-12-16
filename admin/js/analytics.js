// 出席率分析ページ
class Analytics {
  constructor() {
    this.data = null;
    this.charts = {};
    this.filters = {
      period: 'month',
      startDate: null,
      endDate: null,
      affiliation: 'all',
      position: 'all',
      tag: 'all'
    };
    this.masters = null;
  }

  async init() {
    await this.loadMasters();
    this.setupEventListeners();
    this.setDefaultDates();
    this.populateFilters();
    await this.loadAnalytics();
  }

  async loadMasters() {
    try {
      const response = await AdminAPI.request('getMasters');
      this.masters = response.data;
    } catch (error) {
      console.error('マスタデータの読み込みエラー:', error);
    }
  }

  setupEventListeners() {
    // 期間選択
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        this.filters.period = e.target.value;
        this.setDefaultDates();
        this.loadAnalytics();
      });
    }

    // 日付範囲
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    if (startDate) {
      startDate.addEventListener('change', (e) => {
        this.filters.startDate = e.target.value;
        this.loadAnalytics();
      });
    }

    if (endDate) {
      endDate.addEventListener('change', (e) => {
        this.filters.endDate = e.target.value;
        this.loadAnalytics();
      });
    }

    // フィルター
    ['affiliationFilter', 'positionFilter', 'tagFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.loadAnalytics());
      }
    });

    // エクスポート
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    // 更新
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadAnalytics());
    }
  }

  setDefaultDates() {
    const now = new Date();
    let start, end;

    switch (this.filters.period) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = now;
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');

    if (startInput) {
      startInput.value = start.toISOString().split('T')[0];
      this.filters.startDate = startInput.value;
    }

    if (endInput) {
      endInput.value = end.toISOString().split('T')[0];
      this.filters.endDate = endInput.value;
    }
  }

  populateFilters() {
    if (!this.masters) return;

    // 所属フィルター
    const affiliationFilter = document.getElementById('affiliationFilter');
    if (affiliationFilter && this.masters.affiliations) {
      affiliationFilter.innerHTML = `
        <option value="all">すべての所属</option>
        ${this.masters.affiliations.map(aff =>
          `<option value="${aff}">${escapeHtml(aff)}</option>`
        ).join('')}
      `;
    }

    // 役職フィルター
    const positionFilter = document.getElementById('positionFilter');
    if (positionFilter && this.masters.positions) {
      positionFilter.innerHTML = `
        <option value="all">すべての役職</option>
        ${this.masters.positions.map(pos =>
          `<option value="${pos}">${escapeHtml(pos)}</option>`
        ).join('')}
      `;
    }

    // タグフィルター
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter && this.masters.tags) {
      tagFilter.innerHTML = `
        <option value="all">すべてのタグ</option>
        ${this.masters.tags.map(tag =>
          `<option value="${tag}">${escapeHtml(tag)}</option>`
        ).join('')}
      `;
    }
  }

  async loadAnalytics() {
    try {
      showLoading();

      const params = {
        startDate: this.filters.startDate,
        endDate: this.filters.endDate,
        affiliation: document.getElementById('affiliationFilter')?.value,
        position: document.getElementById('positionFilter')?.value,
        tag: document.getElementById('tagFilter')?.value
      };

      const response = await AdminAPI.request(`getAnalytics&${new URLSearchParams(params).toString()}`);
      this.data = response.data;

      this.renderStats();
      this.renderCharts();
      this.renderTopMembers();
    } catch (error) {
      showError('分析データの読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  renderStats() {
    if (!this.data || !this.data.summary) return;

    const summary = this.data.summary;

    document.getElementById('totalEvents').textContent = summary.totalEvents || 0;
    document.getElementById('totalAttendances').textContent = summary.totalAttendances || 0;
    document.getElementById('averageAttendanceRate').textContent =
      (summary.averageAttendanceRate || 0).toFixed(1);
    document.getElementById('totalRevenue').textContent =
      (summary.totalRevenue || 0).toLocaleString();
  }

  renderCharts() {
    if (!this.data) return;

    this.renderAttendanceTrendChart();
    this.renderAttendanceByAffiliationChart();
    this.renderAttendanceByPositionChart();
    this.renderEventTypeChart();
  }

  renderAttendanceTrendChart() {
    const ctx = document.getElementById('attendanceTrendChart');
    if (!ctx || !this.data.trend) return;

    if (this.charts.trend) {
      this.charts.trend.destroy();
    }

    this.charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.trend.labels,
        datasets: [{
          label: '出席率（%）',
          data: this.data.trend.attendanceRates,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: '出席者数',
          data: this.data.trend.attendanceCounts,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '出席率（%）'
            },
            min: 0,
            max: 100
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '出席者数'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }

  renderAttendanceByAffiliationChart() {
    const ctx = document.getElementById('attendanceByAffiliationChart');
    if (!ctx || !this.data.byAffiliation) return;

    if (this.charts.affiliation) {
      this.charts.affiliation.destroy();
    }

    this.charts.affiliation = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.data.byAffiliation.labels,
        datasets: [{
          label: '出席率（%）',
          data: this.data.byAffiliation.attendanceRates,
          backgroundColor: '#4CAF50'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: '出席率（%）'
            }
          }
        }
      }
    });
  }

  renderAttendanceByPositionChart() {
    const ctx = document.getElementById('attendanceByPositionChart');
    if (!ctx || !this.data.byPosition) return;

    if (this.charts.position) {
      this.charts.position.destroy();
    }

    this.charts.position = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.data.byPosition.labels,
        datasets: [{
          label: '出席率（%）',
          data: this.data.byPosition.attendanceRates,
          backgroundColor: '#2196F3'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: '出席率（%）'
            }
          }
        }
      }
    });
  }

  renderEventTypeChart() {
    const ctx = document.getElementById('eventTypeChart');
    if (!ctx || !this.data.byEventType) return;

    if (this.charts.eventType) {
      this.charts.eventType.destroy();
    }

    this.charts.eventType = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.data.byEventType.labels,
        datasets: [{
          data: this.data.byEventType.counts,
          backgroundColor: [
            '#4CAF50',
            '#2196F3',
            '#FF9800',
            '#F44336',
            '#9C27B0',
            '#00BCD4'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  renderTopMembers() {
    if (!this.data || !this.data.topMembers) return;

    const container = document.getElementById('topMembersList');
    if (!container) return;

    const html = this.data.topMembers.map((member, index) => `
      <div class="top-member-item">
        <div class="rank">${index + 1}</div>
        <div class="member-info">
          <div class="member-name">${escapeHtml(member.name)}</div>
          <div class="member-details">
            ${member.affiliation ? escapeHtml(member.affiliation) : ''}
            ${member.position ? `/ ${escapeHtml(member.position)}` : ''}
          </div>
        </div>
        <div class="member-stats">
          <div class="stat-value">${member.attendanceRate.toFixed(1)}%</div>
          <div class="stat-label">${member.attendedCount}/${member.totalEvents}回</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  exportData() {
    if (!this.data) {
      showError('エクスポートするデータがありません');
      return;
    }

    // サマリー + 詳細データをCSV化
    const headers = ['名前', '所属', '役職', '出席回数', 'イベント数', '出席率（%）'];
    const rows = (this.data.memberDetails || []).map(m => [
      m.name,
      m.affiliation || '',
      m.position || '',
      m.attendedCount,
      m.totalEvents,
      m.attendanceRate.toFixed(1)
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = `出席率分析_${this.filters.startDate}_${this.filters.endDate}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('分析データをエクスポートしました');
  }
}

// グローバル変数
let analytics;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  analytics = new Analytics();
  await analytics.init();
});
