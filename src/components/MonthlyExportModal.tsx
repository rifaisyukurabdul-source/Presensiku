import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Student, ClassGroup, AttendanceRecord, SchoolSettings } from '../types';
import { exportMonthlyAttendanceToXLS, getMonthlyAttendanceData } from '../utils/excelExport';

interface MonthlyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassGroup[];
  records: AttendanceRecord[];
  settings: SchoolSettings;
}

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export const MonthlyExportModal: React.FC<MonthlyExportModalProps> = ({
  isOpen,
  onClose,
  students,
  classes,
  records,
  settings,
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const yearMonth = `${selectedYear}-${selectedMonth}`;

  // Live preview calculation
  const { rows, summaries } = useMemo(() => {
    return getMonthlyAttendanceData(records, students, yearMonth, selectedClass, settings);
  }, [records, students, yearMonth, selectedClass, settings]);

  if (!isOpen) return null;

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  const handleExport = () => {
    exportMonthlyAttendanceToXLS(records, students, yearMonth, selectedClass, settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Modal Header with Excel Branding */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-emerald-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Export Rekap Presensi Bulanan (.xls)
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Format tabel resmi Microsoft Excel sesuai urutan data siswa & jam pergi/pulang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Format Spec Highlight */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>Struktur Kolom Tabel Ekspor (Urut dari Kiri):</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded">
                1. Nama Siswa
              </span>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded">
                2. NIS
              </span>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded">
                3. Kelas
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded">
                4. Jam Absen Pergi (Masuk)
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded">
                5. Jam Absen Pulang
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded">
                6. Keterangan Kehadiran
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Mencakup status: <strong>Tepat Waktu</strong>, <strong>Terlambat</strong>,{' '}
              <strong>Pulang Cepat</strong>, <strong>Sakit</strong>, <strong>Izin</strong>, dan{' '}
              <strong>Alpa</strong>, serta lembar rekapitulasi total kehadiran bulanan per siswa.
            </p>
          </div>

          {/* Month & Year Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Periode Bulan *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-800"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tahun Pelajaran *
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-800"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Rombel / Kelas
            </label>
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-800"
              >
                <option value="all">Semua Kelas ({students.length} Siswa)</option>
                {classes.map((c) => {
                  const count = students.filter((s) => s.classId === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({count} Siswa)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Quick Metrics of Available Data */}
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
            <div>
              <span className="text-[10px] text-emerald-800/80 font-medium block">
                Total Siswa
              </span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {summaries.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800/80 font-medium block">
                Baris Rincian Harian
              </span>
              <span className="text-base font-bold text-emerald-700 font-mono">
                {rows.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800/80 font-medium block">
                Sekolah
              </span>
              <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                {settings.schoolName}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Ekstensi: <span className="font-mono font-bold text-slate-700">.xls</span> (Microsoft Excel)
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download File .xls ({monthLabel} {selectedYear})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
