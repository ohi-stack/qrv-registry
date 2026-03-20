import express from 'express'
import { createWebhook, listWebhooks } from '../controllers/webhook.controller.js'
import { issuerAuthMiddleware } from '../../src/middleware/auth.middleware.js'

const router = express.Router()

router.post('/webhooks', issuerAuthMiddleware, createWebhook)
router.get('/webhooks', issuerAuthMiddleware, listWebhooks)

export default router
