import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  Printer,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  Search,
  Trash2,
  FileSpreadsheet,
  Layers,
  ArrowRightLeft,
  ChevronRight,
} from 'lucide-react';
import { AttendanceRecord, ClassGroup, Student, SchoolSettings } from '../types';
import { exportAttendanceToCSV } from '../utils/storage';
import {
  getMonthlyAttendanceData,
  exportMonthlyAttendanceToXLS,
  MonthlyAttendanceRow,
  StudentMonthlySummary,
} from '../utils/excelExport';
import { MonthlyExportModal } from './MonthlyExportModal';

interface AttendanceJournalProps {
  records: AttendanceRecord[];
  students: Student[];
  classes: ClassGroup[];
  settings: SchoolSettings;
  onOpenManualEntry: () => void;
  onDeleteRecord: (recordId: string) => void;
}

export const AttendanceJournal: React.FC<AttendanceJournalProps> = ({
  records,
  students,
  classes,
  settings,
  onOpenManualEntry,
  onDeleteRecord,
}) => {
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

  // Mode View: 'daily' (Log Harian) or 'monthly' (Rekap Bulanan)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly');

  // Daily Filters
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Monthly Filters
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [monthlyClassFilter, setMonthlyClassFilter] = useState<string>('all');
  const [monthlyStatusFilter, setMonthlyStatusFilter] = useState<string>('all');
  const [monthlySearchQuery, setMonthlySearchQuery] = useState<string>('');

  // Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Filter daily records
  const filteredDailyRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesDate = r.date === selectedDate;
      const matchesClass = selectedClass === 'all' || r.classId === selectedClass;
      const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        r.studentName.toLowerCase().includes(q) ||
        r.studentNis.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q));

      return matchesDate && matchesClass && matchesStatus && matchesQuery;
    });
  }, [records, selectedDate, selectedClass, selectedStatus, searchQuery]);

  // Aggregate daily metrics
  const classStudents = useMemo(() => {
    return students.filter((s) => selectedClass === 'all' || s.classId === selectedClass);
  }, [students, selectedClass]);

  const dateRecords = useMemo(() => {
    return records.filter(
      (r) => r.date === selectedDate && (selectedClass === 'all' || r.classId === selectedClass)
    );
  }, [records, selectedDate, selectedClass]);

  const onTimeCount = dateRecords.filter((r) => r.status === 'present').length;
  const lateCount = dateRecords.filter((r) => r.status === 'late').length;
  const sickPermitCount = dateRecords.filter(
    (r) => r.status === 'sick' || r.status === 'permit'
  ).length;
  const totalRecorded = onTimeCount + lateCount + sickPermitCount;
  const attendanceRate =
    classStudents.length > 0 ? Math.round((totalRecorded / classStudents.length) * 100) : 0;

  // Monthly Data Calculation
  const yearMonth = `${selectedYear}-${selectedMonth}`;
  const { rows: monthlyRawRows, summaries: monthlySummaries } = useMemo(() => {
    return getMonthlyAttendanceData(
      records,
      students,
      yearMonth,
      monthlyClassFilter,
      settings
    );
  }, [records, students, yearMonth, monthlyClassFilter, settings]);

  // Filter Monthly Rows by status & search
  const filteredMonthlyRows = useMemo(() => {
    return monthlyRawRows.filter((row) => {
      const matchesStatus =
        monthlyStatusFilter === 'all' ||
        (monthlyStatusFilter === 'onTime' && row.attendanceStatus.includes('Tepat Waktu')) ||
        (monthlyStatusFilter === 'late' && row.attendanceStatus.includes('Terlambat')) ||
        (monthlyStatusFilter === 'early' && row.attendanceStatus.includes('Pulang Cepat')) ||
        (monthlyStatusFilter === 'sick' && row.attendanceStatus.includes('Sakit')) ||
        (monthlyStatusFilter === 'permit' && row.attendanceStatus.includes('Izin')) ||
        (monthlyStatusFilter === 'absent' && row.attendanceStatus.includes('Alpa'));

      const q = monthlySearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        row.studentName.toLowerCase().includes(q) ||
        row.studentNis.toLowerCase().includes(q) ||
        row.note.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [monthlyRawRows, monthlyStatusFilter, monthlySearchQuery]);

  // Monthly Aggregate Totals
  const monthlyMetrics = useMemo(() => {
    let totalOnTime = 0;
    let totalLate = 0;
    let totalEarly = 0;
    let totalSick = 0;
    let totalPermit = 0;

    monthlySummaries.forEach((s) => {
      totalOnTime += s.onTimeCount;
      totalLate += s.lateCount;
      totalEarly += s.earlyLeaveCount;
      totalSick += s.sickCount;
      totalPermit += s.permitCount;
    });

    const totalAttendanceInstances = totalOnTime + totalLate + totalEarly;
    const avgRate =
      monthlySummaries.length > 0
        ? Math.round(
            monthlySummaries.reduce((acc, curr) => acc + curr.attendanceRate, 0) /
              monthlySummaries.length
          )
        : 100;

    return {
      totalOnTime,
      totalLate,
      totalEarly,
      totalSickPermit: totalSick + totalPermit,
      totalAttendanceInstances,
      avgRate,
    };
  }, [monthlySummaries]);

  const handlePrint = () => {
    window.print();
  };

  const handleQuickDownloadXLS = () => {
    exportMonthlyAttendanceToXLS(
      records,
      students,
      yearMonth,
      monthlyClassFilter,
      settings
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Rekap & Jurnal Presensi Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan kehadiran harian, keterlambatan, jam pulang/pergi, dan ekspor .xls resmi
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Export .XLS Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            title="Export Rekap Bulanan ke format Microsoft Excel (.xls)"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Rekap Bulanan (.xls)
          </button>

          <button
            onClick={() => exportAttendanceToCSV(filteredDailyRecords, settings.schoolName)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            CSV Harian
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Cetak
          </button>

          <button
            onClick={onOpenManualEntry}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Input Manual
          </button>
        </div>
      </div>

      {/* View Switcher: Rekap Bulanan (Pergi & Pulang) vs Jurnal Harian */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'monthly'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Rekap Bulanan (Jam Pergi & Pulang)</span>
          </button>

          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'daily'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Log Presensi Harian</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline font-medium">
          Format Tabel: <strong className="text-slate-800">Nama → NIS → Kelas → Jam Pergi → Jam Pulang → Keterangan</strong>
        </span>
      </div>

      {/* VIEW 1: REKAP BULANAN (JAM PERGI & PULANG) */}
      {viewMode === 'monthly' && (
        <div className="space-y-5">
          {/* Monthly Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
            {/* Month Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 w-full focus:outline-none cursor-pointer"
              >
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:outline-none"
            >
              <option value="2026">Tahun 2026</option>
              <option value="2025">Tahun 2025</option>
              <option value="2027">Tahun 2027</option>
            </select>

            {/* Class Filter */}
            <select
              value={monthlyClassFilter}
              onChange={(e) => setMonthlyClassFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Kelas ({students.length} Siswa)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={monthlyStatusFilter}
              onChange={(e) => setMonthlyStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Keterangan Kehadiran</option>
              <option value="onTime">Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="early">Pulang Cepat</option>
              <option value="sick">Sakit</option>
              <option value="permit">Izin</option>
              <option value="absent">Alpa</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={monthlySearchQuery}
                onChange={(e) => setMonthlySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Monthly Stat Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Tepat Waktu</span>
              <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-0.5 block">
                {monthlyMetrics.totalOnTime}
              </span>
              <span className="text-[11px] text-emerald-600/80 block mt-0.5">
                Masuk &le; {settings.timeCheckInDeadline} WIB
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Terlambat</span>
              <span className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-0.5 block">
                {monthlyMetrics.totalLate}
              </span>
              <span className="text-[11px] text-amber-600/80 block mt-0.5">
                Masuk &gt; {settings.timeCheckInDeadline} WIB
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Pulang Cepat</span>
              <span className="text-2xl font-bold text-orange-600 font-mono tabular-nums mt-0.5 block">
                {monthlyMetrics.totalEarly}
              </span>
              <span className="text-[11px] text-orange-600/80 block mt-0.5">
                Pulang &lt; {settings.timeCheckOutStart} WIB
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Sakit & Izin</span>
              <span className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-0.5 block">
                {monthlyMetrics.totalSickPermit}
              </span>
              <span className="text-[11px] text-blue-600/80 block mt-0.5">
                Keterangan resmi
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 block">Rata-Rata Kehadiran</span>
              <span className="text-2xl font-bold text-indigo-600 font-mono tabular-nums mt-0.5 block">
                {monthlyMetrics.avgRate}%
              </span>
              <span className="text-[11px] text-indigo-600/80 block mt-0.5">
                {monthlySummaries.length} Siswa Terdata
              </span>
            </div>
          </div>

          {/* MAIN MONTHLY TABLE WITH EXACT REQUESTED COLUMN ORDER:
              NAMA -> NIS -> KELAS -> JAM ABSEN PERGI -> JAM ABSEN PULANG -> KETERANGAN KEHADIRAN */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Rincian Presensi Harian Siswa Bulanan (Format Baku)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kolom terstruktur urut: Nama &rarr; NIS &rarr; Kelas &rarr; Jam Pergi &rarr; Jam Pulang &rarr; Keterangan Kehadiran
                </p>
              </div>

              <button
                onClick={handleQuickDownloadXLS}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh File .xls
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5 text-center w-12">No</th>
                    <th className="py-3 px-4 min-w-[200px]">Nama Siswa</th>
                    <th className="py-3 px-3.5 text-center">NIS</th>
                    <th className="py-3 px-3.5 text-center">Kelas</th>
                    <th className="py-3 px-3.5 text-center">Tanggal</th>
                    <th className="py-3 px-4 text-center bg-indigo-50/50 text-indigo-900">
                      Jam Absen Pergi (Masuk)
                    </th>
                    <th className="py-3 px-4 text-center bg-emerald-50/50 text-emerald-900">
                      Jam Absen Pulang
                    </th>
                    <th className="py-3 px-4 text-center">Keterangan Kehadiran</th>
                    <th className="py-3 px-4">Catatan / Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMonthlyRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">
                          Tidak ada catatan presensi pada periode bulan yang dipilih.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ubah filter bulan atau lakukan pemindaian presensi siswa terlebih dahulu.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredMonthlyRows.map((row, idx) => {
                      return (
                        <tr key={`${row.studentNis}-${row.date}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-xs">
                            {idx + 1}
                          </td>

                          {/* 1. Nama Siswa */}
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {row.studentName}
                          </td>

                          {/* 2. NIS */}
                          <td className="py-3 px-3.5 text-center font-mono tabular-nums text-slate-700 font-semibold">
                            {row.studentNis}
                          </td>

                          {/* 3. Kelas */}
                          <td className="py-3 px-3.5 text-center font-semibold text-indigo-700">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                              {row.studentClass}
                            </span>
                          </td>

                          {/* Tanggal */}
                          <td className="py-3 px-3.5 text-center font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            {row.date}
                            <span className="text-[10px] text-slate-400 block">
                              {row.dayName}
                            </span>
                          </td>

                          {/* 4. Jam Absen Pergi (Masuk) */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-indigo-900 bg-indigo-50/20">
                            {row.timeIn !== '-' ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-100/70 text-indigo-800">
                                {row.timeIn} WIB
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* 5. Jam Absen Pulang */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-900 bg-emerald-50/20">
                            {row.timeOut !== '-' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800">
                                {row.timeOut} WIB
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal italic text-[11px]">
                                Belum Pulang
                              </span>
                            )}
                          </td>

                          {/* 6. Keterangan Kehadiran */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                                row.attendanceStatus.includes('Tepat Waktu')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : row.attendanceStatus.includes('Terlambat & Pulang Cepat')
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : row.attendanceStatus.includes('Terlambat')
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : row.attendanceStatus.includes('Pulang Cepat')
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                  : row.attendanceStatus.includes('Sakit')
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : row.attendanceStatus.includes('Izin')
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {row.attendanceStatus}
                            </span>
                          </td>

                          {/* Catatan */}
                          <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[220px] truncate">
                            {row.note || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {filteredMonthlyRows.length} entri presensi bulanan</span>
              <span>
                SMA Negeri 1 Kerjo &bull; Jam Masuk: {settings.timeCheckInDeadline} &bull; Jam Pulang: {settings.timeCheckOutStart}
              </span>
            </div>
          </div>

          {/* TABLE 2: REKAPITULASI TOTAL KEHADIRAN PER SISWA */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Rekapitulasi Akumulasi Total Kehadiran per Siswa
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-4 min-w-[180px]">Nama Siswa</th>
                    <th className="py-2.5 px-3 text-center">NIS</th>
                    <th className="py-2.5 px-3 text-center">Kelas</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Tepat Waktu</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Terlambat</th>
                    <th className="py-2.5 px-3 text-center text-orange-700">Pulang Cepat</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">Sakit</th>
                    <th className="py-2.5 px-3 text-center text-purple-700">Izin</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">Alpa</th>
                    <th className="py-2.5 px-3 text-center font-bold">Total Hadir</th>
                    <th className="py-2.5 px-3 text-center font-bold text-indigo-700">% Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlySummaries.map((s, idx) => (
                    <tr key={s.studentId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{s.studentName}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{s.studentNis}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{s.studentClass}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{s.onTimeCount}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">{s.lateCount}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-orange-600">{s.earlyLeaveCount}</td>
                      <td className="py-2.5 px-3 text-center text-blue-600">{s.sickCount}</td>
                      <td className="py-2.5 px-3 text-center text-purple-600">{s.permitCount}</td>
                      <td className="py-2.5 px-3 text-center text-rose-600">{s.absentCount}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{s.totalPresent}</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-indigo-700 bg-indigo-50/50">
                        {s.attendanceRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LOG HARIAN */}
      {viewMode === 'daily' && (
        <div className="space-y-5">
          {/* Date & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 w-full focus:outline-none"
              />
            </div>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Kelas ({students.length} Siswa)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="sick">Sakit</option>
              <option value="permit">Izin</option>
              <option value="absent">Alpa</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Date Stat Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Siswa</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5 block">
                {classStudents.length}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Basis data</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Tepat Waktu</span>
              <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-0.5 block">
                {onTimeCount}
              </span>
              <span className="text-[11px] text-emerald-600/80 block mt-0.5">
                Sebelum {settings.timeCheckInDeadline}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Terlambat</span>
              <span className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-0.5 block">
                {lateCount}
              </span>
              <span className="text-[11px] text-amber-600/80 block mt-0.5">
                Setelah {settings.timeCheckInDeadline}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Sakit / Izin</span>
              <span className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-0.5 block">
                {sickPermitCount}
              </span>
              <span className="text-[11px] text-blue-600/80 block mt-0.5">
                Keterangan surat
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 col-span-2 md:col-span-1">
              <span className="text-xs text-slate-500 block">Tingkat Kehadiran</span>
              <span className="text-2xl font-bold text-indigo-600 font-mono tabular-nums mt-0.5 block">
                {attendanceRate}%
              </span>
              <span className="text-[11px] text-indigo-600/80 block mt-0.5">
                {totalRecorded} dari {classStudents.length} siswa
              </span>
            </div>
          </div>

          {/* Daily Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Waktu Presensi</th>
                    <th className="py-3 px-4">Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">
                          Tidak ada catatan presensi pada tanggal {selectedDate}.
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Gunakan pemindai wajah atau klik tombol "Input Presensi Manual".
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredDailyRecords.map((record) => {
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                            <strong className="text-slate-900 block">{record.time} WIB</strong>
                            <span className="text-[11px] text-slate-400">{record.date}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {record.capturedPhoto ? (
                                <img
                                  src={record.capturedPhoto}
                                  alt={record.studentName}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                                  {record.studentName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900 text-xs">
                                  {record.studentName}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono">
                                  NIS: {record.studentNis}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">{record.classId}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                record.mode === 'in'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {record.mode === 'in' ? 'Masuk' : 'Pulang'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                                record.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : record.status === 'late'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : record.status === 'sick'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : record.status === 'permit'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {record.status === 'present'
                                ? 'Tepat Waktu'
                                : record.status === 'late'
                                ? 'Terlambat'
                                : record.status === 'sick'
                                ? 'Sakit'
                                : record.status === 'permit'
                                ? 'Izin'
                                : 'Alpa'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-700 font-medium block">
                              {record.verificationMethod === 'face'
                                ? 'Face Recognition'
                                : record.verificationMethod === 'qr'
                                ? 'Kartu Pelajar (QR)'
                                : 'Manual / Guru'}
                            </span>
                            {record.confidenceScore && (
                              <span className="text-[11px] text-emerald-600 font-mono">
                                Akurasi: {record.confidenceScore}%
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                            {record.note || '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => onDeleteRecord(record.id)}
                              title="Hapus Catatan"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {filteredDailyRecords.length} catatan kehadiran</span>
              <span>{settings.schoolName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Export Dialog Modal */}
      <MonthlyExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        classes={classes}
        records={records}
        settings={settings}
      />
    </div>
  );
};
