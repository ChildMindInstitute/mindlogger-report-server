import _ from 'lodash';
import Item from './item';
import convertMarkdownToHtml from '../markdown-utils';
import fs from 'fs';
import mime from "mime-types";
import {
  IActivity,
  IActivityItem, IActivityScoresAndReportsCondition, IActivityScoresAndReportsConditionalLogic,
  IActivityScoresAndReportsScores,
  IActivityScoresAndReportsSections,
  IResponseItem,
  IUser,
  KVObject,
  ScoreForSummary
} from "../interfaces";
import {isFloat} from "../report-utils";

export default class Activity {
  public json: IActivity;
  public schemaId: string;
  public id: string;
  public name: string;
  public splashImage: string;
  public items: Item[];

  public reportIncludeItem: string;
  public allowSummary: boolean;
  public reportScores: IActivityScoresAndReportsScores[];
  public reportSections: IActivityScoresAndReportsSections[];

  constructor (data: IActivity, items: IActivityItem[] = []) {
    this.json = data;

    this.schemaId = data.id;
    this.id = data.id;
    this.name = data.name;
    this.splashImage = data.splashScreen;

    this.items = items.map(item => {
      return new Item(item);
    });

    //TODO: activity.items.find(item => item.name == activity.reportIncludeItem);
    this.reportIncludeItem = ''; //TODO  data.scoresAndReports?.generateReport || false;

    this.allowSummary = data.scoresAndReports?.showScoreSummary || false;
    this.reportScores = data.scoresAndReports?.scores || [];
    this.reportSections = data.scoresAndReports?.sections || [];
  }

  private getScoresSumForReport(scores: KVObject, allowedNamesToCalculateScore: string[]): number {
    const allowedScores: KVObject = {};
    for (const name in scores) {
      if (allowedNamesToCalculateScore.includes(name)) {
        allowedScores[name] = scores[name];
      }
    }
    return _.sum(_.values(allowedScores));
  }

  evaluateScores (responses: IResponseItem[]): KVObject {
    const scores: KVObject = {}, maxScores: KVObject = {};

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];    
      const item = this.items[i];

      scores[item.name] = item.getScore(response);
      maxScores[item.name] = item.getMaxScore();
    }

    // calculate scores first
    for (const report of this.reportScores) {
      const reportScore = this.getScoresSumForReport(scores, report.itemsScore);
      const reportMaxScore = this.getScoresSumForReport(maxScores, report.itemsScore);

      maxScores[report.id] = reportMaxScore;

      switch (report.calculationType) {
        case 'sum':
          scores[report.id] = reportScore;
          break;
        case 'percentage':
          scores[report.id] = Number(!reportMaxScore ? 0 : reportScore / reportMaxScore * 100).toFixed(2);
          break;
        case 'average':
          scores[report.id] = Number(reportScore / report.itemsScore.length).toFixed(2);
          break;
      }

      for (const conditional of report.conditionalLogic) {
        scores[conditional.id] = this.testVisibility(conditional, scores)
      }
    }

    return scores;
  }

  scoresToValues(scores: KVObject, responses: IResponseItem[]): KVObject[] {
    const values = { ...scores };
    const rawValues = { ...scores };
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const item = this.items[i];
      values[item.name] = item.getVariableValue(response);
      rawValues[item.name] = response?.value;
    }
    return [values, rawValues];
  }

  evaluateReports (responses: IResponseItem[], user: IUser, now: string = ''): string {
    const scores = this.evaluateScores(responses);
    const [values, rawValues] = this.scoresToValues(scores, responses);

    let markdown = '';
    // evaluate isVis field and get markdown
    for (const report of this.reportScores) {
      markdown += convertMarkdownToHtml(this.replaceValuesInMarkdown(report.message, values, user, now)) + '\n';
      markdown += this.replaceValuesInMarkdown(this.getPrintedItems(report.itemsPrint, responses), values, user, now) + '\n';


      for (const conditional of report.conditionalLogic) {
        const isVis = scores[conditional.id];

        if (isVis) {
          markdown += convertMarkdownToHtml(this.replaceValuesInMarkdown(conditional.message, values, user, now)) + '\n';
          markdown += this.replaceValuesInMarkdown(this.getPrintedItems(conditional.itemsPrint, responses), values, user, now) + '\n';
        }
      }
    }

    for (const report of this.reportSections) {
      const isVis = this.testVisibility(report.conditionalLogic, rawValues);

      if (isVis) {
        markdown += convertMarkdownToHtml(this.replaceValuesInMarkdown(report.message, values, user, now)) + '\n';
        markdown += this.replaceValuesInMarkdown(this.getPrintedItems(report.itemsPrint, responses), values, user, now) + '\n';
      }
    }

    return `<div class="activity-report">${markdown}</div>`;
  }

  getAlertsForSummary (responses: IResponseItem[]) {
    let alerts: any[] = []; //TODO - type
    for (let i = 0; i < responses.length; i++) {
      alerts = alerts.concat(this.items[i].getAlerts(responses[i]));
    }

    return alerts;
  }

  getScoresForSummary (responses: IResponseItem[]): ScoreForSummary[] {
    let scores = this.evaluateScores(responses);

    let result = [];
    for (const report of this.reportScores) {
      let flagScore = false;

      for (const conditional of report.conditionalLogic) {
        const isVis = this.testVisibility(conditional, scores);
        if (isVis && conditional.flagScore) {
          flagScore = true;
          break;
        }
      }

      result.push({
        prefLabel: report.name,
        value: scores[report.id],
        flagScore
      })
    }

    return result;
  }

  getPrintedItems (items: string[], responses: IResponseItem[]): string {
    let markdown = '';

    if (!items) return markdown;

    for (const itemName of items) {
      const index = this.items.findIndex(item => item.name === itemName);

      if (index >= 0) {
        markdown += this.items[index].getPrinted(responses[index]) + '\n';
      }
    }

    return markdown;
  }

  replaceValuesInMarkdown (message: string|null, scores: KVObject, user: IUser, now: string = ''): string {
    let markdown = message ?? '';

    for (const scoreId in scores) {
      const reg = new RegExp(`\\[\\[${this.escapeRegExp(scoreId)}\\]\\]`, "gi");
      markdown = markdown.replace(reg, this.escapeReplacement(String(scores[scoreId])));
    }

    markdown = markdown.replace(/\[\[sys\.date\]\]/ig, this.escapeReplacement(now));

    if ('nickName' in user) {
      const nickName = !!user.nickname ? user.nickname : `${user.firstName} ${user.lastName}`.trim();
      markdown = markdown.replace(/\[nickname\]/ig, this.escapeReplacement(nickName));
    }

    return markdown;
  }

  escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  escapeReplacement(string: string): string {
    return string.replace(/\$/g, '$$$$');
  }

  testVisibility (conditional: IActivityScoresAndReportsConditionalLogic|null, scores: KVObject): boolean {
    if (!conditional) {
      return true;
    }
    const {conditions, match} = conditional;
    function checkCondition({type, payload}: IActivityScoresAndReportsCondition, scoreOrValue: number): boolean {
      switch (type) {
        case 'BETWEEN': //TODO
          return payload.minValue <= scoreOrValue && payload.maxValue >= scoreOrValue;
        case 'OUTSIDE_OF': //TODO
          return payload.minValue > scoreOrValue || payload.maxValue < scoreOrValue;
        case 'EQUAL_TO_OPTION': //TODO
          return scoreOrValue === parseFloat(payload.optionValue);
        case 'NOT_EQUAL_TO_OPTION': //TODO
          return scoreOrValue !== parseFloat(payload.optionValue);
        case 'GREATER_THAN':
          return scoreOrValue > payload.value;
        case 'LESS_THAN':
          return scoreOrValue < payload.value;
        case 'EQUAL':
          return scoreOrValue == payload.value;
        case 'NOT_EQUAL':
          return scoreOrValue != payload.value;
        default:
          return false;
      }
    }

    function checkAny(results: boolean[]): boolean {
      for (const result of results) {
        if (result) {
          return true;
        }
      }
      return false;
    }

    function checkAll(results: boolean[]): boolean {
      for (const result of results) {
        if (!result) {
          return false;
        }
      }
      return results.length > 0;
    }

    const results = [];
    for (const condition of conditions) {
      const key = condition.itemName;
      if (key in scores) {
        const score = isFloat(scores[key]) ? parseFloat(scores[key]) : scores[key];
        results.push(checkCondition(condition, score));
      } else {
        results.push(false);
      }
    }
    switch (match) {
      case 'all':
        return checkAll(results);
      case 'any':
        return checkAny(results);
      default:
        return false;
    }
  }

  static getSplashImageHTML (pageBreakBefore: boolean = true, activity: Activity) {
    const image = activity.splashImage;
    const mimeType = mime.lookup(image) || "";

    if (image && !mimeType.startsWith("video/")) {
      return `
        <div class="splash-image" style="${pageBreakBefore ? 'page-break-before: always;' : ''}">
          <img src="${image}" alt="Splash Activity">
        </div>
      `;
    }else if (pageBreakBefore){
      return `<div style="page-break-before: always"/>`
    }

    return '';
  }

  static getReportFooter (): string {
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

  static getReportStyles (): string {
    const pdfStyles = fs.readFileSync('src/static/pdf-styles.css');
    return `<style>${pdfStyles.toString()}</style>`
  }

  // static getReportPreview (reports, previewItems): string {
  //   const items = previewItems.map(item => Item.getItem(item));
  //
  //   const activity = new Activity();
  //   activity.items = items;
  //
  //   let markdown = '', responses = [];
  //
  //   // evaluate isVis field and get markdown
  //   for (let i = 0; i < items.length; i++) {
  //     responses.push(null);
  //   }
  //
  //   for (const report of reports) {
  //     if (report.dataType == 'section') {
  //       markdown += report.message + '\n';
  //       markdown += activity.getPrintedItems(report.itemsPrint, responses) + '\n';
  //     } else {
  //       for (const conditional of report.conditionals) {
  //         markdown += conditional.message + '\n';
  //         markdown += activity.getPrintedItems(report.itemsPrint, responses) + '\n';
  //       }
  //     }
  //   }
  //
  //   return `<div class="activity-report">${markdown}</div>`;
  // }
}
