import { ItemEntity } from '../../models'
import { ResponseItem } from '../interfaces'
import { Calculator } from './calculator'

export class ScoresCalculator {
  public static collectActualScores(
    items: ItemEntity[],
    includedItems: string[],
    answers: ResponseItem[],
  ): Array<number | null> {
    const scores: Array<number | null> = items.map((item: ItemEntity, step: number) => {
      if (!includedItems.includes(item.name)) {
        return null
      }

      const answer = answers[step]

      const result: number | null = this.collectScoreForItem(item, answer)

      return result
    })
    return scores
  }

  public static collectScoreForItem(item: ItemEntity, answer: ResponseItem): number | null {
    if (answer == null) {
      return null
    }

    switch (item.inputType) {
      case 'slider':
        return this.collectScoreForSlider(item, answer.value as null | number)
      case 'singleSelect':
        return this.collectScoreForSingleSelect(item, answer.value as null | number)
      case 'multiSelect':
        return this.collectScoreForMultiSelect(item, answer.value as null | Array<null | number>)
      default:
        return null
    }
  }

  public static collectScoreForMultiSelect(
    item: ItemEntity,
    checkboxAnswers: null | number | Array<null | number>,
  ): number | null {
    if (checkboxAnswers == null) {
      return null
    }

    let scores: Array<number | null> = []
    if (Array.isArray(checkboxAnswers)) {
      scores = item.options.map<number | null>((option) => {
        const foundAnswer = checkboxAnswers?.find((checkboxAnswer) => {
          return checkboxAnswer === option.value
        })

        return foundAnswer !== undefined ? option.score : null
      })
    } else {
      scores = [checkboxAnswers]
    }

    const numericScores = scores.filter((x) => x !== null)
    if (numericScores.length === 0) {
      return null
    }

    return Calculator.sum(numericScores)
  }

  public static collectScoreForSingleSelect(item: ItemEntity, radioAnswer: number | null): number | null {
    if (radioAnswer === null) {
      return null
    }

    const option = item.options.find((o) => o.value === radioAnswer)

    return option ? option.score : null
  }

  public static collectScoreForSlider(item: ItemEntity, sliderAnswer: number | null): number | null {
    if (sliderAnswer === null) {
      return null
    }

    const { minValue, maxValue } = item.json.responseValues

    if (sliderAnswer < minValue || sliderAnswer > maxValue) {
      return null
    }

    const isFloat = Math.floor(sliderAnswer) !== sliderAnswer

    if (isFloat) {
      return null
    }

    const valueIndex = sliderAnswer - minValue
    const scores = item.json.responseValues.scores ?? []

    return scores[valueIndex] ?? null
  }

  public static collectMaxScores(items: ItemEntity[], selectedItems: string[]): Array<number | null> {
    try {
      return this.collectMaxScoresInternal(items, selectedItems)
    } catch (error) {
      throw new Error('[ScoresCalculator:collectMaxScores]: Error occurred:\n\n' + error!.toString())
    }
  }

  private static collectMaxScoresInternal(pipelineItems: ItemEntity[], selectedItems: string[]): Array<number | null> {
    const scores: Array<number | null> = pipelineItems.map((item: ItemEntity) => {
      if (!selectedItems.includes(item.name)) {
        return null
      }

      switch (item.inputType) {
        case 'singleSelect': {
          const allScores = item.options
            .map((x) => x.score)
            .filter((x) => x != null)
            .map((x) => x)
          return Math.max(...allScores)
        }
        case 'multiSelect': {
          const allScores = item.options
            .map((x) => x.score)
            .filter((x) => x != null)
            .map((x) => x)
          return Calculator.sum(allScores)
        }
        case 'slider': {
          if (!item.json.responseValues.scores?.some((x) => x >= 0)) {
            return null
          }
          return Math.max(...item.json.responseValues.scores)
        }
        default:
          return null
      }
    })

    return scores
  }
}
