import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
  entry: ['./src/index.ts'],
  dts: true,
  clean: true,
  format: ['cjs', 'esm'],
  minify: !options.watch,
  tsconfig: options.watch ? './tsconfig.dev.json' : './tsconfig.json',
}))
