import { Map } from '../interfaces'
import { Calculator } from './calculator'

export function getScoresSummary(scores: Map<number | null>, allowedScoreNames: string[]): number | null {
  const allowedScores: number[] = []
  for (const name in scores) {
    if (allowedScoreNames.includes(name) && scores[name] !== null) {
      allowedScores.push(scores[name])
    }
  }
  return allowedScores.length ? Calculator.sum(allowedScores) : null
}
