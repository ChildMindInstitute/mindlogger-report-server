import pdf from 'html-pdf';
import HummusRecipe from 'hummus-recipe';

const options = {
  width: '8.5in',
  height: '11in',
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
