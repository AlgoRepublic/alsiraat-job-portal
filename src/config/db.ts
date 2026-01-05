import mongoose from 'mongoose'
import { logError, logInfo } from '@/utils/log'

mongoose.set(
  'debug',
  ['staging', 'development'].includes(process.env.NODE_ENV || '')
)

mongoose.connection.on('connected', () => {
  logInfo('MongoDB connected')
})

mongoose.connection.on('open', () => {
  logInfo('MongoDB connection open')
})

mongoose.connection.on('disconnected', () => {
  logInfo('MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  logInfo('MongoDB reconnected')
})

mongoose.connection.on('disconnecting', () => {
  logInfo('MongoDB disconnecting')
})

mongoose.connection.on('close', () => {
  logInfo('MongoDB closed')
})

mongoose.connection.on('error', (err: Error) => {
  logError(`MongoDB connection error: ${err}`)
  process.exit(1)
})

export const mongooseConnection = (): Promise<typeof mongoose> => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set')
  }
  return mongoose.connect(process.env.MONGODB_URI)
}
