import fs from 'fs';

import Activity from "../../src/models/activity";
import {
    IActivity, IActivityItem,
    IActivityScoresAndReportsConditionalLogic as ConditionalLogic,
    IActivityScoresAndReportsScores
} from "../../src/interfaces";
import {patchConditionalInScoreReport} from "../../src/report-utils";

const activity = new Activity({} as IActivity, [])

test('score report conditions', () => {
    const conditional: ConditionalLogic = {
        "match": "all",
        "conditions": [
            {
                "itemName": "sumScore_postpartumdepression",
                "type": "BETWEEN",
                "payload": {
                    "minValue": 5,
                    "maxValue": 10
                }
            }
        ]
    };
    // conditional = patchConditionalInScoreReport(conditional, {id: 'sumScore_postpartumdepression'} as IActivityScoresAndReportsScores);

    expect(activity.testVisibility(conditional, {})).toBeFalsy();
    expect(activity.testVisibility(conditional, {"sumScore_postpartumdepression": 12})).toBeFalsy();
    expect(activity.testVisibility(conditional, {"sumScore_postpartumdepression": 8})).toBeTruthy();
    expect(activity.testVisibility(conditional, {"sumScore_postpartumdepression": 1})).toBeFalsy();
});

test('section report conditions', () => {
    const conditions = [
        {
            "itemName": "Q1",
            "type": "EQUAL_TO_OPTION",
            "payload": {
                "optionValue": "4"
            }
        },
        {
            "itemName": "sumScore_postpartumdepression",
            "type": "GREATER_THAN",
            "payload": {
                "value": 0
            }
        },
        {
            "itemName": "sumScore_postpartumdepression_high",
            "type": "EQUAL",
            "payload": {
                "value": 0
            }
        }
    ];

    expect(activity.testVisibility({conditions, match: 'any'} as ConditionalLogic, {})).toBeFalsy();
    expect(activity.testVisibility({conditions, match: 'any'} as ConditionalLogic, {"Q1": 4})).toBeTruthy();
    expect(activity.testVisibility({conditions, match: 'any'} as ConditionalLogic, {"sumScore_postpartumdepression": 1})).toBeTruthy();
    expect(activity.testVisibility({conditions, match: 'any'} as ConditionalLogic, {"sumScore_postpartumdepression_high": 0})).toBeTruthy();

    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {})).toBeFalsy();
    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"Q1": 4})).toBeFalsy();
    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"sumScore_postpartumdepression": 1})).toBeFalsy();
    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"sumScore_postpartumdepression_high": 0})).toBeFalsy();

    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"Q1": 4, "sumScore_postpartumdepression": 1, "sumScore_postpartumdepression_high": 0})).toBeTruthy();
});

// test('evaluateScores', () => {
//     // const activity = JSON.parse(fs.readFileSync(__dirname+'/../fixtures/activity.json').toString()) as IActivity;
//     const activity = new Activity({} as IActivity, [getMultiSelectItem('Q1'), getMultiSelectItem('Q2')])
//
//     const responses = [
//         {
//             "value": 2
//         },
//         {
//             "value": 3
//         }
//     ];
//     activity.evaluateScores(responses)
// });


function getMultiSelectItem(name: string): IActivityItem {
    return {
        "question": `${name}?`,
        "responseType": "multiSelect",
        "responseValues": {
            "options": [
                {
                    "id": "f96456d7-f731-4a33-b5af-ca73236fb65b",
                    "text": "As much as I always could",
                    "image": null,
                    "score": 0,
                    "tooltip": null,
                    "isHidden": false,
                    "color": null,
                    "alert": null,
                    "value": 1
                },
                {
                    "id": "fcf084e8-e256-4ba5-9e4a-03fddc22e173",
                    "text": "Not quite so much now",
                    "image": null,
                    "score": 1,
                    "tooltip": null,
                    "isHidden": false,
                    "color": null,
                    "alert": null,
                    "value": 2
                },
                {
                    "id": "5467b47a-dc65-4a95-b1df-c183b45048fb",
                    "text": "Definitely not so much now",
                    "image": null,
                    "score": 2,
                    "tooltip": null,
                    "isHidden": false,
                    "color": null,
                    "alert": null,
                    "value": 3
                },
                {
                    "id": "b2cf2a68-56f8-4da3-b7df-d03ed8409993",
                    "text": "Not at all",
                    "image": null,
                    "score": 3,
                    "tooltip": null,
                    "isHidden": false,
                    "color": null,
                    "alert": null,
                    "value": 4
                }
            ]
        },
        "config": {
            "removeBackButton": false,
            "skippableItem": false,
            "randomizeOptions": false,
            "timer": 0,
            "addScores": true,
            "setAlerts": false,
            "addTooltip": false,
            "setPalette": false,
            "addTokens": null,
        },
        "name": name,
        "isHidden": false,
        "conditionalLogic": null,
        "allowEdit": true,
        "id": "5e90d62b-65b8-4567-b259-2214d74a50e0"
    }
}
