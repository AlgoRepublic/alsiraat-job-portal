export const logError = (...error: any[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', ...error)
  }
}

export const logInfo = (...info: any[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.info('INFO:', ...info)
  }
}
