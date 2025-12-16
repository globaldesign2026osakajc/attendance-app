// 管理者イベント一覧管理
class AdminEvents {
  constructor() {
    this.events = [];
    this.filters = {
      status: 'all',
      search: '',
      sort: 'date_desc'
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

    // ステータスフィルター
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderEvents();
      });
    }

    // ソート
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.filters.sort = e.target.value;
        this.renderEvents();
      });
    }

    // 新規作成ボタン
    const createBtn = document.getElementById('createEventBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        window.location.href = 'event-form.html';
      });
    }
  }

  async loadEvents() {
    try {
      showLoading();
      const response = await AdminAPI.getEvents();
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
    const sortedEvents = this.sortEvents(filteredEvents);

    const container = document.getElementById('eventsList');
    if (!container) return;

    if (sortedEvents.length === 0) {
      container.innerHTML = '<p class="no-data">イベントがありません</p>';
      return;
    }

    const html = sortedEvents.map(event => this.renderEventCard(event)).join('');
    container.innerHTML = html;

    // イベントリスナーを設定
    this.attachEventCardListeners();
  }

  filterEvents() {
    let filtered = this.events;

    // ステータスフィルター
    if (this.filters.status !== 'all') {
      const now = new Date();
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        if (this.filters.status === 'upcoming') {
          return eventDate >= now;
        } else if (this.filters.status === 'past') {
          return eventDate < now;
        }
        return true;
      });
    }

    // 検索フィルター
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(search) ||
        (event.description && event.description.toLowerCase().includes(search))
      );
    }

    return filtered;
  }

  sortEvents(events) {
    const sorted = [...events];

    switch (this.filters.sort) {
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return sorted;
  }

  renderEventCard(event) {
    const eventDate = new Date(event.date);
    const now = new Date();
    const isPast = eventDate < now;
    const statusClass = isPast ? 'past' : 'upcoming';

    const attendanceRate = event.totalMembers > 0
      ? ((event.attendanceCount || 0) / event.totalMembers * 100).toFixed(1)
      : 0;

    return `
      <div class="event-card" data-event-id="${event.event_id}">
        <div class="event-card-header">
          <div class="event-date ${statusClass}">
            <div class="date-day">${eventDate.getDate()}</div>
            <div class="date-month">${eventDate.getMonth() + 1}月</div>
          </div>
          <div class="event-info">
            <h3 class="event-name">${escapeHtml(event.title)}</h3>
            <div class="event-meta">
              <span class="event-time">⏰ ${event.start_time ? formatTime(event.start_time) + (event.end_time ? ' - ' + formatTime(event.end_time) : '') : '未設定'}</span>
              <span class="event-location">📍 ${escapeHtml(event.location || '未設定')}</span>
              ${event.fee_amount ? `<span class="event-fee">💰 ¥${event.fee_amount.toLocaleString()}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="event-card-body">
          <div class="event-stats">
            <div class="stat-item">
              <div class="stat-label">出席</div>
              <div class="stat-value">${event.attendanceCount || 0}/${event.totalMembers || 0}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">出席率</div>
              <div class="stat-value">${attendanceRate}%</div>
            </div>
            ${event.fee_amount ? `
              <div class="stat-item">
                <div class="stat-label">収入</div>
                <div class="stat-value">¥${((event.paidCount || 0) * event.fee_amount).toLocaleString()}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="event-card-footer">
          <button class="btn-secondary btn-sm" onclick="adminEvents.editEvent('${event.event_id}')">
            編集
          </button>
          <button class="btn-secondary btn-sm" onclick="adminEvents.viewAttendances('${event.event_id}')">
            出欠確認
          </button>
          <button class="btn-secondary btn-sm" onclick="adminEvents.duplicateEvent('${event.event_id}')">
            複製
          </button>
          <button class="btn-danger btn-sm" onclick="adminEvents.deleteEvent('${event.event_id}')">
            削除
          </button>
        </div>
      </div>
    `;
  }

  attachEventCardListeners() {
    const cards = document.querySelectorAll('.event-card');
    cards.forEach(card => {
      const eventName = card.querySelector('.event-name');
      if (eventName) {
        eventName.style.cursor = 'pointer';
        eventName.addEventListener('click', () => {
          const eventId = card.dataset.eventId;
          this.viewAttendances(eventId);
        });
      }
    });
  }

  editEvent(eventId) {
    window.location.href = `event-form.html?id=${eventId}`;
  }

  viewAttendances(eventId) {
    window.location.href = `event-detail.html?id=${eventId}`;
  }

  async duplicateEvent(eventId) {
    if (!confirm('このイベントを複製しますか？')) return;

    try {
      showLoading();
      const event = this.events.find(e => e.event_id === eventId);
      if (!event) throw new Error('イベントが見つかりません');

      const newEvent = {
        ...event,
        title: event.title + ' (コピー)',
        date: event.date
      };
      delete newEvent.event_id;
      delete newEvent.rowIndex;

      await AdminAPI.createEvent(newEvent);
      showSuccess('イベントを複製しました');
      await this.loadEvents();
    } catch (error) {
      showError('イベントの複製に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async deleteEvent(eventId) {
    if (!confirm('このイベントを削除しますか？\nこの操作は取り消せません。')) return;

    try {
      showLoading();
      await AdminAPI.deleteEvent(eventId);
      showSuccess('イベントを削除しました');
      await this.loadEvents();
    } catch (error) {
      showError('イベントの削除に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }
}

// グローバル変数
let adminEvents;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  adminEvents = new AdminEvents();
  await adminEvents.init();
});
