import Activity from "../../src/models/activity";
import {
    IActivity,
    IActivityScoresAndReportsConditionalLogic as ConditionalLogic,
    IActivityScoresAndReportsScores
} from "../../src/interfaces";

const activity = new Activity({} as IActivity, [])

test('score report conditions', () => {
    let conditional: ConditionalLogic = {
        "name": "high",
        "id": "sumScore_postpartumdepression_high",
        "flagScore": false,
        "showMessage": true,
        "message": "test",
        "printItems": false,
        "itemsPrint": [],
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
    conditional = activity.patchConditionalInScoreReport(conditional, {id: 'sumScore_postpartumdepression'} as IActivityScoresAndReportsScores);

    expect(activity.testVisibility(conditional, {})).toBeFalsy();
    expect(activity.testVisibility(conditional, {"sumScore_postpartumdepression": 12})).toBeFalsy();
    expect(activity.testVisibility(conditional, {"sumScore_postpartumdepression": 8})).toBeTruthy();
    expect(activity.testVisibility(conditional, {"sumScore_postpartumdepression": 1})).toBeFalsy();
});

test('section report conditions', () => {
    const conditions = [
        {
            "itemName": "5e90d62b-65b8-4567-b259-2214d74a50e0",
            "type": "EQUAL_TO_OPTION",
            "payload": {
                "optionId": "f96456d7-f731-4a33-b5af-ca73236fb65b"
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
    expect(activity.testVisibility({conditions, match: 'any'} as ConditionalLogic, {"5e90d62b-65b8-4567-b259-2214d74a50e0": 'f96456d7-f731-4a33-b5af-ca73236fb65b'})).toBeTruthy();
    expect(activity.testVisibility({conditions, match: 'any'} as ConditionalLogic, {"sumScore_postpartumdepression": 1})).toBeTruthy();
    expect(activity.testVisibility({conditions, match: 'any'} as ConditionalLogic, {"sumScore_postpartumdepression_high": 0})).toBeTruthy();

    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {})).toBeFalsy();
    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"5e90d62b-65b8-4567-b259-2214d74a50e0": 'f96456d7-f731-4a33-b5af-ca73236fb65b'})).toBeFalsy();
    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"sumScore_postpartumdepression": 1})).toBeFalsy();
    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"sumScore_postpartumdepression_high": 0})).toBeFalsy();

    expect(activity.testVisibility({conditions, match: 'all'} as ConditionalLogic, {"5e90d62b-65b8-4567-b259-2214d74a50e0": 'f96456d7-f731-4a33-b5af-ca73236fb65b', "sumScore_postpartumdepression": 1, "sumScore_postpartumdepression_high": 0})).toBeTruthy();
});
