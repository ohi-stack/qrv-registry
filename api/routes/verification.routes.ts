import express from 'express'
import { verifyRecord } from '../controllers/verification.controller.js'

const router = express.Router()

router.get('/verify/:qrvid', verifyRecord)

export default router
