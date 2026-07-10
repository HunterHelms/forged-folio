import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://brodieh.com',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
})
