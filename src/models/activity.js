import reprolib from './reprolib.js';
import _ from 'lodash';
import Item from './item.js';
import { Parser } from 'expr-eval';
import convertMarkdownToHtml from '../markdown-utils.js';
import fs from 'fs';
import Mimoza from "mimoza";
import {isFloat} from "../utils.js";

export default class Activity {
  constructor (data={}, items=[]) {
    this.json = data;

    this.schemaId = data.id;
    this.id = data.id;
    this.name = data.name;
    this.splashImage = data.splashScreen;

    //TODO items order
    this.items = items.map(item => {
      return new Item(item);
    });

    // this.reportIncludeItem = _.get(data, [reprolib.reportIncludeItem, 0, '@value'], '');
    // this.reports = this.extractReports(_.get(data, [reprolib.reports, 0, '@list'], []));
    //
    // const allowList = _.get(data, [reprolib.allow, 0, '@list']).map(item => item['@id']);
    // this.allowSummary = !allowList.some((item) => item.includes('disable_summary'))
    this.allowSummary = true;
  }

  extractReports (reports) {
    return reports.map((report) => {
      const dataType = _.get(report, [reprolib.options.dataType, 0, '@id']);
      const message = _.get(report, [reprolib.message, 0, '@value']);
      const printItems = _.get(report, [reprolib.printItems, 0, '@list'], []).map(item => item['@value']);

      const data = {
        id: report[reprolib.id],
        prefLabel: _.get(report, [reprolib.prefLabel, 0, '@value']),
        message,
        printItems,
        dataType,
      }

      if (dataType == 'score') {
        Object.assign(data, {
          outputType: _.get(report, [reprolib.outputType, 0, '@value']),
          jsExpression: _.get(report, [reprolib.jsExpression, 0, '@value']),
          conditionals: _.get(report, [reprolib.conditionals, 0, '@list'], []).map((conditional) => {
            const message = _.get(conditional, [reprolib.message, 0, '@value']);
            const printItems = _.get(conditional, [reprolib.printItems, 0, '@list']).map(item => item['@value']);

            return {
              prefLabel: _.get(conditional, [reprolib.prefLabel, 0, '@value']),
              id: conditional[reprolib.id],
              message,
              printItems,
              flagScore: _.get(conditional, [reprolib.flagScore, 0, '@value']),
              isVis: _.get(conditional, [reprolib.isVis, 0, '@value']),
            }
          })
        })
      } else {
        data.isVis = _.get(report, [reprolib.isVis, 0, '@value']);
      }

      return data;
    });
  }

  evaluateScores (responses) {
    const scores = {}, maxScores = {};

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const item = this.items[i];

      scores[item.schemaId] = item.getScore(response);
      maxScores[item.schemaId] = item.getMaxScore();
    }

    // calculate scores first
    for (const report of this.reports) {
      if (report.dataType == 'score') {
        const reportScore = this.evaluateExpression(report.jsExpression, scores);
        const reportMaxScore = this.evaluateExpression(report.jsExpression, maxScores);

        maxScores[report.id] = reportMaxScore;

        switch (report.outputType) {
          case 'cumulative':
            scores[report.id] = reportScore;
            break;
          case 'percentage':
            scores[report.id] = Number(!reportMaxScore ? 0 : reportScore / reportMaxScore * 100).toFixed(2);
            break;
          case 'average':
            scores[report.id] = Number(reportScore / report.jsExpression.split('+').length).toFixed(2);
            break;
        }

        for (const conditional of report.conditionals) {
          scores[conditional.id] = this.testVisibility(conditional.isVis, scores)
        }
      }
    }

    return scores;
  }

  scoresToValues(scores, responses) {
    const values = { ...scores };
    const rawValues = { ...scores };
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const item = this.items[i];
      values[item.schemaId] = item.getVariableValue(response);
      rawValues[item.schemaId] = response?.value;
    }
    return [values, rawValues];
  }

  evaluateReports (responses, user, now = '') {
    const scores = this.evaluateScores(responses);
    const [values, rawValues] = this.scoresToValues(scores, responses);

    let markdown = '';

    // evaluate isVis field and get markdown
    for (const report of this.reports) {
      if (report.dataType == 'section') {
        const isVis = this.testVisibility(report.isVis, rawValues);

        if (isVis) {
          markdown += convertMarkdownToHtml(this.replaceValuesInMarkdown(report.message, values, user, now)) + '\n';
          markdown += this.replaceValuesInMarkdown(this.getPrintedItems(report.printItems, responses), values, user, now) + '\n';
        }
      } else {
        markdown += convertMarkdownToHtml(this.replaceValuesInMarkdown(report.message, values, user, now)) + '\n';
        markdown += this.replaceValuesInMarkdown(this.getPrintedItems(report.printItems, responses), values, user, now) + '\n';

        for (const conditional of report.conditionals) {
          const isVis = scores[conditional.id];

          if (isVis) {
            markdown += convertMarkdownToHtml(this.replaceValuesInMarkdown(conditional.message, values, user, now)) + '\n';
            markdown += this.replaceValuesInMarkdown(this.getPrintedItems(conditional.printItems, responses), values, user, now) + '\n';
          }
        }
      }
    }

    return `<div class="activity-report">${markdown}</div>`;
  }

  getAlertsForSummary (responses) {
    let alerts = [];
    for (let i = 0; i < responses.length; i++) {
      alerts = alerts.concat(this.items[i].getAlerts(responses[i]));
    }

    return alerts;
  }

  getScoresForSummary (responses) {
    let scores = this.evaluateScores(responses);

    let result = [];
    for (const report of this.reports) {
      if (report.dataType == 'score') {
        let flagScore = false;

        for (const conditional of report.conditionals) {
          const isVis = this.testVisibility(conditional.isVis, scores);
          if (isVis && conditional.flagScore) {
            flagScore = true;
            break;
          }
        }

        result.push({
          prefLabel: report.prefLabel,
          value: scores[report.id],
          flagScore
        })
      }
    }

    return result;
  }

  getPrintedItems (items, responses) {
    let markdown = '';

    if (!items) return markdown;

    for (const itemId of items) {
      const index = this.items.findIndex(item => item.schemaId == itemId);

      if (index >= 0) {
        markdown += this.items[index].getPrinted(responses[index]) + '\n';
      }
    }

    return markdown;
  }

  replaceValuesInMarkdown (message, scores, user, now = '') {
    let markdown = message;

    for (const scoreId in scores) {
      const reg = new RegExp(`\\[\\[${this.escapeRegExp(scoreId)}\\]\\]`, "gi");
      markdown = markdown.replace(reg, this.escapeReplacement(String(scores[scoreId])));
    }

    markdown = markdown.replace(/\[\[sys\.date\]\]/ig, this.escapeReplacement(now));

    if ('nickName' in user) {
      const nickName = !!user.nickName ? user.nickName : `${user.firstName} ${user.lastName}`.trim();
      markdown = markdown.replace(/\[nickname\]/ig, this.escapeReplacement(nickName));
    }

    return markdown;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  escapeReplacement(string) {
    return string.replace(/\$/g, '$$$$');
  }

  evaluateExpression (jsExpression, scores) {
    const parser = new Parser();

    try {
      let expression = jsExpression;

      for (const variableName in scores) {
        expression = expression.replace(
          new RegExp(`\\b${variableName}\\b`, 'g'), scores[variableName]
        );
      }

      // Run the expression
      const expr = parser.parse(expression);

      const result = expr.evaluate();
      return result;
    } catch (error) {
      console.log('error is', error);
      return 0;
    }
  }

  testVisibility (testExpression = true, scores = {}) {
    // Short circuit for common testExpression
    if (testExpression === true || testExpression === 'true') {
      return true;
    }

    const parser = new Parser({
      logical: true,
      comparison: true,
    });

    let expression = testExpression
      .replace(/&&/g, ' and ')
      .replace(/\|\|/g, ' or ')
      .replace('===', '==')
      .replace('!==', '!=')
      .replace(/(\w+\.includes)/g, 'arrayIncludes($&')
      .replace(/.includes\(/g, ', ')
      .replace(/!arrayIncludes/g, 'arrayNotIncludes');

    // Custom function to test if element is present in array
    const arrayIncludes = (array, element) => {
      if (array === undefined || array === null) {
        return false;
      }
      if (!Array.isArray(array)) {
        return array === element;
      }
      for (let i = 0; i < array.length; i += 1) {
        if (array[i] === element) {
          return true;
        }
      }
      return false;
    };

    const arrayNotIncludes = (array, element) => {
      if (array === undefined || array === null) {
        return false;
      }
      for (let i = 0; i < array.length; i += 1) {
        if (array[i] === element) {
          return false;
        }
      }
      return true;
    };

    parser.functions.arrayIncludes = arrayIncludes;
    parser.functions.arrayNotIncludes = arrayNotIncludes;

    try {
      const expr = parser.parse(expression);
      const scoresForCheck = {};
      for (const key in scores) {
          scoresForCheck[key] = isFloat(scores[key]) ? parseFloat(scores[key]) : scores[key];
      }
      const result = expr.evaluate(scoresForCheck);
      return !!result; // Cast the result to true or false
    } catch (error) {
      return true; // Default to true if we can't parse the expression
    }
  }

  static getSplashImageHTML (pageBreakBefore = true, activity) {
    const image = activity.splashImage;
    const mimeType = Mimoza.getMimeType(image) || "";

    if (image && !mimeType.startsWith("video/")) {
      return `
        <div class="splash-image" style="${pageBreakBefore ? 'page-break-before: always;' : ''}">
          <img src="${image}" alt="Splash Activity">
        </div>
      `;
    }else if (pageBreakBefore === true){
      return `<div style="page-break-before: always"/>`
    }

    return '';
  }

  static getReportFooter () {
    const termsText = 'I understand that the information provided by this questionnaire is not intended to replace the advice, diagnosis, or treatment offered by a medical or mental health professional, and that my anonymous responses may be used and shared for general research on children’s mental health.';
    const footerText = 'CHILD MIND INSTITUTE, INC. AND CHILD MIND MEDICAL PRACTICE, PLLC (TOGETHER, “CMI”) DOES NOT DIRECTLY OR INDIRECTLY PRACTICE MEDICINE OR DISPENSE MEDICAL ADVICE AS PART OF THIS QUESTIONNAIRE. CMI ASSUMES NO LIABILITY FOR ANY DIAGNOSIS, TREATMENT, DECISION MADE, OR ACTION TAKEN IN RELIANCE UPON INFORMATION PROVIDED BY THIS QUESTIONNAIRE, AND ASSUMES NO RESPONSIBILITY FOR YOUR USE OF THIS QUESTIONNAIRE.';

    return `
      <div class="divider-line"></div>
      <p class="text-footer text-body mb-5">
        ${termsText}
      </p>
      <p class="text-footer text-body-1">
        ${footerText}
      </p>
    `;
  }

  static getReportStyles () {
    const pdfStyles = fs.readFileSync('src/static/pdf-styles.css');
    return `<style>${pdfStyles.toString()}</style>`
  }

  static getReportPreview (reports, previewItems) {
    const items = previewItems.map(item => Item.getItem(item));

    const activity = new Activity();
    activity.items = items;

    let markdown = '', responses = [];

    // evaluate isVis field and get markdown
    for (let i = 0; i < items.length; i++) {
      responses.push(null);
    }

    for (const report of reports) {
      if (report.dataType == 'section') {
        markdown += report.message + '\n';
        markdown += activity.getPrintedItems(report.printItems, responses) + '\n';
      } else {
        for (const conditional of report.conditionals) {
          markdown += conditional.message + '\n';
          markdown += activity.getPrintedItems(report.printItems, responses) + '\n';
        }
      }
    }

    return `<div class="activity-report">${markdown}</div>`;
  }
}
