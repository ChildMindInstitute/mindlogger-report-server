import 'dotenv/config'
import os from 'os'
import fs from 'fs'
import { Response } from 'express'

import { v4 } from 'uuid'

import { decryptData } from '../../encryption'
import { ActivityResponse, SendPdfReportResponse } from '../../core/interfaces'
import { getAppletKeys } from '../../db'
import { convertMarkdownToHtml } from '../../core/helpers'
import { AppletEntity } from '../../models'
import { getCurrentCount, convertHtmlToPdf, watermarkPDF, encryptPDF, getPDFPassword } from '../../pdf-utils'
import { SendPdfReportRequest, SendPdfReportRequestPayload } from './types'
import { getReportFooter, getReportStyles, getSplashImageHTML } from './helpers'
import { decryptActivityResponses } from './helpers/decryptResponses'

class ReportController {
  public async sendPdfReport(req: SendPdfReportRequest, res: Response): Promise<unknown> {
    const t0 = performance.now()
    console.info('Generating PDF started')

    const { activityId, activityFlowId } = req.query

    const outputsFolder = process.env.OUTPUTS_FOLDER || os.tmpdir()

    try {
      if (!req.body.payload) {
        throw new Error('payload is required')
      }

      if (!activityId) {
        throw new Error('activityId is required')
      }

      console.info(`Payload length: ${req.body.payload.length}`)
      const decryptPayloadT0 = performance.now()
      const payload = decryptData<SendPdfReportRequestPayload>(req.body.payload)
      const decryptPayloadT1 = performance.now()
      console.info(`Payload decrypting took ${decryptPayloadT1 - decryptPayloadT0} milliseconds.`)

      const appletKeys = await getAppletKeys(payload.applet.id)

      if (!appletKeys || !appletKeys.privateKey) {
        throw new Error('applet is not connected')
      }

      const decryptActivityResponsesT0 = performance.now()
      const responses: ActivityResponse[] = decryptActivityResponses({
        responses: payload.responses,
        appletPrivateKey: appletKeys.privateKey,
        appletEncryption: payload.applet.encryption,
        userPublicKey: payload.userPublicKey,
      })
      const decryptActivityResponsesT1 = performance.now()
      console.info(
        `Activity responses descrypting took ${decryptActivityResponsesT1 - decryptActivityResponsesT0} milliseconds.`,
      )

      const user = payload.user
      const now = payload.now

      const applet = new AppletEntity(payload.applet)

      const pdfPassword = await getPDFPassword(applet.id)

      if (!pdfPassword) {
        throw new Error('invalid password')
      }

      let html = ''
      let pageBreak = false
      let splashPage = undefined

      html += applet.getSummary(responses)

      const appletId = payload.applet.id
      const pdfName = applet.getPDFFileName(activityId, activityFlowId, responses, user)
      const filename = `${outputsFolder}/${appletId}/${activityId}/${v4()}/${pdfName}`
      html += getReportStyles()

      let watermarkStart = 0
      let pageCount = 0
      const skipPages = []

      watermarkStart = await getCurrentCount(html)
      pageCount = watermarkStart

      for (const response of responses) {
        const activity = applet.activities.find((activity) => activity.id === response.activityId)

        if (activity) {
          const markdown = activity.evaluateReports(response.data, user)
          splashPage = getSplashImageHTML(pageBreak, activity)

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

      html += getReportFooter() + '\n'

      await convertHtmlToPdf(`<div class="container">${html}</div>`, filename)

      const watermarkURL = AppletEntity.getAppletWatermarkURL(applet)

      await watermarkPDF(filename, watermarkURL, watermarkStart, skipPages)

      await encryptPDF(filename, pdfPassword)

      const t1 = performance.now()

      console.info(`PDF generation took ${t1 - t0} milliseconds.`)
      console.info(`PDF file string length: ${fs.readFileSync(filename, { encoding: 'base64' }).toString().length}`)

      res.status(200).json(<SendPdfReportResponse>{
        pdf: fs.readFileSync(filename, { encoding: 'base64' }).toString(),
        email: applet.getEmailConfigs(activityId, activityFlowId, responses, user, now),
      })
      fs.unlink(filename, () => {})
    } catch (e) {
      console.error('error', e)

      return res.status(400).json({ message: 'invalid request' })
    }
  }
}

export const reportController = new ReportController()
