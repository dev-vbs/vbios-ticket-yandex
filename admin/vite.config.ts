import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { host: '127.0.0.1', proxy: { '/shm': process.env.SHM_HOST || 'http://127.0.0.1:8081' } } });
