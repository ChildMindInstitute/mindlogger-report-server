import reprolib from './reprolib.js';
import _ from 'lodash';
import convertMarkdownToHtml from '../markdown-utils.js';

const ICON_URL = 'https://raw.githubusercontent.com/ChildMindInstitute/mindlogger-report-server/main/src/static/icons/';
export default class Item {
  constructor (data = {}) {
    this.json = data;

    this.schemaId = data.id;
    this.id = data.id;
    this.name = data.name;
    this.question = data.question;

    this.inputType = data.responseType;

    this.multipleChoice = data.responseType = 'multiSelect'; // TODO
    this.scoring = data.config?.addScores || false;
    this.options = this.patchOptions(data.responseValues?.options); //this.extractResponseOptions(, this.inputType);

    // this.minValue = _.get(data, [reprolib.responseOptions, 0, reprolib.minValue, 0, '@value']) || '';
    // this.maxValue = _.get(data, [reprolib.responseOptions, 0, reprolib.maxValue, 0, '@value']) || '';
  }

  patchOptions(options) {
    const clonedOptions = _.cloneDeep(options);
    if (!clonedOptions || clonedOptions.length === 0) {
      return clonedOptions;
    }
    if (clonedOptions[0].value === 1) {
      for (const option of clonedOptions) {
        option.value -= 1;
      }
    }
    return clonedOptions;
  }

  static getItem (itemPreview) {
    const item = new Item();

    Object.assign(item, itemPreview);
    item.scoring = true;
    item.schemaId = item.name;

    return item;
  }

  // extractResponseOptions (options, inputType) {
  //   if (
  //     !options || !Array.isArray(options) || typeof(options[0]) != 'object'
  //   ) {
  //     return null;
  //   }
  //
  //   if (inputType == 'singleSelect' || this.inputType !== 'checkbox' || inputType == 'slider') {
  //     const itemListElement = options[0][reprolib.options.itemList];
  //     if (!itemListElement) return null;
  //
  //     return itemListElement.map((choice) => ({
  //       name: _.get(choice, [reprolib.options.name, 0, '@value']),
  //       value: Number(_.get(choice, [reprolib.options.value, 0, '@value'])),
  //       score: Number(_.get(choice, [reprolib.options.score, 0, '@value'])),
  //       alert: _.get(choice, [reprolib.options.alert, 0, '@value']),
  //     }));
  //   }
  //
  //   return null;
  // }

  convertResponseToArray (response) {
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

  getScore (value) {
    if (value === null || this.inputType !== 'singleSelect' && this.inputType !== 'checkbox' && this.inputType !== 'slider' || !this.scoring) {
      return 0;
    }

    let response = this.convertResponseToArray(value);

    let totalScore = 0;

    for (let value of response) {
      const option = this.matchOption(value);
      if (option && option.score) {
        totalScore += option.score;
      }
    }

    return totalScore;
  }

  matchOption(value) {
    let option = null;
    if (typeof value === 'number') {
      option = this.options.find(option => option.value === value);
    }
    if (typeof value === 'string') {
      option = this.options.find(option => option.id === value || option.text === value);
    }
    return option;
  }

  //TODO: test alerts
  getAlerts (value) {
    if (value === null || this.inputType !== 'singleSelect' && this.inputType !== 'checkbox' && this.inputType !== 'slider') {
      return 0;
    }

    let response = this.convertResponseToArray(value);

    return response.map(value => {
      const option = this.matchOption(value);
      return option && option.alert ? option.alert : '';
    }).filter(alert => alert.length > 0);
  }

  getVariableValue (value) {
    const allowedTypes = ['singleSelect', 'checkbox', 'slider', 'date', 'text', 'ageSelector'];

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

    if (Array.isArray(this.options)) {
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

  getMaxScore () {
    if (this.inputType !== 'singleSelect' && this.inputType !== 'checkbox' && this.inputType !== 'slider' || !this.scoring) {
      return 0;
    }

    const oo = 1e6;

    return this.options.reduce((previousValue, currentOption) => {
      return this.multipleChoice ? Math.max(currentOption.score + previousValue, previousValue) : Math.max(currentOption.score, previousValue)
    }, this.multipleChoice ? 0 : -oo);
  }

  getQuestionText () {
    const imageRE = new RegExp(/[\r\n]*\!\[.*\]\((.*)=.*\)[\r\n]*/i);

    const questionText = this.question.replace(imageRE, '');  // Remove the image from the question.
    return questionText;
  }

  getPrinted (value) {
    if (this.inputType !== 'singleSelect' && this.inputType !== 'checkbox' && this.inputType !== 'slider' && this.inputType !== 'text') {
      return '';
    }

    let response = this.convertResponseToArray(value);

    let questionHTML = convertMarkdownToHtml(this.getQuestionText());

    let optionsHtml = '', type = this.inputType;

    if (this.inputType === 'singleSelect' || this.inputType === 'checkbox') {
      if (this.multipleChoice) {
        type = 'checkbox';
      }

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
      const minTick = Math.min(...this.options.map(option => option.id));
      const maxTick = Math.max(...this.options.map(option => option.id));

      const minValue = `<div class="slider-value">${this.minValue}</div>`;
      const maxValue = `<div class="slider-value">${this.maxValue}</div>`;

      optionsHtml += `<div class="option">${minValue}<input type="range" min="${minTick}" max="${maxTick}" value="${response[0]}">${maxValue}</div>`;
    } else if (this.inputType === 'text') {
      optionsHtml += response[0];
    }

    return `<div class="item-print-container"><div class="item-print ${type}"><div class="item-name">${this.schemaId}</div><div class="question">${questionHTML}</div><div class="options">${optionsHtml}</div></div></div>`;
  }
}
