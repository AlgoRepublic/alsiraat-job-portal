import express, { Router } from 'express'
import { login } from '@/controllers/api/v1/auth'

const app: Router = express.Router()

app.post('/login', login)

export default app
