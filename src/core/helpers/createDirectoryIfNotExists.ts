import path from 'node:path'
import fs from 'fs'

export function createDirectoryIfNotExists(filePath: string): void {
  const directoryName = path.dirname(filePath)

  if (!fs.existsSync(directoryName)) {
    fs.mkdirSync(directoryName, { recursive: true })
  }
}
