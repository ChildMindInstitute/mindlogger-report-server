import { ItemEntity } from '../../../models'
import { Map, User } from '../../interfaces'
import { MarkdownVariableReplacer } from './MarkdownVariableReplacer'

type Params = {
  markdown: string | null
  user: User
  scores: Map
  items: ItemEntity[]
}

export function replaceVariablesInMarkdown({ user, markdown, items, scores }: Params): string {
  if (!markdown) {
    return ""
  }

  const nickname = !!user.nickname ? user.nickname : `${user.firstName} ${user.lastName}`.trim()

  const completedEntityTime = new Date() // TODO: replace it with the actual time of completion

  const replacer = new MarkdownVariableReplacer(items, scores, completedEntityTime, nickname)
  return replacer.process(markdown)
}
