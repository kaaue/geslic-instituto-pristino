import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Encaminha as chamadas /api para o backend, assim o front usa caminhos
    // relativos e não precisa saber a porta da API.
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
