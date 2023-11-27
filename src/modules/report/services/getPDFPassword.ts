import { getAppletKeys } from '../../../db'

export async function getPDFPassword(appletId: string): Promise<string> {
  if (!appletId) {
    throw new Error('[getPDFPassword] Applet Id is required')
  }

  const row = await getAppletKeys(appletId)
  return row ? row.key : ''
}
