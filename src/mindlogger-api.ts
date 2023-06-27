import axios from 'axios';
import {IActivity, IApplet} from "./interfaces";

const apiHost = process.env.BACKEND_SERVER;

export const login = (token: any) => axios({
  method: 'get',
  url: `${apiHost}/users/me`,
  headers: { "Authorization": `bearer ${token}` },
}).then(res => res.data.result)

export const fetchApplet = (token: string, appletId: string): Promise<IApplet> => axios({
  method: 'get',
  url: `${apiHost}/applets/${appletId}`,
  headers: { "Authorization": `bearer ${token}` },
}).then(res => res.data.result as IApplet)

export const fetchActivity = (token: string, activityId: string): Promise<IActivity> => axios({
  method: 'get',
  url: `${apiHost}/activities/${activityId}`,
  headers: { "Authorization": `bearer ${token}` },
}).then(res => res.data.result)

export const getAccountPermissions = (token: string, appletId: string) => axios({
  method: 'get',
  url: `${apiHost}/account/permissions`,
  headers: {
    'Girder-Token': token,
    'Content-Type': 'multipart/form-data'
  },
  params: {
    appletId
  }
}).then(res => res.data)
