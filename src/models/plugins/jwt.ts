import { Schema, Types } from 'mongoose'
import { signToken } from '@/utils/jwt'

const generateAccessToken = async (
  _id: Types.ObjectId | string,
  email: string
): Promise<string> => {
  const payload = {
    _id: _id.toString(),
    email: email,
  }
  return await signToken(payload)
}

export const jwtPlugin = (schema: Schema): void => {
  schema.methods.generateAccessToken = async function (): Promise<string> {
    return await generateAccessToken(this._id, this.email)
  }

  schema.statics.generateAccessToken = async function (
    _id: Types.ObjectId | string,
    email: string
  ): Promise<string> {
    return await generateAccessToken(_id, email)
  }
}
