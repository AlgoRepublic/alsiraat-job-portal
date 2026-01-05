import { Response } from 'express'
import { ApiResponse } from '@/types/common'

export const jsonResponse = <T = any>(
  res: Response,
  isSuccess: boolean,
  message: string,
  data: T | null = null,
  status?: number
): Response => {
  const response: ApiResponse<T> = {
    success: isSuccess,
    message: message,
    data: data || undefined,
  }

  if (!status) {
    status = isSuccess ? 200 : 400
  }

  return res.status(status).json(response)
}
