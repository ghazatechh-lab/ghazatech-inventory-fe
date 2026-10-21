import React, { createContext, useContext, useState, useEffect } from 'react';
import { hasPermission as checkPermission, hasRole as checkRole } from '../utils/permissions';
import { authApi } from '../api/authApi';
import { setAccessToken, refreshSession, errorMessage } from '../api/client';
import { toast } from 'sonner';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  useEffect(() => {
    // Remove obsolete mock credentials and browser database on upgrade.
    ['perfumasol_access_token','perfumasol_refresh_token','perfumasol_user','perfumasol_db_v1'].forEach((k) => localStorage.removeItem(k));
    let live = true;
    refreshSession().then(() => authApi.refreshUser()).then(({data}) => { if (live) setUser(data); })
      .catch(() => { setAccessToken(null); }).finally(() => { if (live) setInitializing(false); });
    const expired = () => { setUser(null); setAccessToken(null); toast.error('Session expired. Please sign in.'); };
    window.addEventListener('auth:unauthorized', expired);
    return () => { live = false; window.removeEventListener('auth:unauthorized', expired); };
  }, []);
  const login = async (username, password) => {
    setLoading(true);
    try { const {data} = await authApi.login({ username, password }); setAccessToken(data.access); setUser(data.user); toast.success(`Welcome back, ${data.user.name || data.user.username}!`); return true; }
    catch (error) { toast.error(errorMessage(error)); return false; }
    finally { setLoading(false); }
  };
  const logout = async () => {
    try { await authApi.logout(); } catch (error) { toast.error(errorMessage(error)); }
    finally { setAccessToken(null); setUser(null); }
  };
  const refreshUser = async () => { const {data} = await authApi.refreshUser(); setUser(data); };
  const updateProfile = async (data) => { const res = await authApi.updateProfile(data); setUser(res.data); return res.data; };
  const switchRole = () => toast.info('Your role is assigned by an administrator. Sign in with the appropriate account.');
  return <AuthContext.Provider value={{ user, storeSetup:user?.storeSetup||{}, singleLocationMode:!!user?.storeSetup?.singleLocationMode, organization: user?.organization || '', role: user?.role || 'staff', permissions: user?.permissions || [], branch: user?.branch || '', warehouse: user?.warehouse || '', loading, initializing, login, logout, refreshUser, switchRole, updateProfile, hasPermission: (p) => checkPermission(user,p), hasRole: (r) => checkRole(user,r) }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('AuthProvider is required'); return ctx; };
