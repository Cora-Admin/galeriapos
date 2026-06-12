import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  // SPA-Build; Nginx muss alle Routen auf index.html umleiten (siehe README)
  build: { outDir: "dist", sourcemap: false },
});
