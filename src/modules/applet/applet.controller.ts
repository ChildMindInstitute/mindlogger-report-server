import { Request } from 'express'
import { BaseResponse } from '../../core/interfaces/responses'
import { SetPasswordRequestEncryptedPayload, SetPasswordRequestPayload } from '../../core/interfaces'
import { decryptData } from '../../encryption'
import { setAppletPassword } from '../../db'

class AppletController {
  public async setPassword(req: Request, res: BaseResponse): Promise<BaseResponse> {
    const { password, appletId } = req.body as SetPasswordRequestPayload

    try {
      const pdfPassword = decryptData(password) as SetPasswordRequestEncryptedPayload
      await setAppletPassword(appletId, pdfPassword.password, pdfPassword.privateKey)

      return res.status(200).json({ message: 'success' })
    } catch (e) {
      console.error('error', e)
      return res.status(403).json({ message: 'invalid password' })
    }
  }
}

export const appletController = new AppletController()
