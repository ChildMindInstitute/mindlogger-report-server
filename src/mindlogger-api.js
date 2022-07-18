import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const apiHost = process.env.BACKEND_SERVER;

export const login = (token) => axios({
  method: 'get',
  url: `${apiHost}/user/authentication`,
  headers: { "Girder-Token": token },
  params: {
    lang: 'en',
  },
})

export const fetchApplet = (token, appletId, nextActivity = '') => axios({
  method: 'get',
  url: `${apiHost}/applet/${appletId}`,
  headers: { "Girder-Token": token },
  params: {
    nextActivity
  }
}).then(res => {
  const applet = res.data;

  if (applet.nextActivity) {
    return new Promise(resolve => setTimeout(() => resolve(fetchApplet(token, appletId, applet.nextActivity).then(next => {
      for (const IRI in next.data.items) {
        applet.items[IRI] = next.data.items[IRI]
      }

      for (const IRI in next.data.activities) {
        applet.activities[IRI] = next.data.activities[IRI]
      }

      return applet;
    })), 50));
  }

  return applet;
})

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

export const getAccountPermissions = (token, accountId, appletId) => axios({
  method: 'get',
  url: `${apiHost}/account/permissions`,
  headers: {
    'Girder-Token': token,
    'Content-Type': 'multipart/form-data'
  },
  params: {
    accountId, appletId
  }
}).then(res => res.data)
