import 'dotenv/config';
import express from 'express';
import { authenticate } from './middleware/index.js';
import convertMarkdownToHtml from './markdown-utils.js';
import cors from 'cors';
import { convertHtmlToPdf, encryptPDF } from './pdf-utils.js';
import { fetchApplet, uploadPDF } from './mindlogger-api.js';
import { Applet, Activity } from './models/index.js';
import { verifyPublicKey, decryptData } from './encryption.js';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;
const ouputsFolder = process.env.OUTPUTS_FOLDER;

app.use(cors());
app.use(express.json());
app.use(authenticate);

app.put('/preview-report', async (req, res) => {
  try {
    const reports = req.body.reports;
    const items = req.body.items;
    const images = req.body.images;
    const token = req.headers.token;

    const filename = `${ouputsFolder}/previews/${Date.now()}-${token}.pdf`

    let html = '';

    html += Activity.getSplashImageHTML(false, { splashImage: images.splash }) + '\n';
    html += Applet.getAppletImageHTML({ image: images.applet }) + '\n';
    html += convertMarkdownToHtml(Activity.getReportPreview(reports, items)) + '\n';
    html += Activity.getReportFooter() + '\n';
    html += Activity.getReportStyles();

    await convertHtmlToPdf(html, filename)

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

    const appletJSON = await fetchApplet(token, appletId);
    const applet = new Applet(appletJSON);

    let html = '', pageBreak = false;

    for (const response of responses) {
      const activity = applet.activities.find(activity => activity.id == response.activityId);

      if (activity) {
        const markdown = activity.evaluateReports(response.data);

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
    const filename = `${ouputsFolder}/${appletId}/${activityId}/${pdfName}.pdf`;

    await convertHtmlToPdf(
      html,
      filename
    )

    await encryptPDF(
      filename,
      applet.getPDFPassword()
    )

    // send pdf to backend server
    await uploadPDF(token, appletId, responseId, applet.getEmailConfigs(activityId, activityFlowId), filename);

    res.status(200).json({ 'message': 'success' });
  } catch (e) {
    console.log('error', e);

    res.status(400).json({ 'message': 'invalid request' })
  }
})

app.put('/verify', async (req, res) => {
  const publicKey = req.body.publicKey;

  if (verifyPublicKey(publicKey)) {
    res.status(200).json({ 'message': 'ok' });
  } else {
    res.status(403).json({ 'message': 'invalid public key' });
  }
})

app.listen(port);
