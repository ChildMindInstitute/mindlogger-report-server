import 'dotenv/config'
import os from 'os'
import fs from 'fs'
import { Response } from 'express'

import { v4 } from 'uuid'

import { decryptData } from '../../encryption'
import { ActivityResponse, SendPdfReportResponse } from '../../core/interfaces'
import { getAppletKeys } from '../../db'
import { convertMarkdownToHtml } from '../../core/helpers'
import { logger } from '../../core/services/LoggerService'
import { AppletEntity } from '../../models'
import { getCurrentCount, convertHtmlToPdf, watermarkPDF, encryptPDF, getPDFPassword } from '../../pdf-utils'
import { SendPdfReportRequest, SendPdfReportRequestPayload } from './types'
import { getReportFooter, getReportStyles, getSplashImageHTML } from './helpers'
import { decryptActivityResponses } from './helpers/decryptResponses'
import { getSummary } from './services/getSummary'
import { FeatureFlagsService } from '../../core/services/FeatureFlagsService'
import tracer from '../../tracer'

class ReportController {
  public async sendPdfReport(req: SendPdfReportRequest, res: Response): Promise<unknown> {
    const t0 = performance.now()
    logger.info('Generating PDF started')

    const { activityId, activityFlowId } = req.query

    const outputsFolder = process.env.OUTPUTS_FOLDER || os.tmpdir()

    const featureFlags = new FeatureFlagsService()

    try {
      if (!req.body.payload) {
        logger.error('[ReportController:sendPdfReport] Payload is required')
        return res.status(400).json({ message: 'Payload is required.' })
      }

      if (!activityId) {
        logger.error('[ReportController:sendPdfReport] ActivityId is required')
        return res.status(400).json({ message: 'ActivityId is required.' })
      }

      logger.info(`Encrypted payload length: ${req.body.payload.length}`)
      const payload = decryptData<SendPdfReportRequestPayload>(req.body.payload)

      const appletKeys = await getAppletKeys(payload.applet.id)

      if (!appletKeys || !appletKeys.privateKey) {
        logger.error('[ReportController:sendPdfReport] Applet is not connected')
        return res.status(400).json({ message: 'Applet is not connected. AppletId not found.' })
      }

      // Log into LD using workspace ID associated with applet (same as encryption account ID)
      await featureFlags.login(payload.applet.encryption.accountId)

      const treatNullAsZero = !featureFlags.getFlag('enable-subscale-null-when-skipped')

      const responses: ActivityResponse[] = decryptActivityResponses({
        responses: payload.responses,
        appletPrivateKey: appletKeys.privateKey,
        appletEncryption: payload.applet.encryption,
      })

      // TODO: Remove `treatNullAsZero` parameter once feature flag is removed
      // https://mindlogger.atlassian.net/browse/M2-8635
      const applet = new AppletEntity(payload.applet, treatNullAsZero)

      const pdfPassword = await getPDFPassword(applet.id)

      if (!pdfPassword) {
        logger.error('[ReportController:sendPdfReport] Invalid pdf password')
        return res.status(400).json({ message: 'Invalid pdf password.' })
      }

      let html = ''
      let pageBreak = false
      let splashPage = undefined

      html += getSummary({ responses, activities: applet.activities })

      const appletId = payload.applet.id
      const pdfName = applet.getPDFFileName(activityId, activityFlowId, responses, payload.user)
      const filename = `${outputsFolder}/${appletId}/${activityId}/${v4()}/${pdfName}`
      html += getReportStyles()

      let watermarkStart = 0
      let pageCount = 0
      const skipPages = []

      watermarkStart = await getCurrentCount(html)
      pageCount = watermarkStart

      for (const response of responses) {
        const activity = applet.activities.find((activity) => activity.id === response.activityId)

        if (!activity) {
          throw new Error(`[Report.controller] Unable to find ${response.activityId}`)
        }

        const markdown = activity.evaluateReports(response.data, payload.user)
        splashPage = getSplashImageHTML(pageBreak, activity.splashImage)

        html += splashPage + '\n'
        html += convertMarkdownToHtml(markdown, splashPage === '' && skipPages.length === 0) + '\n'

        const count = await getCurrentCount(html)
        if (splashPage !== '') {
          skipPages.push(pageCount + 1)
        }

        pageCount = count
        pageBreak = true
      }

      html += getReportFooter() + '\n'

      await convertHtmlToPdf(`<div class="container">${html}</div>`, filename)

      const watermarkURL = AppletEntity.getAppletWatermarkURL(applet)

      await watermarkPDF(filename, watermarkURL, watermarkStart, skipPages)

      await encryptPDF(filename, pdfPassword)

      const t1 = performance.now()

      logger.info(`Total PDF generation took ${t1 - t0} milliseconds.`)
      tracer.dogstatsd.gauge('report_server.pdf_generator.duration', t1 - t0)

      res.status(200).json(<SendPdfReportResponse>{
        pdf: fs.readFileSync(filename, { encoding: 'base64' }).toString(),
        email: applet.getEmailConfigs(activityId, activityFlowId, responses, payload.user),
      })
      fs.unlink(filename, () => {
        logger.info(`Deleted ${filename}`)
      })
    } catch (e) {
      logger.error('error', e)

      return res.status(400).json({ message: 'invalid request' })
    } finally {
      // Close LD client
      featureFlags.closeClient()
    }
  }
}

export const reportController = new ReportController()
