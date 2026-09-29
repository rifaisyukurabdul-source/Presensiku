import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Sparkles,
  Volume2,
  VolumeX,
  ScanLine,
  ArrowRightLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, AttendanceRecord, AttendanceMode, SchoolSettings } from '../types';
import {
  detectFaceRegion,
  extractFaceDescriptorFromCanvas,
  matchStudentFace,
} from '../utils/faceRecognition';
import { playSuccessChime, playWarningChime, speakIndonesian } from '../utils/audio';
import {
  getDaySchedule,
  determineAutomaticAttendanceMode,
  evaluateAttendance,
} from '../utils/scheduleStorage';

interface ScannerKioskProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  settings: SchoolSettings;
}

export const ScannerKiosk: React.FC<ScannerKioskProps> = ({
  students,
  attendanceRecords,
  onAddAttendance,
  settings,
}) => {
  // Today's date and loaded daily schedule
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter((r) => r.date === todayStr);

  const todaySchedule = useMemo(() => {
    return getDaySchedule(todayStr);
  }, [todayStr]);

  // Automated attendance mode (06:00 - 10:00 Masuk, 10:01 - 17:00 Pulang)
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [mode, setMode] = useState<AttendanceMode>(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return determineAutomaticAttendanceMode(timeStr, getDaySchedule(todayStr));
  });

  // Sync automatic mode in real-time
  useEffect(() => {
    if (!isAutoMode) return;

    const syncMode = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const currentAutoMode = determineAutomaticAttendanceMode(timeStr, todaySchedule);
      setMode(currentAutoMode);
    };

    syncMode();
    const interval = setInterval(syncMode, 3000);
    return () => clearInterval(interval);
  }, [isAutoMode, todaySchedule]);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Real-time scan feedback
  const [liveConfidence, setLiveConfidence] = useState<number>(0);
  const [matchedCandidate, setMatchedCandidate] = useState<Student | null>(null);
  const [recentMatch, setRecentMatch] = useState<{
    student: Student;
    record: AttendanceRecord;
    timestamp: number;
  } | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  // Cooldown tracker: studentId -> timestamp
  const cooldownRef = useRef<Map<string, number>>(new Map());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const scanIntervalId = useRef<number | null>(null);
  const scanLinePos = useRef<number>(0);
  const scanLineDirection = useRef<number>(1);

  // Check camera permissions and enumerate video devices
  const listCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate media devices:', e);
    }
  };

  // Start Camera Stream
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      listCameras();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Gagal mengakses kamera. Pastikan izin kamera aktif.';
      setCameraError(errorMsg);
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (scanIntervalId.current) clearInterval(scanIntervalId.current);
    };
  }, []);

  // Handle successful match logic
  const handleAttendanceTrigger = useCallback(
    (student: Student, confidence: number, capturedPhotoData?: string) => {
      const now = new Date();
      const nowMs = now.getTime();
      const lastScanned = cooldownRef.current.get(student.id) || 0;

      // 12-second anti-bounce cooldown
      if (nowMs - lastScanned < 12000) {
        return;
      }
      cooldownRef.current.set(student.id, nowMs);

      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Determine effective mode automatically or use manual override
      const effectiveMode = isAutoMode
        ? determineAutomaticAttendanceMode(timeStr, todaySchedule)
        : mode;

      // Check if already checked in today for current mode
      const alreadyCheckedToday = todayRecords.find(
        (r) => r.studentId === student.id && r.mode === effectiveMode
      );

      if (alreadyCheckedToday) {
        if (settings.soundChime) playWarningChime();
        const modeLabel = effectiveMode === 'in' ? 'masuk' : 'pulang';
        const msg = `${student.name} sudah melakukan presensi ${modeLabel} hari ini pada pukul ${alreadyCheckedToday.time} WIB.`;
        setDuplicateNotice(msg);
        if (settings.voiceNotification) {
          speakIndonesian(`Perhatian, ${student.name} sudah absen ${modeLabel} hari ini.`);
        }
        setTimeout(() => setDuplicateNotice(null), 6000);
        return;
      }

      // Determine status & note strictly according to rules:
      // 1. Absen masuk: 06.00 s/d 10.00 (< 07.01 tepat waktu, >= 07.01 terlambat)
      // 2. Absen pulang: 10.01 s/d 17.00 (Senin-Kamis < 15.00 pulang cepat, Jumat < 14.00 pulang cepat)
      const evaluation = evaluateAttendance(effectiveMode, timeStr, todaySchedule);
      const status = evaluation.status;
      const note = evaluation.note;

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        studentId: student.id,
        studentNis: student.nis,
        studentNisn: student.nisn,
        studentName: student.name,
        classId: student.classId,
        date: todayStr,
        time: timeStr,
        mode: effectiveMode,
        status,
        verificationMethod: 'face',
        confidenceScore: confidence,
        capturedPhoto: capturedPhotoData || student.photoUrl,
        note,
      };

      onAddAttendance(newRecord);
      setRecentMatch({
        student,
        record: newRecord,
        timestamp: nowMs,
      });

      // Sound & Voice Effects
      if (settings.soundChime) {
        playSuccessChime();
      }

      if (settings.voiceNotification) {
        if (effectiveMode === 'in') {
          if (status === 'late') {
            speakIndonesian(`Presensi berhasil dicatat. Anda tercatat terlambat, ${student.name}.`);
          } else {
            speakIndonesian(`Presensi berhasil. Selamat pagi ${student.name}, kehadiran Anda tepat waktu.`);
          }
        } else {
          if (evaluation.isEarlyLeave) {
            speakIndonesian(`Presensi pulang berhasil dicatat. Anda tercatat pulang cepat, ${student.name}.`);
          } else {
            speakIndonesian(`Presensi pulang berhasil dicatat. Terima kasih ${student.name}, hati-hati di jalan.`);
          }
        }
      }

      // Celebratory Confetti for on-time arrivals
      if (status === 'present') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#4F46E5', '#10B981', '#3B82F6', '#F59E0B'],
        });
      }

      // Hide match popup after 6 seconds
      setTimeout(() => {
        setRecentMatch((prev) => (prev?.timestamp === nowMs ? null : prev));
      }, 6000);
    },
    [mode, todayRecords, settings, todayStr, onAddAttendance]
  );

  // Background face analysis loop
  useEffect(() => {
    if (!cameraActive) return;

    const performFaceScan = () => {
      const video = videoRef.current;
      const hiddenCanvas = hiddenCanvasRef.current;
      if (!video || !hiddenCanvas || video.readyState < 2) return;

      const w = 320;
      const h = 240;
      hiddenCanvas.width = w;
      hiddenCanvas.height = h;
      const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw current video frame to processing canvas
      ctx.drawImage(video, 0, 0, w, h);

      // Detect skin / face region
      const faceData = detectFaceRegion(ctx, w, h);

      if (faceData.detected) {
        // Extract 64-dim normalized face descriptor
        const descriptor = extractFaceDescriptorFromCanvas(ctx, w, h, faceData.box);

        // Match against enrolled students
        const result = matchStudentFace(descriptor, students, settings.similarityThreshold);
        setLiveConfidence(result.confidence);

        if (result.matchedStudent && result.confidence >= Math.round(settings.similarityThreshold * 100)) {
          setMatchedCandidate(result.matchedStudent);
          const snapshotUrl = hiddenCanvas.toDataURL('image/jpeg', 0.8);
          handleAttendanceTrigger(result.matchedStudent, result.confidence, snapshotUrl);
        } else {
          setMatchedCandidate(null);
        }
      } else {
        setLiveConfidence(0);
        setMatchedCandidate(null);
      }
    };

    scanIntervalId.current = window.setInterval(performFaceScan, 320);

    return () => {
      if (scanIntervalId.current) clearInterval(scanIntervalId.current);
    };
  }, [cameraActive, students, settings.similarityThreshold, handleAttendanceTrigger]);

  // Canvas visual overlay loop (Biometric HUD, Corner brackets, Scanner laser beam)
  useEffect(() => {
    let active = true;

    const renderOverlay = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas && video && video.readyState >= 2) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          ctx.clearRect(0, 0, width, height);

          // Center Biometric Target Oval
          const centerX = width / 2;
          const centerY = height / 2;
          const radiusX = width * 0.22;
          const radiusY = height * 0.32;

          // Animated laser scanner bar
          scanLinePos.current += 3.5 * scanLineDirection.current;
          if (scanLinePos.current > centerY + radiusY) {
            scanLineDirection.current = -1;
          } else if (scanLinePos.current < centerY - radiusY) {
            scanLineDirection.current = 1;
          }

          // Target Oval
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = matchedCandidate
            ? 'rgba(34, 197, 94, 0.9)' // Green when recognized
            : liveConfidence > 45
            ? 'rgba(99, 102, 241, 0.85)' // Indigo when tracking
            : 'rgba(255, 255, 255, 0.5)'; // Neutral white
          ctx.setLineDash([8, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          // 4 Corner Brackets around face target
          const bracketSize = 24;
          const left = centerX - radiusX - 10;
          const right = centerX + radiusX + 10;
          const top = centerY - radiusY - 10;
          const bottom = centerY + radiusY + 10;

          ctx.strokeStyle = matchedCandidate ? '#22c55e' : '#6366f1';
          ctx.lineWidth = 3.5;

          // Top-Left
          ctx.beginPath();
          ctx.moveTo(left, top + bracketSize);
          ctx.lineTo(left, top);
          ctx.lineTo(left + bracketSize, top);
          ctx.stroke();

          // Top-Right
          ctx.beginPath();
          ctx.moveTo(right - bracketSize, top);
          ctx.lineTo(right, top);
          ctx.lineTo(right, top + bracketSize);
          ctx.stroke();

          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(left, bottom - bracketSize);
          ctx.lineTo(left, bottom);
          ctx.lineTo(left + bracketSize, bottom);
          ctx.stroke();

          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(right - bracketSize, bottom);
          ctx.lineTo(right, bottom);
          ctx.lineTo(right, bottom - bracketSize);
          ctx.stroke();

          // Laser Scanner line inside oval
          const currentScanY = scanLinePos.current;
          if (currentScanY >= top && currentScanY <= bottom) {
            const grad = ctx.createLinearGradient(
              centerX - radiusX,
              currentScanY,
              centerX + radiusX,
              currentScanY
            );
            grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
            grad.addColorStop(0.5, matchedCandidate ? 'rgba(34, 197, 94, 0.95)' : 'rgba(99, 102, 241, 0.9)');
            grad.addColorStop(1, 'rgba(99, 102, 241, 0)');

            ctx.beginPath();
            ctx.moveTo(centerX - radiusX, currentScanY);
            ctx.lineTo(centerX + radiusX, currentScanY);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          // Biometric Landmark Simulation Points
          if (liveConfidence > 30) {
            const eyeY = centerY - radiusY * 0.2;
            const leftEyeX = centerX - radiusX * 0.35;
            const rightEyeX = centerX + radiusX * 0.35;
            const noseY = centerY + radiusY * 0.1;
            const mouthY = centerY + radiusY * 0.45;

            ctx.fillStyle = matchedCandidate ? '#22c55e' : '#60a5fa';

            // Left eye, right eye, nose, mouth
            [
              [leftEyeX, eyeY],
              [rightEyeX, eyeY],
              [centerX, noseY],
              [centerX - 15, mouthY],
              [centerX + 15, mouthY],
            ].forEach(([ptX, ptY]) => {
              ctx.beginPath();
              ctx.arc(ptX, ptY, 3, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(renderOverlay);
    };

    animationFrameId.current = requestAnimationFrame(renderOverlay);

    return () => {
      active = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [liveConfidence, matchedCandidate]);

  // Quick Simulation Test Trigger (allows 1-click test of face recognition without camera)
  const triggerSimulation = (student: Student) => {
    handleAttendanceTrigger(student, 98.7, student.photoUrl);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Mode Selector & Today's Attendance Counters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            Pemindai Wajah Otomatis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Posisikan wajah di depan kamera untuk verifikasi kehadiran otomatis
          </p>
        </div>

        {/* Check-In vs Check-Out Mode Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          {/* Automatic Detection Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isAutoMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {isAutoMode ? 'Mode Otomatis:' : 'Mode Manual:'}
            </span>
            <span className="font-bold text-indigo-700">
              {mode === 'in'
                ? 'Absen Masuk (06:00 - 10:00)'
                : `Absen Pulang (s/d 17:00)`}
            </span>
            <button
              type="button"
              onClick={() => setIsAutoMode(!isAutoMode)}
              className="text-[10px] ml-1 px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-bold text-slate-700 transition-colors"
              title="Alihkan mode otomatis / manual"
            >
              {isAutoMode ? 'Manual' : 'Otomatis'}
            </button>
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => {
                setMode('in');
                setIsAutoMode(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'in'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Masuk (06:00 - 10:00)</span>
            </button>
            <button
              onClick={() => {
                setMode('out');
                setIsAutoMode(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'out'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Pulang (10:01 - 17:00)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Kiosk Grid: Camera Scanner (Left/Center) + Live Log Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Video + Biometric HUD (7 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div
            className={`relative bg-slate-950 rounded-2xl overflow-hidden shadow-sm aspect-[4/3] flex items-center justify-center border transition-all duration-300 ${
              recentMatch ? 'border-emerald-500 ring-4 ring-emerald-500/40 shadow-xl' : 'border-slate-800'
            }`}
          >
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
                />

                {/* ON-SCREEN FLOATING SUCCESS CONFIRMATION BADGE OVER CAMERA */}
                {recentMatch && (
                  <div className="absolute inset-x-4 top-14 md:inset-x-10 z-20 animate-in zoom-in-95 fade-in duration-300 pointer-events-none">
                    <div className="bg-slate-950/95 backdrop-blur-md border-2 border-emerald-400 text-white rounded-2xl p-4 sm:p-5 shadow-2xl flex items-center gap-4 sm:gap-5 ring-4 ring-emerald-500/20">
                      {/* Photo with Checkmark Badge */}
                      <div className="relative shrink-0">
                        <img
                          src={recentMatch.record.capturedPhoto || recentMatch.student.photoUrl}
                          alt={recentMatch.student.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-white shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                      </div>

                      {/* Info Block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            BERHASIL PRESENSI
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                            {recentMatch.record.mode === 'in' ? 'Absen Masuk' : 'Absen Pulang'}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-white truncate mt-1 leading-snug">
                          {recentMatch.student.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-300 mt-0.5">
                          <span className="font-mono text-emerald-300 font-semibold">
                            NIS: {recentMatch.student.nis}
                          </span>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-200">
                            {recentMatch.student.classId}
                          </span>
                          <span>&bull;</span>
                          <span className="font-mono font-bold text-white">
                            {recentMatch.record.time} WIB
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              recentMatch.record.status === 'late'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-emerald-400/30 text-emerald-300 border border-emerald-400/50'
                            }`}
                          >
                            {recentMatch.record.status === 'late'
                              ? '⚠️ Terlambat'
                              : '✓ Hadir Tepat Waktu'}
                          </span>

                          {recentMatch.record.confidenceScore && (
                            <span className="text-[11px] text-emerald-400 font-mono">
                              Akurasi Wajah: {recentMatch.record.confidenceScore}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* HUD Top Bar: Current Mode Badge + Live Accuracy Status */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-white">
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        mode === 'in' ? 'bg-indigo-400' : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-semibold">
                      {mode === 'in' ? 'Mode: Masuk' : 'Mode: Pulang'}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300">
                      {mode === 'in'
                        ? `Batas Tepat: ${todaySchedule.checkInDeadline || '07:01'} WIB`
                        : `Jadwal Pulang: ${todaySchedule.checkOutOnTimeStart || '15:00'} WIB`}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono tabular-nums text-white">
                    {recentMatch ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        BERHASIL PRESENSI
                      </span>
                    ) : matchedCandidate ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cocok: {liveConfidence}%
                      </span>
                    ) : liveConfidence > 30 ? (
                      <span className="text-indigo-300">
                        Memindai: {liveConfidence}%
                      </span>
                    ) : (
                      <span className="text-slate-400">Menunggu Wajah...</span>
                    )}
                  </div>
                </div>

                {/* HUD Bottom Guide */}
                <div className="absolute bottom-4 inset-x-4 flex justify-center pointer-events-none z-10">
                  <div
                    className={`px-4 py-2 rounded-xl backdrop-blur-md border text-xs shadow-lg text-center transition-all ${
                      recentMatch
                        ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/40'
                        : matchedCandidate
                        ? 'bg-slate-900/90 border-emerald-500/80 text-emerald-300'
                        : 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    {recentMatch ? (
                      <span className="text-emerald-300 font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                        BERHASIL PRESENSI: {recentMatch.student.name} ({recentMatch.student.classId}) &bull; {recentMatch.record.time} WIB
                      </span>
                    ) : matchedCandidate ? (
                      <span className="text-emerald-400 font-semibold">
                        Wajah Dikenali: {matchedCandidate.name} ({matchedCandidate.classId})
                      </span>
                    ) : (
                      <span>Posisikan wajah tegak lurus di dalam garis oval</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 border border-slate-800">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Kamera Tidak Aktif
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    {cameraError ||
                      'Klik tombol di bawah untuk mengaktifkan kamera atau gunakan tombol simulasi wajah siswa.'}
                  </p>
                </div>
                <button
                  onClick={() => startCamera(selectedDeviceId)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Aktifkan Kamera
                </button>
              </div>
            )}

            {/* Hidden Offscreen Canvas for Snapshot Extraction */}
            <canvas ref={hiddenCanvasRef} className="hidden" />
          </div>

          {/* Camera Controls & Device Picker */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => (cameraActive ? stopCamera() : startCamera(selectedDeviceId))}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  cameraActive
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    Matikan Kamera
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Nyalakan Kamera
                  </>
                )}
              </button>

              {availableDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCamera(e.target.value);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  {availableDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Kamera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Batas Jam: <strong className="text-slate-800">{settings.timeCheckInDeadline}</strong>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                {settings.voiceNotification ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
                Suara {settings.voiceNotification ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>

          {/* Quick Simulation Bar (Allows instant testing with registered students) */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Uji Cepat / Simulasi Presensi Wajah Siswa
              </span>
              <span className="text-[11px] text-slate-500">
                Klik siswa untuk menguji rekognisi seketika
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {students.slice(0, 4).map((student) => (
                <button
                  key={student.id}
                  onClick={() => triggerSimulation(student)}
                  className="flex items-center gap-2.5 p-2 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all text-left group"
                >
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 truncate">
                      {student.name.split(' ')[0]} {student.name.split(' ')[1] || ''}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {student.classId}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Activity Feed & Recognition Popups (5 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Active Recognition Popup Card */}
          {recentMatch && (
            <div className="bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-start gap-3.5">
                <img
                  src={recentMatch.record.capturedPhoto || recentMatch.student.photoUrl}
                  alt={recentMatch.student.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400 shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>BERHASIL PRESENSI!</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                    {recentMatch.student.name}
                  </h4>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium">{recentMatch.student.nis}</span>
                    <span>·</span>
                    <span className="font-medium">{recentMatch.student.classId}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {recentMatch.record.time} WIB
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        recentMatch.record.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {recentMatch.record.status === 'late' ? 'Terlambat' : 'Tepat Waktu'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Notice Warning Card */}
          {duplicateNotice && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong className="block font-semibold">Sudah Presensi</strong>
                {duplicateNotice}
              </div>
            </div>
          )}

          {/* Today's Stats Counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Hadir Hari Ini</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {todayRecords.filter((r) => r.mode === 'in').length}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                dari {students.length} siswa terdaftar
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Terlambat Hari Ini</span>
              <span className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
                {todayRecords.filter((r) => r.status === 'late').length}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                setelah {settings.timeCheckInDeadline} WIB
              </span>
            </div>
          </div>

          {/* Real-time Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 flex-1 flex flex-col overflow-hidden min-h-[380px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Aktivitas Presensi Terbaru
              </h3>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {todayRecords.length} Catatan
              </span>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[460px]">
              {todayRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <UserCheck className="w-8 h-8 text-slate-300" />
                  <p className="text-xs">Belum ada siswa yang melakukan presensi hari ini.</p>
                </div>
              ) : (
                todayRecords.slice(0, 15).map((record) => (
                  <div
                    key={record.id}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {record.capturedPhoto ? (
                        <img
                          src={record.capturedPhoto}
                          alt={record.studentName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                          {record.studentName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {record.studentName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {record.classId} · NIS {record.studentNis}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-800 block tabular-nums">
                        {record.time}
                      </span>
                      <span
                        className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          record.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : record.status === 'late'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {record.status === 'present'
                          ? 'Tepat Waktu'
                          : record.status === 'late'
                          ? 'Terlambat'
                          : record.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
