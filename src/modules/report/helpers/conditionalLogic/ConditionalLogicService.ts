type CheckConditionParams = {
  type: string
  payload: any
  scoreOrValue: number | number[]
}

export class ConditionalLogicService {
  static checkAllRules(results: boolean[]): boolean {
    return results.every((result) => result)
  }

  static checkAnyRules(results: boolean[]): boolean {
    return results.some((result) => result)
  }

  static checkConditionByPattern({ type, payload, scoreOrValue }: CheckConditionParams): boolean {
    switch (type) {
      case 'BETWEEN':
        return payload.minValue <= scoreOrValue && payload.maxValue >= scoreOrValue

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
        return Array.isArray(scoreOrValue) && scoreOrValue.includes(parseFloat(payload.optionValue))

      case 'NOT_INCLUDES_OPTION':
        return Array.isArray(scoreOrValue) && !scoreOrValue.includes(parseFloat(payload.optionValue))

      case 'EQUAL_TO_SCORE':
        return payload.value === scoreOrValue

      default:
        return false
    }
  }
}
