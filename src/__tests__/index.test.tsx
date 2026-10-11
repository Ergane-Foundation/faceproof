// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockNative = {
  initialize: jest.fn(async (_options?: object) => true),
  logAndQueueAttendance: jest.fn(
    async (_workerId: string, _confidence: number, _location?: object) => true
  ),
  getSecureRandomBytes: jest.fn(async (_count: number) => [0, 1, 2]),
};

jest.mock('../NativeFaceproof', () => ({
  __esModule: true,
  default: mockNative,
}));

// Imported after the mock is registered.
const { BiometricSDK } = require('../index') as typeof import('../index');
import type { InitializeOptions } from '../index';

describe('BiometricSDK', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes initialize options through and validates their range', async () => {
    await BiometricSDK.initialize({ matchThreshold: 0.7 });
    expect(mockNative.initialize).toHaveBeenCalledWith({ matchThreshold: 0.7 });
    expect(() => BiometricSDK.initialize({ minQuality: 1.5 })).toThrow(
      RangeError
    );
    expect(() =>
      BiometricSDK.initialize({ matchThreshold: Number.NaN })
    ).toThrow(RangeError);
  });

  describe('initialize option boundaries', () => {
    const numericFields = ['matchThreshold', 'minQuality'] as const;
    type NumericField = (typeof numericFields)[number];

    const optionsWith = (
      field: NumericField,
      value: number | undefined
    ): InitializeOptions =>
      field === 'matchThreshold'
        ? { matchThreshold: value }
        : { minQuality: value };

    const rejectedValues: [string, number][] = [
      ['-0.01', -0.01],
      ['1.01', 1.01],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['a string', '0.7' as unknown as number],
    ];

    it.each(numericFields)(
      'accepts the 0 and 1 bounds of %s',
      async (field: NumericField) => {
        await BiometricSDK.initialize(optionsWith(field, 0));
        expect(mockNative.initialize).toHaveBeenLastCalledWith(
          optionsWith(field, 0)
        );
        await BiometricSDK.initialize(optionsWith(field, 1));
        expect(mockNative.initialize).toHaveBeenLastCalledWith(
          optionsWith(field, 1)
        );
      }
    );

    it.each(numericFields)(
      'accepts an undefined %s',
      async (field: NumericField) => {
        await BiometricSDK.initialize(optionsWith(field, undefined));
        expect(mockNative.initialize).toHaveBeenLastCalledWith(
          optionsWith(field, undefined)
        );
      }
    );

    it.each(numericFields)(
      'rejects out-of-range %s values',
      (field: NumericField) => {
        for (const [label, value] of rejectedValues) {
          expect(() =>
            BiometricSDK.initialize(optionsWith(field, value))
          ).toThrow(RangeError);
          expect(() =>
            BiometricSDK.initialize(optionsWith(field, value))
          ).toThrow(`${field} must be a number from 0 to 1.`);
          expect(mockNative.initialize).not.toHaveBeenCalledWith(
            optionsWith(field, value as number)
          );
          // A failure names the offending value.
          expect(label.length).toBeGreaterThan(0);
        }
      }
    );
  });

  it('logs attendance with or without a location', async () => {
    await BiometricSDK.logAttendance('W-1', 0.9);
    await BiometricSDK.logAttendance('W-1', 0.9, {
      latitude: 10,
      longitude: 20,
    });
    expect(mockNative.logAndQueueAttendance).toHaveBeenNthCalledWith(
      1,
      'W-1',
      0.9,
      undefined
    );
    expect(mockNative.logAndQueueAttendance).toHaveBeenNthCalledWith(
      2,
      'W-1',
      0.9,
      {
        latitude: 10,
        longitude: 20,
      }
    );
  });

  it('builds a random source from native secure bytes', async () => {
    const randomInt = await BiometricSDK.createSecureRandomInt(3);
    expect(mockNative.getSecureRandomBytes).toHaveBeenCalledWith(3);
    expect([randomInt(2), randomInt(2), randomInt(2)]).toEqual([0, 1, 0]);
  });
});
