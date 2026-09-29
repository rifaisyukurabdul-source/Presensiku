import React, { useState } from 'react';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SchoolSettings, AdminAuth } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AdminAuth) => void;
  settings: SchoolSettings;
  requestedActionName?: string; // e.g. "Data Siswa", "Rekap Presensi", "Pengaturan"
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  settings,
  requestedActionName,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  if (!isOpen) return null;

  const validUsername = settings.adminUsername || 'admin';
  const validPassword = settings.adminPassword || 'admin123';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      username.trim().toLowerCase() === validUsername.toLowerCase() &&
      password === validPassword
    ) {
      const session: AdminAuth = {
        isAuthenticated: true,
        adminName: 'Administrator Sekolah',
        adminUsername: username.trim(),
        loginTime: new Date().toLocaleTimeString('id-ID'),
      };
      onLoginSuccess(session);
      onClose();
    } else {
      setError('Username atau password administrator salah. Silakan coba lagi.');
    }
  };

  const handleQuickFill = () => {
    setUsername(validUsername);
    setPassword(validPassword);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Login Administrator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {requestedActionName
                  ? `Diperlukan hak akses untuk membuka ${requestedActionName}`
                  : 'Autentikasi staf & pengelola absensi sekolah'}
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

        {/* Info Note */}
        <div className="px-5 py-3 bg-amber-50/80 border-b border-amber-100 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Pemindaian wajah siswa di lobi/gerbang dapat digunakan <strong>tanpa login</strong>.
            Login ini khusus untuk mengelola data siswa, rekap presensi, dan setelan.
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Username Administrator
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Masukkan username (default: admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 rounded"
              />
              <span>Ingat sesi di perangkat ini</span>
            </label>

            {/* Quick Demo Credentials Fill Button */}
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Isi Default (admin)
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Masuk sebagai Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
