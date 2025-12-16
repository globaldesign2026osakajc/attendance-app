/**
 * Attendance.gs - 出欠管理
 *
 * 出欠登録、履歴取得、状況確認
 */

/**
 * 出欠一括登録
 */
function registerAttendanceBatch(token, params) {
  const loginMember = getMemberFromToken(token);

  if (!loginMember) {
    return {success: false, error: '認証が必要です'};
  }

  // 管理者権限チェック
  if (!isAdmin(token)) {
    return {success: false, error: '一括登録は管理者のみ実行できます'};
  }

  const eventId = params.event_id;
  const attendances = params.attendances; // [{member_id, status, memo, selected_option}, ...]

  if (!eventId || !attendances || !Array.isArray(attendances)) {
    return {success: false, error: '必須項目が不足しています'};
  }

  if (attendances.length === 0) {
    return {success: false, error: '登録対象が指定されていません'};
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  // 各メンバーの出欠を登録
  for (const attendance of attendances) {
    try {
      const result = registerAttendance(token, {
        event_id: eventId,
        member_id: attendance.member_id,
        status: attendance.status,
        selected_option: attendance.selected_option || '',
        memo: attendance.memo || ''
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      results.push({
        member_id: attendance.member_id,
        success: result.success,
        error: result.error || null
      });
    } catch (error) {
      errorCount++;
      results.push({
        member_id: attendance.member_id,
        success: false,
        error: error.message || '予期しないエラー'
      });
    }
  }

  return {
    success: true,
    message: `一括登録完了: 成功 ${successCount}件、失敗 ${errorCount}件`,
    successCount: successCount,
    errorCount: errorCount,
    results: results
  };
}

/**
 * 出欠登録
 */
function registerAttendance(token, params) {
  const loginMember = getMemberFromToken(token);

  if (!loginMember) {
    return {success: false, error: '認証が必要です'};
  }

  const eventId = params.event_id;
  const status = params.status; // '出席', '欠席'
  const selectedOption = params.selected_option || '';
  const memo = params.memo || '';

  if (!eventId || !status) {
    return {success: false, error: '必須項目が不足しています'};
  }

  // 管理者が他のメンバーの出欠を登録する場合
  let targetMemberId = params.member_id;

  // member_idが指定されていない場合は自分自身
  if (!targetMemberId) {
    targetMemberId = loginMember.member_id;
  }

  // 管理者以外が他のメンバーの出欠を登録しようとした場合はエラー
  if (targetMemberId !== loginMember.member_id && !isAdmin(token)) {
    return {success: false, error: '他のメンバーの出欠を登録する権限がありません'};
  }

  // 対象メンバーの情報を取得
  const member = findRow('members', 'member_id', targetMemberId);

  if (!member) {
    return {success: false, error: 'メンバーが見つかりません'};
  }

  // イベント存在確認
  const event = findRow('events', 'event_id', eventId);

  if (!event) {
    return {success: false, error: 'イベントが見つかりません'};
  }

  // タイプBイベントの場合、選択したオプションから金額を取得
  let feeAmount = event.fee_amount || 0;
  if (event.attendance_type === 'B' && selectedOption) {
    const participationOptions = parseJSON(event.participation_options);
    if (participationOptions && Array.isArray(participationOptions)) {
      const option = participationOptions.find(opt => opt.label === selectedOption);
      if (option) {
        feeAmount = option.amount || 0;
      }
    }
  }

  // 締切日チェック（管理者の場合はスキップ）
  if (event.attendance_deadline && !isAdmin(token)) {
    const deadline = new Date(event.attendance_deadline);
    const now = new Date();

    if (now > deadline) {
      return {success: false, error: '出欠登録の締切を過ぎています'};
    }
  }

  // 既存の出欠登録を確認
  const sheet = getSheet('attendance');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const eventIdIndex = headers.indexOf('event_id');
  const memberIdIndex = headers.indexOf('member_id');

  let existingRow = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][eventIdIndex] === eventId && data[i][memberIdIndex] === targetMemberId) {
      existingRow = i + 1;
      break;
    }
  }

  // 更新または新規登録
  if (existingRow) {
    // 既存の出欠を更新
    updateRow('attendance', existingRow, {
      status: status,
      selected_option: selectedOption,
      memo: memo,
      registered_at: new Date()
    });
  } else {
    // 新規出欠登録
    const attendanceId = generateUniqueId('ATT', sheet);

    addRow('attendance', {
      attendance_id: attendanceId,
      event_id: eventId,
      member_id: targetMemberId,
      status: status,
      selected_option: selectedOption,
      memo: memo,
      registered_at: new Date()
    });
  }

  // 支払い管理レコードの作成・更新（出席の場合のみ、公欠は支払いなし、タイプBでは欠席以外）
  const shouldCreatePayment = (event.attendance_type === 'A' && status === '出席') ||
                              (event.attendance_type === 'B' && status !== '欠席');

  if (shouldCreatePayment && feeAmount > 0) {
    handlePaymentRecord(eventId, targetMemberId, feeAmount, params.payment_method || '');
  }

  return {
    success: true,
    message: '出欠登録が完了しました'
  };
}

/**
 * 支払い管理レコードの処理
 */
function handlePaymentRecord(eventId, memberId, amount, paymentMethod) {
  const sheet = getSheet('payments');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const eventIdIndex = headers.indexOf('event_id');
  const memberIdIndex = headers.indexOf('member_id');

  let existingRow = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][eventIdIndex] === eventId && data[i][memberIdIndex] === memberId) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow) {
    // 既存の支払いレコードを更新
    updateRow('payments', existingRow, {
      payment_method: paymentMethod,
      amount: amount
    });
  } else {
    // 新規支払いレコード作成
    const paymentId = generateUniqueId('PAY', sheet);

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
      receipt_url: '',
      receipt_issued_at: '',
      notes: ''
    });
  }
}

/**
 * 自分の出欠履歴取得
 */
function getMyAttendance(token) {
  const member = getMemberFromToken(token);

  if (!member) {
    return {success: false, error: '認証が必要です'};
  }

  const attendances = getSheetData('attendance');
  const events = getSheetData('events');
  const checkins = getSheetData('checkin');
  const payments = getSheetData('payments');

  // 自分の出欠のみフィルター
  const myAttendances = attendances.filter(att => att.member_id === member.member_id);

  // イベント情報とチェックイン情報、支払い情報を結合
  const result = myAttendances.map(att => {
    const event = events.find(e => e.event_id === att.event_id);
    const checkin = checkins.find(c => c.event_id === att.event_id && c.member_id === member.member_id);
    const payment = payments.find(p => p.event_id === att.event_id && p.member_id === member.member_id);

    // tagsをパース（文字列の場合）
    let tags = [];
    if (event && event.tags) {
      if (typeof event.tags === 'string') {
        // 文字列の場合、カンマ区切りまたはJSON配列として解析
        try {
          tags = JSON.parse(event.tags);
        } catch (e) {
          // JSON配列でない場合はカンマ区切りとして処理
          tags = event.tags.split(',').map(t => t.trim()).filter(t => t);
        }
      } else if (Array.isArray(event.tags)) {
        tags = event.tags;
      }
    }

    // デバッグ: 最初の1件だけログ出力
    if (att.attendance_id === myAttendances[0].attendance_id) {
      Logger.log('イベント詳細: ' + JSON.stringify({
        event_id: event ? event.event_id : null,
        title: event ? event.title : null,
        tags_raw: event ? event.tags : null,
        tags_type: event && event.tags ? typeof event.tags : null,
        tags_parsed: tags
      }));
    }

    return {
      attendance_id: att.attendance_id,
      event_id: att.event_id,
      event_title: event ? event.title : '',
      event_date: event ? event.date : '',
      status: att.status,
      attendance_status: att.status,  // フロント互換性用
      selected_option: att.selected_option,
      memo: att.memo,
      registered_at: att.registered_at,
      checked_in: !!checkin,
      checked_in_at: checkin ? checkin.checked_in_at : null,
      tags: tags,  // イベントのタグ情報
      participation_fee: event ? (event.fee_amount || 0) : 0,  // 参加費
      payment_confirmed: payment ? payment.paid : false,  // 支払い確認
      payment_method: payment ? payment.payment_method : ''  // 支払い方法
    };
  });

  // 日付でソート（降順）
  result.sort((a, b) => {
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    return dateB - dateA;
  });

  return {
    success: true,
    attendances: result
  };
}

/**
 * イベントの出欠状況取得（管理者用）
 */
function getEventAttendance(token, eventId) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  if (!eventId) {
    return {success: false, error: 'イベントIDが必要です'};
  }

  // イベント情報を取得
  const event = findRow('events', 'event_id', eventId);

  if (!event) {
    return {success: false, error: 'イベントが見つかりません'};
  }

  const attendances = getSheetData('attendance');
  const members = getSheetData('members');
  const checkins = getSheetData('checkin');
  const payments = getSheetData('payments');

  // 指定イベントの出欠のみフィルター
  const eventAttendances = attendances.filter(att => att.event_id === eventId);

  // 全メンバーに対して出欠状況を生成（未登録も含む）
  const result = members.map(member => {
    const attendance = eventAttendances.find(att => att.member_id === member.member_id);
    const checkin = checkins.find(c => c.event_id === eventId && c.member_id === member.member_id);
    const payment = payments.find(p => p.event_id === eventId && p.member_id === member.member_id);

    return {
      attendance_id: attendance ? attendance.attendance_id : null,
      member_id: member.member_id,
      member_name: member.name,
      affiliation: member.affiliation || '',
      affiliation_color: member.affiliation ? getAffiliationColor(member.affiliation) : null,
      position: member.position || '',
      status: attendance ? attendance.status : null,
      selected_option: attendance ? attendance.selected_option : null,
      memo: attendance ? attendance.memo : '',
      registered_at: attendance ? attendance.registered_at : null,
      checked_in: !!checkin,
      checked_in_at: checkin ? checkin.checked_in_at : null,
      payment_method: payment ? payment.payment_method : '',
      paid: payment ? payment.paid : false,
      paid_at: payment ? payment.paid_at : null
    };
  });

  // member_idでソート
  result.sort((a, b) => {
    const idA = a.member_id || '';
    const idB = b.member_id || '';
    return idA.localeCompare(idB);
  });

  return {
    success: true,
    event: event,
    attendance: result
  };
}
