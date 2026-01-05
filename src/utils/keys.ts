import { readFileSync } from 'fs'

process.env.APP_PUBLIC_KEY = readFileSync('./keys/public.pem', 'utf8')
process.env.APP_PRIVATE_KEY = readFileSync('./keys/private.pem', 'utf8')
