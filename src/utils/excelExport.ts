import { Student, AttendanceRecord, SchoolSettings } from '../types';
import { getDaySchedule, timeToMinutes } from './scheduleStorage';

export interface MonthlyAttendanceRow {
  studentName: string;
  studentNis: string;
  studentClass: string;
  date: string;
  dayName: string;
  timeIn: string; // Jam Absen Pergi / Masuk
  timeOut: string; // Jam Absen Pulang
  attendanceStatus: string; // Tepat Waktu, Terlambat, Pulang Cepat, Sakit, Izin, Alpa, etc.
  note: string;
  statusBadgeColor: 'green' | 'amber' | 'orange' | 'blue' | 'purple' | 'red' | 'gray';
}

export interface StudentMonthlySummary {
  studentId: string;
  studentName: string;
  studentNis: string;
  studentClass: string;
  onTimeCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  sickCount: number;
  permitCount: number;
  absentCount: number;
  totalPresent: number;
  attendanceRate: number;
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Computes monthly attendance rows with exact column ordering:
 * Nama -> NIS -> Kelas -> Jam Absen Masuk (Pergi) -> Jam Absen Pulang -> Keterangan Kehadiran
 */
export function getMonthlyAttendanceData(
  records: AttendanceRecord[],
  students: Student[],
  yearMonth: string, // YYYY-MM
  classFilter: string = 'all',
  settings: SchoolSettings
): { rows: MonthlyAttendanceRow[]; summaries: StudentMonthlySummary[] } {
  const filteredStudents = students.filter(
    (s) => classFilter === 'all' || s.classId === classFilter
  );

  const monthRecords = records.filter((r) => r.date.startsWith(yearMonth));

  // Collect unique dates in the month that have attendance records or valid days
  const recordDates = Array.from(new Set(monthRecords.map((r) => r.date))).sort();

  const rows: MonthlyAttendanceRow[] = [];
  const summariesMap = new Map<string, StudentMonthlySummary>();

  // Initialize summaries for each student
  filteredStudents.forEach((s) => {
    summariesMap.set(s.id, {
      studentId: s.id,
      studentName: s.name,
      studentNis: s.nis,
      studentClass: s.classId,
      onTimeCount: 0,
      lateCount: 0,
      earlyLeaveCount: 0,
      sickCount: 0,
      permitCount: 0,
      absentCount: 0,
      totalPresent: 0,
      attendanceRate: 0,
    });
  });

  // Parse school hour thresholds
  // Process for each date in the month
  recordDates.forEach((dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = INDONESIAN_DAYS[d.getDay()] || '';
    const daySchedule = getDaySchedule(dateStr);
    const dayDeadlineMinutes = timeToMinutes(daySchedule.checkInDeadline || '07:01');
    const dayCheckOutMinutes = timeToMinutes(daySchedule.checkOutOnTimeStart || (d.getDay() === 5 ? '14:00' : '15:00'));

    filteredStudents.forEach((student) => {
      const studentDayRecords = monthRecords.filter(
        (r) => r.studentId === student.id && r.date === dateStr
      );

      const recordIn = studentDayRecords.find((r) => r.mode === 'in');
      const recordOut = studentDayRecords.find((r) => r.mode === 'out');
      const manualRecord = studentDayRecords.find((r) => r.verificationMethod === 'manual');

      // If no records for this student on this day
      if (!recordIn && !recordOut && !manualRecord) {
        return;
      }

      const summary = summariesMap.get(student.id);

      let timeIn = recordIn ? recordIn.time : '-';
      let timeOut = recordOut ? recordOut.time : '-';
      let statusLabel = 'Tepat Waktu';
      let badgeColor: MonthlyAttendanceRow['statusBadgeColor'] = 'green';
      let note = recordIn?.note || recordOut?.note || '';

      // Check special manual statuses (sakit, izin, alpa)
      const specialStatus = manualRecord?.status || recordIn?.status;
      if (specialStatus === 'sick') {
        statusLabel = 'Sakit';
        badgeColor = 'blue';
        if (summary) summary.sickCount++;
      } else if (specialStatus === 'permit') {
        statusLabel = 'Izin';
        badgeColor = 'purple';
        if (summary) summary.permitCount++;
      } else if (specialStatus === 'absent') {
        statusLabel = 'Alpa / Tanpa Keterangan';
        badgeColor = 'red';
        if (summary) summary.absentCount++;
      } else {
        // Evaluate In-Time (Late vs On-Time): before 07:01 is On-Time, >= 07:01 is Late
        let isLate = false;
        if (recordIn) {
          const inTotalMins = timeToMinutes(recordIn.time);
          if (inTotalMins >= dayDeadlineMinutes || recordIn.status === 'late') {
            isLate = true;
          }
        }

        // Evaluate Out-Time (Early Departure): Mon-Thu < 15:00, Fri < 14:00 is Early Leave
        let isEarlyLeave = false;
        if (recordOut) {
          const outTotalMins = timeToMinutes(recordOut.time);
          if (outTotalMins < dayCheckOutMinutes) {
            isEarlyLeave = true;
          }
        }

        // Determine final combined status
        if (recordIn && recordOut) {
          if (isLate && isEarlyLeave) {
            statusLabel = 'Terlambat & Pulang Cepat';
            badgeColor = 'orange';
            if (summary) {
              summary.lateCount++;
              summary.earlyLeaveCount++;
              summary.totalPresent++;
            }
          } else if (isLate) {
            statusLabel = 'Terlambat';
            badgeColor = 'amber';
            if (summary) {
              summary.lateCount++;
              summary.totalPresent++;
            }
          } else if (isEarlyLeave) {
            statusLabel = 'Pulang Cepat';
            badgeColor = 'orange';
            if (summary) {
              summary.earlyLeaveCount++;
              summary.totalPresent++;
            }
          } else {
            statusLabel = 'Tepat Waktu';
            badgeColor = 'green';
            if (summary) {
              summary.onTimeCount++;
              summary.totalPresent++;
            }
          }
        } else if (recordIn) {
          if (isLate) {
            statusLabel = 'Terlambat (Belum Absen Pulang)';
            badgeColor = 'amber';
            if (summary) {
              summary.lateCount++;
              summary.totalPresent++;
            }
          } else {
            statusLabel = 'Tepat Waktu (Belum Absen Pulang)';
            badgeColor = 'green';
            if (summary) {
              summary.onTimeCount++;
              summary.totalPresent++;
            }
          }
        } else if (recordOut) {
          if (isEarlyLeave) {
            statusLabel = 'Pulang Cepat (Tanpa Absen Masuk)';
            badgeColor = 'orange';
            if (summary) {
              summary.earlyLeaveCount++;
              summary.totalPresent++;
            }
          } else {
            statusLabel = 'Hadir (Hanya Absen Pulang)';
            badgeColor = 'green';
            if (summary) {
              summary.onTimeCount++;
              summary.totalPresent++;
            }
          }
        }
      }

      rows.push({
        studentName: student.name,
        studentNis: student.nis,
        studentClass: student.classId,
        date: dateStr,
        dayName,
        timeIn,
        timeOut,
        attendanceStatus: statusLabel,
        note,
        statusBadgeColor: badgeColor,
      });
    });
  });

  // Calculate percentage for summaries
  const summaries = Array.from(summariesMap.values()).map((s) => {
    const totalRecordedDays =
      s.totalPresent + s.sickCount + s.permitCount + s.absentCount;
    const rate =
      totalRecordedDays > 0
        ? Math.round((s.totalPresent / totalRecordedDays) * 100)
        : 100;
    return {
      ...s,
      attendanceRate: rate,
    };
  });

  return { rows, summaries };
}

/**
 * Generates an authentic Microsoft Excel .xls file with proper HTML-XML tables,
 * styled headers, borders, colors, and exact column order requested:
 * 1. Nama
 * 2. NIS
 * 3. Kelas
 * 4. Jam Absen Masuk (Pergi)
 * 5. Jam Absen Pulang
 * 6. Keterangan Kehadiran
 */
export function exportMonthlyAttendanceToXLS(
  records: AttendanceRecord[],
  students: Student[],
  yearMonth: string, // "2026-09"
  classFilter: string = 'all',
  settings: SchoolSettings
): void {
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthNameIndo = INDONESIAN_MONTHS[monthIndex] || monthStr;

  const { rows, summaries } = getMonthlyAttendanceData(
    records,
    students,
    yearMonth,
    classFilter,
    settings
  );

  const classNameLabel =
    classFilter === 'all' ? 'Semua Kelas' : `Kelas ${classFilter}`;

  const printTimestamp = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Excel HTML Table Template with Microsoft Excel Spreadsheet Namespaces
  const excelTemplate = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:x="urn:schemas-microsoft-com:office:excel" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Rekap Presensi Bulanan</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:Orientation>Landscape</x:Orientation>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      color: #1e293b;
    }
    .kop-title {
      font-size: 16pt;
      font-weight: bold;
      color: #0f172a;
      text-align: center;
    }
    .kop-subtitle {
      font-size: 13pt;
      font-weight: bold;
      color: #1e3a8a;
      text-align: center;
    }
    .kop-meta {
      font-size: 10pt;
      color: #475569;
      text-align: center;
    }
    .info-label {
      font-weight: bold;
      color: #334155;
      font-size: 10pt;
    }
    table.data-table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    table.data-table th {
      background-color: #1e3a8a;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      padding: 8px 10px;
      border: 1px solid #0f172a;
      font-size: 10.5pt;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: middle;
      font-size: 10pt;
    }
    .text-center {
      text-align: center;
    }
    .text-left {
      text-align: left;
    }
    .text-right {
      text-align: right;
    }
    .text-font-mono {
      mso-number-format: "\\@"; /* Excel text format to preserve leading zeros */
      font-family: 'Courier New', monospace;
    }
    .status-tepat-waktu {
      background-color: #dcfce7;
      color: #166534;
      font-weight: bold;
    }
    .status-terlambat {
      background-color: #fef3c7;
      color: #92400e;
      font-weight: bold;
    }
    .status-pulang-cepat {
      background-color: #ffedd5;
      color: #9a3412;
      font-weight: bold;
    }
    .status-terlambat-pulang-cepat {
      background-color: #fee2e2;
      color: #991b1b;
      font-weight: bold;
    }
    .status-sakit {
      background-color: #dbeafe;
      color: #1e40af;
      font-weight: bold;
    }
    .status-izin {
      background-color: #f3e8ff;
      color: #6b21a8;
      font-weight: bold;
    }
    .status-alpa {
      background-color: #fee2e2;
      color: #b91c1c;
      font-weight: bold;
    }
    .zebra-row {
      background-color: #f8fafc;
    }
    .summary-header {
      background-color: #0f766e !important;
      color: #ffffff;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #0f172a;
      margin-top: 15px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <!-- KOP SURAT SEKOLAH RESMI -->
  <table>
    <tr>
      <td colspan="8" class="kop-title">${settings.schoolName.toUpperCase()}</td>
    </tr>
    <tr>
      <td colspan="8" class="kop-subtitle">LAPORAN REKAPITULASI PRESENSI SISWA (FACE RECOGNITION)</td>
    </tr>
    <tr>
      <td colspan="8" class="kop-meta">NPSN: ${settings.schoolNPSN} &nbsp;|&nbsp; Alamat: ${settings.schoolAddress}</td>
    </tr>
    <tr>
      <td colspan="8" class="kop-meta">Tahun Pelajaran: ${settings.academicYear} &nbsp;|&nbsp; Semester: ${settings.semester}</td>
    </tr>
    <tr><td colspan="8">&nbsp;</td></tr>
    <tr>
      <td colspan="4" class="info-label">Periode Bulan: <strong>${monthNameIndo} ${yearStr}</strong></td>
      <td colspan="4" class="info-label" style="text-align: right;">Kelas: <strong>${classNameLabel}</strong></td>
    </tr>
    <tr>
      <td colspan="4" class="info-label">Ketentuan Jam Masuk: <strong>06:00 - ${settings.timeCheckInDeadline} WIB</strong></td>
      <td colspan="4" class="info-label" style="text-align: right;">Ketentuan Jam Pulang: <strong>&ge; ${settings.timeCheckOutStart} WIB</strong></td>
    </tr>
    <tr>
      <td colspan="8" style="font-size: 9pt; color: #64748b;">Waktu Cetak Dokumen: ${printTimestamp} WIB</td>
    </tr>
  </table>

  <br/>

  <!-- TABEL UTAMA SESUAI FORMAT PERMINTAAN USER: NAMA -> NIS -> KELAS -> JAM PULANG & PERGI -> KETERANGAN KEHADIRAN -->
  <div class="section-title">I. DAFTAR RINCIAN PRESENSI HARIAN SISWA (URUTAN FORMAT BAKU)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 40px;">No</th>
        <th style="width: 220px;">Nama Siswa</th>
        <th style="width: 110px;">NIS</th>
        <th style="width: 90px;">Kelas</th>
        <th style="width: 100px;">Tanggal</th>
        <th style="width: 120px;">Jam Absen Pergi (Masuk)</th>
        <th style="width: 120px;">Jam Absen Pulang</th>
        <th style="width: 200px;">Keterangan Kehadiran</th>
        <th style="width: 180px;">Catatan / Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows.length === 0
          ? `<tr><td colspan="9" class="text-center" style="padding: 20px; color: #94a3b8;">Tidak ada catatan presensi pada periode bulan ${monthNameIndo} ${yearStr}.</td></tr>`
          : rows
              .map((row, idx) => {
                let statusClass = 'status-tepat-waktu';
                if (row.attendanceStatus.includes('Terlambat & Pulang Cepat')) {
                  statusClass = 'status-terlambat-pulang-cepat';
                } else if (row.attendanceStatus.includes('Terlambat')) {
                  statusClass = 'status-terlambat';
                } else if (row.attendanceStatus.includes('Pulang Cepat')) {
                  statusClass = 'status-pulang-cepat';
                } else if (row.attendanceStatus.includes('Sakit')) {
                  statusClass = 'status-sakit';
                } else if (row.attendanceStatus.includes('Izin')) {
                  statusClass = 'status-izin';
                } else if (row.attendanceStatus.includes('Alpa')) {
                  statusClass = 'status-alpa';
                }

                const isZebra = idx % 2 === 1 ? 'zebra-row' : '';

                return `
      <tr class="${isZebra}">
        <td class="text-center">${idx + 1}</td>
        <td class="text-left" style="font-weight: bold;">${row.studentName}</td>
        <td class="text-center text-font-mono">'${row.studentNis}</td>
        <td class="text-center" style="font-weight: 500;">${row.studentClass}</td>
        <td class="text-center text-font-mono">${row.date} (${row.dayName})</td>
        <td class="text-center text-font-mono" style="font-weight: 600;">${row.timeIn}</td>
        <td class="text-center text-font-mono" style="font-weight: 600;">${row.timeOut}</td>
        <td class="text-center ${statusClass}">${row.attendanceStatus}</td>
        <td class="text-left" style="font-size: 9pt; color: #475569;">${row.note || '-'}</td>
      </tr>`;
              })
              .join('')
      }
    </tbody>
  </table>

  <br/>

  <!-- TABEL RINGKASAN AKUMULASI BULANAN PER SISWA -->
  <div class="section-title">II. REKAPITULASI TOTAL KEHADIRAN BULANAN PER SISWA</div>
  <table class="data-table">
    <thead>
      <tr>
        <th class="summary-header" style="width: 40px;">No</th>
        <th class="summary-header" style="width: 220px;">Nama Siswa</th>
        <th class="summary-header" style="width: 110px;">NIS</th>
        <th class="summary-header" style="width: 90px;">Kelas</th>
        <th class="summary-header" style="width: 80px;">Tepat Waktu</th>
        <th class="summary-header" style="width: 80px;">Terlambat</th>
        <th class="summary-header" style="width: 90px;">Pulang Cepat</th>
        <th class="summary-header" style="width: 70px;">Sakit</th>
        <th class="summary-header" style="width: 70px;">Izin</th>
        <th class="summary-header" style="width: 70px;">Alpa</th>
        <th class="summary-header" style="width: 90px;">Total Hadir</th>
        <th class="summary-header" style="width: 90px;">% Kehadiran</th>
      </tr>
    </thead>
    <tbody>
      ${summaries
        .map((sum, idx) => {
          const isZebra = idx % 2 === 1 ? 'zebra-row' : '';
          return `
      <tr class="${isZebra}">
        <td class="text-center">${idx + 1}</td>
        <td class="text-left" style="font-weight: bold;">${sum.studentName}</td>
        <td class="text-center text-font-mono">'${sum.studentNis}</td>
        <td class="text-center">${sum.studentClass}</td>
        <td class="text-center" style="color: #166534; font-weight: bold;">${sum.onTimeCount}</td>
        <td class="text-center" style="color: #b45309; font-weight: bold;">${sum.lateCount}</td>
        <td class="text-center" style="color: #c2410c; font-weight: bold;">${sum.earlyLeaveCount}</td>
        <td class="text-center" style="color: #1d4ed8;">${sum.sickCount}</td>
        <td class="text-center" style="color: #7e22ce;">${sum.permitCount}</td>
        <td class="text-center" style="color: #b91c1c;">${sum.absentCount}</td>
        <td class="text-center" style="font-weight: bold;">${sum.totalPresent}</td>
        <td class="text-center" style="font-weight: bold; background-color: #f0fdf4;">${sum.attendanceRate}%</td>
      </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <br/><br/>

  <!-- LEMBAR TANDA TANGAN PEJABAT SEKOLAH -->
  <table style="width: 100%; border: none;">
    <tr>
      <td colspan="4" style="text-align: left; width: 50%;">
        Mengetahui,<br/>
        Kepala Sekolah ${settings.schoolName}<br/><br/><br/><br/>
        <strong><u>Drs. H. Wardoyo, M.Pd.</u></strong><br/>
        NIP. 19680815 199403 1 004
      </td>
      <td colspan="4" style="text-align: right; width: 50%;">
        Kerjo, Karanganyar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
        Pengelola Presensi Digital & IT Sekolah<br/><br/><br/><br/>
        <strong><u>Administrator PresensiKu</u></strong><br/>
        NIP. 19850412 201001 2 018
      </td>
    </tr>
  </table>
</body>
</html>
`;

  // Create Blob with Excel MIME type and BOM for UTF-8
  const blob = new Blob(['\uFEFF' + excelTemplate], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  const cleanSchool = settings.schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanClass = classFilter === 'all' ? 'Semua_Kelas' : classFilter.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Rekap_Presensi_Bulanan_${cleanSchool}_${cleanClass}_${monthNameIndo}_${yearStr}.xls`;

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
