import { getScoresSummary } from './getScoresSummary'
import { Calculator } from './calculator'

describe('getScoresSummary', () => {
  const spyCalculatorSum = jest.spyOn(Calculator, 'sum')

  beforeEach(() => {
    spyCalculatorSum.mockClear()
  })

  it('should return null when no allowed scores are present', () => {
    const scores = {
      score1: null,
      score2: null,
    }
    const allowedScoreNames = ['score1', 'score2']

    const result = getScoresSummary(scores, allowedScoreNames)

    expect(result).toBeNull()
    expect(spyCalculatorSum).not.toHaveBeenCalled()
  })

  it('should return null when no score names are allowed', () => {
    const scores = {
      score1: 10,
      score2: 20,
    }
    const allowedScoreNames: string[] = []

    const result = getScoresSummary(scores, allowedScoreNames)

    expect(result).toBeNull()
    expect(spyCalculatorSum).not.toHaveBeenCalled()
  })

  it('should return the sum of allowed non-null scores', () => {
    const scores = {
      score1: 10,
      score2: null,
      score3: 20,
    }
    const allowedScoreNames = ['score1', 'score2', 'score3']
    spyCalculatorSum.mockReturnValue(30)

    const result = getScoresSummary(scores, allowedScoreNames)

    expect(result).toBe(30)
    expect(spyCalculatorSum).toHaveBeenCalledWith([10, 20])
  })

  it('should filter out scores not in allowed score names', () => {
    const scores = {
      score1: 10,
      score2: 20,
      score3: 30,
    }
    const allowedScoreNames = ['score1', 'score3']

    const result = getScoresSummary(scores, allowedScoreNames)

    expect(result).toBe(30)
    expect(spyCalculatorSum).toHaveBeenCalledWith([10, 30])
  })

  it('should handle an empty scores object', () => {
    const scores = {}
    const allowedScoreNames = ['score1']

    const result = getScoresSummary(scores, allowedScoreNames)

    expect(result).toBeNull()
    expect(spyCalculatorSum).not.toHaveBeenCalled()
  })
})
