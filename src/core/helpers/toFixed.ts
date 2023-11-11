export function toFixed(value: number, fractionDigits = 2): string {
  const isDecimal = value % 1 !== 0

  if (isDecimal) {
    return value.toFixed(fractionDigits)
  }

  return value.toString()
}
