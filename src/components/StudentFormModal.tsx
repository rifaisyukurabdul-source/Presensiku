import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Sparkles,
} from 'lucide-react';
import { Student, ClassGroup } from '../types';
import {
  extractDescriptorFromImageUrl,
  extractFaceDescriptorFromCanvas,
} from '../utils/faceRecognition';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  classes: ClassGroup[];
  studentToEdit?: Student | null;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  classes,
  studentToEdit,
}) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    nis: '',
    nisn: '',
    name: '',
    gender: 'L',
    classId: classes[0]?.id || 'X-MIPA-1',
    phone: '',
    parentName: '',
    address: '',
    status: 'active',
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | undefined>(undefined);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (studentToEdit) {
      setFormData(studentToEdit);
      setPhotoPreview(studentToEdit.photoUrl || '');
      setFaceDescriptor(studentToEdit.faceDescriptor);
    } else {
      setFormData({
        nis: `2024${Math.floor(1000 + Math.random() * 9000)}`,
        nisn: `0078${Math.floor(100000 + Math.random() * 900000)}`,
        name: '',
        gender: 'L',
        classId: classes[0]?.id || 'X-MIPA-1',
        phone: '0812',
        parentName: '',
        address: '',
        status: 'active',
      });
      setPhotoPreview('/src/assets/images/student_portrait_male_one_1790564879711.jpg');
      setFaceDescriptor(undefined);
    }
  }, [studentToEdit, classes, isOpen]);

  // Handle webcam capture stream
  const startCamera = async () => {
    setCaptureError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCapturing(true);
    } catch (err) {
      setCaptureError('Gagal mengakses kamera web. Silakan gunakan opsi unggah foto.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const takeSnapshot = async () => {
    const video = videoRef.current;
    if (!video) return;

    setIsProcessing(true);
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoPreview(dataUrl);

    // Extract descriptor
    const desc = extractFaceDescriptorFromCanvas(ctx, 320, 320);
    setFaceDescriptor(desc);

    stopCamera();
    setIsProcessing(false);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setPhotoPreview(result);
      try {
        const desc = await extractDescriptorFromImageUrl(result);
        setFaceDescriptor(desc);
      } catch (err) {
        console.warn('Descriptor extraction error:', err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nis) return;

    const student: Student = {
      id: studentToEdit?.id || `std-${Date.now()}`,
      nis: formData.nis || '',
      nisn: formData.nisn || '',
      name: formData.name || '',
      gender: (formData.gender as 'L' | 'P') || 'L',
      classId: formData.classId || 'X-MIPA-1',
      photoUrl: photoPreview || '/src/assets/images/student_portrait_male_one_1790564879711.jpg',
      faceDescriptor: faceDescriptor || (studentToEdit?.faceDescriptor ? studentToEdit.faceDescriptor : []),
      phone: formData.phone || '',
      parentName: formData.parentName || '',
      address: formData.address || '',
      status: 'active',
      enrolledAt: studentToEdit?.enrolledAt || new Date().toISOString().split('T')[0],
    };

    onSave(student);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {studentToEdit ? 'Edit Data Siswa' : 'Pendaftaran Siswa & Perekaman Wajah'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lengkapi identitas siswa dan rekam biometrik wajah untuk face recognition
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Biometric Face Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Perekaman Biometrik Wajah
              </span>
              {faceDescriptor && faceDescriptor.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Wajah Siap (64-dim)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Belum Rekam Vektor Wajah
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Photo Viewport / Webcam Box */}
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 shrink-0 flex items-center justify-center shadow-inner">
                {isCapturing ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Foto Siswa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-500" />
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white text-[11px] font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin mb-1 text-indigo-400" />
                    Menganalisis...
                  </div>
                )}
              </div>

              {/* Camera / Upload Action Controls */}
              <div className="flex-1 space-y-2.5 w-full">
                {isCapturing ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto Sekarang
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil via Kamera
                    </button>

                    <label className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                      <Upload className="w-4 h-4 text-slate-500" />
                      Unggah File Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {captureError && (
                  <p className="text-[11px] text-rose-600">{captureError}</p>
                )}

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tips: Pastikan wajah siswa menghadap lurus ke kamera dengan pencahayaan yang cukup
                  agar sistem absensi mengenali dalam kecepatan &lt; 0.5 detik.
                </p>
              </div>
            </div>
          </div>

          {/* Student Identity Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Siswa *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Muhammad Budi Pratama"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Kelamin *
              </label>
              <select
                value={formData.gender || 'L'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="L">Laki-Laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Induk Siswa (NIS) *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 20241012"
                value={formData.nis || ''}
                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NISN (10 Digit)
              </label>
              <input
                type="text"
                placeholder="Contoh: 0078192831"
                value={formData.nisn || ''}
                onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelas / Rombel *
              </label>
              <select
                value={formData.classId || classes[0]?.id}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. WhatsApp / HP Orang Tua
              </label>
              <input
                type="text"
                placeholder="Contoh: 081234567890"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                placeholder="Nama ayah atau ibu"
                value={formData.parentName || ''}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Tinggal Siswa
              </label>
              <input
                type="text"
                placeholder="Kelurahan, Kota"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
              {studentToEdit ? 'Simpan Perubahan' : 'Simpan Siswa & Wajah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
