import React, { useEffect, useState } from 'react';
import {
  Box,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderArchive,
  LayoutDashboard,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Tag,
  Users,
  X,
} from 'lucide-react';
import type { MainWorkspaceTab, PaperPreset } from '../types/prepress';

export interface WorkspaceRouteMeta {
  id: MainWorkspaceTab;
  groupId: 'ringkasan' | 'perangkat' | 'master' | 'produksi';
  groupLabel: string;
  label: string;
  shortLabel: string;
}

export const WORKSPACE_META: Record<MainWorkspaceTab, WorkspaceRouteMeta> = {
  dashboard: {
    id: 'dashboard',
    groupId: 'ringkasan',
    groupLabel: 'Ringkasan',
    label: 'Dashboard Utama',
    shortLabel: 'Dashboard',
  },
  studio: {
    id: 'studio',
    groupId: 'perangkat',
    groupLabel: 'Perangkat Ujian',
    label: 'Kartu Peserta 2D',
    shortLabel: 'Kartu 2D',
  },
  mockup3d: {
    id: 'mockup3d',
    groupId: 'perangkat',
    groupLabel: 'Perangkat Ujian',
    label: 'Mockup Kartu 3D',
    shortLabel: 'Mockup 3D',
  },
  sticker: {
    id: 'sticker',
    groupId: 'perangkat',
    groupLabel: 'Perangkat Ujian',
    label: 'Stiker Meja',
    shortLabel: 'Stiker Meja',
  },
  seating: {
    id: 'seating',
    groupId: 'perangkat',
    groupLabel: 'Perangkat Ujian',
    label: 'Denah Ruang Duduk',
    shortLabel: 'Denah Ruang',
  },
  attendance: {
    id: 'attendance',
    groupId: 'perangkat',
    groupLabel: 'Perangkat Ujian',
    label: 'Daftar Hadir Peserta',
    shortLabel: 'Daftar Hadir',
  },
  students: {
    id: 'students',
    groupId: 'master',
    groupLabel: 'Master Data',
    label: 'Data Siswa & Ruang',
    shortLabel: 'Data Siswa',
  },
  export: {
    id: 'export',
    groupId: 'produksi',
    groupLabel: 'Produksi & Ekspor',
    label: 'Ekspor PDF & Arsip ZIP',
    shortLabel: 'Ekspor ZIP',
  },
  docs: {
    id: 'docs',
    groupId: 'produksi',
    groupLabel: 'Produksi & Ekspor',
    label: 'Panduan & Spesifikasi',
    shortLabel: 'Panduan SOP',
  },
};

interface SidebarNavItem {
  id: MainWorkspaceTab;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface SidebarNavGroup {
  id: WorkspaceRouteMeta['groupId'];
  label: string;
  items: SidebarNavItem[];
}

interface AppSidebarProps {
  activeTab: MainWorkspaceTab;
  collapsed: boolean;
  mobileOpen: boolean;
  onSelectTab: (tab: MainWorkspaceTab) => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  counts: {
    totalStudents: number;
    filteredStudents: number;
    stickers: number;
    seatingPages: number;
    attendancePages: number;
  };
  paper: PaperPreset;
  dpi: number;
  hasActiveCardFilter: boolean;
  cardFilterDesc: string;
  onResetCardFilter: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  collapsed,
  mobileOpen,
  onSelectTab,
  onToggleCollapsed,
  onCloseMobile,
  counts,
  paper,
  dpi,
  hasActiveCardFilter,
  cardFilterDesc,
  onResetCardFilter,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ringkasan: true,
    perangkat: true,
    master: true,
    produksi: true,
  });

  // Ensure the group containing the currently active route stays open
  useEffect(() => {
    const activeGroup = WORKSPACE_META[activeTab]?.groupId;
    if (activeGroup) {
      setOpenGroups((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
    }
  }, [activeTab]);

  const groups: SidebarNavGroup[] = [
    {
      id: 'ringkasan',
      label: 'Ringkasan',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      id: 'perangkat',
      label: 'Perangkat Ujian',
      items: [
        {
          id: 'studio',
          label: 'Kartu Peserta 2D',
          icon: <CreditCard className="w-4 h-4 shrink-0" />,
          count: counts.filteredStudents,
        },
        {
          id: 'mockup3d',
          label: 'Mockup Kartu 3D',
          icon: <Box className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'sticker',
          label: 'Stiker Meja',
          icon: <Tag className="w-4 h-4 shrink-0" />,
          count: counts.stickers,
        },
        {
          id: 'seating',
          label: 'Denah Ruang Duduk',
          icon: <MapPin className="w-4 h-4 shrink-0" />,
          count: counts.seatingPages,
        },
        {
          id: 'attendance',
          label: 'Daftar Hadir',
          icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
          count: counts.attendancePages,
        },
      ],
    },
    {
      id: 'master',
      label: 'Master Data',
      items: [
        {
          id: 'students',
          label: 'Data Siswa & Ruang',
          icon: <Users className="w-4 h-4 shrink-0" />,
          count: counts.totalStudents,
        },
      ],
    },
    {
      id: 'produksi',
      label: 'Produksi & Ekspor',
      items: [
        {
          id: 'export',
          label: 'Ekspor PDF & ZIP',
          icon: <FolderArchive className="w-4 h-4 shrink-0" />,
        },
        {
          id: 'docs',
          label: 'Panduan & SOP',
          icon: <FileText className="w-4 h-4 shrink-0" />,
        },
      ],
    },
  ];

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderSidebarBody = (isCollapsedRail: boolean) => (
    <div className="flex flex-col h-full bg-white text-[#131C31] select-none">
      {/* School Monogram & Brand Header */}
      <div
        className={`h-14 border-b border-[#E2E8F0] flex items-center shrink-0 ${
          isCollapsedRail ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onSelectTab('dashboard');
            onCloseMobile();
          }}
          title="Kembali ke Dashboard SMAN 1 ALALAK"
          className="flex items-center gap-2.5 min-w-0 text-left rounded-lg py-1 pr-1 transition-colors hover:opacity-90"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1F3864] shadow-xs flex items-center justify-center text-[#C9A227] font-display font-extrabold text-sm shrink-0">
            S1
          </div>
          {!isCollapsedRail && (
            <div className="min-w-0">
              <div className="font-display font-bold text-[13px] text-[#1F3864] leading-tight truncate whitespace-nowrap">
                SMAN 1 ALALAK
              </div>
              <div className="font-mono text-[10px] text-[#64748B] truncate whitespace-nowrap">
                Studio Pracetak PAS
              </div>
            </div>
          )}
        </button>

        {!isCollapsedRail && (
          <>
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="Ciutkan menu samping"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[#64748B] hover:text-[#1F3864] hover:bg-[#F1F5F9] transition-all duration-150 shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              title="Tutup menu"
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#64748B] hover:text-[#1F3864] hover:bg-[#F1F5F9] transition-all duration-150 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Expand rail button when collapsed */}
      {isCollapsedRail && (
        <div className="hidden lg:flex justify-center py-2.5 border-b border-[#EEF2F6]">
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Bentangkan menu samping"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[#44546A] hover:text-[#1F3864] hover:bg-[#F1F5F9] transition-all duration-150"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Grouped Navigation */}
      <nav
        aria-label="Navigasi Utama Studio PAS"
        className={`flex-1 overflow-y-auto py-3.5 ${isCollapsedRail ? 'px-2 space-y-3' : 'px-3 space-y-4'}`}
      >
        {groups.map((group, groupIndex) => {
          const isOpen = openGroups[group.id] !== false;
          return (
            <div
              key={group.id}
              className={groupIndex > 0 ? 'pt-3 border-t border-[#EEF2F6]' : ''}
            >
              {!isCollapsedRail ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 mb-1 rounded-md text-[11px] font-display font-bold tracking-wider uppercase text-[#64748B] hover:text-[#1F3864] hover:bg-[#F8FAFC] transition-colors duration-150"
                >
                  <span className="truncate">{group.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      isOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <div className="sr-only">{group.label}</div>
              )}

              {(isOpen || isCollapsedRail) && (
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTab(item.id);
                            onCloseMobile();
                          }}
                          title={
                            isCollapsedRail
                              ? `${item.label}${item.count !== undefined ? ` (${item.count})` : ''}`
                              : undefined
                          }
                          aria-current={isActive ? 'page' : undefined}
                          className={`w-full flex items-center rounded-lg transition-all duration-150 ${
                            isCollapsedRail
                              ? 'justify-center h-10 px-0'
                              : 'justify-between gap-2 px-3 py-2'
                          } text-xs font-medium whitespace-nowrap ${
                            isActive
                              ? 'bg-[#1F3864] text-white font-semibold shadow-xs'
                              : 'text-[#44546A] hover:bg-[#F1F5F9] hover:text-[#131C31]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className={isActive ? 'text-[#C9A227]' : 'text-[#64748B]'}>
                              {item.icon}
                            </span>
                            {!isCollapsedRail && <span className="truncate">{item.label}</span>}
                          </span>

                          {!isCollapsedRail && item.count !== undefined && (
                            <span
                              className={`font-mono text-[11px] tabular-nums shrink-0 ${
                                isActive ? 'text-[#E2E8F0]' : 'text-[#64748B]'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Workspace Specification & Filter Summary */}
      {!isCollapsedRail && (
        <div className="p-3 border-t border-[#E2E8F0] shrink-0">
          <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#44546A]">
              <span>Format Kertas</span>
              <span className="font-semibold text-[#1F3864]">
                {paper} · {dpi} DPI
              </span>
            </div>
            <div className="text-[11px] text-[#55637A] leading-snug">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate" title={cardFilterDesc}>
                  Filter: <strong className="text-[#1F3864]">{cardFilterDesc}</strong>
                </span>
                {hasActiveCardFilter && (
                  <button
                    type="button"
                    onClick={onResetCardFilter}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] hover:bg-[#EEF2FA] text-[10px] font-semibold text-[#1F3864] transition-colors shrink-0"
                    title="Reset filter kartu aktif"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Collapsible Sidebar */}
      <aside
        className={`no-print hidden lg:flex flex-col shrink-0 border-r border-[#DCE2EE] bg-white transition-[width] duration-150 ease-out ${
          collapsed ? 'w-[64px]' : 'w-[248px]'
        }`}
      >
        {renderSidebarBody(collapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#0F172A]/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[264px] max-w-[85vw] h-full border-r border-[#DCE2EE] bg-white">
            {renderSidebarBody(false)}
          </aside>
        </div>
      )}
    </>
  );
};
