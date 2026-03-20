import express from 'express'
import { batchVerify } from '../controllers/batch.controller.js'
import { rateLimitMiddleware } from '../../src/middleware/rateLimit.middleware.js'

const router = express.Router()

router.post('/verify/batch', rateLimitMiddleware({ max: 100 }), batchVerify)

export default router
