 export interface IApplet {
    id: string;
     displayName: string;
     description: string;
     image: string;
     watermark: string;
     createdAt: string;

     activities: IActivity[];
     activityFlows: IActivityFlow[];

     encryption: IAppletEncryption;

     reportServerIp: string;
     reportPublicKey: string;
     reportRecipients: string[];
     reportIncludeUserId: boolean;
     reportIncludeCaseId: boolean;
     reportEmailBody: string;
 }

 export interface IAppletEncryption {
     accountId: string;
     base: string;
     prime: string;
     publicKey: string;
 }

export interface IActivity {
    createdAt: string;
    description: string;
    id: string;
    image: string;
    isHidden: boolean;
    isReviewable: boolean;
    isSkippable: boolean;
    name: string;
    order: number;
    responseIsEditable:boolean;
    scoresAndReports: IActivityScoresAndReports;
    showAllAtOnce: boolean;
    splashScreen: string;
    items: IActivityItem[]
}

export interface IActivityItem {
    id: string;
    name: string;
    isHidden: boolean;
    allowEdit: boolean;
    question: any;
    responseType: string;
    config: null|{
        removeBackButton?: boolean;
        skippableItem?: boolean;
        randomizeOptions?: boolean;
        timer?: number;
        addScores?: boolean;
        setAlerts?: boolean;
        addTooltip?: boolean;
        setPalette?: boolean;
        addTokens?: null;
    };
    responseValues: IActivityItemResponseValues;
    conditionalLogic: any;
}

export interface IActivityItemResponseValues {
    paletteName?: string;
    options?: IActivityItemOption[];
    minLabel?: string;
    maxLabel?: string;
    minValue?: number;
    maxValue?: number;
    minImage?: string;
    maxImage?: string;
    scores?: number[];
    alerts?: {value: number, alert: string, minValue?: number|null, maxValue?: number|null}[];
}

export interface IActivityItemOption {
    id: string;
    text: string;
    value: number;
    score: number;
    image: string|null;
    isHidden: boolean;
    color: string|null;
    alert: string|null;
    tooltip: string|null;
}

export interface IActivityScoresAndReports {
    generateReport: boolean;
    showScoreSummary: boolean;
    scores: IActivityScoresAndReportsScores[];
    sections: IActivityScoresAndReportsSections[];
}

export interface IActivityScoresAndReportsScores {
    id: string;
    name: string;
    calculationType: string;
    conditionalLogic: IActivityScoresAndReportsConditionalLogicExtra[];
    itemsPrint: string[];
    itemsScore: string[];
    message: string|null;
}

export interface IActivityScoresAndReportsSections {
    name: string;
    message: string;
    itemsPrint: string[];
    conditionalLogic: IActivityScoresAndReportsConditionalLogic;
}

export interface IActivityScoresAndReportsConditionalLogic {
    match: string;
    conditions: IActivityScoresAndReportsCondition[];
}

export interface IActivityScoresAndReportsConditionalLogicExtra extends IActivityScoresAndReportsConditionalLogic {
    id: string;
    name: string;
    flagScore: boolean;
    message: string;
    itemsPrint: string[];
}

export interface IActivityScoresAndReportsCondition {
    type: string;
    itemName: string;
    payload: any;
}

export interface IActivityFlow {
    id: string;
    items: {id: string, activityFlowId: string, activityId: string, order: number}[];
    name: string;
    createdAt: string;
    description: string;
    hideBadge: boolean;
    isHidden: boolean;
    isSingleReport: boolean;
    order: number;
}

export interface IUser {
    secretId: string;
    nickname: string;
    firstName: string|null;
    lastName: string|null;
}

export interface IResponse {
    activityId: string;
    data: IResponseItem[];
}

export interface IResponseItem {
    value: any;
}

export interface KVObject {
    [key: string]: any;
}

export interface ScoreForSummary {
    prefLabel: string;
    value: number;
    flagScore: boolean;
}

export interface SetPasswordRequestPayload {
    appletId: string;
    password: string;
}

export interface SetPasswordRequestEncryptedPayload {
    password: string;
    privateKey: string;
}

export interface SendPdfReportRequestPayload {
    responses: {activityId: string, answer: string}[];
    userPublicKey: string;
    now: string;
    user: IUser;
    applet: IApplet;
 }

export interface Email {
    body: string;
    subject: string;
    attachment: string;
    emailRecipients: string[];
}

export interface SendPdfReportResponse {
    pdf: string;
    email: Email;
}
