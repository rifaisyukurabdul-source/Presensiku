import React, { useState, useEffect } from 'react';
import {
  ScanFace,
  Users,
  ClipboardCheck,
  Settings,
  Lock,
  LogOut,
  ShieldCheck,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { SchoolSettings, AdminAuth } from '../types';

interface HeaderProps {
  activeTab: 'scanner' | 'students' | 'journal' | 'schedule';
  setActiveTab: (tab: 'scanner' | 'students' | 'journal' | 'schedule') => void;
  settings: SchoolSettings;
  adminSession: AdminAuth;
  onRequireLogin: (requestedAction: string, targetTab?: 'students' | 'journal' | 'schedule') => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  adminSession,
  onRequireLogin,
  onLogout,
  onOpenSettings,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTabClick = (tab: 'scanner' | 'students' | 'journal' | 'schedule') => {
    if (tab === 'scanner') {
      // Scanner kiosk is always accessible by students/anyone without login!
      setActiveTab('scanner');
      return;
    }

    if (adminSession.isAuthenticated) {
      setActiveTab(tab);
    } else {
      const label =
        tab === 'students'
          ? 'Menu Data Siswa'
          : tab === 'journal'
          ? 'Menu Rekap Presensi'
          : 'Menu Jadwal Jam Presensi Bulanan';
      onRequireLogin(label, tab);
    }
  };

  const handleSettingsClick = () => {
    if (adminSession.isAuthenticated) {
      onOpenSettings();
    } else {
      onRequireLogin('Pengaturan Sistem Presensi');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Brand Wordmark & School Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('scanner')}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm transition-colors shrink-0"
              title="Kiosk Pemindai Wajah"
            >
              <ScanFace className="w-6 h-6" />
            </button>
            <div className="text-left">
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                PresensiKu
              </span>
              <span className="text-xs text-slate-500 font-medium truncate max-w-[180px] sm:max-w-xs block">
                {settings.schoolName}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Tabs */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl">
            {/* Pemindai Wajah - Always public for students */}
            <button
              onClick={() => handleTabClick('scanner')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'scanner'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanFace className="w-4 h-4" />
              <span>Pemindai Wajah</span>
            </button>

            {/* Data Siswa - Protected */}
            <button
              onClick={() => handleTabClick('students')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'students'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Data Siswa</span>
              {!adminSession.isAuthenticated && (
                <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
              )}
            </button>

            {/* Rekap Presensi - Protected */}
            <button
              onClick={() => handleTabClick('journal')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'journal'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Rekap Presensi</span>
              {!adminSession.isAuthenticated && (
                <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
              )}
            </button>

            {/* Jadwal Jam Bulanan - Protected */}
            <button
              onClick={() => handleTabClick('schedule')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'schedule'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Jadwal Jam Bulanan</span>
              {!adminSession.isAuthenticated && (
                <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
              )}
            </button>
          </nav>

          {/* Zone 3: Clock, Admin Status & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[11px] text-slate-400 font-medium">
                {currentDate}
              </span>
              <span className="text-xs font-bold text-slate-800 font-mono tabular-nums leading-none mt-0.5">
                {currentTime} <span className="font-normal text-slate-500">WIB</span>
              </span>
            </div>

            {/* Administrator State Action */}
            {adminSession.isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-800 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold">{adminSession.adminUsername}</span>
                </div>

                <button
                  onClick={handleSettingsClick}
                  title="Pengaturan Presensi & Jam Sekolah"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  title="Keluar dari Akun Administrator"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200/70"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onRequireLogin('Menu Administrator')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                  <span>Login Admin</span>
                </button>

                <button
                  onClick={handleSettingsClick}
                  title="Pengaturan (Memerlukan Login Admin)"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
