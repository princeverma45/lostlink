import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lostlink_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(error) {
  return error.response?.data?.error || (error.code === 'ECONNABORTED'
    ? 'The request took too long. Please try again.'
    : 'Unable to reach LostLink. Check that the API server is running.');
}

export default api;
