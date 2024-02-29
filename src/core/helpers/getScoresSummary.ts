import { KVObject } from '../interfaces'
import { Calculator } from './calculator'

export function getScoresSummary(scores: KVObject, allowedScoreNames: string[]): number {
  const allowedScores: number[] = []
  for (const name in scores) {
    if (allowedScoreNames.includes(name)) {
      allowedScores.push(scores[name])
    }
  }
  return Calculator.sum(allowedScores)
}
