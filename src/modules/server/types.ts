import { Request } from 'express'

export type VerifyServerPublicKeyRequest = Request<any, any, VerifyServerPublicKeyBody, any, any>

type VerifyServerPublicKeyBody = {
  publicKey: string
}
