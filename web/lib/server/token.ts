import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto'

// The answer travels with the question, encrypted, so the browser can neither read nor forge it
// and the server needs no storage.
const key = () =>
  createHash('sha256')
    .update(process.env.QUIZ_SECRET ?? process.env.OPENAI_API_KEY!)
    .digest()

export function seal(payload: object) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

export function open<T>(token: string): T | null {
  try {
    const raw = Buffer.from(token, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString())
  } catch {
    return null
  }
}
