import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Download,
  IdCard,
  Trash2,
  Edit,
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Phone,
  User,
  GraduationCap,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { Student, ClassGroup, SchoolSettings } from '../types';
import { exportStudentsToCSV, DEFAULT_SETTINGS } from '../utils/storage';
import { downloadStudentImportTemplate } from '../utils/studentImport';
import { StudentImportModal } from './StudentImportModal';

interface StudentManagementProps {
  students: Student[];
  classes: ClassGroup[];
  settings?: SchoolSettings;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onPrintCard: (student: Student) => void;
  onEnrollFace: (student: Student) => void;
  onImportStudents?: (newStudents: Student[]) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  classes,
  settings,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onPrintCard,
  onEnrollFace,
  onImportStudents,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [faceFilter, setFaceFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filter students based on search, class, and biometric status
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q);

      const matchesClass = selectedClass === 'all' || s.classId === selectedClass;

      const hasFace = Boolean(s.faceDescriptor && s.faceDescriptor.length > 0);
      const matchesFace =
        faceFilter === 'all' ||
        (faceFilter === 'registered' && hasFace) ||
        (faceFilter === 'unregistered' && !hasFace);

      return matchesSearch && matchesClass && matchesFace;
    });
  }, [students, searchQuery, selectedClass, faceFilter]);

  const registeredFaceCount = students.filter(
    (s) => s.faceDescriptor && s.faceDescriptor.length > 0
  ).length;
  const unRegisteredFaceCount = students.length - registeredFaceCount;

  const schoolSettings: SchoolSettings = settings || DEFAULT_SETTINGS;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            Database & Biometrik Wajah Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data induk siswa, import massal .xls, rekaman biometrik kamera, dan pencetakan kartu pelajar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Template Button */}
          <button
            onClick={() => downloadStudentImportTemplate(classes, schoolSettings)}
            title="Download Template Import Siswa (.xls)"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Template .xls
          </button>

          {/* Import .XLS Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            title="Import Data Siswa dari File Excel (.xls / .xlsx)"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import Siswa (.xls)
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => exportStudentsToCSV(filteredStudents)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>

          {/* Add Single Student Button */}
          <button
            onClick={onAddStudent}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Manual
          </button>
        </div>
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium block">Total Siswa Aktif</span>
          <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
            {students.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Siswa terdaftar</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium block">Biometrik Wajah Terdaftar</span>
          <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1 block">
            {registeredFaceCount}
          </span>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">
            {Math.round((registeredFaceCount / (students.length || 1)) * 100)}% siap face recognition
          </span>
        </div>

        <div
          onClick={() => setFaceFilter('unregistered')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            faceFilter === 'unregistered'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium block flex items-center justify-between">
            <span>Belum Rekam Wajah</span>
            {unRegisteredFaceCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </span>
          <span className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1 block">
            {unRegisteredFaceCount}
          </span>
          <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">
            Wajib rekam 1 per 1 via kamera
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium block">Total Rombel / Kelas</span>
          <span className="text-2xl font-bold text-slate-800 font-mono tabular-nums mt-1 block">
            {classes.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Kelas aktif</span>
        </div>
      </div>

      {/* Prominent Banner if any student has pending face registration */}
      {unRegisteredFaceCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-amber-900 block sm:inline mr-1">
                Peringatan Rekam Biometrik ({unRegisteredFaceCount} Siswa):
              </span>
              <span>
                Siswa baru hasil import belum memiliki data biometrik wajah. Biometrik wajah <strong>tidak dapat diimpor</strong> dan wajib direkam langsung satu per satu di depan kamera agar dapat melakukan presensi otomatis.
              </span>
            </div>
          </div>

          <button
            onClick={() => setFaceFilter('unregistered')}
            className="px-3.5 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold rounded-xl shrink-0 transition-colors text-[11px]"
          >
            Filter Siswa Belum Rekam
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, NISN, atau orang tua..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Kelas ({students.length})</option>
            {classes.map((cls) => {
              const count = students.filter((s) => s.classId === cls.id).length;
              return (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({count})
                </option>
              );
            })}
          </select>

          <select
            value={faceFilter}
            onChange={(e) =>
              setFaceFilter(e.target.value as 'all' | 'registered' | 'unregistered')
            }
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Status Wajah: Semua</option>
            <option value="registered">Wajah Terdaftar ({registeredFaceCount})</option>
            <option value="unregistered">Belum Terdaftar ({unRegisteredFaceCount})</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Siswa</th>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 min-w-[210px]">Status Biometrik Wajah</th>
                <th className="py-3 px-4">Kontak Orang Tua</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Tidak ada data siswa yang cocok.</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Coba ganti filter atau import siswa melalui template Excel (.xls).
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const hasFace = Boolean(
                    student.faceDescriptor && student.faceDescriptor.length > 0
                  );
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{student.name}</p>
                            <span className="text-[11px] text-slate-500">
                              {student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* NIS / NISN */}
                      <td className="py-3.5 px-4 font-mono tabular-nums">
                        <p className="text-slate-900 font-semibold">{student.nis}</p>
                        <p className="text-[11px] text-slate-500">NISN: {student.nisn}</p>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                          {student.classId}
                        </span>
                      </td>

                      {/* Biometric Status & Direct Camera Action */}
                      <td className="py-3.5 px-4">
                        {hasFace ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Terdaftar (64-dim)</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              ⚠️ Belum Rekam Wajah
                            </span>
                            <button
                              onClick={() => onEnrollFace(student)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Rekam via Kamera &rarr;</span>
                            </button>
                            <span className="text-[9px] text-slate-400">
                              Wajib rekam 1 per 1 via kamera
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Parent & Phone */}
                      <td className="py-3.5 px-4">
                        <p className="text-slate-900 font-medium">{student.parentName || '-'}</p>
                        {student.phone ? (
                          <a
                            href={`https://wa.me/62${student.phone.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-mono mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPrintCard(student)}
                            title="Cetak Kartu Pelajar"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <IdCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEnrollFace(student)}
                            title={hasFace ? 'Rekam Ulang Wajah' : 'Rekam Wajah Siswa di Kamera'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              hasFace
                                ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                            }`}
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditStudent(student)}
                            title="Edit Data Siswa"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteStudent(student.id)}
                            title="Hapus Siswa"
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredStudents.length} dari {students.length} siswa</span>
          <span className="font-mono tabular-nums">{schoolSettings.schoolName}</span>
        </div>
      </div>

      {/* Student Import Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSaveImportedStudents={(newStudents) => {
          if (onImportStudents) {
            onImportStudents(newStudents);
          }
        }}
        classes={classes}
        existingStudents={students}
        settings={schoolSettings}
      />
    </div>
  );
};
