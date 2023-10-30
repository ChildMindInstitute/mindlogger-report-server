type Params = {
  results: boolean[]
}

export function checkAllRules({ results }: Params): boolean {
  return results.every((result) => result)
}
