import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/test/**', 'tests/**', 'out/**']
    }
  },
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'tests/mocks/vscode.ts')
    }
  }
});
