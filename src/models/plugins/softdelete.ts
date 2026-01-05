import { Schema } from 'mongoose'

export const softDeletePlugin = (schema: Schema): void => {
  schema.add({
    deletedAt: { type: Date, default: null },
  })

  schema.methods.softDelete = async function (): Promise<any> {
    this.deletedAt = new Date()
    return await this.save()
  }

  schema.methods.restore = async function (): Promise<any> {
    this.deletedAt = null
    return await this.save()
  }

  schema.methods.isDeleted = function (): boolean {
    return this.deletedAt ? true : false
  }

  schema.index({ deletedAt: 1 })
}
