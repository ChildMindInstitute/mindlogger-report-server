import { cloneDeep } from 'lodash'
import { IActivityScoresAndReportsConditionalLogic, IActivityScoresAndReportsScores } from '../interfaces'

export function patchConditionalInScoreReport(
  conditional: IActivityScoresAndReportsConditionalLogic,
  report: IActivityScoresAndReportsScores,
): IActivityScoresAndReportsConditionalLogic {
  const condClone = cloneDeep(conditional)

  for (const condition of condClone.conditions) {
    if (report.id.endsWith(condition.itemName)) {
      condition.itemName = report.id
    }
  }
  return condClone
}
