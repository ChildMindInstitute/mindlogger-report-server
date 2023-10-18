import { Request } from 'express'
import { Applet, User } from '../../core/interfaces'

export type SendPdfReportRequest = Request<any, any, SendPdfReportBody, SendPdfReportQuery, any>

export type SendPdfReportRequestPayload = {
  responses: Array<{ activityId: string; answer: string }>
  userPublicKey: string
  now: string
  user: User
  applet: Applet
}

type SendPdfReportQuery = {
  activityId: string
  activityFlowId: string | null
}

type SendPdfReportBody = {
  payload: string | string[]
}
