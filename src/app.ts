import 'dotenv/config';
import express from 'express';
import { authenticate } from './middleware';
import convertMarkdownToHtml from './markdown-utils';
import cors from 'cors';
import { convertHtmlToPdf, encryptPDF, getCurrentCount, watermarkPDF } from './pdf-utils';
import {fetchApplet, fetchActivity} from './mindlogger-api';
import { Applet, Activity } from './models';
import { verifyPublicKey, decryptData } from './encryption';
import { setAppletPassword, getAppletPassword } from './db';
import fs from 'fs';
import {IResponse} from "./interfaces";

const app = express();
const port = process.env.PORT || 3000;
const outputsFolder = process.env.OUTPUTS_FOLDER || '/tmp';

app.use(cors());
app.use(express.json());
app.use(authenticate);

app.get('/', async (req: express.Request, res: express.Response) => {
  res.status(200).send('MindLogger Report Server is UP (typescript)');
});

// app.put('/preview-report', async (req: Request, res: Response) => {
//   try {
//     const reports = req.body.reports;
//     const items = req.body.items;
//     const images = req.body.images;
//
//     const filename = `${outputsFolder}/previews/${uuidv4()}.pdf`
//
//     let html = '';
//
//     html += Activity.getSplashImageHTML(false, { splashImage: images.splash }) + '\n';
//     html += convertMarkdownToHtml(Activity.getReportPreview(reports, items)) + '\n';
//     html += Activity.getReportFooter() + '\n';
//     html += Activity.getReportStyles();
//
//     await convertHtmlToPdf(
//       `<div class="container">${html}</div>`,
//       filename
//     )
//
//     const pdf = fs.createReadStream(filename);
//     pdf.on('end', function() {
//       fs.unlink(filename, () => {});
//     });
//     pdf.pipe(res);
//   } catch (e) {
//     res.status(403).json({ 'message': e?.message || 'invalid request data' });
//   }
// })

app.post('/send-pdf-report', async (req: express.Request, res: express.Response) => {
  const {
    appletId,
    activityId,
    activityFlowId,
  } = req.query as {appletId: string, activityId: string, activityFlowId: string|null};
  const token = req.headers.token;

  try {
    if (!activityId) {
      throw new Error('activityId is required');
    }
    const user = {MRN: 'test', email: 'test@gmail.com', firstName: 'first', lastName: 'last', nickName: 'nick'};
    const responses = decryptData(req.body.responses) as IResponse[];
    // responses[0]['activityId'] = '0656ccb3-3b25-4197-be8e-c8479599a12c' //EPDS 2 out of 2
    const now = req.body.now;

    // @ts-ignore
    const appletJSON = await fetchApplet(token, appletId);
    for (let i = 0; i < appletJSON.activities.length; i++) {
      // @ts-ignore
      appletJSON.activities[i] = await fetchActivity(token, appletJSON.activities[i].id);
    }
    const applet = new Applet(appletJSON);

    const pdfPassword = await applet.getPDFPassword();
    if (!pdfPassword) {
      throw new Error('invalid password');
    }

    let html = '', pageBreak = false;
    let splashPage = undefined;

    html += applet.getSummary(responses);

    const pdfName = applet.getPDFFileName(activityId, activityFlowId, responses, user);
    const filename = `${outputsFolder}/${appletId}/${activityId}/${pdfName}.pdf`;
    html += Activity.getReportStyles();
    
    let watermarkStart = 0;
    let pageCount = 0;
    let skipPages = [];

    watermarkStart = await getCurrentCount(html);
    pageCount = watermarkStart;

    for (const response of responses) {
      const activity = applet.activities.find(activity => activity.id === response.activityId);

      if (activity) {
        const markdown = activity.evaluateReports(response.data, user, now);
        splashPage = Activity.getSplashImageHTML(pageBreak, activity);
        
        html += splashPage + '\n';
        html += convertMarkdownToHtml(markdown, splashPage, skipPages) + '\n';

        const count = await getCurrentCount(html);
        if(splashPage != '') {
          skipPages.push(pageCount+1);
        }

        pageCount = count;
        pageBreak = true;
      } else {
        throw new Error(`unable to find ${response.activityId}`);
      }
    }

    html += Activity.getReportFooter() + '\n';
    
    await convertHtmlToPdf(
      `<div class="container">${html}</div>`,
      filename
    )

    const watermarkURL = Applet.getAppletWatermarkURL(applet);
    
    await watermarkPDF(filename, watermarkURL, watermarkStart, skipPages);
    
    await encryptPDF(
      filename,
      pdfPassword
    );

    const pdf = fs.createReadStream(filename);
    pdf.on('end', function() {
      fs.unlink(filename, () => {});
    });
    pdf.pipe(res);
  } catch (e) {
    console.log('error', e);

    res.status(400).json({ 'message': 'invalid request' })
  }
})

app.put('/verify', async (req: express.Request, res: express.Response) => {
  const publicKey = req.body.publicKey;
  if (verifyPublicKey(publicKey)) {
    res.status(200).json({
      'message': 'ok',
    });
  } else {
    res.status(403).json({ 'message': 'invalid public key' });
  }
})

app.post('/set-password', async (req: express.Request, res: express.Response) => {
  const token = req.headers.token;
  const password = req.body.password;
  const appletId = req.body.appletId;

  try {
    // const permissions = await getAccountPermissions(token, appletId);
    //
    // if (
    //   !permissions.includes('editor') &&
    //   !permissions.includes('manager') &&
    //   !permissions.includes('owner')
    // ) {
    //   throw new Error('permission denied');
    // }

    const pdfPassword = decryptData(password);
    await setAppletPassword(appletId, pdfPassword.password);

    res.status(200).json({ 'message': 'success' });
  } catch (e) {
    console.log('error', e)
    res.status(403).json({ 'message': 'invalid password' });
  }
})

app.listen(port);
