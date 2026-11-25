import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('sahatn_user') || localStorage.getItem('sahatn_doctor_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sahatn_token') || null);
  const [loading, setLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState(null); // { tempToken, user, role }

  const setAuthSession = (newUser, newToken) => {
    if (newToken) {
      localStorage.setItem('sahatn_token', newToken);
      setToken(newToken);
    }
    if (newUser) {
      localStorage.setItem('sahatn_user', JSON.stringify(newUser));
      if (newUser.role === 'DOCTOR' || newUser.doctorId) {
        localStorage.setItem('sahatn_doctor_user', JSON.stringify(newUser));
        localStorage.setItem('sahatn_doctor_authenticated', 'true');
        sessionStorage.setItem('sahatn_doctor_authenticated', 'true');
        sessionStorage.setItem('sahatn_doctor_active_session', 'true');
        sessionStorage.removeItem('sahatn_doctor_session_locked');
        if (newUser.doctorId) {
          localStorage.setItem('sahatn_active_doctor_id', newUser.doctorId);
        }
      } else {
        localStorage.removeItem('sahatn_doctor_user');
        localStorage.removeItem('sahatn_doctor_authenticated');
        localStorage.removeItem('sahatn_active_doctor_id');
        sessionStorage.removeItem('sahatn_doctor_authenticated');
        sessionStorage.removeItem('sahatn_doctor_active_session');
      }
      setUser(newUser);
    }
  };

  useEffect(() => {
    async function initUser() {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('sahatn_user', JSON.stringify(res.user));
            if (res.user.role === 'DOCTOR' || res.user.doctorId) {
              localStorage.setItem('sahatn_doctor_user', JSON.stringify(res.user));
              localStorage.setItem('sahatn_doctor_authenticated', 'true');
              sessionStorage.setItem('sahatn_doctor_authenticated', 'true');
              sessionStorage.setItem('sahatn_doctor_active_session', 'true');
              sessionStorage.removeItem('sahatn_doctor_session_locked');
            } else {
              localStorage.removeItem('sahatn_doctor_user');
              localStorage.removeItem('sahatn_doctor_authenticated');
              localStorage.removeItem('sahatn_active_doctor_id');
              sessionStorage.removeItem('sahatn_doctor_authenticated');
            }
          } else {
            logout();
          }
        } catch (err) {
          console.warn('[Auth] Token validation error, clearing:', err);
          logout();
        }
      }
      setLoading(false);
    }
    initUser();
  }, [token]);

  const login = async (emailOrUser, passwordOrToken) => {
    // Handle direct user session setting e.g. from onboarding finalization
    if (typeof emailOrUser === 'object' && emailOrUser !== null) {
      setAuthSession(emailOrUser, passwordOrToken);
      return { success: true, user: emailOrUser };
    }

    const res = await api.login({ email: emailOrUser, password: passwordOrToken });
    if (res.requires2FA) {
      setPending2FA({
        tempToken: res.tempToken,
        user: res.user,
        role: res.role,
        maskedEmail: res.maskedEmail
      });
      return { requires2FA: true };
    }

    if (res.success && res.token) {
      setAuthSession(res.user, res.token);
      return { success: true, user: res.user };
    }

    throw new Error(res.message || 'Échec de connexion');
  };

  const loginWithGoogle = async (googlePayload) => {
    const res = await api.googleLogin(googlePayload);
    if (res.success && res.token) {
      setAuthSession(res.user, res.token);
      return { success: true, user: res.user, isNewUser: res.isNewUser };
    }
    throw new Error(res.message || 'Échec de connexion avec Google');
  };

  const confirm2FA = async (code) => {
    if (!pending2FA) throw new Error('Aucune session 2FA en attente');
    const res = await api.verify2FA({
      tempToken: pending2FA.tempToken,
      code
    });

    if (res.success && res.token) {
      setAuthSession(res.user, res.token);
      setPending2FA(null);
      return { success: true, user: res.user };
    }
    throw new Error(res.message || 'Code 2FA invalide');
  };

  const cancel2FA = () => {
    setPending2FA(null);
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.token) {
      setAuthSession(res.user, res.token);
      return { success: true, user: res.user };
    }
    return res;
  };

  const updateProfile = async (profileData) => {
    const res = await api.updateProfile(profileData);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('sahatn_user', JSON.stringify(res.user));
      return res;
    }
    throw new Error(res.message || 'Échec de mise à jour du profil');
  };

  const logout = useCallback(async () => {
    try {
      if (token) await api.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('sahatn_token');
    localStorage.removeItem('sahatn_user');
    localStorage.removeItem('sahatn_user_v2');
    localStorage.removeItem('sahatn_doctor_user');
    localStorage.removeItem('sahatn_doctor_authenticated');
    localStorage.removeItem('sahatn_active_doctor_id');
    sessionStorage.removeItem('sahatn_doctor_authenticated');
    sessionStorage.removeItem('sahatn_doctor_active_session');
    setToken(null);
    setUser(null);
    setPending2FA(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      role: user?.role || null,
      pending2FA,
      login,
      loginWithGoogle,
      setAuthSession,
      confirm2FA,
      cancel2FA,
      register,
      logout,
      updateProfile,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
