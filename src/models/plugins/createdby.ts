import { Schema } from 'mongoose'

export const createdByPlugin = (schema: Schema): void => {
  schema.add({
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdByType: {
      type: String,
      enum: ['user', 'system'],
      default: null,
    },
    createdByProfile: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      default: null,
    },
  })

  schema.pre('save', function (next) {
    // Ensure consistency: if createdByType is 'system', createdBy should be null
    if (this.createdByType === 'system') {
      this.createdBy = null
    } else if (this.createdByType === 'user' && !this.createdBy) {
      // If type is user but no createdBy, set to null
      this.createdByType = null
    }
    next()
  })

  //   schema.index({ createdBy: 1 })
  //   schema.index({ createdByType: 1 })
  //   schema.index({ createdByProfile: 1 })
  //   Compound index for common queries
  //   schema.index({ createdByType: 1, createdBy: 1 })
}
