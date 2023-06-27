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
    order: number;
    question: any;
    responseType: string;
    config: any;
    responseValues: IActivityItemResponseValues;
    conditionalLogic: any;
}

export interface IActivityItemResponseValues {
    paletteName: string;
    options: IActivityItemOption[];
}

export interface IActivityItemOption {
    id: string;
    text: string;
    value: number;
    score: number;
    image: string;
    isHidden: boolean;
    color: string;
    alert: string;
    tooltip: string;
}

export interface IActivityScoresAndReports {
    generateReport: boolean;
    showScoreSummary: boolean;
    scores: IActivityScoresAndReportsScores[];
    sections: IActivityScoresAndReportsSections[];
}

export interface IActivityScoresAndReportsScores {
    id: string;
    calculationType: string;
    conditionalLogic: IActivityScoresAndReportsConditionalLogic[];
    itemsPrint: string[];
    itemsScore: string[];
    maxScore: number;
    message: string;
    minScore: number;
    name: string;
    printItems: boolean;
    showMessage: boolean;
}

export interface IActivityScoresAndReportsSections {
    name: string;
    message: string;
    printItems: boolean;
    showMessage: boolean;
    itemsPrint: string[];
    conditionalLogic: IActivityScoresAndReportsConditionalLogic;
}

export interface IActivityScoresAndReportsConditionalLogic {
    id: string;
    itemsPrint: string[];
    match: string;
    message: string;
    name: string;
    printItems: boolean;
    showMessage: boolean;
    flagScore: boolean;
    conditions: IActivityScoresAndReportsCondition[];
}

export interface IActivityScoresAndReportsCondition {
    type: string;
    itemName: string;
    payload: any;
}

export interface IActivityFlow {
    id: string;
    activityIds: string[];
    name: string;
    createdAt: string;
    description: string;
    hideBadge: boolean;
    isHidden: boolean;
    isSingleReport: boolean;
    order: number;
}

export interface IUser {
    MRN: string;
    email: string;
    firstName: string;
    lastName: string;
    nickName: string;
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
