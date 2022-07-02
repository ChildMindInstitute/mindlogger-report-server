import pdf from 'html-pdf';
import HummusRecipe from 'hummus-recipe';

const options = {
  format: process.env.PDF_PAGE_FORMAT
}

export const convertHtmlToPdf = (html, filename) =>
  new Promise((resolve, reject) => {
    pdf.create(html, options).toFile(filename, (err, res) => {
      if (err) {
        reject();
      } else {
        resolve();
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
