/**
 * Receipts.gs - 領収書管理
 *
 * 領収書発行、PDF生成、領収書番号管理
 */

/**
 * 領収書発行可能なイベント一覧取得（メンバー用）
 */
function getReceiptableEvents(token) {
  const member = getMemberFromToken(token);

  if (!member) {
    return {success: false, error: '認証が必要です'};
  }

  const events = getSheetData('events');
  const attendances = getSheetData('attendance');
  const checkins = getSheetData('checkin');
  const payments = getSheetData('payments');

  // 自分が出欠登録したイベントのみ
  const myAttendances = attendances.filter(att => att.member_id === member.member_id);

  const result = myAttendances.map(att => {
    const event = events.find(e => e.event_id === att.event_id);

    if (!event || !event.receipt_enabled) {
      return null;
    }

    const checkin = checkins.find(c => c.event_id === att.event_id && c.member_id === member.member_id);
    const payment = payments.find(p => p.event_id === att.event_id && p.member_id === member.member_id);

    // 発行可能条件: 支払済み かつ 未発行
    const canIssue = payment && payment.paid && !payment.receipt_issued;

    return {
      event_id: event.event_id,
      event_title: event.title,
      event_date: event.date,
      status: att.status,
      checked_in: !!checkin,
      payment_amount: payment ? payment.amount : 0,
      paid: payment ? payment.paid : false,
      receipt_issued: payment ? payment.receipt_issued : false,
      receipt_number: payment ? payment.receipt_number : '',
      receipt_url: payment ? payment.receipt_url : '',
      can_issue: canIssue
    };
  });

  // nullを除外して日付でソート（降順）
  const filteredResult = result.filter(r => r !== null);
  filteredResult.sort((a, b) => {
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    return dateB - dateA;
  });

  return {
    success: true,
    events: filteredResult
  };
}

/**
 * 領収書発行対象メンバー一覧取得（管理者用）
 */
function getAdminReceiptableEvents(token, eventId, affiliation) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  if (!eventId) {
    return {success: false, error: 'イベントIDが必要です'};
  }

  const event = findRow('events', 'event_id', eventId);

  if (!event || !event.receipt_enabled) {
    return {success: false, error: 'このイベントは領収書発行が有効ではありません'};
  }

  const payments = getSheetData('payments');
  const members = getSheetData('members');

  // 指定イベントの支払済メンバーのみ
  let eventPayments = payments.filter(p => p.event_id === eventId && p.paid);

  // 所属フィルター
  if (affiliation) {
    eventPayments = eventPayments.filter(p => {
      const member = members.find(m => m.member_id === p.member_id);
      return member && member.affiliation === affiliation;
    });
  }

  const result = eventPayments.map(payment => {
    const member = members.find(m => m.member_id === payment.member_id);

    return {
      member_id: payment.member_id,
      member_name: member ? member.name : '',
      affiliation: member ? member.affiliation : '',
      company_name: member ? member.company_name : '',
      amount: payment.amount,
      paid: payment.paid,
      receipt_issued: payment.receipt_issued,
      receipt_number: payment.receipt_number,
      receipt_url: payment.receipt_url
    };
  });

  // メンバー名でソート
  result.sort((a, b) => a.member_name.localeCompare(b.member_name, 'ja'));

  return {
    success: true,
    members: result
  };
}

/**
 * 領収書発行（単独）
 */
function issueReceipt(token, dataStr) {
  Logger.log('===== issueReceipt 開始 =====');
  Logger.log('dataStr: ' + dataStr);

  const member = getMemberFromToken(token);
  Logger.log('member: ' + JSON.stringify(member));

  if (!member) {
    Logger.log('認証エラー: メンバーが見つかりません');
    return {success: false, error: '認証が必要です'};
  }

  const data = parseJSON(dataStr);
  Logger.log('parsed data: ' + JSON.stringify(data));

  if (!data || !data.event_id || !data.member_id || !data.company_name) {
    Logger.log('バリデーションエラー: 必須項目不足');
    return {success: false, error: '必須項目が不足しています'};
  }

  // 権限チェック: 自分の領収書 または 管理者
  Logger.log('権限チェック開始');
  if (data.member_id !== member.member_id && !isAdmin(token)) {
    Logger.log('権限エラー');
    return {success: false, error: '権限がありません'};
  }
  Logger.log('権限チェックOK');

  // イベント確認
  Logger.log('イベント確認開始: ' + data.event_id);
  const event = findRow('events', 'event_id', data.event_id);
  Logger.log('event: ' + JSON.stringify(event));

  if (!event || !event.receipt_enabled) {
    Logger.log('イベントエラー: 見つからないか領収書無効');
    return {success: false, error: 'このイベントは領収書発行が有効ではありません'};
  }
  Logger.log('イベント確認OK');

  // 支払い確認
  Logger.log('支払い確認開始');
  const payment = findPayment(data.event_id, data.member_id);
  Logger.log('payment: ' + JSON.stringify(payment));

  if (!payment) {
    Logger.log('支払いエラー: 見つかりません');
    return {success: false, error: '支払い情報が見つかりません'};
  }

  if (!payment.paid) {
    Logger.log('支払いエラー: 未払い');
    return {success: false, error: '未払いのため領収書を発行できません'};
  }

  if (payment.receipt_issued) {
    Logger.log('発行済みエラー');
    return {success: false, error: '既に領収書が発行されています'};
  }
  Logger.log('支払い確認OK');

  // 領収書番号生成
  Logger.log('領収書番号生成開始');
  const receiptNumber = generateReceiptNumber(data.event_id, data.member_id, false);
  Logger.log('領収書番号: ' + receiptNumber);

  // 領収書データ作成
  Logger.log('領収書データ作成開始');
  const receiptNote = data.receipt_note || event.receipt_note_default || `${event.title} 登録料として`;
  Logger.log('receiptNote: ' + receiptNote);

  const receiptData = {
    receipt_number: receiptNumber,
    company_name: data.company_name,
    amount: payment.amount,
    receipt_note: receiptNote,
    detail_note: '', // 単独領収書では使用しない
    event_name: `${event.title}（${formatDate(event.date)}）`,
    issued_at: formatDate(new Date())
  };
  Logger.log('receiptData: ' + JSON.stringify(receiptData));

  // PDF生成
  Logger.log('PDF生成呼び出し開始');
  const pdfUrl = generateReceiptPDF(receiptData);
  Logger.log('PDF生成完了。URL: ' + pdfUrl);

  // receiptsテーブルに記録
  Logger.log('receiptsテーブル記録開始');
  const receiptsSheet = getSheet('receipts');
  const receiptId = generateUniqueId('REC', receiptsSheet);
  Logger.log('receiptId: ' + receiptId);

  addRow('receipts', {
    receipt_id: receiptId,
    receipt_number: receiptNumber,
    event_id: data.event_id,
    member_id: data.member_id,
    member_ids: '',
    is_combined: false,
    company_name: data.company_name,
    amount: payment.amount,
    receipt_note: receiptNote,
    detail_note: '',
    issued_at: new Date(),
    pdf_url: pdfUrl
  });
  Logger.log('receiptsテーブル記録完了');

  // paymentsテーブル更新
  Logger.log('paymentsテーブル更新開始');
  updateRow('payments', payment.rowIndex, {
    receipt_issued: true,
    receipt_number: receiptNumber,
    receipt_url: pdfUrl,
    receipt_issued_at: new Date()
  });
  Logger.log('paymentsテーブル更新完了');

  Logger.log('===== issueReceipt 正常終了 =====');
  return {
    success: true,
    receipt_number: receiptNumber,
    pdf_url: pdfUrl,
    message: '領収書を発行しました'
  };
}

/**
 * 合算領収書発行（管理者専用）
 */
function issueCombinedReceipt(token, dataStr) {
  if (!isAdmin(token)) {
    return {success: false, error: '管理者権限が必要です'};
  }

  const data = parseJSON(dataStr);

  if (!data || !data.event_id || !data.member_ids || !data.company_name) {
    return {success: false, error: '必須項目が不足しています'};
  }

  const memberIds = Array.isArray(data.member_ids) ? data.member_ids : data.member_ids.split(',');

  if (memberIds.length === 0) {
    return {success: false, error: 'メンバーIDが必要です'};
  }

  // イベント確認
  const event = findRow('events', 'event_id', data.event_id);

  if (!event || !event.receipt_enabled) {
    return {success: false, error: 'このイベントは領収書発行が有効ではありません'};
  }

  // 全メンバーの支払い確認
  let totalAmount = 0;
  const paymentRecords = [];

  for (const memberId of memberIds) {
    const payment = findPayment(data.event_id, memberId);

    if (!payment) {
      return {success: false, error: `メンバー ${memberId} の支払い情報が見つかりません`};
    }

    if (!payment.paid) {
      return {success: false, error: `メンバー ${memberId} が未払いです`};
    }

    if (payment.receipt_issued) {
      return {success: false, error: `メンバー ${memberId} は既に領収書が発行されています`};
    }

    totalAmount += payment.amount;
    paymentRecords.push(payment);
  }

  // 領収書番号生成（合算）
  const receiptNumber = generateReceiptNumber(data.event_id, null, true);

  // 領収書データ作成
  const receiptNote = data.receipt_note || event.receipt_note_default || `${event.title} 登録料として`;
  const detailNote = data.detail_note || '';

  const receiptData = {
    receipt_number: receiptNumber,
    company_name: data.company_name,
    amount: totalAmount,
    receipt_note: receiptNote,
    detail_note: detailNote,
    event_name: `${event.title}（${formatDate(event.date)}）`,
    issued_at: formatDate(new Date())
  };

  // PDF生成
  const pdfUrl = generateReceiptPDF(receiptData);

  // receiptsテーブルに記録
  const receiptsSheet = getSheet('receipts');
  const receiptId = generateUniqueId('REC', receiptsSheet);

  addRow('receipts', {
    receipt_id: receiptId,
    receipt_number: receiptNumber,
    event_id: data.event_id,
    member_id: '',
    member_ids: memberIds.join(','),
    is_combined: true,
    company_name: data.company_name,
    amount: totalAmount,
    receipt_note: receiptNote,
    detail_note: detailNote,
    issued_at: new Date(),
    pdf_url: pdfUrl
  });

  // 各メンバーのpaymentsテーブル更新
  for (const payment of paymentRecords) {
    updateRow('payments', payment.rowIndex, {
      receipt_issued: true,
      receipt_number: receiptNumber,
      receipt_url: pdfUrl,
      receipt_issued_at: new Date()
    });
  }

  return {
    success: true,
    receipt_number: receiptNumber,
    pdf_url: pdfUrl,
    message: '合算領収書を発行しました'
  };
}

/**
 * 領収書番号生成
 */
function generateReceiptNumber(eventId, memberId, isCombined) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  if (isCombined) {
    // 合算領収書: YYYYMM-EventID-COMBINED-連番
    const receipts = getSheetData('receipts');
    const combinedReceipts = receipts.filter(r => r.is_combined && r.event_id === eventId);
    const seq = combinedReceipts.length + 1;
    return `${year}${month}-${eventId}-COMBINED-${String(seq).padStart(3, '0')}`;
  } else {
    // 通常: YYYYMM-EventID-MemberID
    return `${year}${month}-${eventId}-${memberId}`;
  }
}

/**
 * 領収書PDF生成
 */
function generateReceiptPDF(data) {
  try {
    Logger.log('PDF生成開始: ' + JSON.stringify(data));

    // テンプレートIDとフォルダIDの確認
    Logger.log('RECEIPT_TEMPLATE_ID: ' + RECEIPT_TEMPLATE_ID);
    Logger.log('RECEIPT_FOLDER_ID: ' + RECEIPT_FOLDER_ID);

    // テンプレートをコピー
    const templateDoc = DriveApp.getFileById(RECEIPT_TEMPLATE_ID);
    Logger.log('テンプレート取得成功');

    const folder = DriveApp.getFolderById(RECEIPT_FOLDER_ID);
    Logger.log('フォルダ取得成功');

    const newDoc = templateDoc.makeCopy(`領収書_${data.receipt_number}`, folder);
    Logger.log('ドキュメントコピー成功: ' + newDoc.getId());

    const doc = DocumentApp.openById(newDoc.getId());
    const body = doc.getBody();
    Logger.log('ドキュメントオープン成功');

    // プレースホルダーを置換
    body.replaceText('\\{\\{receipt_number\\}\\}', data.receipt_number || '');
    body.replaceText('\\{\\{company_name\\}\\}', data.company_name || '');
    body.replaceText('\\{\\{amount\\}\\}', data.amount ? data.amount.toLocaleString('ja-JP') : '0');
    body.replaceText('\\{\\{receipt_note\\}\\}', data.receipt_note || '');
    body.replaceText('\\{\\{issued_at\\}\\}', data.issued_at || '');
    body.replaceText('\\{\\{event_name\\}\\}', data.event_name || '');
    body.replaceText('\\{\\{detail_note\\}\\}', data.detail_note || '');
    Logger.log('プレースホルダー置換完了');

    doc.saveAndClose();
    Logger.log('ドキュメント保存完了');

    // PDFとして出力
    const pdfBlob = newDoc.getAs('application/pdf');
    Logger.log('PDF変換成功');

    const pdfFile = folder.createFile(pdfBlob);
    pdfFile.setName(`領収書_${data.receipt_number}.pdf`);
    Logger.log('PDFファイル作成成功: ' + pdfFile.getId());

    // 元のドキュメントを削除
    newDoc.setTrashed(true);
    Logger.log('元ドキュメント削除完了');

    // 共有設定
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    Logger.log('共有設定完了');

    const pdfUrl = pdfFile.getUrl();
    Logger.log('PDF生成完了。URL: ' + pdfUrl);

    return pdfUrl;
  } catch (e) {
    Logger.log('PDF生成エラー詳細:');
    Logger.log('エラーメッセージ: ' + e.message);
    Logger.log('エラースタック: ' + e.stack);
    Logger.log('データ: ' + JSON.stringify(data));
    return '';
  }
}
