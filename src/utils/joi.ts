import { Schema, ValidationError } from 'joi'

const options: any = {
  errors: {
    wrap: {
      label: false,
    },
  },
}

export const joiValidate = async <T>(
  schema: Schema<T>,
  property: any
): Promise<{ error?: ValidationError; value?: T }> => {
  return await schema.validate(property, options)
}

export const joiCustomErrors = (error: ValidationError): string[] => {
  const errors = error.details.map((err) => {
    return err.message
  })
  return errors
}

export const joiError = (error: ValidationError): string => {
  return error.details[0].message
}
