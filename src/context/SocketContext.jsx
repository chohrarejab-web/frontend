import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api, { PRIMARY_API_URL, FALLBACK_API_URL, getActiveApiUrl } from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, role, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [queue, setQueue] = useState([]);
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [doctorDelays, setDoctorDelays] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const getDoctorDelay = useCallback((docId) => {
    if (!docId) return delayMinutes;
    return doctorDelays[docId] !== undefined ? doctorDelays[docId] : 0;
  }, [doctorDelays, delayMinutes]);

  // Keep ref to avoid stale closures in socket callbacks
  const userRef = useRef({ user, role, isAuthenticated });
  useEffect(() => {
    userRef.current = { user, role, isAuthenticated };
  }, [user, role, isAuthenticated]);

  // Determine query parameters based on role/auth
  const getFilterParams = useCallback(() => {
    const cur = userRef.current;
    if (cur.role === 'ADMIN') {
      return { space: 'all' };
    }
    const savedActiveDocId = typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null;
    const docId = cur.user?.doctorId || cur.user?.doctor_id || savedActiveDocId || (cur.role === 'DOCTOR' ? (cur.user?.id || cur.user?.uuid) : null);
    if (cur.role === 'DOCTOR' || cur.user?.doctorId || cur.user?.doctor_id || savedActiveDocId) {
      return {
        space: 'doctor',
        doctorId: docId || 'doc-1',
        doctorName: cur.user?.name || ''
      };
    }
    if (cur.isAuthenticated && cur.user?.id) {
      return {
        space: 'patient',
        patientId: cur.user.id,
        userId: cur.user.id
      };
    }
    return { space: 'public' };
  }, []);

  // Check if a notification belongs to the current user's actor view
  const doesNotificationMatchUser = useCallback((notif) => {
    if (!notif) return false;
    const cur = userRef.current;
    if (cur.role === 'ADMIN') return true;

    const savedActiveDocId = typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null;
    const isDoc = cur.role === 'DOCTOR' || cur.user?.doctorId || cur.user?.doctor_id || Boolean(savedActiveDocId);

    if (isDoc) {
      const activeDocId = cur.user?.doctorId || cur.user?.doctor_id || savedActiveDocId || (cur.user?.id || 'doc-1');
      const activeDocName = (cur.user?.name || '').toLowerCase().replace(/^(dr\.?|docteur)\s*/i, '').trim();

      // Platform broadcast
      if (notif.space === 'all' || notif.space === 'public') {
        if (notif.doctorId && notif.doctorId !== activeDocId) return false;
        return true;
      }

      if (notif.space === 'doctor' || notif.space === 'secretaire') {
        // If notification has explicit doctorId, it must match
        if (notif.doctorId) {
          return notif.doctorId === activeDocId;
        }
        // If notification has explicit doctorName, it must match
        if (notif.doctorName && activeDocName) {
          const nDoc = notif.doctorName.toLowerCase().replace(/^(dr\.?|docteur)\s*/i, '').trim();
          return nDoc.includes(activeDocName) || activeDocName.includes(nDoc);
        }
        // Doctor-specific categories (patient, rdv, avis, queue) without explicit doctor ID
        const isDoctorCategory = notif.category === 'patient' || notif.category === 'rdv' || notif.category === 'avis' || notif.category === 'queue';
        if (isDoctorCategory) {
          return activeDocId === 'doc-1';
        }
        return true;
      }
      return false;
    }

    if (cur.isAuthenticated && cur.user?.id) {
      const pid = cur.user.id;
      if (notif.space === 'all' || notif.space === 'public') return true;
      if (notif.space === 'patient') {
        if (notif.patientId && notif.patientId === pid) return true;
        if (notif.userId && notif.userId === pid) return true;
        if (!notif.patientId && !notif.userId) return true;
      }
      return false;
    }

    // Public visitor
    return notif.space === 'public' || notif.space === 'all';
  }, []);

  // Central fetch method to synchronize notifications with database
  const refreshNotifications = useCallback(async (customParams = null) => {
    try {
      setLoadingNotifs(true);
      const params = customParams || getFilterParams();
      const res = await api.getNotifications(params);
      const list = res?.notifications || res?.data || [];
      if (Array.isArray(list)) {
        setNotifications(list);
      }
    } catch (err) {
      console.warn('[SocketContext] Error syncing notifications:', err.message);
    } finally {
      setLoadingNotifs(false);
    }
  }, [getFilterParams]);

  // Initial and reactive fetch on auth changes
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications, isAuthenticated, role]);

  // Callback ref to access latest functions without re-triggering WebSocket connection
  const callbacksRef = useRef({});
  useEffect(() => {
    callbacksRef.current = { doesNotificationMatchUser, refreshNotifications };
  }, [doesNotificationMatchUser, refreshNotifications]);

  // Track joined rooms locally to eliminate duplicate emits
  const joinedRoomsRef = useRef(new Set());

  // WebSocket Connection & Real-Time Event Handlers — MOUNT ONCE ONLY
  useEffect(() => {
    // Connect to the active backend API URL (Railway primary, falls back to localhost:4000 if unavailable)
    let currentSocketUrl = getActiveApiUrl() || PRIMARY_API_URL || ((typeof window !== 'undefined' && window.location.port === '5173')
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : '/');
    let primaryFailures = 0;

    const s = io(currentSocketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000
    });

    s.on('connect_error', (err) => {
      if (currentSocketUrl !== FALLBACK_API_URL && FALLBACK_API_URL) {
        primaryFailures += 1;
        if (primaryFailures >= 2) {
          console.warn(`[Socket.io] Primary (${currentSocketUrl}) unavailable (${err.message}). Falling back to ${FALLBACK_API_URL}`);
          currentSocketUrl = FALLBACK_API_URL;
          s.io.uri = FALLBACK_API_URL;
        }
      }
    });

    s.on('connect', () => {
      console.log('[Socket.io] 🟢 Connected:', s.id);
      joinedRoomsRef.current.clear();

      // Auto-join relevant rooms on initial connection
      const cur = userRef.current;
      if (cur.role === 'ADMIN') {
        joinedRoomsRef.current.add('admin');
        s.emit('join:admin');
      } else if (cur.role === 'DOCTOR' || cur.user?.doctorId) {
        const docId = cur.user?.doctorId || cur.user?.id || 'doc-1';
        joinedRoomsRef.current.add(`doctor:${docId}`);
        joinedRoomsRef.current.add(`cabinet:${docId}`);
        s.emit('join:doctor', docId);
        s.emit('join:cabinet', docId);
      } else if (cur.user?.id) {
        joinedRoomsRef.current.add(`patient:${cur.user.id}`);
        s.emit('join:patient', cur.user.id);
      }
    });

    s.on('disconnect', () => {
      console.log('[Socket.io] 🔴 Disconnected');
      joinedRoomsRef.current.clear();
    });

    // Guard queue updates against reference churn to avoid infinite re-render loops
    const updateDelays = (data) => {
      const val = typeof data?.delayMinutes === 'number' ? data.delayMinutes : (typeof data?.minutes === 'number' ? data.minutes : null);
      if (val !== null) {
        if (data?.doctorId) {
          setDoctorDelays(prev => ({ ...prev, [data.doctorId]: val }));
        }
        const cur = userRef.current;
        const curDocId = cur.user?.doctorId || cur.user?.doctor_id || (cur.role === 'DOCTOR' ? (cur.user?.id || cur.user?.uuid) : null);
        if (!data?.doctorId || (curDocId && data.doctorId === curDocId)) {
          setDelayMinutes(prev => (prev === val ? prev : val));
        }
      }
    };

    s.on('queue:init', (data) => {
      if (data?.queue) {
        setQueue(prev => (JSON.stringify(prev) === JSON.stringify(data.queue) ? prev : data.queue));
      }
      updateDelays(data);
    });

    s.on('queue:update', (data) => {
      if (data?.queue) {
        setQueue(prev => (JSON.stringify(prev) === JSON.stringify(data.queue) ? prev : data.queue));
      }
      updateDelays(data);
    });

    s.on('queue:updated', (data) => {
      if (data?.queue) {
        setQueue(prev => (JSON.stringify(prev) === JSON.stringify(data.queue) ? prev : data.queue));
      }
      updateDelays(data);
    });

    s.on('queue:delay', (data) => {
      updateDelays(data);
    });

    // 1. Incoming new notification
    const handleIncomingNotif = (notif) => {
      if (!notif) return;
      if (callbacksRef.current.doesNotificationMatchUser?.(notif)) {
        setNotifications(prev => {
          if (prev.some(item => item.id === notif.id)) {
            return prev;
          }
          return [notif, ...prev];
        });
      }
    };

    s.on('notif:new', handleIncomingNotif);
    s.on('notif:broadcast', handleIncomingNotif);

    // 2. Notification updates (read, markAllRead, delete, clear)
    s.on('notif:update', (data) => {
      if (!data) return;
      if (data.action === 'read' && data.id) {
        setNotifications(prev => prev.map(n => n.id === data.id ? { ...n, read: true } : n));
      } else if (data.action === 'markAllRead' || data.action === 'markAllUnread') {
        const isRead = data.action === 'markAllRead';
        const cur = userRef.current;
        const savedActiveDocId = typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null;
        const currentDocId = cur.user?.doctorId || cur.user?.doctor_id || savedActiveDocId || (cur.user?.id || 'doc-1');
        const currentPid = cur.user?.id || cur.user?.uuid;

        // If markAllRead was scoped to a different doctor, ignore
        if (data.space === 'doctor' && data.doctorId && data.doctorId !== currentDocId) {
          return;
        }
        // If markAllRead was scoped to a different patient, ignore
        if (data.space === 'patient' && data.patientId && currentPid && data.patientId !== currentPid) {
          return;
        }

        setNotifications(prev => prev.map(n => {
          if (data.doctorId && n.doctorId && n.doctorId !== data.doctorId) return n;
          return { ...n, read: isRead };
        }));
      } else if (data.action === 'delete' && data.id) {
        setNotifications(prev => prev.filter(n => n.id !== data.id));
      } else if (data.action === 'clear') {
        const cur = userRef.current;
        const savedActiveDocId = typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null;
        const currentDocId = cur.user?.doctorId || cur.user?.doctor_id || savedActiveDocId || (cur.user?.id || 'doc-1');
        const currentPid = cur.user?.id || cur.user?.uuid;

        // If clear was triggered for a specific doctor
        if (data.space === 'doctor' && data.doctorId) {
          if (data.doctorId === currentDocId) {
            setNotifications([]);
          } else {
            setNotifications(prev => prev.filter(n => n.doctorId !== data.doctorId));
          }
          return;
        }
        // If clear was triggered for a specific patient
        if (data.space === 'patient' && data.patientId) {
          if (!currentPid || data.patientId === currentPid) {
            setNotifications([]);
          }
          return;
        }
        if (data.space && data.space !== 'all') {
          setNotifications(prev => prev.filter(n => n.space !== data.space));
        } else {
          setNotifications([]);
        }
      }
    });

    // 3. Database sync notification
    s.on('notif:sync', () => {
      callbacksRef.current.refreshNotifications?.();
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []); // Run ONCE on mount — completely stable

  // Room joining methods memoized with useCallback and guarded against duplicate emits
  const joinCabinet = useCallback((doctorId) => {
    if (!socket || !doctorId) return;
    const roomKey = `cabinet:${doctorId}`;
    if (joinedRoomsRef.current.has(roomKey)) return;
    joinedRoomsRef.current.add(roomKey);
    socket.emit('join:cabinet', doctorId);
  }, [socket]);

  const joinDoctor = useCallback((doctorId) => {
    if (!socket || !doctorId) return;
    const roomKey = `doctor:${doctorId}`;
    if (joinedRoomsRef.current.has(roomKey)) return;
    joinedRoomsRef.current.add(roomKey);
    socket.emit('join:doctor', doctorId);
  }, [socket]);

  const joinPatient = useCallback((patientId) => {
    if (!socket || !patientId) return;
    const roomKey = `patient:${patientId}`;
    if (joinedRoomsRef.current.has(roomKey)) return;
    joinedRoomsRef.current.add(roomKey);
    socket.emit('join:patient', patientId);
  }, [socket]);

  const joinAdmin = useCallback(() => {
    if (!socket) return;
    const roomKey = 'admin';
    if (joinedRoomsRef.current.has(roomKey)) return;
    joinedRoomsRef.current.add(roomKey);
    socket.emit('join:admin');
  }, [socket]);

  // Keep rooms updated if user logs in / switches roles while socket is connected
  useEffect(() => {
    if (!socket || !socket.connected) return;
    if (role === 'ADMIN') {
      joinAdmin();
    } else if (role === 'DOCTOR' || user?.doctorId) {
      const docId = user?.doctorId || user?.id || 'doc-1';
      joinDoctor(docId);
      joinCabinet(docId);
    } else if (user?.id) {
      joinPatient(user.id);
    }
  }, [socket, role, user?.doctorId, user?.id, joinAdmin, joinDoctor, joinCabinet, joinPatient]);

  // Synchronized user actions with useCallback
  const markAsRead = useCallback(async (id, read = true) => {
    if (!id) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read } : n));
    try {
      await api.markNotificationRead(id, read);
    } catch (err) {
      console.warn('[SocketContext] Error marking notif read:', err.message);
    }
  }, []);

  const markAllAsRead = useCallback(async (params = null) => {
    const isEvent = params && (params.nativeEvent || params._reactName || typeof params.preventDefault === 'function');
    const cleanParams = isEvent ? null : params;
    const cur = userRef.current;

    let targetSpace = null;
    let targetDocId = null;
    let targetDocName = null;
    let targetPatientId = cur.user?.id || cur.user?.uuid || null;

    if (typeof cleanParams === 'string') {
      targetSpace = cleanParams;
    } else if (cleanParams && typeof cleanParams === 'object') {
      targetSpace = cleanParams.space || null;
      targetDocId = cleanParams.doctorId || null;
      targetDocName = cleanParams.doctorName || null;
      if (cleanParams.patientId) targetPatientId = cleanParams.patientId;
    }

    if (!targetSpace) {
      targetSpace = (cur.role === 'ADMIN' || cur.role === 'SUPER_ADMIN') ? 'all' : (cur.role === 'DOCTOR' || cur.user?.doctorId) ? 'doctor' : 'patient';
      const savedDocId = typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null;
      targetDocId = cur.user?.doctorId || cur.user?.doctor_id || savedDocId || (cur.user?.id || null);
      targetDocName = cur.user?.name || null;
    }

    // Set all matching to read in local state
    setNotifications(prev => prev.map(n => {
      if (targetSpace === 'all' || targetSpace === 'patient' || n.space === 'all' || n.space === 'public' || n.space === targetSpace) {
        if (targetDocId && n.doctorId && n.doctorId !== targetDocId) return n;
        return { ...n, read: true };
      }
      return n;
    }));

    try {
      await api.markAllNotificationsRead({
        space: targetSpace,
        doctorId: targetDocId,
        doctorName: targetDocName,
        patientId: targetPatientId,
        read: true
      });
    } catch (err) {
      console.warn('[SocketContext] Error marking all notifs read:', err.message);
    }
  }, []);

  const markAllAsUnread = useCallback(async (params = null) => {
    const isEvent = params && (params.nativeEvent || params._reactName || typeof params.preventDefault === 'function');
    const cleanParams = isEvent ? null : params;
    const cur = userRef.current;

    let targetSpace = null;
    let targetDocId = null;
    let targetDocName = null;
    let targetPatientId = cur.user?.id || cur.user?.uuid || null;

    if (typeof cleanParams === 'string') {
      targetSpace = cleanParams;
    } else if (cleanParams && typeof cleanParams === 'object') {
      targetSpace = cleanParams.space || null;
      targetDocId = cleanParams.doctorId || null;
      targetDocName = cleanParams.doctorName || null;
      if (cleanParams.patientId) targetPatientId = cleanParams.patientId;
    }

    if (!targetSpace) {
      targetSpace = (cur.role === 'ADMIN' || cur.role === 'SUPER_ADMIN') ? 'all' : (cur.role === 'DOCTOR' || cur.user?.doctorId) ? 'doctor' : 'patient';
      const savedDocId = typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null;
      targetDocId = cur.user?.doctorId || cur.user?.doctor_id || savedDocId || (cur.user?.id || null);
      targetDocName = cur.user?.name || null;
    }

    // Set all matching to unread in local state
    setNotifications(prev => prev.map(n => {
      if (targetSpace === 'all' || targetSpace === 'patient' || n.space === 'all' || n.space === 'public' || n.space === targetSpace) {
        if (targetDocId && n.doctorId && n.doctorId !== targetDocId) return n;
        return { ...n, read: false };
      }
      return n;
    }));

    try {
      await api.markAllNotificationsRead({
        space: targetSpace,
        doctorId: targetDocId,
        doctorName: targetDocName,
        patientId: targetPatientId,
        read: false
      });
    } catch (err) {
      console.warn('[SocketContext] Error marking all notifs unread:', err.message);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    if (!id) return;
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await api.deleteNotification(id);
    } catch (err) {
      console.warn('[SocketContext] Error deleting notification:', err.message);
    }
  }, []);

  const clearNotifications = useCallback(async (params = null) => {
    const isEvent = params && (params.nativeEvent || params._reactName || typeof params.preventDefault === 'function');
    const cleanParams = isEvent ? null : params;
    const cur = userRef.current;

    let targetSpace = null;
    let targetDocId = null;
    let targetDocName = null;
    let targetPatientId = cur.user?.id || cur.user?.uuid || null;

    if (typeof cleanParams === 'string') {
      targetSpace = cleanParams;
    } else if (cleanParams && typeof cleanParams === 'object') {
      targetSpace = cleanParams.space || null;
      targetDocId = cleanParams.doctorId || null;
      targetDocName = cleanParams.doctorName || null;
      if (cleanParams.patientId) targetPatientId = cleanParams.patientId;
    }

    if (!targetSpace) {
      targetSpace = (cur.role === 'ADMIN' || cur.role === 'SUPER_ADMIN') ? 'all' : (cur.role === 'DOCTOR' || cur.user?.doctorId) ? 'doctor' : 'patient';
      const savedDocId = typeof localStorage !== 'undefined' ? localStorage.getItem('sahatn_active_doctor_id') : null;
      targetDocId = cur.user?.doctorId || cur.user?.doctor_id || savedDocId || (cur.user?.id || null);
      targetDocName = cur.user?.name || null;
    }

    // Optimistically update local notifications
    setNotifications(prev => {
      if (targetSpace === 'all' || targetSpace === 'patient') return [];
      if (targetSpace === 'doctor') {
        if (targetDocId) return prev.filter(n => n.doctorId !== targetDocId);
        return [];
      }
      return prev.filter(n => n.space !== targetSpace);
    });

    try {
      if (targetSpace === 'patient' && targetPatientId && typeof localStorage !== 'undefined') {
        localStorage.setItem(`sahatn_notifs_cleared_${targetPatientId}`, Date.now().toString());
      }
      await api.clearNotifications({
        space: targetSpace,
        doctorId: targetDocId,
        doctorName: targetDocName,
        patientId: targetPatientId
      });
    } catch (err) {
      console.warn('[SocketContext] Error clearing notifications:', err.message);
    }
  }, []);

  const sendNotification = useCallback(async (payload) => {
    try {
      const res = await api.broadcastNotification(payload);
      if (res?.notification) {
        setNotifications(prev => [res.notification, ...prev]);
      }
      return res;
    } catch (err) {
      console.error('[SocketContext] Error broadcasting notification:', err);
      throw err;
    }
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const value = useMemo(() => ({
    socket,
    queue,
    delayMinutes,
    doctorDelays,
    getDoctorDelay,
    notifications,
    unreadCount,
    loadingNotifs,
    markAsRead,
    markAllAsRead,
    markAllAsUnread,
    deleteNotification,
    clearNotifications,
    refreshNotifications,
    sendNotification,
    joinCabinet,
    joinDoctor,
    joinPatient,
    joinAdmin
  }), [
    socket,
    queue,
    delayMinutes,
    doctorDelays,
    getDoctorDelay,
    notifications,
    unreadCount,
    loadingNotifs,
    markAsRead,
    markAllAsRead,
    markAllAsUnread,
    deleteNotification,
    clearNotifications,
    refreshNotifications,
    sendNotification,
    joinCabinet,
    joinDoctor,
    joinPatient,
    joinAdmin
  ]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;