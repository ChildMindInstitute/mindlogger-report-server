type Params = {
  results: boolean[]
}

export function checkAnyRules({ results }: Params): boolean {
  return results.some((result) => result)
}
