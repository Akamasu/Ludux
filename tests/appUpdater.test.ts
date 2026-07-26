import { describe, expect, it } from 'vitest'
import { shouldStartAppUpdater } from '../src/services/app-updater'

describe('app updater', () => {
  it('runs only for packaged builds when updates are enabled', () => {
    expect(
      shouldStartAppUpdater({
        disabled: false,
        isPackaged: true,
      }),
    ).toBe(true)
    expect(
      shouldStartAppUpdater({
        disabled: false,
        isPackaged: false,
      }),
    ).toBe(false)
    expect(
      shouldStartAppUpdater({
        disabled: true,
        isPackaged: true,
      }),
    ).toBe(false)
  })
})
