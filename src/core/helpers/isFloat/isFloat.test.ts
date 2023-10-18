import { isFloat } from './index'

test('isFloat positive cases', () => {
  expect(isFloat('0')).toBeTruthy()
  expect(isFloat('0.00')).toBeTruthy()
  expect(isFloat(0)).toBeTruthy()
  expect(isFloat(0.0)).toBeTruthy()
  expect(isFloat('3.1')).toBeTruthy()
  expect(isFloat('3.10')).toBeTruthy()
  expect(isFloat(3.1)).toBeTruthy()
  expect(isFloat(3.1)).toBeTruthy()
  expect(isFloat(3.0)).toBeTruthy()
  expect(isFloat(3)).toBeTruthy()
})

test('isFloat negative cases', () => {
  expect(isFloat('')).toBeFalsy()
  expect(isFloat(undefined)).toBeFalsy()
  expect(isFloat(null)).toBeFalsy()
  expect(isFloat('a')).toBeFalsy()
  expect(isFloat(new Object(''))).toBeFalsy()
})
