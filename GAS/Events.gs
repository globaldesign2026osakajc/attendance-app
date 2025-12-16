/**
 * Events.gs - イベント管理
 *
 * イベントの取得、登録、更新、削除
 */

/**
 * イベント一覧取得
 */
function getEvents(token, filters, memberId) {
  const events = getSheetData('events');

  // デバッグログ
  Logger.log('取得したイベント数: ' + events.length);
  if (events.length > 0) {
    Logger.log('最初のイベント: ' + JSON.stringify(events[0]));
  }

  // 出席状況を取得（全イベントの統計とユーザーの出席状況）
  const attendanceSheet = getSheet('attendance');
  const attendanceData = attendanceSheet.getDataRange().getValues();
  const attendanceHeaders = attendanceData[0];

  const eventIdIndex = attendanceHeaders.indexOf('event_id');
  const memberIdIndex = attendanceHeaders.indexOf('member_id');
  const statusIndex = attendanceHeaders.indexOf('status');

  // イベントタイプのマップを作成
  const eventTypeMap = {};
  events.forEach(event => {
    eventTypeMap[event.event_id] = event.attendance_type || 'A';
  });

  // イベントごとの出席統計をカウント
  const statsMap = {};
  const userAttendanceMap = {};

  for (let i = 1; i < attendanceData.length; i++) {
    const eventId = attendanceData[i][eventIdIndex];
    const status = attendanceData[i][statusIndex];
    const currentMemberId = attendanceData[i][memberIdIndex];
    const eventType = eventTypeMap[eventId] || 'A';

    // 統計情報をカウント
    if (!statsMap[eventId]) {
      statsMap[eventId] = { attend: 0, official_absence: 0, absent: 0 };
    }

    // タイプAの場合: 出席/公欠/欠席を個別にカウント
    // タイプBの場合: 欠席以外を出席としてカウント
    if (eventType === 'A') {
      if (status === '出席') {
        statsMap[eventId].attend++;
      } else if (status === '公欠') {
        statsMap[eventId].official_absence++;
      } else if (status === '欠席') {
        statsMap[eventId].absent++;
      }
    } else if (eventType === 'B') {
      if (status === '欠席') {
        statsMap[eventId].absent++;
      } else if (status) {
        // 欠席以外はすべて出席としてカウント
        statsMap[eventId].attend++;
      }
    }

    // ユーザーの出席状況を記録
    if (memberId && currentMemberId === memberId) {
      userAttendanceMap[eventId] = status;
    }
  }

  // 全メンバー数を取得
  const memberSheet = getSheet('members');
  const totalMembers = memberSheet.getLastRow() - 1; // ヘッダー行を除く

  // 各イベントに統計情報とユーザーの出席状況を追加
  events.forEach(event => {
    const stats = statsMap[event.event_id] || { attend: 0, official_absence: 0, absent: 0 };
    event.attend_count = stats.attend;
    event.official_absence_count = stats.official_absence;
    event.absent_count = stats.absent;
    event.pending_count = totalMembers - stats.attend - stats.official_absence - stats.absent;

    if (memberId) {
      event.my_attendance_status = userAttendanceMap[event.event_id] || '';
    }
  });

  // フィルタリング処理
  let filteredEvents = events;

  // 日付フィルター
  if (filters && filters.date) {
    filteredEvents = filteredEvents.filter(event => event.date === filters.date);
  }

  // タグフィルター
  if (filters && filters.tag) {
    filteredEvents = filteredEvents.filter(event => {
      return event.tags && event.tags.includes(filters.tag);
    });
  }

  // 主催者フィルター
  if (filters && filters.host) {
    filteredEvents = filteredEvents.filter(event => event.host === filters.host);
  }

  // 日付でソート（降順）
  filteredEvents.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;
  });

  return {
    success: true,
    events: filteredEvents
  };
}

/**
 * イベント詳細取得
 */
function getEventDetail(token, eventId, memberId) {
  if (!eventId) {
    return {success: false, error: 'イベントIDが必要です'};
  }

  const event = findRow('events', 'event_id', eventId);

  if (!event) {
    return {success: false, error: 'イベントが見つかりません'};
  }

  // display_fieldsをパース
  if (event.display_fields) {
    event.display_fields = parseJSON(event.display_fields);
  }

  // custom_optionsをパース
  if (event.custom_options) {
    event.custom_options = parseJSON(event.custom_options);
  }

  // participation_optionsをパース
  if (event.participation_options) {
    event.participation_options = parseJSON(event.participation_options);
  }

  // ユーザーの出席状況を取得
  if (memberId) {
    const attendanceSheet = getSheet('attendance');
    const attendanceData = attendanceSheet.getDataRange().getValues();
    const attendanceHeaders = attendanceData[0];

    const eventIdIndex = attendanceHeaders.indexOf('event_id');
    const memberIdIndex = attendanceHeaders.indexOf('member_id');
    const statusIndex = attendanceHeaders.indexOf('status');
    const memoIndex = attendanceHeaders.indexOf('memo');

    for (let i = 1; i < attendanceData.length; i++) {
      if (attendanceData[i][eventIdIndex] === eventId &&
          attendanceData[i][memberIdIndex] === memberId) {
        event.my_attendance_status = attendanceData[i][statusIndex] || '';
        event.my_reason = attendanceData[i][memoIndex] || '';
        break;
      }
    }
  }

  // 出席状況の統計を取得
  const attendanceSheet2 = getSheet('attendance');
  const attendanceData2 = attendanceSheet2.getDataRange().getValues();
  const attendanceHeaders2 = attendanceData2[0];

  const eventIdIndex2 = attendanceHeaders2.indexOf('event_id');
  const statusIndex2 = attendanceHeaders2.indexOf('status');

  let attendCount = 0;
  let officialAbsenceCount = 0;
  let absentCount = 0;
  const eventType = event.attendance_type || 'A';

  for (let i = 1; i < attendanceData2.length; i++) {
    if (attendanceData2[i][eventIdIndex2] === eventId) {
      const status = attendanceData2[i][statusIndex2];

      // タイプAの場合: 出席/公欠/欠席を個別にカウント
      // タイプBの場合: 欠席以外を出席としてカウント
      if (eventType === 'A') {
        if (status === '出席') {
          attendCount++;
        } else if (status === '公欠') {
          officialAbsenceCount++;
        } else if (status === '欠席') {
          absentCount++;
        }
      } else if (eventType === 'B') {
        if (status === '欠席') {
          absentCount++;
        } else if (status) {
          // 欠席以外はすべて出席としてカウント
          attendCount++;
        }
      }
    }
  }

  // 全メンバー数を取得
  const memberSheet = getSheet('members');
  const totalMembers = memberSheet.getLastRow() - 1; // ヘッダー行を除く

  event.attend_count = attendCount;
  event.official_absence_count = officialAbsenceCount;
  event.absent_count = absentCount;
  event.pending_count = totalMembers - attendCount - officialAbsenceCount - absentCount;

  return {
    success: true,
    event: event
  };
}

/**
 * イベント登録（管理者のみ）
 */
function addEvent(token, dataStr) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const data = parseJSON(dataStr);

  if (!data || !data.title || !data.date) {
    return {success: false, error: '必須項目が不足しています'};
  }

  const sheet = getSheet('events');
  const eventId = generateUniqueId('EVT', sheet);

  // display_fieldsをJSON文字列に変換
  if (data.display_fields && typeof data.display_fields === 'object') {
    data.display_fields = JSON.stringify(data.display_fields);
  }

  // custom_optionsをJSON文字列に変換
  if (data.custom_options && typeof data.custom_options === 'object') {
    data.custom_options = JSON.stringify(data.custom_options);
  }

  // participation_optionsをJSON文字列に変換
  if (data.participation_options && typeof data.participation_options === 'object') {
    data.participation_options = JSON.stringify(data.participation_options);
  }

  const newEvent = {
    event_id: eventId,
    title: data.title,
    date: data.date,
    start_time: data.start_time || '',
    end_time: data.end_time || '',
    location: data.location || '',
    map_url: data.map_url || '',
    host: data.host || '',
    description: data.description || '',
    attendance_type: data.attendance_type || 'A',
    custom_options: data.custom_options || '',
    participation_options: data.participation_options || '',
    memo: data.memo || '',
    urgent: data.urgent || false,
    attendance_deadline: data.attendance_deadline || '',
    registration_deadline: data.registration_deadline || '',
    cancellation_fee_date: data.cancellation_fee_date || '',
    fee_amount: data.fee_amount || 0,
    fee_currency: data.fee_currency || 'JPY',
    payment_methods: data.payment_methods || '',
    dress_code: data.dress_code || '',
    dress_code_note: data.dress_code_note || '',
    tags: data.tags || '',
    notes: data.notes || '',
    target_group: data.target_group || '全員',
    visibility: data.visibility || '全員に公開',
    qr_enabled: data.qr_enabled !== undefined ? data.qr_enabled : true,
    csv_enabled: data.csv_enabled !== undefined ? data.csv_enabled : true,
    calendar_sync: data.calendar_sync !== undefined ? data.calendar_sync : false,
    display_fields: data.display_fields || '{}',
    receipt_note_default: data.receipt_note_default || '',
    receipt_enabled: data.receipt_enabled !== undefined ? data.receipt_enabled : false
  };

  addRow('events', newEvent);

  // Googleカレンダー連携
  if (newEvent.calendar_sync && CALENDAR_ID) {
    syncToCalendar(newEvent);
  }

  return {
    success: true,
    event_id: eventId,
    message: 'イベントを登録しました'
  };
}

/**
 * イベント更新（管理者のみ）
 */
function updateEvent(token, dataStr) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const data = parseJSON(dataStr);

  if (!data || !data.event_id) {
    return {success: false, error: 'イベントIDが必要です'};
  }

  const event = findRow('events', 'event_id', data.event_id);

  if (!event) {
    return {success: false, error: 'イベントが見つかりません'};
  }

  // display_fieldsをJSON文字列に変換
  if (data.display_fields && typeof data.display_fields === 'object') {
    data.display_fields = JSON.stringify(data.display_fields);
  }

  // custom_optionsをJSON文字列に変換
  if (data.custom_options && typeof data.custom_options === 'object') {
    data.custom_options = JSON.stringify(data.custom_options);
  }

  // participation_optionsをJSON文字列に変換
  if (data.participation_options && typeof data.participation_options === 'object') {
    data.participation_options = JSON.stringify(data.participation_options);
  }

  updateRow('events', event.rowIndex, data);

  return {
    success: true,
    message: 'イベントを更新しました'
  };
}

/**
 * イベント削除（管理者のみ）
 */
function deleteEvent(token, eventId) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  if (!eventId) {
    return {success: false, error: 'イベントIDが必要です'};
  }

  const event = findRow('events', 'event_id', eventId);

  if (!event) {
    return {success: false, error: 'イベントが見つかりません'};
  }

  deleteRow('events', event.rowIndex);

  return {
    success: true,
    message: 'イベントを削除しました'
  };
}

/**
 * Googleカレンダー連携
 */
function syncToCalendar(event) {
  if (!CALENDAR_ID) {
    return;
  }

  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);

    if (!calendar) {
      return;
    }

    const startDate = new Date(event.date + ' ' + (event.start_time || '00:00'));
    const endDate = new Date(event.date + ' ' + (event.end_time || '23:59'));

    calendar.createEvent(
      event.title,
      startDate,
      endDate,
      {
        description: event.description || '',
        location: event.location || ''
      }
    );
  } catch (e) {
    Logger.log('Calendar sync error: ' + e.toString());
  }
}
