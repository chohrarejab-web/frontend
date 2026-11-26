import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Calendar as CalendarIcon, 
  Search, Plus, Zap, Lock, Unlock, Volume2, FileText, Folder, 
  MessageSquare, CheckCircle, Clock, Users, X, Phone, User, Check, History
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import TunisianPhoneInput from '../common/TunisianPhoneInput';
import { resolveActName, resolveCnamRegime } from '../../utils/i18nHelper';

// Helper date formatters
const getISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDMY = (d) => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getShortDate = (d, lang = 'fr') => {
  try {
    const locale = lang === 'ar' ? 'ar-TN' : 'fr-FR';
    const weekday = d.toLocaleDateString(locale, { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleDateString(locale, { month: 'short' });
    const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${cap} ${day} ${month}`;
  } catch (e) {
    return 'Mar. 20 oct.';
  }
};

const getFullDate = (d, lang = 'fr') => {
  try {
    const locale = lang === 'ar' ? 'ar-TN' : 'fr-FR';
    const str = d.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch (e) {
    return 'Mardi 20 octobre 2026';
  }
};

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Helpers for robust leave matching
const normalizeToIso = (dateInput) => {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
};

const isDateInLeave = (targetDate, leaveObj) => {
  if (!targetDate || !leaveObj) return false;
  const targetIso = normalizeToIso(targetDate);
  const startRaw = leaveObj.start || leaveObj.startDate || leaveObj.startIso;
  const endRaw = leaveObj.end || leaveObj.endDate || leaveObj.endIso;
  if (!startRaw || !endRaw) return false;
  const startIso = normalizeToIso(startRaw);
  const endIso = normalizeToIso(endRaw);
  if (!targetIso || !startIso || !endIso) return false;
  return targetIso >= startIso && targetIso <= endIso;
};

const getDoctorLeaveForDate = (schedule, targetDate) => {
  if (!schedule || !targetDate) return null;
  const targetIso = normalizeToIso(targetDate);
  if (Array.isArray(schedule.leaves) && schedule.leaves.length > 0) {
    const match = schedule.leaves.find(l => l && isDateInLeave(targetIso, l));
    if (match) return match;
  }
  if (schedule.leave && isDateInLeave(targetIso, schedule.leave)) {
    return schedule.leave;
  }
  return null;
};

// Robust helper to parse any appointment date (ISO, localized French, Arabic) into a Date object
const parseAppointmentToDate = (apt) => {
  if (!apt) return null;
  const isoStr = apt.dateIso || apt.date;
  if (isoStr && /^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const dateStr = String(apt.date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }

  const lower = dateStr.toLowerCase();
  const now = new Date();

  // Extract day and month names first (e.g. "6 nov", "Aujourd'hui (6 nov.)", "1 oct")
  const numMatch = dateStr.match(/(\d{1,2})/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const months = {
      'janv': 0, 'janvier': 0, 'جانفي': 0,
      'févr': 1, 'fevr': 1, 'février': 1, 'فيفري': 1,
      'mars': 2, 'مارس': 2,
      'avr': 3, 'avril': 3, 'أفريل': 3, 'افريل': 3,
      'mai': 4, 'ماي': 4,
      'juin': 5, 'جوان': 5,
      'juil': 6, 'juillet': 6, 'جويلية': 6,
      'août': 7, 'aout': 7, 'أوت': 7, 'اوت': 7,
      'sept': 8, 'septembre': 8, 'سبتمبر': 8,
      'oct': 9, 'octobre': 9, 'أكتوبر': 9, 'اكتوبر': 9,
      'nov': 10, 'novembre': 10, 'نوفمبر': 10,
      'déc': 11, 'dec': 11, 'décembre': 11, 'ديسمبر': 11
    };
    for (const [key, mIdx] of Object.entries(months)) {
      if (lower.includes(key)) {
        return new Date(now.getFullYear(), mIdx, day, 12, 0, 0);
      }
    }
  }

  // If createdAt exists and relative string
  const createdRaw = apt.createdAt || apt.created_at;
  if (createdRaw) {
    const cDate = new Date(createdRaw);
    if (!isNaN(cDate.getTime())) {
      if (lower.includes('demain') || lower.includes('غدا')) {
        cDate.setDate(cDate.getDate() + 1);
      }
      return new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate(), 12, 0, 0);
    }
  }

  if (lower.includes('aujourd') || lower.includes('اليوم')) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  }
  if (lower.includes('demain') || lower.includes('غدا')) {
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    return new Date(tmr.getFullYear(), tmr.getMonth(), tmr.getDate(), 12, 0, 0);
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
};

// Helper to compute dynamic localized date label (today/tomorrow/yesterday or localized weekday + date)
const getLocalizedDateLabel = (targetDate, dateIso, isAr = false) => {
  const now = new Date();
  const todayIso = getISODate(now);

  const tmr = new Date(now);
  tmr.setDate(tmr.getDate() + 1);
  const tmrIso = getISODate(tmr);

  const yst = new Date(now);
  yst.setDate(yst.getDate() - 1);
  const ystIso = getISODate(yst);

  let dObj = targetDate;
  if (!dObj || isNaN(dObj.getTime())) {
    if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      const [y, m, d] = dateIso.split('-').map(Number);
      dObj = new Date(y, m - 1, d, 12, 0, 0);
    }
  }

  const iso = dateIso || (dObj ? getISODate(dObj) : '');
  const locale = isAr ? 'ar-TN' : 'fr-FR';

  if (!dObj || isNaN(dObj.getTime())) {
    return iso || '';
  }

  const d = dObj.getDate();
  const monthName = dObj.toLocaleDateString(locale, { month: 'short' });
  const weekday = dObj.toLocaleDateString(locale, { weekday: 'short' });
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  if (iso === todayIso) {
    return isAr ? `اليوم (${d} ${monthName})` : `Aujourd'hui (${d} ${monthName})`;
  }
  if (iso === tmrIso) {
    return isAr ? `غداً (${d} ${monthName})` : `Demain (${d} ${monthName})`;
  }
  if (iso === ystIso) {
    return isAr ? `أمس (${d} ${monthName})` : `Hier (${d} ${monthName})`;
  }

  return `${weekdayCap} ${d} ${monthName}`;
};

// Robust helper to format appointment dates dynamically in real time relative to today
const formatRealTimeDate = (apt, lang = 'fr') => {
  if (!apt) return '';
  const isAr = lang === 'ar';
  const targetDate = parseAppointmentToDate(apt);
  const iso = apt.dateIso || (targetDate ? getISODate(targetDate) : '');
  return getLocalizedDateLabel(targetDate, iso, isAr);
};

// Robust helper to parse appointment date and time into a precise Date object
const parseAppointmentToDateTime = (apt) => {
  if (!apt) return null;

  // 1. Resolve date object
  let dateObj = parseAppointmentToDate(apt);
  if (!dateObj || isNaN(dateObj.getTime())) {
    const raw = apt.dateIso || apt.date;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) dateObj = d;
    }
  }
  if (!dateObj || isNaN(dateObj.getTime())) return null;

  // 2. Resolve time (HH:mm)
  let hours = 0;
  let minutes = 0;
  const timeStr = String(apt.time || '').trim();
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2})[:hH](\d{2})?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    }
  }

  return new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    hours,
    minutes,
    0,
    0
  );
};

// Check if an appointment is expired (scheduled in the past, beyond a 30-min consultation grace buffer)
const isAppointmentExpired = (apt) => {
  if (!apt) return true;
  const dt = parseAppointmentToDateTime(apt);
  if (!dt) return true;
  const now = new Date();
  // An appointment is expired if its scheduled time is in the past
  return dt.getTime() + 30 * 60 * 1000 < now.getTime();
};

// Helper to check if a slot time is in the past for a target date
export const isSlotPast = (slotTime, targetDate) => {
  if (!targetDate) return false;
  const now = new Date();
  const todayIso = getISODate(now);
  const targetIso = getISODate(targetDate);

  if (targetIso < todayIso) return true; // day in the past
  if (targetIso > todayIso) return false; // day in the future

  // Same day: compare hour and minute
  if (!slotTime) return false;
  const cleanTime = String(slotTime).trim().replace('h', ':');
  const parts = cleanTime.split(':');
  if (parts.length < 2) return false;
  const slotMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= curMinutes;
};

// Helper to extract an accurate arrival timestamp for FIFO waiting room sorting
const getPatientArrivalTimestamp = (p) => {
  if (!p) return 0;
  if (p.createdAt) {
    const t = new Date(p.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (p.created_at) {
    const t = new Date(p.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (p.timestamp) {
    const t = typeof p.timestamp === 'number' ? p.timestamp : new Date(p.timestamp).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const idStr = String(p.id || p.appointmentId || '');
  const idMatch = idStr.match(/\d{10,}/);
  if (idMatch) {
    const t = parseInt(idMatch[0], 10);
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
};

// Sort strictly by FIFO (earliest arrival first: the first to enter remains first #1)
const sortWaitingPatientsFifo = (list) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const tA = getPatientArrivalTimestamp(a);
    const tB = getPatientArrivalTimestamp(b);
    if (tA && tB && tA !== tB) {
      return tA - tB;
    }
    if (a.time && b.time && a.time !== b.time) {
      const mA = a.time.replace('h', ':');
      const mB = b.time.replace('h', ':');
      return mA.localeCompare(mB);
    }
    return 0;
  });
};

// Robust helper to retrieve completed sessions cache to prevent completed consultations from resurrecting
const getCompletedSessionSet = (docId) => {
  const docKey = docId || 'doc-1';
  const completedNames = new Set();
  const completedIds = new Set();
  try {
    const raw = localStorage.getItem(`sahatn_completed_sessions_${docKey}`);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(item => {
          if (item.patient) completedNames.add(item.patient.toLowerCase().trim());
          if (item.name) completedNames.add(item.name.toLowerCase().trim());
          if (item.id) completedIds.add(String(item.id));
          if (item.appointmentId) completedIds.add(String(item.appointmentId));
        });
      }
    }
  } catch (e) {}
  return { completedNames, completedIds };
};

// Generate realistic slots per date synchronized with doctor schedule & DB appointments
const getDefaultSlotsForDate = (dateObj, schedule = null, dbAppointments = [], doctorId = 'doc-1') => {
  const dayOfWeek = dateObj.getDay(); // 0 = Dimanche
  const dateKey = getISODate(dateObj);
  const dayKeyMap = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dayKey = dayKeyMap[dayOfWeek];

  const { completedNames, completedIds } = getCompletedSessionSet(doctorId);

  const dayConfig = schedule?.days?.[dayKey] || {
    isOpen: dayOfWeek !== 0,
    matinStart: '08:30',
    matinEnd: '13:00',
    pauseStart: '13:00',
    pauseEnd: '14:00',
    apremStart: '14:00',
    apremEnd: '18:30'
  };

  if (!dayConfig.isOpen) {
    return [
      { time: '08:30', status: 'BLOCKED', patient: 'Cabinet Fermé', act: 'Repos Hebdomadaire' },
      { time: '14:00', status: 'BLOCKED', patient: 'Cabinet Fermé', act: 'Fermé' }
    ];
  }

  const activeLeave = getDoctorLeaveForDate(schedule, dateKey);
  if (activeLeave) {
    return [
      { time: '08:30', status: 'BLOCKED', patient: 'Cabinet en Congé', act: activeLeave.reason || 'Congé exceptionnel' },
      { time: '11:00', status: 'BLOCKED', patient: 'Cabinet en Congé', act: 'Fermé' },
      { time: '14:00', status: 'BLOCKED', patient: 'Cabinet en Congé', act: 'Fermé' },
      { time: '17:00', status: 'BLOCKED', patient: 'Cabinet en Congé', act: 'Fermé' }
    ];
  }

  const parseMins = (tStr) => {
    if (!tStr || tStr === '--' || tStr.includes('Sans') || tStr.includes('fermé')) return null;
    const parts = tStr.replace('h', ':').split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
  };

  const fmtTime = (m) => {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const min = String(m % 60).padStart(2, '0');
    return `${h}:${min}`;
  };

  const matinStart = parseMins(dayConfig.matinStart) ?? (8 * 60 + 30);
  const matinEnd = parseMins(dayConfig.matinEnd) ?? (13 * 60);
  const pauseStart = parseMins(dayConfig.pauseStart);
  const pauseEnd = parseMins(dayConfig.pauseEnd);
  const apremStart = parseMins(dayConfig.apremStart) ?? (14 * 60);
  const apremEnd = parseMins(dayConfig.apremEnd) ?? (18 * 60 + 30);

  const times = [];
  // Morning 30 min intervals
  for (let t = matinStart; t < matinEnd; t += 30) {
    times.push({ time: fmtTime(t), isPause: false });
  }

  // Lunch Pause
  if (pauseStart !== null && pauseEnd !== null && pauseEnd > pauseStart) {
    times.push({ time: fmtTime(pauseStart), isPause: true });
  }

  // Afternoon 30 min intervals
  if (apremStart !== null && apremEnd !== null) {
    for (let t = apremStart; t < apremEnd; t += 30) {
      times.push({ time: fmtTime(t), isPause: false });
    }
  }

  // Map appointments to slots
  const mapped = times.map(({ time, isPause }) => {
    if (isPause) {
      return { time, status: 'BLOCKED', patient: 'Pause Déjeuner Cabinet', act: 'Fermé' };
    }

    const normTime = time.replace(/^0/, '');
    const apt = dbAppointments.find(a => {
      if (a.status === 'CANCELLED') return false;
      const aIso = normalizeToIso(a.dateIso || (a.date && /^\d{4}-\d{2}-\d{2}/.test(String(a.date)) ? a.date : null));
      if (aIso && aIso !== dateKey) return false;
      const aDateObj = parseAppointmentToDate(a);
      if (!aIso && aDateObj && getISODate(aDateObj) !== dateKey) return false;
      if (!aIso && !aDateObj) return false;

      const aTime = (a.time || '').replace('h', ':').trim();
      const aTimeNorm = aTime.replace(/^0/, '');
      return aTime === time || aTimeNorm === normTime;
    });

    if (apt) {
      if (apt.status === 'BLOCKED') {
        return {
          id: apt.id,
          time,
          status: 'BLOCKED',
          patient: apt.patientName || 'Créneau Bloqué',
          act: apt.motif || 'Indisponible'
        };
      }
      const isAptCompleted = (apt.status === 'COMPLETED' || apt.status === 'TERMINE') ||
        (apt.patientName && completedNames.has(apt.patientName.toLowerCase().trim())) ||
        (apt.patient && completedNames.has(apt.patient.toLowerCase().trim())) ||
        (apt.id && completedIds.has(String(apt.id)));

      return {
        id: apt.id,
        time,
        status: isAptCompleted ? 'COMPLETED' : 'OCCUPIED',
        patient: apt.patientName,
        phone: apt.patientPhone || '—',
        act: apt.motif || apt.type || 'Consultation Cardiologie',
        appointment: apt
      };
    }

    // Default mock patient for initial date 2026-10-20 or today ONLY for demo doc-1 if no DB appointments
    if (doctorId === 'doc-1' && (dateKey === '2026-10-20' || isSameDay(dateObj, new Date())) && dbAppointments.length === 0) {
      if (time === '10:00') {
        const p = 'Sami Mansour';
        return { time, status: completedNames.has(p.toLowerCase()) ? 'COMPLETED' : 'OCCUPIED', patient: p, phone: '+216 55 123 456', act: 'Consultation + ECG' };
      }
      if (time === '10:30') {
        const p = 'Fatma Ben Abdallah';
        return { time, status: completedNames.has(p.toLowerCase()) ? 'COMPLETED' : 'OCCUPIED', patient: p, phone: '+216 98 123 456', act: 'Consultation Cardiologie' };
      }
      if (time === '11:00') {
        const p = 'Yassine Mansour';
        return { time, status: completedNames.has(p.toLowerCase()) ? 'COMPLETED' : 'OCCUPIED', patient: p, phone: '+216 22 456 789', act: 'Contrôle Tension' };
      }
    }

    return { time, status: 'FREE', patient: null, act: null };
  });

  // Also append any dbAppointments that didn't match a standard 30-min slot time (e.g. 12:13, 15:57)
  const mappedAptIds = new Set(mapped.map(m => m.id).filter(Boolean));
  const mappedTimePatients = new Set(
    mapped
      .filter(m => m.status !== 'FREE' && m.patient)
      .map(m => `${(m.time || '').replace(/^0/, '')}|${String(m.patient).toLowerCase().trim()}`)
  );
  (dbAppointments || []).forEach((apt, idx) => {
    if (apt.status === 'CANCELLED') return;
    const aIso = normalizeToIso(apt.dateIso || (apt.date && /^\d{4}-\d{2}-\d{2}/.test(String(apt.date)) ? apt.date : null));
    const aDateObj = parseAppointmentToDate(apt);
    const matchesDate = (aIso && aIso === dateKey) || (!aIso && aDateObj && getISODate(aDateObj) === dateKey);
    const cleanTime = (apt.time || '09:00').replace('h', ':').trim();
    const pName = apt.patientName || apt.patient || 'Patient';
    const tpKey = `${cleanTime.replace(/^0/, '')}|${String(pName).toLowerCase().trim()}`;
    const alreadyMapped = (apt.id && mappedAptIds.has(apt.id)) || mappedTimePatients.has(tpKey);
    if (matchesDate && !alreadyMapped) {
      const isAptCompleted = (apt.status === 'COMPLETED' || apt.status === 'TERMINE') ||
        (apt.patientName && completedNames.has(apt.patientName.toLowerCase().trim())) ||
        (apt.patient && completedNames.has(apt.patient.toLowerCase().trim())) ||
        (apt.id && completedIds.has(String(apt.id)));

      const slotId = apt.id || `apt-extra-${dateKey}-${cleanTime}-${idx}`;
      mapped.push({
        id: slotId,
        time: cleanTime,
        status: apt.status === 'BLOCKED' ? 'BLOCKED' : (isAptCompleted ? 'COMPLETED' : 'OCCUPIED'),
        patient: pName,
        phone: apt.patientPhone || '—',
        act: apt.motif || apt.type || 'Consultation Cardiologie',
        appointment: apt
      });
      mappedAptIds.add(slotId);
      mappedTimePatients.add(tpKey);
    }
  });

  // Sort chronologically by time
  mapped.sort((a, b) => {
    const parseSlotMinutes = (t) => {
      const parts = String(t || '00:00').replace('h', ':').split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
    };
    return parseSlotMinutes(a.time) - parseSlotMinutes(b.time);
  });

  return mapped;
};

export default function DoctorAgendaTab({
  queue = [],
  currentPatient = '',
  onCallPatient,
  onEndConsultation,
  playChime,
  onSelectTab,
  doctorId = 'doc-1',
  doctorName = 'Dr. Selim Ben Ali',
  doctorSpecialty = 'Cardiologie',
  doctorProfile = null
}) {
  const { t, isRtl, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { socket } = useSocket();
  const endedPatientRef = useRef(null);

  const resolveAvatar = (avatarUrl) => {
    if (!avatarUrl) return '/images/doctor_selim.jpg';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('/') || avatarUrl.startsWith('data:')) {
      return avatarUrl;
    }
    return `/${avatarUrl}`;
  };
  const activeAvatar = resolveAvatar(doctorProfile?.avatar || (doctorId === 'doc-1' ? '/images/doctor_selim.jpg' : '/images/3ila_doctor.jpeg'));
  const activeDocName = doctorProfile?.name || doctorName;
  const activeDocSpec = doctorProfile?.specialtyFr || doctorProfile?.specialty || doctorSpecialty;
  const activeDocCity = doctorProfile?.address || doctorProfile?.city || 'Cabinet Médical, Tunis';

  // Selected date state: defaults to TODAY
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const currentDateKey = getISODate(selectedDate);
  const isToday = isSameDay(selectedDate, new Date());
  const isPastDay = !isToday && currentDateKey < getISODate(new Date());

  // Calendar Popover state (for the 16/11/2026 calendar button)
  const [openCalendarPopover, setOpenCalendarPopover] = useState(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date());
  const [calendarTab, setCalendarTab] = useState('calendar'); // 'calendar' | 'past' | 'upcoming'
  const calendarPopoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutsideCalendar(event) {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(event.target)) {
        setOpenCalendarPopover(false);
      }
    }
    if (openCalendarPopover) {
      document.addEventListener('mousedown', handleClickOutsideCalendar);
      document.addEventListener('touchstart', handleClickOutsideCalendar);
      return () => {
        document.removeEventListener('mousedown', handleClickOutsideCalendar);
        document.removeEventListener('touchstart', handleClickOutsideCalendar);
      };
    }
  }, [openCalendarPopover]);

  // Real-time schedule & appointments state
  const [schedule, setSchedule] = useState(null);
  const [dbAppointments, setDbAppointments] = useState([]);
  const [allDoctorAppointments, setAllDoctorAppointments] = useState([]);
  const [slotsMap, setSlotsMap] = useState({});
  const [liveToast, setLiveToast] = useState(null);

  // Real-time doctor delay state
  const [doctorDelay, setDoctorDelay] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (doctorId) {
      api.getQueue(doctorId)
        .then(res => {
          if (isMounted && res && typeof res.delayMinutes === 'number') {
            setDoctorDelay(res.delayMinutes);
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [doctorId]);

  useEffect(() => {
    if (!socket) return;
    const handleDelayEvent = (data) => {
      if (data && (!data.doctorId || data.doctorId === doctorId)) {
        const val = typeof data.delayMinutes === 'number' ? data.delayMinutes : (typeof data.minutes === 'number' ? data.minutes : 0);
        setDoctorDelay(val);
      }
    };
    socket.on('queue:delay', handleDelayEvent);
    socket.on('queue:update', handleDelayEvent);
    socket.on('queue:updated', handleDelayEvent);
    return () => {
      socket.off('queue:delay', handleDelayEvent);
      socket.off('queue:update', handleDelayEvent);
      socket.off('queue:updated', handleDelayEvent);
    };
  }, [socket, doctorId]);

  useEffect(() => {
    const handleLocalDelay = (e) => {
      if (e?.detail && (!e.detail.doctorId || e.detail.doctorId === doctorId)) {
        const val = typeof e.detail.delayMinutes === 'number' ? e.detail.delayMinutes : (typeof e.detail.minutes === 'number' ? e.detail.minutes : 0);
        setDoctorDelay(val);
      }
    };
    window.addEventListener('sahatn:delay-updated', handleLocalDelay);
    return () => window.removeEventListener('sahatn:delay-updated', handleLocalDelay);
  }, [doctorId]);

  // Fetch persistent appointments and doctor schedule from database
  const fetchSlotsAndAppointments = useCallback(async () => {
    try {
      const [schedRes, aptRes, allAptsRes] = await Promise.all([
        api.getDoctorSchedule(doctorId).catch(() => null),
        api.getAppointments({ doctorId, date: currentDateKey }).catch(() => null),
        api.getAppointments({ doctorId }).catch(() => null)
      ]);

      if (schedRes?.schedule) {
        setSchedule(schedRes.schedule);
      }
      if (aptRes?.data && Array.isArray(aptRes.data)) {
        setDbAppointments(aptRes.data);
        setSlotsMap({});
      }
      if (allAptsRes?.data && Array.isArray(allAptsRes.data)) {
        setAllDoctorAppointments(allAptsRes.data);
        setSlotsMap({});
      }
    } catch (err) {
      console.warn('Doctor agenda load notice:', err);
    }
  }, [doctorId, currentDateKey]);

  // Real-time ticker: keeps UI synchronized with current date and non-expired appointments
  const [ticker, setTicker] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTicker(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchSlotsAndAppointments();
  }, [fetchSlotsAndAppointments, doctorId, ticker]);

  // Live socket synchronization for immediate reservation and slot lock updates
  useEffect(() => {
    if (!socket) return;
    const handleSync = (payload) => {
      fetchSlotsAndAppointments();
    };

    const handleNewAppointment = (newApt) => {
      fetchSlotsAndAppointments();
      if (newApt && (!newApt.doctorId || newApt.doctorId === doctorId || doctorId === 'doc-1')) {
        if (typeof playChime === 'function') {
          playChime();
        }
        setLiveToast({
          patient: newApt.patientName || 'Patient',
          date: newApt.date || 'Récemment',
          time: newApt.time || '',
          dateIso: newApt.dateIso || null,
          ticket: newApt.ticketNumber || ''
        });
        setTimeout(() => setLiveToast(null), 9000);
      }
    };

    socket.on('appointment:new', handleNewAppointment);
    socket.on('appointment:cancelled', handleSync);
    socket.on('slot:blocked', handleSync);
    socket.on('slot:unblocked', handleSync);
    socket.on('schedule:updated', handleSync);

    return () => {
      socket.off('appointment:new', handleNewAppointment);
      socket.off('appointment:cancelled', handleSync);
      socket.off('slot:blocked', handleSync);
      socket.off('slot:unblocked', handleSync);
      socket.off('schedule:updated', handleSync);
    };
  }, [socket, fetchSlotsAndAppointments, doctorId, playChime]);

  // Combined appointments list across all endpoints (past & future)
  const combinedAllAppointments = useMemo(() => {
    const map = new Map();
    (allDoctorAppointments || []).forEach(a => {
      const key = a.id ? String(a.id) : `${a.dateIso || a.date}-${a.time}-${a.patientName || a.patient}`;
      map.set(key, a);
    });
    (dbAppointments || []).forEach(a => {
      const key = a.id ? String(a.id) : `${a.dateIso || a.date}-${a.time}-${a.patientName || a.patient}`;
      map.set(key, a);
    });
    return Array.from(map.values());
  }, [allDoctorAppointments, dbAppointments]);

  // Fast O(1) appointment counts by YYYY-MM-DD
  const appointmentCountsByIso = useMemo(() => {
    const counts = {};
    combinedAllAppointments.forEach(apt => {
      if (apt.status === 'CANCELLED') return;
      const targetDate = parseAppointmentToDate(apt);
      const iso = apt.dateIso || (targetDate ? getISODate(targetDate) : null);
      if (iso) {
        counts[iso] = (counts[iso] || 0) + 1;
      }
    });
    return counts;
  }, [combinedAllAppointments]);

  // Calendar Popover Month Navigation & Grid Helpers
  const handlePrevCalendarMonth = () => {
    setCalendarViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextCalendarMonth = () => {
    setCalendarViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calendarMonthLabel = useMemo(() => {
    const locale = isAr ? 'ar-TN' : 'fr-FR';
    return calendarViewMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [calendarViewMonth, isAr]);

  const calendarGridDays = useMemo(() => {
    const year = calendarViewMonth.getFullYear();
    const month = calendarViewMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    // Leading padding from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, prevD);
      const iso = getISODate(prevDate);
      days.push({
        dayNumber: prevD,
        dateObj: prevDate,
        dateIso: iso,
        isCurrentMonth: false,
        count: appointmentCountsByIso[iso] || 0
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const iso = getISODate(dateObj);
      days.push({
        dayNumber: d,
        dateObj: dateObj,
        dateIso: iso,
        isCurrentMonth: true,
        count: appointmentCountsByIso[iso] || 0
      });
    }

    // Trailing padding to complete weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const iso = getISODate(nextDate);
      days.push({
        dayNumber: d,
        dateObj: nextDate,
        dateIso: iso,
        isCurrentMonth: false,
        count: appointmentCountsByIso[iso] || 0
      });
    }

    return days;
  }, [calendarViewMonth, appointmentCountsByIso]);

  // Active slots for selected date
  const slots = useMemo(() => {
    const { completedNames, completedIds } = getCompletedSessionSet(doctorId);
    const rawList = slotsMap[currentDateKey] 
      ? slotsMap[currentDateKey] 
      : getDefaultSlotsForDate(selectedDate, schedule, combinedAllAppointments, doctorId);

    // Overlay: ensure any slot whose patient or id has completed consultation reflects COMPLETED immediately
    return rawList.map(s => {
      if (s.status === 'OCCUPIED') {
        const pName = (s.patient || '').toLowerCase().trim();
        const pId = String(s.appointment?.id || s.id || '');
        if ((pName && completedNames.has(pName)) || (pId && completedIds.has(pId))) {
          return { ...s, status: 'COMPLETED' };
        }
      }
      return s;
    });
  }, [slotsMap, currentDateKey, selectedDate, schedule, combinedAllAppointments, doctorId, ticker]);

  // Active leave for selected date
  const activeLeave = useMemo(() => {
    return getDoctorLeaveForDate(schedule, currentDateKey);
  }, [schedule, currentDateKey]);

  const [filterState, setFilterState] = useState('Tous'); // Tous, Confirmés, En Attente, Terminés, Bloqués
  const [searchQuery, setSearchQuery] = useState('');

  // Agenda View Version:
  // 'v1' = Version 1 (Actuelle/Complète - keeps all slots as is)
  // 'v2' = Version 2 (Hides past empty slots, keeps all real appointments & remaining future slots for the day)
  const [agendaVersion, setAgendaVersion] = useState(() => {
    try {
      return localStorage.getItem('sahatn_doctor_agenda_version') || 'v1';
    } catch (e) {
      return 'v1';
    }
  });

  const handleSetAgendaVersion = (version) => {
    setAgendaVersion(version);
    try {
      localStorage.setItem('sahatn_doctor_agenda_version', version);
    } catch (e) {}
  };

  // Active in-consultation patient (dynamically bound to real appointment or live time)
  const [activeConsultation, setActiveConsultation] = useState(() => {
    if (currentPatient) {
      const { completedNames } = getCompletedSessionSet(doctorId);
      if (completedNames.has(currentPatient.toLowerCase().trim())) {
        return null;
      }
      const matched = (queue || []).find(a => (a.patientName === currentPatient || a.patient === currentPatient));
      const fallbackTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return { 
        id: matched?.id || matched?.appointmentId,
        appointmentId: matched?.id || matched?.appointmentId,
        name: currentPatient, 
        time: (matched?.time && matched.time !== '10:00') ? matched.time : fallbackTime, 
        callTime: (matched?.callTime || ((matched?.time && matched.time !== '10:00') ? matched.time : fallbackTime)),
        act: matched?.motif || matched?.act || matched?.type || `Consultation ${doctorSpecialty || 'Médicale'}`, 
        cnam: matched?.cnam || 'Filière Privée',
        fee: matched?.fee || 70
      };
    }
    return null;
  });

  useEffect(() => {
    const { completedNames, completedIds } = getCompletedSessionSet(doctorId);
    const isCompleted = (a) => {
      if (!a) return false;
      const pName = (a.patient || a.patientName || '').toLowerCase().trim();
      const pId = String(a.id || a.uuid || a.appointmentId || '');
      return completedNames.has(pName) || (pId && completedIds.has(pId));
    };

    const inConsultFromQueue = (queue || []).find(a => 
      (a.stage === 'EN_CONSULTATION' || a.status === 'IN_CONSULTATION' || a.status === 'IN_PROGRESS') &&
      !isCompleted(a)
    );
    const inConsultFromDb = (dbAppointments || []).find(a => 
      (a.status === 'IN_CONSULTATION' || a.stage === 'EN_CONSULTATION' || a.status === 'IN_PROGRESS') &&
      !isCompleted(a)
    );
    const activeApt = inConsultFromQueue || inConsultFromDb;

    const candidateName = currentPatient || activeApt?.patientName || activeApt?.patient;
    const isCandidateCompleted = candidateName && (
      candidateName === endedPatientRef.current || 
      completedNames.has(candidateName.toLowerCase().trim())
    );

    const patientName = (!isCandidateCompleted && candidateName) ? candidateName : null;

    if (patientName) {
      const matched = (queue || []).find(a => (a.patientName === patientName || a.patient === patientName))
        || (dbAppointments || []).find(a => (a.patientName === patientName || a.patient === patientName))
        || activeApt;

      const fallbackTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const act = matched?.motif || matched?.act || matched?.type || `Consultation ${doctorSpecialty || 'Médicale'}`;
      const cnam = matched?.cnam || 'Filière Privée';

      setActiveConsultation(prev => {
        // Start time must be the real wall-clock time when the doctor calls the patient, NOT the waiting list check-in time
        const realCallTime = (prev?.name === patientName && (prev?.callTime || prev?.time))
          ? (prev.callTime || prev.time)
          : (matched?.callTime 
              || (matched?.calledAt ? new Date(matched.calledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null)
              || fallbackTime);

        return {
          ...prev,
          id: matched?.id || matched?.appointmentId || prev?.id,
          appointmentId: matched?.id || matched?.appointmentId || prev?.appointmentId,
          name: patientName,
          time: realCallTime,
          callTime: realCallTime,
          scheduledTime: matched?.time || prev?.scheduledTime,
          act: act,
          cnam: cnam,
          fee: matched?.fee || prev?.fee || 70
        };
      });
    } else {
      setActiveConsultation(null);
    }
  }, [currentPatient, doctorSpecialty, queue, dbAppointments, doctorId]);

  // Queue patients in waiting room (persistent across page reloads & synced with database, reset daily to 0)
  const getDailyWaitKey = (docId) => {
    const d = new Date();
    const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `sahatn_waiting_patients_${docId || 'doc-1'}_${todayIso}`;
  };

  const [activeWaitingTab, setActiveWaitingTab] = useState('waiting'); // 'waiting' or 'all'
  const [waitingPatients, setWaitingPatients] = useState(() => {
    try {
      const storageKey = getDailyWaitKey(doctorId);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return sortWaitingPatientsFifo(parsed);
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    const todayIso = getISODate(new Date());
    const storageKey = getDailyWaitKey(doctorId);

    let cached = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) cached = parsed;
      }
    } catch (e) {}

    const sourceList = Array.isArray(allDoctorAppointments) && allDoctorAppointments.length > 0
      ? allDoctorAppointments
      : (Array.isArray(dbAppointments) ? dbAppointments : []);

    // Filter out completed, cancelled or in-consultation IDs
    const finishedIds = new Set(
      sourceList
        .filter(a => a.status === 'COMPLETED' || a.status === 'TERMINE' || a.status === 'CANCELLED' || a.status === 'IN_CONSULTATION')
        .map(a => a.id)
    );

    // Any appointment specifically in waiting room status (EN_ATTENTE) for this doctor TODAY
    const enAttenteApts = sourceList.filter(a => {
      const aDate = a.dateIso || (a.date ? String(a.date).slice(0, 10) : null) || (a.createdAt ? a.createdAt.slice(0, 10) : null);
      const isToday = !aDate || aDate === todayIso;
      return isToday && (a.status === 'EN_ATTENTE' || a.stage === 'SALLE_D_ATTENTE' || a.stage === 'ARRIVE');
    });

    const mergedMap = new Map();

    // 1. Keep cached entries that have not been finished or cancelled (preserving user's check-in order)
    cached.forEach(p => {
      if (p && p.name) {
        const pId = p.appointmentId || p.id;
        if (!finishedIds.has(pId) && !finishedIds.has(p.id)) {
          const key = p.appointmentId || p.id || `${p.name}_${p.time}`;
          mergedMap.set(key, p);
        }
      }
    });

    // 2. Overlay from backend appointments that are in waiting room
    enAttenteApts.forEach((a, i) => {
      const key = a.id || `apt-${i}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          id: a.id || `apt-${i}`,
          appointmentId: a.id,
          name: a.patientName || a.name || 'Patient',
          time: a.time || '10:00',
          phone: a.patientPhone || a.phone || '+216 90 000 000',
          status: 'En Attente',
          priority: a.priority || (a.source === 'POINTAGE_COMPTOIR' ? 'POINTAGE_COMPTOIR' : 'NORMAL'),
          act: a.motif || a.type || 'Consultation Cabinet (Pointage)',
          fee: Number(String(a.fee || '70').replace(/[^0-9]/g, '')) || 70,
          createdAt: a.createdAt || a.created_at || null
        });
      }
    });

    // Strictly sort FIFO: the person who enters first remains first (#1)
    const finalWaiting = sortWaitingPatientsFifo(Array.from(mergedMap.values()));
    setWaitingPatients(finalWaiting);
    try {
      localStorage.setItem(storageKey, JSON.stringify(finalWaiting));
    } catch (e) {}
  }, [dbAppointments, allDoctorAppointments, doctorId, ticker]);

  // Modals state
  const [modalNewRdvSlot, setModalNewRdvSlot] = useState(null);
  const [modalPointageOpen, setModalPointageOpen] = useState(false);
  const [modalBlockOpen, setModalBlockOpen] = useState(false);

  // Form inputs (Pointage Comptoir)
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAct, setNewPatientAct] = useState('Consultation Cardiologie');

  // Full Patient-Style Booking Modal State
  const [beneficiaryType, setBeneficiaryType] = useState('self'); // 'self' | 'relative'
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [relativeRelation, setRelativeRelation] = useState('ENFANT');
  const [relativeName, setRelativeName] = useState('');
  const [relativePhone, setRelativePhone] = useState('');
  const [cnamCarnet, setCnamCarnet] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [consultType, setConsultType] = useState('CABINET'); // 'CABINET' | 'TELECONSULTATION'
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [bookingError, setBookingError] = useState('');

  // Open & Close Booking Modal handlers
  const handleOpenBookSlot = (slotTime) => {
    if (isSlotPast(slotTime, selectedDate)) {
      alert(isAr 
        ? 'لا يمكن حجز موعد في توقيت قد مضى. يرجى اختيار موعد قادم.' 
        : 'Impossible de réserver un créneau horaire déjà passé. Veuillez choisir un créneau ultérieur.');
      return;
    }
    setModalNewRdvSlot(slotTime);
    setBookingSuccessData(null);
    setBookingError('');
    setBeneficiaryType('self');
    setGuestName('');
    setGuestPhone('');
    setRelativeRelation('ENFANT');
    setRelativeName('');
    setRelativePhone('');
    setCnamCarnet('');
    setBookingEmail('');
    setConsultType('CABINET');
    setNewPatientAct(activeDocSpec ? `Consultation ${activeDocSpec}` : 'Consultation');
  };

  const handleCloseBookModal = () => {
    setModalNewRdvSlot(null);
    setBookingSuccessData(null);
    setBookingError('');
    setGuestName('');
    setGuestPhone('');
    setRelativeName('');
    setRelativePhone('');
    setCnamCarnet('');
    setBookingEmail('');
  };

  const handleOpenPointageModal = () => {
    setModalPointageOpen(true);
    setBookingSuccessData(null);
    setBookingError('');
    setBeneficiaryType('self');
    setGuestName('');
    setGuestPhone('');
    setRelativeRelation('ENFANT');
    setRelativeName('');
    setRelativePhone('');
    setCnamCarnet('');
    setBookingEmail('');
    setConsultType('CABINET');
    setNewPatientAct(activeDocSpec ? `Consultation ${activeDocSpec}` : 'Consultation');
  };

  const handleClosePointageModal = () => {
    setModalPointageOpen(false);
    setBookingSuccessData(null);
    setBookingError('');
    setGuestName('');
    setGuestPhone('');
    setRelativeName('');
    setRelativePhone('');
    setCnamCarnet('');
    setBookingEmail('');
  };

  // Date Navigation Handlers
  const handlePrevDay = () => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDateInputChange = (e) => {
    const val = e.target.value;
    if (val) {
      const [y, m, d] = val.split('-').map(Number);
      if (y && m && d) {
        setSelectedDate(new Date(y, m - 1, d));
      }
    }
  };

  // Handle calling next patient from waiting queue
  const handleCallNextWaiting = async () => {
    if (playChime) playChime();
    const currentCallTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    endedPatientRef.current = null;
    if (waitingPatients.length > 0) {
      const nextP = waitingPatients[0];
      const aptId = nextP.appointmentId || nextP.id;

      // Unblock patient from completed sessions if explicitly called again
      try {
        const docKey = doctorId || 'doc-1';
        const key = `sahatn_completed_sessions_${docKey}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter(s => (s.patient || s.name || '').toLowerCase().trim() !== (nextP.name || '').toLowerCase().trim());
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch (e) {}

      if (typeof onCallPatient === 'function') {
        onCallPatient(nextP.name);
      }
      setActiveConsultation({
        id: aptId,
        appointmentId: aptId,
        name: nextP.name,
        time: currentCallTime, // Real call time when doctor actually calls the patient
        callTime: currentCallTime,
        scheduledTime: nextP.time,
        startedAt: new Date().toISOString(),
        phone: nextP.phone,
        act: nextP.act || `Consultation ${doctorSpecialty || 'Médicale'}`,
        cnam: nextP.cnam || 'Filière Privée',
        fee: nextP.fee || 70
      });
      const remaining = waitingPatients.slice(1);
      setWaitingPatients(remaining);
      try {
        const storageKey = getDailyWaitKey(doctorId);
        localStorage.setItem(storageKey, JSON.stringify(remaining));
      } catch (e) {}

      if (aptId) {
        await api.updateAppointment(aptId, { 
          status: 'IN_CONSULTATION',
          callTime: currentCallTime,
          calledAt: new Date().toISOString(),
          patientName: nextP.name,
          patient: nextP.name,
          doctorId: doctorId || 'doc-1'
        }).catch(() => null);
      }
    } else {
      if (typeof onCallPatient === 'function') {
        onCallPatient('Patient Sans RDV');
      }
      setActiveConsultation({
        name: 'Patient Sans RDV',
        time: currentCallTime,
        callTime: currentCallTime,
        startedAt: new Date().toISOString(),
        act: 'Consultation Spontanée',
        cnam: 'Filière Privée',
        fee: 70
      });
    }
  };

  // Handle ending current consultation session & save to completed sessions history & caisse
  const handleEndSession = async () => {
    if (!activeConsultation) return;
    const finishing = { ...activeConsultation };
    const docKey = doctorId || 'doc-1';
    const consultFee = Number(finishing.fee) || 70;
    const aptId = finishing.appointmentId || finishing.id || (dbAppointments.find(a => (a.patientName === finishing.name || a.patient === finishing.name))?.id);

    // Record ended patient name in ref so useEffect ignores any delayed/stale data for this patient
    endedPatientRef.current = finishing.name;

    // Immediately clear UI state and notify parent so currentPatient becomes empty
    setActiveConsultation(null);
    if (typeof onEndConsultation === 'function') {
      onEndConsultation();
    }

    try {
      const storageKey = `sahatn_completed_sessions_${docKey}`;
      const saved = localStorage.getItem(storageKey);
      const list = saved ? JSON.parse(saved) : [];

      const newSession = {
        id: `SNC-${String(list.length + 1).padStart(4, '0')}`,
        doctorId: docKey,
        appointmentId: aptId,
        recuId: aptId || `REC-${String(list.length + 1).padStart(4, '0')}`,
        date: "Aujourd'hui",
        dateFormatted: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        heure: finishing.callTime || finishing.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duree: '25 min',
        patient: finishing.name || 'Patient',
        telephone: finishing.phone || '+216 98 123 456',
        age: 'Patient Cabinet',
        acte: finishing.act || 'Consultation Spécialisée',
        diagnostic: 'Séance de consultation terminée avec succès au cabinet.',
        traitement: 'Ordonnance délivrée et consignes médicales remises au patient.',
        mode: 'Espèces',
        partPatient: 21,
        partCnam: 49,
        total: consultFee,
        cnam: true,
        cnamFiliere: finishing.cnam || 'Filière Privée',
        statut: 'Terminée & Réglée'
      };

      const updatedList = [newSession, ...list.filter(s => s.id !== newSession.id)];
      localStorage.setItem(storageKey, JSON.stringify(updatedList));

      // Synchronize with encaissements (Finances / Money in Caisse)
      const encKey = `sahatn_encaissements_${docKey}`;
      let curEnc = [];
      try {
        const savedEnc = localStorage.getItem(encKey);
        if (savedEnc) curEnc = JSON.parse(savedEnc);
      } catch (e) {}

      const newEnc = {
        id: newSession.recuId || newSession.id || `REC-${Date.now()}`,
        doctorId: docKey,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dateIso: new Date().toISOString().split('T')[0],
        heure: newSession.heure,
        patient: newSession.patient,
        acte: newSession.acte,
        mode: 'Espèces',
        partPatient: newSession.partPatient,
        partCnam: newSession.partCnam,
        total: newSession.total,
        statut: 'Réglé'
      };
      const updatedEnc = [newEnc, ...curEnc.filter(e => e.id !== newEnc.id)];
      localStorage.setItem(encKey, JSON.stringify(updatedEnc));

      // Remove from waiting queue cache
      try {
        const waitKey = getDailyWaitKey(docKey);
        const waitSaved = localStorage.getItem(waitKey);
        if (waitSaved) {
          const waitList = JSON.parse(waitSaved);
          const cleaned = waitList.filter(p => p.id !== aptId && p.appointmentId !== aptId && p.name !== finishing.name);
          localStorage.setItem(waitKey, JSON.stringify(cleaned));
          setWaitingPatients(cleaned);
        }
      } catch (e) {}

      // Immediately mark as COMPLETED in slotsMap for current date
      const slotTime = finishing.time || finishing.scheduledTime;
      const finishingNameLower = (finishing.name || '').toLowerCase().trim();

      setSlotsMap(prev => {
        const currentList = prev[currentDateKey] || slots;
        return {
          ...prev,
          [currentDateKey]: currentList.map(s => {
            const sName = (s.patient || '').toLowerCase().trim();
            const sId = s.appointment?.id || s.id;
            const matchName = finishingNameLower && sName && sName === finishingNameLower;
            const matchId = aptId && sId && String(sId) === String(aptId);
            const matchTime = slotTime && (s.time === slotTime || s.time.replace(/^0/, '') === String(slotTime).replace(/^0/, ''));
            if (matchName || matchId || (matchTime && s.status === 'OCCUPIED')) {
              return { ...s, status: 'COMPLETED' };
            }
            return s;
          })
        };
      });

      // Immediately mark as COMPLETED in local appointments
      setDbAppointments(prev => (prev || []).map(a => {
        const aName = (a.patientName || a.patient || '').toLowerCase().trim();
        const aId = a.id;
        const matchName = finishingNameLower && aName && aName === finishingNameLower;
        const matchId = aptId && aId && String(aId) === String(aptId);
        const matchTime = slotTime && (a.time === slotTime || (a.time || '').replace(/^0/, '') === String(slotTime).replace(/^0/, ''));
        if (matchName || matchId || (matchTime && (a.dateIso === currentDateKey || !a.dateIso))) {
          return { ...a, status: 'COMPLETED', statut: 'Terminée & Réglée', paid: true };
        }
        return a;
      }));

      setTicker(Date.now());

      // Persist completion in database
      const updatePayload = {
        status: 'COMPLETED',
        statut: 'Terminée & Réglée',
        paid: true,
        total: consultFee,
        completedAt: new Date().toISOString(),
        patientName: finishing.name,
        patient: finishing.name,
        doctorId: docKey,
        time: slotTime,
        dateIso: currentDateKey
      };
      if (aptId) {
        await api.updateAppointment(aptId, updatePayload).catch(() => null);
      } else if (finishing.name) {
        await api.updateAppointment(finishing.name, updatePayload).catch(() => null);
      }

      window.dispatchEvent(new CustomEvent('sahatn:session-completed', {
        detail: { doctorId, session: newSession, count: updatedList.length, patient: finishing.name }
      }));

      setLiveToast({
        title: 'Séance Honorée & Enregistrée',
        desc: `La consultation de ${finishing.name} a été synchronisée avec la caisse (${updatedList.length} séances faites, +${consultFee} TND).`
      });
      setTimeout(() => setLiveToast(null), 4000);

      await fetchSlotsAndAppointments();
    } catch (err) {
      console.warn('Notice saving completed session:', err);
    }
  };

  // Handle completing an occupied slot directly from agenda list
  const handleCompleteSlot = async (slot) => {
    try {
      const docKey = doctorId || 'doc-1';
      const storageKey = `sahatn_completed_sessions_${docKey}`;
      const saved = localStorage.getItem(storageKey);
      const list = saved ? JSON.parse(saved) : [];
      const aptId = slot.appointment?.id || slot.id;

      // If this slot patient was actively in consultation, clear consultation immediately
      if (activeConsultation && (activeConsultation.id === aptId || activeConsultation.name === slot.patient)) {
        endedPatientRef.current = slot.patient;
        setActiveConsultation(null);
        if (typeof onEndConsultation === 'function') {
          onEndConsultation();
        }
      }

      const newSession = {
        id: `SNC-${String(list.length + 1).padStart(4, '0')}`,
        doctorId: docKey,
        appointmentId: aptId,
        recuId: aptId || `REC-${String(list.length + 1).padStart(4, '0')}`,
        date: getDMY(selectedDate) || "Aujourd'hui",
        dateFormatted: getFullDate(selectedDate, lang) || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        heure: slot.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duree: '25 min',
        patient: slot.patient || 'Patient',
        telephone: slot.phone || '+216 98 123 456',
        age: 'Patient Cabinet',
        acte: slot.act || 'Consultation Cardiologie',
        diagnostic: 'Séance de consultation terminée avec succès au cabinet.',
        traitement: 'Ordonnance délivrée et consignes médicales remises au patient.',
        mode: 'Espèces',
        partPatient: 21,
        partCnam: 49,
        total: 70,
        cnam: true,
        cnamFiliere: 'Filière Privée',
        statut: 'Terminée & Réglée'
      };

      const updatedList = [newSession, ...list.filter(s => s.id !== newSession.id)];
      localStorage.setItem(storageKey, JSON.stringify(updatedList));

      // Synchronize with encaissements (Finances / Money in Caisse)
      const encKey = `sahatn_encaissements_${docKey}`;
      let curEnc = [];
      try {
        const savedEnc = localStorage.getItem(encKey);
        if (savedEnc) curEnc = JSON.parse(savedEnc);
      } catch (e) {}

      const newEnc = {
        id: newSession.recuId || newSession.id || `REC-${Date.now()}`,
        doctorId: docKey,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dateIso: new Date().toISOString().split('T')[0],
        heure: newSession.heure,
        patient: newSession.patient,
        acte: newSession.acte,
        mode: 'Espèces',
        partPatient: newSession.partPatient,
        partCnam: newSession.partCnam,
        total: newSession.total,
        statut: 'Réglé'
      };
      const updatedEnc = [newEnc, ...curEnc.filter(e => e.id !== newEnc.id)];
      localStorage.setItem(encKey, JSON.stringify(updatedEnc));

      const updatePayload = {
        status: 'COMPLETED',
        statut: 'Terminée & Réglée',
        paid: true,
        total: 70,
        completedAt: new Date().toISOString(),
        patientName: slot.patient,
        patient: slot.patient,
        doctorId: docKey
      };
      if (aptId) {
        await api.updateAppointment(aptId, updatePayload).catch(() => null);
      } else if (slot.patient) {
        await api.updateAppointment(slot.patient, updatePayload).catch(() => null);
      }

      window.dispatchEvent(new CustomEvent('sahatn:session-completed', {
        detail: { doctorId, session: newSession, count: updatedList.length }
      }));

      // Update slots map
      setSlotsMap(prev => ({
        ...prev,
        [currentDateKey]: (prev[currentDateKey] || slots).map(s => s.time === slot.time ? { ...s, status: 'COMPLETED' } : s)
      }));

      setLiveToast({
        title: 'Séance Honorée & Enregistrée',
        desc: `La consultation de ${slot.patient} a été synchronisée avec la caisse (${updatedList.length} séances faites).`
      });
      setTimeout(() => setLiveToast(null), 4000);

      await fetchSlotsAndAppointments();
    } catch (err) {
      console.warn('Error completing slot:', err);
    }
  };

  // Handle booking a slot in agenda & persist to backend database (Patient style)
  const handleBookSlotSubmit = async (e) => {
    e.preventDefault();
    if (!modalNewRdvSlot) return;

    if (isSlotPast(modalNewRdvSlot, selectedDate)) {
      setBookingError(isAr ? 'لا يمكن حجز موعد في توقيت قد مضى. يرجى اختيار موعد قادم.' : 'Impossible de réserver un créneau horaire déjà passé. Veuillez choisir un créneau ultérieur.');
      return;
    }

    const isRelative = beneficiaryType === 'relative';
    const patientFinalName = isRelative ? relativeName.trim() : guestName.trim();
    const patientFinalPhone = isRelative ? relativePhone.trim() : guestPhone.trim();

    if (isRelative && (!patientFinalName || patientFinalName.length < 2)) {
      setBookingError(isAr ? 'يرجى إدخال اسم ولقب القريب.' : 'Le nom & prénom du proche sont obligatoires.');
      return;
    }
    if (!isRelative && (!patientFinalName || patientFinalName.length < 2)) {
      setBookingError(isAr ? 'يرجى إدخال اسم ولقب المريض.' : 'Le nom & prénom du patient sont obligatoires.');
      return;
    }
    if (!patientFinalPhone || patientFinalPhone.replace(/\D/g, '').length < 8) {
      setBookingError(isAr ? 'يرجى إدخال رقم هاتف صحيح (8 أرقام).' : 'Le numéro de téléphone est obligatoire (8 chiffres).');
      return;
    }

    setBookingSubmitting(true);
    setBookingError('');

    try {
      const payload = {
        doctorId,
        doctorName: activeDocName,
        specialty: activeDocSpec,
        date: getDMY(selectedDate),
        dateIso: currentDateKey,
        time: modalNewRdvSlot,
        type: consultType,
        fee: `${doctorProfile?.fee || 70} TND`,
        patientName: patientFinalName,
        patientPhone: patientFinalPhone,
        patientEmail: bookingEmail ? bookingEmail.trim() : '',
        cnamCarnet: cnamCarnet || null,
        bookedFor: beneficiaryType,
        relation: isRelative ? relativeRelation : 'SELF',
        motif: consultType === 'TELECONSULTATION' 
          ? (isAr ? 'استشارة طبية عن بعد' : 'Téléconsultation Vidéo') 
          : (newPatientAct || (isAr ? 'استشارة بالعيادة' : 'Consultation Cabinet'))
      };

      const res = await api.createAppointment(payload);
      const savedData = {
        ...payload,
        ...(res?.data || {}),
        id: res?.data?.id || payload.id || `apt-${Date.now()}`,
        dateIso: res?.data?.dateIso || currentDateKey,
        status: res?.data?.status || 'CONFIRMED'
      };

      setBookingSuccessData(savedData);

      // Optimistically reflect the newly booked appointment in both daily and full appointment lists
      setDbAppointments(prev => [savedData, ...(prev || []).filter(a => a.id !== savedData.id)]);
      setAllDoctorAppointments(prev => [savedData, ...(prev || []).filter(a => a.id !== savedData.id)]);
      setSlotsMap({});

      await fetchSlotsAndAppointments();

      window.dispatchEvent(new CustomEvent('sahatn:appointment-created', {
        detail: { doctorId, appointment: savedData }
      }));
    } catch (err) {
      console.warn('Doctor book slot fallback:', err);
      const fallbackPayload = {
        id: `apt-${Date.now()}`,
        doctorId,
        doctorName: activeDocName,
        date: getDMY(selectedDate),
        dateIso: currentDateKey,
        time: modalNewRdvSlot,
        type: consultType,
        status: 'CONFIRMED',
        motif: consultType === 'TELECONSULTATION' ? 'Téléconsultation' : (newPatientAct || 'Consultation Cabinet'),
        patientName: patientFinalName,
        patientPhone: patientFinalPhone,
        ticketNumber: `N° ${String(slots.filter(s => s.status === 'OCCUPIED').length + 1).padStart(2, '0')}`
      };
      setBookingSuccessData(fallbackPayload);
      setDbAppointments(prev => [fallbackPayload, ...(prev || [])]);
      setAllDoctorAppointments(prev => [fallbackPayload, ...(prev || [])]);
      setSlotsMap({});
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Handle Pointage Comptoir (Walk-in check-in) & persist to backend database
  const handlePointageSubmit = async (e) => {
    e.preventDefault();

    const isRelative = beneficiaryType === 'relative';
    const patientFinalName = isRelative ? relativeName.trim() : guestName.trim();
    const patientFinalPhone = isRelative ? relativePhone.trim() : guestPhone.trim();

    if (isRelative && (!patientFinalName || patientFinalName.length < 2)) {
      setBookingError(isAr ? 'يرجى إدخال اسم ولقب القريب.' : 'Le nom & prénom du proche sont obligatoires.');
      return;
    }
    if (!isRelative && (!patientFinalName || patientFinalName.length < 2)) {
      setBookingError(isAr ? 'يرجى إدخال اسم ولقب المريض.' : 'Le nom & prénom du patient sont obligatoires.');
      return;
    }
    if (!patientFinalPhone || patientFinalPhone.replace(/\D/g, '').length < 8) {
      setBookingError(isAr ? 'يرجى إدخال رقم هاتف صحيح (8 أرقام).' : 'Le numéro de téléphone est obligatoire (8 chiffres).');
      return;
    }

    setBookingSubmitting(true);
    setBookingError('');

    const currentTimeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const todayIso = getISODate(new Date());
    const todayDmy = getDMY(new Date()) || new Date().toLocaleDateString('fr-FR');

    let createdApt = null;
    try {
      const payload = {
        doctorId: doctorId || 'doc-1',
        doctorName: activeDocName,
        specialty: activeDocSpec,
        date: todayDmy,
        dateIso: todayIso,
        time: currentTimeStr,
        patientName: patientFinalName,
        patientPhone: patientFinalPhone,
        patientEmail: bookingEmail ? bookingEmail.trim() : '',
        cnamCarnet: cnamCarnet || null,
        bookedFor: beneficiaryType,
        relation: isRelative ? relativeRelation : 'SELF',
        motif: newPatientAct || (isAr ? 'استشارة بالعيادة (تسجيل الحضور)' : 'Consultation Cabinet (Pointage)'),
        type: consultType,
        status: 'EN_ATTENTE',
        statut: 'En Attente',
        source: 'POINTAGE_COMPTOIR',
        isWalkIn: true,
        fee: `${doctorProfile?.fee || 70} TND`
      };

      const res = await api.createAppointment(payload);
      createdApt = res?.data || payload;

      setBookingSuccessData(createdApt);
    } catch (err) {
      console.warn('API Pointage comptoir create appointment fallback:', err);
      createdApt = {
        id: `w-${Date.now()}`,
        patientName: patientFinalName,
        time: currentTimeStr,
        ticketNumber: `N° ${String(waitingPatients.length + 1).padStart(2, '0')}`
      };
      setBookingSuccessData(createdApt);
    }

    const aptId = createdApt?.id || `w-${Date.now()}`;
    const newEntry = {
      id: aptId,
      appointmentId: aptId,
      name: patientFinalName,
      time: currentTimeStr,
      phone: patientFinalPhone,
      status: 'En Attente',
      priority: 'POINTAGE_COMPTOIR',
      act: newPatientAct || 'Consultation Cabinet (Pointage)',
      fee: doctorProfile?.fee || 70,
      createdAt: createdApt?.createdAt || new Date().toISOString()
    };

    setWaitingPatients(prev => {
      const filtered = prev.filter(p => p.id !== aptId && p.name !== patientFinalName);
      // FIFO: Append new arrival to the end of the queue so previous arrivals remain in front (#1, #2...)
      const updated = sortWaitingPatientsFifo([...filtered, newEntry]);
      try {
        localStorage.setItem(getDailyWaitKey(doctorId), JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    const normalizedWalkInApt = {
      id: aptId,
      doctorId: doctorId || 'doc-1',
      doctorName: activeDocName,
      date: todayDmy,
      dateIso: todayIso,
      time: currentTimeStr,
      patientName: patientFinalName,
      patientPhone: patientFinalPhone,
      motif: newPatientAct || 'Consultation Cabinet (Pointage)',
      type: consultType,
      status: 'EN_ATTENTE',
      source: 'POINTAGE_COMPTOIR',
      createdAt: createdApt?.createdAt || new Date().toISOString(),
      ...(createdApt || {})
    };
    setDbAppointments(prev => [normalizedWalkInApt, ...(prev || []).filter(a => a.id !== aptId)]);
    setAllDoctorAppointments(prev => [normalizedWalkInApt, ...(prev || []).filter(a => a.id !== aptId)]);
    setSlotsMap({});

    await fetchSlotsAndAppointments();
    setBookingSubmitting(false);

    window.dispatchEvent(new CustomEvent('sahatn:appointment-created', {
      detail: { doctorId, appointment: createdApt }
    }));
  };

    // Handle slot block/unblock with immediate database synchronization
  const handleBlockSlot = async (timeToBlock) => {
    const curSlot = slots.find(s => s.time === timeToBlock);
    if (curSlot && curSlot.status === 'BLOCKED' && curSlot.id) {
      try {
        await api.unblockSlot(curSlot.id, {
          doctorId,
          date: currentDateKey,
          time: timeToBlock
        });
      } catch (err) {
        console.warn('Unblock slot notice:', err);
      }
    } else {
      try {
        await api.blockSlot({
          doctorId,
          doctorName,
          date: getDMY(selectedDate),
          dateIso: currentDateKey,
          time: timeToBlock,
          reason: 'Créneau Bloqué Cabinet'
        });
      } catch (err) {
        console.warn('Block slot notice:', err);
      }
    }
    await fetchSlotsAndAppointments();
  };

  // Number of past empty slots hidden in Version 2
  const pastSlotsCount = useMemo(() => {
    return slots.filter(s => {
      const isPast = isSlotPast(s.time, selectedDate);
      const isRealAppointment = s.status === 'OCCUPIED' || s.status === 'COMPLETED' || s.status === 'IN_CONSULTATION' || Boolean(s.patient);
      return isPast && !isRealAppointment;
    }).length;
  }, [slots, selectedDate]);

  // Filter slots
  const filteredSlots = slots.filter(s => {
    // Version 2 filtering:
    // - Hide empty past slots (FREE)
    // - Keep and display all past RDVs (OCCUPIED, COMPLETED, IN_CONSULTATION, or patient)
    // - Keep and display all remaining future slots
    if (agendaVersion === 'v2') {
      const isPast = isSlotPast(s.time, selectedDate);
      const isRealAppointment = s.status === 'OCCUPIED' || s.status === 'COMPLETED' || s.status === 'IN_CONSULTATION' || Boolean(s.patient);
      if (isPast && !isRealAppointment) {
        return false; // Hide only empty past slot, KEEP real past appointments!
      }
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchP = s.patient && s.patient.toLowerCase().includes(q);
      const matchA = s.act && s.act.toLowerCase().includes(q);
      const matchT = s.time.includes(q);
      if (!matchP && !matchA && !matchT) return false;
    }
    // Filter State
    if (filterState === 'Confirmés') return s.status === 'OCCUPIED';
    if (filterState === 'En Attente') return s.status === 'OCCUPIED';
    if (filterState === 'Bloqués') return s.status === 'BLOCKED';
    if (filterState === 'Terminés') return s.status === 'COMPLETED';
    return true;
  });

  const shortDateStr = getShortDate(selectedDate, lang);
  const fullDateStr = getFullDate(selectedDate, lang);
  const dmyStr = getDMY(selectedDate);
  const isoStr = getISODate(selectedDate);
  const confirmedCount = slots.filter(s => s.status === 'OCCUPIED').length;
  const waitingCount = waitingPatients.length;

  // Valid upcoming appointments across all dates for this doctor (strictly future or ongoing, non-expired)
  const validUpcomingAppointments = useMemo(() => {
    return (allDoctorAppointments || []).filter(a => {
      if (a.status === 'CANCELLED' || a.status === 'COMPLETED' || a.status === 'ARCHIVED') {
        return false;
      }
      return !isAppointmentExpired(a);
    });
  }, [allDoctorAppointments, ticker]);

  const totalUpcomingAppointments = useMemo(() => {
    return [...validUpcomingAppointments].sort((a, b) => {
      const aTime = parseAppointmentToDateTime(a)?.getTime() || 0;
      const bTime = parseAppointmentToDateTime(b)?.getTime() || 0;
      return aTime - bTime;
    });
  }, [validUpcomingAppointments]);

  // Next chronological upcoming appointment (strictly non-expired)
  const nextUpcomingAppointment = useMemo(() => {
    return totalUpcomingAppointments[0] || null;
  }, [totalUpcomingAppointments]);

  // Unique days that have confirmed upcoming appointments
  const daysWithAppointments = useMemo(() => {
    const map = {};
    combinedAllAppointments.forEach(apt => {
      if (apt.status !== 'CANCELLED' && !isAppointmentExpired(apt)) {
        const targetDate = parseAppointmentToDate(apt);
        const iso = apt.dateIso || (targetDate ? getISODate(targetDate) : null);
        if (iso) {
          if (!map[iso]) {
            map[iso] = { 
              dateIso: iso, 
              label: getLocalizedDateLabel(targetDate, iso, isAr), 
              count: 0,
              targetDate: targetDate
            };
          }
          map[iso].count++;
        }
      }
    });
    return Object.values(map).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  }, [combinedAllAppointments, isAr, ticker]);

  // Unique past days that had appointments (for historical quick jump via calendar list)
  const pastDaysWithAppointments = useMemo(() => {
    const map = {};
    const todayIso = getISODate(new Date());
    combinedAllAppointments.forEach(apt => {
      if (apt.status !== 'CANCELLED') {
        const targetDate = parseAppointmentToDate(apt);
        const iso = apt.dateIso || (targetDate ? getISODate(targetDate) : null);
        if (iso && iso < todayIso) {
          if (!map[iso]) {
            map[iso] = { 
              dateIso: iso, 
              label: getLocalizedDateLabel(targetDate, iso, isAr), 
              count: 0,
              targetDate: targetDate
            };
          }
          map[iso].count++;
        }
      }
    });
    return Object.values(map).sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [combinedAllAppointments, isAr, ticker]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Real-time booking toast alert */}
      {liveToast && (
        <div className="bg-emerald-600 text-white p-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2 border border-emerald-400">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <span className="text-lg">🔔</span>
            <span>
              {isAr
                ? `حجز موعد جديد في الوقت الحقيقي: ${liveToast.patient} ليوم ${liveToast.date} على الساعة ${liveToast.time}`
                : `Nouveau RDV réservé en direct : ${liveToast.patient} pour le ${liveToast.date} à ${liveToast.time}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {liveToast.dateIso && (
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = liveToast.dateIso.split('-').map(Number);
                  setSelectedDate(new Date(y, m - 1, d));
                  setLiveToast(null);
                }}
                className="bg-white text-emerald-800 px-3 py-1 rounded-xl text-xs font-black shadow-xs hover:bg-emerald-50 cursor-pointer"
              >
                {isAr ? 'عرض هذا الموعد' : 'Afficher ce jour'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="text-white/80 hover:text-white p-1 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* ════════════════ 1. TOP 4 KPI METRIC CARDS ════════════════ */}
      <div data-tour="agenda-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: RDV Confirmés */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              {isToday ? t('doc_stat_today_rdv', 'RDV DU JOUR') : `RDV (${shortDateStr})`}
            </span>
            <span className="bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 text-[10px] font-black px-2 py-0.5 rounded-full">
              {t('doc_stat_planning', 'Planning')}
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-[#0086cd]">
              {confirmedCount > 0 ? (
                <>
                  {confirmedCount} <span className="text-lg font-bold">{t('doc_stat_confirmed', 'Confirmés')}</span>
                </>
              ) : (
                totalUpcomingAppointments.length > 0 ? (
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span>{totalUpcomingAppointments.length}</span>
                    <span className="text-base font-bold text-teal-600 dark:text-teal-400">{isAr ? 'مواعيد قادمة' : 'RDV à venir'}</span>
                  </div>
                ) : (
                  <>
                    0 <span className="text-lg font-bold text-slate-400">{t('doc_stat_confirmed', 'Confirmés')}</span>
                  </>
                )
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {totalUpcomingAppointments.length > 0
              ? `${totalUpcomingAppointments.length} RDV confirmés au total dans l'agenda`
              : t('doc_stat_planning_desc', 'Planning prévisionnel du jour')}
          </p>
        </div>

        {/* Card 2: En Attente */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              {t('doc_stat_waiting_room', "SALLE D'ATTENTE")}
            </span>
            <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 text-[10px] font-black px-2 py-0.5 rounded-full">
              {t('doc_stat_file_active', 'File Active')}
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-amber-500">
              {waitingCount} <span className="text-lg font-bold">{t('doc_filter_waiting', 'En Attente')}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">{t('doc_stat_waiting_desc', 'Présents au cabinet ou virtuels')}</p>
        </div>

        {/* Card 3: En Consultation Actuelle */}
        <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              {t('doc_stat_current_consult', 'CONSULTATION ACTUELLE')}
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full">
              {t('doc_stat_live', 'En direct')}
            </span>
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
              {activeConsultation ? activeConsultation.name : t('doc_stat_no_patient', 'Aucun patient')}
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            {activeConsultation ? `${activeConsultation.act} · ${activeConsultation.time}` : t('doc_stat_cabinet_free', 'Cabinet libre')}
          </p>
        </div>

        {/* Card 4: Retard Cabinet / Décalage Estimé */}
        <div 
          onClick={() => onSelectTab && onSelectTab('retard')}
          className={`bg-white dark:bg-[#0c162d] rounded-3xl p-5 border shadow-xs flex flex-col justify-between cursor-pointer group hover:border-teal-400 dark:hover:border-teal-600 transition-all ${
            doctorDelay > 0 
              ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/20' 
              : 'border-slate-100 dark:border-slate-800'
          }`}
          title={isAr ? 'اضغط لتعديل تأخير العيادة' : 'Cliquez pour modifier le décalage / retard du cabinet'}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {isAr ? 'التأخير التقديري' : t('doc_stat_estimated_delay', 'DÉCALAGE ESTIMÉ')}
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition-all ${
              doctorDelay > 0
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}>
              {doctorDelay > 0
                ? (isAr ? `⏱️ +${doctorDelay} دق` : `⏱️ +${doctorDelay} min`)
                : (isAr ? '🟢 في الموعد' : t('doc_stat_on_time', "● À l'heure"))}
            </span>
          </div>
          <div className="my-2">
            <div className={`text-3xl font-black ${
              doctorDelay > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#00A896]'
            }`}>
              {doctorDelay > 0 ? `+${doctorDelay}` : 0}{' '}
              <span className="text-lg font-bold">{isAr ? 'دق' : t('doc_min', 'min')}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {doctorDelay > 0
                ? (isAr ? 'تم إعلام المرضى في قاعة الانتظار' : 'Signalé aux secrétaires et patients')
                : (isAr ? 'تدفق الاستشارات منتظم وفي الوقت المحدد' : t('doc_stat_delay_sync', 'Flux des consultations synchronisé'))}
            </p>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">
              {isAr ? 'تعديل ➔' : 'Gérer ➔'}
            </span>
          </div>
        </div>

      </div>

      {/* ════════════════ 1.5 PROMINENT UPCOMING APPOINTMENT ALERT BANNER ════════════════ */}
      {nextUpcomingAppointment ? (
        <div className="bg-gradient-to-r from-[#0086cd] via-[#00A896] to-[#047857] text-white p-4 sm:p-5 rounded-3xl shadow-lg border border-teal-300/40 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-inner">
              📅
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                  {isAr ? 'الموعد المؤكد القادم' : 'Prochain rendez-vous confirmé'}
                </span>
                {nextUpcomingAppointment.ticketNumber && (
                  <span className="text-[10px] font-black bg-amber-300 text-slate-900 px-2 py-0.5 rounded-full shadow-2xs">
                    Ticket {nextUpcomingAppointment.ticketNumber}
                  </span>
                )}
                <span className="text-[10px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {validUpcomingAppointments.length} {isAr ? 'مواعيد مؤكدة إجمالاً' : 'RDV confirmés au total'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black mt-1 text-white truncate">
                {nextUpcomingAppointment.patientName || nextUpcomingAppointment.patient || 'Patient'} 
                <span className="text-white/70 font-normal mx-2">—</span>
                <span className="text-yellow-200 font-extrabold">{formatRealTimeDate(nextUpcomingAppointment, lang)}</span>
                <span className="text-white/80 font-normal text-xs sm:text-sm"> à </span>
                <span className="text-white font-black underline decoration-white/40 underline-offset-2">{nextUpcomingAppointment.time}</span>
              </h3>
              <p className="text-xs text-white/90 truncate flex items-center gap-2 mt-0.5">
                <span>{nextUpcomingAppointment.motif || nextUpcomingAppointment.specialty || 'Consultation Cabinet'}</span>
                {nextUpcomingAppointment.patientPhone && (
                  <>
                    <span>•</span>
                    <bdi dir="ltr" className="font-mono">{nextUpcomingAppointment.patientPhone}</bdi>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const targetDateObj = parseAppointmentToDate(nextUpcomingAppointment);
                if (targetDateObj) {
                  setSelectedDate(targetDateObj);
                }
                const el = document.querySelector('[data-tour="agenda-slots-planning"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>🔍</span>
              <span>{isAr ? 'عرض هذا الموعد في الجدول ➔' : 'Consulter ce créneau dans l\'agenda ➔'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty state banner when no upcoming appointment or all expired: "say u dont have any" */
        <div className="bg-gradient-to-r from-slate-50 via-teal-50/40 to-slate-50 dark:from-[#0c1a2e] dark:via-teal-950/20 dark:to-[#0c1a2e] text-slate-800 dark:text-slate-100 p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-2 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-teal-100/70 dark:bg-teal-900/40 flex items-center justify-center text-2xl shrink-0 shadow-2xs border border-teal-200/60 dark:border-teal-700/50">
              📅
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full">
                  {isAr ? 'المواعيد القادمة' : 'Statut des rendez-vous'}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  {isAr ? 'الجدول محيّن' : 'Planning à jour'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">
                {isAr ? 'لا توجد مواعيد مؤكدة قادمة في الوقت الحالي' : "Vous n'avez aucun rendez-vous à venir pour le moment"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'جميع المواعيد السابقة منتهية الصلاحية أو تمت معالجتها. سيظهر أي حجز جديد هنا مباشرة وبشكل فوري.'
                  : "Tous les rendez-vous passés sont terminés ou expirés. Dès qu'un patient réserve un nouveau créneau, il apparaîtra ici en temps réel."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(new Date());
                const el = document.querySelector('[data-tour="agenda-slots-planning"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#00A896] dark:text-teal-400 font-extrabold text-xs border border-slate-200 dark:border-slate-700 shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>📋</span>
              <span>{isAr ? 'عرض جدول مواعيد اليوم' : "Consulter l'agenda d'aujourd'hui"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ 2. FILE D'ATTENTE ACTIVE & CABINET ════════════════ */}
      <div className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>⏱️</span> <span>{t('doc_queue_title', "File d'Attente Active (Salle d'Attente Virtuelle & Cabinet)")}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('doc_queue_subtitle', "Gérez le flux des patients en temps réel, appelez les prochains tickets et déclenchez les actions de consultation.")}
            </p>
          </div>

          <button
            type="button"
            data-tour="agenda-call-next"
            onClick={handleCallNextWaiting}
            className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-md shadow-teal-500/20 cursor-pointer self-start sm:self-center transition-all"
          >
            <Volume2 className="w-4 h-4" />
            <span>{t('doc_call_next_btn', 'Appeler Patient Suivant')}</span>
          </button>
        </div>

        {/* Two Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: EN CONSULTATION ACTUELLE */}
          <div data-tour="agenda-active-consult" className="lg:col-span-5 p-5 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900 flex flex-col justify-between space-y-4">
            
            <div>
              <span className="text-[10px] font-black uppercase text-teal-800 dark:text-teal-300 tracking-wider">
                {t('doc_current_in_consult', 'EN CONSULTATION ACTUELLE')}
              </span>

              {activeConsultation ? (
                <div className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-teal-300/80 dark:border-teal-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {activeConsultation.name}
                    </h3>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                      {t('doc_in_progress', 'En cours')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {t('doc_act_prefix', 'Acte :')} <strong>{resolveActName(activeConsultation.act, lang)}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'وقت البدء :' : t('doc_start_time', 'Heure début :')} <span dir="ltr" className="inline-block font-semibold">{activeConsultation.callTime || activeConsultation.time}</span> · {resolveCnamRegime(activeConsultation.cnam, lang)}
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                  <span className="text-2xl">🧑‍⚕️</span>
                  <h4 className="font-black text-xs text-slate-800 dark:text-white">{t('doc_no_consult_in_progress', 'Aucune consultation en cours')}</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {t('doc_cabinet_free_desc', 'Le cabinet est libre. Cliquez sur "Appeler Patient Suivant" ci-dessus pour faire entrer le patient.')}
                  </p>
                </div>
              )}
            </div>

            {/* 4 Action Buttons matching screenshot! */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {/* Button 1: Prescrire Ordonnance */}
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('ordonnance')}
                className="p-2.5 rounded-xl bg-[#00A896] hover:bg-[#008F80] text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('doc_btn_prescribe', 'Prescrire Ordonnance')}</span>
              </button>

              {/* Button 2: Dossier Médical */}
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('ehr')}
                className="p-2.5 rounded-xl bg-[#0c2238] hover:bg-[#122e4c] text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all border border-teal-900"
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('doc_btn_ehr', 'Dossier Médical')}</span>
              </button>

              {/* Button 3: Notifier Message */}
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('whatsapp')}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('doc_btn_notify', 'Notifier Message')}</span>
              </button>

              {/* Button 4: Terminer Séance */}
              <button
                type="button"
                onClick={handleEndSession}
                disabled={!activeConsultation}
                className={`p-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all ${
                  activeConsultation
                    ? 'bg-[#059669] hover:bg-[#047857] text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{t('doc_btn_finish', 'Terminer Séance')}</span>
              </button>
            </div>

          </div>

          {/* Right Column: ÉLÉMENTS EN ATTENTE DE PASSAGE & TOUS LES RDV CONFIRMÉS */}
          <div data-tour="agenda-waiting-list" className="lg:col-span-7 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            
            {/* Tab Switcher Header */}
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveWaitingTab('waiting')}
                  className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    activeWaitingTab === 'waiting'
                      ? 'bg-[#00A896] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'قائمة انتظار اليوم' : "File d'attente du jour"} ({waitingPatients.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveWaitingTab('all')}
                  className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeWaitingTab === 'all'
                      ? 'bg-[#0086cd] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{isAr ? 'جميع المواعيد المؤكدة' : 'Tous les RDV confirmés'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeWaitingTab === 'all' ? 'bg-white/30 text-white' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  }`}>
                    {totalUpcomingAppointments.length}
                  </span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400 font-medium">
                {activeWaitingTab === 'waiting' ? t('doc_order_arrival', "Ordre d'arrivée") : (isAr ? 'الترتيب الزمني' : 'Planning chronologique')}
              </span>
            </div>

            {/* TAB 1: File d'attente du jour */}
            {activeWaitingTab === 'waiting' && (
              <>
                {waitingPatients.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <span className="text-3xl">☕</span>
                    <h4 className="font-black text-xs text-slate-700 dark:text-slate-200">
                      {isAr ? 'لا يوجد مرضى في قاعة الانتظار اليوم حالياً.' : "Aucun patient n'attend actuellement dans la salle d'attente aujourd'hui."}
                    </h4>
                    {totalUpcomingAppointments.length > 0 ? (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveWaitingTab('all')}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0086cd] dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-black hover:bg-sky-100 cursor-pointer transition-all inline-flex items-center gap-1.5"
                        >
                          <span>📅</span>
                          <span>{isAr ? `عرض ${totalUpcomingAppointments.length} موعد مؤكد في الأيام القادمة ➔` : `Consulter les ${totalUpcomingAppointments.length} RDV confirmés à venir ➔`}</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        {isAr ? 'ستتم إضافة المرضى تلقائياً عند تسجيلهم في الاستقبال أو عبر الإنترنت.' : "Les patients s'ajouteront automatiquement lors de leur enregistrement à l'accueil ou en ligne."}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    {waitingPatients.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-teal-400 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-teal-50 text-[#00A896] font-mono font-black flex items-center justify-center text-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-white truncate">{p.name}</h4>
                            <p className="text-[11px] text-slate-400 truncate">{t('doc_rdv_at', 'RDV à')} {p.time} · <bdi dir="ltr">{p.phone}</bdi></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                            {t('doc_filter_waiting', p.status)}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (playChime) playChime();
                              endedPatientRef.current = null;
                              try {
                                const docKey = doctorId || 'doc-1';
                                const key = `sahatn_completed_sessions_${docKey}`;
                                const raw = localStorage.getItem(key);
                                if (raw) {
                                  const list = JSON.parse(raw);
                                  const filtered = list.filter(s => (s.patient || s.name || '').toLowerCase().trim() !== (p.name || '').toLowerCase().trim());
                                  localStorage.setItem(key, JSON.stringify(filtered));
                                }
                              } catch (e) {}
                              if (typeof onCallPatient === 'function') {
                                onCallPatient(p.name);
                              }
                              const currentCallTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                              const aptId = p.appointmentId || p.id;
                              setActiveConsultation({
                                id: aptId,
                                appointmentId: aptId,
                                name: p.name,
                                time: currentCallTime, // Real call time when doctor actually calls the patient
                                callTime: currentCallTime,
                                scheduledTime: p.time,
                                startedAt: new Date().toISOString(),
                                phone: p.phone,
                                act: p.act || `Consultation ${doctorSpecialty || 'Médicale'}`,
                                cnam: p.cnam || 'Filière Privée',
                                fee: p.fee || 70
                              });
                              const remaining = waitingPatients.filter(item => item.id !== p.id);
                              setWaitingPatients(remaining);
                              try {
                                const storageKey = getDailyWaitKey(doctorId);
                                localStorage.setItem(storageKey, JSON.stringify(remaining));
                              } catch (e) {}

                              if (aptId) {
                                await api.updateAppointment(aptId, { 
                                  status: 'IN_CONSULTATION',
                                  callTime: currentCallTime,
                                  calledAt: new Date().toISOString(),
                                  patientName: p.name,
                                  patient: p.name,
                                  doctorId: doctorId || 'doc-1'
                                }).catch(() => null);
                              }
                            }}
                            className="px-3 py-1.5 bg-[#00A896] hover:bg-[#008F80] text-white font-extrabold text-[11px] rounded-xl cursor-pointer shadow-xs active:scale-95"
                          >
                            {t('doc_call_btn', 'Appeler')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: Tous les RDV confirmés */}
            {activeWaitingTab === 'all' && (
              <>
                {totalUpcomingAppointments.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <span className="text-3xl">🗓️</span>
                    <h4 className="font-black text-xs text-slate-700 dark:text-slate-200">
                      {isAr ? 'لا توجد مواعيد مؤكدة مسجلة' : 'Aucun rendez-vous confirmé enregistré'}
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      {isAr ? 'بمجرد أن يحجز مريض موعداً عبر الإنترنت أو بالعيادة، سيظهر هنا فورياً.' : "Dès qu'un patient réserve un créneau en ligne ou au cabinet, il apparaîtra instantanément ici."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {totalUpcomingAppointments.map((apt, idx) => {
                      const aptDateObj = parseAppointmentToDate(apt);
                      const isCurrentDay = aptDateObj && isSameDay(aptDateObj, selectedDate);
                      return (
                        <div
                          key={apt.id || `apt-${idx}`}
                          className={`p-3.5 rounded-2xl bg-white dark:bg-slate-855 border transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCurrentDay
                              ? 'border-teal-400 bg-teal-50/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-sky-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#0086cd] font-mono font-black flex items-center justify-center text-xs shrink-0 border border-sky-200/60">
                              {apt.ticketNumber || `#${idx + 1}`}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 dark:text-white truncate">
                                  {apt.patientName || apt.name || 'Patient'}
                                </h4>
                                <span className="text-[9px] font-black px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Confirmé
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5">
                                <span className="text-sky-700 dark:text-sky-300 font-extrabold">📅 {formatRealTimeDate(apt, lang)}</span>
                                <span>à</span>
                                <span className="font-black text-slate-800 dark:text-slate-200">{apt.time}</span>
                                {apt.patientPhone && (
                                  <>
                                    <span>·</span>
                                    <bdi dir="ltr">{apt.patientPhone}</bdi>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (aptDateObj) {
                                  setSelectedDate(aptDateObj);
                                }
                                const el = document.querySelector('[data-tour="agenda-slots-planning"]');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                isCurrentDay
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <span>{isCurrentDay ? (isAr ? '✓ الموعد معروض' : '✓ Date affichée') : (isAr ? '📅 عرض هذا اليوم' : '📅 Voir ce jour')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </div>

      {/* ════════════════ 3. AGENDA & PLANNING JOURNALIER (Exact Screenshot 1) ════════════════ */}
      <div data-tour="agenda-slots-planning" className="bg-white dark:bg-[#0c162d] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
        
        {/* ── VERSION SWITCHER BAR (Version 1 vs Version 2) ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 font-black text-sm shadow-xs shrink-0">
              ⏱️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {isAr ? 'طريقة عرض جدول المواعيد :' : "Mode d'affichage de l'agenda :"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {agendaVersion === 'v2'
                  ? (isAr ? 'تم إخفاء الفترات الفارغة المنقضية — يتم عرض المواعيد فقط والفترات المتبقية لليوم.' : 'Créneaux passés vides masqués — seuls les rendez-vous et les créneaux restants du jour sont affichés.')
                  : (isAr ? 'النسخة الأصلية الكاملة مع كافة الفترات الزمنية لليوم (بما فيها الفترات الفارغة)' : 'Version complète originale affichant tous les créneaux et rendez-vous de la journée.')}
              </p>
            </div>
          </div>

          {/* Version 1 & Version 2 Toggle Buttons */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner shrink-0 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => handleSetAgendaVersion('v1')}
              className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                agendaVersion === 'v1'
                  ? 'bg-white dark:bg-[#0086cd] text-[#0086cd] dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isAr ? 'الإصدار 1: إبقاء نفس العرض الحالي الكامل' : 'Version 1 : Garder la même version actuelle complète avec tous les créneaux et rendez-vous'}
            >
              <span>📋</span>
              <span>{isAr ? 'الإصدار 1 (الكامل)' : 'Version 1 (Actuelle)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetAgendaVersion('v2')}
              className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                agendaVersion === 'v2'
                  ? 'bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isAr ? 'الإصدار 2: إخفاء الفترات الفارغة المنقضية وعرض المواعيد والأوقات المتبقية قبل إغلاق العيادة' : 'Version 2 : Masquer les créneaux passés vides et afficher les RDV passés ainsi que les créneaux restants'}
            >
              <span>⚡</span>
              <span>{isAr ? 'الإصدار 2 (المواعيد والأوقات المتبقية)' : 'Version 2 (Filtrée)'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            </button>
          </div>
        </div>

        {/* Top Navigation Row (Screenshot 1) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Interactive Date Switcher Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Prev Arrow */}
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:border-teal-400"
              title={t('doc_prev_day', 'Jour précédent')}
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>

            {/* Date Pill: Mar. 20 oct. */}
            <button
              type="button"
              onClick={handleToday}
              className={`font-extrabold text-xs px-4 py-2 rounded-2xl border shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ${
                activeLeave
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                  : isToday
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-[#eef2ff] dark:bg-indigo-950/50 hover:bg-[#e0e7ff] text-[#4f46e5] dark:text-indigo-300 border-[#c7d2fe] dark:border-indigo-900'
              }`}
              title={activeLeave ? `En congé : ${activeLeave.reason}` : "Cliquer pour revenir à aujourd'hui"}
            >
              <span>{shortDateStr}</span>
              {activeLeave && <span title={`Congé: ${activeLeave.reason || 'En congé'}`}>🏖️</span>}
            </button>

            {/* Next Arrow */}
            <button
              type="button"
              onClick={handleNextDay}
              className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:border-teal-400"
              title={t('doc_next_day', 'Jour suivant')}
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>

            {/* Aujourd'hui */}
            <button
              type="button"
              onClick={handleToday}
              className={`border text-xs px-3 py-2 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 ${
                isToday
                  ? 'bg-[#00A896] text-white border-[#00A896] font-black'
                  : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold'
              }`}
              title="Revenir à la date d'aujourd'hui"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isToday ? 'text-white' : 'text-slate-400'}`} />
              <span>{t('doc_today', "Aujourd'hui")}</span>
            </button>

            {/* Full text Date */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white px-1 tracking-tight">
                {fullDateStr}
              </h3>
              {isPastDay && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#0086cd] dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1 self-center">
                  <span>🕒</span>
                  <span>{isAr ? 'سجل المواعيد المنقضية' : 'Historique RDV Passés'}</span>
                </span>
              )}
            </div>

            {/* Interactive Calendar Popover Trigger Button */}
            <div ref={calendarPopoverRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => {
                  setOpenCalendarPopover(prev => !prev);
                  setCalendarViewMonth(new Date(selectedDate));
                }}
                className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border rounded-2xl px-3 py-1.5 text-xs font-mono font-bold transition-all shadow-2xs group cursor-pointer active:scale-95 ${
                  openCalendarPopover
                    ? 'border-[#00A896] ring-2 ring-[#00A896]/20 bg-teal-50/40 dark:bg-teal-950/40 text-[#00A896]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-[#00A896] text-slate-700 dark:text-slate-200'
                }`}
                title={isAr ? "الروزنامة: اختيار تاريخ لعرض المواعيد وسجل المواعيد المنقضية" : "Calendrier : Choisir une date pour afficher les RDV et l'historique"}
              >
                <div className="flex flex-col text-start font-sans leading-tight">
                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    {dmyStr}
                  </span>
                  {appointmentCountsByIso[isoStr] > 0 && (
                    <span className="text-[10px] font-black text-[#00A896] dark:text-teal-400">
                      ({appointmentCountsByIso[isoStr]} {isAr ? 'موعد' : 'rdv'})
                    </span>
                  )}
                </div>
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00A896] transition-colors" />
              </button>

              {/* Custom Calendar & Appointments Popover */}
              {openCalendarPopover && (
                <div className="absolute left-0 rtl:right-0 rtl:left-auto top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[999] p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  {/* Top Month Navigation */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <button
                      type="button"
                      onClick={handlePrevCalendarMonth}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
                      title="Mois précédent"
                    >
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    </button>

                    <div className="text-center">
                      <h4 className="text-xs sm:text-sm font-black capitalize text-slate-800 dark:text-white">
                        {calendarMonthLabel}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {appointmentCountsByIso[currentDateKey] ? `${appointmentCountsByIso[currentDateKey]} ${isAr ? 'موعد مسجل لهذا اليوم' : 'RDV pour ce jour'}` : (isAr ? 'اضغط على أي يوم لعرض تفاصيله' : 'Cliquez sur un jour pour afficher ses détails')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextCalendarMonth}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
                      title="Mois suivant"
                    >
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>

                  {/* Tabs Switcher: Calendrier Mensuel vs Tous les RDV Passés vs Prochains RDV */}
                  <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCalendarTab('calendar')}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        calendarTab === 'calendar'
                          ? 'bg-white dark:bg-[#0086cd] text-[#0086cd] dark:text-white shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      📅 {isAr ? 'الروزنامة' : 'Calendrier'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarTab('past')}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        calendarTab === 'past'
                          ? 'bg-white dark:bg-[#0086cd] text-[#0086cd] dark:text-white shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={isAr ? 'عرض سجل المواعيد المنقضية' : 'Afficher tous les RDV passés'}
                    >
                      🕒 {isAr ? 'سجل المنقضية' : 'RDV Passés'} ({pastDaysWithAppointments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarTab('upcoming')}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        calendarTab === 'upcoming'
                          ? 'bg-white dark:bg-[#0086cd] text-[#0086cd] dark:text-white shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={isAr ? 'المواعيد القادمة المحجوزة' : 'Prochains RDV réservés'}
                    >
                      📌 {isAr ? 'القادمة' : 'À venir'} ({daysWithAppointments.length})
                    </button>
                  </div>

                  {/* View 1: Calendar Grid */}
                  {calendarTab === 'calendar' && (
                    <div>
                      {/* Weekday headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 pb-1.5">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => (
                          <span key={i}>{isAr ? ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'][i] : d}</span>
                        ))}
                      </div>

                      {/* Day cells */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarGridDays.map((cell, idx) => {
                          const isSelected = currentDateKey === cell.dateIso;
                          const isCellToday = isSameDay(cell.dateObj, new Date());
                          const hasApts = cell.count > 0;

                          return (
                            <button
                              key={`${cell.dateIso}-${idx}`}
                              type="button"
                              onClick={() => {
                                setSelectedDate(cell.dateObj);
                                setOpenCalendarPopover(false);
                              }}
                              className={`p-1 min-h-[46px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative border ${
                                !cell.isCurrentMonth
                                  ? 'opacity-25 hover:opacity-60 border-transparent text-slate-400'
                                  : isSelected
                                  ? 'bg-[#0086cd] text-white font-black shadow-md border-[#0086cd] ring-2 ring-[#0086cd]/30'
                                  : hasApts
                                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-700/80 hover:bg-teal-100 text-teal-950 dark:text-teal-200'
                                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className={`text-xs ${
                                isSelected ? 'text-white font-black' : isCellToday ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'font-bold'
                              }`}>
                                {cell.dayNumber}
                              </span>
                              {hasApts && (
                                <span className={`text-[9px] font-black leading-tight ${
                                  isSelected ? 'text-white/95' : 'text-[#00A896] dark:text-teal-400'
                                }`}>
                                  ({cell.count} {isAr ? 'موعد' : 'rdv'})
                                </span>
                              )}
                              {isCellToday && !isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute bottom-1"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* View 2: Tous les RDV Passés */}
                  {calendarTab === 'past' && (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                      {pastDaysWithAppointments.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          <span>🕒</span>
                          <p className="mt-1 font-bold">
                            {isAr ? 'لا توجد مواعيد سابقة مسجلة' : 'Aucun rendez-vous passé enregistré'}
                          </p>
                        </div>
                      ) : (
                        pastDaysWithAppointments.map((day) => {
                          const isSelected = currentDateKey === day.dateIso;
                          return (
                            <button
                              key={day.dateIso}
                              type="button"
                              onClick={() => {
                                setSelectedDate(day.targetDate);
                                setOpenCalendarPopover(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-start ${
                                isSelected
                                  ? 'bg-[#0086cd] text-white border-[#0086cd] shadow-xs'
                                  : 'border-slate-200/80 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex flex-col text-start">
                                <span className="font-bold text-xs">📅 {day.label}</span>
                                <span className={`text-[11px] font-extrabold mt-0.5 ${
                                  isSelected ? 'text-white/95' : 'text-[#0086cd] dark:text-sky-400'
                                }`}>
                                  ({day.count} {isAr ? 'موعد' : 'rdv'})
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {isAr ? 'عرض التفاصيل ←' : 'Afficher détails →'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* View 3: Prochains RDV Réservés */}
                  {calendarTab === 'upcoming' && (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                      {daysWithAppointments.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          <span>📌</span>
                          <p className="mt-1 font-bold">
                            {isAr ? 'لا توجد مواعيد قادمة محجوزة' : 'Aucun prochain rendez-vous'}
                          </p>
                        </div>
                      ) : (
                        daysWithAppointments.map((day) => {
                          const isSelected = currentDateKey === day.dateIso;
                          return (
                            <button
                              key={day.dateIso}
                              type="button"
                              onClick={() => {
                                setSelectedDate(day.targetDate);
                                setOpenCalendarPopover(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-start ${
                                isSelected
                                  ? 'bg-[#0086cd] text-white border-[#0086cd] shadow-xs'
                                  : 'border-slate-200/80 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex flex-col text-start">
                                <span className="font-bold text-xs">📅 {day.label}</span>
                                <span className={`text-[11px] font-extrabold mt-0.5 ${
                                  isSelected ? 'text-white/95' : 'text-[#0086cd] dark:text-sky-400'
                                }`}>
                                  ({day.count} {isAr ? 'موعد' : 'rdv'})
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {isAr ? 'عرض التفاصيل ←' : 'Afficher détails →'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Bottom Footer: Quick actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleToday();
                        setOpenCalendarPopover(false);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 cursor-pointer transition-all flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isAr ? "اليوم" : "Aujourd'hui"}</span>
                    </button>

                    {/* Manual Native Input for arbitrary years */}
                    <label className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer flex items-center gap-1">
                      <span>{isAr ? 'تاريخ محدد :' : 'Autre date :'}</span>
                      <input
                        type="date"
                        value={isoStr}
                        onChange={(e) => {
                          handleDateInputChange(e);
                          setOpenCalendarPopover(false);
                        }}
                        className="bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono outline-none border border-slate-200 dark:border-slate-700 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>


          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Pointage Comptoir */}
            <button
              type="button"
              onClick={handleOpenPointageModal}
              className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <span className="w-2.5 h-2.5 bg-rose-400 rounded-xs"></span>
              <span>{t('doc_btn_pointage', 'Pointage Comptoir')}</span>
            </button>

            {/* + Nouveau RDV */}
            <button
              type="button"
              onClick={() => {
                const nextAvailSlot = slots.find(s => s.status === 'FREE' && !isSlotPast(s.time, selectedDate))?.time;
                if (nextAvailSlot) {
                  handleOpenBookSlot(nextAvailSlot);
                } else {
                  alert(isAr ? 'لا توجد مواعيد شاغرة قادمة متاحة للحجز لهذا اليوم.' : 'Aucun créneau libre à venir disponible pour cette date.');
                }
              }}
              className="bg-[#00A896] hover:bg-[#008F80] active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('doc_btn_new_rdv', 'Nouveau RDV')}</span>
            </button>

            {/* Bloquer */}
            <button
              type="button"
              onClick={() => setModalBlockOpen(true)}
              className="bg-[#fef2f2] dark:bg-rose-950/40 hover:bg-[#fee2e2] text-[#ef4444] border border-[#fecaca] dark:border-rose-900 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{t('doc_btn_block', 'Bloquer')}</span>
            </button>

            {/* Grid icon toggle */}
            <button
              type="button"
              className="p-2.5 rounded-2xl bg-[#eff6ff] dark:bg-slate-900 text-[#3b82f6] border border-[#dbeafe] dark:border-slate-800 cursor-pointer shadow-xs"
              title="Affichage Grille"
            >
              <span className="text-xs">⊞</span>
            </button>
          </div>

        </div>

        {/* Active Leave Notification Banner */}
        {activeLeave && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl">🏖️</span>
              <div>
                <div className="text-sm sm:text-base font-black flex items-center gap-2 flex-wrap">
                  <span>Cabinet en Période de Congé ce jour</span>
                  <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-extrabold tracking-wide">
                    Agenda & Réservations verrouillés
                  </span>
                </div>
                <div className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-1">
                  Période du <span className="font-bold">{activeLeave.start}</span> au <span className="font-bold">{activeLeave.end}</span> — Motif : <span className="font-bold">{activeLeave.reason || 'Congé exceptionnel'}</span>.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('cabinet')}
              className="px-4 py-2 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-black shadow-xs cursor-pointer transition-all self-end sm:self-auto shrink-0"
            >
              Gérer dans Mon Cabinet
            </button>
          </div>
        )}

        {/* Search Bar & Filters Row (Screenshot 1) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('doc_search_placeholder', 'Rechercher par patient, téléphone...')}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-[#00A896]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'Tous', label: t('doc_filter_all', 'Tous') },
              { id: 'Confirmés', label: t('doc_filter_confirmed', 'Confirmés') },
              { id: 'En Attente', label: t('doc_filter_waiting', 'En Attente') },
              { id: 'Terminés', label: t('doc_filter_finished', 'Terminés') },
              { id: 'Bloqués', label: t('doc_filter_blocked', 'Bloqués') }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterState(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap ${
                  filterState === f.id
                    ? 'bg-[#00A896] text-white font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

        </div>

        {/* Slots List (Screenshot 1) */}
        <div className="space-y-2.5 pt-2">
          {filteredSlots.map((slot) => {
            const isPast = isSlotPast(slot.time, selectedDate);
            const isFree = slot.status === 'FREE';
            const isOccupied = slot.status === 'OCCUPIED';
            const isBlocked = slot.status === 'BLOCKED';
            const isCompleted = slot.status === 'COMPLETED';

            return (
              <div
                key={slot.id ? `${slot.id}-${slot.time}` : slot.time}
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isFree && isPast
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    : isFree
                    ? 'bg-white dark:bg-[#0c162d] border-slate-200/80 dark:border-slate-800 hover:border-teal-300'
                    : isBlocked
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                    : isCompleted
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-teal-50/40 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-900'
                }`}
              >
                {/* Time + Slot Label */}
                <div className="flex items-center gap-4">
                  <span className="font-mono font-black text-sm text-slate-800 dark:text-white w-12">
                    {slot.time}
                  </span>

                  {isFree && (
                    isPast ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                        <span className="line-through">{t('doc_slot_free', 'Créneau Libre')}</span>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-900/60">
                          {isAr ? 'منقضٍ / غير متاح' : 'Passé / Non disponible'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>{t('doc_slot_free', 'Créneau Libre Disponible')}</span>
                      </div>
                    )
                  )}

                  {isOccupied && (
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <strong className="text-slate-900 dark:text-white font-black text-xs sm:text-sm">
                        {slot.patient}
                      </strong>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {slot.act === 'Consultation + ECG' ? t('doc_act_ecg', slot.act) :
                         slot.act === 'Consultation Cardiologie' ? t('doc_consult_cardio', slot.act) :
                         slot.act === 'Contrôle Tension' ? t('doc_act_tension', slot.act) : slot.act}
                      </span>
                      <span className="text-slate-400 text-[11px]">(<bdi dir="ltr">{slot.phone}</bdi>)</span>
                      {isPast && (
                        <span className="bg-sky-50 dark:bg-sky-950/60 text-[#0086cd] dark:text-sky-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 flex items-center gap-1">
                          <span>🕒</span>
                          <span>{isAr ? 'موعد منقضٍ' : 'RDV Passé'}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <strong className="text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                        {slot.patient}
                      </strong>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {slot.act || 'Consultation'}
                      </span>
                      <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Séance Terminée</span>
                      </span>
                    </div>
                  )}

                  {isBlocked && (
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>
                        {slot.patient === 'Pause Déjeuner Cabinet' ? t('doc_slot_lunch', slot.patient) : slot.patient} ({slot.act === 'Fermé' ? t('doc_slot_closed', slot.act) : slot.act})
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isFree && (
                    isPast ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 cursor-not-allowed select-none flex items-center gap-1">
                          <span>⏱️</span>
                          <span>{isAr ? 'غير متاح للحجز' : 'Non disponible'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleBlockSlot(slot.time)}
                          className="p-1.5 text-slate-300 hover:text-amber-500 cursor-pointer"
                          title={t('doc_slot_block', 'Bloquer ce créneau')}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenBookSlot(slot.time)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black text-[#4f46e5] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('doc_slot_book', 'Réserver')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBlockSlot(slot.time)}
                          className="p-1.5 text-slate-300 hover:text-amber-500 cursor-pointer"
                          title={t('doc_slot_block', 'Bloquer ce créneau')}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )
                  )}

                  {isOccupied && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (playChime) playChime();
                          endedPatientRef.current = null;
                          const currentCallTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          const aptId = slot.appointment?.id || slot.id;
                          try {
                            const docKey = doctorId || 'doc-1';
                            const key = `sahatn_completed_sessions_${docKey}`;
                            const raw = localStorage.getItem(key);
                            if (raw) {
                              const list = JSON.parse(raw);
                              const filtered = list.filter(s => (s.patient || s.name || '').toLowerCase().trim() !== (slot.patient || '').toLowerCase().trim());
                              localStorage.setItem(key, JSON.stringify(filtered));
                            }
                          } catch (e) {}
                          if (typeof onCallPatient === 'function') {
                            onCallPatient(slot.patient);
                          }
                          setActiveConsultation({
                            id: aptId,
                            appointmentId: aptId,
                            name: slot.patient,
                            time: currentCallTime, // Real call time
                            callTime: currentCallTime,
                            scheduledTime: slot.time,
                            startedAt: new Date().toISOString(),
                            phone: slot.phone,
                            act: slot.act || `Consultation ${doctorSpecialty || 'Médicale'}`,
                            cnam: slot.cnam || 'Filière Privée',
                            fee: slot.fee || 70
                          });
                          if (aptId) {
                            api.updateAppointment(aptId, { 
                              status: 'IN_CONSULTATION',
                              callTime: currentCallTime,
                              calledAt: new Date().toISOString(),
                              patientName: slot.patient,
                              patient: slot.patient,
                              doctorId: doctorId || 'doc-1'
                            }).catch(() => null);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#00A896] hover:bg-[#008F80] text-white shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{t('doc_call_btn', 'Appeler')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCompleteSlot(slot)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                        title="Marquer la séance comme terminée & synchroniser avec la caisse"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t('doc_btn_finish', 'Terminer')}</span>
                      </button>
                    </div>
                  )}

                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => onSelectTab && onSelectTab('caisse')}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all flex items-center gap-1 cursor-pointer"
                      title="Consulter le reçu et la séance dans l'historique caisse"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{t('doc_btn_view_caisse', 'Voir en Caisse')}</span>
                    </button>
                  )}

                  {isBlocked && (
                    <button
                      type="button"
                      onClick={() => handleBlockSlot(slot.time)}
                      className="px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>{t('doc_slot_unblock', 'Débloquer')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredSlots.length === 0 && (
            <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
              <span className="text-3xl block">{isPastDay ? '📁' : '☕'}</span>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                {isPastDay
                  ? (isAr ? 'لا توجد مواعيد مسجلة لهذا اليوم المنقضي.' : 'Aucun rendez-vous enregistré pour cette journée passée.')
                  : agendaVersion === 'v2'
                  ? (isAr ? 'لا توجد فترات متبقية قبل إغلاق العيادة لهذا اليوم.' : 'Aucun créneau restant avant la fermeture du cabinet pour cette journée.')
                  : (isAr ? 'لا توجد فترات مطابقة في هذا اليوم.' : 'Aucun créneau correspondant pour cette date.')}
              </p>
              <p className="text-xs text-slate-400">
                {isPastDay
                  ? (isAr ? '(تم إخفاء الفترات الفارغة غير المحجوزة في الإصدار 2)' : '(Les créneaux passés vides sont masqués en Version 2)')
                  : agendaVersion === 'v2'
                  ? (isAr ? '(تم إخفاء الفترات الفارغة المنقضية بموجب الإصدار 2)' : '(Les créneaux passés vides sont masqués en Version 2)')
                  : (isAr ? 'حاول تغيير معايير البحث أو اختيار يوم آخر' : 'Essayez de changer les critères de filtre ou de sélectionner un autre jour')}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleToday}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#00A896] border border-teal-200 dark:border-teal-800 text-xs font-black hover:bg-teal-100 transition-all cursor-pointer"
                >
                  <span>🔄</span>
                  <span>{isAr ? "العودة إلى اليوم" : "Revenir à aujourd'hui"}</span>
                </button>
                {agendaVersion === 'v2' && !isPastDay && (
                  <button
                    type="button"
                    onClick={() => handleSetAgendaVersion('v1')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-[#0086cd] border border-sky-200 dark:border-sky-800 text-xs font-black hover:bg-sky-100 transition-all cursor-pointer"
                  >
                    <span>📋</span>
                    <span>{isAr ? 'التبديل إلى الإصدار 1 الكامل' : 'Basculer en Version 1 (Complète)'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: RÉSERVER CRÉNEAU (EXPÉRIENCE PATIENT COMPLÈTE)
          ══════════════════════════════════════════════════════════════ */}
      {modalNewRdvSlot && (
        <div
          id="doctor-agenda-booking-modal"
          className="fixed inset-0 z-50 modal-overlay bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
        >
          <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4 max-h-[92vh] overflow-y-auto">

            {bookingSuccessData ? (
              /* Success State Screen */
              <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner ring-8 ring-emerald-50 dark:ring-emerald-950/40">
                  ✓
                </div>
                <div className="space-y-1">
                  <span className="inline-block bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {bookingSuccessData.ticketNumber ? `Ticket ${bookingSuccessData.ticketNumber}` : (isAr ? 'حجز مؤكد' : 'RDV Confirmé')}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white pt-1">
                    {isAr ? 'تم تأكيد حجز الموعد بنجاح !' : 'Rendez-vous confirmé avec succès !'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    {isAr 
                      ? 'تم تسجيل الموعد في جدول العيادة وقائمة الانتظار بنجاح.' 
                      : 'Le créneau a été réservé et synchronisé en temps réel dans votre agenda et la file d\'attente.'}
                  </p>
                </div>

                {/* Recap Box */}
                <div className="bg-[#f8fafc] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs text-left rtl:text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'المريض :' : 'Patient :'}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{bookingSuccessData.patientName}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'الطبيب :' : 'Praticien :'}</span>
                    <span className="font-bold text-[#0086cd]">{bookingSuccessData.doctorName || activeDocName}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'الموعد :' : 'Date & Heure :'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {getShortDate(selectedDate, lang)} à {bookingSuccessData.time || modalNewRdvSlot}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'نوع الاستشارة :' : 'Mode :'}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {consultType === 'TELECONSULTATION' ? (isAr ? '📹 استشارة عن بعد' : '📹 Téléconsultation') : (isAr ? '🏢 في العيادة' : '🏢 Au Cabinet')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseBookModal}
                  className="w-full bg-[#0086cd] hover:bg-[#0074b3] text-white font-extrabold py-3 px-4 rounded-xl transition-all cursor-pointer shadow-md text-xs sm:text-sm active:scale-98"
                >
                  {isAr ? 'إغلاق ومتابعة' : 'Fermer'}
                </button>
              </div>
            ) : (
              <>
                {/* 1. Header: Doctor Avatar, Name & Specialty + Close */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={activeAvatar}
                        onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }}
                        alt={activeDocName}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                        {activeDocName}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {activeDocSpec} • {activeDocCity}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseBookModal}
                    className="w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* 2. Summary Info Box: Créneau, Honoraires, CNAM */}
                <div className="bg-[#f8fafc] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'الموعد المختار :' : 'Créneau sélectionné :'}
                    </span>
                    <span className="bg-[#e0f2fe] dark:bg-sky-950/80 text-[#0284c7] dark:text-sky-300 border border-sky-100 dark:border-sky-800/60 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      {getShortDate(selectedDate, lang)} à {modalNewRdvSlot}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'تعريفة الفحص :' : 'Honoraires consultation :'}
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {doctorProfile?.fee || 70} TND
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'تغطية واسترجاع الكنام :' : 'Prise en charge CNAM :'}
                    </span>
                    <span className="bg-[#ecfdf5] dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60 font-bold px-2 py-0.5 rounded-full text-[11px]">
                      ~{doctorProfile?.cnamReimbursement || 49} TND
                    </span>
                  </div>
                </div>

                {bookingError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl animate-in fade-in">
                    ⚠️ {bookingError}
                  </div>
                )}

                <form onSubmit={handleBookSlotSubmit} className="space-y-3.5">
                  {/* 3. Beneficiary Selection */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'لمن هذا الموعد؟' : 'POUR QUI PRENEZ-VOUS CE RENDEZ-VOUS ?'}
                    </label>
                    <div className="bg-slate-100/70 dark:bg-slate-900/80 p-1 rounded-xl grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBeneficiaryType('self')}
                        className={`py-2 px-3 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          beneficiaryType === 'self'
                            ? 'bg-white dark:bg-slate-800 text-[#0086cd] dark:text-cyan-400 font-extrabold shadow-xs border border-sky-100 dark:border-cyan-800'
                            : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <img src="/images/user (1).png" className="w-4 h-4 object-contain" alt="" />
                        <span>{isAr ? 'لي شخصياً' : 'Pour le patient'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeneficiaryType('relative')}
                        className={`py-2 px-3 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          beneficiaryType === 'relative'
                            ? 'bg-white dark:bg-slate-800 text-[#0086cd] dark:text-cyan-400 font-extrabold shadow-xs border border-sky-100 dark:border-cyan-800'
                            : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <img src="/images/family.png" className="w-4 h-4 object-contain" alt="" />
                        <span>{isAr ? 'لقريب / طفل' : 'Pour un proche / enfant'}</span>
                      </button>
                    </div>

                    {/* Patient (Direct) */}
                    {beneficiaryType === 'self' && (
                      <div className="space-y-2.5 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            {isAr ? 'اسم ولقب المريض *' : 'NOM & PRÉNOM DU PATIENT *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder={isAr ? 'مثال: محمد بن علي' : 'Ex. Mohamed Ben Ali'}
                            className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd] focus:ring-2 focus:ring-[#0086cd]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            {isAr ? 'رقم الهاتف الجوال *' : 'NUMÉRO DE TÉLÉPHONE *'}
                          </label>
                          <TunisianPhoneInput
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="+216 XX XXX XXX"
                            className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd] focus:ring-2 focus:ring-[#0086cd]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Relative Form (Pour un proche) */}
                    {beneficiaryType === 'relative' && (
                      <div className="bg-slate-50 dark:bg-[#071322] p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {isAr ? 'صلة القرابة' : 'Lien de parenté'}
                            </label>
                            <select
                              value={relativeRelation}
                              onChange={(e) => setRelativeRelation(e.target.value)}
                              className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                            >
                              <option value="ENFANT">{isAr ? 'طفل / ابن' : 'Enfant'}</option>
                              <option value="PARENT">{isAr ? 'أب / أم' : 'Parent (Père/Mère)'}</option>
                              <option value="CONJOINT">{isAr ? 'زوج / زوجة' : 'Conjoint(e)'}</option>
                              <option value="AUTRE">{isAr ? 'قريب آخر' : 'Autre proche'}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {isAr ? 'الاسم واللقب للقريب' : 'Nom & Prénom du proche'}
                            </label>
                            <input
                              type="text"
                              required
                              value={relativeName}
                              onChange={(e) => setRelativeName(e.target.value)}
                              placeholder="Ex. Yassine Ben Ali"
                              className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            {isAr ? 'رقم هاتف القريب' : 'Téléphone du proche (Optionnel)'}
                          </label>
                          <TunisianPhoneInput
                            value={relativePhone}
                            onChange={(e) => setRelativePhone(e.target.value)}
                            placeholder="+216 XX XXX XXX"
                            className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Consultation Type Buttons */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'طريقة الاستشارة' : 'MODE DE CONSULTATION'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConsultType('CABINET')}
                        className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          consultType === 'CABINET'
                            ? 'border-[#38bdf8] bg-[#f0f9ff] dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 shadow-2xs font-extrabold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">🏢</span>
                        <span>{isAr ? 'في العيادة' : 'Au Cabinet'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultType('TELECONSULTATION')}
                        className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          consultType === 'TELECONSULTATION'
                            ? 'border-[#38bdf8] bg-[#f0f9ff] dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 shadow-2xs font-extrabold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">📹</span>
                        <span>{isAr ? 'استشارة عن بعد' : 'Téléconsultation'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5. Motif / Acte médical & Créneau horaire */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        {isAr ? 'توقيت الموعد :' : 'HORAIRE DU CRÉNEAU :'}
                      </label>
                      <select
                        value={modalNewRdvSlot}
                        onChange={(e) => setModalNewRdvSlot(e.target.value)}
                        className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                      >
                        {slots
                          .filter(s => (s.status === 'FREE' && !isSlotPast(s.time, selectedDate)) || s.time === modalNewRdvSlot)
                          .map(s => (
                            <option key={s.time} value={s.time}>{s.time}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        {isAr ? 'الإجراء الطبي المزمع :' : 'ACTE MÉDICAL / MOTIF :'}
                      </label>
                      <select
                        value={newPatientAct}
                        onChange={(e) => setNewPatientAct(e.target.value)}
                        className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd]"
                      >
                        <option value="Consultation">{isAr ? 'فحص واستشارة عامة' : 'Consultation'}</option>
                        <option value="Consultation Cardiologie">{isAr ? 'فحص واستشارة أمراض القلب' : 'Consultation Cardiologie'}</option>
                        <option value="Consultation + ECG">{isAr ? 'استشارة + تخطيط القلب (ECG)' : 'Consultation + ECG'}</option>
                        <option value="Échocardiographie">{isAr ? 'تخطيط صدى القلب (Écho Doppler)' : 'Échocardiographie Doppler'}</option>
                        <option value="Contrôle Tensionnel">{isAr ? 'مراقبة ضغط الدم' : 'Contrôle Tensionnel'}</option>
                      </select>
                    </div>
                  </div>

                  {/* 6. CNAM Carnet Number */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'رقم بطاقة الكنام (اختياري)' : 'NUMÉRO DE CARNET CNAM (OPTIONNEL)'}
                    </label>
                    <input
                      type="text"
                      value={cnamCarnet}
                      onChange={(e) => setCnamCarnet(e.target.value)}
                      placeholder="Ex. 12345678"
                      className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-[#0086cd] transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* 7. Patient Email with Instant Auto-Confirmation Badge */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {isAr ? 'البريد الإلكتروني (اختياري)' : 'ADRESSE E-MAIL (OPTIONNELLE)'}
                      </label>
                      <span className="bg-[#ecfdf5] dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span>✉️</span>
                        <span>{isAr ? 'إرسال آلي فوري' : 'ENVOI AUTOMATIQUE'}</span>
                      </span>
                    </div>
                    <input
                      type="email"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      placeholder="patient@exemple.com"
                      className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#0086cd] transition-all"
                    />
                  </div>

                  {/* 8. Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseBookModal}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      {isAr ? 'إلغاء' : 'Annuler'}
                    </button>
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="flex-2 bg-[#0086cd] hover:bg-[#0074b3] active:scale-[0.99] text-white font-extrabold py-2.5 px-4 rounded-xl shadow-md text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {bookingSubmitting ? (
                        <span>{isAr ? 'جاري التأكيد...' : 'Validation en cours...'}</span>
                      ) : (
                        <span>✓ {isAr ? 'تأكيد حجز الموعد' : 'CONFIRMER LE RENDEZ-VOUS'}</span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: POINTAGE COMPTOIR (EXPÉRIENCE PATIENT COMPLÈTE)
          ══════════════════════════════════════════════════════════════ */}
      {modalPointageOpen && (
        <div
          id="doctor-agenda-pointage-modal"
          className="fixed inset-0 z-50 modal-overlay bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
        >
          <div className="bg-white dark:bg-[#0c1a2e] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4 max-h-[92vh] overflow-y-auto">

            {bookingSuccessData ? (
              /* Success State Screen */
              <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner ring-8 ring-emerald-50 dark:ring-emerald-950/40">
                  ✓
                </div>
                <div className="space-y-1">
                  <span className="inline-block bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {bookingSuccessData.ticketNumber ? `Ticket ${bookingSuccessData.ticketNumber}` : (isAr ? 'حضور مسجل' : 'Pointage Confirmé')}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white pt-1">
                    {isAr ? 'تم تسجيل حضور المريض بنجاح !' : 'Patient enregistré en salle d\'attente !'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    {isAr 
                      ? 'تمت إضافة المريض مباشرة في قاعة الانتظار وقائمة الاستشارات لليوم.' 
                      : 'Le patient a été placé dans la file d\'attente du jour et apparaît immédiatement pour appel.'}
                  </p>
                </div>

                {/* Recap Box */}
                <div className="bg-[#f8fafc] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs text-left rtl:text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'المريض :' : 'Patient :'}</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{bookingSuccessData.patientName}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'الطبيب :' : 'Praticien :'}</span>
                    <span className="font-bold text-[#0086cd]">{bookingSuccessData.doctorName || activeDocName}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'وقت التسجيل :' : 'Heure d\'arrivée :'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {bookingSuccessData.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'الحالة :' : 'Statut :'}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {isAr ? '⏳ في قاعة الانتظار' : '⏳ En attente au cabinet'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClosePointageModal}
                  className="w-full bg-[#00A896] hover:bg-[#008F80] text-white font-extrabold py-3 px-4 rounded-xl transition-all cursor-pointer shadow-md text-xs sm:text-sm active:scale-98"
                >
                  {isAr ? 'إغلاق ومتابعة' : 'Fermer'}
                </button>
              </div>
            ) : (
              <>
                {/* 1. Header: Doctor Avatar, Name & Specialty + Close */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={activeAvatar}
                        onError={(e) => { e.currentTarget.src = '/images/doctor_selim.jpg'; }}
                        alt={activeDocName}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                          {activeDocName}
                        </h3>
                        <span className="text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.2 rounded-full">
                          {isAr ? 'تسجيل الحضور بالمكتب' : 'Pointage Comptoir'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {activeDocSpec} • {activeDocCity}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClosePointageModal}
                    className="w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* 2. Summary Info Box: En direct, Honoraires, CNAM */}
                <div className="bg-[#f8fafc] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'وقت الوصول والاستقبال :' : 'Arrivée au comptoir :'}
                    </span>
                    <span className="bg-[#e0f2fe] dark:bg-sky-950/80 text-[#0284c7] dark:text-sky-300 border border-sky-100 dark:border-sky-800/60 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      {isAr ? 'الآن مباشرة' : 'En direct'} — {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'تعريفة الفحص :' : 'Honoraires consultation :'}
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {doctorProfile?.fee || 70} TND
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'تغطية واسترجاع الكنام :' : 'Prise en charge CNAM :'}
                    </span>
                    <span className="bg-[#ecfdf5] dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60 font-bold px-2 py-0.5 rounded-full text-[11px]">
                      ~{doctorProfile?.cnamReimbursement || 49} TND
                    </span>
                  </div>
                </div>

                {bookingError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl animate-in fade-in">
                    ⚠️ {bookingError}
                  </div>
                )}

                <form onSubmit={handlePointageSubmit} className="space-y-3.5">
                  {/* 3. Beneficiary Selection */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'بيانات المريض الحاضر' : 'PATIENT PRÉSENT AU GUICHET'}
                    </label>
                    <div className="bg-slate-100/70 dark:bg-slate-900/80 p-1 rounded-xl grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBeneficiaryType('self')}
                        className={`py-2 px-3 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          beneficiaryType === 'self'
                            ? 'bg-white dark:bg-slate-800 text-[#00A896] dark:text-teal-400 font-extrabold shadow-xs border border-teal-100 dark:border-teal-800'
                            : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <img src="/images/user (1).png" className="w-4 h-4 object-contain" alt="" />
                        <span>{isAr ? 'المريض نفسه' : 'Le patient lui-même'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeneficiaryType('relative')}
                        className={`py-2 px-3 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          beneficiaryType === 'relative'
                            ? 'bg-white dark:bg-slate-800 text-[#00A896] dark:text-teal-400 font-extrabold shadow-xs border border-teal-100 dark:border-teal-800'
                            : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <img src="/images/family.png" className="w-4 h-4 object-contain" alt="" />
                        <span>{isAr ? 'مرفوق بقريب / طفل' : 'Accompagnant / enfant'}</span>
                      </button>
                    </div>

                    {/* Patient (Direct) */}
                    {beneficiaryType === 'self' && (
                      <div className="space-y-2.5 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            {isAr ? 'اسم ولقب المريض عند الاستقبال *' : 'NOM & PRÉNOM DU PATIENT *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder={isAr ? 'مثال: هشام العياري' : 'Ex. Hichem Ayari'}
                            className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            {isAr ? 'رقم الهاتف الجوال *' : 'NUMÉRO DE TÉLÉPHONE *'}
                          </label>
                          <TunisianPhoneInput
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="+216 XX XXX XXX"
                            className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/10 focus:bg-white dark:focus:bg-[#09172a] transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Relative Form (Pour un proche) */}
                    {beneficiaryType === 'relative' && (
                      <div className="bg-slate-50 dark:bg-[#071322] p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {isAr ? 'صلة القرابة' : 'Lien de parenté'}
                            </label>
                            <select
                              value={relativeRelation}
                              onChange={(e) => setRelativeRelation(e.target.value)}
                              className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                            >
                              <option value="ENFANT">{isAr ? 'طفل / ابن' : 'Enfant'}</option>
                              <option value="PARENT">{isAr ? 'أب / أم' : 'Parent (Père/Mère)'}</option>
                              <option value="CONJOINT">{isAr ? 'زوج / زوجة' : 'Conjoint(e)'}</option>
                              <option value="AUTRE">{isAr ? 'قريب آخر' : 'Autre proche'}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {isAr ? 'الاسم واللقب للقريب' : 'Nom & Prénom du proche'}
                            </label>
                            <input
                              type="text"
                              required
                              value={relativeName}
                              onChange={(e) => setRelativeName(e.target.value)}
                              placeholder="Ex. Yassine Ayari"
                              className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            {isAr ? 'رقم هاتف القريب' : 'Téléphone du proche (Optionnel)'}
                          </label>
                          <TunisianPhoneInput
                            value={relativePhone}
                            onChange={(e) => setRelativePhone(e.target.value)}
                            placeholder="+216 XX XXX XXX"
                            className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Consultation Type Buttons */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'طريقة الاستشارة' : 'MODE DE CONSULTATION'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConsultType('CABINET')}
                        className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          consultType === 'CABINET'
                            ? 'border-teal-400 bg-teal-50/60 dark:bg-teal-950/50 text-[#00A896] dark:text-teal-300 shadow-2xs font-extrabold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">🏢</span>
                        <span>{isAr ? 'في العيادة (حاضر)' : 'Au Cabinet (Présent)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultType('TELECONSULTATION')}
                        className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          consultType === 'TELECONSULTATION'
                            ? 'border-teal-400 bg-teal-50/60 dark:bg-teal-950/50 text-[#00A896] dark:text-teal-300 shadow-2xs font-extrabold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">📹</span>
                        <span>{isAr ? 'استشارة عن بعد' : 'Téléconsultation'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5. Motif / Acte médical */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {isAr ? 'الإجراء الطبي المزمع :' : 'ACTE MÉDICAL / MOTIF :'}
                    </label>
                    <select
                      value={newPatientAct}
                      onChange={(e) => setNewPatientAct(e.target.value)}
                      className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896]"
                    >
                      <option value="Consultation">{isAr ? 'فحص واستشارة عامة' : 'Consultation'}</option>
                      <option value="Consultation Cardiologie">{isAr ? 'فحص واستشارة أمراض القلب' : 'Consultation Cardiologie'}</option>
                      <option value="Consultation + ECG">{isAr ? 'استشارة + تخطيط القلب (ECG)' : 'Consultation + ECG'}</option>
                      <option value="Échocardiographie">{isAr ? 'تخطيط صدى القلب (Écho Doppler)' : 'Échocardiographie Doppler'}</option>
                      <option value="Contrôle Tensionnel">{isAr ? 'مراقبة ضغط الدم' : 'Contrôle Tensionnel'}</option>
                    </select>
                  </div>

                  {/* 6. CNAM Carnet Number */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isAr ? 'رقم بطاقة الكنام (اختياري)' : 'NUMÉRO DE CARNET CNAM (OPTIONNEL)'}
                    </label>
                    <input
                      type="text"
                      value={cnamCarnet}
                      onChange={(e) => setCnamCarnet(e.target.value)}
                      placeholder="Ex. 12345678"
                      className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-[#00A896] transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* 7. Patient Email with Instant Auto-Confirmation Badge */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {isAr ? 'البريد الإلكتروني (اختياري)' : 'ADRESSE E-MAIL (OPTIONNELLE)'}
                      </label>
                      <span className="bg-[#ecfdf5] dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span>✉️</span>
                        <span>{isAr ? 'إرسال آلي فوري' : 'ENVOI AUTOMATIQUE'}</span>
                      </span>
                    </div>
                    <input
                      type="email"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      placeholder="patient@exemple.com"
                      className="w-full bg-[#f8fafc] dark:bg-[#071322] border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#00A896] transition-all"
                    />
                  </div>

                  {/* 8. Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleClosePointageModal}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      {isAr ? 'إلغاء' : 'Annuler'}
                    </button>
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="flex-2 bg-[#00A896] hover:bg-[#008F80] active:scale-[0.99] text-white font-extrabold py-2.5 px-4 rounded-xl shadow-md text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {bookingSubmitting ? (
                        <span>{isAr ? 'جاري التسجيل...' : 'Enregistrement en cours...'}</span>
                      ) : (
                        <span>✓ {isAr ? 'تسجيل بقاعة الانتظار' : "ENREGISTRER EN SALLE D'ATTENTE"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* ════════ MODAL: BLOQUER CRÉNEAU ════════ */}
      {modalBlockOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-[#0c162d] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>{t('doc_modal_block_title', 'Bloquer une Plage Horaire')}</span>
              </h3>
              <button onClick={() => setModalBlockOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">{t('doc_modal_block_select', 'Sélectionnez la plage à bloquer :')}</p>
              <div className="grid grid-cols-3 gap-2">
                {['11:30', '12:00', '14:00', '14:30', '15:00', '17:00'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      handleBlockSlot(t);
                      setModalBlockOpen(false);
                    }}
                    className="p-2.5 rounded-xl font-bold bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-rose-300 cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
