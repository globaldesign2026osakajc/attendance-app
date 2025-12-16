// イベント作成・編集フォーム
class EventForm {
  constructor() {
    this.eventId = null;
    this.event = null;
    this.isEditMode = false;
  }

  async init() {
    // URLからイベントIDを取得（編集モード）
    const params = new URLSearchParams(window.location.search);
    this.eventId = params.get('id');

    if (this.eventId) {
      this.isEditMode = true;
      await this.loadEvent();
    }

    this.setupEventListeners();
    this.updateFormTitle();

    // 新規作成時にタイプBが選択されていたら初期オプションを追加
    if (!this.isEditMode) {
      const typeBRadio = document.querySelector('input[name="attendance_type"][value="B"]');
      if (typeBRadio && typeBRadio.checked) {
        const existingOptions = document.querySelectorAll('.custom-option-item');
        if (existingOptions.length === 0) {
          this.addCustomOption('', 0);
        }
      }
    }
  }

  async loadEvent() {
    try {
      showLoading();
      const response = await AdminAPI.getEvent(this.eventId);
      this.event = response.data;
      this.fillForm();
    } catch (error) {
      showError('イベント情報の読み込みに失敗しました: ' + error.message);
      setTimeout(() => window.location.href = 'events.html', 2000);
    } finally {
      hideLoading();
    }
  }

  fillForm() {
    if (!this.event) return;

    document.getElementById('eventName').value = this.event.title;
    document.getElementById('eventDescription').value = this.event.description || '';
    document.getElementById('eventLocation').value = this.event.location || '';

    // 日時を分割
    const eventDate = new Date(this.event.date);
    const dateStr = eventDate.toISOString().split('T')[0];
    const timeStr = eventDate.toTimeString().substring(0, 5);

    document.getElementById('eventDate').value = dateStr;
    document.getElementById('eventTime').value = timeStr;

    // 締切
    if (this.event.deadline) {
      const deadlineDate = new Date(this.event.deadline);
      const deadlineDateStr = deadlineDate.toISOString().split('T')[0];
      const deadlineTimeStr = deadlineDate.toTimeString().substring(0, 5);

      document.getElementById('deadlineDate').value = deadlineDateStr;
      document.getElementById('deadlineTime').value = deadlineTimeStr;
    }

    // 参加費
    document.getElementById('eventFee').value = this.event.fee_amount || '';

    // その他の設定
    document.getElementById('requirePayment').checked = this.event.requirePayment || false;
    document.getElementById('allowLateRegistration').checked = this.event.allowLateRegistration || false;
    document.getElementById('sendNotification').checked = this.event.sendNotification !== false;

    // 最大参加者数
    document.getElementById('maxParticipants').value = this.event.maxParticipants || '';

    // 出欠タイプ設定
    if (this.event.attendance_type) {
      const radio = document.querySelector(`input[name="attendance_type"][value="${this.event.attendance_type}"]`);
      if (radio) radio.checked = true;

      // タイプBの場合、カスタムオプションを表示
      if (this.event.attendance_type === 'B') {
        this.toggleCustomOptions(true);

        // custom_optionsを解析して表示
        if (this.event.custom_options) {
          const options = typeof this.event.custom_options === 'string'
            ? JSON.parse(this.event.custom_options)
            : this.event.custom_options;

          options.forEach(opt => {
            this.addCustomOption(opt.label, opt.amount);
          });
        }
      }
    }
  }

  updateFormTitle() {
    const title = document.getElementById('formTitle');
    if (title) {
      title.textContent = this.isEditMode ? 'イベント編集' : '新規イベント作成';
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.textContent = this.isEditMode ? '更新' : '作成';
    }
  }

  setupEventListeners() {
    // フォーム送信
    const form = document.getElementById('eventForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitForm();
      });
    }

    // キャンセルボタン
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('編集を中止しますか？')) {
          window.location.href = 'events.html';
        }
      });
    }

    // 出欠タイプの切り替え
    const attendanceTypeRadios = document.querySelectorAll('input[name="attendance_type"]');
    attendanceTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isTypeB = e.target.value === 'B';
        this.toggleCustomOptions(isTypeB);

        // タイプBを選択した時、オプションが0個なら最初のオプションを追加
        if (isTypeB) {
          const existingOptions = document.querySelectorAll('.custom-option-item');
          if (existingOptions.length === 0) {
            this.addCustomOption('', 0);
          }
        }
      });
    });

    // オプション追加ボタン
    const addOptionBtn = document.getElementById('addOptionBtn');
    if (addOptionBtn) {
      addOptionBtn.addEventListener('click', () => {
        this.addCustomOption();
      });
    }

    // 参加費入力時の自動チェック
    const feeInput = document.getElementById('eventFee');
    const requirePaymentCheckbox = document.getElementById('requirePayment');

    if (feeInput && requirePaymentCheckbox) {
      feeInput.addEventListener('input', (e) => {
        if (e.target.value && parseInt(e.target.value) > 0) {
          requirePaymentCheckbox.checked = true;
        }
      });
    }

    // 日時の自動締切設定
    const dateInput = document.getElementById('eventDate');
    const timeInput = document.getElementById('eventTime');
    const deadlineDateInput = document.getElementById('deadlineDate');
    const deadlineTimeInput = document.getElementById('deadlineTime');

    if (dateInput && !this.isEditMode) {
      dateInput.addEventListener('change', () => {
        if (!deadlineDateInput.value) {
          // イベント日の3日前を自動設定
          const eventDate = new Date(dateInput.value);
          eventDate.setDate(eventDate.getDate() - 3);
          deadlineDateInput.value = eventDate.toISOString().split('T')[0];
        }
      });
    }
  }

  validateForm() {
    const name = document.getElementById('eventName').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;

    if (!name) {
      showError('イベント名を入力してください');
      return false;
    }

    if (!date) {
      showError('開催日を選択してください');
      return false;
    }

    if (!time) {
      showError('開催時刻を選択してください');
      return false;
    }

    // イベント日時が過去でないかチェック（新規作成時のみ）
    if (!this.isEditMode) {
      const eventDateTime = new Date(`${date}T${time}`);
      const now = new Date();

      if (eventDateTime < now) {
        if (!confirm('過去の日時が指定されていますが、よろしいですか？')) {
          return false;
        }
      }
    }

    // 締切日時のチェック
    const deadlineDate = document.getElementById('deadlineDate').value;
    const deadlineTime = document.getElementById('deadlineTime').value;

    if (deadlineDate && deadlineTime) {
      const eventDateTime = new Date(`${date}T${time}`);
      const deadlineDateTime = new Date(`${deadlineDate}T${deadlineTime}`);

      if (deadlineDateTime > eventDateTime) {
        showError('締切日時はイベント開催日時より前に設定してください');
        return false;
      }
    }

    return true;
  }

  async submitForm() {
    if (!this.validateForm()) return;

    try {
      showLoading();

      const formData = this.getFormData();

      if (this.isEditMode) {
        await AdminAPI.updateEvent(this.eventId, formData);
        showSuccess('イベントを更新しました');
      } else {
        await AdminAPI.createEvent(formData);
        showSuccess('イベントを作成しました');
      }

      // イベント一覧に戻る
      setTimeout(() => {
        window.location.href = 'events.html';
      }, 1500);
    } catch (error) {
      showError('イベントの保存に失敗しました: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  getFormData() {
    const name = document.getElementById('eventName').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const location = document.getElementById('eventLocation').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const deadlineDate = document.getElementById('deadlineDate').value;
    const deadlineTime = document.getElementById('deadlineTime').value;
    const fee = document.getElementById('eventFee').value;
    const maxParticipants = document.getElementById('maxParticipants').value;

    // 日時を結合
    const eventDateTime = new Date(`${date}T${time}`).toISOString();

    const formData = {
      name,
      description,
      location,
      date: eventDateTime,
      fee: fee ? parseInt(fee) : 0,
      requirePayment: document.getElementById('requirePayment').checked,
      allowLateRegistration: document.getElementById('allowLateRegistration').checked,
      sendNotification: document.getElementById('sendNotification').checked,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null
    };

    // 締切日時
    if (deadlineDate && deadlineTime) {
      formData.deadline = new Date(`${deadlineDate}T${deadlineTime}`).toISOString();
    }

    // 出欠タイプとカスタムオプション
    const attendanceType = document.querySelector('input[name="attendance_type"]:checked')?.value || 'A';
    formData.attendance_type = attendanceType;

    if (attendanceType === 'B') {
      const customOptions = [];
      document.querySelectorAll('.custom-option-item').forEach(item => {
        const label = item.querySelector('.option-label').value.trim();
        const amount = parseInt(item.querySelector('.option-amount').value) || 0;
        if (label) {
          customOptions.push({ label, amount });
        }
      });
      formData.custom_options = JSON.stringify(customOptions);
    } else {
      formData.custom_options = '';
    }

    return formData;
  }

  // カスタムオプション表示/非表示の切り替え
  toggleCustomOptions(show) {
    const container = document.getElementById('customOptionsContainer');
    if (container) {
      container.style.display = show ? 'block' : 'none';
    }
  }

  // カスタムオプションを追加
  addCustomOption(label = '', amount = 0) {
    const optionsList = document.getElementById('optionsList');
    if (!optionsList) return;

    const index = Date.now(); // ユニークなインデックス
    const optionHtml = `
      <div class="custom-option-item" data-index="${index}">
        <input type="text" class="option-label" placeholder="例: 15日参加宿泊なし" value="${label}">
        <input type="number" class="option-amount" placeholder="金額 (円)" value="${amount}" min="0">
        <button type="button" class="remove-option-btn" onclick="eventForm.removeOption(${index})">削除</button>
      </div>
    `;
    optionsList.insertAdjacentHTML('beforeend', optionHtml);
  }

  // カスタムオプションを削除
  removeOption(index) {
    const option = document.querySelector(`[data-index="${index}"]`);
    if (option) {
      option.remove();
    }
  }
}

// グローバル変数
let eventForm;

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  eventForm = new EventForm();
  await eventForm.init();
});
