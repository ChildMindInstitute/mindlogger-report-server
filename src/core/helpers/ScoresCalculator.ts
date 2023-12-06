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
        return this.collectScoreForSlider(item, answer.value as number)
      case 'singleSelect':
        return this.collectScoreForSingleSelect(item, answer.value as number)
      case 'multiSelect':
        return this.collectScoreForMultiSelect(item, answer.value as number[])
      default:
        return null
    }
  }

  public static collectScoreForMultiSelect(item: ItemEntity, checkboxAnswers: number[] | number): number | null {
    if (checkboxAnswers == null) {
      return null
    }

    let scores: number[]
    if(Array.isArray(checkboxAnswers)) {
      scores = item.options
          .map<number | null>((option) => {
            const foundAnswer = checkboxAnswers?.find((checkboxAnswer) => {
              return checkboxAnswer === option.value
            })

            return foundAnswer ? option.score : null
          })
          .filter((x) => x != null)
          .map((x) => x!)
    } else {
      scores = [checkboxAnswers]
    }

    return Calculator.sum(scores)
  }

  public static collectScoreForSingleSelect(item: ItemEntity, radioAnswer: number): number | null {
    if (radioAnswer === null) {
      return null
    }

    const option = item.options.find((o) => o.value === radioAnswer)

    return option ? option.score : null
  }

  public static collectScoreForSlider(item: ItemEntity, itemAnswer: number): number | null {
    const sliderAnswer = itemAnswer

    const minValue = item.json.responseValues.minValue
    const maxValue = item.json.responseValues.maxValue

    if (sliderAnswer < minValue || sliderAnswer > maxValue) {
      return null
    }

    const isFloat = Math.floor(sliderAnswer) !== sliderAnswer

    if (isFloat) {
      return null
    }

    const valueIndex = sliderAnswer - item.json.responseValues.minValue
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
