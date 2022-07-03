import reprolib from './reprolib.js';
import Activity from './activity.js';
import ActivityFlow from './activity-flow.js';
import convertMarkdownToHtml from '../markdown-utils.js';
import crypto from 'crypto';
import moment from "moment-timezone";
import _ from 'lodash';

const sha256Hasher = crypto.createHmac("sha256", process.env.OWNER_PASSWORD);

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
    this.image = _.get(data.applet, [reprolib.options.image]) || 'https://mindlogger-applet-contents.s3.amazonaws.com/image/raokBZTzDPRLQifMajF3Et.png';
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
      emailBody: ''
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

  getEmailConfigs (activityId, activityFlowId, responses) {
    return {
      body: convertMarkdownToHtml(this.reportConfigs.emailBody),
      subject: this.getSubject(activityId, activityFlowId, responses),
      attachment: this.getPDFFileName(activityId, activityFlowId, responses),
      emailRecipients: this.reportConfigs.emailRecipients
    }
  }

  getPDFPassword () {
    const hash = sha256Hasher.update(this.id).digest("base64");
    return hash;
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
