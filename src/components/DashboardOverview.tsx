import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FolderArchive,
  MapPin,
  Printer,
  Search,
  Tag,
  Users,
} from 'lucide-react';
import { SCHEDULES_PASTE_NOVEMBER, type StudentRecord } from '../data/pasData';
import type {
  AttendanceConfig,
  MainWorkspaceTab,
  PrepressConfig,
  SeatingConfig,
  StickerConfig,
} from '../types/prepress';
import {
  compareNumericStrings,
  extractClassTier,
  formatParticipantNo,
  normalizeRoomLabel,
} from '../utils/deskStickerBuilder';

interface DashboardOverviewProps {
  students: StudentRecord[];
  filteredStudents: StudentRecord[];
  config: PrepressConfig;
  stickerConfig: StickerConfig;
  seatingConfig: SeatingConfig;
  attendanceConfig: AttendanceConfig;
  stats: {
    cardsPerSheet: number;
    cardSheets: number;
    stickerCount: number;
    stickerSheets: number;
    seatingPages: number;
    attendancePages: number;
    missingScheduleCount: number;
  };
  onNavigateTab: (tab: MainWorkspaceTab) => void;
  onQuickJumpRoom: (
    room: string,
    targetTab: 'studio' | 'sticker' | 'seating' | 'attendance',
  ) => void;
  onUseScheduleForAttendance: (session: {
    subject: string;
    date: string;
    time: string;
  }) => void;
  onPrintCards: () => void;
}

interface RoomSummaryRow {
  room: string;
  studentsCount: number;
  desksCount: number;
  classesLabel: string;
  tierCounts: { X: number; XI: number; XII: number };
  firstNo: string;
  lastNo: string;
}

type SortOption = 'room_asc' | 'count_desc' | 'count_asc';

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  students,
  filteredStudents,
  config,
  stickerConfig,
  seatingConfig,
  stats,
  onNavigateTab,
  onQuickJumpRoom,
  onUseScheduleForAttendance,
  onPrintCards,
}) => {
  const [roomSearch, setRoomSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('room_asc');
  const [selectedScheduleTier, setSelectedScheduleTier] = useState<'X' | 'XI' | 'XII'>('XII');

  const classList = useMemo(
    () => [...new Set(students.map((s) => s.kelas.trim()).filter(Boolean))].sort(compareNumericStrings),
    [students],
  );

  const tierTotals = useMemo(() => {
    const counts = { X: 0, XI: 0, XII: 0, OTHER: 0 };
    for (const s of students) {
      const tier = extractClassTier(s.kelas);
      if (tier === 'X' || tier === 'XI' || tier === 'XII') {
        counts[tier] += 1;
      } else {
        counts.OTHER += 1;
      }
    }
    return counts;
  }, [students]);

  const roomRows = useMemo<RoomSummaryRow[]>(() => {
    const map = new Map<string, StudentRecord[]>();
    for (const st of students) {
      const r = normalizeRoomLabel(st.ruang);
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(st);
    }

    const list: RoomSummaryRow[] = [];
    for (const [room, members] of map.entries()) {
      const sorted = [...members].sort((a, b) => compareNumericStrings(a.no, b.no));
      const classSet = [...new Set(sorted.map((s) => s.kelas.trim()).filter(Boolean))].sort(
        compareNumericStrings,
      );
      const tierCounts = { X: 0, XI: 0, XII: 0 };
      for (const m of sorted) {
        const t = extractClassTier(m.kelas);
        if (t === 'X' || t === 'XI' || t === 'XII') tierCounts[t] += 1;
      }
      // Compute desk count consistent with sticker grouping mode
      let desksCount = 0;
      if (stickerConfig.groupingMode === 'tier_room') {
        desksCount = Math.max(tierCounts.X, tierCounts.XI, tierCounts.XII);
      } else {
        const byClass = new Map<string, number>();
        for (const m of sorted) {
          byClass.set(m.kelas, (byClass.get(m.kelas) ?? 0) + 1);
        }
        desksCount = Math.max(1, ...Array.from(byClass.values()));
      }

      list.push({
        room,
        studentsCount: sorted.length,
        desksCount,
        classesLabel: classSet.join(', '),
        tierCounts,
        firstNo: sorted[0]?.no ?? '-',
        lastNo: sorted[sorted.length - 1]?.no ?? '-',
      });
    }

    return list.sort((a, b) => compareNumericStrings(a.room, b.room));
  }, [students, stickerConfig.groupingMode]);

  const filteredRoomRows = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    const base = q
      ? roomRows.filter(
          (r) =>
            `ruang ${r.room}`.toLowerCase().includes(q) ||
            r.classesLabel.toLowerCase().includes(q) ||
            r.firstNo.includes(q) ||
            r.lastNo.includes(q),
        )
      : roomRows;

    const copy = [...base];
    if (sortBy === 'count_desc') {
      copy.sort((a, b) => b.studentsCount - a.studentsCount || compareNumericStrings(a.room, b.room));
    } else if (sortBy === 'count_asc') {
      copy.sort((a, b) => a.studentsCount - b.studentsCount || compareNumericStrings(a.room, b.room));
    } else {
      copy.sort((a, b) => compareNumericStrings(a.room, b.room));
    }
    return copy;
  }, [roomRows, roomSearch, sortBy]);

  const totalDesks = useMemo(
    () => roomRows.reduce((sum, r) => sum + r.desksCount, 0),
    [roomRows],
  );
  const avgPerRoom = roomRows.length > 0 ? Math.round(students.length / roomRows.length) : 0;
  const totalPrintPages =
    stats.cardSheets + stats.stickerSheets + stats.seatingPages + stats.attendancePages;
  const scheduledStudentsCount = Math.max(0, students.length - stats.missingScheduleCount);

  // Representative schedule rows per tier from SCHEDULES_PASTE_NOVEMBER
  const tierSchedules = useMemo(() => {
    const sampleKey = Object.keys(SCHEDULES_PASTE_NOVEMBER).find(
      (k) => extractClassTier(k) === selectedScheduleTier,
    );
    return sampleKey ? SCHEDULES_PASTE_NOVEMBER[sampleKey] : [];
  }, [selectedScheduleTier]);

  const modules = [
    {
      id: 'studio' as MainWorkspaceTab,
      title: 'Kartu Peserta 2D & Kode QR',
      meta: `${stats.cardSheets} lembar · ${stats.cardsPerSheet} kartu/hal (${config.paper})`,
      actionLabel: 'Buka Studio',
      icon: <CreditCard className="w-4 h-4 text-[#1F3864]" />,
    },
    {
      id: 'sticker' as MainWorkspaceTab,
      title: 'Stiker Nomor Meja Ruang',
      meta: `${stats.stickerCount} stiker meja · ${stats.stickerSheets} lembar cetak`,
      actionLabel: 'Atur Stiker',
      icon: <Tag className="w-4 h-4 text-[#1F3864]" />,
    },
    {
      id: 'seating' as MainWorkspaceTab,
      title: 'Denah Tempat Duduk Ruang & Kelas',
      meta: `${stats.seatingPages} halaman · Orientasi ${seatingConfig.paperOrientation === 'portrait' ? 'Potret' : 'Lanskap'}`,
      actionLabel: 'Buka Denah',
      icon: <MapPin className="w-4 h-4 text-[#1F3864]" />,
    },
    {
      id: 'attendance' as MainWorkspaceTab,
      title: 'Daftar Hadir & Berita Acara Ruang',
      meta: `${stats.attendancePages} halaman · Baris otomatis sesuai no & ruang`,
      actionLabel: 'Buka Absen',
      icon: <ClipboardCheck className="w-4 h-4 text-[#1F3864]" />,
    },
    {
      id: 'students' as MainWorkspaceTab,
      title: 'Data Induk Siswa & Impor CSV',
      meta: `${students.length} siswa aktif dalam ${classList.length} kelas`,
      actionLabel: 'Kelola Data',
      icon: <Users className="w-4 h-4 text-[#1F3864]" />,
    },
    {
      id: 'export' as MainWorkspaceTab,
      title: 'Ekspor PDF/X-1a & Paket Arsip ZIP',
      meta: `Pracetak ${config.dpi} DPI · ${config.iccProfile}`,
      actionLabel: 'Ekspor Arsip',
      icon: <FolderArchive className="w-4 h-4 text-[#1F3864]" />,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#F4F6FA] p-5 lg:p-7">
      <div className="max-w-[1380px] mx-auto space-y-6">
        {/* Top Hero / Context Header */}
        <section className="bg-white border border-[#DCE2EE] p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h1 className="font-display font-bold text-xl lg:text-2xl text-[#131C31] tracking-tight text-balance">
              Dashboard Administrasi &amp; Pracetak PAS
            </h1>
            <p className="text-xs lg:text-sm text-[#44546A] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>SMAN 1 Alalak</span>
              <span aria-hidden="true">·</span>
              <span>Penilaian Akhir Semester Ganjil 2026/2027</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#1F3864]">
                Kertas {config.paper} ({config.dpi} DPI)
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#1F3864]">
                QR Absensi {config.showQrCode ? 'Aktif' : 'Nonaktif'}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onPrintCards}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A227] hover:bg-[#B58F1E] text-[#0F172A] text-xs font-bold whitespace-nowrap transition-colors"
            >
              <Printer className="w-4 h-4" />
              Cetak Kartu PAS ({stats.cardSheets} Hal)
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('attendance')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F3864] hover:bg-[#16294B] text-white text-xs font-semibold whitespace-nowrap transition-colors"
            >
              <ClipboardCheck className="w-4 h-4 text-[#C9A227]" />
              Buka Daftar Hadir
            </button>
          </div>
        </section>

        {/* 4-Column KPI Summary Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-[#DCE2EE] p-4 flex flex-col justify-between gap-2">
            <div className="text-xs font-medium text-[#55637A]">Total Peserta Terdaftar</div>
            <div className="font-mono text-2xl font-bold text-[#1F3864] tabular-nums">
              {students.length} <span className="text-sm font-sans font-normal text-[#64748B]">siswa</span>
            </div>
            <div className="text-[11px] text-[#64748B] font-mono tabular-nums pt-2 border-t border-[#EEF2F6]">
              {classList.length} kelas aktif · {filteredStudents.length} masuk filter kartu
            </div>
          </div>

          <div className="bg-white border border-[#DCE2EE] p-4 flex flex-col justify-between gap-2">
            <div className="text-xs font-medium text-[#55637A]">Ruang &amp; Meja Ujian</div>
            <div className="font-mono text-2xl font-bold text-[#1F3864] tabular-nums">
              {roomRows.length} <span className="text-sm font-sans font-normal text-[#64748B]">ruang</span>
            </div>
            <div className="text-[11px] text-[#64748B] font-mono tabular-nums pt-2 border-t border-[#EEF2F6]">
              {totalDesks} meja terpetakan · rata-rata {avgPerRoom} siswa/ruang
            </div>
          </div>

          <div className="bg-white border border-[#DCE2EE] p-4 flex flex-col justify-between gap-2">
            <div className="text-xs font-medium text-[#55637A]">Total Estimasi Cetak</div>
            <div className="font-mono text-2xl font-bold text-[#1F3864] tabular-nums">
              {totalPrintPages}{' '}
              <span className="text-sm font-sans font-normal text-[#64748B]">halaman</span>
            </div>
            <div className="text-[11px] text-[#64748B] font-mono tabular-nums pt-2 border-t border-[#EEF2F6]">
              {stats.cardSheets} kartu · {stats.seatingPages} denah · {stats.attendancePages} absen
            </div>
          </div>

          <div className="bg-white border border-[#DCE2EE] p-4 flex flex-col justify-between gap-2">
            <div className="text-xs font-medium text-[#55637A]">Kesiapan Jadwal &amp; QR</div>
            <div className="font-mono text-2xl font-bold text-[#1F3864] tabular-nums">
              {scheduledStudentsCount}/{students.length}{' '}
              <span className="text-sm font-sans font-normal text-[#64748B]">siap</span>
            </div>
            <div className="text-[11px] text-[#64748B] font-mono tabular-nums pt-2 border-t border-[#EEF2F6]">
              {stats.missingScheduleCount === 0
                ? 'Semua kelas memiliki jadwal PAS'
                : `${stats.missingScheduleCount} siswa belum ada jadwal`}
            </div>
          </div>
        </section>

        {/* Main 2-Column Interactive Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Interactive Room Distribution & Quick Jump Table */}
          <section className="xl:col-span-7 bg-white border border-[#DCE2EE] flex flex-col min-w-0">
            <div className="p-4 border-b border-[#DCE2EE] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-sm text-[#131C31]">
                  Distribusi Ruang Ujian &amp; Akses Dokumen per Ruang
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Klik tombol aksi pada tiap baris untuk membuka kartu, stiker, denah, atau daftar hadir ruang tersebut.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    placeholder="Cari ruang / kelas..."
                    className="pl-8 pr-2.5 py-1.5 w-44 text-xs border border-[#CBD5E1] bg-white text-[#131C31] focus:outline-none focus:border-[#1F3864]"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Urutkan ruang"
                  className="px-2.5 py-1.5 text-xs border border-[#CBD5E1] bg-white text-[#131C31]"
                >
                  <option value="room_asc">Urut Ruang</option>
                  <option value="count_desc">Siswa Terbanyak</option>
                  <option value="count_asc">Siswa Tersedikit</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#DCE2EE] text-[11px] font-semibold text-[#44546A]">
                    <th className="py-2.5 px-4 whitespace-nowrap">Ruang</th>
                    <th className="py-2.5 px-3">Rombel / Kelas</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Rentang No.</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Siswa</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Meja</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Buka Langsung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F6]">
                  {filteredRoomRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-[#64748B]">
                        Tidak ada ruang yang cocok dengan pencarian &ldquo;{roomSearch}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredRoomRows.map((row) => (
                      <tr
                        key={row.room}
                        className="hover:bg-[#F8FAFC] transition-colors"
                      >
                        <td className="py-2.5 px-4 font-display font-bold text-[#1F3864] whitespace-nowrap">
                          RUANG {row.room}
                        </td>
                        <td className="py-2.5 px-3 text-[#334155]">
                          <div className="truncate max-w-[180px]" title={row.classesLabel}>
                            {row.classesLabel}
                          </div>
                          <div className="font-mono text-[10px] text-[#64748B] tabular-nums">
                            X:{row.tierCounts.X} · XI:{row.tierCounts.XI} · XII:{row.tierCounts.XII}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#44546A] tabular-nums whitespace-nowrap">
                          {formatParticipantNo(row.firstNo).split('/').pop()} –{' '}
                          {formatParticipantNo(row.lastNo).split('/').pop()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#131C31] tabular-nums whitespace-nowrap">
                          {row.studentsCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#44546A] tabular-nums whitespace-nowrap">
                          {row.desksCount}
                        </td>
                        <td className="py-2 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center border border-[#CBD5E1] bg-white">
                            <button
                              type="button"
                              onClick={() => onQuickJumpRoom(row.room, 'studio')}
                              className="px-2 py-1 text-[11px] font-medium text-[#1F3864] hover:bg-[#EEF2FA] transition-colors"
                              title={`Filter Kartu PAS untuk RUANG ${row.room}`}
                            >
                              Kartu
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickJumpRoom(row.room, 'sticker')}
                              className="px-2 py-1 text-[11px] font-medium text-[#1F3864] border-l border-[#CBD5E1] hover:bg-[#EEF2FA] transition-colors"
                              title={`Buka Stiker Meja RUANG ${row.room}`}
                            >
                              Stiker
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickJumpRoom(row.room, 'seating')}
                              className="px-2 py-1 text-[11px] font-medium text-[#1F3864] border-l border-[#CBD5E1] hover:bg-[#EEF2FA] transition-colors"
                              title={`Buka Denah Ruang RUANG ${row.room}`}
                            >
                              Denah
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickJumpRoom(row.room, 'attendance')}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-[#1F3864] hover:bg-[#16294B] border-l border-[#1F3864] transition-colors"
                              title={`Buka Daftar Hadir RUANG ${row.room}`}
                            >
                              Absen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right 5 Columns: Quick Module Access + Class Tier Breakdown + Schedule Builder */}
          <div className="xl:col-span-5 space-y-6 min-w-0">
            {/* Quick Modules Panel */}
            <section className="bg-white border border-[#DCE2EE]">
              <div className="p-4 border-b border-[#DCE2EE]">
                <h2 className="font-display font-bold text-sm text-[#131C31]">
                  Akses Cepat Modul Pracetak
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pilih modul kerja sesuai kebutuhan cetak panitia ujian.
                </p>
              </div>
              <div className="divide-y divide-[#EEF2F6]">
                {modules.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => onNavigateTab(mod.id)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 border border-[#DCE2EE] bg-[#F8FAFC] flex items-center justify-center shrink-0">
                        {mod.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#131C31] truncate group-hover:text-[#1F3864]">
                          {mod.title}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono tabular-nums truncate">
                          {mod.meta}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F3864] whitespace-nowrap shrink-0">
                      {mod.actionLabel}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Proportion by Jenjang + Schedule Quick-Apply for Attendance */}
            <section className="bg-white border border-[#DCE2EE] p-4 space-y-4">
              <div>
                <h2 className="font-display font-bold text-sm text-[#131C31]">
                  Sebaran Peserta per Jenjang &amp; Jadwal PAS
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pilih sesi ujian untuk langsung mengisi identitas mata pelajaran pada Daftar Hadir.
                </p>
              </div>

              {/* Jenjang Bars */}
              <div className="space-y-2.5 pt-1">
                {(
                  [
                    ['Kelas X', tierTotals.X, 'bg-[#1F3864]'],
                    ['Kelas XI', tierTotals.XI, 'bg-[#335C9E]'],
                    ['Kelas XII', tierTotals.XII, 'bg-[#C9A227]'],
                  ] as const
                ).map(([label, count, barClass]) => {
                  const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#334155]">{label}</span>
                        <span className="font-mono text-[11px] text-[#1F3864] tabular-nums">
                          {count} siswa ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-[#EEF2F6] overflow-hidden">
                        <div
                          className={`h-full ${barClass}`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Schedule Picker by Jenjang */}
              <div className="pt-3 border-t border-[#EEF2F6]">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#131C31]">
                    <CalendarDays className="w-3.5 h-3.5 text-[#1F3864]" />
                    Jadwal PAS November
                  </div>
                  <div className="flex border border-[#CBD5E1]">
                    {(['X', 'XI', 'XII'] as const).map((tier, idx) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedScheduleTier(tier)}
                        className={`px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                          idx > 0 ? 'border-l border-[#CBD5E1]' : ''
                        } ${
                          selectedScheduleTier === tier
                            ? 'bg-[#1F3864] text-white'
                            : 'bg-white text-[#44546A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        Kelas {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto border border-[#DCE2EE] divide-y divide-[#EEF2F6]">
                  {tierSchedules.map(([date, time, subject], i) => (
                    <div
                      key={`${date}-${time}-${subject}-${i}`}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-[#F8FAFC]"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#131C31] truncate">{subject}</div>
                        <div className="font-mono text-[10px] text-[#64748B] tabular-nums">
                          {date} · {time}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUseScheduleForAttendance({
                            subject,
                            date,
                            time,
                          })
                        }
                        className="px-2.5 py-1 border border-[#CBD5E1] bg-white hover:bg-[#1F3864] hover:text-white hover:border-[#1F3864] text-[#1F3864] text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors"
                      >
                        Pakai Absen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
