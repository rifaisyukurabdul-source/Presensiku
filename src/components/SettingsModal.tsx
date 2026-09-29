import React, { useState } from 'react';
import { X, Save, RotateCcw, Volume2, Sliders, School, Clock } from 'lucide-react';
import { SchoolSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolSettings;
  onSave: (newSettings: SchoolSettings) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onResetData,
}) => {
  const [formData, setFormData] = useState<SchoolSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin memuat ulang data default sekolah? Seluruh perubahan lokal akan dikembalikan ke setelan awal.'
      )
    ) {
      onResetData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <School className="w-5 h-5 text-indigo-600" />
              Pengaturan Sekolah & Mesin Face Recognition
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi jam operasional sekolah, ambang batas toleransi, dan audio
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* School Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Identitas Sekolah
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Sekolah *
              </label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NPSN Sekolah
                </label>
                <input
                  type="text"
                  value={formData.schoolNPSN}
                  onChange={(e) => setFormData({ ...formData, schoolNPSN: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Sekolah
              </label>
              <input
                type="text"
                value={formData.schoolAddress}
                onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Time & Attendance Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              Aturan Jam Presensi Otomatis & Toleransi Sekolah
            </h4>

            {/* Jam Masuk */}
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2">
              <span className="text-[11px] font-bold text-indigo-900 block">
                1. Rentang Absen Masuk (Otomatis 06:00 - 10:00)
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Mulai Masuk
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeCheckInStart || '06:00'}
                    onChange={(e) => setFormData({ ...formData, timeCheckInStart: e.target.value })}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 mb-1">
                    Batas Tepat (&lt; 07:01)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeCheckInDeadline || '07:01'}
                    onChange={(e) => setFormData({ ...formData, timeCheckInDeadline: e.target.value })}
                    className="w-full px-2 py-1 text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Batas Akhir Masuk
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeCheckInEnd || '10:00'}
                    onChange={(e) => setFormData({ ...formData, timeCheckInEnd: e.target.value })}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>
              <p className="text-[10px] text-indigo-700/80">
                Sebelum jam <strong>07:01 WIB</strong> tercatat <strong>Tepat Waktu</strong>. Pukul <strong>07:01 WIB ke atas</strong> tercatat <strong>Terlambat</strong>.
              </p>
            </div>

            {/* Jam Pulang */}
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2">
              <span className="text-[11px] font-bold text-emerald-900 block">
                2. Rentang Absen Pulang (Otomatis 10:01 - 17:00)
              </span>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Mulai Pulang
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeCheckOutStart || '10:01'}
                    onChange={(e) => setFormData({ ...formData, timeCheckOutStart: e.target.value })}
                    className="w-full px-1.5 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 mb-1">
                    Senin-Kamis (15:00)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeCheckOutOnTimeMonThu || '15:00'}
                    onChange={(e) => setFormData({ ...formData, timeCheckOutOnTimeMonThu: e.target.value })}
                    className="w-full px-1.5 py-1 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 mb-1">
                    Jumat (14:00)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeCheckOutOnTimeFri || '14:00'}
                    onChange={(e) => setFormData({ ...formData, timeCheckOutOnTimeFri: e.target.value })}
                    className="w-full px-1.5 py-1 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Akhir Pulang
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.timeCheckOutEnd || '17:00'}
                    onChange={(e) => setFormData({ ...formData, timeCheckOutEnd: e.target.value })}
                    className="w-full px-1.5 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>
              <p className="text-[10px] text-emerald-800/80">
                Sebelum jam <strong>15:00 WIB</strong> (Senin-Kamis) atau <strong>14:00 WIB</strong> (Jumat) tercatat <strong>Pulang Cepat</strong>.
              </p>
            </div>
          </div>

          {/* Biometric Sensitivity & Audio */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Sensitivitas Face Recognition & Audio
            </h4>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">
                  Ambang Batas Kecocokan Wajah (Threshold)
                </span>
                <span className="font-mono font-bold text-indigo-600">
                  {Math.round(formData.similarityThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.60"
                max="0.88"
                step="0.02"
                value={formData.similarityThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, similarityThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Rendah (60% - Cepat)</span>
                <span>Standar (72%)</span>
                <span>Tinggi (88% - Ketat)</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.voiceNotification}
                  onChange={(e) =>
                    setFormData({ ...formData, voiceNotification: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Notifikasi Suara Bahasa Indonesia (TTS)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Menyebut nama siswa secara otomatis saat wajah berhasil diverifikasi
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.soundChime}
                  onChange={(e) => setFormData({ ...formData, soundChime: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Efek Bunyi Chime Synthesizer
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Memutar nada konfirmasi audio Web Audio API saat presensi masuk
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Administrator Account Security */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-indigo-600 font-bold">🔐</span>
              Akun Keamanan Administrator
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username Admin
                </label>
                <input
                  type="text"
                  required
                  value={formData.adminUsername || 'admin'}
                  onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Admin
                </label>
                <input
                  type="text"
                  required
                  value={formData.adminPassword || 'admin123'}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Kredensial ini digunakan saat staf sekolah ingin mengakses menu Data Siswa, Rekap Presensi, dan Pengaturan.
            </p>
          </div>


          {/* Reset Factory Data */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke Data Awal Pabrik
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Setelan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
