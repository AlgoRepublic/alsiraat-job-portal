import express, { Router } from 'express'
import mongoose from 'mongoose'

const router: Router = express.Router()

router.get('/', (_req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  }

  const statusCode = healthCheck.database === 'connected' ? 200 : 503

  res.status(statusCode).json(healthCheck)
})

export default router
