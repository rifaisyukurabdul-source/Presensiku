import React, { useState } from 'react';
import { X, CheckCircle2, UserCheck, Calendar, Clock } from 'lucide-react';
import { Student, AttendanceRecord, AttendanceMode, AttendanceStatus } from '../types';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (record: AttendanceRecord) => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  students,
  onSave,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(currentTimeStr);
  const [mode, setMode] = useState<AttendanceMode>('in');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [note, setNote] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const newRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}`,
      studentId: student.id,
      studentNis: student.nis,
      studentNisn: student.nisn,
      studentName: student.name,
      classId: student.classId,
      date,
      time,
      mode,
      status,
      verificationMethod: 'manual',
      capturedPhoto: student.photoUrl,
      note: note || (status === 'sick' ? 'Keterangan Sakit' : status === 'permit' ? 'Surat Izin Orang Tua' : 'Presensi Manual oleh Guru'),
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Input Presensi Manual
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencatatan kehadiran untuk siswa sakit, izin, atau tanpa pemindai wajah
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Siswa *
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.classId}) - NIS: {s.nis}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Waktu (Jam:Menit:Detik) *
              </label>
              <input
                type="time"
                step="1"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mode Presensi
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AttendanceMode)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="in">Absen Masuk</option>
                <option value="out">Absen Pulang</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Kehadiran *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-800"
              >
                <option value="present">Hadir Tepat Waktu</option>
                <option value="late">Terlambat</option>
                <option value="sick">Sakit (Surat Dokter)</option>
                <option value="permit">Izin Resmi</option>
                <option value="absent">Alpa / Tanpa Keterangan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Catatan Tambahan
            </label>
            <input
              type="text"
              placeholder="Contoh: Dispensasi lomba olimpiade sains / Sakit demam berdarah"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
              Simpan Presensi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
