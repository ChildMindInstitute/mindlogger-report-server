import { logger } from '../../../core/helpers'
import { ActivityResponse, IAppletEncryption } from '../../../core/interfaces'
import { decryptResponses } from '../../../encryption-dh'
import { Response } from '../types'

type Params = {
  responses: Array<Response>
  appletPrivateKey: string
  appletEncryption: IAppletEncryption
  userPublicKey: string
}

export function decryptActivityResponses(params: Params): ActivityResponse[] {
  const T0 = performance.now()

  const result = params.responses.map((response) => {
    const decryptedReponses = decryptResponses(
      response.answer,
      params.appletPrivateKey,
      params.appletEncryption,
      params.userPublicKey,
    )

    return {
      activityId: response.activityId,
      data: decryptedReponses,
    }
  })

  const T1 = performance.now()
  logger.info(`Activity responses decrypting took ${T1 - T0} milliseconds.`)

  return result
}
