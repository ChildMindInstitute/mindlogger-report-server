import { ActivityEntity } from './activity'
import { IActivityFlow } from '../core/interfaces'

export default class ActivityFlow {
  public json: IActivityFlow
  public id: string
  public schemaId: string
  public name: string
  public activities: ActivityEntity[]
  public reportIncludeItem: string

  constructor(data: IActivityFlow, activities: ActivityEntity[]) {
    this.json = data

    this.schemaId = data.id
    this.id = data.id
    this.name = data.name

    this.activities = activities

    // TODO const [activityName, itemName] = activityFlow.reportIncludeItem.split('/');
    this.reportIncludeItem = '' //TODO
  }
}
