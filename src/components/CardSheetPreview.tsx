import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Maximize2,
  Printer,
  Scissors,
} from 'lucide-react';
import {
  LOGO_LEFT_DATA_URI,
  LOGO_RIGHT_DATA_URI,
  SCHEDULES_PASTE_NOVEMBER,
  type StudentRecord,
} from '../data/pasData';
import {
  computeSheetGeometry,
  type PrepressConfig,
  type SheetGeometry,
} from '../types/prepress';

interface CardSheetPreviewProps {
  students: StudentRecord[];
  config: PrepressConfig;
  selectedStudent: StudentRecord;
  onSelectStudent: (student: StudentRecord) => void;
  onConfigChange: (patch: Partial<PrepressConfig>) => void;
}

function FrontCardMarkup({
  student,
  x,
  y,
  w,
  h,
  bleed,
  onClick,
  isSelected,
}: {
  student: StudentRecord;
  x: number;
  y: number;
  w: number;
  h: number;
  bleed: number;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      title={`Klik untuk pratinjau 3D / inspeksi: ${student.nama} (${student.kelas})`}
      style={{
        position: 'absolute',
        left: `${x}mm`,
        top: `${y}mm`,
        width: `${w}mm`,
        height: `${h}mm`,
        padding: '1.25mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#000',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isSelected ? 'inset 0 0 0 0.6mm #C9A227' : undefined,
      }}
    >
      {/* 3mm Bleed edge continuation */}
      {bleed > 0 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: `${-bleed}mm`,
              top: '16.25mm',
              width: `${w + bleed * 2}mm`,
              height: '6mm',
              background: '#1F3864',
              opacity: 0.14,
              pointerEvents: 'none',
            }}
          />
        </>
      )}
      <div
        style={{
          height: '100%',
          border: '0.5mm solid #1F3864',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#fff',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            height: '15mm',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5mm',
            padding: '0 2mm',
            borderBottom: '0.8mm solid #C9A227',
          }}
        >
          <img src={LOGO_LEFT_DATA_URI} alt="" style={{ height: '11.5mm', width: 'auto' }} />
          <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.2 }}>
            <div style={{ fontSize: '7.5pt', fontWeight: 700, color: '#1F3864' }}>
              PAS (PENILAIAN AKHIR SEMESTER)
            </div>
            <div style={{ fontSize: '14pt', fontWeight: 700, color: '#24407F' }}>
              SMAN 1 ALALAK
            </div>
            <div style={{ fontSize: '7pt', color: '#44546A' }}>
              TAHUN AJARAN 2026-2027
            </div>
          </div>
          <img src={LOGO_RIGHT_DATA_URI} alt="" style={{ height: '10mm', width: 'auto' }} />
        </div>

        {/* Band */}
        <div
          style={{
            height: '6mm',
            flex: 'none',
            background: '#1F3864',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '10.5pt',
            letterSpacing: '0.9mm',
            lineHeight: '6mm',
            whiteSpace: 'nowrap',
          }}
        >
          KARTU UJIAN PAS
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '2mm',
            padding: '0 2.5mm',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {(
              [
                ['NO. PESERTA', `2026/SMAN 1 ALALAK/${student.no}`, false],
                ['NAMA', student.nama, student.nama.length > 24],
                ['KELAS', student.kelas, false],
                ['RUANG', student.ruang, false],
                ['USER NAME', student.user, false],
              ] as Array<[string, string, boolean]>
            ).map(([label, val, sm]) => (
              <div
                key={label}
                style={{ display: 'flex', lineHeight: '5.2mm', whiteSpace: 'nowrap' }}
              >
                <span
                  style={{
                    width: '21mm',
                    flex: 'none',
                    fontSize: '7pt',
                    fontWeight: 700,
                    color: '#44546A',
                  }}
                >
                  {label}
                </span>
                <span style={{ width: '2.5mm', flex: 'none', color: '#44546A' }}>:</span>
                <strong
                  style={{
                    fontSize: sm ? '8pt' : '9.5pt',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {val}
                </strong>
              </div>
            ))}
          </div>

          <div
            style={{
              width: '20mm',
              height: '30mm',
              flex: 'none',
              border: '0.25mm dashed #9aa5bd',
              background: '#f5f7fb',
              position: 'relative',
            }}
          >
            <svg
              viewBox="0 0 40 46"
              style={{ position: 'absolute', left: '3mm', top: '6mm', width: '14mm', height: '16mm' }}
            >
              <circle cx="20" cy="14" r="9" fill="none" stroke="#c3cadb" strokeWidth="2.4" />
              <path
                d="M3 46C3 31 11 27 20 27S37 31 37 46"
                fill="none"
                stroke="#c3cadb"
                strokeWidth="2.4"
              />
            </svg>
            <span
              style={{
                position: 'absolute',
                right: '1mm',
                bottom: '0.8mm',
                fontSize: '5.5pt',
                fontWeight: 700,
                color: '#7a869f',
              }}
            >
              FOTO 2x3
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            height: '5mm',
            flex: 'none',
            background: '#E9EEF7',
            color: '#44546A',
            fontStyle: 'italic',
            fontSize: '7pt',
            textAlign: 'center',
            lineHeight: '5mm',
          }}
        >
          Kartu ini wajib dibawa selama ujian berlangsung
        </div>
      </div>
    </div>
  );
}

function BackCardMarkup({
  kelas,
  x,
  y,
  w,
  h,
  rotate180,
  ghostOverlay,
}: {
  kelas: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate180?: boolean;
  ghostOverlay?: boolean;
}) {
  const rows = SCHEDULES_PASTE_NOVEMBER[kelas] ?? [];
  const isDense = rows.length >= 16;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}mm`,
        top: `${y}mm`,
        width: `${w}mm`,
        height: `${h}mm`,
        padding: '1.25mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#000',
        transform: rotate180 ? 'rotate(180deg)' : undefined,
        opacity: ghostOverlay ? 0.34 : 1,
        pointerEvents: ghostOverlay ? 'none' : 'auto',
        zIndex: ghostOverlay ? 4 : 1,
      }}
    >
      <div
        style={{
          height: '100%',
          border: `0.5mm solid ${ghostOverlay ? '#EC008C' : '#1F3864'}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: ghostOverlay ? 'rgba(236, 0, 140, 0.04)' : '#fff',
        }}
      >
        <div
          style={{
            height: '5.6mm',
            flex: 'none',
            background: '#1F3864',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '9.5pt',
            letterSpacing: '0.6mm',
            lineHeight: '5.6mm',
            whiteSpace: 'nowrap',
          }}
        >
          JADWAL PAS &nbsp;•&nbsp; KELAS {kelas}
        </div>
        <div
          style={{
            flex: 'none',
            fontSize: '6.6pt',
            fontWeight: 700,
            color: '#1F3864',
            textAlign: 'center',
            lineHeight: '3.8mm',
          }}
        >
          SMAN 1 ALALAK &nbsp;•&nbsp; TAHUN AJARAN 2026-2027
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '0 1.4mm',
            minHeight: 0,
          }}
        >
          <div
            style={{
              flex: 'none',
              display: 'grid',
              gridTemplateColumns: '52mm 1fr',
              alignItems: 'center',
              background: '#E9EEF7',
              borderBottom: '0.45mm solid #C9A227',
              fontWeight: 700,
              color: '#1F3864',
              height: '3.8mm',
              fontSize: '6.6pt',
              padding: '0 0.8mm',
            }}
          >
            <span style={{ textAlign: 'center' }}>Hari / Waktu</span>
            <span style={{ textAlign: 'center' }}>Mata Pelajaran</span>
          </div>
          {rows.map(([day, time, subj], i) => (
            <div
              key={`${day}-${time}-${i}`}
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                lineHeight: 1,
                display: 'grid',
                gridTemplateColumns: '28mm 24mm 1fr',
                alignItems: 'center',
                fontSize: isDense ? '5.65pt' : '6.35pt',
                borderBottom: '0.1mm solid #c5cee0',
                background: i % 2 === 1 ? '#f8fafd' : 'transparent',
                padding: '0 0.8mm',
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>{day}</span>
              <span style={{ color: '#44546A', whiteSpace: 'nowrap' }}>{time}</span>
              <span
                style={{
                  fontWeight: 700,
                  color: '#1F3864',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  fontSize: subj.length > 26 ? '4.95pt' : undefined,
                }}
              >
                {subj}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            height: '4.5mm',
            flex: 'none',
            background: '#E9EEF7',
            color: '#44546A',
            fontStyle: 'italic',
            fontSize: '6.5pt',
            textAlign: 'center',
            lineHeight: '4.5mm',
          }}
        >
          Waktu dalam WITA &nbsp;•&nbsp; Panitia PAS Semester 1 TP 2026/2027
        </div>
      </div>
    </div>
  );
}

function PrepressMarksLayer({
  geo,
  cfg,
  offsetX,
  offsetY,
  calibMode,
}: {
  geo: SheetGeometry;
  cfg: PrepressConfig;
  offsetX: number;
  offsetY: number;
  calibMode?: 1 | 2;
}) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let c = 0; c < geo.cols; c++) {
    const x = offsetX + c * (geo.slotW + geo.gapMm);
    xs.push(+x.toFixed(3), +(x + geo.slotW).toFixed(3));
  }
  for (let r = 0; r < geo.rows; r++) {
    const y = offsetY + r * (geo.slotH + geo.gapMm);
    ys.push(+y.toFixed(3), +(y + geo.slotH).toFixed(3));
  }
  const ux = [...new Set(xs)];
  const uy = [...new Set(ys)];
  const tickX = Math.max(0.8, Math.min(3.8, offsetX - 0.5));
  const tickY = Math.max(0.8, Math.min(3.8, offsetY - 0.5));

  if (calibMode) {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
        {ux.map((x) =>
          uy.map((y) =>
            calibMode === 1 ? (
              <React.Fragment key={`cal-${x}-${y}`}>
                <i
                  style={{
                    position: 'absolute',
                    left: `${x - 2}mm`,
                    top: `${y - 0.12}mm`,
                    width: '4mm',
                    height: '0.24mm',
                    background: '#000',
                  }}
                />
                <i
                  style={{
                    position: 'absolute',
                    left: `${x - 0.12}mm`,
                    top: `${y - 2}mm`,
                    width: '0.24mm',
                    height: '4mm',
                    background: '#000',
                  }}
                />
              </React.Fragment>
            ) : (
              <i
                key={`cal2-${x}-${y}`}
                style={{
                  position: 'absolute',
                  left: `${x - 1.5}mm`,
                  top: `${y - 1.5}mm`,
                  width: '3mm',
                  height: '3mm',
                  border: '0.25mm solid #000',
                  borderRadius: '50%',
                }}
              />
            ),
          ),
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {/* 3mm Bleed Guide Boundary (Cyan dashed) */}
      {cfg.bleedMm > 0 && cfg.showBleedGuide && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.max(0.3, offsetX - cfg.bleedMm)}mm`,
            top: `${Math.max(0.3, offsetY - cfg.bleedMm)}mm`,
            width: `${Math.min(geo.paperW - 0.6, geo.gridW + cfg.bleedMm * 2)}mm`,
            height: `${Math.min(geo.paperH - 0.6, geo.gridH + cfg.bleedMm * 2)}mm`,
            border: '0.22mm dashed #00AEEF',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Fold / Crease Marks (Magenta dashed ticks + centerline) */}
      {cfg.showFoldMarks &&
        Array.from({ length: geo.rows }).map((_, r) => {
          const slotTop = offsetY + r * (geo.slotH + geo.gapMm);
          const foldY = geo.isFoldable ? slotTop + geo.cardH : slotTop + geo.cardH / 2;
          return (
            <React.Fragment key={`fold-${r}`}>
              <i
                style={{
                  position: 'absolute',
                  left: `${Math.max(0.2, offsetX - 3.6)}mm`,
                  top: `${foldY}mm`,
                  width: `${Math.min(3.2, Math.max(1, offsetX - 0.5))}mm`,
                  borderTop: '0.28mm dashed #EC008C',
                }}
              />
              <i
                style={{
                  position: 'absolute',
                  left: `${offsetX + geo.gridW + 0.4}mm`,
                  top: `${foldY}mm`,
                  width: `${Math.min(3.2, Math.max(1, geo.paperW - (offsetX + geo.gridW) - 0.5))}mm`,
                  borderTop: '0.28mm dashed #EC008C',
                }}
              />
              {geo.isFoldable && (
                <i
                  style={{
                    position: 'absolute',
                    left: `${offsetX}mm`,
                    top: `${foldY}mm`,
                    width: `${geo.gridW}mm`,
                    borderTop: '0.25mm dashed #EC008C',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

      {/* Crop Marks & Cut Lines */}
      {cfg.cropStyle !== 'none' && (
        <>
          {ux.map((x) => (
            <React.Fragment key={`cx-${x}`}>
              <i
                style={{
                  position: 'absolute',
                  left: `${x - 0.12}mm`,
                  top: `${Math.max(0, offsetY - tickY)}mm`,
                  width: '0.24mm',
                  height: `${tickY}mm`,
                  background: '#000',
                }}
              />
              <i
                style={{
                  position: 'absolute',
                  left: `${x - 0.12}mm`,
                  top: `${offsetY + geo.gridH}mm`,
                  width: '0.24mm',
                  height: `${tickY}mm`,
                  background: '#000',
                }}
              />
              {cfg.cropStyle === 'full' && (
                <i
                  style={{
                    position: 'absolute',
                    left: `${x - 0.06}mm`,
                    top: `${offsetY}mm`,
                    width: '0.12mm',
                    height: `${geo.gridH}mm`,
                    background: '#7b879e',
                  }}
                />
              )}
            </React.Fragment>
          ))}
          {uy.map((y) => (
            <React.Fragment key={`cy-${y}`}>
              <i
                style={{
                  position: 'absolute',
                  left: `${Math.max(0, offsetX - tickX)}mm`,
                  top: `${y - 0.12}mm`,
                  width: `${tickX}mm`,
                  height: '0.24mm',
                  background: '#000',
                }}
              />
              <i
                style={{
                  position: 'absolute',
                  left: `${offsetX + geo.gridW}mm`,
                  top: `${y - 0.12}mm`,
                  width: `${tickX}mm`,
                  height: '0.24mm',
                  background: '#000',
                }}
              />
              {cfg.cropStyle === 'full' && (
                <i
                  style={{
                    position: 'absolute',
                    left: `${offsetX}mm`,
                    top: `${y - 0.06}mm`,
                    width: `${geo.gridW}mm`,
                    height: '0.12mm',
                    background: '#7b879e',
                  }}
                />
              )}
            </React.Fragment>
          ))}
          {cfg.cropStyle === 'crop' &&
            ux.map((x) =>
              uy.map((y) => (
                <React.Fragment key={`cr-${x}-${y}`}>
                  <i
                    style={{
                      position: 'absolute',
                      left: `${x - 1}mm`,
                      top: `${y - 0.1}mm`,
                      width: '2mm',
                      height: '0.2mm',
                      background: '#000',
                    }}
                  />
                  <i
                    style={{
                      position: 'absolute',
                      left: `${x - 0.1}mm`,
                      top: `${y - 1}mm`,
                      width: '0.2mm',
                      height: '2mm',
                      background: '#000',
                    }}
                  />
                </React.Fragment>
              )),
            )}
        </>
      )}
    </div>
  );
}

export const CardSheetPreview: React.FC<CardSheetPreviewProps> = ({
  students,
  config,
  selectedStudent,
  onSelectStudent,
  onConfigChange,
}) => {
  const [sheetIndex, setSheetIndex] = useState(0);
  const geo = useMemo(() => computeSheetGeometry(config), [config]);
  const totalSheets = Math.max(1, Math.ceil(students.length / geo.cardsPerSheet));
  const safeSheetIdx = Math.min(sheetIndex, totalSheets - 1);
  const sheetChunk = useMemo(
    () =>
      students.slice(
        safeSheetIdx * geo.cardsPerSheet,
        (safeSheetIdx + 1) * geo.cardsPerSheet,
      ),
    [students, safeSheetIdx, geo.cardsPerSheet],
  );

  // Soft-proof CSS filter approximating coated CMYK ink gamut
  const proofFilter = config.cmykSoftProof
    ? 'contrast(0.95) saturate(0.92) sepia(0.04)'
    : undefined;

  return (
    <div className="flex flex-col h-full bg-[#E9EDF5]">
      {/* Viewport Sub-toolbar */}
      <div className="no-print flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-[#DCE2EE] shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={safeSheetIdx <= 0 || config.imposition === 'calibration'}
            onClick={() => setSheetIndex((i) => Math.max(0, i - 1))}
            className="p-1.5 border border-[#DCE2EE] rounded hover:bg-[#F3F5F9] disabled:opacity-40"
            title="Lembar sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-[#1F3864]" />
          </button>
          <span className="font-mono text-xs font-semibold text-[#1F3864] tabular-nums whitespace-nowrap">
            {config.imposition === 'calibration'
              ? 'TES KALIBRASI (2 HAL)'
              : `LEMBAR ${safeSheetIdx + 1} / ${totalSheets}`}
          </span>
          <button
            type="button"
            disabled={safeSheetIdx >= totalSheets - 1 || config.imposition === 'calibration'}
            onClick={() => setSheetIndex((i) => Math.min(totalSheets - 1, i + 1))}
            className="p-1.5 border border-[#DCE2EE] rounded hover:bg-[#F3F5F9] disabled:opacity-40"
            title="Lembar berikutnya"
          >
            <ChevronRight className="w-4 h-4 text-[#1F3864]" />
          </button>
          <span className="text-xs text-[#55637A] font-mono tabular-nums whitespace-nowrap ml-2">
            {geo.cols}×{geo.rows} ({geo.cardsPerSheet}/lembar) · Margin {geo.originX.toFixed(1)}×{geo.originY.toFixed(1)}mm
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#334155] cursor-pointer whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              checked={config.showBleedGuide}
              onChange={(e) => onConfigChange({ showBleedGuide: e.target.checked })}
              className="accent-[#00AEEF]"
            />
            Bleed {config.bleedMm}mm
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#334155] cursor-pointer whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              checked={config.showFoldMarks}
              onChange={(e) => onConfigChange({ showFoldMarks: e.target.checked })}
              className="accent-[#EC008C]"
            />
            Fold Marks
          </label>
          <label
            className="flex items-center gap-1.5 text-xs font-medium text-[#334155] cursor-pointer whitespace-nowrap shrink-0"
            title="Simulasi lapisan transparan sisi belakang di atas depan untuk memeriksa kesimetrisan potong"
          >
            <input
              type="checkbox"
              checked={config.xrayAlignmentOverlay}
              onChange={(e) => onConfigChange({ xrayAlignmentOverlay: e.target.checked })}
              className="accent-[#EC008C]"
            />
            <Layers className="w-3.5 h-3.5 text-[#EC008C]" />
            X-Ray Simetri
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#334155] cursor-pointer whitespace-nowrap shrink-0">
            <input
              type="checkbox"
              checked={config.cmykSoftProof}
              onChange={(e) => onConfigChange({ cmykSoftProof: e.target.checked })}
              className="accent-[#1F3864]"
            />
            <Eye className="w-3.5 h-3.5 text-[#1F3864]" />
            Soft-Proof CMYK
          </label>

          <div className="flex items-center gap-1.5 border-l border-[#DCE2EE] pl-3">
            <Maximize2 className="w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="range"
              min={30}
              max={105}
              value={config.zoomPct}
              onChange={(e) => onConfigChange({ zoomPct: Number(e.target.value) })}
              className="w-20 accent-[#1F3864]"
            />
            <span className="font-mono text-xs text-[#1F3864] w-9 text-right tabular-nums">
              {config.zoomPct}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1F3864] text-white text-xs font-semibold rounded hover:bg-[#16294B] whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Halaman
          </button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="no-print flex items-center justify-between px-4 py-1.5 bg-[#F8FAFC] border-b border-[#DCE2EE] text-[11px] text-[#475569] shrink-0">
        <div className="flex items-center gap-4 whitespace-nowrap overflow-x-auto">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 border-t-2 border-dashed border-[#00AEEF]" />
            Bleed {config.bleedMm}mm
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 border-t-2 border-dashed border-[#EC008C]" />
            Penanda Lipatan (Fold)
          </span>
          <span className="flex items-center gap-1.5">
            <Scissors className="w-3 h-3 text-black" />
            Garis Potong (Crop Marks)
          </span>
          <span className="font-mono text-[#1F3864]">
            Klik kartu mana pun untuk muat ke Pratinjau 3D
          </span>
        </div>
        <span className="font-mono text-[#1F3864] font-semibold whitespace-nowrap">
          Aktif 3D: #{selectedStudent.no} {selectedStudent.nama} ({selectedStudent.kelas})
        </span>
      </div>

      {/* Sheets Viewport */}
      <div className="print-only-container flex-1 overflow-auto p-6">
        {students.length === 0 ? (
          <div className="max-w-md mx-auto mt-16 bg-white border border-[#DCE2EE] p-8 text-center">
            <p className="font-display font-bold text-[#1F3864] text-base">
              Tidak ada siswa sesuai filter
            </p>
            <p className="text-sm text-[#55637A] mt-1">
              Sesuaikan pilihan kelas atau rentang nomor peserta di panel konfigurasi kiri.
            </p>
            <button
              type="button"
              onClick={() => onConfigChange({ selectedClass: '', noFrom: '', noTo: '' })}
              className="mt-4 px-4 py-2 bg-[#1F3864] text-white text-xs font-semibold rounded"
            >
              Tampilkan Semua 619 Siswa
            </button>
          </div>
        ) : (
          <div
            style={{
              zoom: config.zoomPct / 100,
              transformOrigin: 'top center',
              filter: proofFilter,
            }}
          >
            {config.imposition === 'calibration' ? (
              <>
                <section
                  className="print-sheet-page relative bg-white mx-auto mb-8 shadow-md overflow-hidden"
                  style={{ width: `${geo.paperW}mm`, height: `${geo.paperH}mm` }}
                >
                  <span className="no-print absolute left-1.5 top-1 font-mono text-[8pt] text-slate-500">
                    TES KALIBRASI PRESISI · DEPAN (Tanda +)
                  </span>
                  <PrepressMarksLayer
                    geo={geo}
                    cfg={config}
                    offsetX={geo.originX}
                    offsetY={geo.originY}
                    calibMode={1}
                  />
                </section>
                <section
                  className="print-sheet-page relative bg-white mx-auto mb-8 shadow-md overflow-hidden"
                  style={{ width: `${geo.paperW}mm`, height: `${geo.paperH}mm` }}
                >
                  <span className="no-print absolute left-1.5 top-1 font-mono text-[8pt] text-slate-500">
                    TES KALIBRASI PRESISI · BELAKANG (Lingkaran ○ harus tepat di tengah + | dx:{config.dx} dy:{config.dy})
                  </span>
                  <PrepressMarksLayer
                    geo={geo}
                    cfg={config}
                    offsetX={geo.originX + config.dx}
                    offsetY={geo.originY + config.dy}
                    calibMode={2}
                  />
                </section>
              </>
            ) : config.imposition === 'foldable' ? (
              <section
                className="print-sheet-page relative bg-white mx-auto mb-8 shadow-md overflow-hidden"
                style={{ width: `${geo.paperW}mm`, height: `${geo.paperH}mm` }}
              >
                <span className="no-print absolute left-1.5 top-1 font-mono text-[8pt] text-slate-500">
                  Lembar {safeSheetIdx + 1} · LIPAT &amp; TEMPEL PRESISI (Paste November Terbalik di Atas + Garis Lipat + Depan di Bawah)
                </span>
                <PrepressMarksLayer
                  geo={geo}
                  cfg={config}
                  offsetX={geo.originX}
                  offsetY={geo.originY}
                />
                {sheetChunk.map((st, idx) => {
                  const col = idx % geo.cols;
                  const row = Math.floor(idx / geo.cols);
                  const x = geo.originX + col * (geo.slotW + geo.gapMm);
                  const y = geo.originY + row * (geo.slotH + geo.gapMm);
                  return (
                    <React.Fragment key={st.no}>
                      <BackCardMarkup
                        kelas={st.kelas}
                        x={x}
                        y={y}
                        w={geo.cardW}
                        h={geo.cardH}
                        rotate180
                      />
                      <FrontCardMarkup
                        student={st}
                        x={x}
                        y={y + geo.cardH}
                        w={geo.cardW}
                        h={geo.cardH}
                        bleed={config.bleedMm}
                        isSelected={st.no === selectedStudent.no}
                        onClick={() => onSelectStudent(st)}
                      />
                    </React.Fragment>
                  );
                })}
              </section>
            ) : (
              <>
                {config.imposition !== 'back' && (
                  <section
                    className="print-sheet-page relative bg-white mx-auto mb-8 shadow-md overflow-hidden"
                    style={{ width: `${geo.paperW}mm`, height: `${geo.paperH}mm` }}
                  >
                    <span className="no-print absolute left-1.5 top-1 font-mono text-[8pt] text-slate-500">
                      Lembar {safeSheetIdx + 1} · DEPAN ({geo.paperW}×{geo.paperH} mm)
                    </span>
                    <PrepressMarksLayer
                      geo={geo}
                      cfg={config}
                      offsetX={geo.originX}
                      offsetY={geo.originY}
                    />
                    {sheetChunk.map((st, idx) => {
                      const col = idx % geo.cols;
                      const row = Math.floor(idx / geo.cols);
                      const x = geo.originX + col * (geo.slotW + geo.gapMm);
                      const y = geo.originY + row * (geo.slotH + geo.gapMm);
                      return (
                        <React.Fragment key={`f-${st.no}`}>
                          <FrontCardMarkup
                            student={st}
                            x={x}
                            y={y}
                            w={geo.cardW}
                            h={geo.cardH}
                            bleed={config.bleedMm}
                            isSelected={st.no === selectedStudent.no}
                            onClick={() => onSelectStudent(st)}
                          />
                          {config.xrayAlignmentOverlay && (
                            <BackCardMarkup
                              kelas={st.kelas}
                              x={x + config.dx}
                              y={y + config.dy}
                              w={geo.cardW}
                              h={geo.cardH}
                              ghostOverlay
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </section>
                )}

                {config.imposition !== 'front' && (
                  <section
                    className="print-sheet-page relative bg-white mx-auto mb-8 shadow-md overflow-hidden"
                    style={{ width: `${geo.paperW}mm`, height: `${geo.paperH}mm` }}
                  >
                    <span className="no-print absolute left-1.5 top-1 font-mono text-[8pt] text-slate-500">
                      Lembar {safeSheetIdx + 1} · BELAKANG PASTE NOVEMBER (Simetris {config.flipMode === 'long' ? 'Long-Edge' : 'Short-Edge'} · dx:{config.dx} dy:{config.dy})
                    </span>
                    {config.cutOnBack && (
                      <PrepressMarksLayer
                        geo={geo}
                        cfg={config}
                        offsetX={geo.originX + config.dx}
                        offsetY={geo.originY + config.dy}
                      />
                    )}
                    {sheetChunk.map((st, idx) => {
                      let col = idx % geo.cols;
                      let row = Math.floor(idx / geo.cols);
                      if (config.flipMode === 'long') col = geo.cols - 1 - col;
                      else row = geo.rows - 1 - row;
                      const x = geo.originX + col * (geo.slotW + geo.gapMm) + config.dx;
                      const y = geo.originY + row * (geo.slotH + geo.gapMm) + config.dy;
                      return (
                        <BackCardMarkup
                          key={`b-${st.no}`}
                          kelas={st.kelas}
                          x={x}
                          y={y}
                          w={geo.cardW}
                          h={geo.cardH}
                        />
                      );
                    })}
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
