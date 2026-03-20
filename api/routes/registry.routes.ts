import { Router } from 'express'
import { createRecord, getRecord, revokeRecord } from '../controllers/registry.controller.js'

const router = Router()

router.post('/create', createRecord)
router.get('/:qrvid', getRecord)
router.post('/:qrvid/revoke', revokeRecord)

export default router
