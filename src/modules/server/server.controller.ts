import { Request } from 'express'
import { verifyPublicKey } from '../../encryption'
import { BaseResponse } from '../../core/interfaces/responses'

class ServerController {
  public async verifyServerPublicKey(req: Request, res: BaseResponse): Promise<BaseResponse> {
    const publicKey = req.body.publicKey

    const isPublicKeyValid = verifyPublicKey(publicKey)

    if (isPublicKeyValid) {
      return res.status(200).json({
        message: 'ok',
      })
    } else {
      return res.status(403).json({ message: 'invalid public key' })
    }
  }
}

export const serverController = new ServerController()
