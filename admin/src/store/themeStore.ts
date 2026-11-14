import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  primaryColor: string;
  primaryColorHover: string;

  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarTextHover: string;
  sidebarTextActive: string;
  sidebarItemHoverBg: string;
  sidebarItemActiveBg: string;

  headerBg: string;
  headerBorder: string;
  headerText: string;

  contentBg: string;
  contentText: string;
  contentTextMuted: string;

  cardBg: string;
  cardBorder: string;
  cardHeaderBg: string;

  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  inputFocusBorder: string;

  tableBg: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  tableBorder: string;
  tableRowHoverBg: string;
  tableRowAltBg: string;
  tableText: string;

  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  buttonSecondaryBorder: string;
  buttonSecondaryHoverBg: string;
}

export const darkTheme: ThemeColors = {
  primaryColor: '#22d3ee',
  primaryColorHover: '#06b6d4',

  sidebarBg: '#1e293b',
  sidebarBorder: '#334155',
  sidebarText: '#94a3b8',
  sidebarTextHover: '#ffffff',
  sidebarTextActive: '#22d3ee',
  sidebarItemHoverBg: 'rgba(51, 65, 85, 0.5)',
  sidebarItemActiveBg: 'rgba(34, 211, 238, 0.1)',

  headerBg: '#1e293b',
  headerBorder: '#334155',
  headerText: '#ffffff',

  contentBg: '#0f172a',
  contentText: '#f1f5f9',
  contentTextMuted: '#94a3b8',

  cardBg: '#1e293b',
  cardBorder: '#334155',
  cardHeaderBg: '#1e293b',

  inputBg: '#1e293b',
  inputBorder: '#475569',
  inputText: '#ffffff',
  inputPlaceholder: '#94a3b8',
  inputFocusBorder: '#22d3ee',

  tableBg: '#1e293b',
  tableHeaderBg: 'rgba(30, 41, 59, 0.8)',
  tableHeaderText: '#94a3b8',
  tableBorder: '#334155',
  tableRowHoverBg: 'rgba(51, 65, 85, 0.3)',
  tableRowAltBg: 'rgba(51, 65, 85, 0.15)',
  tableText: '#cbd5e1',

  buttonSecondaryBg: '#334155',
  buttonSecondaryText: '#e2e8f0',
  buttonSecondaryBorder: '#475569',
  buttonSecondaryHoverBg: '#475569',
};

export const lightTheme: ThemeColors = {
  primaryColor: '#0891b2',
  primaryColorHover: '#0e7490',

  sidebarBg: '#ffffff',
  sidebarBorder: '#e2e8f0',
  sidebarText: '#64748b',
  sidebarTextHover: '#0f172a',
  sidebarTextActive: '#0891b2',
  sidebarItemHoverBg: 'rgba(241, 245, 249, 1)',
  sidebarItemActiveBg: 'rgba(8, 145, 178, 0.1)',

  headerBg: '#ffffff',
  headerBorder: '#e2e8f0',
  headerText: '#0f172a',

  contentBg: '#f1f5f9',
  contentText: '#0f172a',
  contentTextMuted: '#64748b',

  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  cardHeaderBg: '#f8fafc',

  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  inputText: '#0f172a',
  inputPlaceholder: '#94a3b8',
  inputFocusBorder: '#0891b2',

  tableBg: '#ffffff',
  tableHeaderBg: '#f8fafc',
  tableHeaderText: '#64748b',
  tableBorder: '#e2e8f0',
  tableRowHoverBg: '#f8fafc',
  tableRowAltBg: 'rgba(241, 245, 249, 0.7)',
  tableText: '#374151',

  buttonSecondaryBg: '#f1f5f9',
  buttonSecondaryText: '#374151',
  buttonSecondaryBorder: '#e2e8f0',
  buttonSecondaryHoverBg: '#e2e8f0',
};

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: ThemeColors;

  setMode: (mode: ThemeMode) => void;
  setCustomColor: (key: keyof ThemeColors, value: string) => void;
  getEffectiveColors: () => ThemeColors;
  applyTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: getSystemTheme(),
      colors: getSystemTheme() === 'dark' ? darkTheme : lightTheme,

      setMode: (mode) => {
        const resolvedTheme = resolveTheme(mode);
        const baseColors = resolvedTheme === 'dark' ? darkTheme : lightTheme;

        set({
          mode,
          resolvedTheme,
          colors: { ...baseColors }
        });
        get().applyTheme();
      },

      setCustomColor: (key, value) => {
        const resolvedTheme = get().resolvedTheme;
        const baseColors = resolvedTheme === 'dark' ? darkTheme : lightTheme;

        set({
          colors: { ...baseColors }
        });
        get().applyTheme();
      },

      getEffectiveColors: () => {
        return get().colors;
      },

      applyTheme: () => {
        const { colors, resolvedTheme } = get();
        const root = document.documentElement;

        root.classList.remove('light', 'dark');
        root.classList.add(resolvedTheme);

        Object.entries(colors).forEach(([key, value]) => {
          const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(cssVar, value);
        });
      },
    }),
    {
      name: 'shm-theme',
      partialize: (state) => ({
        mode: state.mode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = resolveTheme(state.mode);
          const baseColors = resolvedTheme === 'dark' ? darkTheme : lightTheme;
          state.resolvedTheme = resolvedTheme;
          state.colors = { ...baseColors };

          setTimeout(() => state.applyTheme(), 0);
        }
      },
    }
  )
);

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === 'system') {
      setMode('system');
    }
  });
}
