import { ICON_URL } from '../../../core/constants'
import { ActivityResponse, ScoreForSummary } from '../../../core/interfaces'
import { ActivityEntity } from '../../../models'

type Params = {
  responses: ActivityResponse[]
  activities: ActivityEntity[]
}

export function getSummary(params: Params): string {
  let alerts: string[] = []
  let alertsHTML = ''
  let scoresHTML = ''

  const activitiesMap = new Map<string, ActivityEntity>()
  params.activities.forEach((activity) => activitiesMap.set(activity.id, activity))

  for (const response of params.responses) {
    const activity = activitiesMap.get(response.activityId)

    if (!activity) {
      continue
    }

    if (!activity.allowSummary) {
      continue
    }

    alerts = alerts.concat(activity.getAlertsForSummary(response.data))

    const scores = activity.getScoresForSummary(response.data)
    if (scores.length) {
      scoresHTML += buildScoreSummaryHTML(scores, activity.name)
    }
  }

  alerts = alerts.filter((alert) => alert && alert != '0')
  if (!alerts.length && !scoresHTML) {
    return ''
  }

  if (alerts.length) {
    alertsHTML = '<div class="alerts-title">Alerts</div>'
    alerts.forEach((alert) => {
      alertsHTML += `
        <div>
          <img class="alert-icon" src="${ICON_URL + 'alert-icon.png'}" width="15" height="15">
          <span class="alert-message">${alert}</span>
        </div>
      `
    })
  }

  const output = `
    <div class="summary-title">Report Summary</div>
    ${alertsHTML ? `<div class="alerts-list">${alertsHTML}</div>` : ''}
    ${scoresHTML}
  `

  return `<div class="report-summary">${output}</div>`
}

function buildScoreSummaryHTML(scores: ScoreForSummary[], activityName: string): string {
  return `
    <div class="score-messages">
      <div class="activity-title">${activityName}</div>
      <div>
        ${scores
          .map((score) => {
            return `
              <div class="score-message ${score.flagScore ? 'flag' : ''}">
                <img class="score-flag" src="${ICON_URL + 'score-flag.png'}" width="15" height="15"
                  style="${score.flagScore ? '' : 'display: none;'}">
                  <div class="score-label" style="${score.flagScore ? 'font-weight: bold' : ''}">
                    ${score.prefLabel}
                  </div>
                  <div class="score-value">${score.value}</div>
              </div>
            `
          })
          .join('\r\n')}
      </div>
    </div>
  `
}
