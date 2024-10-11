export interface Applet {
  id: string // Need it
  displayName: string
  description: string
  image: string
  watermark: string
  createdAt: string

  activities: IActivity[]
  activityFlows: IActivityFlow[]

  encryption: IAppletEncryption // Need it

  reportServerIp: string
  reportPublicKey: string
  reportRecipients: string[]
  reportIncludeUserId: boolean
  reportIncludeCaseId: boolean
  reportEmailBody: string
}

export interface IAppletEncryption {
  accountId: string
  base: string
  prime: string
  publicKey: string
}

export interface IActivity {
  createdAt: string
  description: string
  id: string
  image: string
  isHidden: boolean
  isReviewable: boolean
  isSkippable: boolean
  name: string
  order: number
  reportIncludedItemName: string
  responseIsEditable: boolean
  scoresAndReports: IActivityScoresAndReports
  subscaleSetting: ActivitySubscalesSetting
  showAllAtOnce: boolean
  splashScreen: string
  items: IActivityItem[]
}

export interface IActivityItem {
  id: string
  name: string
  isHidden: boolean
  allowEdit: boolean
  question: any
  responseType: string
  config: null | {
    removeBackButton?: boolean
    skippableItem?: boolean
    randomizeOptions?: boolean
    timer?: number
    addScores?: boolean
    setAlerts?: boolean
    continuousSlider?: boolean
    addTooltip?: boolean
    setPalette?: boolean
    addTokens?: null
  }
  responseValues: IActivityItemResponseValues
  conditionalLogic: any
}

export interface IActivityItemResponseValues {
  paletteName?: string
  options?: IActivityItemOption[]
  dataMatrix?: IDataMatrixRow[]
  rows?: IDataMatrixSliderRow[]
  minLabel?: string
  maxLabel?: string
  minValue: number
  maxValue: number
  minImage?: string
  maxImage?: string
  scores?: number[]
  alerts?: { value: number; alert: string; minValue?: number | null; maxValue?: number | null }[]
}

export type IDataMatrixSliderRow = {
  id: string
  label: string
  maxImage: string | null
  maxLabel: string | null
  maxValue: number
  minImage: string | null
  minLabel: string | null
  minValue: number
  scores: number[] | null
  alerts: Array<{
    value: number
    alert: string
    minValue?: number | null
    maxValue?: number | null
  }>
}

export interface IActivityItemOption {
  id: string
  text: string
  value: number
  score: number
  image: string | null
  isHidden: boolean
  color: string | null
  alert: string | null
  tooltip: string | null
}

export interface IDataMatrixRow {
  rowId: string
  options: IDataMatrixOption[]
}

export interface IDataMatrixOption {
  optionId: string
  value: number
  score: number | null
  alert: string | null
}

export interface IActivityScoresAndReports {
  generateReport: boolean
  showScoreSummary: boolean
  reports: IActivityScoresAndReportsScores[] | IActivityScoresAndReportsSections[]
}

export enum ScoringType {
  score = 'score',
  raw_score = 'raw_score',
}

export interface IActivityScoresAndReportsScores {
  type: 'score'
  id: string
  name: string
  calculationType: string
  conditionalLogic: IActivityScoresAndReportsConditionalLogicExtra[]
  itemsPrint: string[]
  itemsScore: string[]
  message: string | null
  scoringType: ScoringType | null
  subscaleName: string | null
}

export interface IActivityScoresAndReportsSections {
  type: 'section'
  name: string
  message: string
  itemsPrint: string[]
  conditionalLogic: IActivityScoresAndReportsConditionalLogic
}

export interface IActivityScoresAndReportsConditionalLogic {
  match: string
  conditions: IActivityScoresAndReportsCondition[]
}

export interface IActivityScoresAndReportsConditionalLogicExtra extends IActivityScoresAndReportsConditionalLogic {
  id: string
  name: string
  flagScore: boolean
  message: string
  itemsPrint: string[]
}

export interface IActivityScoresAndReportsCondition {
  type: string
  itemName: string
  payload: any
}

export interface IActivityFlow {
  id: string
  items: { id: string; activityFlowId: string; activityId: string; order: number }[]
  name: string
  createdAt: string
  description: string
  hideBadge: boolean
  isHidden: boolean
  isSingleReport: boolean
  order: number
  reportIncludedActivityName: string
  reportIncludedItemName: string
}

export interface User {
  secretId: string
  nickname: string
  firstName: string | null
  lastName: string | null
}

export type ActivityResponse = {
  activityId: string
  data: ResponseItem[]
}

export type ResponseItem = {
  value: any
  text?: string
}

export type Map = {
  [key: string]: any
}

export interface ScoreForSummary {
  prefLabel: string
  value: number
  flagScore: boolean
}

export interface SetPasswordRequestEncryptedPayload {
  password: string
  privateKey: string
}

export interface Email {
  body: string
  subject: string
  attachment: string
  emailRecipients: string[]
}

export interface SendPdfReportResponse {
  pdf: string
  email: Email
}

export const TScoreSeverity = ['Minimal', 'Mild', 'Moderate', 'Severe'] as const

export type TScoreSeverity = (typeof TScoreSeverity)[number]

export type LookupTableDataItem = {
  score?: string
  rawScore: string
  optionalText: string
  severity: TScoreSeverity | null
  age?: string | number | null
  sex?: string | null
  id: string
}

export type Subscale = {
  name: string
  subscaleTableData?: LookupTableDataItem[] | null
}

export type ActivitySubscalesSetting = {
  subscales: Subscale[]
}
