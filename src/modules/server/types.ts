import { Request, Response } from 'express'
import { ActivityResponse, IAppletEncryption } from '../../core/interfaces'
import { Response as EncryptedActivityResponse } from '../report/types'

export type VerifyServerPublicKeyRequest = Request<any, any, VerifyServerPublicKeyBody, any, any>

type VerifyServerPublicKeyBody = {
  publicKey: string
}

export type SetPasswordRequest = Request<any, any, SetPasswordRequestPayload, any, any>

type SetPasswordRequestPayload = {
  appletId: string
  password: string // Encrypted object { password: string, privateKey: number[]  }
}

export type DecryptUserResponsesRequest = Request<any, any, DecryptUserResponsesRequestPayload, any, any>

export type DecryptUserResponsesResponse = Response<{
  message: string
  result?: ActivityResponse[]
}>

type DecryptUserResponsesRequestPayload = {
  responses: Array<EncryptedActivityResponse>
  appletEncryption: IAppletEncryption
  userPublicKey: string
  userPublicKeys: string[]
  appletId: string
}
