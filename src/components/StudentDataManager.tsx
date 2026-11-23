import React, { useMemo, useState } from 'react';
import {
  Check,
  CreditCard,
  Download,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  SCHEDULES_PASTE_NOVEMBER,
  STUDENTS_MASTER,
  type StudentRecord,
} from '../data/pasData';
import type { StickerGroupingMode } from '../types/prepress';
import {
  buildDeskAssignmentLookup,
  compareNumericStrings,
  formatParticipantNo,
  getSortedRoomList,
  normalizeRoomLabel,
} from '../utils/deskStickerBuilder';

interface StudentDataManagerProps {
  students: StudentRecord[];
  groupingMode: StickerGroupingMode;
  onAddStudent: (record: StudentRecord) => void;
  onUpdateStudent: (originalNo: string, updated: StudentRecord) => void;
  onDeleteStudent: (no: string) => void;
  onResetStudents: () => void;
  onImportCsv: (ev: React.ChangeEvent<HTMLInputElement>) => void;
  onInspectStudentCard: (student: StudentRecord) => void;
  csvFeedback: string | null;
}

const KNOWN_CLASSES = Object.keys(SCHEDULES_PASTE_NOVEMBER);

function suggestNextNo(students: StudentRecord[]): string {
  let maxNo = 0;
  for (const s of students) {
    const n = Number(s.no);
    if (!Number.isNaN(n) && n > maxNo) maxNo = n;
  }
  return String(maxNo + 1).padStart(3, '0');
}

function triggerCsvDownload(students: StudentRecord[]) {
  const header = 'No,Nama,Kelas,Ruang,User';
  const rows = students.map((s) =>
    [s.no, s.nama, s.kelas, s.ruang, s.user]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header, ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data_Peserta_PAS_SMAN1ALALAK_${students.length}Siswa.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const StudentDataManager: React.FC<StudentDataManagerProps> = ({
  students,
  groupingMode,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onResetStudents,
  onImportCsv,
  onInspectStudentCard,
  csvFeedback,
}) => {
  const [editingOriginalNo, setEditingOriginalNo] = useState<string | null>(null);
  const [noInput, setNoInput] = useState<string>(() => suggestNextNo(students));
  const [namaInput, setNamaInput] = useState<string>('');
  const [kelasMode, setKelasMode] = useState<'preset' | 'custom'>('preset');
  const [kelasPreset, setKelasPreset] = useState<string>(KNOWN_CLASSES[0] ?? 'X1');
  const [kelasCustom, setKelasCustom] = useState<string>('');
  const [ruangInput, setRuangInput] = useState<string>('01');
  const [userInput, setUserInput] = useState<string>('');
  const [userEditedManually, setUserEditedManually] = useState<boolean>(false);
  const [formMessage, setFormMessage] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [search, setSearch] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  const rooms = useMemo(() => getSortedRoomList(students), [students]);
  const classOptions = useMemo(() => {
    const set = new Set([...KNOWN_CLASSES, ...students.map((s) => s.kelas)]);
    return [...set].filter(Boolean);
  }, [students]);

  const deskLookup = useMemo(
    () => buildDeskAssignmentLookup(students, groupingMode),
    [students, groupingMode],
  );

  const activeKelas = kelasMode === 'custom' ? kelasCustom.trim() : kelasPreset;
  const effectiveUser = userEditedManually ? userInput.trim() : noInput.trim();
  const hasSchedule = Boolean(SCHEDULES_PASTE_NOVEMBER[activeKelas]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...students]
      .filter((s) => {
        if (filterClass && s.kelas !== filterClass) return false;
        if (filterRoom && normalizeRoomLabel(s.ruang) !== filterRoom) return false;
        if (q) {
          const hit =
            s.no.toLowerCase().includes(q) ||
            s.nama.toLowerCase().includes(q) ||
            s.kelas.toLowerCase().includes(q) ||
            s.ruang.toLowerCase().includes(q) ||
            s.user.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => compareNumericStrings(a.no, b.no));
  }, [students, search, filterClass, filterRoom]);

  const resetFormToCreate = (nextStudents: StudentRecord[]) => {
    setEditingOriginalNo(null);
    setNoInput(suggestNextNo(nextStudents));
    setNamaInput('');
    setUserInput('');
    setUserEditedManually(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNo = noInput.trim();
    const cleanNama = namaInput.trim().toUpperCase();
    const cleanKelas = activeKelas;
    const cleanRuang = normalizeRoomLabel(ruangInput);
    const cleanUser = (userEditedManually ? userInput.trim() : cleanNo) || cleanNo;

    if (!cleanNo) {
      setFormMessage({ type: 'err', text: 'Nomor urut peserta wajib diisi.' });
      return;
    }
    if (!cleanNama) {
      setFormMessage({ type: 'err', text: 'Nama lengkap peserta wajib diisi.' });
      return;
    }
    if (!cleanKelas) {
      setFormMessage({ type: 'err', text: 'Kelas peserta wajib dipilih atau diisi.' });
      return;
    }

    const duplicate = students.find(
      (s) => s.no === cleanNo && s.no !== editingOriginalNo,
    );
    if (duplicate) {
      setFormMessage({
        type: 'err',
        text: `No. Peserta ${cleanNo} sudah dipakai oleh ${duplicate.nama}. Gunakan nomor lain.`,
      });
      return;
    }

    const record: StudentRecord = {
      no: cleanNo,
      nama: cleanNama,
      kelas: cleanKelas,
      ruang: cleanRuang,
      user: cleanUser,
    };

    if (editingOriginalNo) {
      onUpdateStudent(editingOriginalNo, record);
      setFormMessage({
        type: 'ok',
        text: `Data #${record.no} (${record.nama}) diperbarui dan otomatis disinkronkan ke Kartu PAS & Stiker Meja.`,
      });
      resetFormToCreate(students);
    } else {
      const nextList = [...students, record];
      onAddStudent(record);
      setFormMessage({
        type: 'ok',
        text: `Peserta baru #${record.no} (${record.nama} · ${record.kelas} · Ruang ${record.ruang}) ditambahkan.`,
      });
      resetFormToCreate(nextList);
    }
  };

  const handleStartEdit = (st: StudentRecord) => {
    setEditingOriginalNo(st.no);
    setNoInput(st.no);
    setNamaInput(st.nama);
    if (KNOWN_CLASSES.includes(st.kelas)) {
      setKelasMode('preset');
      setKelasPreset(st.kelas);
      setKelasCustom('');
    } else {
      setKelasMode('custom');
      setKelasCustom(st.kelas);
    }
    setRuangInput(normalizeRoomLabel(st.ruang));
    setUserInput(st.user);
    setUserEditedManually(st.user !== st.no);
    setFormMessage(null);
  };

  const missingScheduleTotal = useMemo(
    () => students.filter((s) => !SCHEDULES_PASTE_NOVEMBER[s.kelas]).length,
    [students],
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#F3F5F9]">
      {/* Left Form Panel: Tambah / Edit Data Manual */}
      <aside className="w-88 xl:w-96 shrink-0 bg-white border-r border-[#E2E8F0] overflow-y-auto p-5 flex flex-col gap-4 text-xs">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="font-display font-bold text-sm text-[#1F3864]">
              {editingOriginalNo ? `Edit Peserta #${editingOriginalNo}` : 'Tambah Data Peserta Manual'}
            </h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Otomatis tersinkron ke Kartu PAS &amp; Stiker Meja
            </p>
          </div>
          {editingOriginalNo && (
            <button
              type="button"
              onClick={() => resetFormToCreate(students)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#44546A] font-medium transition-colors"
            >
              <X className="w-3 h-3" />
              Batal
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#44546A] font-semibold mb-1">
                No. Urut / Peserta
              </label>
              <input
                type="text"
                value={noInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setNoInput(val);
                  if (!userEditedManually) setUserInput(val);
                }}
                placeholder="620"
                className="w-full px-2.5 py-2 rounded-lg border border-[#CBD5E1] font-mono tabular-nums text-[#131C31]"
              />
            </div>

            <div>
              <label className="block text-[#44546A] font-semibold mb-1">Ruang Ujian</label>
              <input
                type="text"
                list="room-suggestions"
                value={ruangInput}
                onChange={(e) => setRuangInput(e.target.value)}
                placeholder="01"
                className="w-full px-2.5 py-2 rounded-lg border border-[#CBD5E1] font-mono tabular-nums text-[#131C31]"
              />
              <datalist id="room-suggestions">
                {rooms.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRuangInput(r)}
                className={`px-2 py-1 rounded-md font-mono text-[10px] border transition-colors ${
                  normalizeRoomLabel(ruangInput) === r
                    ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#44546A] border-[#E2E8F0] hover:bg-[#EEF2FA]'
                }`}
              >
                R.{r}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[#44546A] font-semibold mb-1">Nama Lengkap Siswa</label>
            <input
              type="text"
              value={namaInput}
              onChange={(e) => setNamaInput(e.target.value)}
              placeholder="Contoh: MUHAMMAD RIZKY PRATAMA"
              className="w-full px-2.5 py-2 rounded-lg border border-[#CBD5E1] text-[#131C31] uppercase"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#44546A] font-semibold">Kelas</label>
              <div className="inline-flex p-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg gap-0.5">
                <button
                  type="button"
                  onClick={() => setKelasMode('preset')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                    kelasMode === 'preset'
                      ? 'bg-[#1F3864] text-white shadow-2xs'
                      : 'text-[#475569] hover:text-[#131C31]'
                  }`}
                >
                  Daftar Kelas
                </button>
                <button
                  type="button"
                  onClick={() => setKelasMode('custom')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                    kelasMode === 'custom'
                      ? 'bg-[#1F3864] text-white shadow-2xs'
                      : 'text-[#475569] hover:text-[#131C31]'
                  }`}
                >
                  Kelas Kustom
                </button>
              </div>
            </div>

            {kelasMode === 'preset' ? (
              <select
                value={kelasPreset}
                onChange={(e) => setKelasPreset(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-[#CBD5E1] bg-white text-[#131C31]"
              >
                {KNOWN_CLASSES.map((k) => (
                  <option key={k} value={k}>
                    {k} ({SCHEDULES_PASTE_NOVEMBER[k].length} mapel Paste Nov)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={kelasCustom}
                onChange={(e) => setKelasCustom(e.target.value)}
                placeholder="Contoh: X7 atau XI 8"
                className="w-full px-2.5 py-2 rounded-lg border border-[#CBD5E1] text-[#131C31]"
              />
            )}
          </div>

          <div>
            <label className="block text-[#44546A] font-semibold mb-1">User Name Login Ujian</label>
            <input
              type="text"
              value={effectiveUser}
              onChange={(e) => {
                setUserEditedManually(true);
                setUserInput(e.target.value);
              }}
              placeholder="Otomatis mengikuti No. Peserta"
              className="w-full px-2.5 py-2 rounded-lg border border-[#CBD5E1] font-mono tabular-nums text-[#131C31]"
            />
          </div>

          {/* Real-time Preview Card/Sticker Strip */}
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 font-mono text-[11px] tabular-nums">
            <div className="text-[#64748B]">Pratinjau Identitas Cetak</div>
            <div className="font-bold text-[#1F3864]">
              {formatParticipantNo(noInput || '---')}
            </div>
            <div className="text-[#0F172A] font-semibold truncate">
              {namaInput.trim().toUpperCase() || 'NAMA LENGKAP SISWA'}
            </div>
            <div className="text-[#44546A]">
              Kelas: <strong>{activeKelas || '-'}</strong> · Ruang:{' '}
              <strong>{normalizeRoomLabel(ruangInput)}</strong> · User:{' '}
              <strong>{effectiveUser || '-'}</strong>
            </div>
            <div className={hasSchedule ? 'text-[#059669]' : 'text-[#B45309]'}>
              {hasSchedule
                ? `Jadwal belakang Paste November tersedia (${SCHEDULES_PASTE_NOVEMBER[activeKelas].length} mapel)`
                : 'Kelas kustom: kartu depan & stiker meja tetap tercetak (jadwal belakang kosong)'}
            </div>
          </div>

          {formMessage && (
            <div
              className={`p-3 rounded-xl border text-[11px] font-medium ${
                formMessage.type === 'ok'
                  ? 'bg-[#ECFDF5] border-[#059669] text-[#065F46]'
                  : 'bg-[#FEF2F2] border-[#DC2626] text-[#991B1B]'
              }`}
            >
              {formMessage.text}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1F3864] hover:bg-[#172B4D] text-white font-bold text-xs shadow-xs hover:shadow transition-all duration-150 active:scale-[0.98]"
          >
            {editingOriginalNo ? (
              <>
                <Check className="w-4 h-4 text-[#C9A227]" />
                Simpan Perubahan Peserta
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-[#C9A227]" />
                Tambah Data Peserta
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
          <h3 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#64748B]">
            Impor / Cadangan CSV
          </h3>
          <label className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-[#94A3B8] hover:border-[#1F3864] hover:bg-[#F8FAFC] text-[#1F3864] font-semibold cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Impor File CSV / TSV Siswa
            <input
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={onImportCsv}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => triggerCsvDownload(students)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] hover:border-[#94A3B8] text-[#1F3864] font-semibold shadow-2xs transition-all duration-150"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Semua Data ({students.length} Siswa)
          </button>
          {csvFeedback && (
            <p className="text-[11px] text-[#059669] font-medium">{csvFeedback}</p>
          )}
        </div>
      </aside>

      {/* Main Table Panel */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Summary & Filter Toolbar */}
        <div className="bg-white border-b border-[#DCE2EE] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-[#44546A]">
            <span>
              Total: <strong className="text-[#1F3864]">{students.length} siswa</strong>
            </span>
            <span>·</span>
            <span>
              Ruang: <strong className="text-[#1F3864]">{rooms.length}</strong>
            </span>
            <span>·</span>
            <span>
              Kelas: <strong className="text-[#1F3864]">{classOptions.length}</strong>
            </span>
            {missingScheduleTotal > 0 && (
              <>
                <span>·</span>
                <span className="text-[#B45309]">
                  Di luar jadwal Paste Nov: {missingScheduleTotal}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari no, nama, kelas, ruang..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white w-56"
              />
            </div>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
            >
              <option value="">Semua Kelas</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
            >
              <option value="">Semua Ruang</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  RUANG {r}
                </option>
              ))}
            </select>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] hover:border-[#94A3B8] text-[#44546A] text-xs font-medium shadow-2xs transition-colors"
                title="Kembalikan daftar siswa ke 619 data awal SMAN 1 ALALAK"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Bawaan ({STUDENTS_MASTER.length})
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 text-xs">
                <span className="text-[#991B1B] font-medium">Reset ke 619 siswa?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetStudents();
                    resetFormToCreate(STUDENTS_MASTER);
                    setConfirmReset(false);
                    setFormMessage({
                      type: 'ok',
                      text: `Daftar peserta dikembalikan ke ${STUDENTS_MASTER.length} siswa bawaan.`,
                    });
                  }}
                  className="px-2 py-0.5 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold transition-colors"
                >
                  Ya
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="flex-1 overflow-auto p-5">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE2EE] text-[#44546A] font-display font-bold">
                  <th className="py-2.5 px-3 w-16">No</th>
                  <th className="py-2.5 px-3 w-44">Nomor Peserta</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3 w-20">Kelas</th>
                  <th className="py-2.5 px-3 w-24">Ruang</th>
                  <th className="py-2.5 px-3 w-24">Meja</th>
                  <th className="py-2.5 px-3 w-24">User</th>
                  <th className="py-2.5 px-3 w-44 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#64748B]">
                      Tidak ada peserta yang cocok dengan filter pencarian saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((st) => {
                    const desk = deskLookup.get(st.no);
                    const isEditing = editingOriginalNo === st.no;
                    return (
                      <tr
                        key={st.no}
                        className={`hover:bg-[#F8FAFC] ${isEditing ? 'bg-[#EEF2FA]' : ''}`}
                      >
                        <td className="py-2 px-3 font-mono font-semibold text-[#1F3864] tabular-nums">
                          {st.no}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#334155] tabular-nums whitespace-nowrap">
                          {formatParticipantNo(st.no)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#0F172A]">{st.nama}</td>
                        <td className="py-2 px-3 font-mono text-[#1F3864]">{st.kelas}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-[#334155]">
                          RUANG {normalizeRoomLabel(st.ruang)}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums font-semibold text-[#7C5808]">
                          {desk ? desk.mejaLabel : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-[#64748B]">
                          {st.user}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onInspectStudentCard(st)}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#EEF2FA] hover:border-[#CBD5E1] text-[#1F3864] transition-colors"
                              title="Lihat Kartu PAS & 3D siswa ini"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(st)}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#EEF2FA] hover:border-[#CBD5E1] text-[#1F3864] transition-colors"
                              title="Edit data peserta"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={students.length <= 1}
                              onClick={() => {
                                if (editingOriginalNo === st.no) resetFormToCreate(students);
                                onDeleteStudent(st.no);
                              }}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#FEF2F2] hover:border-[#FCA5A5] text-[#DC2626] disabled:opacity-40 transition-colors"
                              title="Hapus peserta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
