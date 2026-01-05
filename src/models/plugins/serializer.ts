import { Schema } from 'mongoose'

export const publicFieldsPlugin = (schema: Schema, fields: string[]): void => {
  if (!fields) {
    throw new Error('fields is required')
  }

  if (!Array.isArray(fields)) {
    throw new Error('fields must be an array')
  }

  const defaultFields = ['deletedAt', 'createdAt', 'updatedAt']

  schema.methods.publicFields = function (): string[] {
    return ['_id', ...fields, ...defaultFields]
  }

  schema.statics.publicFields = function (): string[] {
    return ['_id', ...fields, ...defaultFields]
  }

  schema.methods.publicObject = function (): Record<string, any> {
    const obj = this.toObject()
    const result: Record<string, any> = {}
    this.publicFields().forEach((field: string) => {
      result[field] = obj[field]
    })
    return result
  }
}
