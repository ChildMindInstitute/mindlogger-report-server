import { ConditionalLogicService } from './ConditionalLogicService'

describe('ConditionalLogicService', () => {
  describe('checkAllRules', () => {
    it('should return true when all results are true', () => {
      const results = [true, true, true]
      expect(ConditionalLogicService.checkAllRules(results)).toBe(true)
    })

    it('should return false when any result is false', () => {
      const results = [true, false, true]
      expect(ConditionalLogicService.checkAllRules(results)).toBe(false)
    })
  })

  describe('checkAnyRules', () => {
    it('should return true when any result is true', () => {
      const results = [false, true, false]
      expect(ConditionalLogicService.checkAnyRules(results)).toBe(true)
    })

    it('should return false when all results are false', () => {
      const results = [false, false, false]
      expect(ConditionalLogicService.checkAnyRules(results)).toBe(false)
    })
  })

  describe('checkConditionByPattern', () => {
    it('should return false for null scoreOrValue', () => {
      const result = ConditionalLogicService.checkConditionByPattern({
        type: 'BETWEEN',
        payload: { minValue: 0, maxValue: 10 },
        scoreOrValue: null,
      })
      expect(result).toBe(false)
    })

    describe('BETWEEN', () => {
      it('should return true when value is between min and max', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'BETWEEN',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 5,
        })
        expect(result).toBe(true)
      })

      it('should return false when value is not between min and max', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'BETWEEN',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 15,
        })
        expect(result).toBe(false)
      })

      it('should return false when value is equal to min or max', () => {
        let result = ConditionalLogicService.checkConditionByPattern({
          type: 'BETWEEN',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 0,
        })
        expect(result).toBe(false)

        result = ConditionalLogicService.checkConditionByPattern({
          type: 'BETWEEN',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 10,
        })
        expect(result).toBe(false)
      })
    })

    describe('OUTSIDE_OF', () => {
      it('should return true when value is outside the range', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'OUTSIDE_OF',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 15,
        })
        expect(result).toBe(true)
      })

      it('should return false when value is within the range', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'OUTSIDE_OF',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 5,
        })
        expect(result).toBe(false)
      })

      it('should return false when value is equal to min or max', () => {
        let result = ConditionalLogicService.checkConditionByPattern({
          type: 'OUTSIDE_OF',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 0,
        })
        expect(result).toBe(false)

        result = ConditionalLogicService.checkConditionByPattern({
          type: 'OUTSIDE_OF',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: 10,
        })
        expect(result).toBe(false)
      })
    })

    describe('EQUAL_TO_OPTION', () => {
      it('should return true when value matches option', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'EQUAL_TO_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: 5,
        })
        expect(result).toBe(true)
      })

      it('should return false when value does not match option', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'EQUAL_TO_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: 10,
        })
        expect(result).toBe(false)
      })
    })

    describe('NOT_EQUAL_TO_OPTION', () => {
      it('should return true when value does not match option', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'NOT_EQUAL_TO_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: 10,
        })
        expect(result).toBe(true)
      })

      it('should return false when value matches option', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'NOT_EQUAL_TO_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: 5,
        })
        expect(result).toBe(false)
      })
    })

    describe('GREATER_THAN', () => {
      it('should return true when value is greater than threshold', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'GREATER_THAN',
          payload: { value: 5 },
          scoreOrValue: 10,
        })
        expect(result).toBe(true)
      })

      it('should return false when value is not greater than threshold', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'GREATER_THAN',
          payload: { value: 5 },
          scoreOrValue: 3,
        })
        expect(result).toBe(false)
      })

      it('should return false when value is equal to threshold', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'GREATER_THAN',
          payload: { value: 5 },
          scoreOrValue: 5,
        })
        expect(result).toBe(false)
      })
    })

    describe('LESS_THAN', () => {
      it('should return true when value is less than threshold', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'LESS_THAN',
          payload: { value: 10 },
          scoreOrValue: 5,
        })
        expect(result).toBe(true)
      })

      it('should return false when value is not less than threshold', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'LESS_THAN',
          payload: { value: 10 },
          scoreOrValue: 15,
        })
        expect(result).toBe(false)
      })

      it('should return false when value is equal to threshold', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'LESS_THAN',
          payload: { value: 10 },
          scoreOrValue: 10,
        })
        expect(result).toBe(false)
      })
    })

    describe('EQUAL', () => {
      it('should return true when values are equal', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'EQUAL',
          payload: { value: 5 },
          scoreOrValue: 5,
        })
        expect(result).toBe(true)
      })

      it('should return false when values are not equal', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'EQUAL',
          payload: { value: 5 },
          scoreOrValue: 10,
        })
        expect(result).toBe(false)
      })
    })

    describe('NOT_EQUAL', () => {
      it('should return true when values are not equal', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'NOT_EQUAL',
          payload: { value: 5 },
          scoreOrValue: 10,
        })
        expect(result).toBe(true)
      })

      it('should return false when values are equal', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'NOT_EQUAL',
          payload: { value: 5 },
          scoreOrValue: 5,
        })
        expect(result).toBe(false)
      })
    })

    describe('INCLUDES_OPTION', () => {
      it('should return true when array includes the option value', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'INCLUDES_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: [1, 3, 5, 7],
        })
        expect(result).toBe(true)
      })

      it('should return false when array does not include the option value', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'INCLUDES_OPTION',
          payload: { optionValue: '10' },
          scoreOrValue: [1, 3, 5, 7],
        })
        expect(result).toBe(false)
      })

      it('should return false for non-array input', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'INCLUDES_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: 5,
        })
        expect(result).toBe(false)
      })
    })

    describe('NOT_INCLUDES_OPTION', () => {
      it('should return true when array does not include the option value', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'NOT_INCLUDES_OPTION',
          payload: { optionValue: '10' },
          scoreOrValue: [1, 3, 5, 7],
        })
        expect(result).toBe(true)
      })

      it('should return false when array includes the option value', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'NOT_INCLUDES_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: [1, 3, 5, 7],
        })
        expect(result).toBe(false)
      })

      it('should return false for non-array input', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'NOT_INCLUDES_OPTION',
          payload: { optionValue: '5' },
          scoreOrValue: 10,
        })
        expect(result).toBe(false)
      })
    })

    describe('EQUAL_TO_SCORE', () => {
      it('should return true when values are equal', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'EQUAL_TO_SCORE',
          payload: { value: 5 },
          scoreOrValue: 5,
        })
        expect(result).toBe(true)
      })

      it('should return false when values are not equal', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'EQUAL_TO_SCORE',
          payload: { value: 5 },
          scoreOrValue: 10,
        })
        expect(result).toBe(false)
      })
    })

    describe('Null and Unsupported Conditions', () => {
      it('should return false for null scoreOrValue', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'BETWEEN',
          payload: { minValue: 0, maxValue: 10 },
          scoreOrValue: null,
        })
        expect(result).toBe(false)
      })

      it('should return false for unsupported condition type', () => {
        const result = ConditionalLogicService.checkConditionByPattern({
          type: 'UNSUPPORTED_TYPE',
          payload: {},
          scoreOrValue: 5,
        })
        expect(result).toBe(false)
      })
    })
  })
})
