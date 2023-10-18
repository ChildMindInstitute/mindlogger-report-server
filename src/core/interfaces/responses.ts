import { Response } from 'express'

export type BaseResponse = Response<{
  message: string
}>
