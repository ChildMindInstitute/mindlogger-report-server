import pdf from 'html-pdf';
import HummusRecipe from 'hummus-recipe';
import {PDFDocument} from 'pdf-lib';
import fs from 'fs';
import fetch from 'node-fetch';

const options = {
  width: '8.5in',
  height: '11in',
  border: {
    top: '0.5in',
    bottom: '0.5in',
    left: '0.7in',
    right: '0.7in',
  }
}

export const convertHtmlToPdf = (html, filename) =>
  new Promise((resolve, reject) => {
    pdf.create(html, options).toFile(filename, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    })
  })

export const encryptPDF = (path, password) =>
  new Promise((resolve) => {
    const pdfDoc = new HummusRecipe(path, path);

    pdfDoc.encrypt({
      userPassword: password,
      ownerPassword: password,
      userProtectionFlag: 4
    })
    .endPDF(() => {
      resolve();
    })
  })

export async function watermarkPDF(pdfFile, watermarkURL, startPage, skipPages) {
  if(watermarkURL!=''){
    const imageOption = {}
    const imageBytes = await fetch(watermarkURL).then(res => res.arrayBuffer())
    const dataBuffer = fs.readFileSync(pdfFile)
    
    
    const pdfDoc = await PDFDocument.load(dataBuffer)
    let image = undefined

    if (watermarkURL.includes('.png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const imageHeight = 32;
    const pages = pdfDoc.getPages()
    const numberOfPages = pages.length;
    const imageDms = image.size()
    
    for (let i = startPage; i < numberOfPages; i++) {
      if (!skipPages.includes(i+1)){
        const page = pages[i];
        const { width, height } = page.getSize();
        
        await page.drawImage(image, {
          x: width - (imageDms.width*(imageHeight/imageDms.height)) - imageHeight/2, 
          y: height  - (imageHeight) - imageHeight/2,
          height: imageHeight,
          width: (imageDms.width*(imageHeight/imageDms.height)),
          opacity: 0.6,
          ...imageOption,
        });
      }
    }
    
    fs.writeFileSync(pdfFile, await pdfDoc.save());
  }
}

async function countPages(pdfFile) {
  const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfFile));
  const pages = pdfDoc.getPages();
  const numberOfPages = pages.length;
  fs.unlinkSync(pdfFile);
  return numberOfPages;
}

export async function getCurrentCount(html){
  const tmpFile = `tmp/tmp.pdf`
  await convertHtmlToPdf(
    `<div class="container">${html}</div>`,
    tmpFile
  );
  const count = await countPages(tmpFile);
  return count;
}
