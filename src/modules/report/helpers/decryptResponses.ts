import { logger } from '../../../core/services/LoggerService'
import { ActivityResponse, IAppletEncryption } from '../../../core/interfaces'
import { decryptResponses } from '../../../encryption-dh'
import { Response } from '../types'
import tracer from '../../../tracer' // must come before importing any instrumented module.

type Params = {
  responses: Array<Response>
  appletPrivateKey: string
  appletEncryption: IAppletEncryption
}

export function decryptActivityResponses(params: Params): ActivityResponse[] {
  const T0 = performance.now()

  const result = params.responses.map((response) => {
    const decryptedReponses = decryptResponses(
      response.answer,
      params.appletPrivateKey,
      params.appletEncryption,
      response.userPublicKey,
    )

    return {
      activityId: response.activityId,
      data: decryptedReponses,
    }
  })

  const T1 = performance.now()
  logger.info(`Activity responses decrypting took ${T1 - T0} milliseconds.`)
  tracer.dogstatsd.gauge('report_server.activity_response.decrypt.duration', T1 - T0)

  return result
}
