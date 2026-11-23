import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Printer,
} from 'lucide-react';
import type { StudentRecord } from '../data/pasData';
import {
  PAPER_DIMENSIONS,
  type PaperPreset,
  type PrepressConfig,
  type SeatingClassGrouping,
  type SeatingConfig,
  type SeatingDataSource,
  type SeatingDoorSide,
  type SeatingMode,
  type SeatingNumberingOrder,
  type SeatingOrientation,
  type SeatingStudentOrder,
  type SeatingVariant,
  type StickerGroupingMode,
} from '../types/prepress';
import { getSortedRoomList } from '../utils/deskStickerBuilder';
import {
  buildCommitteeSummaryCsv,
  buildRoomSeatingPlans,
  buildSeatingPages,
  getAvailableSeatingClassOptions,
  getSeatingPaperDimensions,
} from '../utils/seatingPlanBuilder';
import { SeatingSheetPagesBlock } from './SeatingPlanRenderer';

interface SeatingPlanStudioProps {
  students: StudentRecord[];
  filteredCardStudents: StudentRecord[];
  cardFilterDesc?: string;
  groupingMode: StickerGroupingMode;
  paperConfig: PrepressConfig;
  seatingConfig: SeatingConfig;
  pageIndex: number;
  onPageIndexChange: (idx: number) => void;
  onPaperConfigChange: (patch: Partial<PrepressConfig>) => void;
  onSeatingConfigChange: (patch: Partial<SeatingConfig>) => void;
  onPrintSeating: (scope: 'all' | 'current') => void;
  onInspectStudentCard?: (student: StudentRecord) => void;
}

function triggerCsvDownload(csvText: string, filename: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const SeatingPlanStudio: React.FC<SeatingPlanStudioProps> = ({
  students,
  filteredCardStudents,
  cardFilterDesc,
  groupingMode,
  paperConfig,
  seatingConfig,
  pageIndex,
  onPageIndexChange,
  onPaperConfigChange,
  onSeatingConfigChange,
  onPrintSeating,
  onInspectStudentCard,
}) => {
  const rooms = useMemo(() => getSortedRoomList(students), [students]);
  const classOptions = useMemo(
    () =>
      getAvailableSeatingClassOptions(
        students,
        seatingConfig.classGrouping,
        seatingConfig.dataSource === 'room' ? seatingConfig.selectedRoom || undefined : undefined,
      ),
    [students, seatingConfig.classGrouping, seatingConfig.dataSource, seatingConfig.selectedRoom],
  );

  const roomPlans = useMemo(
    () =>
      buildRoomSeatingPlans(
        students,
        filteredCardStudents,
        groupingMode,
        seatingConfig,
        cardFilterDesc,
      ),
    [students, filteredCardStudents, groupingMode, seatingConfig, cardFilterDesc],
  );

  const pages = useMemo(
    () => buildSeatingPages(roomPlans, seatingConfig.variant),
    [roomPlans, seatingConfig.variant],
  );

  const { paperW, paperH } = useMemo(
    () => getSeatingPaperDimensions(paperConfig, seatingConfig.paperOrientation),
    [paperConfig, seatingConfig.paperOrientation],
  );

  const totalPages = Math.max(1, pages.length);
  const safePageIdx = Math.min(pageIndex, totalPages - 1);
  const activePage = pages[safePageIdx];
  const isPerKelasMode = seatingConfig.seatingMode === 'per_kelas';
  const isStudentCardMode = seatingConfig.seatingMode === 'student_card' || isPerKelasMode;
  const colPresets = isPerKelasMode ? [2, 4, 5, 6] : isStudentCardMode ? [2, 4, 6, 8] : [3, 4, 5];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left Sidebar Controls */}
      <aside className="no-print w-72 xl:w-[300px] shrink-0 bg-white border-r border-[#DCE2EE] overflow-y-auto p-4 space-y-5 text-xs">
        <div>
          <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">
            Mode Denah &amp; Sinkron Kartu
          </h2>

          <label className="block text-[#44546A] font-medium mb-1">Model Penempatan Kursi</label>
          <div className="grid grid-cols-3 border border-[#CBD5E1] mb-2.5">
            {(
              [
                ['student_card', 'Per Ruang'],
                ['per_kelas', 'Per Kelas'],
                ['desk_combined', 'Meja Stiker'],
              ] as Array<[SeatingMode, string]>
            ).map(([val, label], i) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  if (val === 'per_kelas') {
                    onSeatingConfigChange({
                      seatingMode: 'per_kelas',
                      cols: 4,
                      numberingOrder: 'row_left',
                    });
                  } else if (val === 'student_card') {
                    onSeatingConfigChange({
                      seatingMode: 'student_card',
                      cols: 6,
                      numberingOrder: 'snake_col',
                    });
                  } else {
                    onSeatingConfigChange({
                      seatingMode: 'desk_combined',
                      cols: 4,
                      numberingOrder: 'snake_col',
                    });
                  }
                  onPageIndexChange(0);
                }}
                className={`py-1.5 px-1 text-[11px] font-semibold whitespace-nowrap ${
                  i > 0 ? 'border-l border-[#CBD5E1]' : ''
                } ${
                  seatingConfig.seatingMode === val
                    ? 'bg-[#1F3864] text-white'
                    : 'bg-white text-[#44546A] hover:bg-[#F8FAFC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="block text-[#44546A] font-medium mb-1">Sumber Data Peserta</label>
          <div className="grid grid-cols-2 border border-[#CBD5E1] mb-2.5">
            {(
              [
                ['room', 'Per Ruang Ujian'],
                ['card_filter', `Filter Kartu (${filteredCardStudents.length})`],
              ] as Array<[SeatingDataSource, string]>
            ).map(([val, label], i) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  onSeatingConfigChange({ dataSource: val });
                  onPageIndexChange(0);
                }}
                className={`py-1.5 px-1.5 text-[11px] font-semibold whitespace-nowrap ${
                  i > 0 ? 'border-l border-[#CBD5E1]' : ''
                } ${
                  seatingConfig.dataSource === val
                    ? 'bg-[#1F3864] text-white'
                    : 'bg-white text-[#44546A] hover:bg-[#F8FAFC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {seatingConfig.dataSource === 'room' ? (
            <div className="mb-2.5">
              <label className="block text-[#44546A] font-medium mb-1">Filter Ruang</label>
              <select
                value={seatingConfig.selectedRoom}
                onChange={(e) => {
                  onSeatingConfigChange({ selectedRoom: e.target.value, selectedClassTier: '' });
                  onPageIndexChange(0);
                }}
                className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31]"
              >
                <option value="">Semua Ruang ({rooms.length} ruang)</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    RUANG {r}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-2.5 p-2 bg-[#EEF2FA] border border-[#CBD5E1] text-[11px] text-[#1F3864]">
              <div className="font-semibold">Sinkron Filter Tab Kartu PAS</div>
              <div className="text-[#44546A] font-mono tabular-nums mt-0.5">
                {cardFilterDesc || 'Semua Siswa'} · {filteredCardStudents.length} kartu
              </div>
            </div>
          )}

          {isPerKelasMode && (
            <div className="mb-2.5 space-y-2 p-2 bg-[#F8FAFC] border border-[#DCE2EE]">
              <div>
                <label className="block text-[#44546A] font-medium mb-1">
                  Pengelompokan Denah Per Kelas
                </label>
                <div className="grid grid-cols-2 border border-[#CBD5E1]">
                  {(
                    [
                      ['tier_per_room', 'Jenjang (X / XI / XII)'],
                      ['exact_class_per_room', 'Sub-Kelas (X1..XII 7)'],
                    ] as Array<[SeatingClassGrouping, string]>
                  ).map(([val, label], i) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        onSeatingConfigChange({ classGrouping: val, selectedClassTier: '' });
                        onPageIndexChange(0);
                      }}
                      className={`py-1 px-1 text-[10.5px] font-semibold whitespace-nowrap ${
                        i > 0 ? 'border-l border-[#CBD5E1]' : ''
                      } ${
                        seatingConfig.classGrouping === val
                          ? 'bg-[#1F3864] text-white'
                          : 'bg-white text-[#44546A] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[#44546A] font-medium mb-1">
                  Filter Kelas / Jenjang
                </label>
                <select
                  value={seatingConfig.selectedClassTier}
                  onChange={(e) => {
                    onSeatingConfigChange({ selectedClassTier: e.target.value });
                    onPageIndexChange(0);
                  }}
                  className="w-full px-2 py-1 border border-[#CBD5E1] bg-white text-[#131C31]"
                >
                  <option value="">Semua ({classOptions.length} kelompok)</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isStudentCardMode && (
            <div className="mb-2.5">
              <label className="block text-[#44546A] font-medium mb-1">Urutan Penempatan Kursi</label>
              <select
                value={seatingConfig.studentOrder === 'interleave_class' ? 'desk_order' : seatingConfig.studentOrder}
                onChange={(e) => {
                  onSeatingConfigChange({
                    studentOrder: e.target.value as SeatingStudentOrder,
                  });
                  onPageIndexChange(0);
                }}
                className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31]"
              >
                <option value="desk_order">Sesuai Urutan Meja (MEJA 01 → akhir)</option>
                <option value="card_order">Sesuai Urutan No. Kartu (001 → akhir)</option>
              </select>
            </div>
          )}

          <label className="block text-[#44546A] font-medium mb-1">Varian Cetak Denah</label>
          <div className="grid grid-cols-3 border border-[#CBD5E1]">
            {(
              [
                ['kelas', 'Tempel Kelas'],
                ['panitia', 'Panitia'],
                ['both', 'Keduanya'],
              ] as Array<[SeatingVariant, string]>
            ).map(([val, label], i) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  onSeatingConfigChange({ variant: val });
                  onPageIndexChange(0);
                }}
                className={`py-1.5 px-1 text-[11px] font-semibold whitespace-nowrap ${
                  i > 0 ? 'border-l border-[#CBD5E1]' : ''
                } ${
                  seatingConfig.variant === val
                    ? 'bg-[#1F3864] text-white'
                    : 'bg-white text-[#44546A] hover:bg-[#F8FAFC]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Classroom Proportions & Grid Layout */}
        <div className="pt-4 border-t border-[#E2E8F0]">
          <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">
            Proporsi Kursi &amp; Ruang Kelas
          </h2>

          <div className="mb-2.5">
            <label className="block text-[#44546A] font-medium mb-1">
              Jumlah Banjar / Kolom {isStudentCardMode ? 'Kartu' : 'Meja'}
            </label>
            <div className={`grid gap-1 ${isStudentCardMode ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {colPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSeatingConfigChange({ cols: c })}
                  className={`py-1 font-mono text-[11px] border ${
                    seatingConfig.cols === c
                      ? 'bg-[#1F3864] text-white border-[#1F3864]'
                      : 'bg-[#F8FAFC] text-[#44546A] border-[#CBD5E1] hover:bg-[#EEF2FA]'
                  }`}
                >
                  {c} Kol
                </button>
              ))}
            </div>
          </div>

          <label className="block text-[#44546A] font-medium mb-1">Pola Penomoran Posisi</label>
          <select
            value={seatingConfig.numberingOrder}
            onChange={(e) =>
              onSeatingConfigChange({
                numberingOrder: e.target.value as SeatingNumberingOrder,
              })
            }
            className="w-full px-2.5 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31] mb-2.5"
          >
            <option value="snake_col">Zig-Zag / Ular per Banjar (Depan↔Belakang)</option>
            <option value="col_top">Lurus per Banjar (Depan → Belakang)</option>
            <option value="row_left">Lurus per Baris (Kiri → Kanan)</option>
          </select>

          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <div>
              <label className="block text-[#44546A] font-medium mb-1">Posisi Papan Tulis</label>
              <select
                value={seatingConfig.orientation}
                onChange={(e) =>
                  onSeatingConfigChange({
                    orientation: e.target.value as SeatingOrientation,
                  })
                }
                className="w-full px-2 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31]"
              >
                <option value="front_top">Di Atas (Standar)</option>
                <option value="front_bottom">Di Bawah</option>
              </select>
            </div>
            <div>
              <label className="block text-[#44546A] font-medium mb-1">Posisi Pintu</label>
              <select
                value={seatingConfig.doorSide}
                onChange={(e) =>
                  onSeatingConfigChange({ doorSide: e.target.value as SeatingDoorSide })
                }
                className="w-full px-2 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31]"
              >
                <option value="left">Kiri Depan</option>
                <option value="right">Kanan Depan</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={seatingConfig.showStudentNames}
                onChange={(e) => onSeatingConfigChange({ showStudentNames: e.target.checked })}
                className="accent-[#1F3864]"
              />
              Tampilkan nama lengkap peserta
            </label>
            <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={seatingConfig.showUserAndFullNo}
                onChange={(e) => onSeatingConfigChange({ showUserAndFullNo: e.target.checked })}
                className="accent-[#1F3864]"
              />
              Sinkron No. Kartu Lengkap &amp; User Name
            </label>
            <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={paperConfig.showDeskOnCard}
                onChange={(e) => onPaperConfigChange({ showDeskOnCard: e.target.checked })}
                className="accent-[#1F3864]"
              />
              Cantumkan No. Meja pada Kartu Peserta
            </label>
            <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={seatingConfig.showEmptyDesks}
                onChange={(e) => onSeatingConfigChange({ showEmptyDesks: e.target.checked })}
                className="accent-[#1F3864]"
              />
              Tampilkan kotak {isStudentCardMode ? 'kursi' : 'meja'} cadangan / kosong
            </label>
            <label className="flex items-center gap-2 text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={seatingConfig.showSchoolHeader !== false}
                onChange={(e) => onSeatingConfigChange({ showSchoolHeader: e.target.checked })}
                className="accent-[#1F3864]"
              />
              Tampilkan header nama sekolah di denah
            </label>
          </div>
        </div>

        {/* Paper & Orientation */}
        <div className="pt-4 border-t border-[#E2E8F0]">
          <h2 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B] mb-2">
            Kertas, Orientasi &amp; Kop Sekolah
          </h2>

          <div className="mb-2.5">
            <label className="block text-[#44546A] font-medium mb-1">Orientasi Denah</label>
            <div className="grid grid-cols-2 border border-[#CBD5E1]">
              {(
                [
                  ['portrait', 'Potret (Tegak)'],
                  ['landscape', 'Lanskap (Mendatar)'],
                ] as const
              ).map(([val, label], i) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSeatingConfigChange({ paperOrientation: val })}
                  className={`py-1.5 px-1.5 text-[11px] font-semibold whitespace-nowrap ${
                    i > 0 ? 'border-l border-[#CBD5E1]' : ''
                  } ${
                    seatingConfig.paperOrientation === val
                      ? 'bg-[#1F3864] text-white'
                      : 'bg-white text-[#44546A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[#44546A] font-medium mb-1">Ukuran Kertas</label>
              <select
                value={paperConfig.paper}
                onChange={(e) => onPaperConfigChange({ paper: e.target.value as PaperPreset })}
                className="w-full px-2 py-1.5 border border-[#CBD5E1] bg-white text-[#131C31]"
              >
                {Object.entries(PAPER_DIMENSIONS).map(([k, [, , label]]) => (
                  <option key={k} value={k}>
                    {k} ({label.split('(')[1]?.replace(')', '') ?? k})
                  </option>
                ))}
                <option value="custom">Kustom</option>
              </select>
            </div>
            <div>
              <label className="block text-[#44546A] font-medium mb-1">Margin Tepi (mm)</label>
              <input
                type="number"
                step="0.5"
                min="4"
                max="25"
                value={seatingConfig.marginMm}
                onChange={(e) =>
                  onSeatingConfigChange({ marginMm: Math.max(4, Number(e.target.value) || 8) })
                }
                className="w-full px-2 py-1.5 border border-[#CBD5E1] font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[#44546A] font-medium">Judul Ujian (Kop Sekolah)</label>
              <button
                type="button"
                onClick={() =>
                  onSeatingConfigChange({
                    showSchoolHeader: seatingConfig.showSchoolHeader === false,
                  })
                }
                className={`px-1.5 py-0.5 text-[10px] font-semibold border ${
                  seatingConfig.showSchoolHeader !== false
                    ? 'border-[#1F3864] bg-[#EEF2FA] text-[#1F3864]'
                    : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#64748B]'
                }`}
              >
                {seatingConfig.showSchoolHeader !== false ? 'Kop Tampil' : 'Kop Disembunyikan'}
              </button>
            </div>
            <input
              type="text"
              disabled={seatingConfig.showSchoolHeader === false}
              value={seatingConfig.examTitle}
              onChange={(e) => onSeatingConfigChange({ examTitle: e.target.value })}
              className="w-full px-2 py-1 border border-[#CBD5E1] text-[#131C31] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
            />
          </div>

          <div className="mb-2">
            <label className="block text-[#44546A] font-medium mb-1">
              Penanggung Jawab Panitia
            </label>
            <input
              type="text"
              value={seatingConfig.committeeChairName}
              onChange={(e) => onSeatingConfigChange({ committeeChairName: e.target.value })}
              className="w-full px-2 py-1 border border-[#CBD5E1] text-[#131C31]"
            />
          </div>

          <div className="p-2.5 bg-[#F8FAFC] border border-[#DCE2EE] font-mono text-[11px] tabular-nums text-[#1F3864]">
            <div>
              Total Halaman: <strong>{pages.length} halaman</strong> ({roomPlans.length} denah)
            </div>
            <div className="text-[#55637A]">
              Ukuran cetak: {paperW} × {paperH} mm (1 halaman/ruang)
            </div>
          </div>
        </div>

        {/* Direct Print & Committee CSV */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
          <button
            type="button"
            onClick={() => onPrintSeating('all')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1F3864] hover:bg-[#16294B] text-white font-bold text-xs"
          >
            <Printer className="w-4 h-4 text-[#C9A227]" />
            Cetak Semua Denah ({pages.length} Hal)
          </button>
          <button
            type="button"
            onClick={() =>
              triggerCsvDownload(
                buildCommitteeSummaryCsv(roomPlans, seatingConfig.seatingMode),
                `Rekap_Denah_Kursi_Panitia_PAS_SMAN1ALALAK.csv`,
              )
            }
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#1F3864] font-semibold text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Rekap Panitia (CSV)
          </button>
        </div>
      </aside>

      {/* Main Proportional Seating Viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#E9EDF5]">
        <div className="no-print flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-[#DCE2EE] shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={safePageIdx <= 0}
              onClick={() => onPageIndexChange(Math.max(0, safePageIdx - 1))}
              className="p-1.5 border border-[#DCE2EE] hover:bg-[#F3F5F9] disabled:opacity-40"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="w-4 h-4 text-[#1F3864]" />
            </button>
            <span className="font-mono text-xs font-semibold text-[#1F3864] tabular-nums whitespace-nowrap">
              HALAMAN {safePageIdx + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePageIdx >= totalPages - 1}
              onClick={() => onPageIndexChange(Math.min(totalPages - 1, safePageIdx + 1))}
              className="p-1.5 border border-[#DCE2EE] hover:bg-[#F3F5F9] disabled:opacity-40"
              title="Halaman berikutnya"
            >
              <ChevronRight className="w-4 h-4 text-[#1F3864]" />
            </button>
            {activePage && (
              <span className="text-xs text-[#55637A] font-mono tabular-nums whitespace-nowrap ml-2">
                {activePage.roomPlan.badgeLabel} ·{' '}
                {activePage.mode === 'kelas' ? 'Tempel Kelas' : 'Kontrol Panitia'} ·{' '}
                {isStudentCardMode
                  ? `${activePage.roomPlan.totalStudents} kartu kursi`
                  : `${activePage.roomPlan.totalDesks} meja / ${activePage.roomPlan.totalStudents} siswa`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex border border-[#CBD5E1]" title="Orientasi Denah">
              {(
                [
                  ['portrait', 'Potret'],
                  ['landscape', 'Lanskap'],
                ] as const
              ).map(([val, label], i) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSeatingConfigChange({ paperOrientation: val })}
                  className={`px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${
                    i > 0 ? 'border-l border-[#CBD5E1]' : ''
                  } ${
                    seatingConfig.paperOrientation === val
                      ? 'bg-[#1F3864] text-white'
                      : 'bg-white text-[#44546A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                onSeatingConfigChange({
                  showSchoolHeader: seatingConfig.showSchoolHeader === false,
                })
              }
              title="Tampilkan atau sembunyikan header nama sekolah & lambang pada denah"
              className={`px-2 py-1 border text-[11px] font-semibold whitespace-nowrap ${
                seatingConfig.showSchoolHeader !== false
                  ? 'border-[#1F3864] bg-[#EEF2FA] text-[#1F3864]'
                  : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              {seatingConfig.showSchoolHeader !== false ? 'Kop Sekolah: Tampil' : 'Kop Sekolah: Sembunyi'}
            </button>

            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="range"
                min={30}
                max={105}
                value={seatingConfig.zoomPct}
                onChange={(e) => onSeatingConfigChange({ zoomPct: Number(e.target.value) })}
                className="w-20 accent-[#1F3864]"
              />
              <span className="font-mono text-xs text-[#1F3864] w-9 text-right tabular-nums">
                {seatingConfig.zoomPct}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => onPrintSeating('current')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#1F3864] text-[#1F3864] hover:bg-[#F3F5F9] text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Hal {safePageIdx + 1}
            </button>
            <button
              type="button"
              onClick={() => onPrintSeating('all')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F3864] text-white text-xs font-semibold hover:bg-[#16294B] whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-[#C9A227]" />
              Cetak Semua ({totalPages})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!activePage ? (
            <div className="max-w-md mx-auto mt-16 bg-white border border-[#DCE2EE] p-8 text-center">
              <p className="font-display font-bold text-[#1F3864] text-base">
                Tidak ada data ruang ditemukan
              </p>
              <p className="text-sm text-[#55637A] mt-1">
                Tambahkan data siswa atau pilih ruang lain untuk membuat denah tempat duduk.
              </p>
            </div>
          ) : (
            <div
              style={{
                zoom: seatingConfig.zoomPct / 100,
                transformOrigin: 'top center',
              }}
            >
              <SeatingSheetPagesBlock
                pages={[activePage]}
                paperConfig={paperConfig}
                seatingConfig={seatingConfig}
                onSelectStudent={onInspectStudentCard}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
