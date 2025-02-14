import { ResponseValue } from '../../../../core/interfaces'

type CheckConditionParams = {
  type: string
  payload: any
  scoreOrValue: ResponseValue | ResponseValue[]
}

export class ConditionalLogicService {
  static checkAllRules(results: boolean[]): boolean {
    return results.every((result) => result)
  }

  static checkAnyRules(results: boolean[]): boolean {
    return results.some((result) => result)
  }

  static checkConditionByPattern({ type, payload, scoreOrValue }: CheckConditionParams): boolean {
    // Skipped responses do not match any condition
    if (scoreOrValue === null) {
      return false
    }

    switch (type) {
      case 'BETWEEN':
        return payload.minValue < scoreOrValue && payload.maxValue > scoreOrValue

      case 'OUTSIDE_OF':
        return payload.minValue > scoreOrValue || payload.maxValue < scoreOrValue

      case 'EQUAL_TO_OPTION':
        return scoreOrValue === parseFloat(payload.optionValue)

      case 'NOT_EQUAL_TO_OPTION':
        return scoreOrValue !== parseFloat(payload.optionValue)

      case 'GREATER_THAN':
        return scoreOrValue > payload.value

      case 'LESS_THAN':
        return scoreOrValue < payload.value

      case 'EQUAL':
        return scoreOrValue === payload.value

      case 'NOT_EQUAL':
        return scoreOrValue !== payload.value

      case 'INCLUDES_OPTION':
        const parsedIncludeValue = parseFloat(payload.optionValue)
        return Array.isArray(scoreOrValue) && scoreOrValue.some((value) => value === parsedIncludeValue)

      case 'NOT_INCLUDES_OPTION':
        const parsedExcludeValue = parseFloat(payload.optionValue)
        return Array.isArray(scoreOrValue) && !scoreOrValue.some((value) => value === parsedExcludeValue)

      case 'EQUAL_TO_SCORE':
        return payload.value === scoreOrValue

      default:
        return false
    }
  }
}
