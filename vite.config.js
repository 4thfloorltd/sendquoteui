import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const isProd = process.env.NODE_ENV === "production";

// https://vitejs.dev/config/

export default defineConfig({
  base: isProd ? "/sendquote-ui/" : "/",
  plugins: [react()],
  build: {
    outDir: "gh-pages",
  },
});
