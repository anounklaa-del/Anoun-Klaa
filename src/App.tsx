import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Box,
  FileCheck2,
  FolderArchive,
  LayoutGrid,
  Printer,
  Upload,
} from 'lucide-react';
import { CardSheetPreview } from './components/CardSheetPreview';
import { ExportArchivePanel } from './components/ExportArchivePanel';
import { Mockup3DViewer } from './components/Mockup3DViewer';
import { SheetPagesBlock } from './components/PrintSheetRenderer';
import { ProductionDocsPanel } from './components/ProductionDocsPanel';
import {
  SCHEDULES_PASTE_NOVEMBER,
  STUDENTS_MASTER,
  type StudentRecord,
} from './data/pasData';
import {
  computeSheetGeometry,
  DEFAULT_PREPRESS_CONFIG,
  PAPER_DIMENSIONS,
  type CropMarkStyle,
  type FlipMode,
  type ImpositionMode,
  type MainWorkspaceTab,
  type PaperPreset,
  type PrepressConfig,
} from './types/prepress';
import { buildStructuredZipArchive } from './utils/archiveExporter';

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
  const [students, setStudents] = useState<StudentRecord[]>(STUDENTS_MASTER);
  const [config, setConfig] = useState<PrepressConfig>(() => {
    try {
      const saved = localStorage.getItem('pas_prepress_v2_cfg');
      if (saved) return { ...DEFAULT_PREPRESS_CONFIG, ...JSON.parse(saved) };
    } catch {
      // ignore storage failure
    }
    return DEFAULT_PREPRESS_CONFIG;
  });
  const [activeTab, setActiveTab] = useState<MainWorkspaceTab>('studio');
  const [selectedStudentNo, setSelectedStudentNo] = useState<string>(STUDENTS_MASTER[0].no);
  const [sheetIndex, setSheetIndex] = useState<number>(0);
  const [printScope, setPrintScope] = useState<'all' | 'current'>('all');
  const [zipBusy, setZipBusy] = useState(false);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const pendingPrintRef = useRef(false);

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

  const classList = useMemo(
    () => [...new Set(students.map((s) => s.kelas))],
    [students],
  );

  const filteredStudents = useMemo(() => {
    const fromNum = config.noFrom ? Number(config.noFrom) : 0;
    const toNum = config.noTo ? Number(config.noTo) : 1e9;
    return students.filter((s) => {
      if (config.selectedClass && s.kelas !== config.selectedClass) return false;
      const n = Number(s.no);
      if (!Number.isNaN(n) && (n < fromNum || n > toNum)) return false;
      return true;
    });
  }, [students, config.selectedClass, config.noFrom, config.noTo]);

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

  const totalPrintPages = useMemo(() => {
    if (config.imposition === 'calibration') return 2;
    const sheetCount = printSheetIndices.length;
    return config.imposition === 'duplex' ? sheetCount * 2 : sheetCount;
  }, [config.imposition, printSheetIndices.length]);

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
  }, [printScope, safeSheetIdx, filteredStudents, config]);

  const handleDirectPrint = (scopeOverride?: 'all' | 'current') => {
    const targetScope = scopeOverride ?? printScope;
    if (targetScope !== printScope) {
      pendingPrintRef.current = true;
      setPrintScope(targetScope);
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
      setStudents(parsed);
      setSelectedStudentNo(parsed[0].no);
      setSheetIndex(0);
      setCsvFeedback(`Terimpor ${parsed.length} data siswa dari ${file.name}`);
    }
    ev.target.value = '';
  };

  const handleQuickArchiveDownload = async () => {
    if (zipBusy) return;
    setZipBusy(true);
    try {
      const batch = filteredStudents.length > 0 ? filteredStudents : [selectedStudent];
      const res = await buildStructuredZipArchive(batch, config);
      const slug = config.selectedClass
        ? config.selectedClass.replace(/\s+/g, '_')
        : `${batch.length}Siswa`;
      triggerBlobDownload(res.blob, `SMAN1ALALAK_PAS2026_Arsip_Pracetak_${slug}.zip`);
    } finally {
      setZipBusy(false);
    }
  };

  const navItems: Array<{ id: MainWorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: 'studio', label: 'Desain & Presisi', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'mockup3d', label: 'Pratinjau 3D', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'export', label: 'Ekspor & Arsip', icon: <FolderArchive className="w-3.5 h-3.5" /> },
    { id: 'docs', label: 'Panduan & Laporan', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Dynamic @page physical dimensions for 1:1mm browser printing */}
      <style>{`@page { size: ${geo.paperW}mm ${geo.paperH}mm; margin: 0; }`}</style>

      {/* Interactive Screen Application */}
      <div className="screen-only flex flex-col h-screen w-screen overflow-hidden bg-[#F3F5F9] text-[#131C31]">
        {/* Top Bar Contract: Wordmark Left — Nav Links Center — Print & ZIP CTA Right */}
        <header className="no-print h-14 px-5 bg-white border-b border-[#DCE2EE] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-[#1F3864] flex items-center justify-center text-[#C9A227] font-display font-extrabold text-sm shrink-0">
              S1
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm text-[#1F3864] truncate">
                SMAN 1 ALALAK · Studio Pracetak Kartu PAS
              </h1>
              <p className="font-mono text-[11px] text-[#64748B] truncate tabular-nums">
                Jadwal Paste November 2026 · {filteredStudents.length} Siswa · {config.dpi} DPI CMYK
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[#1F3864] text-white border-[#1F3864]'
                      : 'bg-white text-[#44546A] border-transparent hover:bg-[#F3F5F9] hover:text-[#1F3864]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleDirectPrint()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#C9A227] hover:bg-[#B58F1E] text-[#0F172A] text-xs font-bold whitespace-nowrap shrink-0"
              title={`Cetak langsung ${totalPrintPages} halaman (${geo.paperW}×${geo.paperH} mm)`}
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak ({totalPrintPages} Hal)
            </button>
            <button
              type="button"
              disabled={zipBusy}
              onClick={handleQuickArchiveDownload}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1F3864] hover:bg-[#16294B] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Archive className="w-3.5 h-3.5 text-[#C9A227]" />
              {zipBusy ? 'Mengemas ZIP...' : 'Unduh Arsip ZIP'}
            </button>
          </div>
        </header>

        {/* Main Split Workspace */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {(activeTab === 'studio' || activeTab === 'mockup3d') && (
            <aside className="no-print w-80 shrink-0 bg-white border-r border-[#DCE2EE] overflow-y-auto p-4 space-y-5 text-xs">
              {/* Section 1: Paper, Trim Size & 3mm Bleed */}
              <div>
                <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">
                  Kertas, Dimensi &amp; Bleed
                </h2>

                <label className="block text-[#44546A] font-medium mb-1">Ukuran Kertas</label>
                <select
                  value={config.paper}
                  onChange={(e) => updateConfig({ paper: e.target.value as PaperPreset })}
                  className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
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
                        className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[#44546A] mb-0.5">Tinggi Kertas mm</label>
                      <input
                        type="number"
                        step="0.5"
                        value={config.customH}
                        onChange={(e) => updateConfig({ customH: Number(e.target.value) || 297 })}
                        className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Lebar mm</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.cardW}
                      onChange={(e) => updateConfig({ cardW: Math.max(40, Number(e.target.value) || 101.6) })}
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Tinggi mm</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.cardH}
                      onChange={(e) => updateConfig({ cardH: Math.max(30, Number(e.target.value) || 68.4) })}
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Jarak mm</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={config.gapMm}
                      onChange={(e) => updateConfig({ gapMm: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Bleed (Standar 3mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="6"
                      value={config.bleedMm}
                      onChange={(e) => updateConfig({ bleedMm: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Margin Min. mm</label>
                    <input
                      type="number"
                      step="0.2"
                      min="0"
                      value={config.marginMm}
                      onChange={(e) => updateConfig({ marginMm: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="mt-2.5 p-2.5 bg-[#F8FAFC] border border-[#DCE2EE] font-mono text-[11px] text-[#1F3864] tabular-nums">
                  <div>
                    Grid: <strong>{geo.cols} × {geo.rows} = {geo.cardsPerSheet} kartu/lembar</strong>
                  </div>
                  <div className="text-[#55637A]">
                    Margin simetris: {geo.originX.toFixed(2)} mm (X) · {geo.originY.toFixed(2)} mm (Y)
                  </div>
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
                  className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31] mb-2.5"
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
                  className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
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
                  className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
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
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#44546A] mb-0.5">Kalibrasi Y (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.dy}
                      onChange={(e) => updateConfig({ dy: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
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
                  className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31] mb-2"
                >
                  <option value="">Semua Kelas ({students.length} siswa)</option>
                  {classList.map((k) => (
                    <option key={k} value={k}>
                      {k} ({SCHEDULES_PASTE_NOVEMBER[k]?.length ?? 0} mapel)
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
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
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
                      className="w-full px-2 py-1 border border-[#CBD5E1] font-mono tabular-nums"
                    />
                  </div>
                </div>

                <label className="block text-[#44546A] font-medium mb-1">
                  Siswa Aktif (Mockup 3D &amp; SVG)
                </label>
                <select
                  value={selectedStudent.no}
                  onChange={(e) => setSelectedStudentNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31] mb-3"
                >
                  {filteredStudents.slice(0, 120).map((s) => (
                    <option key={s.no} value={s.no}>
                      #{s.no} — {s.nama} ({s.kelas})
                    </option>
                  ))}
                </select>

                <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-dashed border-[#94A3B8] hover:border-[#1F3864] hover:bg-[#F8FAFC] text-[#1F3864] font-medium cursor-pointer">
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
                    className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31]"
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1F3864] hover:bg-[#16294B] text-white font-bold text-xs"
                >
                  <Printer className="w-4 h-4 text-[#C9A227]" />
                  Cetak Langsung ({totalPrintPages} Halaman)
                </button>

                <div className="p-2.5 bg-[#EEF2FA] border border-[#DCE2EE] text-[11px] text-[#334155] leading-relaxed">
                  <strong className="text-[#1F3864]">Saat dialog cetak:</strong> pilih skala{' '}
                  <strong>100% / Actual size</strong>, margin <strong>None</strong>, matikan header &amp; footer, ukuran kertas sama ({config.paper}), aktifkan <strong>Duplex ({config.flipMode === 'long' ? 'Long-edge' : 'Short-edge'})</strong>.
                </div>
              </div>
            </aside>
          )}

          <main className="flex-1 min-w-0 h-full overflow-hidden">
            {activeTab === 'studio' && (
              <CardSheetPreview
                students={filteredStudents}
                config={config}
                selectedStudent={selectedStudent}
                sheetIndex={safeSheetIdx}
                onSheetIndexChange={setSheetIndex}
                onSelectStudent={(s) => setSelectedStudentNo(s.no)}
                onConfigChange={updateConfig}
                onPrintBatch={handleDirectPrint}
              />
            )}
            {activeTab === 'mockup3d' && (
              <Mockup3DViewer student={selectedStudent} config={config} />
            )}
            {activeTab === 'export' && (
              <ExportArchivePanel
                filteredStudents={filteredStudents}
                selectedStudent={selectedStudent}
                config={config}
                onConfigChange={updateConfig}
              />
            )}
            {activeTab === 'docs' && (
              <ProductionDocsPanel filteredStudents={filteredStudents} config={config} />
            )}
          </main>
        </div>
      </div>

      {/* Dedicated Full-Batch 1:1mm Native Print DOM (hidden on screen, printed cleanly at 100% scale) */}
      <div
        className="print-only-root"
        style={{
          filter: config.cmykSoftProof
            ? 'contrast(0.95) saturate(0.92) sepia(0.04)'
            : undefined,
        }}
      >
        {filteredStudents.length > 0 && (
          <SheetPagesBlock
            students={filteredStudents}
            config={config}
            geo={geo}
            sheetIndices={printSheetIndices}
            isPrintDom
          />
        )}
      </div>
    </>
  );
}
