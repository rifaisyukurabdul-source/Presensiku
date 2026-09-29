import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ScannerKiosk } from './components/ScannerKiosk';
import { StudentManagement } from './components/StudentManagement';
import { AttendanceJournal } from './components/AttendanceJournal';
import { MonthlyScheduleSettings } from './components/MonthlyScheduleSettings';
import { StudentFormModal } from './components/StudentFormModal';
import { StudentCardModal } from './components/StudentCardModal';
import { ManualAttendanceModal } from './components/ManualAttendanceModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Student, ClassGroup, AttendanceRecord, SchoolSettings, AdminAuth } from './types';
import {
  getStudents,
  saveStudents,
  getClasses,
  getAttendanceRecords,
  addAttendanceRecord,
  saveAttendanceRecords,
  getSchoolSettings,
  saveSchoolSettings,
  resetToDefaults,
  initializeStudentDescriptors,
  getAdminSession,
  saveAdminSession,
  clearAdminSession,
} from './utils/storage';

export default function App() {
  // Always default to 'scanner' for public kiosk mode without requiring login!
  const [activeTab, setActiveTab] = useState<'scanner' | 'students' | 'journal' | 'schedule'>('scanner');
  
  // Admin Authentication State
  const [adminSession, setAdminSession] = useState<AdminAuth>(getAdminSession());
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [requestedActionName, setRequestedActionName] = useState<string>('Menu Administrator');
  const [pendingTargetTab, setPendingTargetTab] = useState<'students' | 'journal' | 'schedule' | 'settings' | null>(null);

  // App data state
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(getSchoolSettings());

  // Modal states
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardStudent, setCardStudent] = useState<Student | null>(null);

  const [isManualAttendanceOpen, setIsManualAttendanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load data on startup
  useEffect(() => {
    const loadedStudents = getStudents();
    const loadedClasses = getClasses();
    const loadedRecords = getAttendanceRecords();
    const loadedSettings = getSchoolSettings();
    const savedSession = getAdminSession();

    setStudents(loadedStudents);
    setClasses(loadedClasses);
    setAttendanceRecords(loadedRecords);
    setSettings(loadedSettings);
    setAdminSession(savedSession);

    // Compute face descriptors in background for seed students
    initializeStudentDescriptors(loadedStudents).then((updated) => {
      setStudents(updated);
    });
  }, []);

  // Admin login flow triggers
  const handleRequireLogin = (
    actionName: string,
    targetTab?: 'students' | 'journal' | 'schedule'
  ) => {
    setRequestedActionName(actionName);
    setPendingTargetTab(targetTab || (actionName.includes('Pengaturan') ? 'settings' : null));
    setIsAdminLoginOpen(true);
  };

  const handleLoginSuccess = (session: AdminAuth) => {
    setAdminSession(session);
    saveAdminSession(session);

    if (
      pendingTargetTab === 'students' ||
      pendingTargetTab === 'journal' ||
      pendingTargetTab === 'schedule'
    ) {
      setActiveTab(pendingTargetTab);
    } else if (pendingTargetTab === 'settings') {
      setIsSettingsOpen(true);
    }
    setPendingTargetTab(null);
  };

  const handleLogout = () => {
    clearAdminSession();
    setAdminSession({
      isAuthenticated: false,
      adminName: '',
      adminUsername: '',
    });
    // Return to public scanner kiosk mode immediately
    setActiveTab('scanner');
  };

  // Attendance Handlers
  const handleAddAttendance = (record: AttendanceRecord) => {
    addAttendanceRecord(record);
    setAttendanceRecords((prev) => [record, ...prev]);
  };

  const handleDeleteAttendance = (recordId: string) => {
    if (!adminSession.isAuthenticated) {
      handleRequireLogin('Hapus Catatan Presensi');
      return;
    }
    if (window.confirm('Hapus catatan presensi ini?')) {
      const updated = attendanceRecords.filter((r) => r.id !== recordId);
      saveAttendanceRecords(updated);
      setAttendanceRecords(updated);
    }
  };

  // Student Handlers
  const handleOpenAddStudent = () => {
    if (!adminSession.isAuthenticated) {
      handleRequireLogin('Tambah Siswa Baru', 'students');
      return;
    }
    setEditingStudent(null);
    setIsStudentFormOpen(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    if (!adminSession.isAuthenticated) {
      handleRequireLogin('Edit Data Siswa', 'students');
      return;
    }
    setEditingStudent(student);
    setIsStudentFormOpen(true);
  };

  const handleSaveStudent = (savedStudent: Student) => {
    let updated: Student[];
    const exists = students.some((s) => s.id === savedStudent.id);
    if (exists) {
      updated = students.map((s) => (s.id === savedStudent.id ? savedStudent : s));
    } else {
      updated = [savedStudent, ...students];
    }
    saveStudents(updated);
    setStudents(updated);
  };

  const handleImportStudents = (newStudents: Student[]) => {
    const updated = [...newStudents, ...students];
    saveStudents(updated);
    setStudents(updated);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (!adminSession.isAuthenticated) {
      handleRequireLogin('Hapus Siswa', 'students');
      return;
    }
    const student = students.find((s) => s.id === studentId);
    if (
      window.confirm(
        `Hapus siswa "${student?.name}" dari database? Data presensi yang telah dicatat tetap tersimpan.`
      )
    ) {
      const updated = students.filter((s) => s.id !== studentId);
      saveStudents(updated);
      setStudents(updated);
    }
  };

  const handlePrintCard = (student: Student) => {
    setCardStudent(student);
    setIsCardModalOpen(true);
  };

  const handleEnrollFace = (student: Student) => {
    if (!adminSession.isAuthenticated) {
      handleRequireLogin('Perekaman Wajah Siswa', 'students');
      return;
    }
    setEditingStudent(student);
    setIsStudentFormOpen(true);
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: SchoolSettings) => {
    saveSchoolSettings(newSettings);
    setSettings(newSettings);
  };

  const handleResetData = () => {
    resetToDefaults();
    setStudents(getStudents());
    setClasses(getClasses());
    setAttendanceRecords(getAttendanceRecords());
    setSettings(getSchoolSettings());
    setAdminSession(getAdminSession());
    setActiveTab('scanner');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Header with Administrator Authentication Integration */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        adminSession={adminSession}
        onRequireLogin={handleRequireLogin}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {/* Scanner Kiosk is public & open immediately without requiring login */}
        {activeTab === 'scanner' && (
          <ScannerKiosk
            students={students}
            attendanceRecords={attendanceRecords}
            onAddAttendance={handleAddAttendance}
            settings={settings}
          />
        )}

        {/* Data Siswa (Admin Only) */}
        {activeTab === 'students' && (
          <StudentManagement
            students={students}
            classes={classes}
            settings={settings}
            onAddStudent={handleOpenAddStudent}
            onEditStudent={handleOpenEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onPrintCard={handlePrintCard}
            onEnrollFace={handleEnrollFace}
            onImportStudents={handleImportStudents}
          />
        )}

        {/* Rekap Presensi (Admin Only) */}
        {activeTab === 'journal' && (
          <AttendanceJournal
            records={attendanceRecords}
            students={students}
            classes={classes}
            settings={settings}
            onOpenManualEntry={() => {
              if (!adminSession.isAuthenticated) {
                handleRequireLogin('Input Presensi Manual', 'journal');
                return;
              }
              setIsManualAttendanceOpen(true);
            }}
            onDeleteRecord={handleDeleteAttendance}
          />
        )}

        {/* Jadwal Jam Presensi Bulanan (Admin Only) */}
        {activeTab === 'schedule' && (
          <MonthlyScheduleSettings settings={settings} />
        )}
      </main>

      {/* Modals */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
          setPendingTargetTab(null);
        }}
        onLoginSuccess={handleLoginSuccess}
        settings={settings}
        requestedActionName={requestedActionName}
      />

      <StudentFormModal
        isOpen={isStudentFormOpen}
        onClose={() => setIsStudentFormOpen(false)}
        onSave={handleSaveStudent}
        classes={classes}
        studentToEdit={editingStudent}
      />

      <StudentCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        student={cardStudent}
        settings={settings}
      />

      <ManualAttendanceModal
        isOpen={isManualAttendanceOpen}
        onClose={() => setIsManualAttendanceOpen(false)}
        students={students}
        onSave={handleAddAttendance}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onResetData={handleResetData}
      />
    </div>
  );
}
