import 'dotenv/config';
import express from 'express';
import { authenticate } from './middleware/index.js';
import convertMarkdownToHtml from './markdown-utils.js';
import cors from 'cors';
import { convertHtmlToPdf, encryptPDF } from './pdf-utils.js';
import { fetchApplet, uploadPDF, getAccountPermissions } from './mindlogger-api.js';
import { Applet, Activity } from './models/index.js';
import { verifyPublicKey, decryptData } from './encryption.js';
import { setAppletPassword, getAppletPassword } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;
const outputsFolder = process.env.OUTPUTS_FOLDER;

app.use(cors());
app.use(express.json());
app.use(authenticate);

app.get('/', async (req, res) => {
  res.status(200).send('MindLogger Report Server is UP');
});

app.put('/preview-report', async (req, res) => {
  try {
    const reports = req.body.reports;
    const items = req.body.items;
    const images = req.body.images;

    const filename = `${outputsFolder}/previews/${uuidv4()}.pdf`

    let html = '';

    html += Activity.getSplashImageHTML(false, { splashImage: images.splash }) + '\n';
    html += Applet.getAppletImageHTML({ image: images.applet }) + '\n';
    html += convertMarkdownToHtml(Activity.getReportPreview(reports, items)) + '\n';
    html += Activity.getReportFooter() + '\n';
    html += Activity.getReportStyles();

    await convertHtmlToPdf(
      `<div class="container">${html}</div>`,
      filename
    )

    const pdf = fs.createReadStream(filename);
    pdf.on('end', function() {
      fs.unlink(filename, () => {});
    });
    pdf.pipe(res);
  } catch (e) {
    res.status(403).json({ 'message': e?.message || 'invalid request data' });
  }
})

app.post('/send-pdf-report', async (req, res) => {
  const {
    appletId,
    activityId,
    activityFlowId,
    responseId,
  } = req.query;
  const token = req.headers.token;

  try {
    const responses = decryptData(req.body.responses);
    const now = req.body.now;

    const appletJSON = await fetchApplet(token, appletId);
    const applet = new Applet(appletJSON);
    const pdfPassword = await applet.getPDFPassword();

    if (!pdfPassword) {
      throw new Error('invalid password');
    }

    let html = '', pageBreak = false;

    html += applet.getSummary(responses);

    for (const response of responses) {
      const activity = applet.activities.find(activity => activity.id == response.activityId);

      if (activity) {
        const markdown = activity.evaluateReports(response.data, now);

        html += Activity.getSplashImageHTML(pageBreak, activity) + '\n';
        html += Applet.getAppletImageHTML(applet) + '\n';
        html += convertMarkdownToHtml(markdown) + '\n';

        pageBreak = true;
      } else {
        throw new Error(`unable to find ${response.activityId}`);
      }
    }

    html += Activity.getReportFooter() + '\n';
    html += Activity.getReportStyles();

    const pdfName = applet.getPDFFileName(activityId, activityFlowId, responses);
    const filename = `${outputsFolder}/${appletId}/${activityId}/${pdfName}.pdf`;

    await convertHtmlToPdf(
      `<div class="container">${html}</div>`,
      filename
    )

    await encryptPDF(
      filename,
      pdfPassword
    )

    // send pdf to backend server
    await uploadPDF(token, appletId, responseId, applet.getEmailConfigs(activityId, activityFlowId, responses), filename);

    res.status(200).json({ 'message': 'success' });
  } catch (e) {
    console.log('error', e);

    res.status(400).json({ 'message': 'invalid request' })
  }
})

app.put('/verify', async (req, res) => {
  const publicKey = req.body.publicKey;
  const serverAppletId = req.body.serverAppletId;

  if (verifyPublicKey(publicKey)) {
    const password = await getAppletPassword(serverAppletId);

    res.status(200).json({
      'message': 'ok',
      'serverAppletId': password?.key ? serverAppletId : uuidv4()
    });
  } else {
    res.status(403).json({ 'message': 'invalid public key' });
  }
})

app.post('/set-password', async (req, res) => {
  const token = req.headers.token;
  const password = req.body.password;
  const serverAppletId = req.body.serverAppletId;
  const appletId = req.body.appletId;
  const accountId = req.body.accountId;

  try {
    const permissions = await getAccountPermissions(token, accountId, appletId);

    if (
      !permissions.includes('editor') &&
      !permissions.includes('manager') &&
      !permissions.includes('owner')
    ) {
      throw new Error('permission denied');
    }

    const pdfPassword = decryptData(password);
    await setAppletPassword(serverAppletId, pdfPassword.password, pdfPassword.privateKey, appletId || '', accountId);

    if (appletId) { // verify applet password
      const appletJSON = await fetchApplet(token, appletId);
      const applet = new Applet(appletJSON);

      if (!await applet.getPDFPassword(serverAppletId)) {
        throw new Error('invalid applet password');
      }
    }

    res.status(200).json({ 'message': 'success' });
  } catch (e) {
    console.log('error', e)
    res.status(403).json({ 'message': 'invalid password' });
  }
})

app.listen(port);
