// イベント一覧ページ
class EventsList {
  constructor() {
    this.events = [];
    this.filters = {
      status: 'upcoming',
      search: ''
    };
  }

  async init() {
    this.setupEventListeners();
    await this.loadEvents();
  }

  setupEventListeners() {
    // 検索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.renderEvents();
      });
    }

    // ステータスタブ
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const status = e.target.dataset.status;
        this.setActiveTab(status);
      });
    });
  }

  setActiveTab(status) {
    this.filters.status = status;

    // タブのアクティブ状態を更新
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      if (tab.dataset.status === status) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.renderEvents();
  }

  async loadEvents() {
    try {
      showLoading();
      const response = await API.getEvents();
      this.events = response.data || [];
      this.renderEvents();
    } catch (error) {
      showError('イベントの読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  renderEvents() {
    const filteredEvents = this.filterEvents();
    const container = document.getElementById('eventsList');

    if (!container) return;

    if (filteredEvents.length === 0) {
      container.innerHTML = '<p class="no-data">イベントがありません</p>';
      return;
    }

    const html = filteredEvents.map(event => this.renderEventCard(event)).join('');
    container.innerHTML = html;
  }

  filterEvents() {
    const now = new Date();
    let filtered = this.events;

    // ステータスフィルター
    if (this.filters.status === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.date) >= now);
    } else if (this.filters.status === 'past') {
      filtered = filtered.filter(event => new Date(event.date) < now);
    }

    // 検索フィルター
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(search) ||
        (event.description && event.description.toLowerCase().includes(search)) ||
        (event.location && event.location.toLowerCase().includes(search))
      );
    }

    // 日付でソート（近い順）
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      if (this.filters.status === 'past') {
        return dateB - dateA; // 過去イベントは新しい順
      } else {
        return dateA - dateB; // 未来イベントは古い順
      }
    });

    return filtered;
  }

  renderEventCard(event) {
    const eventDate = new Date(event.date);
    const now = new Date();
    const isPast = eventDate < now;

    // 出欠状況
    const attendance = event.attendance || {};
    const attendanceStatus = attendance.status || 'none';
    const statusLabels = {
      'attend': '出席',
      'absent': '欠席',
      'pending': '未定',
      'none': '未登録'
    };

    // 締切チェック
    let deadlineWarning = '';
    if (event.deadline && !isPast) {
      const deadline = new Date(event.deadline);
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
        deadlineWarning = `<div class="deadline-warning">締切まで${daysUntilDeadline}日</div>`;
      } else if (daysUntilDeadline < 0) {
        deadlineWarning = '<div class="deadline-warning expired">締切を過ぎています</div>';
      }
    }

    return `
      <div class="event-card" onclick="window.location.href='event-detail.html?id=${event.event_id}'">
        <div class="event-card-header">
          <div class="event-date ${isPast ? 'past' : 'upcoming'}">
            <div class="date-day">${eventDate.getDate()}</div>
            <div class="date-month">${eventDate.getMonth() + 1}月</div>
            <div class="date-year">${eventDate.getFullYear()}</div>
          </div>
          <div class="event-info">
            <h3 class="event-name">${escapeHtml(event.title)}</h3>
            <div class="event-meta">
              <span class="event-time">⏰ ${event.start_time ? formatTime(event.start_time) + (event.end_time ? ' - ' + formatTime(event.end_time) : '') : '未設定'}</span>
              <span class="event-location">📍 ${escapeHtml(event.location || '未設定')}</span>
            </div>
            ${event.fee_amount ? `<div class="event-fee">💰 ¥${event.fee_amount.toLocaleString()}</div>` : ''}
          </div>
        </div>

        ${deadlineWarning}

        <div class="event-card-body">
          ${event.description ? `
            <p class="event-description">${escapeHtml(event.description).substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
          ` : ''}
        </div>

        <div class="event-card-footer">
          <div class="attendance-status">
            <span class="status-label">あなたの出欠:</span>
            <span class="status-badge status-${attendanceStatus}">
              ${statusLabels[attendanceStatus]}
            </span>
          </div>
          ${event.stats ? `
            <div class="event-stats-mini">
              出席予定: ${event.stats.attendCount || 0}/${event.stats.totalMembers || 0}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  async refresh() {
    // キャッシュをクリアして最新データを取得
    API.clearAllCache();
    await this.loadEvents();
  }
}

// グローバル変数
let eventsList;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  eventsList = new EventsList();
  await eventsList.init();
});
