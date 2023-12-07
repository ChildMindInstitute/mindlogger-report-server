import { decryptData, verifyPublicKey } from '../../encryption'
import { BaseResponse } from '../../core/interfaces/responses'
import { SetPasswordRequest, VerifyServerPublicKeyRequest } from './types'
import { SetPasswordRequestEncryptedPayload } from '../../core/interfaces'
import { setAppletPassword } from '../../db'

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
}

export const serverController = new ServerController()
