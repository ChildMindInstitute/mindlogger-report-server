import { ItemEntity } from './item'
import {
  IActivity,
  IActivityItem,
  IActivityScoresAndReportsConditionalLogic,
  IActivityScoresAndReportsScores,
  IActivityScoresAndReportsSections,
  ResponseItem,
  User,
  Map,
  ScoreForSummary,
  ActivitySubscalesSetting,
  ScoringType,
} from '../core/interfaces'
import { Calculator, convertMarkdownToHtml, getScoresSummary, isFloat, toFixed } from '../core/helpers'
import { replaceVariablesInMarkdown } from '../core/helpers/markdownVariableReplacer/'
import { ScoresCalculator } from '../core/helpers/ScoresCalculator'
import { ConditionalLogicService } from '../modules/report/helpers/conditionalLogic'

const INTERVAL_SYMBOL = '~'

const enum LookupTableItems {
  Age_screen = 'age_screen',
  Gender_screen = 'gender_screen',
}

const enum Sex {
  M = 'M',
  F = 'F',
}

const parseSex = (sex: string | null | undefined) => (sex === Sex.M ? '0' : '1')

export class ActivityEntity {
  public json: IActivity
  public schemaId: string
  public id: string
  public name: string
  public splashImage: string
  public items: ItemEntity[]

  public reportIncludeItem: string
  public allowSummary: boolean
  public reports: IActivityScoresAndReportsSections[] | IActivityScoresAndReportsScores[]
  public subscaleSetting?: ActivitySubscalesSetting

  constructor(data: IActivity, items: IActivityItem[] = []) {
    this.json = data

    this.schemaId = data.id
    this.id = data.id
    this.name = data.name
    this.splashImage = data.splashScreen

    this.items = items.map((item) => {
      return new ItemEntity(item)
    })

    //TODO: activity.items.find(item => item.name == activity.reportIncludeItem);
    this.reportIncludeItem = '' //TODO  data.scoresAndReports?.generateReport || false;

    this.allowSummary = data.scoresAndReports?.showScoreSummary || false
    this.reports = data.scoresAndReports?.reports || []
    this.subscaleSetting = data.subscaleSetting
  }

  getVisibleItems(): ItemEntity[] {
    return this.items.filter((item) => !item.json.isHidden)
  }

  evaluateScores(responses: ResponseItem[]): Map {
    const answers = responses

    const scores: Map = {}
    const maxScores: Map = {}

    for (let i = 0; i < answers.length; i++) {
      const response = answers[i]
      const item = this.items[i]

      scores[item.name] = item.getScore(response)
      maxScores[item.name] = item.getMaxScore()
    }

    // calculate scores first
    for (const report of this.reports) {
      if (report.type === 'score') {
        const reportScore = getScoresSummary(scores, report.itemsScore)
        const reportMaxScore = getScoresSummary(maxScores, report.itemsScore)

        maxScores[report.id] = reportMaxScore

        switch (report.calculationType) {
          case 'sum':
            scores[report.id] = reportScore
            break
          case 'percentage':
            if (reportMaxScore === 0) {
              scores[report.id] = 0
              break
            }
            const percentageScore = (100 * reportScore) / reportMaxScore

            scores[report.id] = toFixed(percentageScore)
            break
          case 'average':
            const score = ScoresCalculator.collectActualScores(this.items, report.itemsScore, responses)
            const filteredScores: number[] = score.filter((x) => x !== null).map((x) => x!)

            scores[report.id] = toFixed(Calculator.avg(filteredScores))
            break
        }

        const subscaleItem = this.subscaleSetting?.subscales.find(({ name }) => name === report.subscaleName)

        if (subscaleItem?.subscaleTableData && subscaleItem.subscaleTableData.length > 0) {
          const calculatedScore = scores[report.id]
          const genderItemIndex = this.items.findIndex((item) => item.name == LookupTableItems.Gender_screen)
          const genderAnswer = responses[genderItemIndex]
          const ageItemIndex = this.items.findIndex((item) => item.name == LookupTableItems.Age_screen)
          const ageAnswer = responses[ageItemIndex]
          const subscaleTableData = subscaleItem.subscaleTableData

          const subscaleTableDataItem = subscaleTableData.find(({ sex, age, rawScore }) => {
            let reportedAge: string | null = null
            if (typeof ageAnswer === 'string') {
              reportedAge = ageAnswer
            } else if (ageAnswer && 'value' in ageAnswer && ['number', 'string'].includes(typeof ageAnswer.value)) {
              reportedAge = String(ageAnswer.value)
            }

            const hasAgeInterval = age && typeof age === 'string' && age.includes(INTERVAL_SYMBOL)
            let withAge = true

            if (age) {
              if (!hasAgeInterval) {
                withAge = String(age) === reportedAge
              } else {
                const [minAge, maxAge] = age.replace(/\s/g, '').split(INTERVAL_SYMBOL)
                const reportedAgeNum = Number(reportedAge)
                withAge = Number(minAge) <= reportedAgeNum && reportedAgeNum <= Number(maxAge)
              }
            }

            const withSex = parseSex(sex) === String(genderAnswer?.value)

            if (!withSex || !withAge) return false

            const hasInterval = rawScore.includes(INTERVAL_SYMBOL)
            if (!hasInterval) return rawScore === String(calculatedScore)

            const [minScore, maxScore] = rawScore.replace(/\s/g, '').split(INTERVAL_SYMBOL)

            return Number(minScore) <= calculatedScore && calculatedScore <= Number(maxScore)
          })

          if (report.scoringType == ScoringType.score && subscaleTableDataItem) {
            scores[report.id] = Number(subscaleTableDataItem.score) || calculatedScore
          }
        }

        for (const conditional of report.conditionalLogic) {
          scores[conditional.id] = this.testVisibility(conditional, scores)
        }
      }
    }

    return scores
  }

  scoresToValues(scores: Map, responses: ResponseItem[]): Map[] {
    const values = { ...scores }
    const rawValues = { ...scores }
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]
      const item = this.items[i]
      values[item.name] = item.getVariableValue(response)
      rawValues[item.name] = response?.value
    }
    return [values, rawValues]
  }

  evaluateReports(responses: ResponseItem[], user: User): string {
    const scores = this.evaluateScores(responses)
    const [values, rawValues] = this.scoresToValues(scores, responses)

    let markdown = ''

    for (const report of this.reports) {
      if (report.type === 'section') {
        markdown = this.generateReportSection(markdown, report, responses, rawValues, values, user)
      }

      if (report.type === 'score') {
        markdown = this.generateReportScore(markdown, report, responses, values, user, scores)
      }
    }

    return `<div class="activity-report">${markdown}</div>`
  }

  generateReportSection(
    markdown: string,
    report: IActivityScoresAndReportsSections,
    responses: ResponseItem[],
    rawValues: Map,
    values: Map,
    user: User,
  ): string {
    const isVis = this.testVisibility(report.conditionalLogic, rawValues)

    if (!isVis) {
      return markdown
    }

    const reportMessage = replaceVariablesInMarkdown({
      markdown: report.message,
      user,
      scores: values,
      items: this.items,
    })
    if (reportMessage) {
      markdown += convertMarkdownToHtml(reportMessage)
    }

    const printedItems = this.getPrintedItems(report.itemsPrint, responses)

    if (printedItems) {
      const processedPrintedItems = replaceVariablesInMarkdown({
        markdown: printedItems,
        scores: values,
        user,
        items: this.items,
      })

      markdown += processedPrintedItems + '\n'
    }

    return markdown
  }

  generateReportScore(
    markdown: string,
    report: IActivityScoresAndReportsScores,
    responses: ResponseItem[],
    values: Map,
    user: User,
    scores: Map,
  ): string {
    const reportMessage = replaceVariablesInMarkdown({
      markdown: report.message,
      scores: values,
      user,
      items: this.items,
    })

    if (reportMessage) {
      markdown += convertMarkdownToHtml(reportMessage)
    }

    const printedItems = this.getPrintedItems(report.itemsPrint, responses)
    if (printedItems) {
      const processedPrintedItems = replaceVariablesInMarkdown({
        markdown: printedItems,
        scores: values,
        user,
        items: this.items,
      })

      markdown += processedPrintedItems + '\n'
    }

    for (const conditional of report.conditionalLogic) {
      const isVis = scores[conditional.id]

      if (isVis) {
        const reportMessage = replaceVariablesInMarkdown({
          markdown: conditional.message,
          scores: values,
          user,
          items: this.items,
        })

        if (reportMessage) {
          markdown += convertMarkdownToHtml(reportMessage)
        }

        const printedItems = this.getPrintedItems(conditional.itemsPrint, responses)
        if (printedItems) {
          const processedPrintedItems = replaceVariablesInMarkdown({
            markdown: printedItems,
            scores: values,
            user,
            items: this.items,
          })

          markdown += processedPrintedItems + '\n'
        }
      }
    }

    return markdown
  }

  getAlertsForSummary(responses: ResponseItem[]): string[] {
    let alerts: string[] = []
    for (let i = 0; i < responses.length; i++) {
      alerts = alerts.concat(this.items[i].getAlerts(responses[i]))
    }

    return alerts
  }

  getScoresForSummary(responses: ResponseItem[]): ScoreForSummary[] {
    const scores = this.evaluateScores(responses)

    const result = []
    for (const report of this.reports) {
      const isScore = report.type === 'score'

      if (!isScore) {
        continue
      }

      let flagScore = false

      for (const conditional of report.conditionalLogic) {
        const isVis = this.testVisibility(conditional, scores)
        if (isVis && conditional.flagScore) {
          flagScore = true
          break
        }
      }

      result.push({
        prefLabel: report.name,
        value: scores[report.id],
        flagScore,
      })
    }

    return result
  }

  getPrintedItems(items: string[], responses: ResponseItem[]): string | null {
    if (!items?.length) return null

    let markdown = ''

    for (const itemName of items) {
      const index = this.items.findIndex((item) => item.name === itemName)

      if (index >= 0) {
        const context = { items: this.items, responses }
        markdown += this.items[index].getPrinted(responses[index] ?? { value: null }, context) + '\n'
      }
    }

    return markdown
  }

  testVisibility(conditional: IActivityScoresAndReportsConditionalLogic | null, scores: Map): boolean {
    if (!conditional) {
      return true
    }
    const { conditions, match } = conditional

    const results = []
    for (const condition of conditions) {
      const key = condition.itemName

      if (key in scores) {
        const score = isFloat(scores[key]) ? parseFloat(scores[key]) : scores[key]

        const checkResult = ConditionalLogicService.checkConditionByPattern({
          type: condition.type,
          payload: condition.payload,
          scoreOrValue: score,
        })

        results.push(checkResult)
      } else {
        results.push(false)
      }
    }

    switch (match) {
      case 'all':
        return ConditionalLogicService.checkAllRules(results)
      case 'any':
        return ConditionalLogicService.checkAnyRules(results)
      default:
        return false
    }
  }
}
