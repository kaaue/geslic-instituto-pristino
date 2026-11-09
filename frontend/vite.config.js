import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Encaminha as chamadas /api para o backend, assim o front usa caminhos
    // relativos e não precisa saber a porta da API. Se a API estiver em outra
    // porta, suba o front com API_URL=http://localhost:PORTA.
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:3001'
    }
  }
});
