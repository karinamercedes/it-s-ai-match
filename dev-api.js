// Runs the /api serverless functions inside `npm run dev`, so you don't need
// `vercel dev` locally. Reads keys from .env.local. Not used on Vercel.
import { loadEnv } from 'vite'

export default function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        const name = req.url.slice(5).split('?')[0]
        if (!/^[a-z-]+$/.test(name)) return next()

        let mod
        try {
          mod = await server.ssrLoadModule(`/api/${name}.js`)
        } catch {
          res.statusCode = 404
          return res.end('Not found')
        }

        const chunks = []
        for await (const c of req) chunks.push(c)
        const raw = Buffer.concat(chunks).toString()
        try {
          req.body = raw ? JSON.parse(raw) : {}
        } catch {
          req.body = raw
        }
        res.status = (code) => ((res.statusCode = code), res)
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
          return res
        }
        res.send = (b) => (res.end(b), res)

        try {
          await mod.default(req, res)
        } catch (e) {
          if (!res.headersSent) res.status(500).json({ error: e.message })
        }
      })
    },
  }
}
