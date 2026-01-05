import jwt from 'jsonwebtoken'
import { logError } from './log'

export interface JwtPayload {
  _id: string
  email: string
}

export const signToken = async (
  payload: JwtPayload,
  options: jwt.SignOptions = {}
): Promise<string> => {
  if (!process.env.APP_PRIVATE_KEY) {
    throw new Error('APP_PRIVATE_KEY not set')
  }

  return jwt.sign(payload, process.env.APP_PRIVATE_KEY, {
    algorithm: 'RS256',
    ...options,
  })
}

export const decodeToken = async (
  token: string | null | undefined
): Promise<JwtPayload | false> => {
  if (!process.env.APP_PUBLIC_KEY) {
    throw new Error('APP_PUBLIC_KEY key not set')
  }

  if (!token) {
    return false
  }

  try {
    return (await jwt.verify(token, process.env.APP_PUBLIC_KEY, {
      algorithms: ['RS256'],
    })) as JwtPayload
  } catch (error) {
    logError(error)
    return false
  }
}

export const readToken = async (
  token: string | null | undefined
): Promise<jwt.JwtPayload | false> => {
  if (!token) {
    return false
  }

  try {
    return (jwt.decode(token, { complete: true }) as jwt.JwtPayload) || false
  } catch (error) {
    logError(error)
    return false
  }
}
