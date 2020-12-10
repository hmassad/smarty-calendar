import {checkCollision} from './dateUtils';

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
