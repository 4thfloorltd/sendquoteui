import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist", 
    emptyOutDir: false  // prevents deletion of CNAME and 404.html
  },
  plugins: [react()]
});