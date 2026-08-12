import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import similarPrecedents from './api/legal/similar-precedents.js'

function legalSearchDevApi() {
  return {
    name: 'naholo-legal-search-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/legal/similar-precedents', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        req.body = raw
        const response = {
          setHeader: (name, value) => res.setHeader(name, value),
          status(code) { res.statusCode = code; return response },
          json(value) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(value))
          },
        }
        await similarPrecedents(req, response)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), legalSearchDevApi()],
})
