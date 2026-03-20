import { Router } from 'express'
import registryRoutes from '../api/routes/registry.routes.js'

const router = Router()

router.use('/registry', registryRoutes)

export default router
