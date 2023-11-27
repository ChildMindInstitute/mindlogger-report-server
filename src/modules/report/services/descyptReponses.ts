import { ActivityResponse, IAppletEncryption } from '../../../core/interfaces'
import { decryptResponses } from '../../../encryption-dh'

type Response = {
  activityId: string
  answer: string
}

type Params = {
  responses: Array<Response>

  appletPrivateKey: string
  appletEncryption: IAppletEncryption
  userPublicKey: string
}

export function decryptAnswers(params: Params): ActivityResponse[] {
  return params.responses.map((response) => {
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
}
