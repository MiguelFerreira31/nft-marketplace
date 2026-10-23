import { describe, expect, it } from 'vitest'
import { createIdempotencyKey } from './idempotency'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('createIdempotencyKey', () => {
  it('generates a UUID-shaped key', () => {
    expect(createIdempotencyKey()).toMatch(UUID_PATTERN)
  })

  it('generates a new key on every call (one key per checkout attempt)', () => {
    const first = createIdempotencyKey()
    const second = createIdempotencyKey()
    expect(first).not.toBe(second)
  })
})
