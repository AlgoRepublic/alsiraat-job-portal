import express, { Router } from 'express'
import organizationsRouter from '@/routes/api/v1/organizations'
import tasksRouter from '@/routes/api/v1/tasks'
import applicationsRouter from '@/routes/api/v1/applications'
import taskCategoriesRouter from '@/routes/api/v1/taskcategories'
import healthRouter from '@/routes/api/v1/health'
import authRouter from '@/routes/api/v1/auth'
import applicantRouter from '@/routes/api/v1/applicant'
import responseHandler from '@/middlewares/response'

const router: Router = express.Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/applicant', applicantRouter)
router.use('/organizations', organizationsRouter)
router.use('/tasks', tasksRouter)
router.use('/applications', applicationsRouter)
router.use('/task-categories', taskCategoriesRouter)
router.use(responseHandler)

export default router
