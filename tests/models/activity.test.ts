import { ActivityEntity } from '../../src/models'
import {
  IActivity,
  IActivityScoresAndReportsConditionalLogic as ConditionalLogic,
  Score,
  Map,
} from '../../src/core/interfaces'
import mockActivityJson from '../fixtures/activity.json'

test('scoring skipped answers', () => {
  let result: { scores: Map<Score>; conditionalVisibility: Map<boolean> }
  const mockActivity = mockActivityJson as unknown as IActivity

  const legacyActivity = new ActivityEntity(mockActivity, mockActivity.items, true)

  // Legacy behaviour treats skipped answers as 0
  // When all answers are skipped, calculations use 0 for both regular and subscale scores
  result = legacyActivity.evaluateScores([{ value: null }, { value: null }])
  expect(result.scores).toEqual({
    'item-1': 0,
    'item-2': 0,
    sumScore_regular_scores_sum: 0,
    sumScore_subscale_scores_sum: 10,
    sumScore_regular_scores_another_sum_score: 0,
  })

  // When null is included in calculation, it is treated as 0
  result = legacyActivity.evaluateScores([{ value: null }, { value: 0 }])
  expect(result.scores).toEqual({
    'item-1': 0,
    'item-2': 0,
    sumScore_regular_scores_sum: 0,
    sumScore_subscale_scores_sum: 10,
    sumScore_regular_scores_another_sum_score: 0,
  })

  const activity = new ActivityEntity(mockActivity, mockActivity.items, false)

  // New behaviour treats skipped answers as null
  // When all answers are skipped, calculations use null for both regular and subscale scores
  result = activity.evaluateScores([{ value: null }, { value: null }])
  expect(result.scores).toEqual({
    'item-1': null,
    'item-2': null,
    sumScore_regular_scores_sum: null,
    sumScore_subscale_scores_sum: null,
    sumScore_regular_scores_another_sum_score: null,
  })
})

describe('report conditions', () => {
  const activity = new ActivityEntity({} as IActivity, [], false)

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
})
