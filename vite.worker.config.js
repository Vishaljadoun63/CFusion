import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/assets',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/editor.worker.js'),
      name: 'MonacoEditorWorker',
      formats: ['iife'],
      fileName: () => 'editor.worker.js'
    }
  }
});
