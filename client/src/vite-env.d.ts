/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '@mantine/core/styles.css';
declare module '@mantine/notifications/styles.css';
