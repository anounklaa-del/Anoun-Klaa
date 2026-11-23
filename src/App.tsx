import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Box,
  ChevronRight,
  LayoutGrid,
  Menu,
  Printer,
  QrCode,
  Upload,
  UserPlus,
} from 'lucide-react';
import { AppSidebar, WORKSPACE_META } from './components/AppSidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { AttendanceSheetPagesBlock } from './components/AttendanceSheetRenderer';
import { AttendanceSheetStudio } from './components/AttendanceSheetStudio';
import { CardSheetPreview } from './components/CardSheetPreview';
import { StickerSheetPagesBlock } from './components/DeskStickerRenderer';
import { DeskStickerStudio } from './components/DeskStickerStudio';
import { ExportArchivePanel } from './components/ExportArchivePanel';
import { Mockup3DViewer } from './components/Mockup3DViewer';
import { SheetPagesBlock } from './components/PrintSheetRenderer';
import { ProductionDocsPanel } from './components/ProductionDocsPanel';
import { QrCodeSvg } from './components/QrCodeSvg';
import { SeatingSheetPagesBlock } from './components/SeatingPlanRenderer';
import { SeatingPlanStudio } from './components/SeatingPlanStudio';
import { StudentDataManager } from './components/StudentDataManager';
import {
  SCHEDULES_PASTE_NOVEMBER,
  STUDENTS_MASTER,
  type StudentRecord,
} from './data/pasData';
import {
  computeSheetGeometry,
  computeStickerGeometry,
  DEFAULT_ATTENDANCE_CONFIG,
  DEFAULT_PREPRESS_CONFIG,
  DEFAULT_SEATING_CONFIG,
  DEFAULT_STICKER_CONFIG,
  PAPER_DIMENSIONS,
  type AttendanceConfig,
  type CropMarkStyle,
  type FlipMode,
  type ImpositionMode,
  type MainWorkspaceTab,
  type PaperPreset,
  type PrepressConfig,
  type QrCornerPosition,
  type QrPayloadFormat,
  type SeatingConfig,
  type StickerConfig,
} from './types/prepress';
import { buildStructuredZipArchive } from './utils/archiveExporter';
import { buildAttendancePages } from './utils/attendanceBuilder';
import {
  buildDeskAssignmentLookup,
  buildDeskStickers,
  getSortedRoomList,
  normalizeRoomLabel,
} from './utils/deskStickerBuilder';
import { formatStudentQrPayload, getQrSymbolData } from './utils/qrGenerator';
import {
  buildRoomSeatingPlans,
  buildSeatingPages,
  getSeatingPaperDimensions,
} from './utils/seatingPlanBuilder';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function App() {
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pas_students_custom_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage failure
    }
    return STUDENTS_MASTER;
  });
  const [config, setConfig] = useState<PrepressConfig>(() => {
    try {
      const saved = localStorage.getItem('pas_prepress_v2_cfg');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PrepressConfig> & { gapMm?: number };
        const migratedGap =
          typeof parsed.gapMm === 'number'
            ? {
                gapXmm: parsed.gapXmm ?? parsed.gapMm,
                gapYmm: parsed.gapYmm ?? parsed.gapMm,
              }
            : {};
        return { ...DEFAULT_PREPRESS_CONFIG, ...parsed, ...migratedGap };
      }
    } catch {
      // ignore storage failure
    }
    return DEFAULT_PREPRESS_CONFIG;
  });
  const [stickerConfig, setStickerConfig] = useState<StickerConfig>(() => {
    try {
      const saved = localStorage.getItem('pas_sticker_cfg_v2');
      if (saved) return { ...DEFAULT_STICKER_CONFIG, ...JSON.parse(saved) };
    } catch {
      // ignore storage failure
    }
    return DEFAULT_STICKER_CONFIG;
  });
  const [seatingConfig, setSeatingConfig] = useState<SeatingConfig>(() => {
    try {
      const saved = localStorage.getItem('pas_seating_cfg_v3');
      if (saved) return { ...DEFAULT_SEATING_CONFIG, ...JSON.parse(saved) };
    } catch {
      // ignore storage failure
    }
    return DEFAULT_SEATING_CONFIG;
  });
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>(() => {
    try {
      const saved = localStorage.getItem('pas_attendance_cfg_v3');
      if (saved) return { ...DEFAULT_ATTENDANCE_CONFIG, ...JSON.parse(saved) };
    } catch {
      // ignore storage failure
    }
    return DEFAULT_ATTENDANCE_CONFIG;
  });
  const [activeTab, setActiveTab] = useState<MainWorkspaceTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pas_sidebar_collapsed_v1') === '1';
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [selectedStudentNo, setSelectedStudentNo] = useState<string>(STUDENTS_MASTER[0].no);
  const [sheetIndex, setSheetIndex] = useState<number>(0);
  const [stickerSheetIndex, setStickerSheetIndex] = useState<number>(0);
  const [seatingPageIndex, setSeatingPageIndex] = useState<number>(0);
  const [attendancePageIndex, setAttendancePageIndex] = useState<number>(0);
  const [printScope, setPrintScope] = useState<'all' | 'current'>('all');
  const [stickerPrintScope, setStickerPrintScope] = useState<'all' | 'current'>('all');
  const [seatingPrintScope, setSeatingPrintScope] = useState<'all' | 'current'>('all');
  const [attendancePrintScope, setAttendancePrintScope] = useState<'all' | 'current'>('all');
  const [zipBusy, setZipBusy] = useState(false);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const pendingPrintRef = useRef(false);

  const persistStudents = (next: StudentRecord[]) => {
    setStudents(next);
    try {
      localStorage.setItem('pas_students_custom_v1', JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const updateConfig = (patch: Partial<PrepressConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('pas_prepress_v2_cfg', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const updateStickerConfig = (patch: Partial<StickerConfig>) => {
    setStickerConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('pas_sticker_cfg_v2', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const updateSeatingConfig = (patch: Partial<SeatingConfig>) => {
    setSeatingConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('pas_seating_cfg_v3', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const updateAttendanceConfig = (patch: Partial<AttendanceConfig>) => {
    setAttendanceConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('pas_attendance_cfg_v3', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const handleAddStudent = (record: StudentRecord) => {
    const next = [...students, record];
    persistStudents(next);
    setSelectedStudentNo(record.no);
  };

  const handleUpdateStudent = (originalNo: string, updated: StudentRecord) => {
    const next = students.map((s) => (s.no === originalNo ? updated : s));
    persistStudents(next);
    if (selectedStudentNo === originalNo) setSelectedStudentNo(updated.no);
  };

  const handleDeleteStudent = (no: string) => {
    const next = students.filter((s) => s.no !== no);
    if (next.length === 0) return;
    persistStudents(next);
    if (selectedStudentNo === no) setSelectedStudentNo(next[0].no);
  };

  const handleResetStudents = () => {
    setStudents(STUDENTS_MASTER);
    setSelectedStudentNo(STUDENTS_MASTER[0].no);
    setSheetIndex(0);
    setStickerSheetIndex(0);
    setCsvFeedback(null);
    try {
      localStorage.removeItem('pas_students_custom_v1');
    } catch {
      // ignore
    }
  };

  const classList = useMemo(
    () => [...new Set(students.map((s) => s.kelas))],
    [students],
  );
  const roomList = useMemo(() => getSortedRoomList(students), [students]);

  const deskLookup = useMemo(() => {
    return Object.fromEntries(
      Array.from(buildDeskAssignmentLookup(students, stickerConfig.groupingMode).entries()).map(
        ([no, info]) => [no, info.mejaLabel],
      ),
    );
  }, [students, stickerConfig.groupingMode]);

  const filteredStudents = useMemo(() => {
    const fromNum = config.noFrom ? Number(config.noFrom) : 0;
    const toNum = config.noTo ? Number(config.noTo) : 1e9;
    return students.filter((s) => {
      if (config.selectedClass && s.kelas !== config.selectedClass) return false;
      if (config.selectedRoom && normalizeRoomLabel(s.ruang) !== config.selectedRoom) return false;
      const n = Number(s.no);
      if (!Number.isNaN(n) && (n < fromNum || n > toNum)) return false;
      return true;
    });
  }, [students, config.selectedClass, config.selectedRoom, config.noFrom, config.noTo]);

  const cardFilterDesc = useMemo(() => {
    const parts: string[] = [];
    if (config.selectedClass) parts.push(`Kelas ${config.selectedClass}`);
    if (config.selectedRoom) parts.push(`RUANG ${config.selectedRoom}`);
    if (config.noFrom || config.noTo) {
      parts.push(`No. ${config.noFrom || '001'}–${config.noTo || 'akhir'}`);
    }
    return parts.join(' · ') || 'Semua Kartu Aktif';
  }, [config.selectedClass, config.selectedRoom, config.noFrom, config.noTo]);

  const selectedStudent = useMemo(() => {
    return (
      filteredStudents.find((s) => s.no === selectedStudentNo) ??
      filteredStudents[0] ??
      students[0]
    );
  }, [filteredStudents, selectedStudentNo, students]);

  const geo = useMemo(() => computeSheetGeometry(config), [config]);
  const totalSheets = Math.max(1, Math.ceil(filteredStudents.length / geo.cardsPerSheet));
  const safeSheetIdx = Math.min(sheetIndex, totalSheets - 1);

  const printSheetIndices = useMemo(() => {
    if (printScope === 'current') return [safeSheetIdx];
    return Array.from({ length: totalSheets }, (_, i) => i);
  }, [printScope, safeSheetIdx, totalSheets]);

  const totalCardPrintPages = useMemo(() => {
    if (config.imposition === 'calibration') return 2;
    const sheetCount = printSheetIndices.length;
    return config.imposition === 'duplex' ? sheetCount * 2 : sheetCount;
  }, [config.imposition, printSheetIndices.length]);

  const filteredStickers = useMemo(() => {
    const base = buildDeskStickers(
      students,
      stickerConfig.groupingMode,
      stickerConfig.selectedRoom || undefined,
    );
    const q = stickerConfig.searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((st) => {
      if (st.mejaLabel.toLowerCase().includes(q) || `ruang ${st.ruang}`.toLowerCase().includes(q)) {
        return true;
      }
      return st.slots.some(
        (slot) =>
          slot.student &&
          (slot.student.nama.toLowerCase().includes(q) ||
            slot.student.no.toLowerCase().includes(q) ||
            slot.student.kelas.toLowerCase().includes(q)),
      );
    });
  }, [
    students,
    stickerConfig.groupingMode,
    stickerConfig.selectedRoom,
    stickerConfig.searchQuery,
  ]);

  const stickerGeo = useMemo(
    () => computeStickerGeometry(config, stickerConfig),
    [config, stickerConfig],
  );
  const totalStickerSheets = Math.max(
    1,
    Math.ceil(filteredStickers.length / stickerGeo.stickersPerSheet),
  );
  const safeStickerSheetIdx = Math.min(stickerSheetIndex, totalStickerSheets - 1);
  const printStickerIndices = useMemo(() => {
    if (stickerPrintScope === 'current') return [safeStickerSheetIdx];
    return Array.from({ length: totalStickerSheets }, (_, i) => i);
  }, [stickerPrintScope, safeStickerSheetIdx, totalStickerSheets]);

  const seatingRoomPlans = useMemo(
    () =>
      buildRoomSeatingPlans(
        students,
        filteredStudents,
        stickerConfig.groupingMode,
        seatingConfig,
        cardFilterDesc,
      ),
    [students, filteredStudents, stickerConfig.groupingMode, seatingConfig, cardFilterDesc],
  );
  const seatingPages = useMemo(
    () => buildSeatingPages(seatingRoomPlans, seatingConfig.variant),
    [seatingRoomPlans, seatingConfig.variant],
  );
  const safeSeatingPageIdx = Math.min(seatingPageIndex, Math.max(0, seatingPages.length - 1));
  const printSeatingPages = useMemo(() => {
    if (seatingPrintScope === 'current') {
      return seatingPages[safeSeatingPageIdx] ? [seatingPages[safeSeatingPageIdx]] : [];
    }
    return seatingPages;
  }, [seatingPages, seatingPrintScope, safeSeatingPageIdx]);

  const seatingDims = useMemo(
    () => getSeatingPaperDimensions(config, seatingConfig.paperOrientation),
    [config, seatingConfig.paperOrientation],
  );

  const attendanceResult = useMemo(
    () =>
      buildAttendancePages(
        students,
        filteredStudents,
        stickerConfig.groupingMode,
        config,
        attendanceConfig,
        cardFilterDesc,
      ),
    [students, filteredStudents, stickerConfig.groupingMode, config, attendanceConfig, cardFilterDesc],
  );
  const attendancePages = attendanceResult.pages;
  const safeAttendancePageIdx = Math.min(
    attendancePageIndex,
    Math.max(0, attendancePages.length - 1),
  );
  const printAttendancePages = useMemo(() => {
    if (attendancePrintScope === 'current') {
      return attendancePages[safeAttendancePageIdx]
        ? [attendancePages[safeAttendancePageIdx]]
        : [];
    }
    return attendancePages;
  }, [attendancePages, attendancePrintScope, safeAttendancePageIdx]);

  const attendanceDims = useMemo(
    () => getSeatingPaperDimensions(config, attendanceConfig.paperOrientation),
    [config, attendanceConfig.paperOrientation],
  );

  const totalPrintPages =
    activeTab === 'sticker'
      ? printStickerIndices.length
      : activeTab === 'seating'
        ? printSeatingPages.length
        : activeTab === 'attendance'
          ? printAttendancePages.length
          : totalCardPrintPages;

  const missingScheduleCount = useMemo(
    () => filteredStudents.filter((s) => !SCHEDULES_PASTE_NOVEMBER[s.kelas]).length,
    [filteredStudents],
  );

  // Trigger native browser print after React flushes any scope change to print-only DOM
  useEffect(() => {
    if (!pendingPrintRef.current) return;
    pendingPrintRef.current = false;
    const timer = requestAnimationFrame(() => {
      window.print();
    });
    return () => cancelAnimationFrame(timer);
  }, [
    printScope,
    stickerPrintScope,
    seatingPrintScope,
    attendancePrintScope,
    safeSheetIdx,
    safeStickerSheetIdx,
    safeSeatingPageIdx,
    safeAttendancePageIdx,
    filteredStudents,
    filteredStickers,
    seatingPages,
    attendancePages,
    config,
    stickerConfig,
    seatingConfig,
    attendanceConfig,
  ]);

  const handleDirectPrint = (scopeOverride?: 'all' | 'current') => {
    const targetScope = scopeOverride ?? printScope;
    if (targetScope !== printScope) {
      pendingPrintRef.current = true;
      setPrintScope(targetScope);
    } else {
      window.print();
    }
  };

  const handleStickerPrint = (scopeOverride?: 'all' | 'current') => {
    const targetScope = scopeOverride ?? stickerPrintScope;
    if (targetScope !== stickerPrintScope) {
      pendingPrintRef.current = true;
      setStickerPrintScope(targetScope);
    } else {
      window.print();
    }
  };

  const handleSeatingPrint = (scopeOverride?: 'all' | 'current') => {
    const targetScope = scopeOverride ?? seatingPrintScope;
    if (targetScope !== seatingPrintScope) {
      pendingPrintRef.current = true;
      setSeatingPrintScope(targetScope);
    } else {
      window.print();
    }
  };

  const handleAttendancePrint = (scopeOverride?: 'all' | 'current') => {
    const targetScope = scopeOverride ?? attendancePrintScope;
    if (targetScope !== attendancePrintScope) {
      pendingPrintRef.current = true;
      setAttendancePrintScope(targetScope);
    } else {
      window.print();
    }
  };

  const handleCsvUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const delim = text.includes('\t')
      ? '\t'
      : text.includes(';') && !text.includes(',')
        ? ';'
        : ',';
    const rows = text
      .split(/\r?\n/)
      .filter((x) => x.trim())
      .map((line) => line.split(delim).map((v) => v.trim().replace(/^"|"$/g, '')));
    if (rows.length > 0 && /no/i.test(rows[0][0]) && Number.isNaN(Number(rows[0][0]))) {
      rows.shift();
    }
    const parsed: StudentRecord[] = rows
      .filter((r) => r[0])
      .map((r) => ({
        no: r[0],
        nama: r[1] || '',
        kelas: r[2] || '',
        ruang: r[3] || '',
        user: r[4] || r[0],
      }));
    if (parsed.length > 0) {
      persistStudents(parsed);
      setSelectedStudentNo(parsed[0].no);
      setSheetIndex(0);
      setStickerSheetIndex(0);
      setCsvFeedback(`Terimpor ${parsed.length} data siswa dari ${file.name}`);
    }
    ev.target.value = '';
  };

  const handleQuickArchiveDownload = async () => {
    if (zipBusy) return;
    setZipBusy(true);
    try {
      const batch = filteredStudents.length > 0 ? filteredStudents : [selectedStudent];
      const res = await buildStructuredZipArchive(
        batch,
        config,
        undefined,
        students,
        stickerConfig.groupingMode,
      );
      const slug = config.selectedClass
        ? config.selectedClass.replace(/\s+/g, '_')
        : `${batch.length}Siswa`;
      triggerBlobDownload(res.blob, `SMAN1ALALAK_PAS2026_Arsip_Pracetak_${slug}.zip`);
    } finally {
      setZipBusy(false);
    }
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pas_sidebar_collapsed_v1', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSelectWorkspaceTab = (tab: MainWorkspaceTab) => {
    setActiveTab(tab);
  };

  const handleResetCardFilter = () => {
    updateConfig({ selectedClass: '', selectedRoom: '', noFrom: '', noTo: '' });
    setSheetIndex(0);
  };

  const handleQuickJumpRoom = (
    room: string,
    targetTab: 'studio' | 'sticker' | 'seating' | 'attendance',
  ) => {
    if (targetTab === 'studio') {
      updateConfig({ selectedRoom: room, selectedClass: '', noFrom: '', noTo: '' });
      setSheetIndex(0);
    } else if (targetTab === 'sticker') {
      updateStickerConfig({ selectedRoom: room });
      setStickerSheetIndex(0);
    } else if (targetTab === 'seating') {
      updateSeatingConfig({ selectedRoom: room, seatingMode: 'student_card', dataSource: 'room' });
      setSeatingPageIndex(0);
    } else if (targetTab === 'attendance') {
      updateAttendanceConfig({ selectedRoom: room, groupingMode: 'per_ruang' });
      setAttendancePageIndex(0);
    }
    setActiveTab(targetTab);
  };

  const handleUseScheduleForAttendance = (session: {
    subject: string;
    date: string;
    time: string;
  }) => {
    updateAttendanceConfig({
      subjectName: session.subject,
      examDate: session.date,
      examTime: session.time,
    });
    setAttendancePageIndex(0);
    setActiveTab('attendance');
  };

  const hasActiveCardFilter = Boolean(
    config.selectedClass || config.selectedRoom || config.noFrom || config.noTo,
  );
  const routeMeta = WORKSPACE_META[activeTab];

  const activePageW =
    activeTab === 'seating'
      ? seatingDims.paperW
      : activeTab === 'attendance'
        ? attendanceDims.paperW
        : geo.paperW;
  const activePageH =
    activeTab === 'seating'
      ? seatingDims.paperH
      : activeTab === 'attendance'
        ? attendanceDims.paperH
        : geo.paperH;

  return (
    <>
      {/* Dynamic @page physical dimensions for 1:1mm browser printing */}
      <style>{`@page { size: ${activePageW}mm ${activePageH}mm; margin: 0; }`}</style>

      {/* Interactive Screen Application: Grouped Collapsible Sidebar + Top Breadcrumb Header + Workspace */}
      <div className="screen-only flex h-screen w-screen overflow-hidden bg-[#F4F6FA] text-[#131C31]">
        <AppSidebar
          activeTab={activeTab}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onSelectTab={handleSelectWorkspaceTab}
          onToggleCollapsed={toggleSidebarCollapsed}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          counts={{
            totalStudents: students.length,
            filteredStudents: filteredStudents.length,
            stickers: filteredStickers.length,
            seatingPages: seatingPages.length,
            attendancePages: attendancePages.length,
          }}
          paper={config.paper}
          dpi={config.dpi}
          hasActiveCardFilter={hasActiveCardFilter}
          cardFilterDesc={cardFilterDesc}
          onResetCardFilter={handleResetCardFilter}
        />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Bar Contract: Mobile Toggle + Breadcrumb Trail Left — Primary Actions Right */}
          <header className="no-print h-14 px-4 lg:px-6 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-6 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Buka menu navigasi"
                className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] text-[#1F3864] hover:bg-[#F1F5F9] transition-colors shrink-0"
              >
                <Menu className="w-4 h-4" />
              </button>

              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
                <span className="text-[#64748B] font-medium whitespace-nowrap hidden sm:inline">
                  {routeMeta.groupLabel}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 hidden sm:inline" />
                <span className="font-display font-bold text-sm text-[#131C31] truncate whitespace-nowrap">
                  {routeMeta.label}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  activeTab === 'sticker'
                    ? handleStickerPrint()
                    : activeTab === 'seating'
                      ? handleSeatingPrint()
                      : activeTab === 'attendance'
                        ? handleAttendancePrint()
                        : handleDirectPrint()
                }
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C9A227] hover:bg-[#B8921D] text-[#0F172A] text-xs font-bold shadow-xs hover:shadow transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
                title={
                  activeTab === 'sticker'
                    ? `Cetak langsung ${totalPrintPages} halaman Stiker Meja`
                    : activeTab === 'seating'
                      ? `Cetak langsung ${totalPrintPages} halaman Denah Tempat Duduk`
                      : activeTab === 'attendance'
                        ? `Cetak langsung ${totalPrintPages} halaman Daftar Hadir Peserta`
                        : `Cetak langsung ${totalCardPrintPages} halaman Kartu PAS`
                }
              >
                <Printer className="w-3.5 h-3.5" />
                {activeTab === 'sticker'
                  ? `Cetak Stiker (${totalPrintPages} Hal)`
                  : activeTab === 'seating'
                    ? `Cetak Denah (${totalPrintPages} Hal)`
                    : activeTab === 'attendance'
                      ? `Cetak Absen (${totalPrintPages} Hal)`
                      : `Cetak Kartu (${totalCardPrintPages} Hal)`}
              </button>
              <button
                type="button"
                disabled={zipBusy}
                onClick={handleQuickArchiveDownload}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F3864] hover:bg-[#172B4D] disabled:opacity-60 text-white text-xs font-semibold shadow-xs hover:shadow transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <Archive className="w-3.5 h-3.5 text-[#C9A227]" />
                {zipBusy ? 'Mengemas ZIP...' : 'Unduh Arsip ZIP'}
              </button>
            </div>
          </header>

          {/* Main Split Workspace */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {(activeTab === 'studio' || activeTab === 'mockup3d') && (
              <aside className="no-print w-72 xl:w-[300px] shrink-0 bg-white border-r border-[#DCE2EE] overflow-y-auto p-4 space-y-5 text-xs">
              {/* Section 1: Paper, Trim Size, Bleed, Manual Margins & Spacing */}
              <div>
                <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">
                  Kertas, Ukuran, Bleed &amp; Jarak
                </h2>

                <label className="block text-[#44546A] font-medium mb-1">Ukuran Kertas</label>
                <select
                  value={config.paper}
                  onChange={(e) => updateConfig({ paper: e.target.value as PaperPreset })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
                >
                  {Object.entries(PAPER_DIMENSIONS).map(([k, [, , label]]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                  <option value="custom">Kustom (mm)...</option>
                </select>

                {config.paper === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-[#44546A] mb-0.5">Lebar Kertas mm</label>
                      <input
                        type="number"
                        step="0.5"
                        value={config.customW}
                        onChange={(e) => updateConfig({ customW: Number(e.target.value) || 210 })}
                        className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[#44546A] mb-0.5">Tinggi Kertas mm</label>
                      <input
                        type="number"
                        step="0.5"
                        value={config.customH}
                        onChange={(e) => updateConfig({ customH: Number(e.target.value) || 297 })}
                        className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Lebar mm</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.cardW}
                      onChange={(e) => updateConfig({ cardW: Math.max(40, Number(e.target.value) || 101.6) })}
                      className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Tinggi mm</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.cardH}
                      onChange={(e) => updateConfig({ cardH: Math.max(30, Number(e.target.value) || 68.4) })}
                      className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Bleed mm</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="6"
                      value={config.bleedMm}
                      onChange={(e) => updateConfig({ bleedMm: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                </div>

                {/* Manual Card Spacing (Jarak Antar Kartu) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#44546A] font-medium">Jarak Antar Kartu Manual (mm)</label>
                    <div className="flex items-center gap-1">
                      {[0, 3, 6].map((presetGap) => (
                        <button
                          key={presetGap}
                          type="button"
                          onClick={() => updateConfig({ gapXmm: presetGap, gapYmm: presetGap })}
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] border transition-colors ${
                            config.gapXmm === presetGap && config.gapYmm === presetGap
                              ? 'bg-[#1F3864] text-white border-[#1F3864]'
                              : 'bg-[#F8FAFC] text-[#44546A] border-[#E2E8F0] hover:bg-[#EEF2FA]'
                          }`}
                        >
                          {presetGap}mm
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#64748B] mb-0.5">Jarak Kolom / X (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={config.gapXmm}
                        onChange={(e) => updateConfig({ gapXmm: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#64748B] mb-0.5">Jarak Baris / Y (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={config.gapYmm}
                        onChange={(e) => updateConfig({ gapYmm: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Manual vs Symmetric Auto Paper Margins */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[#44546A] font-medium">Margin Kertas</label>
                    <div className="inline-flex p-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg gap-0.5">
                      <button
                        type="button"
                        onClick={() => updateConfig({ marginMode: 'auto' })}
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                          config.marginMode === 'auto'
                            ? 'bg-[#1F3864] text-white shadow-2xs'
                            : 'text-[#475569] hover:text-[#131C31]'
                        }`}
                      >
                        Otomatis
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateConfig({
                            marginMode: 'manual',
                            marginLeftMm: +geo.originX.toFixed(2),
                            marginRightMm: +geo.marginRightActual.toFixed(2),
                            marginTopMm: +geo.originY.toFixed(2),
                            marginBottomMm: +geo.marginBottomActual.toFixed(2),
                          })
                        }
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                          config.marginMode === 'manual'
                            ? 'bg-[#1F3864] text-white shadow-2xs'
                            : 'text-[#475569] hover:text-[#131C31]'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  {config.marginMode === 'auto' ? (
                    <div>
                      <label className="block text-[11px] text-[#64748B] mb-0.5">
                        Margin Minimum Simetris (mm)
                      </label>
                      <input
                        type="number"
                        step="0.2"
                        min="0"
                        value={config.marginMm}
                        onChange={(e) => updateConfig({ marginMm: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-[#64748B] mb-0.5">Atas (Top) mm</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={config.marginTopMm}
                            onChange={(e) => updateConfig({ marginTopMm: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#64748B] mb-0.5">Bawah (Bottom) mm</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={config.marginBottomMm}
                            onChange={(e) => updateConfig({ marginBottomMm: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#64748B] mb-0.5">Kiri (Left) mm</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={config.marginLeftMm}
                            onChange={(e) => updateConfig({ marginLeftMm: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#64748B] mb-0.5">Kanan (Right) mm</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={config.marginRightMm}
                            onChange={(e) => updateConfig({ marginRightMm: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`mt-2.5 p-3 rounded-xl border font-mono text-[11px] tabular-nums ${
                    geo.overflowsPaper
                      ? 'bg-[#FEF3C7] border-[#D97706] text-[#92400E]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1F3864]'
                  }`}
                >
                  <div>
                    Grid: <strong>{geo.cols} × {geo.rows} = {geo.cardsPerSheet} kartu/lembar</strong>
                  </div>
                  <div className={geo.overflowsPaper ? 'text-[#92400E]' : 'text-[#55637A]'}>
                    Depan: Kiri {geo.originX.toFixed(1)} · Kanan {geo.marginRightActual.toFixed(1)} · Atas {geo.originY.toFixed(1)} · Bawah {geo.marginBottomActual.toFixed(1)} mm
                  </div>
                  {config.marginMode === 'manual' && (
                    <div className="text-[#55637A]">
                      Mirror Belakang ({config.flipMode}): X {geo.backOriginX.toFixed(1)} · Y {geo.backOriginY.toFixed(1)} mm
                    </div>
                  )}
                  {geo.overflowsPaper && (
                    <div className="font-semibold mt-1">
                      Perhatian: Kartu melebihi batas ukuran kertas. Kurangi margin atau jarak.
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Crop Marks, Fold Marks & Duplex Symmetry */}
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">
                  Presisi Potong, Lipat &amp; Bolak-Balik
                </h2>

                <label className="block text-[#44546A] font-medium mb-1">Mode Imposisi Cetak</label>
                <select
                  value={config.imposition}
                  onChange={(e) => updateConfig({ imposition: e.target.value as ImpositionMode })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31] mb-2.5"
                >
                  <option value="duplex">Duplex Bolak-Balik Simetris (Depan-Belakang)</option>
                  <option value="foldable">Lipat &amp; Tempel Presisi (1 Sisi + Garis Lipat)</option>
                  <option value="front">Depan Saja</option>
                  <option value="back">Belakang Saja (Paste November)</option>
                  <option value="calibration">Tes Kalibrasi Presisi (+ / ○)</option>
                </select>

                <label className="block text-[#44546A] font-medium mb-1">Garis Potong (Crop Marks)</label>
                <select
                  value={config.cropStyle}
                  onChange={(e) => updateConfig({ cropStyle: e.target.value as CropMarkStyle })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
                >
                  <option value="full">Garis Tipis Penuh + Crop Marks Tepi</option>
                  <option value="crop">Sudut Crop Marks + Tanda Silang</option>
                  <option value="none">Tanpa Garis Potong</option>
                </select>

                <label className="flex items-center gap-2 text-[#334155] mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.cutOnBack}
                    onChange={(e) => updateConfig({ cutOnBack: e.target.checked })}
                    className="accent-[#1F3864]"
                  />
                  Cetak crop &amp; fold marks juga di sisi belakang
                </label>

                <label className="block text-[#44546A] font-medium mb-1">Cara Balik Kertas (Duplex)</label>
                <select
                  value={config.flipMode}
                  onChange={(e) => updateConfig({ flipMode: e.target.value as FlipMode })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
                >
                  <option value="long">Balik Sisi Panjang (Long-edge) — Umum</option>
                  <option value="short">Balik Sisi Pendek (Short-edge)</option>
                </select>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Kalibrasi X (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.dx}
                      onChange={(e) => updateConfig({ dx: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Kalibrasi Y (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.dy}
                      onChange={(e) => updateConfig({ dy: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                </div>

                {config.imposition === 'back' && (
                  <label className="flex items-center gap-2 text-[#334155] mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.reverseBackOrder}
                      onChange={(e) => updateConfig({ reverseBackOrder: e.target.checked })}
                      className="accent-[#1F3864]"
                    />
                    Urutan terbalik (duplex manual)
                  </label>
                )}
              </div>

              {/* Section 3: Student Filter & Paste November Class Selector */}
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">
                  Filter Siswa &amp; Sampel 3D
                </h2>

                <label className="block text-[#44546A] font-medium mb-1">Kelas (Jadwal Paste November)</label>
                <select
                  value={config.selectedClass}
                  onChange={(e) => {
                    updateConfig({ selectedClass: e.target.value });
                    setSheetIndex(0);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
                >
                  <option value="">Semua Kelas ({students.length} siswa)</option>
                  {classList.map((k) => (
                    <option key={k} value={k}>
                      {k} ({SCHEDULES_PASTE_NOVEMBER[k]?.length ?? 0} mapel)
                    </option>
                  ))}
                </select>

                <label className="block text-[#44546A] font-medium mb-1">Ruang Ujian</label>
                <select
                  value={config.selectedRoom}
                  onChange={(e) => {
                    updateConfig({ selectedRoom: e.target.value });
                    setSheetIndex(0);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
                >
                  <option value="">Semua Ruang ({roomList.length} ruang)</option>
                  {roomList.map((r) => (
                    <option key={r} value={r}>
                      RUANG {r}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div>
                    <label className="block text-[#44546A] mb-0.5">No. dari</label>
                    <input
                      type="number"
                      placeholder="001"
                      value={config.noFrom}
                      onChange={(e) => {
                        updateConfig({ noFrom: e.target.value });
                        setSheetIndex(0);
                      }}
                      className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Sampai</label>
                    <input
                      type="number"
                      placeholder="620"
                      value={config.noTo}
                      onChange={(e) => {
                        updateConfig({ noTo: e.target.value });
                        setSheetIndex(0);
                      }}
                      className="w-full px-2 py-1 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                </div>

                <label className="block text-[#44546A] font-medium mb-1">
                  Siswa Aktif (Mockup 3D &amp; SVG)
                </label>
                <select
                  value={selectedStudent.no}
                  onChange={(e) => setSelectedStudentNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31] mb-2.5"
                >
                  {filteredStudents.slice(0, 120).map((s) => (
                    <option key={s.no} value={s.no}>
                      #{s.no} — {s.nama} ({s.kelas})
                    </option>
                  ))}
                </select>

                <label className="flex items-start gap-2 text-[#334155] mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showDeskOnCard}
                    onChange={(e) => updateConfig({ showDeskOnCard: e.target.checked })}
                    className="accent-[#1F3864] mt-0.5"
                  />
                  <span>
                    Sinkron No. Meja pada Kartu (
                    <span className="font-mono text-[#1F3864]">
                      {selectedStudent.ruang} ({deskLookup[selectedStudent.no] ?? 'MEJA 01'})
                    </span>
                    )
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 mb-2 rounded-lg bg-[#EEF2FA] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-[#1F3864] font-semibold transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Tambah / Kelola Data Manual
                </button>

                <label className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-[#94A3B8] hover:border-[#1F3864] hover:bg-[#F8FAFC] text-[#1F3864] font-medium cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Impor CSV Siswa Baru
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
                {csvFeedback && (
                  <p className="text-[11px] text-[#059669] mt-1.5 font-medium">{csvFeedback}</p>
                )}
                {missingScheduleCount > 0 && (
                  <p className="text-[11px] text-[#B45309] mt-1.5 font-medium">
                    {missingScheduleCount} siswa memakai kelas di luar jadwal Paste November.
                  </p>
                )}
              </div>

              {/* Section 3B: QR Code Absensi Digital (Sudut Kartu) */}
              <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#1F3864]" />
                    Kode QR Absensi Ruang
                  </h2>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1F3864] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showQrCode}
                      onChange={(e) => updateConfig({ showQrCode: e.target.checked })}
                      className="accent-[#1F3864]"
                    />
                    Aktif
                  </label>
                </div>

                {config.showQrCode && (
                  <>
                    <div>
                      <label className="block text-[#44546A] font-medium mb-1">
                        Posisi Sudut Kartu Ujian
                      </label>
                      <select
                        value={config.qrCorner}
                        onChange={(e) =>
                          updateConfig({ qrCorner: e.target.value as QrCornerPosition })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31]"
                      >
                        <option value="bottom_right">Sudut Kanan Bawah (Bawaan)</option>
                        <option value="bottom_left">Sudut Kiri Bawah (+ Info Scan)</option>
                        <option value="top_right">Sudut Kanan Atas (Header)</option>
                        <option value="top_left">Sudut Kiri Atas (Header)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[#44546A] font-medium mb-1">
                          Data Tersandi (Payload)
                        </label>
                        <select
                          value={config.qrFormat}
                          onChange={(e) =>
                            updateConfig({ qrFormat: e.target.value as QrPayloadFormat })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31]"
                        >
                          <option value="full_no">No. Peserta Lengkap</option>
                          <option value="short_no">No. Urut Saja</option>
                          <option value="json">JSON Lengkap Siswa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#44546A] font-medium mb-1">
                          Ukuran mm
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="11"
                          max="17"
                          value={config.qrSizeMm}
                          onChange={(e) =>
                            updateConfig({
                              qrSizeMm: Math.max(10.5, Math.min(17.5, Number(e.target.value) || 13.5)),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3">
                      <div className="w-14 h-14 p-1 rounded-lg bg-white border border-[#1F3864] shrink-0">
                        <QrCodeSvg
                          student={selectedStudent}
                          format={config.qrFormat}
                          mejaLabel={
                            config.showDeskOnCard ? deskLookup[selectedStudent.no] : undefined
                          }
                          className="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[#1F3864] truncate">
                          Uji Scan #{selectedStudent.no}
                        </div>
                        <div className="font-mono text-[10px] text-[#475569] break-all leading-tight mt-0.5">
                          {formatStudentQrPayload(
                            selectedStudent,
                            config.qrFormat,
                            config.showDeskOnCard ? deskLookup[selectedStudent.no] : undefined,
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const payload = formatStudentQrPayload(
                              selectedStudent,
                              config.qrFormat,
                              config.showDeskOnCard ? deskLookup[selectedStudent.no] : undefined,
                            );
                            const sym = getQrSymbolData(payload);
                            const svgStr = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sym.viewBoxSize} ${sym.viewBoxSize}" width="240" height="240" shape-rendering="crispEdges"><rect width="${sym.viewBoxSize}" height="${sym.viewBoxSize}" fill="#FFFFFF"/><path d="${sym.pathData}" fill="#000000"/></svg>`;
                            triggerBlobDownload(
                              new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }),
                              `QR_Peserta_${selectedStudent.no}.svg`,
                            );
                          }}
                          className="mt-1.5 text-[10px] font-semibold text-[#1F3864] underline hover:text-[#24407F]"
                        >
                          Unduh QR SVG ({selectedStudent.no})
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Section 4: Direct Print Command */}
              <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
                <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B]">
                  Perintah Cetak Langsung
                </h2>

                <div>
                  <label className="block text-[#44546A] font-medium mb-1">Cakupan Halaman Cetak</label>
                  <select
                    value={printScope}
                    onChange={(e) => setPrintScope(e.target.value as 'all' | 'current')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31]"
                  >
                    <option value="all">
                      Semua Lembar ({totalSheets} lembar · {config.imposition === 'duplex' ? totalSheets * 2 : totalSheets} hal)
                    </option>
                    <option value="current">
                      Hanya Lembar Aktif (Lembar {safeSheetIdx + 1})
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleDirectPrint()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1F3864] hover:bg-[#172B4D] text-white font-bold text-xs shadow-xs hover:shadow transition-all duration-150 active:scale-[0.98]"
                >
                  <Printer className="w-4 h-4 text-[#C9A227]" />
                  Cetak Langsung ({totalPrintPages} Halaman)
                </button>

                <div className="p-3 rounded-xl bg-[#EEF2FA] border border-[#DCE2EE] text-[11px] text-[#334155] leading-relaxed">
                  <strong className="text-[#1F3864]">Saat dialog cetak:</strong> pilih skala{' '}
                  <strong>100% / Actual size</strong>, margin <strong>None</strong>, matikan header &amp; footer, ukuran kertas sama ({config.paper}), aktifkan <strong>Duplex ({config.flipMode === 'long' ? 'Long-edge' : 'Short-edge'})</strong>.
                </div>
              </div>
            </aside>
          )}

            <main className="flex-1 min-w-0 h-full overflow-hidden">
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  students={students}
                  filteredStudents={filteredStudents}
                  config={config}
                  stickerConfig={stickerConfig}
                  seatingConfig={seatingConfig}
                  attendanceConfig={attendanceConfig}
                  stats={{
                    cardsPerSheet: geo.cardsPerSheet,
                    cardSheets: totalSheets,
                    stickerCount: filteredStickers.length,
                    stickerSheets: totalStickerSheets,
                    seatingPages: seatingPages.length,
                    attendancePages: attendancePages.length,
                    missingScheduleCount,
                  }}
                  onNavigateTab={handleSelectWorkspaceTab}
                  onQuickJumpRoom={handleQuickJumpRoom}
                  onUseScheduleForAttendance={handleUseScheduleForAttendance}
                  onPrintCards={() => handleDirectPrint()}
                />
              )}
              {(activeTab === 'studio' || activeTab === 'mockup3d') && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="no-print bg-white border-b border-[#E2E8F0] px-4 py-2 flex items-center justify-between gap-3 shrink-0">
                  <div className="inline-flex p-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg gap-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('studio')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        activeTab === 'studio'
                          ? 'bg-[#1F3864] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#131C31]'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Lembar Cetak 2D
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('mockup3d')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        activeTab === 'mockup3d'
                          ? 'bg-[#1F3864] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#131C31]'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      Pratinjau Mockup 3D
                    </button>
                  </div>
                  <span className="font-mono text-[11px] text-[#64748B] truncate tabular-nums">
                    Sampel aktif: #{selectedStudent.no} {selectedStudent.nama} ({selectedStudent.kelas})
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {activeTab === 'studio' ? (
                    <CardSheetPreview
                      students={filteredStudents}
                      config={config}
                      selectedStudent={selectedStudent}
                      deskLookup={deskLookup}
                      sheetIndex={safeSheetIdx}
                      onSheetIndexChange={setSheetIndex}
                      onSelectStudent={(s) => setSelectedStudentNo(s.no)}
                      onConfigChange={updateConfig}
                      onPrintBatch={handleDirectPrint}
                    />
                  ) : (
                    <Mockup3DViewer
                      student={selectedStudent}
                      config={config}
                      deskLabel={deskLookup[selectedStudent.no]}
                    />
                  )}
                </div>
              </div>
            )}
            {activeTab === 'sticker' && (
              <DeskStickerStudio
                students={students}
                paperConfig={config}
                stickerConfig={stickerConfig}
                sheetIndex={safeStickerSheetIdx}
                onSheetIndexChange={setStickerSheetIndex}
                onPaperConfigChange={updateConfig}
                onStickerConfigChange={updateStickerConfig}
                onPrintStickers={handleStickerPrint}
              />
            )}
            {activeTab === 'seating' && (
              <SeatingPlanStudio
                students={students}
                filteredCardStudents={filteredStudents}
                cardFilterDesc={cardFilterDesc}
                groupingMode={stickerConfig.groupingMode}
                paperConfig={config}
                seatingConfig={seatingConfig}
                pageIndex={safeSeatingPageIdx}
                onPageIndexChange={setSeatingPageIndex}
                onPaperConfigChange={updateConfig}
                onSeatingConfigChange={updateSeatingConfig}
                onPrintSeating={handleSeatingPrint}
                onInspectStudentCard={(st) => {
                  setSelectedStudentNo(st.no);
                  setActiveTab('studio');
                }}
              />
            )}
            {activeTab === 'attendance' && (
              <AttendanceSheetStudio
                students={students}
                filteredCardStudents={filteredStudents}
                cardFilterDesc={cardFilterDesc}
                groupingMode={stickerConfig.groupingMode}
                paperConfig={config}
                attendanceConfig={attendanceConfig}
                pageIndex={safeAttendancePageIdx}
                onPageIndexChange={setAttendancePageIndex}
                onPaperConfigChange={updateConfig}
                onAttendanceConfigChange={updateAttendanceConfig}
                onPrintAttendance={handleAttendancePrint}
              />
            )}
            {activeTab === 'students' && (
              <StudentDataManager
                students={students}
                groupingMode={stickerConfig.groupingMode}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onResetStudents={handleResetStudents}
                onImportCsv={handleCsvUpload}
                onInspectStudentCard={(st) => {
                  setSelectedStudentNo(st.no);
                  setActiveTab('studio');
                }}
                csvFeedback={csvFeedback}
              />
            )}
            {(activeTab === 'export' || activeTab === 'docs') && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-white border-b border-[#E2E8F0] px-6 py-2 flex items-center gap-2 shrink-0">
                  <div className="inline-flex p-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg gap-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('export')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        activeTab === 'export'
                          ? 'bg-[#1F3864] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#131C31]'
                      }`}
                    >
                      Ekspor PDF/X-1a &amp; Arsip ZIP
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('docs')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        activeTab === 'docs'
                          ? 'bg-[#1F3864] text-white shadow-2xs'
                          : 'text-[#475569] hover:text-[#131C31]'
                      }`}
                    >
                      Panduan Produksi &amp; Laporan Efisiensi
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {activeTab === 'docs' ? (
                    <ProductionDocsPanel filteredStudents={filteredStudents} config={config} />
                  ) : (
                    <ExportArchivePanel
                      filteredStudents={filteredStudents}
                      allStudents={students}
                      selectedStudent={selectedStudent}
                      config={config}
                      groupingMode={stickerConfig.groupingMode}
                      onConfigChange={updateConfig}
                    />
                  )}
                </div>
              </div>
            )}
            </main>
          </div>
        </div>
      </div>

      {/* Dedicated Full-Batch 1:1mm Native Print DOM (hidden on screen, printed cleanly at 100% scale) */}
      <div
        className="print-only-root"
        style={{
          filter:
            activeTab !== 'sticker' &&
            activeTab !== 'seating' &&
            activeTab !== 'attendance' &&
            config.cmykSoftProof
              ? 'contrast(0.95) saturate(0.92) sepia(0.04)'
              : undefined,
        }}
      >
        {activeTab === 'sticker'
          ? filteredStickers.length > 0 && (
              <StickerSheetPagesBlock
                stickers={filteredStickers}
                stickerConfig={stickerConfig}
                geo={stickerGeo}
                sheetIndices={printStickerIndices}
                forPrint
              />
            )
          : activeTab === 'seating'
            ? printSeatingPages.length > 0 && (
                <SeatingSheetPagesBlock
                  pages={printSeatingPages}
                  paperConfig={config}
                  seatingConfig={seatingConfig}
                  forPrint
                />
              )
            : activeTab === 'attendance'
              ? printAttendancePages.length > 0 && (
                  <AttendanceSheetPagesBlock
                    pages={printAttendancePages}
                    paperConfig={config}
                    attendanceConfig={attendanceConfig}
                    forPrint
                  />
                )
              : filteredStudents.length > 0 && (
                  <SheetPagesBlock
                    students={filteredStudents}
                    config={config}
                    geo={geo}
                    sheetIndices={printSheetIndices}
                    deskLookup={deskLookup}
                    isPrintDom
                  />
                )}
      </div>
    </>
  );
}
