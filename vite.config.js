import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  // SPA-Build; das Hosting muss alle Routen auf index.html umleiten
  // (auf Vercel erledigt das der Rewrite in vercel.json)
  build: { outDir: "dist", sourcemap: false },
});
