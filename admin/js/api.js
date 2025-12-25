// 管理者用API通信モジュール
const AdminAPI = {
  baseUrl: CONFIG.API_URL,

  // 共通リクエスト処理
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('認証が必要です');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const config = {
      ...options,
      headers
    };

    const url = `${this.baseUrl}?action=${endpoint}`;

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'リクエストに失敗しました');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // イベント管理
  async getEvents(filters = {}) {
    const params = new URLSearchParams({
      action: 'getEvents',
      ...filters
    });
    return await this.request(`getEvents&${params.toString()}`);
  },

  async getEvent(eventId) {
    return await this.request(`getEvent&eventId=${eventId}`);
  },

  async createEvent(eventData) {
    return await this.request('createEvent', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  },

  async updateEvent(eventId, eventData) {
    return await this.request('updateEvent', {
      method: 'POST',
      body: JSON.stringify({ eventId, ...eventData })
    });
  },

  async deleteEvent(eventId) {
    return await this.request('deleteEvent', {
      method: 'POST',
      body: JSON.stringify({ eventId })
    });
  },

  // 出欠管理
  async getAttendances(eventId) {
    return await this.request(`getAttendances&eventId=${eventId}`);
  },

  async updateAttendance(attendanceId, status) {
    return await this.request('updateAttendance', {
      method: 'POST',
      body: JSON.stringify({ attendanceId, status })
    });
  },

  // メンバー管理
  async getMembers(filters = {}) {
    const params = new URLSearchParams({
      action: 'getMembers',
      ...filters
    });
    return await this.request(`getMembers&${params.toString()}`);
  },

  async getMember(memberId) {
    return await this.request(`getMember&memberId=${memberId}`);
  },

  async updateMember(memberId, memberData) {
    return await this.request('updateMember', {
      method: 'POST',
      body: JSON.stringify({ memberId, ...memberData })
    });
  },

  async updateMemberRole(memberId, role) {
    return await this.request('updateMemberRole', {
      method: 'POST',
      body: JSON.stringify({ memberId, role })
    });
  },

  // 支払い管理
  async getPayments(filters = {}) {
    const params = new URLSearchParams({
      action: 'getPayments',
      ...filters
    });
    return await this.request(`getPayments&${params.toString()}`);
  },

  async updatePayment(paymentId, status) {
    return await this.request('updatePayment', {
      method: 'POST',
      body: JSON.stringify({ paymentId, status })
    });
  },

  // 領収書管理
  async getReceipts(filters = {}) {
    const params = new URLSearchParams({
      action: 'getReceipts',
      ...filters
    });
    return await this.request(`getReceipts&${params.toString()}`);
  },

  async issueReceipt(paymentId) {
    return await this.request('issueReceipt', {
      method: 'POST',
      body: JSON.stringify({ paymentId })
    });
  },

  // 分析データ
  async getDashboardStats() {
    return await this.request('getDashboardStats');
  },

  async getAttendanceAnalytics(period = 'month') {
    return await this.request(`getAttendanceAnalytics&period=${period}`);
  },

  async getPaymentAnalytics(period = 'month') {
    return await this.request(`getPaymentAnalytics&period=${period}`);
  }
};
