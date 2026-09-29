import { Student, ClassGroup, AttendanceRecord, SchoolSettings, AdminAuth } from '../types';
import { extractDescriptorFromImageUrl } from './faceRecognition';

const STORAGE_KEYS = {
  STUDENTS: 'presensiku_students_v1',
  CLASSES: 'presensiku_classes_v1',
  ATTENDANCE: 'presensiku_attendance_v1',
  SETTINGS: 'presensiku_settings_v1',
  ADMIN_SESSION: 'presensiku_admin_session_v1',
};

// Initial Classes
export const DEFAULT_CLASSES: ClassGroup[] = [
  { id: 'X-MIPA-1', name: 'X MIPA 1', grade: '10', homeroomTeacher: 'Dra. Sri Wahyuni, M.Pd.' },
  { id: 'X-MIPA-2', name: 'X MIPA 2', grade: '10', homeroomTeacher: 'Bambang Sudarsono, S.Pd.' },
  { id: 'XI-MIPA-1', name: 'XI MIPA 1', grade: '11', homeroomTeacher: 'Nurul Hidayati, M.Si.' },
  { id: 'XI-IPS-1', name: 'XI IPS 1', grade: '11', homeroomTeacher: 'Agus Salim, S.Sos.' },
  { id: 'XII-MIPA-1', name: 'XII MIPA 1', grade: '12', homeroomTeacher: 'Dr. Hendra Gunawan, M.Pd.' },
];

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMA Negeri 1 Kerjo',
  schoolNPSN: '20312071',
  schoolAddress: 'Jl. Raya Kerjo - Karanganyar, Kec. Kerjo, Kab. Karanganyar, Jawa Tengah',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  timeCheckInStart: '06:00',
  timeCheckInDeadline: '07:01', // < 07:01 tepat waktu, >= 07:01 terlambat
  timeCheckInEnd: '10:00',
  timeCheckOutStart: '10:01',
  timeCheckOutOnTimeMonThu: '15:00', // Senin-Kamis < 15:00 pulang cepat
  timeCheckOutOnTimeFri: '14:00', // Jumat < 14:00 pulang cepat
  timeCheckOutEnd: '17:00',
  similarityThreshold: 0.72,
  voiceNotification: true,
  soundChime: true,
  adminUsername: 'admin',
  adminPassword: 'admin123',
};


// Realistic Seed Students
export const DEFAULT_STUDENTS: Student[] = [
  {
    id: 'std-001',
    nis: '20241001',
    nisn: '0078192831',
    name: 'Ahmad Fauzi Pratama',
    gender: 'L',
    classId: 'X-MIPA-1',
    photoUrl: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
    phone: '081234567891',
    parentName: 'H. Suryadi Pratama',
    address: 'Jl. Melati No. 12, RT 03/RW 04, Jakarta',
    status: 'active',
    enrolledAt: '2026-07-15',
  },
  {
    id: 'std-002',
    nis: '20241002',
    nisn: '0078294012',
    name: 'Siti Rahma Az-Zahra',
    gender: 'P',
    classId: 'X-MIPA-1',
    photoUrl: '/src/assets/images/student_portrait_female_one_1790564895591.jpg',
    phone: '081298765432',
    parentName: 'Rahmat Hidayat, S.E.',
    address: 'Komplek Permata Indah Blok B4/11',
    status: 'active',
    enrolledAt: '2026-07-15',
  },
  {
    id: 'std-003',
    nis: '20241003',
    nisn: '0078330194',
    name: 'Dimas Satria Wibowo',
    gender: 'L',
    classId: 'XI-MIPA-1',
    photoUrl: '/src/assets/images/student_portrait_male_two_1790564909445.jpg',
    phone: '081387654321',
    parentName: 'Ir. Budi Wibowo',
    address: 'Jl. Kenanga Timur No. 8A, Jakarta',
    status: 'active',
    enrolledAt: '2026-07-15',
  },
  {
    id: 'std-004',
    nis: '20241004',
    nisn: '0078499201',
    name: 'Anisa Putri Maharani',
    gender: 'P',
    classId: 'XI-IPS-1',
    photoUrl: '/src/assets/images/student_portrait_female_two_1790564923922.jpg',
    phone: '081578912345',
    parentName: 'Drs. Joko Maharani',
    address: 'Jl. Cendrawasih No. 24, Jakarta',
    status: 'active',
    enrolledAt: '2026-07-15',
  },
  {
    id: 'std-005',
    nis: '20241005',
    nisn: '0078511202',
    name: 'Muhammad Rizky Alfian',
    gender: 'L',
    classId: 'X-MIPA-2',
    photoUrl: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
    phone: '081312349988',
    parentName: 'H. Alfian Syahputra',
    address: 'Jl. Kemuning Raya No. 19',
    status: 'active',
    enrolledAt: '2026-07-16',
  },
  {
    id: 'std-006',
    nis: '20241006',
    nisn: '0078622105',
    name: 'Nabila Choirunnisa',
    gender: 'P',
    classId: 'XII-MIPA-1',
    photoUrl: '/src/assets/images/student_portrait_female_one_1790564895591.jpg',
    phone: '081778901234',
    parentName: 'Sulistyo Pambudi',
    address: 'Jl. Danau Sunter Barat No. 5',
    status: 'active',
    enrolledAt: '2026-07-16',
  }
];

export function getSchoolSettings(): SchoolSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      let changed = false;
      if (parsed.schoolName === 'SMA Negeri 1 Harapan Bangsa' || !parsed.schoolName) {
        parsed.schoolName = DEFAULT_SETTINGS.schoolName;
        parsed.schoolNPSN = DEFAULT_SETTINGS.schoolNPSN;
        parsed.schoolAddress = DEFAULT_SETTINGS.schoolAddress;
        changed = true;
      }
      if (parsed.timeCheckInDeadline === '07:15' || !parsed.timeCheckInDeadline) {
        parsed.timeCheckInDeadline = '07:01';
        changed = true;
      }
      if (!parsed.timeCheckInEnd) {
        parsed.timeCheckInEnd = '10:00';
        changed = true;
      }
      if (!parsed.timeCheckOutOnTimeMonThu) {
        parsed.timeCheckOutOnTimeMonThu = '15:00';
        parsed.timeCheckOutOnTimeFri = '14:00';
        changed = true;
      }
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      if (changed) {
        saveSchoolSettings(merged);
      }
      return merged;
    }
  } catch (e) {
    console.error('Failed to get school settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSchoolSettings(settings: SchoolSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save school settings:', e);
  }
}

export function getClasses(): ClassGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get classes:', e);
  }
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(DEFAULT_CLASSES));
  return DEFAULT_CLASSES;
}

export function saveClasses(classes: ClassGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  } catch (e) {
    console.error('Failed to save classes:', e);
  }
}

export function getStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {
    console.error('Failed to load students:', e);
  }
  // Initialize with defaults and compute descriptors asynchronously
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
  initializeStudentDescriptors(DEFAULT_STUDENTS);
  return DEFAULT_STUDENTS;
}

export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students:', e);
  }
}

export async function initializeStudentDescriptors(students: Student[]): Promise<Student[]> {
  const updated = [...students];
  let changed = false;

  for (let i = 0; i < updated.length; i++) {
    const student = updated[i];
    if (!student.faceDescriptor || student.faceDescriptor.length === 0) {
      try {
        const desc = await extractDescriptorFromImageUrl(student.photoUrl);
        updated[i] = { ...student, faceDescriptor: desc };
        changed = true;
      } catch (err) {
        console.warn('Could not extract descriptor for student:', student.name, err);
      }
    }
  }

  if (changed) {
    saveStudents(updated);
  }
  return updated;
}

export function getAttendanceRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load attendance:', e);
  }
  
  // Seed with rich records across the month for demo
  const today = new Date().toISOString().split('T')[0];
  const d = new Date();
  const dMinus1 = new Date(d.getTime() - 86400000).toISOString().split('T')[0];
  const dMinus2 = new Date(d.getTime() - 86400000 * 2).toISOString().split('T')[0];
  const dMinus3 = new Date(d.getTime() - 86400000 * 3).toISOString().split('T')[0];

  const initialRecords: AttendanceRecord[] = [
    // Today: Ahmad Fauzi (Tepat Waktu Masuk & Pulang)
    {
      id: 'att-seed-1',
      studentId: 'std-001',
      studentNis: '20241001',
      studentNisn: '0078192831',
      studentName: 'Ahmad Fauzi Pratama',
      classId: 'X-MIPA-1',
      date: today,
      time: '06:48:22',
      mode: 'in',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 98.4,
      capturedPhoto: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
      note: 'Hadir Tepat Waktu - Face ID (98.4%)',
    },
    {
      id: 'att-seed-1-out',
      studentId: 'std-001',
      studentNis: '20241001',
      studentNisn: '0078192831',
      studentName: 'Ahmad Fauzi Pratama',
      classId: 'X-MIPA-1',
      date: today,
      time: '15:10:04',
      mode: 'out',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 97.2,
      capturedPhoto: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
      note: 'Absen Pulang Tepat Waktu (15:10:04 WIB)',
    },

    // Today: Siti Rahma (Tepat Waktu Masuk, Pulang Cepat)
    {
      id: 'att-seed-2',
      studentId: 'std-002',
      studentNis: '20241002',
      studentNisn: '0078294012',
      studentName: 'Siti Rahma Az-Zahra',
      classId: 'X-MIPA-1',
      date: today,
      time: '07:02:15',
      mode: 'in',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 96.8,
      capturedPhoto: '/src/assets/images/student_portrait_female_one_1790564895591.jpg',
      note: 'Hadir Tepat Waktu - Face ID (96.8%)',
    },
    {
      id: 'att-seed-2-out',
      studentId: 'std-002',
      studentNis: '20241002',
      studentNisn: '0078294012',
      studentName: 'Siti Rahma Az-Zahra',
      classId: 'X-MIPA-1',
      date: today,
      time: '14:15:30',
      mode: 'out',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 95.9,
      capturedPhoto: '/src/assets/images/student_portrait_female_one_1790564895591.jpg',
      note: 'Pulang Cepat (14:15:30 WIB < jadwal pulang 15:00)',
    },

    // Today: Dimas Satria (Terlambat)
    {
      id: 'att-seed-3',
      studentId: 'std-003',
      studentNis: '20241003',
      studentNisn: '0078330194',
      studentName: 'Dimas Satria Wibowo',
      classId: 'XI-MIPA-1',
      date: today,
      time: '07:28:44',
      mode: 'in',
      status: 'late',
      verificationMethod: 'face',
      confidenceScore: 95.1,
      capturedPhoto: '/src/assets/images/student_portrait_male_two_1790564909445.jpg',
      note: 'Terlambat (07:28:44 WIB > batas 07:15)',
    },

    // Today: Anisa Putri (Izin Dispensasi)
    {
      id: 'att-seed-4',
      studentId: 'std-004',
      studentNis: '20241004',
      studentNisn: '0078499201',
      studentName: 'Anisa Putri Maharani',
      classId: 'XI-IPS-1',
      date: today,
      time: '07:30:00',
      mode: 'in',
      status: 'permit',
      verificationMethod: 'manual',
      capturedPhoto: '/src/assets/images/student_portrait_female_two_1790564923922.jpg',
      note: 'Izin - Mengikuti Lomba Cerdas Cermat Tingkat Kabupaten',
    },

    // Yesterday: Ahmad Fauzi (Terlambat)
    {
      id: 'att-seed-prev1-in',
      studentId: 'std-001',
      studentNis: '20241001',
      studentNisn: '0078192831',
      studentName: 'Ahmad Fauzi Pratama',
      classId: 'X-MIPA-1',
      date: dMinus1,
      time: '07:22:10',
      mode: 'in',
      status: 'late',
      verificationMethod: 'face',
      confidenceScore: 97.5,
      capturedPhoto: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
      note: 'Terlambat (07:22:10 WIB > batas 07:15)',
    },
    {
      id: 'att-seed-prev1-out',
      studentId: 'std-001',
      studentNis: '20241001',
      studentNisn: '0078192831',
      studentName: 'Ahmad Fauzi Pratama',
      classId: 'X-MIPA-1',
      date: dMinus1,
      time: '15:05:12',
      mode: 'out',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 96.0,
      capturedPhoto: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
      note: 'Absen Pulang Tepat Waktu (15:05:12 WIB)',
    },

    // Yesterday: Siti Rahma (Tepat Waktu)
    {
      id: 'att-seed-prev2-in',
      studentId: 'std-002',
      studentNis: '20241002',
      studentNisn: '0078294012',
      studentName: 'Siti Rahma Az-Zahra',
      classId: 'X-MIPA-1',
      date: dMinus1,
      time: '06:55:40',
      mode: 'in',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 98.1,
      capturedPhoto: '/src/assets/images/student_portrait_female_one_1790564895591.jpg',
      note: 'Hadir Tepat Waktu - Face ID (98.1%)',
    },
    {
      id: 'att-seed-prev2-out',
      studentId: 'std-002',
      studentNis: '20241002',
      studentNisn: '0078294012',
      studentName: 'Siti Rahma Az-Zahra',
      classId: 'X-MIPA-1',
      date: dMinus1,
      time: '15:12:00',
      mode: 'out',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 97.4,
      capturedPhoto: '/src/assets/images/student_portrait_female_one_1790564895591.jpg',
      note: 'Absen Pulang Tepat Waktu (15:12:00 WIB)',
    },

    // 2 Days ago: Dimas Satria (Sakit)
    {
      id: 'att-seed-prev3-in',
      studentId: 'std-003',
      studentNis: '20241003',
      studentNisn: '0078330194',
      studentName: 'Dimas Satria Wibowo',
      classId: 'XI-MIPA-1',
      date: dMinus2,
      time: '07:10:00',
      mode: 'in',
      status: 'sick',
      verificationMethod: 'manual',
      capturedPhoto: '/src/assets/images/student_portrait_male_two_1790564909445.jpg',
      note: 'Sakit - Surat Keterangan Dokter Puskesmas Kerjo',
    },

    // 3 Days ago: Ahmad Fauzi (Pulang Cepat)
    {
      id: 'att-seed-prev4-in',
      studentId: 'std-001',
      studentNis: '20241001',
      studentNisn: '0078192831',
      studentName: 'Ahmad Fauzi Pratama',
      classId: 'X-MIPA-1',
      date: dMinus3,
      time: '06:50:00',
      mode: 'in',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 98.9,
      capturedPhoto: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
      note: 'Hadir Tepat Waktu - Face ID (98.9%)',
    },
    {
      id: 'att-seed-prev4-out',
      studentId: 'std-001',
      studentNis: '20241001',
      studentNisn: '0078192831',
      studentName: 'Ahmad Fauzi Pratama',
      classId: 'X-MIPA-1',
      date: dMinus3,
      time: '13:45:00',
      mode: 'out',
      status: 'present',
      verificationMethod: 'face',
      confidenceScore: 96.5,
      capturedPhoto: '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
      note: 'Pulang Cepat (13:45:00 WIB < jadwal pulang 15:00)',
    }
  ];

  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialRecords));
  return initialRecords;
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save attendance records:', e);
  }
}

export function addAttendanceRecord(record: AttendanceRecord): void {
  const current = getAttendanceRecords();
  // Put new attendance at the beginning
  const updated = [record, ...current];
  saveAttendanceRecords(updated);
}

export function exportAttendanceToCSV(records: AttendanceRecord[], schoolName: string): void {
  const headers = ['ID', 'Tanggal', 'Waktu', 'NIS', 'NISN', 'Nama Siswa', 'Kelas', 'Mode', 'Status Kehadiran', 'Metode', 'Akurasi Wajah (%)', 'Keterangan'];
  
  const statusLabels: Record<string, string> = {
    present: 'Hadir Tepat Waktu',
    late: 'Terlambat',
    sick: 'Sakit',
    permit: 'Izin',
    absent: 'Alpa / Tanpa Keterangan',
  };

  const modeLabels: Record<string, string> = {
    in: 'Absen Masuk',
    out: 'Absen Pulang',
  };

  const rows = records.map((r) => [
    r.id,
    r.date,
    r.time,
    `'${r.studentNis}`,
    `'${r.studentNisn}`,
    `"${r.studentName.replace(/"/g, '""')}"`,
    r.classId,
    modeLabels[r.mode] || r.mode,
    statusLabels[r.status] || r.status,
    r.verificationMethod === 'face' ? 'Face Recognition' : r.verificationMethod === 'qr' ? 'Scan Kartu QR' : 'Manual',
    r.confidenceScore ? `${r.confidenceScore}%` : '-',
    `"${(r.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [
    `"Laporan Presensi Siswa - ${schoolName.replace(/"/g, '""')}"`,
    `"Diekspor pada: ${new Date().toLocaleString('id-ID')}"`,
    '',
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Presensi_${schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportStudentsToCSV(students: Student[]): void {
  const headers = ['ID', 'NIS', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Kelas', 'No HP Ortu', 'Nama Orang Tua', 'Alamat', 'Status Wajah'];
  const rows = students.map((s) => [
    s.id,
    `'${s.nis}`,
    `'${s.nisn}`,
    `"${s.name.replace(/"/g, '""')}"`,
    s.gender === 'L' ? 'Laki-Laki' : 'Perempuan',
    s.classId,
    `'${s.phone}`,
    `"${s.parentName.replace(/"/g, '""')}"`,
    `"${s.address.replace(/"/g, '""')}"`,
    s.faceDescriptor && s.faceDescriptor.length > 0 ? 'Terdaftar' : 'Belum Rekam Wajah',
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Data_Siswa_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function resetToDefaults(): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(DEFAULT_CLASSES));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
}

export function getAdminSession(): AdminAuth {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get admin session:', e);
  }
  return {
    isAuthenticated: false,
    adminName: '',
    adminUsername: '',
  };
}

export function saveAdminSession(session: AdminAuth): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save admin session:', e);
  }
}

export function clearAdminSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  } catch (e) {
    console.error('Failed to clear admin session:', e);
  }
}

