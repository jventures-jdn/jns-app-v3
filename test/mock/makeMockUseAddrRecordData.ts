import { match, P } from 'ts-pattern'
import { Address } from 'viem'

import { createAccounts } from '../../playwright/fixtures/accounts'

const userAddress = createAccounts().getAddress('user') as Address
const user2Address = createAccounts().getAddress('user2') as Address

const mockUseAddrRecordTypes = ['user', 'user2'] as const
export type MockUseAddrRecordType = (typeof mockUseAddrRecordTypes)[number] | undefined

export const makeMockUseAddrRecordData = (type: MockUseAddrRecordType) => {
  return match(type)
    .with(P.nullish, () => undefined)
    .with('user', () => ({
      id: 60,
      name: 'eth',
      value: userAddress,
    }))
    .with('user2', () => ({
      id: 60,
      name: 'eth',
      value: user2Address,
    }))
    .exhaustive()
}
