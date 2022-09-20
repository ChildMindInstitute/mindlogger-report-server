import Activity from "../../src/models/activity.js";

const a = new Activity({"reprolib:terms/allow": [{"@list": []}]}, [])

test('positive cases', () => {
    expect(a.testVisibility('Screen2.includes(1.1)', {Screen2: 1.1})).toBeTruthy();
    expect(a.testVisibility('Screen2.includes(1.1)', {Screen2: [1.1]})).toBeTruthy();
    expect(a.testVisibility('averageScore_avarage == 0.0', {averageScore_avarage: "0.00"})).toBeTruthy();
    expect(a.testVisibility('averageScore_avarage == 0', {averageScore_avarage: "0.00"})).toBeTruthy();
    expect(a.testVisibility('averageScore_avarage == 0', {averageScore_avarage: "0"})).toBeTruthy();
    expect(a.testVisibility('averageScore_avarage == 0.0', {averageScore_avarage: 0.00})).toBeTruthy();
    expect(a.testVisibility('averageScore_avarage == 3.1', {averageScore_avarage: "3.1"})).toBeTruthy();
    expect(a.testVisibility('averageScore_avarage == 3.10', {averageScore_avarage: "3.10"})).toBeTruthy();
    expect(a.testVisibility('averageScore_avarage == 3.1', {averageScore_avarage: 3.10})).toBeTruthy();
});

test('negative cases', () => {
    expect(a.testVisibility('Screen2.includes(0)', {Screen2: 1.1})).toBeFalsy();
    expect(a.testVisibility('Screen2.includes([])', {Screen2: 1.1})).toBeFalsy();
    expect(a.testVisibility('Screen2.includes(1.1)', {Screen2: []})).toBeFalsy();
    expect(a.testVisibility('Screen2.includes(0)', {Screen2: 1.1})).toBeFalsy();
});
