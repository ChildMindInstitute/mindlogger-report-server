import Item from "../../src/models/item";
import {IActivityItem} from "../../src/interfaces";


test('slider alert', () => {

    const item = new Item({
        "responseType": "slider",
        "responseValues": {
            "alerts": [{"value": 0, "alert": "test-slider0"}]
        },
        "config": {"setAlerts": true},
        "name": "slider_item"
    } as IActivityItem);

    expect(item.getAlerts({value: 0})).toStrictEqual(['test-slider0']);
    expect(item.getAlerts({value: 1})).toStrictEqual([]);
});

test('singleSelect alert', () => {

    const item = new Item({
        "responseType": "singleSelect",
        "responseValues": {
            options: [
                {
                    "id": "6ea9df90-6976-4912-b497-08d00a2e6ef8",
                    "text": "As much as I always could",
                    "alert": "ALERT Q1 As much as I always could!",
                    "value": 1
                },
                {
                    "id": "b1726b6b-fb5b-4ab3-bccf-70bfa96622f7",
                    "text": "Not quite so much now",
                    "alert": null,
                    "value": 2
                },
            ]
        },
        "config": {"setAlerts": true},
        "name": "select_item"
    } as IActivityItem);

    expect(item.getAlerts({value: 1})).toStrictEqual(['ALERT Q1 As much as I always could!']);
    expect(item.getAlerts({value: 2})).toStrictEqual([]);
    expect(item.getAlerts({value: 3})).toStrictEqual([]);
});

test('text no alert', () => {

    const item = new Item({
        "responseType": "text",
        "config": {"setAlerts": false},
        "name": "text_item"
    } as IActivityItem);

    expect(item.getAlerts({value: 'test'})).toStrictEqual([]);
});
