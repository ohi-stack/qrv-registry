import dotenv from 'dotenv'
import { createApp } from './app.js'

dotenv.config()

const app = createApp()
const PORT = process.env.PORT || 4000

const server = app.listen(PORT, () => {
  console.log(`Registry service running on ${PORT}`)
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
