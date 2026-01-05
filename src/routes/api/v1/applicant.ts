import express, { Router } from 'express'
import { signup } from '@/controllers/api/v1/applicant'

const app: Router = express.Router()

app.post('/signup', signup)

export default app
