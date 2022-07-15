import reprolib from './reprolib.js';
import Activity from './activity.js';
import ActivityFlow from './activity-flow.js';
import convertMarkdownToHtml from '../markdown-utils.js';
import moment from "moment-timezone";
import { getAppletPassword } from '../db.js';
import _ from 'lodash';

const ICON_URL = 'https://raw.githubusercontent.com/ChildMindInstitute/mindlogger-report-server/main/src/static/icons/';

export default class Applet {
  constructor (data) {
    this.json = data;

    this.timestamp = Date.now();
    this.accountId = data.accountId;
    this.user = data.user;
    this.schemaId = data.applet[reprolib.id];
    this.id = data.applet._id.split('/').pop();
    this.name = _.get(data.applet, [reprolib.prefLabel, 0, '@value'], '');
    this.description = _.get(data.applet, [reprolib.description, 0, '@value'], '');
    this.image = _.get(data.applet, [reprolib.options.image]);
    // parse activities
    const activityOrder = _.get(data.applet, [reprolib.order, 0, '@list'], []).map(item => item['@id']);

    this.activities = activityOrder.map(id => {
      if (data.activities[id]) {
        return new Activity(data.activities[id], data.items);
      }

      return null;
    }).filter(activity => activity !== null);

    // parse activity flows
    const activityFlowOrder = _.get(data.applet, [reprolib.activityFlowOrder, 0, '@list'], []).map(item => item['@id']);
    this.activityFlows = activityFlowOrder.map(id => {
      if (data.activityFlows[id]) {
        return new ActivityFlow(data.activityFlows[id], this.activities);
      }

      return null
    }).filter(flow => flow !== null);

    this.reportConfigs = this.extractReportConfigs(_.get(data.applet, [reprolib.reportConfigs, 0, '@list']));
  }

  extractReportConfigs (configs) {
    const defaultConfig = {
      serverIp: '',
      publicEncryptionKey: '',
      emailRecipients: [],
      includeUserId: false,
      includeCaseId: false,
      emailBody: '',
      serverAppletId: '',
    }

    return configs.reduce((configs, option) => {
      const name = _.get(option, [reprolib.options.name, 0, '@value']);
      const type = _.get(option, [reprolib.type, 0]);

      let value = _.get(option, [reprolib.options.value], []).map(item => item['@value']);

      if (type != reprolib.types.list) {
        value = value[0];
      }

      if (value !== undefined) {
        return {
          ...configs,
          [name]: value
        }
      }

      return configs;
    }, defaultConfig)
  }

  static getAppletImageHTML (applet) {
    if (!applet.image) {
      return '';
    }

    const imageHTML = `
      <div class="applet-image">
        <img
          src="${applet.image}"
          alt=''
        />
      </div>
    `

    return imageHTML;
  }

  getSummary (responses) {
    let alerts = [];
    let alertsHTML = '', scoresHTML = '';

    for (const response of responses) {
      const activity = this.activities.find(activity => activity.id == response.activityId);

      if (activity && activity.allowSummary) {
        alerts = alerts.concat(activity.getAlertsForSummary(response.data));

        const scores = activity.getScoresForSummary(response.data);
        if (scores.length) {
          scoresHTML += `
            <div class="score-messages">
              <div class="activity-title">${activity.name}</div>
              <div>
                ${
                  scores.map(score => `
                    <div class="score-message ${score.flagScore ? 'flag' : ''}">
                      <img class="score-flag" src="${ICON_URL + 'score-flag.png'}" width="15" height="15">
                      <span>${score.prefLabel}</span>
                      <div class="score-value">${score.value}</div>
                    </div>
                  `).join('\r\n')
                }
              </div>
            </div>
          `
        }
      }
    }

    if (!alerts.length && !scoresHTML) {
      return '';
    }

    if (alerts.length) {
      alertsHTML = '<div class="alerts-title">Alerts</div>';
    }
    for (const alert of alerts) {
      alertsHTML += `
        <div>
          <img class="alert-icon" src="${ICON_URL + 'alert-icon.png'}" width="15" height="15">
          <span class="alert-message">${alert}</span>
        </div>
      `;
    }

    let output = `
      <div class="summary-title">Report Summary</div>
      <div class="alerts-list">${alertsHTML}</div>
      ${scoresHTML}
    `;

    return `<div class="report-summary">${output}</div>`
  }

  getEmailConfigs (activityId, activityFlowId, responses) {
    return {
      body: convertMarkdownToHtml(this.reportConfigs.emailBody),
      subject: this.getSubject(activityId, activityFlowId, responses),
      attachment: this.getPDFFileName(activityId, activityFlowId, responses),
      emailRecipients: this.reportConfigs.emailRecipients
    }
  }

  getPDFPassword () {
    return getAppletPassword(this.reportConfigs.serverAppletId);
  }

  getPDFFileName (activityId, activityFlowId, responses) {
    const activityFlow = this.activityFlows.find(flow => flow.id === activityFlowId);
    const activity = this.activities.find(activity => activity.id === activityId);
    const userId = this.user.MRN || this.user.email;
    const configs = this.reportConfigs;

    let pdfName = 'REPORT';

    if (configs.includeUserId) {
      pdfName += `_${userId}`;
    }

    pdfName += `_${this.name}`;
    pdfName += `_${activityFlow ? activityFlow.name : activity.name}`;
    pdfName += `_${moment.utc(this.timestamp).format('YYYY-MM-DD-HHmmss')}`;
    return pdfName;
  }

  getSubject (activityId, activityFlowId, responses) {
    const activityFlow = this.activityFlows.find(flow => flow.id === activityFlowId);
    const activity = this.activities.find(activity => activity.id === activityId);
    const userId = this.user.MRN || this.user.email;
    const configs = this.reportConfigs;

    let subject = 'Report by';

    if (configs.includeUserId) {
      subject += ` ${userId}`;
    }

    subject += `: ${this.name} / ${activityFlow ? activityFlow.name : activity.name}`;

    return subject;
  }
}
