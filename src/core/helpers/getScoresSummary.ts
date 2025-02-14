import { Map } from '../interfaces'
import { Calculator } from './calculator'

export function getScoresSummary(scores: Map<number | null>, allowedScoreNames: string[]): number | null {
  const allowedScores: number[] = []
  for (const name in scores) {
    const score = scores[name]
    if (allowedScoreNames.includes(name) && score !== null) {
      allowedScores.push(score)
    }
  }
  return allowedScores.length ? Calculator.sum(allowedScores) : null
}
