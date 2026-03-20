import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import routes from './routes.js'
import { errorMiddleware } from './middleware/error.middleware.js'

export function createApp() {
  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use(helmet())
  app.use(cors())
  app.use(morgan('combined'))
  app.use(routes)
  app.use(errorMiddleware)
  return app
}
