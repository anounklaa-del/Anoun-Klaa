import React from 'react';
import {
  LOGO_LEFT_DATA_URI,
  LOGO_RIGHT_DATA_URI,
  SCHEDULES_PASTE_NOVEMBER,
  type StudentRecord,
} from '../data/pasData';
import type { PrepressConfig, SheetGeometry } from '../types/prepress';

export function FrontCardMarkup({
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
      title={onClick ? `Klik untuk pratinjau 3D / inspeksi: ${student.nama} (${student.kelas})` : undefined}
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
      {bleed > 0 && (
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

export function BackCardMarkup({
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

export function PrepressMarksLayer({
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
    const x = offsetX + c * (geo.slotW + geo.gapXmm);
    xs.push(+x.toFixed(3), +(x + geo.slotW).toFixed(3));
  }
  for (let r = 0; r < geo.rows; r++) {
    const y = offsetY + r * (geo.slotH + geo.gapYmm);
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

      {cfg.showFoldMarks &&
        Array.from({ length: geo.rows }).map((_, r) => {
          const slotTop = offsetY + r * (geo.slotH + geo.gapYmm);
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

/**
 * Renders one or more imposed physical sheets (used by both screen preview and @media print full-batch engine).
 */
export const SheetPagesBlock: React.FC<{
  students: StudentRecord[];
  config: PrepressConfig;
  geo: SheetGeometry;
  sheetIndices: number[];
  selectedStudentNo?: string;
  onSelectStudent?: (s: StudentRecord) => void;
  isPrintDom?: boolean;
}> = ({
  students,
  config,
  geo,
  sheetIndices,
  selectedStudentNo,
  onSelectStudent,
  isPrintDom = false,
}) => {
  if (config.imposition === 'calibration') {
    return (
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
            offsetX={geo.backOriginX + config.dx}
            offsetY={geo.backOriginY + config.dy}
            calibMode={2}
          />
        </section>
      </>
    );
  }

  // Respect reverse back-only ordering if requested
  const orderedIndices =
    config.imposition === 'back' && config.reverseBackOrder
      ? [...sheetIndices].reverse()
      : sheetIndices;

  return (
    <>
      {orderedIndices.map((sIdx) => {
        const sheetChunk = students.slice(
          sIdx * geo.cardsPerSheet,
          (sIdx + 1) * geo.cardsPerSheet,
        );

        if (config.imposition === 'foldable') {
          return (
            <section
              key={`fold-sheet-${sIdx}`}
              className="print-sheet-page relative bg-white mx-auto mb-8 shadow-md overflow-hidden"
              style={{ width: `${geo.paperW}mm`, height: `${geo.paperH}mm` }}
            >
              <span className="no-print absolute left-1.5 top-1 font-mono text-[8pt] text-slate-500">
                Lembar {sIdx + 1} · LIPAT &amp; TEMPEL PRESISI (Paste November Terbalik di Atas + Garis Lipat + Depan di Bawah)
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
                const x = geo.originX + col * (geo.slotW + geo.gapXmm);
                const y = geo.originY + row * (geo.slotH + geo.gapYmm);
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
                      isSelected={!isPrintDom && st.no === selectedStudentNo}
                      onClick={onSelectStudent ? () => onSelectStudent(st) : undefined}
                    />
                  </React.Fragment>
                );
              })}
            </section>
          );
        }

        return (
          <React.Fragment key={`duplex-sheet-${sIdx}`}>
            {config.imposition !== 'back' && (
              <section
                className="print-sheet-page relative bg-white mx-auto mb-8 shadow-md overflow-hidden"
                style={{ width: `${geo.paperW}mm`, height: `${geo.paperH}mm` }}
              >
                <span className="no-print absolute left-1.5 top-1 font-mono text-[8pt] text-slate-500">
                  Lembar {sIdx + 1} · DEPAN ({geo.paperW}×{geo.paperH} mm)
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
                  const x = geo.originX + col * (geo.slotW + geo.gapXmm);
                  const y = geo.originY + row * (geo.slotH + geo.gapYmm);
                  return (
                    <React.Fragment key={`f-${st.no}`}>
                      <FrontCardMarkup
                        student={st}
                        x={x}
                        y={y}
                        w={geo.cardW}
                        h={geo.cardH}
                        bleed={config.bleedMm}
                        isSelected={!isPrintDom && st.no === selectedStudentNo}
                        onClick={onSelectStudent ? () => onSelectStudent(st) : undefined}
                      />
                      {!isPrintDom && config.xrayAlignmentOverlay && (
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
                  Lembar {sIdx + 1} · BELAKANG PASTE NOVEMBER (Simetris {config.flipMode === 'long' ? 'Long-Edge' : 'Short-Edge'} · dx:{config.dx} dy:{config.dy})
                </span>
                {config.cutOnBack && (
                  <PrepressMarksLayer
                    geo={geo}
                    cfg={config}
                    offsetX={geo.backOriginX + config.dx}
                    offsetY={geo.backOriginY + config.dy}
                  />
                )}
                {sheetChunk.map((st, idx) => {
                  let col = idx % geo.cols;
                  let row = Math.floor(idx / geo.cols);
                  if (config.flipMode === 'long') col = geo.cols - 1 - col;
                  else row = geo.rows - 1 - row;
                  const x = geo.backOriginX + col * (geo.slotW + geo.gapXmm) + config.dx;
                  const y = geo.backOriginY + row * (geo.slotH + geo.gapYmm) + config.dy;
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
          </React.Fragment>
        );
      })}
    </>
  );
};
