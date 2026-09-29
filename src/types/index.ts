export type AttendanceStatus = 'present' | 'late' | 'sick' | 'permit' | 'absent';
export type AttendanceMode = 'in' | 'out';

export interface Student {
  id: string;
  nis: string; // Nomor Induk Siswa (e.g. "20241001")
  nisn: string; // Nomor Induk Siswa Nasional (10 digit)
  name: string;
  gender: 'L' | 'P';
  classId: string; // e.g. "X-MIPA-1"
  photoUrl: string;
  faceDescriptor?: number[]; // Vector of biometric features extracted from the face
  phone: string; // WhatsApp / Kontak Orang Tua
  parentName: string;
  address: string;
  status: 'active' | 'inactive';
  enrolledAt: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: '10' | '11' | '12';
  homeroomTeacher: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentNis: string;
  studentNisn: string;
  studentName: string;
  classId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  mode: AttendanceMode; // 'in' (Masuk) or 'out' (Pulang)
  status: AttendanceStatus;
  verificationMethod: 'face' | 'manual' | 'qr';
  confidenceScore?: number; // e.g. 96.5%
  capturedPhoto?: string;
  note?: string;
}

export interface DailyScheduleSetting {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
  dayName: string; // "Minggu", "Senin", "Selasa", dll.
  isActive: boolean; // true = Hari Sekolah Aktif, false = OFF / Libur
  note?: string; // e.g. "Libur Akhir Pekan", "Kegiatan Khusus"

  // Rentang Absen Masuk (06:00 - 10:00)
  checkInStart: string; // "06:00"
  checkInDeadline: string; // "07:01" (< 07:01 tepat waktu, >= 07:01 terlambat)
  checkInEnd: string; // "10:00"

  // Rentang Absen Pulang (10:01 - 17:00)
  checkOutStart: string; // "10:01"
  checkOutOnTimeStart: string; // Senin-Kamis: "15:00", Jumat: "14:00" (< jam ini pulang cepat, >= tepat waktu)
  checkOutEnd: string; // "17:00"
}

export type MonthlyScheduleMap = Record<string, DailyScheduleSetting>;

export interface SchoolSettings {
  schoolName: string;
  schoolNPSN: string;
  schoolAddress: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  timeCheckInStart: string; // "06:00"
  timeCheckInDeadline: string; // "07:01" (sebelum 07:01 tepat waktu, >= 07:01 terlambat)
  timeCheckInEnd: string; // "10:00"
  timeCheckOutStart: string; // "10:01"
  timeCheckOutOnTimeMonThu: string; // "15:00" (Senin-Kamis sebelum 15:00 pulang cepat)
  timeCheckOutOnTimeFri: string; // "14:00" (Jumat sebelum 14:00 pulang cepat)
  timeCheckOutEnd: string; // "17:00"
  similarityThreshold: number; // 0.70 to 0.90
  voiceNotification: boolean; // Indonesian TTS
  soundChime: boolean; // Web Audio synth chime
  adminUsername?: string; // Username administrator
  adminPassword?: string; // Password administrator
}

export interface AdminAuth {
  isAuthenticated: boolean;
  adminName: string;
  adminUsername: string;
  loginTime?: string;
}


export interface FaceScanResult {
  matchedStudent?: Student;
  confidence: number;
  faceBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
}
