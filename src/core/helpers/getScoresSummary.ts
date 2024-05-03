import { Map } from '../interfaces'
import { Calculator } from './calculator'

export function getScoresSummary(scores: Map, allowedScoreNames: string[]): number {
  const allowedScores: number[] = []
  for (const name in scores) {
    if (allowedScoreNames.includes(name)) {
      allowedScores.push(scores[name])
    }
  }
  return Calculator.sum(allowedScores)
}
