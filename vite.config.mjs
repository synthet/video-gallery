import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var galleryServerUrl = process.env.VITE_GALLERY_SERVER_URL || 'http://127.0.0.1:3002';
console.log("[Vite] Proxying /gallery-api and /media to: ".concat(galleryServerUrl));
// https://vite.dev/config/
export default defineConfig(function (_a) {
    var command = _a.command;
    return ({
        plugins: [react()],
        // Dev: `/` avoids baseMiddleware 404 for absolute paths. Build keeps `./` for Electron/file://.
        base: command === 'serve' ? '/' : './',
        server: {
            port: 5174,
            strictPort: true,
            host: true,
            proxy: {
                '/gallery-api': {
                    target: galleryServerUrl,
                    changeOrigin: true,
                },
                '/media': {
                    target: galleryServerUrl,
                    changeOrigin: true,
                },
            },
        },
    });
});
