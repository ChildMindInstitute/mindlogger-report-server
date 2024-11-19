import { Request } from 'express'
import { Applet, User } from '../../core/interfaces'

export type SendPdfReportRequest = Request<any, any, SendPdfReportBody, SendPdfReportQuery, any>

export type Response = {
  activityId: string
  answer: string
  userPublicKey: string
}

export type SendPdfReportRequestPayload = {
  responses: Array<Response>
  now: string
  user: User
  applet: Applet
}

type SendPdfReportQuery = {
  activityId: string
  activityFlowId: string | null
}

type SendPdfReportBody = {
  payload: SendPdfReportRequestPayload
}
