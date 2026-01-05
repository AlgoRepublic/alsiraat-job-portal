import Joi from 'joi'
import { promises as fs } from 'fs'
import path from 'path'
import mime from 'mime-types'
import { Types } from 'mongoose'
import { CustomError } from './error'
import { joiValidate, joiError } from './joi'
import { FileUpload } from '@/types/common'

export const saveFile = async (
  file: FileUpload,
  dir: string = ''
): Promise<string> => {
  const schema = Joi.object({
    file: Joi.object({
      data: Joi.binary().required(),
    })
      .unknown()
      .required(),
  })

  const { error } = await joiValidate(schema, { file })
  if (error) {
    throw new CustomError(joiError(error))
  }

  const fileExtension = mime.extension(file.mimetype) || 'bin'
  const fileId = new Types.ObjectId()
  const filePath = path.join('storage', dir, `${fileId}.${fileExtension}`)
  const fullFilePath = path.join(global.__basedir, filePath)

  const dirPath = path.dirname(fullFilePath)
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (err: any) {
    throw new CustomError(`Error creating directory: ${err.message}`)
  }

  await new Promise<void>((resolve, reject) => {
    file.mv(fullFilePath, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

  return filePath
}
