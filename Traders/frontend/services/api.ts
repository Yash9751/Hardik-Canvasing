import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      try {
        await AsyncStorage.removeItem('authToken');
      } catch (storageError) {
        console.error('Error removing auth token:', storageError);
      }
      // Redirect to login
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    console.log('authAPI.login called with:', credentials);
    console.log('Making request to:', `${API_CONFIG.BASE_URL}/auth/login`);
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('authAPI.login success:', response.data);
      return response;
    } catch (error) {
      console.error('authAPI.login error:', error);
      throw error;
    }
  },
};

// Dashboard APIs
export const dashboardAPI = {
  getTodaySummary: () => api.get('/dashboard/today'),
  getTodayPurchase: () => api.get('/dashboard/today-purchase'),
  getTodaySell: () => api.get('/dashboard/today-sell'),
  getTodayLoading: () => api.get('/dashboard/today-loading'),
  getTodayPurchaseLoading: () => api.get('/dashboard/today-purchase-loading'),
  getTodaySellLoading: () => api.get('/dashboard/today-sell-loading'),
};

// Parties API
export const partiesAPI = {
  getAll: (params?: { party_type?: string; search?: string }) =>
    api.get('/parties', { params }),
  getById: (id: number) => api.get(`/parties/${id}`),
  create: (data: any) => api.post('/parties', data),
  update: (id: number, data: any) => api.put(`/parties/${id}`, data),
  delete: (id: number) => api.delete(`/parties/${id}`),
};

// Items API
export const itemsAPI = {
  getAll: () => api.get('/items'),
  getById: (id: number) => api.get(`/items/${id}`),
  create: (data: any) => api.post('/items', data),
  update: (id: number, data: any) => api.put(`/items/${id}`, data),
  delete: (id: number) => api.delete(`/items/${id}`),
};

// Ex Plants API
export const exPlantsAPI = {
  getAll: () => api.get('/ex-plants'),
  getById: (id: number) => api.get(`/ex-plants/${id}`),
  create: (data: any) => api.post('/ex-plants', data),
  update: (id: number, data: any) => api.put(`/ex-plants/${id}`, data),
  delete: (id: number) => api.delete(`/ex-plants/${id}`),
};

// Transports API
export const transportsAPI = {
  getAll: () => api.get('/transports'),
  getById: (id: number) => api.get(`/transports/${id}`),
  create: (data: any) => api.post('/transports', data),
  update: (id: number, data: any) => api.put(`/transports/${id}`, data),
  delete: (id: number) => api.delete(`/transports/${id}`),
};

// Company Profile API
export const companyProfileAPI = {
  getCompanyProfile: () => api.get('/company-profile'),
  updateCompanyProfile: (data: any) => api.put('/company-profile', data),
};

// Brokers API
export const brokersAPI = {
  getAll: () => api.get('/brokers'),
  getById: (id: number) => api.get(`/brokers/${id}`),
  create: (data: any) => api.post('/brokers', data),
  update: (id: number, data: any) => api.put(`/brokers/${id}`, data),
  delete: (id: number) => api.delete(`/brokers/${id}`),
};

// Delivery Conditions API
export const deliveryConditionsAPI = {
  getAll: () => api.get('/delivery-conditions'),
  getById: (id: number) => api.get(`/delivery-conditions/${id}`),
  create: (data: any) => api.post('/delivery-conditions', data),
  update: (id: number, data: any) => api.put(`/delivery-conditions/${id}`, data),
  delete: (id: number) => api.delete(`/delivery-conditions/${id}`),
};

// Payment Conditions API
export const paymentConditionsAPI = {
  getAll: () => api.get('/payment-conditions'),
  getById: (id: number) => api.get(`/payment-conditions/${id}`),
  create: (data: any) => api.post('/payment-conditions', data),
  update: (id: number, data: any) => api.put(`/payment-conditions/${id}`, data),
  delete: (id: number) => api.delete(`/payment-conditions/${id}`),
};

// Sauda API (Purchase/Sell transactions)
export const saudaAPI = {
  getAll: (params?: { 
    transaction_type?: string; 
    item_id?: number; 
    party_id?: number; 
    date?: string;
    start_date?: string;
    end_date?: string;
    delivery_condition_id?: string;
  }) =>
    api.get('/sauda', { params }),
  getById: (id: number) => api.get(`/sauda/${id}`),
  create: (data: any) => api.post('/sauda', data),
  update: (id: number, data: any) => api.put(`/sauda/${id}`, data),
  delete: (id: number) => api.delete(`/sauda/${id}`),
  getPending: (params?: { transaction_type?: string; item_id?: number }) =>
    api.get('/sauda/pending', { params }),
  getNextNumber: () => api.get('/sauda/next-number'),
};

// Loading API
export const loadingAPI = {
  getAll: (params?: { sauda_id?: number; date?: string }) =>
    api.get('/loading', { params }),
  getById: (id: number) => api.get(`/loading/${id}`),
  create: (data: any) => api.post('/loading', data),
  update: (id: number, data: any) => api.put(`/loading/${id}`, data),
  delete: (id: number) => api.delete(`/loading/${id}`),
};

// Rates API
export const ratesAPI = {
  getAll: () => api.get('/rates/current'),
  getById: (id: number) => api.get(`/rates/${id}`),
  create: (data: any) => api.post('/rates', data),
  update: (id: number, data: any) => api.put(`/rates/${id}`, data),
  delete: (id: number) => api.delete(`/rates/${id}`),
  getHistory: (itemId: number, params?: { start_date?: string; end_date?: string }) =>
    api.get(`/rates/history/${itemId}`, { params }),
};

// Stock API
export const stockAPI = {
  getAll: (params?: { status?: string }) => api.get('/stock', { params }),
  getByItem: (itemId: number, params?: { ex_plant_id?: number }) => 
    api.get(`/stock/item/${itemId}`, { params }),
  getByExPlant: (exPlantId: number) => api.get(`/stock/ex-plant/${exPlantId}`),
  getSummary: () => api.get('/stock/summary'),
  getPartyBreakdown: (params?: { status?: string }) => api.get('/stock/party-breakdown', { params }),
  recalculateAll: () => api.post('/stock/recalculate-all'),
};

// Report API
export const reportAPI = {
  getAllTrades: (params?: { 
    start_date?: string; 
    end_date?: string; 
    include_zero?: boolean;
    transaction_type?: string;
    party_id?: string;
    item_ids?: string;
    delivery_due_date_start?: string;
    delivery_due_date_end?: string;
    delivery_condition_id?: string;
  }) =>
    api.get('/reports/all-trades', { params }),
  getPendingTrades: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/reports/pending-trades', { params }),
  getOverdueTrades: () => api.get('/reports/overdue-trades'),
  getStockWise: (params?: { transaction_type?: string; item_ids?: string; ex_plant_ids?: string }) =>
    api.get('/reports/stock-wise', { params }),
  getPartyWise: (params?: { transaction_type?: string; party_id?: number; party_ids?: string; item_ids?: string }) =>
    api.get('/reports/party-wise', { params }),
  getBrokerWise: (params?: { transaction_type?: string; broker_id?: number; broker_ids?: string; item_ids?: string; start_date?: string; end_date?: string }) =>
    api.get('/reports/broker-wise', { params }),
  exportPDF: (params: any) => api.get('/reports/export/pdf', { params, responseType: 'blob' }),
  exportExcel: (params: any) => api.get('/reports/export/excel', { params, responseType: 'blob' }),
};

// Plus Minus API
export const plusMinusAPI = {
  getAll: (params?: { date?: string; item_id?: number; ex_plant_id?: number }) =>
    api.get('/plusminus', { params }),
  generate: (data: { date: string }) => api.post('/plusminus/generate', data),
  getSummary: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/plusminus/summary', { params }),
  getToday: () => api.get('/plusminus/today'),
  getFuture: () => api.get('/plusminus/future'),
  getPendingStock: () => api.get('/plusminus/pending-stock'),
  recalculateAll: () => api.post('/plusminus/recalculate-all'),
  exportPDF: (params: any) => api.get('/plusminus/export/pdf', { params, responseType: 'blob' }),
  exportExcel: (params: any) => api.get('/plusminus/export/excel', { params, responseType: 'blob' }),
};

// Vendors API
export const vendorsAPI = {
  getAll: () => api.get('/vendors'),
  getById: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
  // Import contacts
  importCSV: (file: File) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    return api.post('/vendors/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  importVCF: (file: File) => {
    const formData = new FormData();
    formData.append('vcfFile', file);
    return api.post('/vendors/import/vcf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  importFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/vendors/import/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadSampleCSV: () => api.get('/vendors/sample-csv', { responseType: 'blob' }),
  // Channel management
  getAllChannels: () => api.get('/vendors/channels'),
  createChannel: (data: any) => api.post('/vendors/channels', data),
  getVendorsInChannel: (channelId: number) => api.get(`/vendors/channels/${channelId}/vendors`),
  addVendorsToChannel: (channelId: number, vendorIds: number[]) => api.post(`/vendors/channels/${channelId}/vendors`, { vendorIds }),
  getChannelRates: (params?: { channel_id?: number; date?: string }) => api.get('/vendors/channels/rates', { params }),
  setChannelRates: (data: { channel_id: number; rates: Array<{ item_id: number; rate_per_10kg: number }> }) => 
    api.post('/vendors/channels/rates', data),
  // Broadcast message generation
  generateChannelBroadcastMessage: (channelId: number) => 
    api.get(`/vendors/channels/${channelId}/broadcast/message`),
  saveBroadcastHistory: (data: { channel_id: number; message_content: string; recipients_count: number; status: string }) => 
    api.post('/vendors/broadcast/history', data),
  getBroadcastHistory: (params?: { channel_id?: number; start_date?: string; end_date?: string }) => 
    api.get('/vendors/broadcast/history', { params }),
  
  // Direct messaging integration
  getMessagingStatus: () => api.get('/vendors/messaging/status'),
  generateDirectMessageInstructions: (channelId: number, message: string) => 
    api.post(`/vendors/channels/${channelId}/generate-message`, { message }),
  generateMessagingCSV: (channelId: number, message: string) => 
    api.post(`/vendors/channels/${channelId}/export-csv`, { message }, { responseType: 'blob' }),
  sendActualMessages: (channelId: number, message: string, preferWhatsApp: boolean = true) => 
    api.post(`/vendors/channels/${channelId}/send-messages`, { message, preferWhatsApp }),
};

export default api; 