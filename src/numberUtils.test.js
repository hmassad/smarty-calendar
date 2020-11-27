import { nearestNumber } from './numberUtils';

it('finds nearestNumber', () => {
  expect(nearestNumber(2, 5)).toEqual(0);
  expect(nearestNumber(3, 5)).toEqual(5);
  expect(nearestNumber(5, 5)).toEqual(5);
  expect(nearestNumber(14, 30)).toEqual(0);
  expect(nearestNumber(15, 30)).toEqual(30);
  expect(nearestNumber(29, 30)).toEqual(30);
  expect(nearestNumber(30, 30)).toEqual(30);
  expect(nearestNumber(31, 30)).toEqual(30);
  expect(nearestNumber(60, 30)).toEqual(60);
  expect(nearestNumber(59, 30)).toEqual(60);
  expect(nearestNumber(61, 30)).toEqual(60);
});
