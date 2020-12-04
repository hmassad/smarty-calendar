import {nearestMinutes, nearestFutureMinutes, nearestPastMinutes, checkCollision} from './dateUtils';

it('finds nearestMinutes', () => {
  const testDate = new Date('2020-11-27T14:44:12.345-03:00');
  expect(nearestMinutes(testDate, 5).getTime()).toEqual(new Date('2020-11-27T14:45:00.000-03:00').getTime());
  expect(nearestMinutes(testDate, 15).getTime()).toEqual(new Date('2020-11-27T14:45:00.000-03:00').getTime());
  expect(nearestMinutes(testDate, 30).getTime()).toEqual(new Date('2020-11-27T14:30:00.000-03:00').getTime());
});

it('finds nearestFutureMinutes', () => {
  const testDate = new Date('2020-11-27T14:44:12.345-03:00');
  expect(nearestFutureMinutes(testDate, 5).getTime()).toEqual(new Date('2020-11-27T14:45:00.000-03:00').getTime());
});

it('finds nearestPastMinutes', () => {
  const testDate = new Date('2020-11-27T14:44:12.345-03:00');
  expect(nearestPastMinutes(testDate, 5).getTime()).toEqual(new Date('2020-11-27T14:40:00.000-03:00').getTime());
});

it('checks for collisions', () => {
  expect(checkCollision(
      new Date('2020-12-04T04:00:00Z'), new Date('2020-12-04T05:00:00Z'),
      new Date('2020-12-04T04:30:00Z'), new Date('2020-12-04T05:00:00Z'))
  ).toBe(true);
  expect(checkCollision(
      new Date('2020-12-04T04:00:00Z'), new Date('2020-12-04T05:00:00Z'),
      new Date('2020-12-04T04:00:00Z'), new Date('2020-12-04T06:00:00Z'))
  ).toBe(true);
  expect(checkCollision(
      new Date('2020-12-04T04:00:00Z'), new Date('2020-12-04T05:00:00Z'),
      new Date('2020-12-04T04:30:00Z'), new Date('2020-12-04T05:00:00Z'))
  ).toBe(true);
  expect(checkCollision(
      new Date('2020-12-04T04:00:00Z'), new Date('2020-12-04T06:00:00Z'),
      new Date('2020-12-04T04:30:00Z'), new Date('2020-12-04T05:00:00Z'))
  ).toBe(true);
  expect(checkCollision(
      new Date('2020-12-04T06:00:00Z'), new Date('2020-12-04T07:00:00Z'),
      new Date('2020-12-04T05:00:00Z'), new Date('2020-12-04T06:00:00Z'))
  ).toBe(false);
  expect(checkCollision(
      new Date('2020-12-04T04:00:00Z'), new Date('2020-12-04T05:00:00Z'),
      new Date('2020-12-04T05:00:00Z'), new Date('2020-12-04T06:00:00Z'))
  ).toBe(false);
});
