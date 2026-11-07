import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Custom Vite plugin to handle Monaco Editor's customElements usage in
 * Chrome Extension content scripts (isolated world).
 *
 * In Chrome content scripts (isolated world), Chromium explicitly sets
 * window.customElements to null (Blink LocalDOMWindow::customElements returns nullptr).
 * Monaco's esm/vs/base/browser/dom.js registers an unused `connection-observer` element
 * using bare `customElements.get(...)`, which evaluates to null.get(...) and crashes.
 *
 * This plugin safely guards the registration check so it only executes when
 * customElements is truthy and has a .get method.
 */
function monacoCustomElementsPlugin() {
  return {
    name: 'monaco-custom-elements-plugin',
    transform(code, id) {
      if (id.includes('monaco-editor') && id.includes('dom.js')) {
        return code.replace(
          "if (!customElements.get('connection-observer')) {",
          "if (typeof customElements !== 'undefined' && customElements && typeof customElements.get === 'function' && !customElements.get('connection-observer')) {"
        );
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    monacoCustomElementsPlugin()
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/content/content.js'),
      name: 'CFusionContent',
      formats: ['iife'],
      fileName: () => 'content.js'
    },
    rollupOptions: {
      output: {
        extend: true,
        intro: `
  // [CFusion] Custom Elements fallback for Chrome Extension Isolated World
  var customElements = (typeof window !== 'undefined' && window.customElements && typeof window.customElements.get === 'function')
    ? window.customElements
    : {
        _registry: new Map(),
        get: function(name) { return this._registry.get(name); },
        define: function(name, ctor) { this._registry.set(name, ctor); },
        whenDefined: function(name) { return Promise.resolve(); },
        upgrade: function() {}
      };
  try {
    if (typeof window !== 'undefined' && (!window.customElements || typeof window.customElements.get !== 'function')) {
      Object.defineProperty(window, 'customElements', {
        value: customElements,
        configurable: true,
        writable: true
      });
    }
  } catch (_) {}
`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'content.css';
          }
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});
