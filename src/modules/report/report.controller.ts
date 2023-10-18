import 'dotenv/config'
import os from 'os'
import fs from 'fs'
import { Response } from 'express'

import { decryptData } from '../../encryption'
import { ActivityItemReponse, SendPdfReportResponse } from '../../core/interfaces'
import { getAppletKeys } from '../../db'
import { convertMarkdownToHtml } from '../../core/helpers'
import { decryptResponses } from '../../encryption-dh'
import { ActivityEntity, AppletEntity } from '../../models'
import { getCurrentCount, convertHtmlToPdf, watermarkPDF, encryptPDF } from '../../pdf-utils'
import { SendPdfReportRequest, SendPdfReportRequestPayload } from './types'

class ReportController {
  public async sendPdfReport(req: SendPdfReportRequest, res: Response): Promise<unknown> {
    const { activityId, activityFlowId } = req.query

    const outputsFolder = process.env.OUTPUTS_FOLDER || os.tmpdir()

    try {
      if (!req.body.payload) {
        throw new Error('payload is required')
      }

      if (!activityId) {
        throw new Error('activityId is required')
      }

      const payload = decryptData<SendPdfReportRequestPayload>(req.body.payload)
      const appletKeys = await getAppletKeys(payload.applet.id)

      if (!appletKeys || !appletKeys.privateKey) {
        throw new Error('applet is not connected')
      }

      const responses: ActivityItemReponse[] = payload.responses.map((response) => {
        const decryptedReponses = decryptResponses(
          response.answer,
          appletKeys.privateKey,
          payload.applet.encryption,
          payload.userPublicKey,
        )

        return {
          activityId: response.activityId,
          data: decryptedReponses,
        }
      })

      const user = payload.user
      const now = payload.now

      const applet = new AppletEntity(payload.applet)

      const pdfPassword = await applet.getPDFPassword()

      if (!pdfPassword) {
        throw new Error('invalid password')
      }

      let html = ''
      let pageBreak = false
      let splashPage = undefined

      html += applet.getSummary(responses)

      const appletId = payload.applet.id
      const pdfName = applet.getPDFFileName(activityId, activityFlowId, responses, user)
      console.log(outputsFolder)
      const filename = `${outputsFolder}/${appletId}/${activityId}/${pdfName}`
      html += ActivityEntity.getReportStyles()

      let watermarkStart = 0
      let pageCount = 0
      const skipPages = []

      watermarkStart = await getCurrentCount(html)
      pageCount = watermarkStart

      for (const response of responses) {
        const activity = applet.activities.find((activity) => activity.id === response.activityId)

        if (activity) {
          const markdown = activity.evaluateReports(response.data, user, now)
          splashPage = ActivityEntity.getSplashImageHTML(pageBreak, activity)

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

      html += ActivityEntity.getReportFooter() + '\n'

      await convertHtmlToPdf(`<div class="container">${html}</div>`, filename)

      const watermarkURL = AppletEntity.getAppletWatermarkURL(applet)

      await watermarkPDF(filename, watermarkURL, watermarkStart, skipPages)

      await encryptPDF(filename, pdfPassword)

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
