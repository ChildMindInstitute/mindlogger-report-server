import { isString } from '../isString'

export function isFloat(inputString: any): inputString is number | string {
  if (Array.isArray(inputString)) {
    return false
  }
  const parsed = isString(inputString) ? parseFloat(inputString) : inputString
  if (Number.isInteger(parsed)) {
    return true
  }
  return !isNaN(parsed) && parsed === Number(inputString)
}
