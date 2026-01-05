import express, { Router } from 'express'
import organizationsRouter from './organizations'
import tasksRouter from './tasks'
import applicationsRouter from './applications'
import taskCategoriesRouter from './taskcategories'
import healthRouter from './health'
import authRouter from './auth'
import applicantRouter from './applicant'
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
