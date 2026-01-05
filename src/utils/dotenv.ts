import { logError } from '@/utils/log'
import { accessSync } from 'fs'
import { config } from 'dotenv'

if (!process.env.NODE_ENV) {
  logError('NODE_ENV is not defined')
  process.exit(1)
}

const validNodeEnvList = ['development', 'staging', 'production']

if (!validNodeEnvList.includes(process.env.NODE_ENV)) {
  logError(
    'NODE_ENV is invalid, must be one of: ' + validNodeEnvList.join(', ')
  )
  process.exit(1)
}

const nodeEnvFile = '.env.' + process.env.NODE_ENV

try {
  accessSync(nodeEnvFile)
} catch (e) {
  logError(nodeEnvFile + ' file not found')
  process.exit(1)
}

config({ path: nodeEnvFile })

process.env.APP_PORT = process.env.APP_PORT || '3000'
