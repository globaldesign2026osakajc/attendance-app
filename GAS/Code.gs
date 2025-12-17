/**
 * Code.gs - メインAPIエントリーポイント
 *
 * すべてのAPIリクエストを受け取り、適切な関数に振り分ける
 */

/**
 * GETリクエストのエントリーポイント
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * POSTリクエストのエントリーポイント
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * リクエストハンドラー
 */
function handleRequest(e) {
  // パラメータが存在しない場合の対応（直接実行時など）
  if (!e || (!e.parameter && !e.postData)) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    return output.setContent(JSON.stringify({
      error: 'Bad Request',
      message: 'パラメータが必要です。例: ?action=login&login_id=xxx&password=xxx'
    }));
  }

  // POSTリクエストの場合、JSONボディをパース
  let params = e.parameter || {};
  if (e.postData && e.postData.contents) {
    try {
      const postParams = JSON.parse(e.postData.contents);
      params = { ...params, ...postParams };
    } catch (error) {
      const output = ContentService.createTextOutput();
      output.setMimeType(ContentService.MimeType.JSON);
      return output.setContent(JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid JSON in POST body'
      }));
    }
  }

  const action = params.action;
  const token = params.token;

  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    // トークン認証（ログイン以外）
    if (action !== 'login' && !isValidToken(token)) {
      return output.setContent(JSON.stringify({
        error: 'Unauthorized',
        message: '認証が必要です'
      }));
    }

    let result;
    switch(action) {
      // 認証
      case 'login':
        result = login(params);
        break;
      case 'logout':
        result = logout(token);
        break;

      // イベント
      case 'getEvents':
        result = getEvents(token, params, params.member_id);
        break;
      case 'getEventDetail':
        result = getEventDetail(token, params.event_id, params.member_id);
        break;
      case 'addEvent':
        result = addEvent(token, params.data);
        break;
      case 'updateEvent':
        result = updateEvent(token, params.data);
        break;
      case 'deleteEvent':
        result = deleteEvent(token, params.event_id);
        break;

      // 出欠
      case 'registerAttendance':
        result = registerAttendance(token, params);
        break;
      case 'registerAttendanceBatch':
        result = registerAttendanceBatch(token, params);
        break;
      case 'getMyAttendance':
        result = getMyAttendance(token);
        break;
      case 'getEventAttendance':
        result = getEventAttendance(token, params.event_id);
        break;

      // メンバー
      case 'getMembers':
        result = getMembers(token);
        break;
      case 'getMemberProfile':
        result = getMemberProfile(token);
        break;
      case 'updateMemberProfile':
        result = updateMemberProfile(token, params.data);
        break;
      case 'uploadProfilePhoto':
        result = uploadProfilePhoto(token, params);
        break;
      case 'changePassword':
        result = changePassword(token, params.data);
        break;
      case 'addMember':
        result = addMember(token, params.data);
        break;
      case 'updateMember':
        result = updateMember(token, params.data);
        break;
      case 'deleteMember':
        result = deleteMember(token, params.member_id);
        break;

      // チェックイン
      case 'checkin':
        result = checkin(token, params);
        break;
      case 'checkinWithPayment':
        result = checkinWithPayment(token, params);
        break;
      case 'getCheckinList':
        result = getCheckinList(token, params.event_id);
        break;

      // 支払い管理
      case 'confirmPayment':
        result = confirmPayment(token, params);
        break;
      case 'unpaidPayment':
        result = unpaidPayment(token, params);
        break;
      case 'getUnpaidList':
        result = getUnpaidList(token);
        break;
      case 'getPaidList':
        result = getPaidList(token);
        break;
      case 'getCancellationFeeList':
        result = getCancellationFeeList(token);
        break;
      case 'getPaymentsByEvent':
        result = getPaymentsByEvent(token, params.event_id);
        break;

      // 領収書
      case 'getReceiptableEvents':
        result = getReceiptableEvents(token);
        break;
      case 'getAdminReceiptableEvents':
        result = getAdminReceiptableEvents(token, params.event_id, params.affiliation);
        break;
      case 'issueReceipt':
        result = issueReceipt(token, params.data);
        break;
      case 'issueCombinedReceipt':
        result = issueCombinedReceipt(token, params.data);
        break;

      // 分析
      case 'getAnalytics':
        result = getAnalytics(token, params);
        break;

      // マスタ
      case 'getMasters':
        result = getMasters(token);
        break;

      default:
        result = {error: 'Invalid action', message: '無効なアクションです'};
    }

    output.setContent(JSON.stringify(result));
  } catch(error) {
    output.setContent(JSON.stringify({
      error: error.toString(),
      message: 'エラーが発生しました'
    }));
  }

  return output;
}
