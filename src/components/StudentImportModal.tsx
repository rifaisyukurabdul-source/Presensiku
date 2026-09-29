import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Camera,
  Info,
} from 'lucide-react';
import { Student, ClassGroup, SchoolSettings } from '../types';
import {
  downloadStudentImportTemplate,
  parseStudentImportFile,
  ParsedStudentRow,
} from '../utils/studentImport';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveImportedStudents: (newStudents: Student[]) => void;
  classes: ClassGroup[];
  existingStudents: Student[];
  settings: SchoolSettings;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  onSaveImportedStudents,
  classes,
  existingStudents,
  settings,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleDownloadTemplate = () => {
    downloadStudentImportTemplate(classes, settings);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rows = await parseStudentImportFile(uploadedFile, classes, existingStudents);
      if (rows.length === 0) {
        setErrorMessage('File kosong atau tidak ditemukan baris data siswa yang sesuai template.');
      }
      setParsedRows(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses file Excel.';
      setErrorMessage(msg);
      setParsedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Convert parsed rows to Student entities with NO biometric face vector (faceDescriptor: undefined)
    const newStudents: Student[] = validRows.map((row, idx) => ({
      id: `std-imp-${Date.now()}-${idx}`,
      nis: row.nis,
      nisn: row.nisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      name: row.name,
      gender: row.gender,
      classId: row.classId,
      photoUrl:
        row.gender === 'P'
          ? '/src/assets/images/student_portrait_female_two_1790564923922.jpg'
          : '/src/assets/images/student_portrait_male_two_1790564909445.jpg',
      // CRITICAL: Biometrics cannot be imported and MUST be recorded individually via camera!
      faceDescriptor: undefined,
      phone: row.phone,
      parentName: row.parentName,
      address: row.address,
      status: 'active',
      enrolledAt: todayStr,
    }));

    onSaveImportedStudents(newStudents);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-emerald-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Import Data Siswa Baru (.xls / .xlsx)
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Tambahkan siswa secara massal menggunakan file template Microsoft Excel
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* CRITICAL BIOMETRIC NOTICE CALLOUT */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1.5 leading-relaxed">
              <h4 className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                <span>Aturan Ketat Biometrik Wajah</span>
              </h4>
              <p>
                Pendataan <strong>biometrik wajah tidak dapat menggunakan import Excel</strong>. Demi
                akurasi pengenalan kamera dan mencegah pemalsuan identitas, seluruh siswa yang diimpor
                <strong> wajib direkam wajahnya satu per satu di depan kamera</strong>.
              </p>
              <p className="text-[11px] text-amber-800 font-medium">
                Setelah proses import selesai, setiap siswa baru akan berstatus{' '}
                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                  ⚠️ Belum Rekam Wajah
                </span>{' '}
                dan tombol <strong>"Rekam Wajah"</strong> akan tersedia langsung pada tabel Data Siswa.
              </p>
            </div>
          </div>

          {/* Download Template Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                1. Unduh Template Import Resmi (.xls)
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Gunakan template resmi agar format kolom (NIS, Nama, Kelas) terbaca sempurna oleh sistem.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors shrink-0 shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              Download Template .xls
            </button>
          </div>

          {/* Upload Area */}
          <div>
            <span className="text-xs font-bold text-slate-800 block mb-2">
              2. Unggah File Excel Yang Telah Diisi
            </span>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {file ? file.name : 'Klik untuk memilih file .xls / .xlsx atau seret ke sini'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mendukung Microsoft Excel (.xls, .xlsx) dan CSV
                </p>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center p-6 text-slate-500 gap-2 text-xs font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Menganalisis file Excel dan memverifikasi data...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {parsedRows.length > 0 && !isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Pratinjau Data Terbaca ({parsedRows.length} Siswa)
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validRows.length} Siap Diimpor
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {invalidRows.length} Tidak Valid
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] font-semibold sticky top-0">
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3">Nama Siswa</th>
                      <th className="py-2 px-3 text-center">NIS</th>
                      <th className="py-2 px-3 text-center">Kelas</th>
                      <th className="py-2 px-3 text-center">Biometrik Wajah</th>
                      <th className="py-2 px-3">Kontak Ortu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50 text-rose-900'}
                      >
                        <td className="py-2 px-3 text-center">
                          {row.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span
                              title={row.errors.join(', ')}
                              className="text-rose-600 font-bold cursor-help"
                            >
                              ⚠️
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {row.name}
                          {!row.isValid && (
                            <span className="text-[10px] text-rose-600 block font-normal">
                              {row.errors.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{row.nis}</td>
                        <td className="py-2 px-3 text-center font-semibold text-indigo-700">
                          {row.classId}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            ⚠️ Wajib Kamera
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {row.phone || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {validRows.length > 0 ? (
              <span>
                Siap menambahkan <strong className="text-slate-900">{validRows.length} siswa</strong>{' '}
                ke SMA Negeri 1 Kerjo
              </span>
            ) : (
              <span>Pilih file .xls untuk memverifikasi data siswa</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={validRows.length === 0}
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-colors shadow-sm flex items-center gap-2 ${
                validRows.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed opacity-70'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan & Import ({validRows.length} Siswa)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
