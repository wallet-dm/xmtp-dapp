import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @xmtp/browser-sdk resolves its worker via `new URL("./workers/client",
    // import.meta.url)`. Pre-bundling rewrites import.meta.url and breaks that
    // lookup, so the SDK and its WASM bindings are excluded per the
    // browser-sdk README.
    exclude: ["@xmtp/wasm-bindings", "@xmtp/browser-sdk"],
  },
});
