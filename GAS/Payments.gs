/**
 * Payments.gs - 支払い管理
 *
 * 支払い確認、未払い一覧、キャンセル料管理
 */

/**
 * 支払い確認（管理者のみ）
 */
function confirmPayment(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const paymentId = params.payment_id;

  if (!paymentId) {
    return {success: false, error: '支払いIDが必要です'};
  }

  const payment = findRow('payments', 'payment_id', paymentId);

  if (!payment) {
    return {success: false, error: '支払い情報が見つかりません'};
  }

  updateRow('payments', payment.rowIndex, {
    paid: true,
    paid_at: new Date(),
    paid_by_admin: true
  });

  return {
    success: true,
    message: '支払いを確認しました'
  };
}

/**
 * 支払いを未払いに戻す（管理者のみ）
 */
function unpaidPayment(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const paymentId = params.payment_id;

  if (!paymentId) {
    return {success: false, error: '支払いIDが必要です'};
  }

  const payment = findRow('payments', 'payment_id', paymentId);

  if (!payment) {
    return {success: false, error: '支払い情報が見つかりません'};
  }

  updateRow('payments', payment.rowIndex, {
    paid: false,
    paid_at: '',
    paid_by_admin: false
  });

  return {
    success: true,
    message: '未払いに戻しました'
  };
}

/**
 * 未払い一覧取得（管理者のみ）
 */
function getUnpaidList(token) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const payments = getSheetData('payments');
  const events = getSheetData('events');
  const members = getSheetData('members');

  // 未払いのみフィルター
  const unpaidPayments = payments.filter(p => !p.paid);

  // イベント情報とメンバー情報を結合
  const result = unpaidPayments.map(payment => {
    const event = events.find(e => e.event_id === payment.event_id);
    const member = members.find(m => m.member_id === payment.member_id);

    return {
      payment_id: payment.payment_id,
      event_id: payment.event_id,
      event_title: event ? event.title : '',
      event_date: event ? event.date : '',
      member_id: payment.member_id,
      member_name: member ? member.name : '',
      affiliation: member ? member.affiliation : '',
      payment_method: payment.payment_method,
      amount: payment.amount,
      notes: payment.notes
    };
  });

  // イベント日付でソート（降順）
  result.sort((a, b) => {
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    return dateB - dateA;
  });

  return {
    success: true,
    payments: result
  };
}

/**
 * 支払い済み一覧取得（管理者のみ）
 */
function getPaidList(token) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const payments = getSheetData('payments');
  const events = getSheetData('events');
  const members = getSheetData('members');

  // 支払い済みのみフィルター
  const paidPayments = payments.filter(p => p.paid);

  // イベント情報とメンバー情報を結合
  const result = paidPayments.map(payment => {
    const event = events.find(e => e.event_id === payment.event_id);
    const member = members.find(m => m.member_id === payment.member_id);

    return {
      payment_id: payment.payment_id,
      event_id: payment.event_id,
      event_title: event ? event.title : '',
      event_date: event ? event.date : '',
      member_id: payment.member_id,
      member_name: member ? member.name : '',
      affiliation: member ? member.affiliation : '',
      payment_method: payment.payment_method,
      amount: payment.amount,
      paid_at: payment.paid_at,
      notes: payment.notes
    };
  });

  // イベント日付でソート（降順）
  result.sort((a, b) => {
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    return dateB - dateA;
  });

  return {
    success: true,
    payments: result
  };
}

/**
 * キャンセル料一覧取得（管理者のみ）
 */
function getCancellationFeeList(token) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const attendances = getSheetData('attendance');
  const events = getSheetData('events');
  const members = getSheetData('members');
  const payments = getSheetData('payments');

  const result = [];

  // キャンセル料が発生する条件:
  // 1. イベントにcancellation_fee_dateが設定されている
  // 2. 出欠登録で「不参加」になった
  // 3. cancellation_fee_date以降に「不参加」に変更した場合

  attendances.forEach(attendance => {
    if (attendance.status !== '不参加') {
      return;
    }

    const event = events.find(e => e.event_id === attendance.event_id);

    if (!event || !event.cancellation_fee_date) {
      return;
    }

    const cancellationFeeDate = new Date(event.cancellation_fee_date);
    const registeredAt = new Date(attendance.registered_at);

    // キャンセル料発生日以降の不参加登録のみ
    if (registeredAt < cancellationFeeDate) {
      return;
    }

    const member = members.find(m => m.member_id === attendance.member_id);
    const payment = payments.find(p => p.event_id === attendance.event_id && p.member_id === attendance.member_id);

    result.push({
      event_id: event.event_id,
      event_title: event.title,
      event_date: event.date,
      member_id: attendance.member_id,
      member_name: member ? member.name : '',
      affiliation: member ? member.affiliation : '',
      cancellation_fee: event.fee_amount, // キャンセル料はイベント参加費と同額
      paid: payment ? payment.paid : false,
      payment_id: payment ? payment.payment_id : null,
      registered_at: attendance.registered_at
    });
  });

  // イベント日付でソート（降順）
  result.sort((a, b) => {
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    return dateB - dateA;
  });

  return {
    success: true,
    cancellations: result
  };
}

/**
 * イベント別支払い一覧取得（管理者のみ）
 */
function getPaymentsByEvent(token, eventId) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  if (!eventId) {
    return {success: false, error: 'イベントIDが必要です'};
  }

  const payments = getSheetData('payments');
  const members = getSheetData('members');
  const attendances = getSheetData('attendance');
  const events = getSheetData('events');

  // イベント情報を取得
  const event = events.find(e => e.event_id === eventId);

  // 指定イベントの支払いのみフィルター
  const eventPayments = payments.filter(p => p.event_id === eventId);

  // チェックイン情報を取得
  const checkins = getSheetData('checkin');

  // キャンセル料判定のヘルパー関数
  function checkCancellationFee(attendance, checkin) {
    if (!event || !event.cancellation_fee_date || !attendance) {
      return false;
    }

    const cancellationFeeDate = new Date(event.cancellation_fee_date);
    const registeredAt = new Date(attendance.registered_at);

    // ケース1: キャンセル料発生日以降に「不参加」に変更した場合
    if (attendance.status === '不参加' && registeredAt >= cancellationFeeDate) {
      return true;
    }

    // ケース2: 「出席」と登録したのに実際には来なかった場合（チェックインしていない）
    // イベント日が過ぎている、かつ出席登録していたのにチェックインしていない
    if (attendance.status === '出席' && !checkin) {
      const eventDate = new Date(event.date);
      const today = new Date();
      // イベント日を過ぎている場合のみ判定
      if (today > eventDate) {
        return true;
      }
    }

    return false;
  }

  // メンバー情報とキャンセル料情報を結合
  const result = eventPayments.map(payment => {
    const member = members.find(m => m.member_id === payment.member_id);
    const attendance = attendances.find(a => a.event_id === eventId && a.member_id === payment.member_id);
    const checkin = checkins.find(c => c.event_id === eventId && c.member_id === payment.member_id);

    // キャンセル料が発生しているかチェック
    const isCancellationFee = checkCancellationFee(attendance, checkin);

    return {
      payment_id: payment.payment_id,
      member_id: payment.member_id,
      member_name: member ? member.name : '',
      affiliation: member ? member.affiliation : '',
      payment_method: payment.payment_method,
      amount: payment.amount,
      paid: payment.paid,
      paid_at: payment.paid_at,
      receipt_issued: payment.receipt_issued,
      receipt_number: payment.receipt_number,
      notes: payment.notes,
      is_cancellation_fee: isCancellationFee
    };
  });

  // 支払い情報が存在しない出席登録者もチェック（キャンセル料対象の可能性）
  const eventAttendances = attendances.filter(a => a.event_id === eventId);
  eventAttendances.forEach(attendance => {
    // 既に支払い情報がある場合はスキップ
    const existingPayment = result.find(r => r.member_id === attendance.member_id);
    if (existingPayment) {
      return;
    }

    const checkin = checkins.find(c => c.event_id === eventId && c.member_id === attendance.member_id);
    const isCancellationFee = checkCancellationFee(attendance, checkin);

    // キャンセル料対象の場合のみ結果に追加
    if (isCancellationFee) {
      const member = members.find(m => m.member_id === attendance.member_id);
      result.push({
        payment_id: '',  // 支払い情報なし
        member_id: attendance.member_id,
        member_name: member ? member.name : '',
        affiliation: member ? member.affiliation : '',
        payment_method: '',
        amount: event.fee_amount || 0,  // イベントの参加費をキャンセル料として設定
        paid: false,
        paid_at: '',
        receipt_issued: false,
        receipt_number: '',
        notes: '',
        is_cancellation_fee: true
      });
    }
  });

  // メンバー名でソート
  result.sort((a, b) => a.member_name.localeCompare(b.member_name, 'ja'));

  return {
    success: true,
    payments: result
  };
}

/**
 * 支払い方法を更新（管理者のみ）
 */
function updatePaymentMethod(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const paymentId = params.payment_id;
  const paymentMethod = params.payment_method;

  if (!paymentId || !paymentMethod) {
    return {success: false, error: '必須項目が不足しています'};
  }

  const payment = findRow('payments', 'payment_id', paymentId);

  if (!payment) {
    return {success: false, error: '支払い情報が見つかりません'};
  }

  updateRow('payments', payment.rowIndex, {
    payment_method: paymentMethod
  });

  return {
    success: true,
    message: '支払い方法を更新しました'
  };
}

/**
 * 支払い情報を作成（チェックインなし・管理者のみ）
 */
function createPaymentRecord(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const eventId = params.event_id;
  const memberId = params.member_id;
  const paymentMethod = params.payment_method;
  const amount = params.amount;

  if (!eventId || !memberId || !paymentMethod || amount === undefined) {
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

  // 既存の支払い情報を確認
  const existingPayment = findPaymentByEventAndMember(eventId, memberId);
  if (existingPayment) {
    return {success: false, error: '既に支払い情報が存在します'};
  }

  // 支払い情報を新規作成
  const paymentSheet = getSheet('payments');
  const paymentId = generateUniqueId('PAY', paymentSheet);

  addRow('payments', {
    payment_id: paymentId,
    event_id: eventId,
    member_id: memberId,
    payment_method: paymentMethod,
    amount: amount,
    paid: false,
    paid_at: '',
    paid_by_admin: false,
    receipt_issued: false,
    receipt_number: '',
    notes: ''
  });

  return {
    success: true,
    payment_id: paymentId,
    message: '支払い情報を作成しました'
  };
}

/**
 * 支払い備考を更新（管理者のみ）
 */
function updatePaymentNotes(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const paymentId = params.payment_id;
  const notes = params.notes || '';

  if (!paymentId) {
    return {success: false, error: '支払いIDが必要です'};
  }

  const payment = findRow('payments', 'payment_id', paymentId);

  if (!payment) {
    return {success: false, error: '支払い情報が見つかりません'};
  }

  updateRow('payments', payment.rowIndex, {
    notes: notes
  });

  return {
    success: true,
    message: '備考を更新しました'
  };
}

/**
 * キャンセル料を免除（管理者のみ）
 */
function waiveCancellationFee(token, params) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const paymentId = params.payment_id;
  const reason = params.reason || 'キャンセル料免除';

  if (!paymentId) {
    return {success: false, error: '支払いIDが必要です'};
  }

  const payment = findRow('payments', 'payment_id', paymentId);

  if (!payment) {
    return {success: false, error: '支払い情報が見つかりません'};
  }

  // 金額を0にして、備考に理由を記載
  updateRow('payments', payment.rowIndex, {
    amount: 0,
    notes: reason
  });

  return {
    success: true,
    message: 'キャンセル料を免除しました'
  };
}

/**
 * イベントとメンバーで支払い情報を検索（ヘルパー関数）
 */
function findPaymentByEventAndMember(eventId, memberId) {
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
