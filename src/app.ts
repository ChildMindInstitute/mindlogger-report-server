import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { convertHtmlToPdf, encryptPDF, getCurrentCount, watermarkPDF } from './pdf-utils'
import { Applet, Activity } from './models'
import { decryptData } from './encryption'
import { getAppletPassword } from './db'
import fs from 'fs'
import { IResponse, SendPdfReportRequestPayload, SendPdfReportResponse } from './core/interfaces'
import { decryptResponses } from './encryption-dh'
import os from 'os'
import { convertMarkdownToHtml } from './core/helpers'
import { serverController } from './modules/server/server.controller'
import { appletController } from './modules/applet/applet.controller'

const app = express()
const port = process.env.PORT || 3000
const outputsFolder = process.env.OUTPUTS_FOLDER || os.tmpdir()

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.get('/', async (req: express.Request, res: express.Response) => {
  res.status(200).send('MindLogger Report Server is UP (fixes v3)')
})

app.post('/send-pdf-report', async (req: express.Request, res: express.Response) => {
  const { activityId, activityFlowId } = req.query as { activityId: string; activityFlowId: string | null }

  try {
    if (!req.body.payload) {
      throw new Error('payload is required')
    }
    const payload = decryptData(req.body.payload) as SendPdfReportRequestPayload
    const appletPassword = await getAppletPassword(payload.applet.id)
    if (!appletPassword || !appletPassword.privateKey) {
      throw new Error('applet is not connected')
    }
    const responses: IResponse[] = payload.responses.map((response) => {
      return {
        activityId: response.activityId,
        data: decryptResponses(
          response.answer,
          appletPassword.privateKey,
          payload.applet.encryption,
          payload.userPublicKey,
        ),
      }
    })
    if (!activityId) {
      throw new Error('activityId is required')
    }
    const user = payload.user
    const now = payload.now

    const applet = new Applet(payload.applet)

    const pdfPassword = await applet.getPDFPassword()
    if (!pdfPassword) {
      throw new Error('invalid password')
    }

    let html = '',
      pageBreak = false
    let splashPage = undefined

    html += applet.getSummary(responses)

    const appletId = payload.applet.id
    const pdfName = applet.getPDFFileName(activityId, activityFlowId, responses, user)
    const filename = `${outputsFolder}/${appletId}/${activityId}/${pdfName}`
    html += Activity.getReportStyles()

    let watermarkStart = 0
    let pageCount = 0
    const skipPages = []

    watermarkStart = await getCurrentCount(html)
    pageCount = watermarkStart

    for (const response of responses) {
      const activity = applet.activities.find((activity) => activity.id === response.activityId)

      if (activity) {
        const markdown = activity.evaluateReports(response.data, user, now)
        splashPage = Activity.getSplashImageHTML(pageBreak, activity)

        html += splashPage + '\n'
        html += convertMarkdownToHtml(markdown, splashPage === '' && skipPages.length === 0) + '\n'

        const count = await getCurrentCount(html)
        if (splashPage != '') {
          skipPages.push(pageCount + 1)
        }

        pageCount = count
        pageBreak = true
      } else {
        throw new Error(`unable to find ${response.activityId}`)
      }
    }

    html += Activity.getReportFooter() + '\n'

    await convertHtmlToPdf(`<div class="container">${html}</div>`, filename)

    const watermarkURL = Applet.getAppletWatermarkURL(applet)

    await watermarkPDF(filename, watermarkURL, watermarkStart, skipPages)

    await encryptPDF(filename, pdfPassword)

    res.status(200).json(<SendPdfReportResponse>{
      pdf: fs.readFileSync(filename, { encoding: 'base64' }).toString(),
      email: applet.getEmailConfigs(activityId, activityFlowId, responses, user, now),
    })
    fs.unlink(filename, () => {})
  } catch (e) {
    console.error('error', e)

    res.status(400).json({ message: 'invalid request' })
  }
})

app.put('/verify', serverController.verifyServerPublicKey)

app.post('/set-password', appletController.setPassword)

app.listen(port, () => console.info(`MindLogger Report Server listening on port ${port}!`))
