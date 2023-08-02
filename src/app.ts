import 'dotenv/config';
import express from 'express';
import convertMarkdownToHtml from './markdown-utils';
import cors from 'cors';
import { convertHtmlToPdf, encryptPDF, getCurrentCount, watermarkPDF } from './pdf-utils';
import { Applet, Activity } from './models';
import { verifyPublicKey, decryptData } from './encryption';
import { setAppletPassword, getAppletPassword } from './db';
import fs from 'fs';
import {
  IResponse,
  SendPdfReportRequestPayload, SendPdfReportResponse,
  SetPasswordRequestEncryptedPayload,
  SetPasswordRequestPayload
} from "./interfaces";
import {decryptResponses} from "./encryption-dh";
import os from 'os';

const app = express();
const port = process.env.PORT || 3000;
const outputsFolder = process.env.OUTPUTS_FOLDER || os.tmpdir();

app.use(cors());
app.use(express.json());
// app.use(authenticate);

app.get('/', async (req: express.Request, res: express.Response) => {
  res.status(200).send('MindLogger Report Server is UP (fixes v3)');
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
  const {activityId, activityFlowId} = req.query as {activityId: string, activityFlowId: string|null};
  // const token = req.headers.token;

  try {
    if (!req.body.payload) {
      throw new Error('payload is required');
    }
    const payload = decryptData(req.body.payload) as SendPdfReportRequestPayload;
    const appletPassword = await getAppletPassword(payload.applet.id);
    if (!appletPassword || !appletPassword.privateKey) {
      throw new Error('applet is not connected');
    }
    const responses: IResponse[] = payload.responses.map(response => {
      return {
        activityId: response.activityId,
        data: decryptResponses(response.answer, appletPassword.privateKey, payload.applet.encryption, payload.userPublicKey)
      };
    });
    if (!activityId) {
      throw new Error('activityId is required');
    }
    const user = payload.user;
    const now = payload.now;

    const applet = new Applet(payload.applet);

    const pdfPassword = await applet.getPDFPassword();
    if (!pdfPassword) {
      throw new Error('invalid password');
    }

    let html = '', pageBreak = false;
    let splashPage = undefined;

    html += applet.getSummary(responses);

    const appletId = payload.applet.id;
    const pdfName = applet.getPDFFileName(activityId, activityFlowId, responses, user);
    const filename = `${outputsFolder}/${appletId}/${activityId}/${pdfName}`;
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
        html += convertMarkdownToHtml(markdown, splashPage === '' && skipPages.length === 0) + '\n';

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

    res.status(200).json(<SendPdfReportResponse>{
      'pdf': fs.readFileSync(filename, { encoding: 'base64' }).toString(),
      'email': applet.getEmailConfigs(activityId, activityFlowId, responses, user, now),
    });
    fs.unlink(filename, () => {});

    // const pdf = fs.createReadStream(filename);
    // pdf.on('end', function() {
    //   fs.unlink(filename, () => {});
    // });
    // pdf.pipe(res);
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
  const {password, appletId} = req.body as SetPasswordRequestPayload;

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

    const pdfPassword = decryptData(password) as SetPasswordRequestEncryptedPayload;
    await setAppletPassword(appletId, pdfPassword.password, pdfPassword.privateKey);

    res.status(200).json({ 'message': 'success' });
  } catch (e) {
    console.log('error', e)
    res.status(403).json({ 'message': 'invalid password' });
  }
})

app.listen(port);
