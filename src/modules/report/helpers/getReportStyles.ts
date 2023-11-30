import fs from 'fs'

export function getReportStyles(): string {
  const pdfStyles = fs.readFileSync('src/static/pdf-styles.css')
  return `<style>${pdfStyles.toString()}</style>`
}
