import reprolib from './reprolib.js';
import _ from 'lodash';

export default class ActivityFlow {
  constructor (data, activities) {
    this.json = data;

    this.schemaId = data.id;
    this.id = data.id;
    this.name = data.name;

    this.activities = activities;

    // TODO const [activityName, itemName] = activityFlow.reportIncludeItem.split('/');
    this.reportIncludeItem = ''; //TODO
  }
}
