import { ItemEntity } from '../../src/models'
import { IActivityItem } from '../../src/core/interfaces'

test('slider alert', () => {
  const item = new ItemEntity({
    responseType: 'slider',
    responseValues: {
      alerts: [{ value: 0, minValue: null, maxValue: null, alert: 'test-slider0' }],
    },
    config: { setAlerts: true, continuousSlider: false },
    name: 'slider_item',
  } as IActivityItem)

  expect(item.getAlerts({ value: 0 })).toStrictEqual(['test-slider0'])
  expect(item.getAlerts({ value: 1 })).toStrictEqual([])
})

test('continuous slider alert', () => {
  const item = new ItemEntity({
    responseType: 'slider',
    responseValues: {
      alerts: [{ value: 0, minValue: 1, maxValue: 5, alert: 'test-slider0' }],
    },
    config: { setAlerts: true, continuousSlider: true },
    name: 'slider_item',
  } as IActivityItem)

  expect(item.getAlerts({ value: 3.5 })).toStrictEqual(['test-slider0'])
  expect(item.getAlerts({ value: 0.5 })).toStrictEqual([])
})

test('singleSelect alert', () => {
  const item = new ItemEntity({
    responseType: 'singleSelect',
    responseValues: {
      options: [
        {
          id: '6ea9df90-6976-4912-b497-08d00a2e6ef8',
          text: 'As much as I always could',
          alert: 'ALERT Q1 As much as I always could!',
          value: 1,
        },
        {
          id: 'b1726b6b-fb5b-4ab3-bccf-70bfa96622f7',
          text: 'Not quite so much now',
          alert: null,
          value: 2,
        },
      ],
    },
    config: { setAlerts: true },
    name: 'select_item',
  } as IActivityItem)

  expect(item.getAlerts({ value: 1 })).toStrictEqual(['ALERT Q1 As much as I always could!'])
  expect(item.getAlerts({ value: 2 })).toStrictEqual([])
  expect(item.getAlerts({ value: 3 })).toStrictEqual([])
})

test('text no alert', () => {
  const item = new ItemEntity({
    responseType: 'text',
    config: { setAlerts: false },
    name: 'text_item',
  } as IActivityItem)

  expect(item.getAlerts({ value: 'test' })).toStrictEqual([])
})

test('singleSelectRows alert', () => {
  const item = new ItemEntity({
    responseType: 'singleSelectRows',
    responseValues: {
      options: [
        {
          id: 'c32fae96-4849-4d54-a92d-8447027a3c22',
          text: 'o1',
          image: null,
          tooltip: null,
        },
        {
          id: '85349154-9377-4eb3-a78f-7d9fd40cc5fa',
          text: 'o2',
          image: null,
          tooltip: null,
        },
      ],
      dataMatrix: [
        {
          rowId: '7f7837fb-9a4a-4a3a-ae54-6f00e98699dd',
          options: [
            {
              optionId: 'c32fae96-4849-4d54-a92d-8447027a3c22',
              score: 1,
              alert: 'sspr: option1 row1',
              value: 0,
            },
            {
              optionId: '85349154-9377-4eb3-a78f-7d9fd40cc5fa',
              score: 2,
              alert: null,
              value: 1,
            },
          ],
        },
        {
          rowId: 'ebf0cd73-e5e9-48cc-85d1-c63ec9a43ca7',
          options: [
            {
              optionId: 'c32fae96-4849-4d54-a92d-8447027a3c22',
              score: 3,
              alert: null,
              value: 0,
            },
            {
              optionId: '85349154-9377-4eb3-a78f-7d9fd40cc5fa',
              score: 4,
              alert: null,
              value: 1,
            },
          ],
        },
      ],
    },
    config: { setAlerts: true },
    name: 'sspr',
  } as IActivityItem)

  expect(item.getAlerts({ value: ['o1', null] })).toStrictEqual(['sspr: option1 row1'])
  expect(item.getAlerts({ value: [null, 'o1'] })).toStrictEqual([])
  expect(item.getAlerts({ value: [null, null] })).toStrictEqual([])
})

test('multiSelectRows alert', () => {
  const item = new ItemEntity({
    responseType: 'multiSelectRows',
    responseValues: {
      options: [
        {
          id: 'ecfd7feb-8973-42bd-8a5e-b96c82cab0e3',
          text: 'o1',
          image: null,
          tooltip: null,
        },
        {
          id: 'ab856421-dba7-40c7-85ef-537c5f27309c',
          text: 'o2',
          image: null,
          tooltip: null,
        },
      ],
      dataMatrix: [
        {
          rowId: 'a316ba20-07d2-4067-ac4d-f80c0d7fe076',
          options: [
            {
              optionId: 'ecfd7feb-8973-42bd-8a5e-b96c82cab0e3',
              score: 1,
              alert: 'mspr: o1 r1 selected',
              value: 0,
            },
            {
              optionId: 'ab856421-dba7-40c7-85ef-537c5f27309c',
              score: 2,
              alert: null,
              value: 1,
            },
          ],
        },
        {
          rowId: 'd62ea4b5-da1a-4728-a676-cfc35f0ff4db',
          options: [
            {
              optionId: 'ecfd7feb-8973-42bd-8a5e-b96c82cab0e3',
              score: 3,
              alert: 'mspr: o1 r2 selected',
              value: 0,
            },
            {
              optionId: 'ab856421-dba7-40c7-85ef-537c5f27309c',
              score: 4,
              alert: null,
              value: 1,
            },
          ],
        },
      ],
    },
    config: { setAlerts: true },
    name: 'mspr',
  } as IActivityItem)

  expect(item.getAlerts({ value: [['o1', 'o2'], null] })).toStrictEqual(['mspr: o1 r1 selected'])
  expect(item.getAlerts({ value: [null, ['o1', 'o2']] })).toStrictEqual(['mspr: o1 r2 selected'])
  expect(item.getAlerts({ value: [['o1'], ['o1']] })).toStrictEqual(['mspr: o1 r1 selected', 'mspr: o1 r2 selected'])
  expect(item.getAlerts({ value: [['o2'], ['o2']] })).toStrictEqual([])
  expect(item.getAlerts({ value: [null, null] })).toStrictEqual([])
})
