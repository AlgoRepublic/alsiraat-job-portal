import { PaginationMetadata, PaginatedResponse } from '@/types/common'

export interface PagyParamsResult {
  page: number
  perPage: number
  sortBy: string
  order: 1 | -1
}

export const pagyParams = (
  page?: string | number,
  perPage?: string | number,
  sortBy?: string,
  order?: string
): PagyParamsResult => {
  let pageNum = parseInt(String(page), 10) || 1
  let perPageNum = parseInt(String(perPage), 10) || 100

  pageNum = pageNum < 1 ? 1 : pageNum
  perPageNum = perPageNum < 1 ? 50 : perPageNum

  let orderNum: 1 | -1 = 1
  if (order) {
    orderNum = order.toLowerCase() === 'asc' ? 1 : -1
  }

  if (sortBy === undefined) {
    sortBy = 'createdAt'
  }

  return { page: pageNum, perPage: perPageNum, sortBy, order: orderNum }
}

export const pagyRes = <T>(
  records: T[],
  count: number,
  page?: string | number,
  perPage?: string | number
): PaginatedResponse<T> => {
  const params = pagyParams(page, perPage)

  const metadata: PaginationMetadata = {
    count: count || 0,
    page: params.page,
    perPage: params.perPage,
  }

  return {
    metadata,
    records: records || [],
  }
}
