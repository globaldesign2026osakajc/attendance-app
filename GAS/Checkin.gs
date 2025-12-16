/**
 * Checkin.gs - チェックイン処理
 *
 * QRコード読み取りによる実出席記録
 */

/**
 * チェックイン（実出席記録）
 */
function checkin(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const eventId = params.event_id;
  const memberId = params.member_id;

  if (!eventId || !memberId) {
    return {success: false, error: '必須項目が不足しています'};
  }

  // イベント存在確認
  const event = findRow('events', 'event_id', eventId);
  if (!event) {
    return {success: false, error: 'イベントが見つかりません'};
  }

  // メンバー存在確認
  const member = findRow('members', 'member_id', memberId);
  if (!member) {
    return {success: false, error: 'メンバーが見つかりません'};
  }

  // 重複チェック
  const sheet = getSheet('checkin');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const eventIdIndex = headers.indexOf('event_id');
  const memberIdIndex = headers.indexOf('member_id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][eventIdIndex] === eventId && data[i][memberIdIndex] === memberId) {
      return {
        success: false,
        error: 'このメンバーは既にチェックイン済みです'
      };
    }
  }

  // チェックイン記録
  const checkinId = generateUniqueId('CHK', sheet);

  addRow('checkin', {
    checkin_id: checkinId,
    event_id: eventId,
    member_id: memberId,
    checked_in_at: new Date()
  });

  // 支払い方法を確認
  const payment = findPayment(eventId, memberId);

  return {
    success: true,
    member_name: member.name,
    payment_method: payment ? payment.payment_method : '',
    paid: payment ? payment.paid : false,
    message: 'チェックインが完了しました'
  };
}

/**
 * チェックイン＋支払い確認
 */
function checkinWithPayment(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const eventId = params.event_id;
  const memberId = params.member_id;
  const paymentConfirmed = params.payment_confirmed === 'true' || params.payment_confirmed === true;

  // まずチェックイン
  const checkinResult = checkin(token, {event_id: eventId, member_id: memberId});

  if (!checkinResult.success && checkinResult.error !== 'このメンバーは既にチェックイン済みです') {
    return checkinResult;
  }

  // 支払い確認
  if (paymentConfirmed) {
    const payment = findPayment(eventId, memberId);

    if (payment) {
      updateRow('payments', payment.rowIndex, {
        paid: true,
        paid_at: new Date(),
        paid_by_admin: true
      });
    }
  }

  return {
    success: true,
    message: 'チェックインと支払い確認が完了しました'
  };
}

/**
 * チェックイン一覧取得
 */
function getCheckinList(token, eventId) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  if (!eventId) {
    return {success: false, error: 'イベントIDが必要です'};
  }

  const checkins = getSheetData('checkin');
  const members = getSheetData('members');
  const payments = getSheetData('payments');

  // 指定イベントのチェックインのみフィルター
  const eventCheckins = checkins.filter(c => c.event_id === eventId);

  // メンバー情報と支払い情報を結合
  const result = eventCheckins.map(checkin => {
    const member = members.find(m => m.member_id === checkin.member_id);
    const payment = payments.find(p => p.event_id === eventId && p.member_id === checkin.member_id);

    return {
      checkin_id: checkin.checkin_id,
      member_id: checkin.member_id,
      member_name: member ? member.name : '',
      checked_in_at: checkin.checked_in_at,
      payment_method: payment ? payment.payment_method : '',
      paid: payment ? payment.paid : false
    };
  });

  // チェックイン時刻でソート（降順）
  result.sort((a, b) => {
    const dateA = new Date(a.checked_in_at);
    const dateB = new Date(b.checked_in_at);
    return dateB - dateA;
  });

  return {
    success: true,
    checkins: result
  };
}

/**
 * 支払い情報を取得（ヘルパー関数）
 */
function findPayment(eventId, memberId) {
  const sheet = getSheet('payments');
  const data = sheet.getDataRange().getValues();

  if (data.length === 0) {
    return null;
  }

  const headers = data[0];
  const eventIdIndex = headers.indexOf('event_id');
  const memberIdIndex = headers.indexOf('member_id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][eventIdIndex] === eventId && data[i][memberIdIndex] === memberId) {
      const row = {rowIndex: i + 1};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      return row;
    }
  }

  return null;
}
