import reprolib from './reprolib.js';
import _ from 'lodash';

export default class ActivityFlow {
  constructor (data, activities) {
    this.json = data;

    this.schemaId = data[reprolib.id];
    this.id = data._id.split('/').pop();
    this.name = _.get(data, [reprolib.options.name, 0, '@value'], '');

    const order = _.get(data, [reprolib.order, 0, '@list'], []).map(item => item['@id']);

    this.activities = order.map(id => {
      const activity = activities.find(activity => activity.schemaId == id);
      return activity;
    }).filter(activity => activity !== null);

    this.reportIncludeItem = _.get(data, [reprolib.reportIncludeItem, 0, '@value'], '');
  }
}
