import { ItemEntity } from './item'
import {
  IActivity,
  IActivityItem,
  IActivityScoresAndReportsConditionalLogic,
  IActivityScoresAndReportsScores,
  IActivityScoresAndReportsSections,
  ResponseItem,
  User,
  KVObject,
  ScoreForSummary,
} from '../core/interfaces'
import { Calculator, convertMarkdownToHtml, getScoresSummary, isFloat, toFixed } from '../core/helpers'
import { replaceVariablesInMarkdown } from '../core/helpers/markdownVariableReplacer/'
import { ScoresCalculator } from '../core/helpers/ScoresCalculator'
import { ConditionalLogicService } from '../modules/report/helpers/conditionalLogic'

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
  }

  evaluateScores(responses: ResponseItem[]): KVObject {
    const answers = responses.filter((x) => x !== null)

    const scores: KVObject = {}
    const maxScores: KVObject = {}

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

        for (const conditional of report.conditionalLogic) {
          scores[conditional.id] = this.testVisibility(conditional, scores)
        }
      }
    }

    return scores
  }

  scoresToValues(scores: KVObject, responses: ResponseItem[]): KVObject[] {
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
    rawValues: KVObject,
    values: KVObject,
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
    values: KVObject,
    user: User,
    scores: KVObject,
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
      if (report.type === 'score') {
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

  testVisibility(conditional: IActivityScoresAndReportsConditionalLogic | null, scores: KVObject): boolean {
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
