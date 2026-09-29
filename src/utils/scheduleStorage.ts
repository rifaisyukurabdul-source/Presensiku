import { DailyScheduleSetting, MonthlyScheduleMap } from '../types';

const SCHEDULE_STORAGE_PREFIX = 'presensiku_monthly_schedule_';

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Returns number of days in a given year and month (1-indexed month)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generates default monthly schedule according to school requirements:
 * 1. Absen Masuk: 06:00 - 10:00 (sebelum 07:01 Tepat Waktu, >= 07:01 Terlambat)
 * 2. Absen Pulang: 10:01 - 17:00 (Senin-Kamis < 15:00 Pulang Cepat, Jumat < 14:00 Pulang Cepat)
 * 3. Sabtu & Minggu: Otomatis tersetting OFF (Libur), tetapi bisa dirubah.
 */
export function generateDefaultMonthlySchedule(yearMonth: string): MonthlyScheduleMap {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = getDaysInMonth(year, month);

  const scheduleMap: MonthlyScheduleMap = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dayPad = String(d).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayPad}`;
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
    const dayName = INDO_DAYS[dayOfWeek];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sabtu / Minggu
    const isFriday = dayOfWeek === 5; // Jumat

    scheduleMap[dateStr] = {
      date: dateStr,
      dayOfWeek,
      dayName,
      // Sabtu & Minggu otomatis OFF (Libur), Senin-Jumat otomatis Aktif
      isActive: !isWeekend,
      note: isWeekend
        ? 'Libur Akhir Pekan (Sabtu/Minggu)'
        : isFriday
        ? 'Hari Sekolah (Jumat - Pulang 14:00)'
        : 'Hari Sekolah Reguler',

      // Ketentuan 1: Absen Masuk 06:00 - 10:00 (< 07:01 Tepat Waktu, >= 07:01 Terlambat)
      checkInStart: '06:00',
      checkInDeadline: '07:01',
      checkInEnd: '10:00',

      // Ketentuan 2: Absen Pulang 10:01 - 17:00
      // Senin-Kamis: < 15:00 Pulang Cepat, >= 15:00 Pulang Tepat Waktu
      // Jumat: < 14:00 Pulang Cepat, >= 14:00 Pulang Tepat Waktu
      checkOutStart: '10:01',
      checkOutOnTimeStart: isFriday ? '14:00' : '15:00',
      checkOutEnd: '17:00',
    };
  }

  return scheduleMap;
}

/**
 * Loads monthly schedule from localStorage or creates default if not set.
 */
export function getMonthlySchedule(yearMonth: string): MonthlyScheduleMap {
  try {
    const key = `${SCHEDULE_STORAGE_PREFIX}${yearMonth}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load monthly schedule:', err);
  }

  // Generate and save default
  const defaultSchedule = generateDefaultMonthlySchedule(yearMonth);
  saveMonthlySchedule(yearMonth, defaultSchedule);
  return defaultSchedule;
}

/**
 * Saves monthly schedule to localStorage.
 */
export function saveMonthlySchedule(yearMonth: string, scheduleMap: MonthlyScheduleMap): void {
  try {
    const key = `${SCHEDULE_STORAGE_PREFIX}${yearMonth}`;
    localStorage.setItem(key, JSON.stringify(scheduleMap));
  } catch (err) {
    console.error('Failed to save monthly schedule:', err);
  }
}

/**
 * Gets the schedule for a specific date (defaults to today).
 */
export function getDaySchedule(dateStr?: string): DailyScheduleSetting {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const yearMonth = targetDate.slice(0, 7);
  const monthly = getMonthlySchedule(yearMonth);

  if (monthly[targetDate]) {
    return monthly[targetDate];
  }

  // Fallback to on-the-fly calculation
  const d = new Date(targetDate + 'T00:00:00');
  const dayOfWeek = d.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;

  return {
    date: targetDate,
    dayOfWeek,
    dayName: INDO_DAYS[dayOfWeek],
    isActive: !isWeekend,
    note: isWeekend ? 'Libur Akhir Pekan' : 'Hari Sekolah',
    checkInStart: '06:00',
    checkInDeadline: '07:01',
    checkInEnd: '10:00',
    checkOutStart: '10:01',
    checkOutOnTimeStart: isFriday ? '14:00' : '15:00',
    checkOutEnd: '17:00',
  };
}

/**
 * Helper to convert "HH:mm" or "HH:mm:ss" into total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 60 + m + (s > 0 ? s / 60 : 0);
}

/**
 * Automatically determines whether current time is Mode Masuk or Mode Pulang:
 * - 06:00 s/d 10:00 -> 'in' (Absen Masuk)
 * - 10:01 s/d 17:00 -> 'out' (Absen Pulang)
 * - Before 06:00 -> 'in'
 * - After 17:00 -> 'out'
 */
export function determineAutomaticAttendanceMode(
  timeStr: string,
  schedule: DailyScheduleSetting
): 'in' | 'out' {
  const currentMins = timeToMinutes(timeStr);
  const checkInEndMins = timeToMinutes(schedule.checkInEnd || '10:00');
  const checkOutStartMins = timeToMinutes(schedule.checkOutStart || '10:01');

  // If before checkOutStart (e.g. <= 10:00), mode is 'in' (Masuk)
  if (currentMins < checkOutStartMins) {
    return 'in';
  }
  // Otherwise mode is 'out' (Pulang)
  return 'out';
}

/**
 * Evaluates attendance status and note based on strict rules:
 * 1. Mode Masuk (06:00 - 10:00):
 *    - Sebelum 07:01 (< 07:01) => Tepat Waktu
 *    - Sama dengan atau lebih dari 07:01 (>= 07:01) => Terlambat
 * 2. Mode Pulang (10:01 - 17:00):
 *    - Senin-Kamis: < 15:00 => Pulang Cepat, >= 15:00 => Pulang Tepat Waktu
 *    - Jumat: < 14:00 => Pulang Cepat, >= 14:00 => Pulang Tepat Waktu
 */
export function evaluateAttendance(
  mode: 'in' | 'out',
  timeStr: string,
  schedule: DailyScheduleSetting
): {
  status: 'present' | 'late';
  isEarlyLeave: boolean;
  statusLabel: string;
  note: string;
} {
  const currentMins = timeToMinutes(timeStr);

  if (mode === 'in') {
    const deadlineMins = timeToMinutes(schedule.checkInDeadline || '07:01');
    const isLate = currentMins >= deadlineMins;

    if (isLate) {
      return {
        status: 'late',
        isEarlyLeave: false,
        statusLabel: 'Terlambat',
        note: `Terlambat (${timeStr} WIB >= batas ${schedule.checkInDeadline})`,
      };
    } else {
      return {
        status: 'present',
        isEarlyLeave: false,
        statusLabel: 'Tepat Waktu',
        note: `Hadir Tepat Waktu (${timeStr} WIB < batas ${schedule.checkInDeadline})`,
      };
    }
  } else {
    // Mode Pulang
    const onTimeMins = timeToMinutes(schedule.checkOutOnTimeStart);
    const isEarlyLeave = currentMins < onTimeMins;

    if (isEarlyLeave) {
      return {
        status: 'present',
        isEarlyLeave: true,
        statusLabel: 'Pulang Cepat',
        note: `Pulang Cepat (${timeStr} WIB < jadwal pulang ${schedule.dayName} ${schedule.checkOutOnTimeStart})`,
      };
    } else {
      return {
        status: 'present',
        isEarlyLeave: false,
        statusLabel: 'Pulang Tepat Waktu',
        note: `Pulang Tepat Waktu (${timeStr} WIB >= jadwal ${schedule.checkOutOnTimeStart})`,
      };
    }
  }
}
