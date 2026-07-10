import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(),
            VitePWA({
      registerType: 'autoUpdate', // Atualiza o app sozinho quando você sobe versão nova
      devOptions: {
        enabled: true // Permite que o PWA funcione durante o npm run dev
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Arquivos estáticos
      manifest: {
        name: 'Apex - Personal Training Hub', // Nome completo
        short_name: 'Apex', // Nome que fica embaixo do ícone no celular
        description: 'Seu gerenciador de treinos e alunos',
        theme_color: '#000000', // Cor da barra de status do celular
        background_color: '#000000', // Cor de fundo enquanto carrega
        display: 'standalone', // <--- ISSO TIRA A BARRA DO NAVEGADOR (Fica parecendo app nativo)
        scope: '/',
        start_url: '/',
        orientation: 'portrait', // Trava em pé (opcional)
        icons: [
          {
            src: 'android-chrome-192x192.png', // Você precisa criar esse arquivo (ver Passo 3)
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png', // Você precisa criar esse arquivo (ver Passo 3)
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Importante pro Android (ícone redondinho)
          }
        ]
      }
    })],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
