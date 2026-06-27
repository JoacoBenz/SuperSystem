'use client';

import { App, ConfigProvider, theme } from 'antd';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

const UI_FONT = `'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#4f46e5',
            colorInfo: '#4f46e5',
            colorLink: '#4f46e5',
            colorLinkHover: '#6366f1',
            borderRadius: 8,
            borderRadiusLG: 10,
            fontFamily: UI_FONT,
            fontSize: 14,
            colorBgLayout: isDark ? '#0c0d11' : '#ffffff',
            colorBorderSecondary: isDark ? '#1c1f27' : '#ecedf1',
            wireframe: false,
          },
          components: {
            Layout: {
              headerBg: isDark ? '#0f1115' : '#ffffff',
              headerHeight: 60,
              siderBg: isDark ? '#0a0b0e' : '#16181d',
              bodyBg: isDark ? '#0c0d11' : '#ffffff',
            },
            Menu: {
              darkItemBg: 'transparent',
              darkSubMenuItemBg: 'transparent',
              darkItemColor: 'rgba(255,255,255,0.58)',
              darkItemHoverBg: 'rgba(255,255,255,0.05)',
              darkItemHoverColor: '#ffffff',
              darkItemSelectedBg: 'rgba(255,255,255,0.07)',
              darkItemSelectedColor: '#ffffff',
              itemBorderRadius: 0,
              itemMarginInline: 0,
              itemMarginBlock: 2,
              itemHeight: 44,
              iconSize: 17,
            },
            Button: {
              controlHeight: 38,
              borderRadius: 8,
              primaryShadow: 'none',
              defaultShadow: 'none',
              fontWeight: 600,
            },
            Input: { controlHeight: 38, borderRadius: 8 },
            InputNumber: { controlHeight: 38, borderRadius: 8 },
            Select: { controlHeight: 38, borderRadius: 8 },
            DatePicker: { controlHeight: 38, borderRadius: 8 },
            Table: {
              headerBg: isDark ? '#14161c' : '#fafafb',
              headerColor: isDark ? undefined : '#8b91a0',
              headerSplitColor: 'transparent',
              borderColor: isDark ? '#1c1f27' : '#eef0f3',
              cellPaddingBlock: 14,
              rowHoverBg: isDark ? '#14161c' : '#f7f7fb',
            },
            Statistic: {
              contentFontSize: 30,
            },
            Tag: { borderRadiusSM: 4 },
            Segmented: { borderRadius: 8 },
            Modal: { borderRadiusLG: 12 },
          },
        }}
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
