import markdownIt from 'markdown-it';

import emoji from 'markdown-it-emoji';
import footnote from 'markdown-it-footnote';
import container from 'markdown-it-container';
// @ts-ignore
import sub from 'markdown-it-sub';
// @ts-ignore
import sup from 'markdown-it-sup';
// @ts-ignore
import deflist from 'markdown-it-deflist';
// @ts-ignore
import abbr from 'markdown-it-abbr';
// @ts-ignore
import insert from 'markdown-it-ins';
// @ts-ignore
import mark from 'markdown-it-mark';
// @ts-ignore
import taskLists from 'markdown-it-task-lists';
// @ts-ignore
import miip from 'markdown-it-images-preview';
// @ts-ignore
import html5Embed from 'markdown-it-html5-embed';
// @ts-ignore
import markdownItImSize from 'markdown-it-imsize';


const md = markdownIt({
  html: true,        // Enable HTML tags in source
  xhtmlOut: true,        // Use '/' to close single tags (<br />).
  breaks: true,        // Convert '\n' in paragraphs into <br>
  langPrefix: 'lang-',  // CSS language prefix for fenced blocks. Can be
  linkify: false,
  typographer: true,
  quotes: '“”‘’'
});

md.use(emoji)
    .use(taskLists)
    .use(sup)
    .use(sub)
    .use(container)
    .use(container, 'hljs-left') /* align left */
    .use(container, 'hljs-center')/* align center */
    .use(container, 'hljs-right')/* align right */
    .use(deflist)
    .use(abbr)
    .use(footnote)
    .use(insert)
    .use(mark)
    .use(container)
    .use(miip)
    .use(html5Embed, {
      html5embed: {
        useImageSyntax: true
      }
    }).use(markdownItImSize)

const convertMarkdownToHtml = (markdown: string, addPageBreak: boolean = false): string => {
  const html = md.render(markdown);
  if(addPageBreak){
    return `<div style="page-break-before: always">${html}</div>`;
  }
  return html;
}

export default convertMarkdownToHtml;
