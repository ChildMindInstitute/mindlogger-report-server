import { ActivityEntity } from './activity'
import ActivityFlow from './activity-flow'
import moment from 'moment-timezone'
import { Email, Applet, IAppletEncryption, ActivityResponse, User } from '../core/interfaces'
import { ItemEntity } from './item'
import { convertMarkdownToHtml, truncateString } from '../core/helpers'
import { replaceVariablesInMarkdown } from '../core/helpers/markdownVariableReplacer'

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

  static getAppletWatermarkURL(applet: AppletEntity): string {
    if (!applet.watermark) {
      return ''
    }

    return applet.watermark
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

      const renamedScores = renameKeys(values)

      const processedEmailBody = replaceVariablesInMarkdown({
        markdown: emailBody,
        scores: renamedScores,
        user,
        items: activity.items,
      })

      emailBody = processedEmailBody
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

  getPDFFileName(activityId: string, activityFlowId: string | null, responses: ActivityResponse[], user: User): string {
    const activityFlow = this.activityFlows.find((flow) => flow.id === activityFlowId) ?? null
    const activity = this.activities.find((activity) => activity.id === activityId)

    if (!activity) {
      throw new Error('unable to find activity')
    }

    const userId = user.secretId
    const configs = this.reportConfigs
    const truncateLength = 55

    let pdfName = 'REPORT'

    if (configs.includeUserId) {
      pdfName += `_${truncateString(userId, truncateLength)}`
    }

    pdfName += `_${this.name}`

    if (activityFlow) {
      pdfName += `_${activityFlow.name}_${activity.name}`
    } else {
      pdfName += `_${activity.name}`
    }

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
    let includeActivity: ActivityEntity | undefined
    let includeItem: ItemEntity | undefined

    if (activityFlow) {
      const activityName = activityFlow.json.reportIncludedActivityName
      const itemName = activityFlow.json.reportIncludedItemName
      includeActivity = this.activities.find((activity) => activity.name == activityName)
      includeItem = includeActivity?.items.find((item) => item.name == itemName)
    } else if (activity) {
      includeActivity = activity
      includeItem = activity.items.find((item) => item.name == activity.json.reportIncludedItemName)
    }

    if (!includeActivity || !includeItem) return null

    const isTextItem = includeItem.inputType === 'text'

    if (isTextItem) {
      const response = responses.find((r) => r.activityId === includeActivity?.id)
      const idx = includeActivity.items.indexOf(includeItem)
      const data = response?.data[idx] as string | undefined

      return data ?? null
    }

    return includeItem.name
  }

  getSubject(activityId: string, activityFlowId: string | null, responses: ActivityResponse[], user: User): string {
    const activityFlow = this.activityFlows.find((flow) => flow.id === activityFlowId) ?? null
    const activity = this.activities.find((activity) => activity.id === activityId)
    if (!activity) {
      throw new Error('unable to find activity')
    }
    const userId = user.secretId
    const configs = this.reportConfigs
    const truncateLength = 55

    let subject = 'Report'

    if (configs.includeUserId) {
      subject += ` by ${truncateString(userId, truncateLength)}`
    }

    subject += `: ${this.name}` // Applet name

    if (activityFlow) {
      subject += ` / ${activityFlow.name} / ${activity.name}` // Activity flow name + activity name
    } else {
      subject += ` / ${activity.name}` // Activity name
    }

    const itemName = this.getReportIncludeItem(activity, activityFlow, responses)
    if (itemName) {
      subject += ` / [${itemName}]`
    }
    return subject
  }
}
