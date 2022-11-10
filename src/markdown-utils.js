import markdownIt from 'markdown-it';

import emoji from 'markdown-it-emoji';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import deflist from 'markdown-it-deflist';
import abbr from 'markdown-it-abbr';
import footnote from 'markdown-it-footnote';
import insert from 'markdown-it-ins';
import mark from 'markdown-it-mark';
import taskLists from 'markdown-it-task-lists';
import container from 'markdown-it-container';
import miip from 'markdown-it-images-preview';
import html5Embed from 'markdown-it-html5-embed';
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

const convertMarkdownToHtml = (markdown, splashPage, skipPages) => {
  const html = md.render(markdown);
  if(splashPage=='' && skipPages.length==0){
    return `<div style="page-break-before: always}">${html}</div>`;

  } else {
    return html;
  }
}

export default convertMarkdownToHtml;
