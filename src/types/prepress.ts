export type PaperPreset = 'A4' | 'F4' | 'SRA4' | 'Legal' | 'Letter' | 'custom';

export type ImpositionMode = 'duplex' | 'foldable' | 'front' | 'back' | 'calibration';

export type CropMarkStyle = 'full' | 'crop' | 'none';

export type FlipMode = 'long' | 'short';

export type MarginMode = 'auto' | 'manual';

export type IccProfileId = 'FOGRA39' | 'GRACoL2006' | 'JapanColor2001';

export type MainWorkspaceTab = 'studio' | 'mockup3d' | 'export' | 'docs';

export interface PrepressConfig {
  paper: PaperPreset;
  customW: number;
  customH: number;
  cardW: number;
  cardH: number;
  gapXmm: number;
  gapYmm: number;
  marginMode: MarginMode;
  marginMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
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
  gapXmm: number;
  gapYmm: number;
  bleedMm: number;
  cols: number;
  rows: number;
  gridW: number;
  gridH: number;
  originX: number;
  originY: number;
  backOriginX: number;
  backOriginY: number;
  marginRightActual: number;
  marginBottomActual: number;
  overflowsPaper: boolean;
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
  gapXmm: 0,
  gapYmm: 0,
  marginMode: 'auto',
  marginMm: 3.4,
  marginTopMm: 11.7,
  marginBottomMm: 11.7,
  marginLeftMm: 3.4,
  marginRightMm: 3.4,
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

  const gapXmm = Math.max(0, cfg.gapXmm ?? 0);
  const gapYmm = Math.max(0, cfg.gapYmm ?? 0);

  const isFoldable = cfg.imposition === 'foldable';
  const slotW = cfg.cardW;
  const slotH = isFoldable ? cfg.cardH * 2 : cfg.cardH;

  const isManualMargin = cfg.marginMode === 'manual';
  const availW = isManualMargin
    ? paperW - Math.max(0, cfg.marginLeftMm) - Math.max(0, cfg.marginRightMm)
    : paperW - 2 * Math.max(0, cfg.marginMm);
  const availH = isManualMargin
    ? paperH - Math.max(0, cfg.marginTopMm) - Math.max(0, cfg.marginBottomMm)
    : paperH - 2 * Math.max(0, cfg.marginMm);

  const cols = Math.max(1, Math.floor((availW + gapXmm + 0.001) / (slotW + gapXmm)));
  const rows = Math.max(1, Math.floor((availH + gapYmm + 0.001) / (slotH + gapYmm)));

  const gridW = cols * slotW + (cols - 1) * gapXmm;
  const gridH = rows * slotH + (rows - 1) * gapYmm;

  const originX = isManualMargin ? Math.max(0, cfg.marginLeftMm) : (paperW - gridW) / 2;
  const originY = isManualMargin ? Math.max(0, cfg.marginTopMm) : (paperH - gridH) / 2;

  // Mirror back origin cleanly when manual margins are asymmetric so front/back align 0.0mm
  const backOriginX = cfg.flipMode === 'long' ? paperW - (originX + gridW) : originX;
  const backOriginY = cfg.flipMode === 'short' ? paperH - (originY + gridH) : originY;

  const marginRightActual = +(paperW - (originX + gridW)).toFixed(2);
  const marginBottomActual = +(paperH - (originY + gridH)).toFixed(2);
  const overflowsPaper =
    originX + gridW > paperW + 0.05 ||
    originY + gridH > paperH + 0.05 ||
    marginRightActual < -0.05 ||
    marginBottomActual < -0.05;

  return {
    paperW,
    paperH,
    slotW,
    slotH,
    cardW: cfg.cardW,
    cardH: cfg.cardH,
    gapXmm,
    gapYmm,
    bleedMm: cfg.bleedMm,
    cols,
    rows,
    gridW,
    gridH,
    originX,
    originY,
    backOriginX,
    backOriginY,
    marginRightActual,
    marginBottomActual,
    overflowsPaper,
    cardsPerSheet: cols * rows,
    isFoldable,
  };
}
