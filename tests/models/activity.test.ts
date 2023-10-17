import Activity from '../../src/models/activity'
import { IActivity, IActivityScoresAndReportsConditionalLogic as ConditionalLogic } from '../../src/core/interfaces'

const activity = new Activity({} as IActivity, [])

test('score report conditions', () => {
  const conditional: ConditionalLogic = {
    match: 'all',
    conditions: [
      {
        itemName: 'sumScore_postpartumdepression',
        type: 'BETWEEN',
        payload: {
          minValue: 5,
          maxValue: 10,
        },
      },
    ],
  }

  expect(activity.testVisibility(conditional, {})).toBeFalsy()
  expect(activity.testVisibility(conditional, { sumScore_postpartumdepression: 12 })).toBeFalsy()
  expect(activity.testVisibility(conditional, { sumScore_postpartumdepression: 8 })).toBeTruthy()
  expect(activity.testVisibility(conditional, { sumScore_postpartumdepression: 1 })).toBeFalsy()
})

test('section report conditions', () => {
  const conditions = [
    {
      itemName: 'Q1',
      type: 'EQUAL_TO_OPTION',
      payload: {
        optionValue: '4',
      },
    },
    {
      itemName: 'sumScore_postpartumdepression',
      type: 'GREATER_THAN',
      payload: {
        value: 0,
      },
    },
    {
      itemName: 'sumScore_postpartumdepression_high',
      type: 'EQUAL',
      payload: {
        value: 0,
      },
    },
  ]

  expect(activity.testVisibility({ conditions, match: 'any' } as ConditionalLogic, {})).toBeFalsy()
  expect(activity.testVisibility({ conditions, match: 'any' } as ConditionalLogic, { Q1: 4 })).toBeTruthy()
  expect(
    activity.testVisibility({ conditions, match: 'any' } as ConditionalLogic, { sumScore_postpartumdepression: 1 }),
  ).toBeTruthy()
  expect(
    activity.testVisibility({ conditions, match: 'any' } as ConditionalLogic, {
      sumScore_postpartumdepression_high: 0,
    }),
  ).toBeTruthy()

  expect(activity.testVisibility({ conditions, match: 'all' } as ConditionalLogic, {})).toBeFalsy()
  expect(activity.testVisibility({ conditions, match: 'all' } as ConditionalLogic, { Q1: 4 })).toBeFalsy()
  expect(
    activity.testVisibility({ conditions, match: 'all' } as ConditionalLogic, { sumScore_postpartumdepression: 1 }),
  ).toBeFalsy()
  expect(
    activity.testVisibility({ conditions, match: 'all' } as ConditionalLogic, {
      sumScore_postpartumdepression_high: 0,
    }),
  ).toBeFalsy()

  expect(
    activity.testVisibility({ conditions, match: 'all' } as ConditionalLogic, {
      Q1: 4,
      sumScore_postpartumdepression: 1,
      sumScore_postpartumdepression_high: 0,
    }),
  ).toBeTruthy()
})
