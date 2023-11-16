import { KVObject } from '../interfaces'
import { Calculator } from './calculator'

export function getScoresSummary(scores: KVObject, allowedNamesToCalculateScore: string[]): number {
  const allowedScores: number[] = []
  for (const name in scores) {
    if (allowedNamesToCalculateScore.includes(name)) {
      allowedScores.push(scores[name])
    }
  }
  return Calculator.sum(allowedScores)
}
