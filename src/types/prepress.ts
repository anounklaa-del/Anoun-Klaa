export type PaperPreset = 'A4' | 'F4' | 'SRA4' | 'Legal' | 'Letter' | 'custom';

export type ImpositionMode = 'duplex' | 'foldable' | 'front' | 'back' | 'calibration';

export type CropMarkStyle = 'full' | 'crop' | 'none';

export type FlipMode = 'long' | 'short';

export type IccProfileId = 'FOGRA39' | 'GRACoL2006' | 'JapanColor2001';

export type MainWorkspaceTab = 'studio' | 'mockup3d' | 'export' | 'docs';

export interface PrepressConfig {
  paper: PaperPreset;
  customW: number;
  customH: number;
  cardW: number;
  cardH: number;
  gapMm: number;
  marginMm: number;
  bleedMm: number;
  showBleedGuide: boolean;
  showFoldMarks: boolean;
  cropStyle: CropMarkStyle;
  cutOnBack: boolean;
  flipMode: FlipMode;
  dx: number;
  dy: number;
  imposition: ImpositionMode;
  reverseBackOrder: boolean;
  selectedClass: string;
  noFrom: string;
  noTo: string;
  zoomPct: number;
  dpi: 300 | 450 | 600;
  iccProfile: IccProfileId;
  cmykSoftProof: boolean;
  xrayAlignmentOverlay: boolean;
}

export interface SheetGeometry {
  paperW: number;
  paperH: number;
  slotW: number;
  slotH: number;
  cardW: number;
  cardH: number;
  gapMm: number;
  bleedMm: number;
  cols: number;
  rows: number;
  gridW: number;
  gridH: number;
  originX: number;
  originY: number;
  cardsPerSheet: number;
  isFoldable: boolean;
}

export interface AssetCheckItem {
  id: string;
  label: string;
  category: 'Geometri' | 'Warna & PDF/X' | 'Arsip & Dokumentasi';
  passed: boolean;
  detail: string;
}

export interface ArchiveEfficiencyMetrics {
  totalStudents: number;
  filteredStudents: number;
  cardsPerSheet: number;
  totalSheets: number;
  totalPages: number;
  paperUtilizationPct: number;
  wasteAreaMm2: number;
  estimatedPdfSizeMb: number;
  estimatedZipSizeMb: number;
  compressionRatioPct: number;
  manualTimeMinutes: number;
  automatedTimeMinutes: number;
  timeSavedPct: number;
}

export const PAPER_DIMENSIONS: Record<Exclude<PaperPreset, 'custom'>, [number, number, string]> = {
  A4: [210, 297, 'A4 (210 × 297 mm)'],
  F4: [215, 330, 'F4 / Folio (215 × 330 mm)'],
  SRA4: [225, 320, 'SRA4 Oversize Bleed (225 × 320 mm)'],
  Legal: [215.9, 355.6, 'Legal (215,9 × 355,6 mm)'],
  Letter: [215.9, 279.4, 'Letter (215,9 × 279,4 mm)'],
};

export const DEFAULT_PREPRESS_CONFIG: PrepressConfig = {
  paper: 'A4',
  customW: 210,
  customH: 297,
  cardW: 101.6,
  cardH: 68.4,
  gapMm: 0,
  marginMm: 3.4,
  bleedMm: 3.0,
  showBleedGuide: true,
  showFoldMarks: true,
  cropStyle: 'full',
  cutOnBack: true,
  flipMode: 'long',
  dx: 0,
  dy: 0,
  imposition: 'duplex',
  reverseBackOrder: false,
  selectedClass: '',
  noFrom: '',
  noTo: '',
  zoomPct: 58,
  dpi: 300,
  iccProfile: 'FOGRA39',
  cmykSoftProof: false,
  xrayAlignmentOverlay: false,
};

export function computeSheetGeometry(cfg: PrepressConfig): SheetGeometry {
  const [paperW, paperH] =
    cfg.paper === 'custom'
      ? [Math.max(50, cfg.customW), Math.max(50, cfg.customH)]
      : [PAPER_DIMENSIONS[cfg.paper][0], PAPER_DIMENSIONS[cfg.paper][1]];

  const isFoldable = cfg.imposition === 'foldable';
  // In vertical bifold mode, back + front share the horizontal crease fold edge so total slot is cardW x (cardH * 2)
  const slotW = cfg.cardW;
  const slotH = isFoldable ? cfg.cardH * 2 : cfg.cardH;

  const cols = Math.max(1, Math.floor((paperW - 2 * cfg.marginMm + cfg.gapMm) / (slotW + cfg.gapMm)));
  const rows = Math.max(1, Math.floor((paperH - 2 * cfg.marginMm + cfg.gapMm) / (slotH + cfg.gapMm)));

  const gridW = cols * slotW + (cols - 1) * cfg.gapMm;
  const gridH = rows * slotH + (rows - 1) * cfg.gapMm;

  const originX = (paperW - gridW) / 2;
  const originY = (paperH - gridH) / 2;

  return {
    paperW,
    paperH,
    slotW,
    slotH,
    cardW: cfg.cardW,
    cardH: cfg.cardH,
    gapMm: cfg.gapMm,
    bleedMm: cfg.bleedMm,
    cols,
    rows,
    gridW,
    gridH,
    originX,
    originY,
    cardsPerSheet: cols * rows,
    isFoldable,
  };
}
