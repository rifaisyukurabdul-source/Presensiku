import React from 'react';
import { X, Printer, QrCode, Sparkles } from 'lucide-react';
import { Student, SchoolSettings } from '../types';

interface StudentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  settings: SchoolSettings;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  isOpen,
  onClose,
  student,
  settings,
}) => {
  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Kartu Tanda Pelajar Siswa
            </h3>
            <p className="text-[11px] text-slate-500">
              Format cetak resmi standar sekolah nasional
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Kartu
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-100">
          {/* Card Frame (Aspect Ratio 85.6mm x 54mm standard CR80 ID Card) */}
          <div
            id="printable-student-card"
            className="w-full max-w-md bg-white rounded-2xl shadow-md border border-slate-300 overflow-hidden relative"
          >
            {/* Card Header Strip with School Identity */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-base shrink-0">
                🎓
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black uppercase tracking-wider leading-tight truncate">
                  {settings.schoolName}
                </h4>
                <p className="text-[10px] text-blue-200 font-mono">
                  NPSN: {settings.schoolNPSN} · TP {settings.academicYear}
                </p>
                <p className="text-[9px] text-blue-200/80 truncate">
                  {settings.schoolAddress}
                </p>
              </div>
            </div>

            {/* Sub-header Banner */}
            <div className="bg-amber-400 py-0.5 px-4 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
                KARTU TANDA PELAJAR
              </span>
            </div>

            {/* Card Body */}
            <div className="p-4 grid grid-cols-12 gap-3.5 items-center">
              {/* Photo Area */}
              <div className="col-span-4 flex flex-col items-center">
                <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-indigo-600/60 shadow-sm bg-slate-100">
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full mt-1.5 uppercase">
                  {student.classId}
                </span>
              </div>

              {/* Student Metadata */}
              <div className="col-span-8 text-[11px] space-y-1.5">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Nama Siswa:</span>
                  <span className="font-bold text-slate-900 text-xs block leading-tight">
                    {student.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">NIS:</span>
                    <strong className="text-slate-800">{student.nis}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">NISN:</span>
                    <strong className="text-slate-800">{student.nisn}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Jenis Kelamin:</span>
                    <span className="text-slate-700">
                      {student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Berlaku Hingga:</span>
                    <span className="text-slate-700 font-mono">2027-06-30</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  {/* Simulated Barcode */}
                  <div className="flex flex-col">
                    <div className="flex gap-[2px] h-6 items-end">
                      {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2].map((w, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900"
                          style={{ width: `${w * 1.2}px`, height: '100%' }}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-mono tracking-wider text-slate-500 mt-0.5">
                      *{student.nis}*
                    </span>
                  </div>

                  {/* QR Code Icon / Box */}
                  <div className="w-10 h-10 border border-slate-300 rounded bg-slate-50 flex items-center justify-center p-1 text-slate-700">
                    <QrCode className="w-full h-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer Bar */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500">
              <span className="truncate">Harap selalu dibawa selama berada di sekolah.</span>
              <span className="font-semibold text-indigo-700 shrink-0">PresensiKu Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
