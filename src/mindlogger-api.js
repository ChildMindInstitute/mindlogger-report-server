import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const apiHost = process.env.BACKEND_SERVER;

export const login = (token) => axios({
  method: 'get',
  url: `${apiHost}/users/me`,
  headers: { "Authorization": `bearer ${token}` },
})

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

export const uploadPDF = (token, appletId, responseId, emailConfig, pdfPath) => {
  const form = new FormData();
  form.append('emailConfig', JSON.stringify(emailConfig));
  form.append('pdf', fs.createReadStream(pdfPath));

  return axios({
    method: 'post',
    url: `${apiHost}/response/report`,
    headers: {
      'Girder-Token': token,
      "Content-Type": "multipart/form-data"
    },
    params: {
      appletId,
      responseId,
    },
    data: form
  })
}

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
