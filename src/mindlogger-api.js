import axios from 'axios';

const apiHost = process.env.BACKEND_SERVER;

export const login = (token) => axios({
  method: 'get',
  url: `${apiHost}/users/me`,
  headers: { "Authorization": `bearer ${token}` },
}).then(res => res.data.result)

export const fetchApplet = (token, appletId) => axios({
  method: 'get',
  url: `${apiHost}/applets/${appletId}`,
  headers: { "Authorization": `bearer ${token}` },
}).then(res => res.data.result)

export const fetchActivity = (token, activityId) => axios({
  method: 'get',
  url: `${apiHost}/activities/${activityId}`,
  headers: { "Authorization": `bearer ${token}` },
}).then(res => res.data.result)

export const getAccountPermissions = (token, appletId) => axios({
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
