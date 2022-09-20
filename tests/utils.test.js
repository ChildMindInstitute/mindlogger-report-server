import {isFloat} from "../src/utils.js";

test('positive cases', () => {
    expect(isFloat('0')).toBeTruthy();
    expect(isFloat('0.00')).toBeTruthy();
    expect(isFloat(0)).toBeTruthy();
    expect(isFloat(0.00)).toBeTruthy();
    expect(isFloat('3.1')).toBeTruthy();
    expect(isFloat('3.10')).toBeTruthy();
    expect(isFloat(3.1)).toBeTruthy();
    expect(isFloat(3.10)).toBeTruthy();
    expect(isFloat(3.00)).toBeTruthy();
    expect(isFloat(3)).toBeTruthy();
});

test('negative cases', () => {
    expect(isFloat('')).toBeFalsy();
    expect(isFloat(undefined)).toBeFalsy();
    expect(isFloat(null)).toBeFalsy();
    expect(isFloat('a')).toBeFalsy();
    expect(isFloat(new Object(''))).toBeFalsy();
});
