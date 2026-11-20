import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('lostlink_token')) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem('lostlink_token'))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user, loading,
    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('lostlink_token', data.token);
      setUser(data.user);
      return data.user;
    },
    async register(values) {
      const { data } = await api.post('/auth/register', values);
      localStorage.setItem('lostlink_token', data.token);
      setUser(data.user);
      return data.user;
    },
    logout() {
      localStorage.removeItem('lostlink_token');
      setUser(null);
    },
    setUser
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
