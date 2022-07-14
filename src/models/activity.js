import reprolib from './reprolib.js';
import _ from 'lodash';
import Item from './item.js';
import { Parser } from 'expr-eval';
import fs from 'fs';
import Mimoza from "mimoza";

const pdfStyles = fs.readFileSync('src/static/pdf-styles.css');

export default class Activity {
  constructor (data={}, items=[]) {
    this.json = data;

    this.schemaId = data[reprolib.id];
    this.id = (data._id || '').split('/').pop();
    this.name = _.get(data, [reprolib.prefLabel, 0, '@value'], '');
    this.splashImage = _.get(data, [reprolib.splash, 0, '@value']);

    const itemOrder = _.get(data, [reprolib.order, 0, '@list'], []).map(item => item['@id']);
    this.items = itemOrder.map(id => {
      if (items[id]) {
        return new Item(items[id]);
      }

      return null;
    }).filter(item => item !== null);

    this.reportIncludeItem = _.get(data, [reprolib.reportIncludeItem, 0, '@value'], '');
    this.reports = this.extractReports(_.get(data, [reprolib.reports, 0, '@list'], []));
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

  evaluateReports (responses) {
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
      }
    }

    let markdown = '';

    // evaluate isVis field and get markdown
    for (const report of this.reports) {
      if (report.dataType == 'section') {
        const isVis = this.testVisibility(report.isVis, scores);

        if (isVis) {
          markdown += this.replaceScoresInMarkdown(report.message, scores) + '\n';
          markdown += this.getPrintedItems(report.printItems, responses) + '\n';
        }
      } else {
        markdown += this.replaceScoresInMarkdown(report.message, scores) + '\n';
        markdown += this.getPrintedItems(report.printItems, responses) + '\n';

        for (const conditional of report.conditionals) {
          const isVis = this.testVisibility(conditional.isVis, scores);

          if (isVis) {
            markdown += this.replaceScoresInMarkdown(conditional.message, scores) + '\n';
            markdown += this.getPrintedItems(report.printItems, responses) + '\n';
          }
        }
      }
    }

    return `<div class="activity-report">${markdown}</div>`;
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

  replaceScoresInMarkdown (message, scores) {
    let markdown = message;

    for (const scoreId in scores) {
      const reg = new RegExp(`\\[\\[${scoreId}\\]\\]`, "gi");
      markdown = markdown.replace(reg, scores[scoreId]);
    }

    return markdown;
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
      .replace(/(\w+\.)/g, 'arrayIncludes($&')
      .replace(/.includes\(/g, ', ')
      .replace(/!arrayIncludes/g, 'arrayNotIncludes');

    // Custom function to test if element is present in array
    const arrayIncludes = (array, element) => {
      if (array === undefined || array === null) {
        return false;
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

      const result = expr.evaluate(scores);
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
