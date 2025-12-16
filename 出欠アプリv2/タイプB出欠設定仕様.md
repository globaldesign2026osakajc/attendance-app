# タイプB出欠設定 - 詳細仕様

## 概要

イベント登録時に、タイプBを選択すると、任意の名前と金額を持つ複数の参加オプションを設定できる機能です。

## 例

```
☐ 15日参加宿泊なし - 5,000円
☐ 15日16日参加宿泊なし - 8,000円
☐ 15日16日参加宿泊あり - 15,000円
☐ 16日参加 - 3,000円
☐ 不参加 - 0円
```

## タイプAとタイプBの違い

### タイプA: シンプルな出欠選択
- 参加 / 不参加 / 未定 のラジオボタンのみ
- 参加費は固定(イベント設定の「登録料」欄の金額)
- シンプルなイベント向け

### タイプB: 複数の参加オプションから選択
- 管理者が任意の選択肢を作成可能
- 各選択肢に**個別の金額を設定可能**
- 宿泊の有無、参加日程によって金額が異なるイベント向け

## データ構造

### eventsテーブル
```
attendance_type: "A" または "B"
custom_options: JSON文字列
```

### タイプBの場合のcustom_options形式
```json
[
  {"label": "15日参加宿泊なし", "amount": 5000},
  {"label": "15日16日参加宿泊なし", "amount": 8000},
  {"label": "15日16日参加宿泊あり", "amount": 15000},
  {"label": "16日参加", "amount": 3000},
  {"label": "不参加", "amount": 0}
]
```

### attendanceテーブル
```
selected_option: ユーザーが選択したオプションのlabel値
```

例: `"15日参加宿泊なし"`

## 管理画面UI (admin/event-form.html)

### 出欠タイプ選択
```html
<div class="form-group">
  <label>出欠タイプ</label>
  <div class="radio-group">
    <label>
      <input type="radio" name="attendance_type" value="A" checked>
      タイプA (シンプルな出欠)
    </label>
    <label>
      <input type="radio" name="attendance_type" value="B">
      タイプB (カスタムオプション)
    </label>
  </div>
</div>
```

### タイプBの設定UI
```html
<div id="customOptionsContainer" style="display: none;">
  <h4>参加オプション設定</h4>
  <div id="optionsList"></div>
  <button type="button" id="addOptionBtn" class="btn-secondary">
    ＋ オプションを追加
  </button>
</div>
```

### オプション1つあたりのHTML
```html
<div class="custom-option-item" data-index="0">
  <input type="text" class="option-label" placeholder="例: 15日参加宿泊なし" value="">
  <input type="number" class="option-amount" placeholder="金額 (円)" value="" min="0">
  <button type="button" class="remove-option-btn">削除</button>
</div>
```

### 表示/非表示の切り替え
- タイプAを選択: `customOptionsContainer`を非表示
- タイプBを選択: `customOptionsContainer`を表示

## JavaScript実装 (admin/js/event-form.js)

### 初期化
```javascript
// ラジオボタンの変更イベント
document.querySelectorAll('input[name="attendance_type"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const customContainer = document.getElementById('customOptionsContainer');
    if (e.target.value === 'B') {
      customContainer.style.display = 'block';
    } else {
      customContainer.style.display = 'none';
    }
  });
});

// オプション追加ボタン
document.getElementById('addOptionBtn').addEventListener('click', () => {
  addCustomOption();
});
```

### オプション追加
```javascript
let optionIndex = 0;

function addCustomOption(label = '', amount = 0) {
  const optionsList = document.getElementById('optionsList');
  const optionHtml = `
    <div class="custom-option-item" data-index="${optionIndex}">
      <input type="text" class="option-label" placeholder="例: 15日参加宿泊なし" value="${label}">
      <input type="number" class="option-amount" placeholder="金額 (円)" value="${amount}" min="0">
      <button type="button" class="remove-option-btn" onclick="removeOption(${optionIndex})">削除</button>
    </div>
  `;
  optionsList.insertAdjacentHTML('beforeend', optionHtml);
  optionIndex++;
}

function removeOption(index) {
  const option = document.querySelector(`[data-index="${index}"]`);
  if (option) {
    option.remove();
  }
}
```

### フォーム送信時のデータ収集
```javascript
function getFormData() {
  const attendanceType = document.querySelector('input[name="attendance_type"]:checked').value;

  let customOptions = null;
  if (attendanceType === 'B') {
    customOptions = [];
    document.querySelectorAll('.custom-option-item').forEach(item => {
      const label = item.querySelector('.option-label').value.trim();
      const amount = parseInt(item.querySelector('.option-amount').value) || 0;
      if (label) {
        customOptions.push({ label, amount });
      }
    });
  }

  return {
    // ... 他のフィールド ...
    attendance_type: attendanceType,
    custom_options: customOptions ? JSON.stringify(customOptions) : ''
  };
}
```

### 編集時のデータ読み込み
```javascript
function fillForm(event) {
  // ... 他のフィールド ...

  // 出欠タイプ設定
  if (event.attendance_type) {
    document.querySelector(`input[name="attendance_type"][value="${event.attendance_type}"]`).checked = true;

    // タイプBの場合、カスタムオプションを表示
    if (event.attendance_type === 'B') {
      document.getElementById('customOptionsContainer').style.display = 'block';

      // custom_optionsを解析して表示
      if (event.custom_options) {
        const options = typeof event.custom_options === 'string'
          ? JSON.parse(event.custom_options)
          : event.custom_options;

        options.forEach(opt => {
          addCustomOption(opt.label, opt.amount);
        });
      }
    }
  }
}
```

## ユーザー画面UI (event-detail.html)

### タイプAの場合
```html
<div class="attendance-options">
  <label><input type="radio" name="status" value="参加"> 参加</label>
  <label><input type="radio" name="status" value="不参加"> 不参加</label>
  <label><input type="radio" name="status" value="未定"> 未定</label>
</div>
```

### タイプBの場合
```html
<div class="attendance-options">
  <label>
    <input type="radio" name="selected_option" value="15日参加宿泊なし">
    15日参加宿泊なし (5,000円)
  </label>
  <label>
    <input type="radio" name="selected_option" value="15日16日参加宿泊なし">
    15日16日参加宿泊なし (8,000円)
  </label>
  <label>
    <input type="radio" name="selected_option" value="15日16日参加宿泊あり">
    15日16日参加宿泊あり (15,000円)
  </label>
  <label>
    <input type="radio" name="selected_option" value="16日参加">
    16日参加 (3,000円)
  </label>
  <label>
    <input type="radio" name="selected_option" value="不参加">
    不参加 (0円)
  </label>
</div>
```

### JavaScript (js/attendance.js or event-detail.js)
```javascript
function renderAttendanceOptions(event) {
  const container = document.getElementById('attendanceOptionsContainer');

  if (event.attendance_type === 'A') {
    // タイプA: シンプルな出欠
    container.innerHTML = `
      <label><input type="radio" name="status" value="参加"> 参加</label>
      <label><input type="radio" name="status" value="不参加"> 不参加</label>
      <label><input type="radio" name="status" value="未定"> 未定</label>
    `;
  } else if (event.attendance_type === 'B') {
    // タイプB: カスタムオプション
    const options = typeof event.custom_options === 'string'
      ? JSON.parse(event.custom_options)
      : event.custom_options;

    let html = '';
    options.forEach(opt => {
      const amountText = opt.amount > 0 ? `(${opt.amount.toLocaleString()}円)` : '(無料)';
      html += `
        <label>
          <input type="radio" name="selected_option" value="${opt.label}">
          ${opt.label} ${amountText}
        </label>
      `;
    });
    container.innerHTML = html;
  }
}
```

### 出欠登録時のデータ送信
```javascript
async function registerAttendance(eventId) {
  const attendanceType = currentEvent.attendance_type;

  let status = '';
  let selectedOption = '';

  if (attendanceType === 'A') {
    status = document.querySelector('input[name="status"]:checked')?.value;
  } else if (attendanceType === 'B') {
    selectedOption = document.querySelector('input[name="selected_option"]:checked')?.value;

    // statusは選択したオプションのラベルに設定
    status = selectedOption;
  }

  const memo = document.getElementById('memo').value;

  const result = await API.call('registerAttendance', {
    event_id: eventId,
    status: status,
    selected_option: selectedOption,
    memo: memo
  });

  // ...
}
```

## 支払い処理への影響

### paymentsテーブルへの金額記録

タイプBの場合、選択されたオプションの金額を`payments.amount`に記録します。

```javascript
// GAS: Attendance.gs
function registerAttendance(token, params) {
  const eventId = params.event_id;
  const status = params.status;
  const selectedOption = params.selected_option;

  // イベント情報を取得
  const event = getEventDetail(token, eventId);

  // 金額を決定
  let amount = 0;
  if (event.attendance_type === 'A') {
    amount = event.fee_amount || 0;
  } else if (event.attendance_type === 'B' && selectedOption) {
    const options = parseJSON(event.custom_options);
    const selected = options.find(opt => opt.label === selectedOption);
    amount = selected ? selected.amount : 0;
  }

  // 出欠登録
  updateRow('attendance', existingRow, {
    status: status,
    selected_option: selectedOption,
    memo: params.memo,
    registered_at: new Date()
  });

  // 支払いレコード作成 (参加の場合のみ)
  if (status !== '不参加' && amount > 0) {
    addRow('payments', {
      event_id: eventId,
      member_id: session.member_id,
      payment_method: params.payment_method || '未設定',
      amount: amount,
      paid: false
    });
  }
}
```

## バリデーション

### 管理画面
- タイプBを選択した場合、少なくとも1つのオプションを追加する必要がある
- 各オプションのlabelは必須
- 金額は0以上の整数

### ユーザー画面
- タイプAの場合: status必須
- タイプBの場合: selected_option必須

## CSS (共通)

```css
.custom-option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.custom-option-item input[type="text"] {
  flex: 2;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.custom-option-item input[type="number"] {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.remove-option-btn {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.remove-option-btn:hover {
  background: #c82333;
}

#addOptionBtn {
  margin-top: 10px;
}

.attendance-options label {
  display: block;
  padding: 10px;
  margin-bottom: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
}

.attendance-options label:hover {
  background: #e9ecef;
}

.attendance-options input[type="radio"] {
  margin-right: 8px;
}
```
