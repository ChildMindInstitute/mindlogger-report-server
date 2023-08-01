import {isNumber} from 'lodash';
import convertMarkdownToHtml from '../markdown-utils';
import {IActivityItem, IActivityItemOption, IResponseItem} from "../interfaces";

const ICON_URL = 'https://raw.githubusercontent.com/ChildMindInstitute/mindlogger-report-server/main/src/static/icons/';
export default class Item {
  public json: IActivityItem;
  public schemaId: string;
  public id: string;
  public name: string;
  public question: string;
  public inputType: string;
  public multipleChoice: boolean;
  public scoring: boolean;
  public setAlerts: boolean;
  public options: IActivityItemOption[];

  constructor (data: IActivityItem) {
    this.json = data;

    this.schemaId = data.id;
    this.id = data.id;
    this.name = data.name;
    this.question = data.question?.en ?? data.question;

    this.inputType = data.responseType;

    this.multipleChoice = data.responseType === 'multiSelect';
    this.scoring = data.config?.addScores || false;
    this.setAlerts = data.config?.setAlerts || false;
    this.options = data.responseValues?.options ?? [];
  }

  convertResponseToArray (response: IResponseItem|number|string): any[] {
    if (response === null) {
      return [null];
    }

    if (typeof response === 'number' || typeof response === 'string') {
      return [response];
    } else if (typeof response === 'object' && !Array.isArray(response)) {
      if (!Array.isArray(response.value)) {
        return [response.value];
      } else {
        return response.value;
      }
    }

    return response;
  }

  getScore(value: IResponseItem): number {
    if (value === null || this.inputType !== 'singleSelect' && this.inputType !== 'multiSelect' && this.inputType !== 'slider' || !this.scoring) {
      return 0;
    }

    let response = this.convertResponseToArray(value);

    let totalScore = 0;

    for (let value of response) {
      switch (this.inputType) {
        case 'slider':
          const scores = this.json.responseValues.scores ?? [];
          if (value in scores) {
            totalScore += scores[value];
          }
          break;
        default:
          const option = this.matchOption(value);
          if (option && option.score) {
            totalScore += option.score;
          }
      }
    }

    return totalScore;
  }

  matchOption(value: number|string): IActivityItemOption|null {
    let option = null;
    if (typeof value === 'number') {
      option = this.options.find(option => option.value === value);
    }
    if (typeof value === 'string') {
      option = this.options.find(option => option.id === value || option.text === value);
    }
    return option ? option : null;
  }

  getAlerts (value: IResponseItem): string[] {
    if (!this.setAlerts || value === null || this.inputType !== 'singleSelect' && this.inputType !== 'multiSelect' && this.inputType !== 'slider') {
      return [];
    }

    let response = this.convertResponseToArray(value);

    return response.map(value => {
      switch (this.inputType) {
        case 'slider':
          const alerts = this.json.responseValues.alerts ?? [];
          const alert = alerts.find(a => a.value === value);
          return alert?.alert ?? '';
        default:
          const option = this.matchOption(value);
          return option && option.alert ? option.alert : '';
      }
    }).filter(alert => alert.length > 0);
  }

  getVariableValue (value: IResponseItem): string {
    const allowedTypes = ['singleSelect', 'multiSelect', 'numberSelect', 'slider', 'date', 'text'];

    if (value === null || !allowedTypes.includes(this.inputType)) {
      return '';
    }

    const response = this.convertResponseToArray(value);

    if (response.length === 0) {
      return '';
    }

    if (this.inputType === 'date') {
      return response[0] && `${(response[0].month + 1).toString().padStart(2, '0')}/${response[0].day.toString().padStart(2, '0')}/${response[0].year}` || '';
    }

    if (['singleSelect', 'multiSelect'].includes(this.inputType) && Array.isArray(this.options)) {
      const options = [];
      for (const v of response) {
        if (typeof v === 'number' || typeof v === 'string') {
          let option = this.options.find(option =>
            typeof v === 'number' && option.value === v ||
            typeof v === 'string' && option.text === v
          );

          if (option) {
            options.push(option.text);
          }
        }

      }
      return options.join(', ');
    }

    if (typeof response[0] === 'string') {
      return response[0];
    }

    if (typeof response[0] === 'number') {
      return response[0].toString();
    }

    return '';
  }

  getMaxScore(): number {
    if (this.inputType !== 'singleSelect' && this.inputType !== 'multiSelect' && this.inputType !== 'slider' || !this.scoring) {
      return 0;
    }
    if ('slider' === this.inputType) {
      const scores = this.json.responseValues.scores ?? [];
      return Math.max(...scores);
    }
    const oo = 1e6;

    return this.options.reduce((previousValue, currentOption) => {
      return this.multipleChoice ? Math.max(currentOption.score + previousValue, previousValue) : Math.max(currentOption.score, previousValue)
    }, this.multipleChoice ? 0 : -oo);
  }

  getQuestionText(): string {
    const imageRE = new RegExp(/[\r\n]*\!\[.*\]\((.*)=.*\)[\r\n]*/i);
    // Remove the image from the question.
    return this.question.replace(imageRE, '');
  }

  getPrinted(value: IResponseItem): string {
    if (this.inputType !== 'singleSelect' && this.inputType !== 'multiSelect' && this.inputType !== 'slider' && this.inputType !== 'text') {
      return '';
    }

    let response = this.convertResponseToArray(value);

    let questionHTML = convertMarkdownToHtml(this.getQuestionText());

    let optionsHtml = '', type = this.inputType;

    if (this.inputType === 'singleSelect' || this.inputType === 'multiSelect') {
      type = 'checkbox';

      for (const option of this.options) {
        const checked = response.some(value =>
          typeof value === 'number' && option.value === value ||
          typeof value === 'string' && option.text === value
        );

        const icon = ICON_URL + `${type}-${checked ? 'checked' : 'unchecked'}.svg`;

        optionsHtml += '<div class="option">';
        optionsHtml += `<img class="${type}" src="${icon}" width="15" height="15">`;
        optionsHtml += `<label>${option.text}</label>`;
        optionsHtml += '</div>';
      }
    } else if (this.inputType === 'slider' ) {
      const minValue = isNumber(this.json.responseValues?.minValue) ? this.json.responseValues?.minValue.toString() : '';
      const maxValue = isNumber(this.json.responseValues?.maxValue) ? this.json.responseValues?.maxValue.toString() : '';
      const minLabel = this.json.responseValues?.minLabel ?? '';
      const maxLabel = this.json.responseValues?.maxLabel ?? '';

      const minLabelHtml = `<div class="slider-value">${minLabel}</div>`;
      const maxLabelHtml = `<div class="slider-value">${maxLabel}</div>`;

      optionsHtml += `<div class="option">${minLabelHtml}<input type="range" min="${minValue}" max="${maxValue}" value="${response[0]}">${maxLabelHtml}</div>`;
    } else if (this.inputType === 'text') {
      optionsHtml += response[0];
    }

    return `<div class="item-print-container"><div class="item-print ${type}"><div class="item-name">${this.schemaId}</div><div class="question">${questionHTML}</div><div class="options">${optionsHtml}</div></div></div>`;
  }
}
