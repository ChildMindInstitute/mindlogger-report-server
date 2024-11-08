import { IActivityItem, IActivityItemOption, IDataMatrixRow, ResponseItem } from '../core/interfaces'
import {
  Calculator,
  convertMarkdownToHtml,
  escapeRegExp,
  escapeReplacement,
  isArray,
  isNumber,
  isObject,
  isString,
} from '../core/helpers'
import { ScoresCalculator } from '../core/helpers/ScoresCalculator'

const ICON_URL = 'https://raw.githubusercontent.com/ChildMindInstitute/mindlogger-report-server/main/src/static/icons/'

export class ItemEntity {
  public json: IActivityItem
  public id: string
  public name: string
  public question: string
  public inputType: string
  public multipleChoice: boolean
  public scoring: boolean
  public setAlerts: boolean
  public options: IActivityItemOption[]

  constructor(data: IActivityItem) {
    this.json = data

    this.id = data.id
    this.name = data.name
    this.question = data.question?.en ?? data.question

    this.inputType = data.responseType

    this.multipleChoice = data.responseType === 'multiSelect'
    this.scoring = data.config?.addScores || false
    this.setAlerts = data.config?.setAlerts || false
    this.options = (data.responseValues?.options ?? []).map((o) => ({ ...o }))
  }

  getScore(value: ResponseItem): number {
    if (!value || !this.scoring) {
      return 0
    }

    let totalScore = 0

    switch (this.inputType) {
      case 'multiSelect':
        const multiSelectScore = ScoresCalculator.collectScoreForMultiSelect(this, value.value as number[])
        totalScore += multiSelectScore ?? 0
        break

      case 'singleSelect':
        const singleSelecScore = ScoresCalculator.collectScoreForSingleSelect(this, value.value as number)
        totalScore += singleSelecScore ?? 0
        break

      case 'slider':
        const sliderScore = ScoresCalculator.collectScoreForSlider(this, value.value as number)
        totalScore += sliderScore ?? 0
        break

      default:
        break
    }

    return totalScore
  }

  getAlerts(value: ResponseItem): string[] {
    const allowedTypes = ['singleSelect', 'multiSelect', 'slider', 'singleSelectRows', 'multiSelectRows', 'sliderRows']
    if (!this.setAlerts || value === null || !allowedTypes.includes(this.inputType)) {
      return []
    }
    if (['singleSelectRows', 'multiSelectRows'].includes(this.inputType)) {
      return this.getAlertsForSelectionPerRow(value.value)
    }

    if (this.inputType === 'sliderRows') {
      return this.getAlertsForSliderRow(value.value)
    }

    return this.getAlertForSimpleTypes(value, this.options)
  }

  getVariableValue(value: ResponseItem): string {
    const allowedTypes = ['singleSelect', 'multiSelect', 'numberSelect', 'slider', 'date', 'text']

    if (value === null || !allowedTypes.includes(this.inputType)) {
      return ''
    }

    const response = this.convertResponseToArray(value)

    if (response.length === 0) {
      return ''
    }

    if (this.inputType === 'date') {
      return (
        (response[0] &&
          `${response[0].month.toString().padStart(2, '0')}/${response[0].day.toString().padStart(2, '0')}/${
            response[0].year
          }`) ||
        ''
      )
    }

    if (['singleSelect', 'multiSelect'].includes(this.inputType) && Array.isArray(this.options)) {
      const options = []
      for (const v of response) {
        if (typeof v === 'number' || typeof v === 'string') {
          const option = this.options.find(
            (option) => (typeof v === 'number' && option.value === v) || (typeof v === 'string' && option.text === v),
          )

          if (option) {
            options.push(option.text)
          }
        }
      }
      return options.join(', ')
    }

    if (typeof response[0] === 'string') {
      return response[0]
    }

    if (typeof response[0] === 'number') {
      return response[0].toString()
    }

    return ''
  }

  getMaxScore(): number {
    if (!this.scoring) {
      return 0
    }

    switch (this.inputType) {
      case 'singleSelect':
        const allSingleScores = this.options
          .map((x) => x.score)
          .filter((x) => x != null)
          .map((x) => x)

        return Math.max(...allSingleScores)

      case 'multiSelect':
        const allMultiScores = this.options
          .map((x) => x.score)
          .filter((x) => x != null)
          .map((x) => x)

        return Calculator.sum(allMultiScores)

      case 'slider':
        const scores = this.json.responseValues.scores ?? []
        return Math.max(...scores)

      default:
        return 0
    }
  }

  getQuestionText(): string {
    const imageRE = new RegExp(/[\r\n]*\!\[.*\]\((.*)=.*\)[\r\n]*/i)
    // Remove the image from the question.
    return this.question.replace(imageRE, '')
  }

  getPrinted(value: ResponseItem, context: { items: ItemEntity[]; responses: ResponseItem[] | string[] }): string {
    const allowedTypes = ['singleSelect', 'multiSelect', 'slider', 'text', 'numberSelect']

    if (!allowedTypes.includes(this.inputType)) {
      return ''
    }

    const response = this.convertResponseToArray(value)

    const questionHTML = convertMarkdownToHtml(this.getQuestionText())

    let optionsHtml = ''
    let type = this.inputType

    if (this.inputType === 'singleSelect' || this.inputType === 'multiSelect') {
      type = this.inputType === 'multiSelect' ? 'checkbox' : 'radio'

      for (const option of this.options) {
        const checked = response.some(
          (value) =>
            (typeof value === 'number' && option.value === value) ||
            (typeof value === 'string' && option.text === value),
        )

        const icon = ICON_URL + `${type}-${checked ? 'checked' : 'unchecked'}.svg`

        const optionText = this.reuseResponseOption(option.text, context.items, context.responses)
        optionsHtml += '<div class="option">'
        optionsHtml += `<img class="${type}" src="${icon}" width="15" height="15">`
        optionsHtml += `<label>${optionText}</label>`
        optionsHtml += '</div>'
      }
    } else if (this.inputType === 'slider') {
      const minValue = isNumber(this.json.responseValues?.minValue) ? this.json.responseValues.minValue!.toString() : ''
      const maxValue = isNumber(this.json.responseValues?.maxValue) ? this.json.responseValues.maxValue!.toString() : ''
      const minLabel = this.json.responseValues?.minLabel ?? ''
      const maxLabel = this.json.responseValues?.maxLabel ?? ''

      const minLabelHtml = `<div class="slider-value">${minLabel}</div>`
      const maxLabelHtml = `<div class="slider-value">${maxLabel}</div>`

      optionsHtml += `<div class="option">${minLabelHtml}<input type="range" min="${minValue}" max="${maxValue}" value="${response[0]}">${maxLabelHtml}</div>`
    } else if (this.inputType === 'text') {
      optionsHtml += response[0]
    }
    //additional input
    if (isString(value.text)) {
      optionsHtml += value.text
    }

    return `<div class="item-print-container"><div class="item-print ${type}"><div class="item-name">${this.name}</div><div class="question">${questionHTML}</div><div class="options">${optionsHtml}</div></div></div>`
  }

  private reuseResponseOption(optionText: string, items: ItemEntity[], responses: ResponseItem[] | string[]): string {
    if (!optionText.includes('[[')) {
      return optionText
    }
    for (const item of items) {
      if (!['text'].includes(item.inputType)) {
        continue
      }
      const idx = items.indexOf(item)
      const response = responses[idx]
      if (typeof response !== 'string') {
        continue
      }
      const reg = new RegExp(`\\[\\[${escapeRegExp(item.name)}\\]\\]`, 'gi')
      optionText = optionText.replace(reg, escapeReplacement(response))
    }
    return optionText
  }

  private matchOption(value: number | string, options: IActivityItemOption[]): IActivityItemOption | null {
    let option = null
    if (typeof value === 'number') {
      option = options.find((option) => option.value === value)
    }
    if (typeof value === 'string') {
      option = options.find((option) => option.id === value || option.text === value)
    }
    return option ?? null
  }

  private convertDataMatrixToOptions(row: IDataMatrixRow): IActivityItemOption[] {
    const options = []
    for (const option of this.options) {
      for (const _option of row.options) {
        if (option.id === _option.optionId) {
          options.push({ ...option, ..._option } as IActivityItemOption)
        }
      }
    }
    return options
  }

  private getAlertsForSelectionPerRow(value: Array<string | null>): string[] {
    const alerts: string[] = []
    const rows = this.json.responseValues?.dataMatrix ?? []

    for (const [rowIdx, response] of value.entries()) {
      if (!rows[rowIdx] || response === null) {
        continue
      }
      const options = this.convertDataMatrixToOptions(rows[rowIdx])

      const responseArray = this.convertResponseToArray(response).flat(1)

      const alertList = responseArray
        .map((value) => {
          const option = this.matchOption(value, options)
          return option && option.alert ? option.alert : ''
        })
        .filter((alert) => alert.length > 0)

      alertList.forEach((alert) => alerts.push(alert))
    }

    return alerts
  }

  private getAlertsForSliderRow(value: Array<number | null>): string[] {
    const alerts: string[] = []
    const rows = this.json.responseValues.rows

    if (!rows) {
      return []
    }

    for (const [rowIdx, response] of value.entries()) {
      const currentRow = rows[rowIdx]

      if (!currentRow || response === null) {
        continue
      }

      const alertList = currentRow.alerts.filter((a) => {
        if (this.json.config?.continuousSlider && typeof a.minValue === 'number' && typeof a.maxValue === 'number') {
          return a.minValue <= response && a.maxValue >= response
        }
        return a.value === response
      })

      alertList.forEach((alert) => alerts.push(alert.alert))
    }

    return alerts
  }

  private getAlertForSimpleTypes(responseItem: ResponseItem, options: IActivityItemOption[]): string[] {
    switch (this.inputType) {
      case 'slider':
        const value = responseItem.value

        const alerts = this.json.responseValues.alerts ?? []
        const alert = alerts.find((a) => {
          if (this.json.config?.continuousSlider && typeof a.minValue === 'number' && typeof a.maxValue === 'number') {
            return a.minValue <= value && a.maxValue >= value
          }
          return a.value === value
        })
        return [alert?.alert ?? '']

      case 'singleSelect':
      case 'multiSelect':
        const response = this.convertResponseToArray(responseItem)

        return response
          .map((value) => {
            const option = this.matchOption(value, options)
            return option && option.alert ? option.alert : ''
          })
          .filter((alert) => alert.length > 0)

      default:
        return []
    }
  }

  private convertResponseToArray(response: ResponseItem | number | string): any[] {
    if (response === null) {
      return [null]
    }

    if (isNumber(response) || isString(response)) {
      return [response]
    }

    if (isObject(response) && !isArray(response)) {
      const { value } = response as ResponseItem

      if (!isArray(value)) {
        return [value]
      }

      return value
    }

    return [response]
  }
}
