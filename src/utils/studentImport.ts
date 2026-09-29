import * as XLSX from 'xlsx';
import { Student, ClassGroup, SchoolSettings } from '../types';

export interface ParsedStudentRow {
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  classId: string;
  phone: string;
  parentName: string;
  address: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Generates and downloads an authentic Microsoft Excel .xls template for student imports.
 */
export function downloadStudentImportTemplate(classes: ClassGroup[], settings: SchoolSettings): void {
  const availableClassNames = classes.map((c) => c.id).join(', ');

  const templateData = [
    {
      'No': 1,
      'NIS (Wajib)': '20241010',
      'NISN': '0081234567',
      'Nama Lengkap (Wajib)': 'Muhammad Ilham Ramadhan',
      'Jenis Kelamin (L/P)': 'L',
      'Kelas (Wajib)': classes[0]?.id || 'X-MIPA-1',
      'No WhatsApp Ortu': '081234567890',
      'Nama Orang Tua': 'H. Ramadhan Kusuma',
      'Alamat': 'Jl. Raya Kerjo No. 15, Karanganyar',
    },
    {
      'No': 2,
      'NIS (Wajib)': '20241011',
      'NISN': '0087654321',
      'Nama Lengkap (Wajib)': 'Dewi Anggraini Lestari',
      'Jenis Kelamin (L/P)': 'P',
      'Kelas (Wajib)': classes[0]?.id || 'X-MIPA-1',
      'No WhatsApp Ortu': '081398765432',
      'Nama Orang Tua': 'Lestari Suharjo',
      'Alamat': 'Desa Botok, Kec. Kerjo',
    },
    {
      'No': 3,
      'NIS (Wajib)': '20241012',
      'NISN': '0089123890',
      'Nama Lengkap (Wajib)': 'Bagus Prasetyo Utomo',
      'Jenis Kelamin (L/P)': 'L',
      'Kelas (Wajib)': classes[1]?.id || 'X-MIPA-2',
      'No WhatsApp Ortu': '081577889900',
      'Nama Orang Tua': 'Suprapto Utomo',
      'Alamat': 'Desa Kwadungan, Kec. Kerjo',
    },
  ];

  // Worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // NIS
    { wch: 16 }, // NISN
    { wch: 30 }, // Nama
    { wch: 18 }, // L/P
    { wch: 16 }, // Kelas
    { wch: 20 }, // No WA
    { wch: 26 }, // Nama Ortu
    { wch: 35 }, // Alamat
  ];

  // Instructions Sheet
  const instructionsData = [
    ['PANDUAN PENGISIAN TEMPLATE IMPORT SISWA - ' + settings.schoolName.toUpperCase()],
    [''],
    ['1. Kolom Wajib:', 'NIS, Nama Lengkap, dan Kelas tidak boleh kosong.'],
    ['2. Format NIS & NISN:', 'Harus berupa angka unik. Format teks dianjurkan agar angka 0 di depan tetap ada.'],
    ['3. Pilihan Kelas Tersedia:', availableClassNames],
    ['4. Jenis Kelamin:', 'Ketik "L" untuk Laki-Laki atau "P" untuk Perempuan.'],
    ['5. PENTING - BIOMETRIK WAJAH:', 'Data biometrik wajah siswa TIDAK DAPAT diimpor via Excel.'],
    ['', 'Setelah siswa berhasil diimpor, operator/guru WAJIB merekam wajah siswa satu per satu di depan kamera aplikasi.'],
    ['', 'Siswa yang baru diimpor akan berstatus: "⚠️ Belum Rekam Biometrik Wajah".'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 30 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk Pengisian');

  // Generate .xls (biff8) or .xlsx file
  XLSX.writeFile(wb, `Template_Import_Siswa_${settings.schoolName.replace(/\s+/g, '_')}.xls`);
}

/**
 * Parses an uploaded .xls / .xlsx / .csv file using SheetJS (xlsx).
 */
export async function parseStudentImportFile(
  file: File,
  classes: ClassGroup[],
  existingStudents: Student[]
): Promise<ParsedStudentRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Target first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse to JSON array of objects
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
        });

        const validClassIds = new Set(classes.map((c) => c.id.toLowerCase()));
        const existingNisSet = new Set(existingStudents.map((s) => s.nis.trim()));

        const parsedRows: ParsedStudentRow[] = [];

        for (const row of rawJson) {
          // Normalize column keys
          const keys = Object.keys(row);
          const getVal = (possibleNames: string[]): string => {
            for (const name of possibleNames) {
              const matchedKey = keys.find((k) =>
                k.toLowerCase().includes(name.toLowerCase())
              );
              if (matchedKey && row[matchedKey] !== undefined) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const nis = getVal(['nis (wajib)', 'nis']);
          const nisn = getVal(['nisn']);
          const name = getVal(['nama lengkap (wajib)', 'nama lengkap', 'nama']);
          const genderRaw = getVal(['jenis kelamin', 'gender', 'jk']).toUpperCase();
          const classRaw = getVal(['kelas (wajib)', 'kelas', 'rombel']);
          const phone = getVal(['no whatsapp', 'no hp', 'telepon', 'phone']);
          const parentName = getVal(['nama orang tua', 'nama ortu', 'orang tua', 'wali']);
          const address = getVal(['alamat']);

          // Ignore blank rows
          if (!nis && !name && !classRaw) {
            continue;
          }

          const errors: string[] = [];

          if (!name) {
            errors.push('Nama siswa wajib diisi');
          }

          if (!nis) {
            errors.push('NIS wajib diisi');
          } else if (existingNisSet.has(nis)) {
            errors.push(`NIS ${nis} sudah terdaftar di sistem`);
          }

          // Normalize class
          let matchedClass = classRaw;
          const foundClass = classes.find(
            (c) =>
              c.id.toLowerCase() === classRaw.toLowerCase() ||
              c.name.toLowerCase() === classRaw.toLowerCase()
          );
          if (foundClass) {
            matchedClass = foundClass.id;
          } else if (!classRaw) {
            matchedClass = classes[0]?.id || 'X-MIPA-1';
          }

          const gender: 'L' | 'P' = genderRaw.startsWith('P') ? 'P' : 'L';

          parsedRows.push({
            nis,
            nisn,
            name,
            gender,
            classId: matchedClass,
            phone,
            parentName,
            address,
            isValid: errors.length === 0,
            errors,
          });
        }

        resolve(parsedRows);
      } catch (err) {
        reject(new Error('Format file tidak didukung atau rusak. Pastikan file berformat .xls atau .xlsx'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file dari perangkat.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
