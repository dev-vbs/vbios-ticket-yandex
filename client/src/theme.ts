import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 5 },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  defaultRadius: 'md',
  colors: {
    dark: ['#d4d6d8', '#b2b5b8', '#92969a', '#73777b', '#505458', '#34373a', '#282a2c', '#1d1f20', '#151617', '#101112'],
  },
  components: {
    Card: { defaultProps: { radius: 'md', withBorder: true } },
    Button: { defaultProps: { radius: 'md' } },
    Modal: { defaultProps: { lockScroll: false, radius: 'md' } },
  },
});
