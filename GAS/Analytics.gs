/**
 * Analytics.gs - 分析機能
 *
 * 出席率分析、統計データ取得
 */

/**
 * 分析データ取得（管理者のみ）
 */
function getAnalytics(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const filterType = params.filter_type || 'all'; // 'all', 'position', 'affiliation', 'tag'
  const filterValue = params.filter_value || '';
  const startDate = params.start_date || '';
  const endDate = params.end_date || '';

  const events = getSheetData('events');
  const attendances = getSheetData('attendance');
  const members = getSheetData('members');
  const checkins = getSheetData('checkin');

  // 期間フィルター
  let filteredEvents = events;

  if (startDate) {
    filteredEvents = filteredEvents.filter(e => e.date >= startDate);
  }

  if (endDate) {
    filteredEvents = filteredEvents.filter(e => e.date <= endDate);
  }

  // タグフィルター
  if (filterType === 'tag' && filterValue) {
    filteredEvents = filteredEvents.filter(e => e.tags && e.tags.includes(filterValue));
  }

  // メンバーフィルター
  let filteredMembers = members;

  if (filterType === 'position' && filterValue) {
    filteredMembers = filteredMembers.filter(m => m.position === filterValue);
  }

  if (filterType === 'affiliation' && filterValue) {
    filteredMembers = filteredMembers.filter(m => m.affiliation === filterValue);
  }

  // 分析データ計算
  const result = {
    total_events: filteredEvents.length,
    total_members: filteredMembers.length,
    attendance_rate: 0,
    member_stats: [],
    event_stats: []
  };

  // メンバー別統計
  filteredMembers.forEach(member => {
    let totalEvents = 0;
    let attendedEvents = 0;
    let checkedInEvents = 0;

    filteredEvents.forEach(event => {
      const attendance = attendances.find(a => a.event_id === event.event_id && a.member_id === member.member_id);

      if (attendance) {
        totalEvents++;

        if (attendance.status === '参加') {
          attendedEvents++;
        }

        const checkin = checkins.find(c => c.event_id === event.event_id && c.member_id === member.member_id);
        if (checkin) {
          checkedInEvents++;
        }
      }
    });

    const attendanceRate = totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0;
    const checkinRate = attendedEvents > 0 ? Math.round((checkedInEvents / attendedEvents) * 100) : 0;

    result.member_stats.push({
      member_id: member.member_id,
      member_name: member.name,
      affiliation: member.affiliation,
      position: member.position,
      total_events: totalEvents,
      attended_events: attendedEvents,
      checked_in_events: checkedInEvents,
      attendance_rate: attendanceRate,
      checkin_rate: checkinRate
    });
  });

  // イベント別統計
  filteredEvents.forEach(event => {
    const eventAttendances = attendances.filter(a => a.event_id === event.event_id);
    const attendedCount = eventAttendances.filter(a => a.status === '参加').length;
    const notAttendedCount = eventAttendances.filter(a => a.status === '不参加').length;
    const undecidedCount = eventAttendances.filter(a => a.status === '未定').length;
    const checkinCount = checkins.filter(c => c.event_id === event.event_id).length;

    const attendanceRate = eventAttendances.length > 0 ? Math.round((attendedCount / eventAttendances.length) * 100) : 0;
    const checkinRate = attendedCount > 0 ? Math.round((checkinCount / attendedCount) * 100) : 0;

    result.event_stats.push({
      event_id: event.event_id,
      event_title: event.title,
      event_date: event.date,
      total_responses: eventAttendances.length,
      attended: attendedCount,
      not_attended: notAttendedCount,
      undecided: undecidedCount,
      checked_in: checkinCount,
      attendance_rate: attendanceRate,
      checkin_rate: checkinRate
    });
  });

  // 全体出席率計算
  const totalAttended = result.member_stats.reduce((sum, m) => sum + m.attended_events, 0);
  const totalPossible = result.member_stats.reduce((sum, m) => sum + m.total_events, 0);
  result.attendance_rate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;

  // メンバー統計を出席率でソート（降順）
  result.member_stats.sort((a, b) => b.attendance_rate - a.attendance_rate);

  // イベント統計を日付でソート（降順）
  result.event_stats.sort((a, b) => {
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    return dateB - dateA;
  });

  return {
    success: true,
    analytics: result
  };
}

/**
 * 誕生日一覧取得（管理者のみ）
 */
function getBirthdays(token) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const members = getSheetData('members');

  // 誕生日が登録されているメンバーのみ
  const membersWithBirthday = members.filter(m => m.birthday);

  // 月日でソート
  membersWithBirthday.sort((a, b) => {
    const dateA = new Date(a.birthday);
    const dateB = new Date(b.birthday);

    const monthDayA = (dateA.getMonth() + 1) * 100 + dateA.getDate();
    const monthDayB = (dateB.getMonth() + 1) * 100 + dateB.getDate();

    return monthDayA - monthDayB;
  });

  const result = membersWithBirthday.map(member => {
    const birthday = new Date(member.birthday);

    return {
      member_id: member.member_id,
      member_name: member.name,
      affiliation: member.affiliation,
      position: member.position,
      birthday: formatDate(member.birthday),
      month: birthday.getMonth() + 1,
      day: birthday.getDate()
    };
  });

  return {
    success: true,
    birthdays: result
  };
}
