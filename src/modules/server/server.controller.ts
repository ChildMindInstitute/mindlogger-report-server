import { decryptData, verifyPublicKey } from '../../encryption'
import { BaseResponse } from '../../core/interfaces/responses'
import {
  DecryptUserResponsesRequest,
  DecryptUserResponsesResponse,
  SetPasswordRequest,
  VerifyServerPublicKeyRequest,
} from './types'
import { ActivityResponse, SetPasswordRequestEncryptedPayload } from '../../core/interfaces'
import { getAppletKeys, setAppletPassword } from '../../db'
import { decryptActivityResponses } from '../report/helpers/decryptResponses'

class ServerController {
  public async verifyServerPublicKey(req: VerifyServerPublicKeyRequest, res: BaseResponse): Promise<BaseResponse> {
    const { publicKey } = req.body

    const isPublicKeyValid = verifyPublicKey(publicKey)

    if (!isPublicKeyValid) {
      return res.status(403).json({ message: 'invalid public key' })
    }

    return res.status(200).json({ message: 'ok' })
  }

  public async setPassword(req: SetPasswordRequest, res: BaseResponse): Promise<BaseResponse> {
    const { password, appletId } = req.body

    try {
      const pdfPassword = decryptData<SetPasswordRequestEncryptedPayload>(password)
      await setAppletPassword(appletId, pdfPassword.password, pdfPassword.privateKey)

      return res.status(200).json({ message: 'success' })
    } catch (e) {
      console.error('error', e)
      return res.status(403).json({ message: 'invalid password' })
    }
  }

  public async decryptUserResponses(
    req: DecryptUserResponsesRequest,
    res: DecryptUserResponsesResponse,
  ): Promise<DecryptUserResponsesResponse> {
    const appletKeys = await getAppletKeys(req.body.appletId)

    if (!appletKeys || !appletKeys.privateKey) {
      return res.status(400).json({ message: 'Applet is not connected. AppletId not found.' })
    }

    const responses: ActivityResponse[] = decryptActivityResponses({
      responses: req.body.responses,
      appletPrivateKey: appletKeys.privateKey,
      appletEncryption: req.body.appletEncryption,
    })

    return res.status(200).json({
      message: 'ok',
      result: responses,
    })
  }
}

export const serverController = new ServerController()
