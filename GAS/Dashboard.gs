/**
 * Dashboard.gs - ダッシュボード専用API
 *
 * 管理者ダッシュボード用のサマリーデータを高速に取得
 */

/**
 * ダッシュボードサマリー取得（管理者のみ）
 */
function getDashboardSummary(token) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  try {
    // 全データを一度に取得
    const events = getSheetData('events');
    const members = getSheetData('members');
    const attendances = getSheetData('attendance');
    const payments = getSheetData('payments');
    const checkins = getSheetData('checkin');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 最重要指標を計算
    const keyMetrics = calculateKeyMetrics(events, members, attendances, payments, checkins, today);

    // 2. アラートを生成
    const alerts = generateAlerts(events, payments, today);

    // 3. タスクを生成
    const tasks = generateTasks(events, members, attendances, payments, checkins, today);

    // 4. 今月の統計
    const monthlyStats = calculateMonthlyStats(events, attendances, payments, today);

    // 5. 今週のイベント
    const upcomingEvents = getUpcomingEvents(events, members, attendances, today, 7);

    // 6. 支払い状況サマリー
    const paymentSummary = calculatePaymentSummary(payments);

    return {
      success: true,
      key_metrics: keyMetrics,
      alerts: alerts,
      tasks: tasks,
      monthly_stats: monthlyStats,
      upcoming_events: upcomingEvents,
      payment_summary: paymentSummary
    };

  } catch (error) {
    Logger.log('getDashboardSummary error: ' + error.toString());
    return {
      success: false,
      error: 'ダッシュボードデータの取得に失敗しました: ' + error.toString()
    };
  }
}

/**
 * 最重要指標を計算
 */
function calculateKeyMetrics(events, members, attendances, payments, checkins, today) {
  // 未払い件数と金額
  const unpaidPayments = payments.filter(p => !p.paid);
  const unpaidCount = unpaidPayments.length;
  const unpaidAmount = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 直近イベント
  const futureEvents = events
    .filter(e => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let nextEvent = null;
  if (futureEvents.length > 0) {
    const event = futureEvents[0];
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));

    // 出席状況を計算
    const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
    const attendCount = eventAttendances.filter(a => {
      if (event.attendance_type === 'B') {
        return a.status !== '欠席' && a.status !== '不参加';
      } else {
        return a.status === '出席';
      }
    }).length;
    const pendingCount = members.length - eventAttendances.length;

    nextEvent = {
      event_id: event.event_id,
      title: event.title,
      date: event.date,
      days_until: daysUntil,
      attend_count: attendCount,
      pending_count: pendingCount
    };
  }

  // 出欠未登録者数（直近イベント）
  const pendingRegistrations = nextEvent ? nextEvent.pending_count : 0;

  // キャンセル料対象件数と金額
  const cancellationFees = calculateCancellationFees(events, attendances, payments, checkins, today);
  const cancellationFeeCount = cancellationFees.length;
  const cancellationFeeAmount = cancellationFees.reduce((sum, c) => sum + (c.amount || 0), 0);

  return {
    unpaid_count: unpaidCount,
    unpaid_amount: unpaidAmount,
    next_event: nextEvent,
    pending_registrations: pendingRegistrations,
    cancellation_fee_count: cancellationFeeCount,
    cancellation_fee_amount: cancellationFeeAmount
  };
}

/**
 * キャンセル料対象を計算
 */
function calculateCancellationFees(events, attendances, payments, checkins, today) {
  const cancellationFees = [];

  events.forEach(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);

    // 開催済みイベントのみ
    if (eventDate >= today) return;

    const eventAttendances = attendances.filter(a => a.event_id === event.event_id);

    eventAttendances.forEach(attendance => {
      // キャンセル料発生条件1: キャンセル料発生日以降に不参加に変更
      if (event.cancellation_fee_date && attendance.status === '不参加') {
        const cancelDate = new Date(event.cancellation_fee_date);
        cancelDate.setHours(0, 0, 0, 0);
        const registeredAt = new Date(attendance.registered_at);
        registeredAt.setHours(0, 0, 0, 0);

        if (registeredAt >= cancelDate) {
          const payment = payments.find(p =>
            p.event_id === event.event_id &&
            p.member_id === attendance.member_id
          );

          if (payment && payment.amount > 0) {
            cancellationFees.push({
              event_id: event.event_id,
              member_id: attendance.member_id,
              amount: payment.amount,
              reason: 'late_cancellation'
            });
          }
        }
      }

      // キャンセル料発生条件2: 出席登録したのにチェックインなし
      if (attendance.status === '出席') {
        const checkin = checkins.find(c =>
          c.event_id === event.event_id &&
          c.member_id === attendance.member_id
        );

        if (!checkin) {
          const payment = payments.find(p =>
            p.event_id === event.event_id &&
            p.member_id === attendance.member_id
          );

          if (payment && payment.amount > 0) {
            cancellationFees.push({
              event_id: event.event_id,
              member_id: attendance.member_id,
              amount: payment.amount,
              reason: 'no_show'
            });
          }
        }
      }
    });
  });

  return cancellationFees;
}

/**
 * アラートを生成
 */
function generateAlerts(events, payments, today) {
  const alerts = [];

  // 支払い期限が24時間以内のアラート
  const urgentPayments = events.filter(e => {
    if (!e.registration_deadline) return false;
    const deadline = new Date(e.registration_deadline);
    deadline.setHours(0, 0, 0, 0);
    const hoursUntil = (deadline - today) / (1000 * 60 * 60);
    return hoursUntil >= 0 && hoursUntil <= 24;
  });

  if (urgentPayments.length > 0) {
    urgentPayments.forEach(event => {
      const eventPayments = payments.filter(p =>
        p.event_id === event.event_id && !p.paid
      );

      if (eventPayments.length > 0) {
        alerts.push({
          type: 'danger',
          title: '支払い期限',
          message: `${event.title}の支払い期限が24時間以内です（未払い: ${eventPayments.length}名）`,
          action_url: `/admin/payments.html?event_id=${event.event_id}`,
          event_id: event.event_id,
          count: eventPayments.length
        });
      }
    });
  }

  // 出欠登録期限が48時間以内のアラート
  const urgentRegistrations = events.filter(e => {
    if (!e.attendance_deadline) return false;
    const deadline = new Date(e.attendance_deadline);
    deadline.setHours(0, 0, 0, 0);
    const hoursUntil = (deadline - today) / (1000 * 60 * 60);
    return hoursUntil >= 0 && hoursUntil <= 48;
  });

  if (urgentRegistrations.length > 0) {
    urgentRegistrations.forEach(event => {
      if (event.pending_count > 0) {
        alerts.push({
          type: 'warning',
          title: '出欠登録期限',
          message: `${event.title}の出欠登録期限が48時間以内です（未登録: ${event.pending_count}名）`,
          action_url: `/admin/events.html?id=${event.event_id}`,
          event_id: event.event_id,
          count: event.pending_count
        });
      }
    });
  }

  return alerts;
}

/**
 * タスクを生成
 */
function generateTasks(events, members, attendances, payments, checkins, today) {
  const tasks = [];

  events.forEach(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));

    // イベント当日リマインド
    if (daysUntil === 0) {
      tasks.push({
        id: `event_today_${event.event_id}`,
        type: 'reminder',
        priority: 'high',
        title: `【リマインド】${event.title}当日リマインドをLINEに送信`,
        description: '対象: 全体グループLINE',
        action: 'copy_reminder',
        event_id: event.event_id,
        reminder_type: 'event_today',
        message_template: generateReminderMessage(event, 'today', members, attendances)
      });

      // チェックイン準備タスク
      tasks.push({
        id: `checkin_${event.event_id}`,
        type: 'checkin',
        priority: 'high',
        title: `【チェックイン】${event.title}でQRチェックイン準備`,
        description: 'QRチェックイン画面を開く',
        action: 'open_checkin',
        event_id: event.event_id,
        action_url: `/admin/checkin.html?event_id=${event.event_id}`
      });
    }

    // イベント前日リマインド
    if (daysUntil === 1) {
      tasks.push({
        id: `event_1day_${event.event_id}`,
        type: 'reminder',
        priority: 'medium',
        title: `【リマインド】${event.title}前日リマインドをLINEに送信`,
        description: '対象: 全体グループLINE',
        action: 'copy_reminder',
        event_id: event.event_id,
        reminder_type: 'event_1day',
        message_template: generateReminderMessage(event, '1day', members, attendances)
      });
    }

    // イベント3日前リマインド
    if (daysUntil === 3) {
      tasks.push({
        id: `event_3days_${event.event_id}`,
        type: 'reminder',
        priority: 'low',
        title: `【リマインド】${event.title}3日前リマインドをLINEに送信`,
        description: '対象: 全体グループLINE',
        action: 'copy_reminder',
        event_id: event.event_id,
        reminder_type: 'event_3days',
        message_template: generateReminderMessage(event, '3days', members, attendances)
      });
    }

    // 登録期限前日・当日リマインド
    if (event.attendance_deadline) {
      const deadline = new Date(event.attendance_deadline);
      deadline.setHours(0, 0, 0, 0);
      const daysUntilDeadline = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline === 1) {
        const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
        const pendingCount = members.length - eventAttendances.length;

        tasks.push({
          id: `deadline_1day_${event.event_id}`,
          type: 'reminder',
          priority: 'medium',
          title: `【登録期限】${event.title}の出欠登録期限前日リマインド`,
          description: `対象: スタッフLINE（未登録者${pendingCount}名）`,
          action: 'copy_reminder',
          event_id: event.event_id,
          reminder_type: 'deadline_1day',
          message_template: generateReminderMessage(event, 'deadline_1day', members, attendances)
        });
      }

      if (daysUntilDeadline === 0) {
        const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
        const pendingCount = members.length - eventAttendances.length;

        tasks.push({
          id: `deadline_today_${event.event_id}`,
          type: 'reminder',
          priority: 'high',
          title: `【登録期限】${event.title}の出欠登録期限当日リマインド`,
          description: '対象: 全体グループLINE + スタッフLINE',
          action: 'copy_reminder',
          event_id: event.event_id,
          reminder_type: 'deadline_today',
          message_template: generateReminderMessage(event, 'deadline_today', members, attendances)
        });
      }
    }

    // キャンセル料前日・当日リマインド
    if (event.cancellation_fee_date) {
      const cancelDate = new Date(event.cancellation_fee_date);
      cancelDate.setHours(0, 0, 0, 0);
      const daysUntilCancel = Math.floor((cancelDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilCancel === 1) {
        tasks.push({
          id: `cancel_1day_${event.event_id}`,
          type: 'reminder',
          priority: 'high',
          title: `【キャンセル料】${event.title}のキャンセル料発生前日リマインド`,
          description: '対象: 全体グループLINE',
          action: 'copy_reminder',
          event_id: event.event_id,
          reminder_type: 'cancel_1day',
          message_template: generateReminderMessage(event, 'cancel_1day', members, attendances)
        });
      }

      if (daysUntilCancel === 0) {
        tasks.push({
          id: `cancel_today_${event.event_id}`,
          type: 'reminder',
          priority: 'high',
          title: `【キャンセル料】${event.title}のキャンセル料発生当日リマインド`,
          description: '対象: 全体グループLINE',
          action: 'copy_reminder',
          event_id: event.event_id,
          reminder_type: 'cancel_today',
          message_template: generateReminderMessage(event, 'cancel_today', members, attendances)
        });
      }
    }

    // 未登録者フォロー
    if (daysUntil >= 0 && daysUntil <= 7) {
      const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
      const pendingCount = members.length - eventAttendances.length;

      if (pendingCount > 0) {
        tasks.push({
          id: `unregistered_${event.event_id}`,
          type: 'follow_up',
          priority: 'medium',
          title: `【未登録】${event.title}の出欠未登録者${pendingCount}名に連絡`,
          description: '未登録者リストを確認',
          action: 'show_unregistered',
          event_id: event.event_id,
          action_url: `/admin/events.html?id=${event.event_id}#unregistered`
        });
      }
    }
  });

  // 未払い確認タスク（5件以上で表示）
  const unpaidPayments = payments.filter(p => !p.paid);
  if (unpaidPayments.length >= 5) {
    tasks.push({
      id: 'unpaid_follow_up',
      type: 'payment',
      priority: 'medium',
      title: `【未払い】未払い${unpaidPayments.length}件を確認`,
      description: '支払い管理画面で確認',
      action: 'open_payments',
      action_url: '/admin/payments.html'
    });
  }

  // 優先度順にソート
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tasks;
}

/**
 * リマインドメッセージを生成
 */
function generateReminderMessage(event, reminderType, members, attendances) {
  const eventDate = formatDateJapanese(event.date);
  const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
  const attendCount = eventAttendances.filter(a => {
    if (event.attendance_type === 'B') {
      return a.status !== '欠席' && a.status !== '不参加';
    } else {
      return a.status === '出席';
    }
  }).length;
  const pendingCount = members.length - eventAttendances.length;

  let message = '';

  switch (reminderType) {
    case 'today':
      message = `【本日開催】${event.title}のお知らせ\n\n`;
      message += `本日${eventDate}より${event.title}を開催します。\n\n`;
      if (event.location) message += `会場: ${event.location}\n`;
      if (event.start_time) message += `開始: ${event.start_time}\n`;
      if (event.dress_code) message += `ドレスコード: ${event.dress_code}\n`;
      message += `\nお忘れ物のないようご参加ください！`;
      break;

    case '1day':
      message = `【明日開催】${event.title}のリマインド\n\n`;
      message += `明日${eventDate}より${event.title}を開催します。\n\n`;
      message += `出席登録: ${attendCount}名\n`;
      if (pendingCount > 0) {
        message += `未登録: ${pendingCount}名（至急ご登録ください）\n`;
      }
      if (event.location) message += `\n会場: ${event.location}\n`;
      message += `\n皆様のご参加をお待ちしております！`;
      break;

    case '3days':
      message = `【3日後開催】${event.title}のお知らせ\n\n`;
      message += `${eventDate}に${event.title}を開催します。\n\n`;
      if (pendingCount > 0) {
        message += `出席登録がまだの方は、お早めにご登録ください。\n`;
      }
      if (event.attendance_deadline) {
        message += `登録期限: ${formatDateJapanese(event.attendance_deadline)}\n`;
      }
      if (event.fee_amount > 0) {
        message += `\n参加費: ¥${event.fee_amount.toLocaleString()}\n`;
      }
      if (event.location) message += `会場: ${event.location}\n`;
      break;

    case 'deadline_1day':
      message = `【スタッフ連絡】出欠登録期限前日\n\n`;
      message += `${event.title}（${eventDate}開催）の出欠登録期限が明日です。\n\n`;
      message += `未登録者: ${pendingCount}名\n\n`;
      message += `全体LINEでリマインドをお願いします。`;
      break;

    case 'deadline_today':
      message = `【本日締切】${event.title}の出欠登録\n\n`;
      message += `本日が${event.title}（${eventDate}開催）の出欠登録期限です！\n\n`;
      if (pendingCount > 0) {
        message += `まだ登録していない方は、本日中にご登録をお願いします。\n`;
      }
      message += `\n登録はアプリから: ${getAppUrl()}`;
      break;

    case 'cancel_1day':
      message = `【重要】キャンセル料発生のお知らせ\n\n`;
      message += `${event.title}（${eventDate}開催）について、明日以降のキャンセルはキャンセル料が発生します。\n\n`;
      if (event.cancellation_fee) {
        message += `キャンセル料: ¥${event.cancellation_fee.toLocaleString()}\n\n`;
      }
      message += `やむを得ずキャンセルされる場合は、本日中にアプリから欠席登録をお願いします。`;
      break;

    case 'cancel_today':
      message = `【注意】本日以降のキャンセルについて\n\n`;
      message += `${event.title}（${eventDate}開催）について、本日以降のキャンセルはキャンセル料が発生しますのでご注意ください。\n\n`;
      if (event.cancellation_fee) {
        message += `キャンセル料: ¥${event.cancellation_fee.toLocaleString()}\n\n`;
      }
      message += `出席登録済みの方は必ずご参加をお願いします。`;
      break;
  }

  return message;
}

/**
 * 今月の統計を計算
 */
function calculateMonthlyStats(events, attendances, payments, today) {
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  // 今月のイベント数
  const monthlyEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate.getMonth() === thisMonth && eventDate.getFullYear() === thisYear;
  });

  // 今月の出席率（開催済みイベントのみ）
  const completedEvents = monthlyEvents.filter(e => {
    const eventDate = new Date(e.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  });

  let attendanceRate = 0;
  if (completedEvents.length > 0) {
    let totalAttend = 0;
    let totalExpected = 0;

    completedEvents.forEach(event => {
      const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
      const attendCount = eventAttendances.filter(a => {
        if (event.attendance_type === 'B') {
          return a.status !== '欠席' && a.status !== '不参加';
        } else {
          return a.status === '出席';
        }
      }).length;

      totalAttend += attendCount;
      totalExpected += eventAttendances.length;
    });

    if (totalExpected > 0) {
      attendanceRate = Math.round((totalAttend / totalExpected) * 100 * 10) / 10;
    }
  }

  // 今月の売上（支払い済みのみ）
  const monthlyRevenue = payments
    .filter(p => {
      if (!p.paid || !p.paid_at) return false;
      const paidDate = new Date(p.paid_at);
      return paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    event_count: monthlyEvents.length,
    attendance_rate: attendanceRate,
    revenue: monthlyRevenue
  };
}

/**
 * 今後のイベントを取得
 */
function getUpcomingEvents(events, members, attendances, today, days) {
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const upcomingEvents = events
    .filter(e => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today && eventDate <= futureDate;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return upcomingEvents.map(event => {
    const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
    const attendCount = eventAttendances.filter(a => {
      if (event.attendance_type === 'B') {
        return a.status !== '欠席' && a.status !== '不参加';
      } else {
        return a.status === '出席';
      }
    }).length;
    const pendingCount = members.length - eventAttendances.length;

    return {
      event_id: event.event_id,
      title: event.title,
      date: event.date,
      attend_count: attendCount,
      pending_count: pendingCount
    };
  });
}

/**
 * 支払い状況サマリーを計算
 */
function calculatePaymentSummary(payments) {
  const unpaid = payments.filter(p => !p.paid);
  const paid = payments.filter(p => p.paid);

  return {
    unpaid: {
      count: unpaid.length,
      amount: unpaid.reduce((sum, p) => sum + (p.amount || 0), 0)
    },
    paid: {
      count: paid.length,
      amount: paid.reduce((sum, p) => sum + (p.amount || 0), 0)
    }
  };
}

/**
 * 日付を日本語形式でフォーマット
 */
function formatDateJapanese(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${month}/${day}（${dayOfWeek}）`;
}

/**
 * アプリURLを取得
 */
function getAppUrl() {
  // 本番環境のURLを設定してください
  return 'https://globaldesign2026osakajc.github.io/attendance-app/';
}
