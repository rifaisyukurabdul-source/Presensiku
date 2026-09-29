import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { DailyScheduleSetting, MonthlyScheduleMap, SchoolSettings } from '../types';
import {
  getMonthlySchedule,
  saveMonthlySchedule,
  generateDefaultMonthlySchedule,
  getDaysInMonth,
} from '../utils/scheduleStorage';

interface MonthlyScheduleSettingsProps {
  settings: SchoolSettings;
  onScheduleUpdated?: () => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MonthlyScheduleSettings: React.FC<MonthlyScheduleSettingsProps> = ({
  settings,
  onScheduleUpdated,
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const [scheduleMap, setScheduleMap] = useState<MonthlyScheduleMap>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'active' | 'off'>('all');

  // Load schedule whenever yearMonth changes
  useEffect(() => {
    const loaded = getMonthlySchedule(yearMonth);
    setScheduleMap(loaded);
  }, [yearMonth]);

  const daysList: DailyScheduleSetting[] = useMemo(() => {
    return Object.values(scheduleMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [scheduleMap]);

  const filteredDays = useMemo(() => {
    if (activeTabFilter === 'active') {
      return daysList.filter((d) => d.isActive);
    }
    if (activeTabFilter === 'off') {
      return daysList.filter((d) => !d.isActive);
    }
    return daysList;
  }, [daysList, activeTabFilter]);

  // Aggregate stats
  const activeDaysCount = daysList.filter((d) => d.isActive).length;
  const offDaysCount = daysList.filter((d) => !d.isActive).length;

  const handleDayChange = (
    dateStr: string,
    field: keyof DailyScheduleSetting,
    value: string | boolean | number
  ) => {
    setScheduleMap((prev) => {
      const existing = prev[dateStr];
      if (!existing) return prev;
      return {
        ...prev,
        [dateStr]: {
          ...existing,
          [field]: value,
        },
      };
    });
    setSaveSuccess(false);
  };

  const handleToggleDayActive = (dateStr: string) => {
    const existing = scheduleMap[dateStr];
    if (!existing) return;
    const nextActive = !existing.isActive;
    let nextNote = existing.note;
    if (!nextActive && (existing.dayOfWeek === 0 || existing.dayOfWeek === 6)) {
      nextNote = 'Libur Akhir Pekan (Sabtu/Minggu)';
    } else if (nextActive && (existing.dayOfWeek === 0 || existing.dayOfWeek === 6)) {
      nextNote = 'Kegiatan Khusus / Ekstrakurikuler';
    } else if (!nextActive) {
      nextNote = 'Libur / Tidak Ada KBM';
    } else {
      nextNote = existing.dayOfWeek === 5 ? 'Hari Sekolah (Jumat)' : 'Hari Sekolah Reguler';
    }

    setScheduleMap((prev) => ({
      ...prev,
      [dateStr]: {
        ...existing,
        isActive: nextActive,
        note: nextNote,
      },
    }));
    setSaveSuccess(false);
  };

  const handleSave = () => {
    saveMonthlySchedule(yearMonth, scheduleMap);
    setSaveSuccess(true);
    if (onScheduleUpdated) onScheduleUpdated();
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleResetToDefaultRules = () => {
    if (
      window.confirm(
        `Reset jadwal ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} ke ketentuan standar sekolah?\n` +
        `- Sabtu & Minggu: Otomatis OFF (Libur)\n` +
        `- Jam Masuk: 06:00 - 10:00 (Batas Tepat Waktu: 07:01)\n` +
        `- Jam Pulang: 10:01 - 17:00 (Senin-Kamis: 15:00, Jumat: 14:00)`
      )
    ) {
      const defaultMap = generateDefaultMonthlySchedule(yearMonth);
      setScheduleMap(defaultMap);
      saveMonthlySchedule(yearMonth, defaultMap);
      setSaveSuccess(true);
      if (onScheduleUpdated) onScheduleUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSetAllWeekendsOff = () => {
    setScheduleMap((prev) => {
      const updated: MonthlyScheduleMap = { ...prev };
      Object.keys(updated).forEach((dateStr) => {
        const item = updated[dateStr];
        if (item.dayOfWeek === 0 || item.dayOfWeek === 6) {
          item.isActive = false;
          item.note = 'Libur Akhir Pekan (Sabtu/Minggu)';
        }
      });
      return updated;
    });
    setSaveSuccess(false);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Pengaturan Jadwal Jam Presensi Bulanan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur jam absen masuk & pulang per hari dalam 1 bulan (Sabtu-Minggu default OFF / Libur)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefaultRules}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Reset Default
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Simpan Jadwal Bulan Ini
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Jadwal operasional presensi bulan <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> berhasil disimpan dan langsung aktif di mesin pemindai!
          </span>
        </div>
      )}

      {/* Rule Specifications Highlight Box */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Ketentuan Otomatis Presensi SMA Negeri 1 Kerjo</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {settings.schoolName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Card 1: Absen Masuk */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              1. Absen Masuk (06.00 - 10.00)
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              &bull; <strong className="text-emerald-400">Sebelum 07:01</strong>: Tepat Waktu<br />
              &bull; <strong className="text-amber-400">&ge; 07:01</strong>: Terlambat
            </p>
          </div>

          {/* Card 2: Absen Pulang */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              2. Absen Pulang (10.01 - 17.00)
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              &bull; <strong>Senin s.d Kamis</strong>: &lt; 15:00 Pulang Cepat (&ge; 15:00 Tepat Waktu)<br />
              &bull; <strong>Jumat</strong>: &lt; 14:00 Pulang Cepat (&ge; 14:00 Tepat Waktu)
            </p>
          </div>

          {/* Card 3: Sabtu & Minggu */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
              <CalendarX className="w-3.5 h-3.5" />
              3. Hari Sabtu & Minggu
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              &bull; <strong>Otomatis OFF (Libur)</strong>.<br />
              &bull; Tetap <strong>dapat diaktifkan</strong> jika ada upacara, ekskul, atau kegiatan khusus.
            </p>
          </div>
        </div>
      </div>

      {/* Month Selector Bar & Quick Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month & Year Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="text-xs text-slate-500 font-medium ml-2">
            Total {daysList.length} Hari
          </span>
        </div>

        {/* Filters and Stats */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTabFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({daysList.length})
            </button>
            <button
              onClick={() => setActiveTabFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTabFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Aktif ({activeDaysCount})
            </button>
            <button
              onClick={() => setActiveTabFilter('off')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTabFilter === 'off'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              OFF / Libur ({offDaysCount})
            </button>
          </div>

          <button
            onClick={handleSetAllWeekendsOff}
            className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
            title="Pastikan semua Sabtu & Minggu berstatus OFF / Libur"
          >
            Set Weekend OFF
          </button>
        </div>
      </div>

      {/* Main Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[140px]">Tanggal & Hari</th>
                <th className="py-3 px-4 min-w-[150px] text-center">Status Hari Sekolah</th>
                <th className="py-3 px-4 bg-indigo-50/50 text-indigo-900 text-center">
                  Absen Masuk (Mulai & Batas 07:01)
                </th>
                <th className="py-3 px-4 bg-emerald-50/50 text-emerald-900 text-center">
                  Absen Pulang (Batas Tepat Waktu)
                </th>
                <th className="py-3 px-4 min-w-[180px]">Keterangan / Agenda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDays.map((day, idx) => {
                const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                const isFriday = day.dayOfWeek === 5;

                return (
                  <tr
                    key={day.date}
                    className={`transition-colors ${
                      !day.isActive
                        ? 'bg-rose-50/30 hover:bg-rose-50/60'
                        : isFriday
                        ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* No */}
                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Tanggal & Hari */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            day.isActive ? 'bg-emerald-500' : 'bg-rose-400'
                          }`}
                        />
                        <div>
                          <strong className="text-slate-900 block font-mono">
                            {day.date}
                          </strong>
                          <span
                            className={`text-[11px] font-semibold ${
                              isWeekend
                                ? 'text-rose-600'
                                : isFriday
                                ? 'text-emerald-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {day.dayName} {isWeekend && '(Akhir Pekan)'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Toggle Status Hari: AKTIF vs OFF */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleDayActive(day.date)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          day.isActive
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                        }`}
                      >
                        {day.isActive ? (
                          <>
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>AKTIF (Masuk)</span>
                          </>
                        ) : (
                          <>
                            <CalendarX className="w-3.5 h-3.5 text-rose-600" />
                            <span>OFF (Libur)</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Rentang Jam Masuk (06:00 - 10:00, Batas 07:01) */}
                    <td className="py-3 px-4 bg-indigo-50/20">
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <input
                          type="time"
                          disabled={!day.isActive}
                          value={day.checkInStart}
                          onChange={(e) =>
                            handleDayChange(day.date, 'checkInStart', e.target.value)
                          }
                          className="w-18 px-1.5 py-1 text-center font-mono font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 disabled:opacity-40"
                          title="Jam Mulai Presensi Masuk"
                        />
                        <span className="text-slate-400">s/d</span>
                        <div className="flex flex-col items-center">
                          <input
                            type="time"
                            disabled={!day.isActive}
                            value={day.checkInDeadline}
                            onChange={(e) =>
                              handleDayChange(day.date, 'checkInDeadline', e.target.value)
                            }
                            className="w-18 px-1.5 py-1 text-center font-mono font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg disabled:opacity-40"
                            title="Batas Tepat Waktu (sebelum jam ini tepat waktu, >= terlambat)"
                          />
                          <span className="text-[9px] text-amber-700 font-semibold mt-0.5">
                            Batas Tepat
                          </span>
                        </div>
                        <span className="text-slate-400">s/d</span>
                        <input
                          type="time"
                          disabled={!day.isActive}
                          value={day.checkInEnd}
                          onChange={(e) =>
                            handleDayChange(day.date, 'checkInEnd', e.target.value)
                          }
                          className="w-18 px-1.5 py-1 text-center font-mono font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 disabled:opacity-40"
                          title="Jam Akhir Presensi Masuk"
                        />
                      </div>
                    </td>

                    {/* Rentang Jam Pulang (10:01 - 17:00, Batas 15:00 / 14:00) */}
                    <td className="py-3 px-4 bg-emerald-50/20">
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <input
                          type="time"
                          disabled={!day.isActive}
                          value={day.checkOutStart}
                          onChange={(e) =>
                            handleDayChange(day.date, 'checkOutStart', e.target.value)
                          }
                          className="w-18 px-1.5 py-1 text-center font-mono font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 disabled:opacity-40"
                          title="Jam Mulai Presensi Pulang"
                        />
                        <span className="text-slate-400">s/d</span>
                        <div className="flex flex-col items-center">
                          <input
                            type="time"
                            disabled={!day.isActive}
                            value={day.checkOutOnTimeStart}
                            onChange={(e) =>
                              handleDayChange(day.date, 'checkOutOnTimeStart', e.target.value)
                            }
                            className={`w-18 px-1.5 py-1 text-center font-mono font-bold rounded-lg disabled:opacity-40 ${
                              isFriday
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            }`}
                            title="Batas Pulang Tepat Waktu (sebelum jam ini = Pulang Cepat)"
                          />
                          <span className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                            {isFriday ? 'Jumat 14:00' : 'Batas 15:00'}
                          </span>
                        </div>
                        <span className="text-slate-400">s/d</span>
                        <input
                          type="time"
                          disabled={!day.isActive}
                          value={day.checkOutEnd}
                          onChange={(e) =>
                            handleDayChange(day.date, 'checkOutEnd', e.target.value)
                          }
                          className="w-18 px-1.5 py-1 text-center font-mono font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 disabled:opacity-40"
                          title="Jam Akhir Presensi Pulang"
                        />
                      </div>
                    </td>

                    {/* Keterangan / Note */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={day.note || ''}
                        onChange={(e) =>
                          handleDayChange(day.date, 'note', e.target.value)
                        }
                        placeholder={day.isActive ? 'Hari Sekolah Reguler' : 'Libur'}
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white text-slate-700"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear} &bull; {activeDaysCount} Hari Aktif &bull; {offDaysCount} Hari Libur/OFF
          </span>
          <span className="font-medium text-slate-700">
            {settings.schoolName}
          </span>
        </div>
      </div>
    </div>
  );
};
