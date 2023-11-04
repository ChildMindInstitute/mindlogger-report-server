import { verifyPublicKey } from '../../encryption'
import { BaseResponse } from '../../core/interfaces/responses'
import { VerifyServerPublicKeyRequest } from './types'

class ServerController {
  public async verifyServerPublicKey(req: VerifyServerPublicKeyRequest, res: BaseResponse): Promise<BaseResponse> {
    const { publicKey } = req.body

    const isPublicKeyValid = verifyPublicKey(publicKey)

    if (isPublicKeyValid) {
      return res.status(200).json({
        message: 'ok',
      })
    }

    return res.status(403).json({ message: 'invalid public key' })
  }
}

export const serverController = new ServerController()
