import { Request } from 'express'

export type SetPasswordRequest = Request<any, any, SetPasswordRequestPayload, any, any>

export interface SetPasswordRequestPayload {
  appletId: string
  password: string
}
