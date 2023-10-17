import { IActivityScoresAndReportsConditionalLogic, IActivityScoresAndReportsScores } from './interfaces'
import _, { isString } from 'lodash'

export function isFloat(inputString: any): boolean {
  if (Array.isArray(inputString)) {
    return false
  }
  const parsed = isString(inputString) ? parseFloat(inputString) : inputString
  if (Number.isInteger(parsed)) {
    return true
  }
  return !isNaN(parsed) && parsed === Number(inputString)
}

export function patchConditionalInScoreReport(
  conditional: IActivityScoresAndReportsConditionalLogic,
  report: IActivityScoresAndReportsScores,
): IActivityScoresAndReportsConditionalLogic {
  const condClone = _.cloneDeep(conditional)

  for (const condition of condClone.conditions) {
    if (report.id.endsWith(condition.itemName)) {
      condition.itemName = report.id
    }
  }
  return condClone
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function escapeReplacement(string: string): string {
  return string.replace(/\$/g, '$$$$')
}
