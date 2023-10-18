import { ActivityEntity } from './activity'
import ActivityFlow from './activity-flow'
import moment from 'moment-timezone'
import { getAppletKeys } from '../db'
import { Email, Applet, IAppletEncryption, ActivityResponse, User } from '../core/interfaces'
import { ItemEntity } from './item'
import { isString } from 'lodash'
import { convertMarkdownToHtml } from '../core/helpers'

const ICON_URL = 'https://raw.githubusercontent.com/ChildMindInstitute/mindlogger-report-server/main/src/static/icons/'

export class AppletEntity {
  public json: Applet
  public timestamp: number
  public schemaId: string
  public id: string
  public name: string
  public description: string
  public image: string
  public watermark: string
  public encryption: IAppletEncryption
  public reportConfigs: any
  public activities: ActivityEntity[]
  public activityFlows: ActivityFlow[]

  constructor(data: Applet) {
    this.json = data

    this.timestamp = Date.now()
    this.schemaId = data.id
    this.id = data.id
    this.name = data.displayName
    this.description = data.description
    this.image = data.image
    this.watermark = data.watermark

    // parse activities
    this.activities = data.activities.map((item) => {
      return new ActivityEntity(item, item.items)
    })

    // parse activity flows
    this.activityFlows = data.activityFlows.map((flow) => {
      return new ActivityFlow(flow, this.activities)
    })

    this.reportConfigs = this.extractReportConfigs(data)
    this.encryption = data?.encryption || null
  }

  extractReportConfigs(data: Applet) {
    return {
      serverIp: data.reportServerIp,
      publicEncryptionKey: data.reportPublicKey,
      emailRecipients: data.reportRecipients,
      includeUserId: data.reportIncludeUserId,
      includeCaseId: data.reportIncludeCaseId,
      emailBody: data.reportEmailBody,
    }
  }

  static getAppletWatermarkHTML(applet: Applet): string {
    if (!applet.watermark) {
      return ''
    }

    const imageHTML = `
      <div class="applet-image">
        <img
          src="${applet.watermark}"
          alt=''
        />
      </div>
    `

    return imageHTML
  }
  static getAppletWatermarkURL(applet: AppletEntity): string {
    if (!applet.watermark) {
      return ''
    }

    return applet.watermark
  }

  getSummary(responses: ActivityResponse[]): string {
    let alerts: any[] = [] //TODO - type
    let alertsHTML = '',
      scoresHTML = ''

    for (const response of responses) {
      const activity = this.activities.find((activity) => activity.id === response.activityId)

      if (activity && activity.allowSummary) {
        alerts = alerts.concat(activity.getAlertsForSummary(response.data))

        const scores = activity.getScoresForSummary(response.data)
        if (scores.length) {
          scoresHTML += `
            <div class="score-messages">
              <div class="activity-title">${activity.name}</div>
              <div>
                ${scores
                  .map(
                    (score) => `
                    <div class="score-message ${score.flagScore ? 'flag' : ''}">
                      <img class="score-flag" src="${ICON_URL + 'score-flag.png'}" width="15" height="15"
                        style="${score.flagScore ? '' : 'display: none;'}">
                      <span style="${score.flagScore ? 'font-weight: bold' : ''}">${score.prefLabel}</span>
                      <div class="score-value">${score.value}</div>
                    </div>
                  `,
                  )
                  .join('\r\n')}
              </div>
            </div>
          `
        }
      }
    }

    alerts = alerts.filter((alert) => alert && alert != '0')
    if (!alerts.length && !scoresHTML) {
      return ''
    }

    if (alerts.length) {
      alertsHTML = '<div class="alerts-title">Alerts</div>'
      for (const alert of alerts) {
        alertsHTML += `
          <div>
            <img class="alert-icon" src="${ICON_URL + 'alert-icon.png'}" width="15" height="15">
            <span class="alert-message">${alert}</span>
          </div>
        `
      }
    }

    const output = `
      <div class="summary-title">Report Summary</div>
      ${alertsHTML ? `<div class="alerts-list">${alertsHTML}</div>` : ''}
      ${scoresHTML}
    `

    return `<div class="report-summary">${output}</div>`
  }

  getEmailConfigs(
    activityId: string,
    activityFlowId: string | null,
    responses: ActivityResponse[],
    user: User,
    now: string,
  ): Email {
    let emailBody = this.reportConfigs.emailBody
    for (const response of responses) {
      const activity = this.activities.find((activity) => activity.id === response.activityId)
      if (!activity) {
        throw new Error(`Can't find activity ${response.activityId}`)
      }
      const scores = activity.evaluateScores(response.data)
      const [values, rawValues] = activity.scoresToValues(scores, response.data)
      const addActivityPrefix = (key: string) => `${activity.name}/${key}`
      const renameKeys = (o: any) => Object.keys(o).reduce((acc, k) => ({ ...acc, [addActivityPrefix(k)]: o[k] }), {})
      emailBody = activity.replaceValuesInMarkdown(emailBody, renameKeys(values), user, now)
    }
    return {
      body: this.applyInlineStyles(convertMarkdownToHtml(emailBody)),
      subject: this.getSubject(activityId, activityFlowId, responses, user),
      attachment: this.getPDFFileName(activityId, activityFlowId, responses, user),
      emailRecipients: this.reportConfigs.emailRecipients,
    }
  }

  applyInlineStyles(html: string): string {
    return html
      .replace(/<tr>/g, '<tr style="background-color: #fff; border-top: 1px solid #c6cbd1;">')
      .replace(/<th>/g, `<th style="padding: 6px 13px; border: 1px solid #dfe2e5; font-size: 14px; font-weight: 600;">`)
      .replace(/<td>/g, `<td style="padding: 6px 13px; border: 1px solid #dfe2e5; font-size: 14px;">`)
  }

  async getPDFPassword(appletId = ''): Promise<string> {
    const row = await getAppletKeys(appletId || this.id)
    return row ? row.key : ''
  }

  getPDFFileName(activityId: string, activityFlowId: string | null, responses: ActivityResponse[], user: User): string {
    const activityFlow = this.activityFlows.find((flow) => flow.id === activityFlowId) ?? null
    const activity = this.activities.find((activity) => activity.id === activityId)
    if (!activity) {
      throw new Error('unable to find activity')
    }
    const userId = user.secretId
    const configs = this.reportConfigs

    let pdfName = 'REPORT'

    if (configs.includeUserId) {
      pdfName += `_${userId}`
    }

    pdfName += `_${this.name}`
    pdfName += `_${activityFlow ? activityFlow.name : activity.name}`

    let itemName = this.getReportIncludeItem(activity, activityFlow, responses)
    if (itemName) {
      itemName = itemName.replace(/\W/g, '')
      pdfName += `_[${itemName}]`
    }

    pdfName += `_${moment.utc(this.timestamp).format('YYYY-MM-DD-HHmmss')}`
    return `${pdfName}.pdf`
  }

  getReportIncludeItem(
    activity: ActivityEntity,
    activityFlow: ActivityFlow | null,
    responses: ActivityResponse[],
  ): string | null {
    let includeActivity: ActivityEntity | null = null
    let includeItem: ItemEntity | null = null

    if (activityFlow) {
      const activityName = activityFlow.json.reportIncludedActivityName
      const itemName = activityFlow.json.reportIncludedItemName
      includeActivity = this.activities.find((activity) => activity.name == activityName) ?? null
      if (includeActivity) {
        includeItem = includeActivity.items.find((item) => item.name == itemName) ?? null
      }
    } else if (activity) {
      includeActivity = activity
      includeItem = activity.items.find((item) => item.name == activity.json.reportIncludedItemName) ?? null
    }

    if (!includeActivity || !includeItem) return ''

    // @ts-ignore
    const response = responses.find((r) => r.activityId === includeActivity.id)
    const idx = includeActivity.items.indexOf(includeItem)
    const data = response?.data[idx]
    return isString(data) ? data : null
  }

  getSubject(activityId: string, activityFlowId: string | null, responses: ActivityResponse[], user: User): string {
    const activityFlow = this.activityFlows.find((flow) => flow.id === activityFlowId) ?? null
    const activity = this.activities.find((activity) => activity.id === activityId)
    if (!activity) {
      throw new Error('unable to find activity')
    }
    const userId = user.secretId
    const configs = this.reportConfigs

    let subject = 'Report'

    if (configs.includeUserId) {
      subject += ` by ${userId}`
    }

    subject += `: ${this.name} / ${activityFlow ? activityFlow.name : activity.name}`

    const itemName = this.getReportIncludeItem(activity, activityFlow, responses)
    if (itemName) {
      subject += ` / [${itemName}]`
    }
    return subject
  }
}
