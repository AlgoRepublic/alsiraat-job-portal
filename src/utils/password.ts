import bcrypt from 'bcrypt'

export const encryptPassword = async (password: string): Promise<string> => {
  if (!password) {
    throw new Error('Password is required')
  }

  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

export const comparePassword = async (
  hashedPassword: string,
  plainPassword: string
): Promise<boolean> => {
  if (!hashedPassword || !plainPassword) {
    throw new Error('Both hashed and plain passwords are required')
  }

  return await bcrypt.compare(plainPassword, hashedPassword)
}
