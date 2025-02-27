import './tracer' // must come before importing any instrumented module.
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { serverController } from './modules/server/server.controller'
import { reportController } from './modules/report/report.controller'
import { logger } from './core/services/LoggerService'
import { logger as expressLogger } from 'express-winston'

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(expressLogger({ winstonInstance: logger }))

app.get('/', async (req: express.Request, res: express.Response) => {
  const buildVersion = process.env.BUILD_VERSION

  res.status(200).send(`MindLogger Report Server is UP (fixes v3) ${buildVersion ? `[Build: ${buildVersion}]` : ''}`)
})

// Standard health checks that can be filtered out of logs
app.get('/liveness', async (req: express.Request, res: express.Response) => {
  res.status(200).send('Liveness - OK')
})

app.get('/readiness', async (req: express.Request, res: express.Response) => {
  res.status(200).send('Readiness - OK')
})

app.post('/send-pdf-report', reportController.sendPdfReport)

app.put('/verify', serverController.verifyServerPublicKey)

app.post('/set-password', serverController.setPassword)

app.post('/decrypt-user-responses', serverController.decryptUserResponses)

app.listen(port, () => {
  logger.info(`MindLogger Report Server listening on port ${port}!`)
})
