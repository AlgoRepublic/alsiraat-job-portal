import './utils/keys'
import './utils/dotenv'
import path from 'path'
import mongoose from 'mongoose'
import express, { Express } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import compression from 'compression'
import fileUpload from 'express-fileupload'
import apiV1Routes from './routes/api/v1'
import { logInfo } from './utils/log'
import { mongooseConnection } from './config/db'

global.__basedir = __dirname

const app: Express = express()

app.use(cors({ origin: '*' }))
app.use(compression())
app.use(
  fileUpload({
    debug: process.env.NODE_ENV === 'development',
    parseNested: true,
    createParentPath: true,
    preserveExtension: true,
  })
)
app.use(morgan(':method :url :status :response-time ms'))
app.use('/api/v1', apiV1Routes)
app.use('/storage', express.static(path.join(__dirname, '../storage')))

mongooseConnection().then(() => {
  const server = app.listen(process.env.APP_PORT, async () => {
    logInfo(
      `App listening on port ${process.env.APP_PORT} in ${process.env.NODE_ENV} environment`
    )
  })

  const closeServer = async (message: string): Promise<void> => {
    await mongoose.connection.close()
    await server.close()

    logInfo(message)
    process.exit(0)
  }

  process.on('SIGTERM', async () => {
    await closeServer('Server terminated')
  })

  process.on('SIGINT', async () => {
    await closeServer('Server interrupted')
  })
})
