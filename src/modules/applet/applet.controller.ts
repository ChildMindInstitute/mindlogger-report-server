import { BaseResponse } from '../../core/interfaces/responses'
import { SetPasswordRequestEncryptedPayload } from '../../core/interfaces'
import { decryptData } from '../../encryption'
import { setAppletPassword } from '../../db'
import { SetPasswordRequest } from './types'

class AppletController {
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

export const appletController = new AppletController()
