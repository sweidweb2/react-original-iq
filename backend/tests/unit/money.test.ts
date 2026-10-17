import { describe, expect, it } from 'vitest'

import {
  currencyDecimals,
  formatAmount,
  fromMinor,
  roundMoney,
  sumMinor,
  toMinor,
} from '../../src/modules/_shared/money.js'

describe('money', () => {
  it('uses ISO 4217 precision per currency', () => {
    expect(currencyDecimals('USD')).toBe(2)
    expect(currencyDecimals('kwd')).toBe(3)
    expect(currencyDecimals('BHD')).toBe(3)
    expect(currencyDecimals('OMR')).toBe(3)
    expect(currencyDecimals('JOD')).toBe(3)
    expect(currencyDecimals('JPY')).toBe(0)
  })

  it('rounds half away from zero despite binary floating point', () => {
    expect(toMinor(1.005)).toBe(101)
    expect(toMinor(1.015)).toBe(102)
    expect(toMinor(-1.005)).toBe(-101)
    expect(toMinor(-0.004)).toBe(0)
    expect(toMinor(1.2345, 'KWD')).toBe(1235)
    expect(roundMoney(12.345)).toBe(12.35)
    expect(roundMoney(1.0005, 'BHD')).toBe(1.001)
  })

  it('sums in minor units without drift', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(fromMinor(sumMinor([0.1, 0.2]))).toBe(0.3)
    expect(sumMinor(Array.from({ length: 10 }, () => 0.1))).toBe(100)
  })

  it('formats with the currency precision', () => {
    expect(formatAmount(12.5)).toBe('12.50')
    expect(formatAmount(1.2, 'KWD')).toBe('1.200')
    expect(formatAmount(1500.4, 'JPY')).toBe('1500')
  })
})
