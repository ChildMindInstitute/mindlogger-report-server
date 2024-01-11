import HummusRecipe from 'hummus-recipe'
import { PDFDocument } from 'pdf-lib'
import puppeteer from 'puppeteer'
import fs from 'fs'
import fetch from 'node-fetch'
import os from 'os'
import { createDirectoryIfNotExists, getRandomFileName } from './core/helpers'
import { getAppletKeys } from './db'

export const convertHtmlToPdf = async (html: string, saveTo: string): Promise<void> => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--headless', '--disable-gpu'],
  })

  const page = await browser.newPage()
  await page.setContent(html)

  try {
    createDirectoryIfNotExists(saveTo)
    await page.pdf({
      format: 'A4',
      width: '8.5in',
      height: '11in',
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.7in',
        right: '0.7in',
      },
      path: saveTo,
    })
  } finally {
    await browser.close()
  }
}

export const encryptPDF = (path: string, password: string) =>
  new Promise((resolve) => {
    const pdfDoc = new HummusRecipe(path, path)

    // @ts-ignore
    pdfDoc.encrypt({ userPassword: password, ownerPassword: password, userProtectionFlag: 4 }).endPDF(() => {
      resolve(null)
    })
  })

export async function watermarkPDF(pdfFile: string, watermarkURL: string, startPage: number, skipPages: number[]) {
  if (watermarkURL != '') {
    const imageOption = {}
    const imageBytes = await fetch(watermarkURL).then((res) => res.arrayBuffer())
    const dataBuffer = fs.readFileSync(pdfFile)

    const pdfDoc = await PDFDocument.load(dataBuffer)
    let image = undefined

    if (watermarkURL.includes('.png')) {
      image = await pdfDoc.embedPng(imageBytes)
    } else {
      image = await pdfDoc.embedJpg(imageBytes)
    }

    const imageHeight = 32
    const pages = pdfDoc.getPages()
    const numberOfPages = pages.length
    const imageDms = image.size()

    for (let i = startPage; i < numberOfPages; i++) {
      if (!skipPages.includes(i + 1)) {
        const page = pages[i]
        const { width, height } = page.getSize()

        await page.drawImage(image, {
          x: width - imageDms.width * (imageHeight / imageDms.height) - imageHeight / 2,
          y: height - imageHeight - imageHeight / 2,
          height: imageHeight,
          width: imageDms.width * (imageHeight / imageDms.height),
          opacity: 0.6,
          ...imageOption,
        })
      }
    }

    fs.writeFileSync(pdfFile, await pdfDoc.save())
  }
}

async function countPages(pdfFile: string): Promise<number> {
  const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfFile))
  const pages = pdfDoc.getPages()
  const numberOfPages = pages.length
  fs.unlinkSync(pdfFile)
  return numberOfPages
}

export async function getCurrentCount(html: string): Promise<number> {
  const tmpFile = `${os.tmpdir()}/${getRandomFileName()}.pdf`
  await convertHtmlToPdf(`<div class="container">${html}</div>`, tmpFile)
  return await countPages(tmpFile)
}

export async function getPDFPassword(appletId: string): Promise<string | null> {
  if (!appletId) {
    throw new Error('[getPDFPassword]: appletId is required')
  }

  const row = await getAppletKeys(appletId)
  return row ? row.key : null
}
