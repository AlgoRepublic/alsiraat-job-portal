import { Request, Response, NextFunction } from 'express'
import { IUser, IProfile } from '@/types/models'

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

export interface PaginationParams {
  page?: number
  perPage?: number
  sortBy?: string
  order?: 'asc' | 'desc' | 1 | -1
}

export interface PaginationMetadata {
  count: number
  page: number
  perPage: number
}

export interface PaginatedResponse<T> {
  metadata: PaginationMetadata
  records: T[]
}

export interface FileUpload {
  name: string
  data: Buffer
  size: number
  encoding: string
  tempFilePath: string
  truncated: boolean
  mimetype: string
  md5: string
  mv: (path: string, callback?: (err: any) => void) => void
}

export interface CustomError extends Error {
  statusCode?: number
}

export interface RequestContext {
  auth: AuthContext
  request: {
    data: Record<string, any>
  }
}

export interface AuthContext {
  authenticated: boolean
  user: IUser | null
  profile: IProfile | null
}

export interface ExpressRequest extends Request {
  ctx?: RequestContext
}

export type ExpressHandler = (
  req: ExpressRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void
