// ホームページ
class HomePage {
  constructor() {
    this.pendingEvents = [];
    this.upcomingEvents = [];
    this.stats = null;
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 更新ボタン
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }

    // QRコードボタン
    const showQrBtn = document.getElementById('showQrBtn');
    if (showQrBtn) {
      showQrBtn.addEventListener('click', () => {
        window.location.href = 'qr.html';
      });
    }
  }

  async loadData() {
    try {
      showLoading();
      await Promise.all([
        this.loadUpcomingEvents(),
        this.loadStats()
      ]);

      this.render();
    } catch (error) {
      showError('データの読み込みに失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  async loadUpcomingEvents() {
    try {
      const userInfo = Auth.getUserInfo();
      const result = await API.call('getEvents', {
        member_id: userInfo.memberId
      });

      if (result.success) {
        const now = new Date();
        const oneMonthLater = new Date(now);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        const twoMonthsLater = new Date(now);
        twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

        const futureEvents = (result.events || [])
          .filter(event => new Date(event.date) >= now)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 未登録のイベント（締切日あり、1カ月以内、未登録のみ、締切日が近い順）
        this.pendingEvents = futureEvents
          .filter(event => {
            if (event.my_attendance_status) return false; // 既に登録済みは除外
            if (!event.attendance_deadline) return false; // 締切日なしは除外

            const deadline = new Date(event.attendance_deadline);
            if (deadline < now) return false; // 締切過ぎは除外

            const eventDate = new Date(event.date);
            if (eventDate > oneMonthLater) return false; // イベント日が1カ月より先は除外

            return true;
          })
          .sort((a, b) => {
            // 締切日が近い順にソート
            const deadlineA = new Date(a.attendance_deadline);
            const deadlineB = new Date(b.attendance_deadline);
            return deadlineA - deadlineB;
          });

        // 今後のイベント（直近2カ月以内、全て表示）
        this.upcomingEvents = futureEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate <= twoMonthsLater;
        });
      } else {
        this.pendingEvents = [];
        this.upcomingEvents = [];
      }
    } catch (error) {
      console.error('イベントの読み込みエラー:', error);
      this.pendingEvents = [];
      this.upcomingEvents = [];
    }
  }

  async loadStats() {
    try {
      // TODO: API.getUserStatsを実装する
      // const response = await API.getUserStats();
      // this.stats = response.data || {};
      this.stats = {
        unpaidCount: 0,
        unpaidAmount: 0
      };
    } catch (error) {
      console.error('統計の読み込みエラー:', error);
      this.stats = {
        unpaidCount: 0,
        unpaidAmount: 0
      };
    }
  }

  render() {
    try {
      this.renderPendingEvents();
    } catch (error) {
      console.error('未登録イベントの表示エラー:', error);
    }

    try {
      this.renderUpcomingEvents();
    } catch (error) {
      console.error('今後のイベントの表示エラー:', error);
    }

    try {
      this.renderStats();
    } catch (error) {
      console.error('統計情報の表示エラー:', error);
    }

    try {
      this.renderQuickActions();
    } catch (error) {
      console.error('クイックアクションの表示エラー:', error);
    }
  }

  renderPendingEvents() {
    const section = document.getElementById('pendingSection');
    const container = document.getElementById('pendingEvents');
    if (!container || !section) return;

    if (!this.pendingEvents || this.pendingEvents.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    const html = this.pendingEvents.map(event => this.renderEventCard(event)).join('');
    container.innerHTML = html;
  }

  renderUpcomingEvents() {
    const container = document.getElementById('upcomingEvents');
    if (!container) return;

    if (this.upcomingEvents.length === 0) {
      container.innerHTML = '<p class="no-data">今後のイベントはありません</p>';
      return;
    }

    const html = this.upcomingEvents.map(event => this.renderEventCard(event)).join('');
    container.innerHTML = html;
  }

  renderEventCard(event) {
    const eventDate = new Date(event.date);
    const now = new Date();
    const eventMonth = eventDate.getMonth() + 1; // 1-12の月を取得

    // 何日後かを計算
    const daysUntil = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
    let daysText = '';
    if (daysUntil === 0) {
      daysText = '今日';
    } else if (daysUntil === 1) {
      daysText = '明日';
    } else if (daysUntil <= 7) {
      daysText = `${daysUntil}日後`;
    }

    // 出欠状況
    const attendanceStatus = event.my_attendance_status || '';
    let displayStatus = '';
    let statusClass = 'none';

    if (!attendanceStatus) {
      displayStatus = '未登録';
      statusClass = 'none';
    } else if (event.attendance_type === 'B') {
      // タイプB: selected_optionの値を表示
      displayStatus = attendanceStatus; // attendanceStatusにはselected_optionが入っている
      if (attendanceStatus === '欠席') {
        statusClass = 'absent';
      } else {
        // 欠席以外は出席扱い
        statusClass = 'attend';
      }
    } else {
      // タイプA: 通常の出席/欠席
      displayStatus = attendanceStatus;
      if (attendanceStatus === '出席') {
        statusClass = 'attend';
      } else if (attendanceStatus === '欠席') {
        statusClass = 'absent';
      }
    }

    // 締切チェック
    let deadlineWarning = '';
    if (event.attendance_deadline) {
      const deadline = new Date(event.attendance_deadline);
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      if (!attendanceStatus && daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
        deadlineWarning = `<span class="deadline-badge urgent">締切まで${daysUntilDeadline}日</span>`;
      } else if (!attendanceStatus && daysUntilDeadline < 0) {
        deadlineWarning = '<span class="deadline-badge expired">締切過ぎ</span>';
      }
    }

    // キャンセル料発生日のフォーマット
    let cancellationFeeText = '';
    if (event.cancellation_fee_date) {
      const feeDate = new Date(event.cancellation_fee_date);
      const evDate = new Date(event.date);
      const diffTime = evDate - feeDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const month = feeDate.getMonth() + 1;
      const day = feeDate.getDate();

      if (diffDays > 0) {
        cancellationFeeText = `${month}/${day}（${diffDays}日前）`;
      } else if (diffDays === 0) {
        cancellationFeeText = `${month}/${day}（当日）`;
      } else {
        cancellationFeeText = `${month}/${day}`;
      }
    }

    // 出欠締切のフォーマット
    let attendanceDeadlineText = '';
    if (event.attendance_deadline) {
      const deadline = new Date(event.attendance_deadline);
      const month = deadline.getMonth() + 1;
      const day = deadline.getDate();
      attendanceDeadlineText = `${month}/${day}`;
    }

    return `
      <div class="event-card-compact" onclick="window.location.href='event-detail.html?id=${event.event_id}'">
        <div class="event-date-badge month-${eventMonth}">
          <div class="date-day">${eventDate.getDate()}</div>
          <div class="date-month">${eventMonth}月</div>
          ${daysText ? `<div class="date-relative">${daysText}</div>` : ''}
        </div>

        <div class="event-content">
          <div class="event-header">
            <h4 class="event-name">${escapeHtml(event.title)}</h4>
            ${deadlineWarning}
          </div>

          <div class="event-meta">
            <span class="event-time">⏰ ${event.start_time ? formatTime(event.start_time) + (event.end_time ? ' - ' + formatTime(event.end_time) : '') : '未設定'}</span>
            ${event.location ? `<span class="event-location">📍 ${escapeHtml(event.location)}</span>` : ''}
            ${event.fee_amount > 0 ? `<span class="event-fee">💰 登録料: ¥${event.fee_amount.toLocaleString()}</span>` : ''}
            ${event.attendance_deadline ? `<span class="event-deadline">⏰ 出欠締切: ${attendanceDeadlineText}</span>` : ''}
            ${event.cancellation_fee_date ? `<span class="event-cancellation">💳 キャンセル料発生: ${cancellationFeeText}</span>` : ''}
          </div>

          <!-- 参加状況の簡易表示 -->
          <div class="event-participation-summary" style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; padding: 0.5rem 0; border-top: 1px solid var(--border-color);">
            <div style="display: flex; gap: 0.75rem; font-size: 0.813rem;">
              ${event.attend_count !== undefined ? `<span style="color: var(--success-color); font-weight: 600;">✓ ${event.attend_count}</span>` : ''}
              ${event.absent_count !== undefined ? `<span style="color: var(--text-secondary);">✗ ${event.absent_count}</span>` : ''}
              ${event.pending_count !== undefined ? `<span style="color: var(--warning-color);">? ${event.pending_count}</span>` : ''}
            </div>
          </div>

          <div class="event-status">
            <span class="status-badge status-${statusClass}">
              ${escapeHtml(displayStatus)}
            </span>
          </div>
        </div>

        <div class="event-arrow">→</div>
      </div>
    `;
  }

  renderStats() {
    if (!this.stats) return;

    // 今月の統計
    const monthlyAttendance = this.stats.monthlyAttendance || 0;
    const monthlyEvents = this.stats.monthlyEvents || 0;
    const attendanceRate = monthlyEvents > 0
      ? ((monthlyAttendance / monthlyEvents) * 100).toFixed(1)
      : 0;

    const monthlyAttendanceEl = document.getElementById('monthlyAttendance');
    if (monthlyAttendanceEl) monthlyAttendanceEl.textContent = monthlyAttendance;

    const monthlyEventsEl = document.getElementById('monthlyEvents');
    if (monthlyEventsEl) monthlyEventsEl.textContent = monthlyEvents;

    const attendanceRateEl = document.getElementById('attendanceRate');
    if (attendanceRateEl) attendanceRateEl.textContent = attendanceRate;

    // 出席率バー
    const rateBar = document.querySelector('.rate-bar');
    if (rateBar) {
      rateBar.style.width = attendanceRate + '%';
    }

    // 年間統計
    const yearlyAttendanceEl = document.getElementById('yearlyAttendance');
    if (yearlyAttendanceEl) yearlyAttendanceEl.textContent = this.stats.yearlyAttendance || 0;

    const yearlyEventsEl = document.getElementById('yearlyEvents');
    if (yearlyEventsEl) yearlyEventsEl.textContent = this.stats.yearlyEvents || 0;

    // 未払い情報
    const unpaidCount = this.stats.unpaidCount || 0;
    const unpaidAmount = this.stats.unpaidAmount || 0;

    const unpaidCountEl = document.getElementById('unpaidCount');
    if (unpaidCountEl) unpaidCountEl.textContent = unpaidCount;

    const unpaidAmountEl = document.getElementById('unpaidAmount');
    if (unpaidAmountEl) unpaidAmountEl.textContent = unpaidAmount.toLocaleString();

    // 未払いがある場合は警告表示
    const unpaidWarning = document.getElementById('unpaidWarning');
    if (unpaidWarning) {
      if (unpaidCount > 0) {
        unpaidWarning.style.display = 'block';
      } else {
        unpaidWarning.style.display = 'none';
      }
    }
  }

  renderQuickActions() {
    const container = document.getElementById('quickActions');
    if (!container) return;

    // 未登録のイベント数を確認
    const unregisteredEvents = this.upcomingEvents.filter(e =>
      !e.my_attendance_status
    ).length;

    // 未払いの支払い数
    const unpaidCount = this.stats.unpaidCount || 0;

    const actions = [
      {
        icon: '📅',
        title: 'イベント一覧',
        description: '今後のイベントを確認',
        link: 'events.html',
        badge: unregisteredEvents > 0 ? unregisteredEvents : null
      },
      {
        icon: '📊',
        title: '出欠履歴',
        description: '過去の参加記録を確認',
        link: 'history.html'
      },
      {
        icon: '💰',
        title: '支払い管理',
        description: '支払い状況を確認',
        link: 'receipts.html',
        badge: unpaidCount > 0 ? unpaidCount : null
      },
      {
        icon: '👤',
        title: 'プロフィール',
        description: '個人情報を管理',
        link: 'profile.html'
      }
    ];

    const html = actions.map(action => `
      <a href="${action.link}" class="action-card">
        <div class="action-icon">${action.icon}</div>
        <div class="action-content">
          <h4 class="action-title">
            ${action.title}
            ${action.badge ? `<span class="action-badge">${action.badge}</span>` : ''}
          </h4>
          <p class="action-description">${action.description}</p>
        </div>
      </a>
    `).join('');

    container.innerHTML = html;
  }

  async refresh() {
    await this.loadData();
    showSuccess('更新しました');
  }
}

// グローバル変数
let homePage;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  // 管理者の場合、管理画面リンクとボタンを表示
  Auth.showAdminLinks();

  // ユーザー名を表示
  const userInfo = Auth.getUserInfo();
  const welcomeNameElement = document.getElementById('welcomeName');
  if (welcomeNameElement && userInfo.name) {
    welcomeNameElement.textContent = userInfo.name;
  }

  homePage = new HomePage();
  await homePage.init();
});
