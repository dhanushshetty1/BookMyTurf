import api from './api';

export const turfService = {
  // Turf Operations
  getAllTurfs: async () => {
    const response = await api.get('/turfs');
    return response.data;
  },
  
  getTurfById: async (id: string) => {
    const response = await api.get(`/turfs/${id}`);
    return response.data;
  },

  getMyTurfs: async () => {
    const response = await api.get('/turfs/my-turfs');
    return response.data;
  },

  createTurf: async (turfData: FormData | any) => {
    const headers = turfData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const response = await api.post('/turfs', turfData, { headers });
    return response.data;
  },

  updateTurf: async (id: string, turfData: FormData | any) => {
    const headers = turfData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const response = await api.put(`/turfs/${id}`, turfData, { headers });
    return response.data;
  },

  // Court Operations
  addCourt: async (turfId: string, courtData: FormData | any) => {
    const headers = courtData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const response = await api.post(`/turfs/${turfId}/courts`, courtData, { headers });
    return response.data;
  },

  updateCourt: async (courtId: string, courtData: FormData | any) => {
    const headers = courtData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const response = await api.put(`/turfs/courts/${courtId}`, courtData, { headers });
    return response.data;
  },

  deleteCourt: async (courtId: string) => {
    const response = await api.delete(`/turfs/courts/${courtId}`);
    return response.data;
  },

  toggleCourtStatus: async (courtId: string, status: string) => {
    const response = await api.put(`/turfs/courts/${courtId}`, { status });
    return response.data;
  },

  // Slot Operations (Now on courtId)
  bulkAddSlots: async (courtId: string, payload: any) => {
    const response = await api.post(`/turfs/courts/${courtId}/slots/bulk`, payload);
    return response.data;
  },

  setHolidayMode: async (courtId: string, date: string) => {
    const response = await api.post(`/turfs/courts/${courtId}/holiday`, { date });
    return response.data;
  },

  toggleSlotStatus: async (slotId: string, status: string) => {
    const response = await api.patch(`/turfs/slots/${slotId}`, { status });
    return response.data;
  }
};
