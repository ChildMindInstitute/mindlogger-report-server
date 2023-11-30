type Params = {
  from: number
  to: number
  step?: number
}

export function fillArrayFromTo({ from, to, step = 1 }: Params): number[] {
  const arr = []
  for (let i = from; i <= to; i += step) {
    arr.push(i)
  }
  return arr
}
