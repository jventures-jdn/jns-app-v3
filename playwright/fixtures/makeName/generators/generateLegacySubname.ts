/* eslint-disable import/no-extraneous-dependencies */

/* eslint-disable no-await-in-loop */
import { Accounts, createAccounts, User } from '../../accounts'
import { Contracts } from '../../contracts'
import { RecordOptions } from '@ensdomains/ensjs/utils'

// import { RESOLVER_ADDRESSES, emptyAddress } from '@app/utils/constants' //TODO (SG) - Ask about this

import { generateRecords } from './generateRecords'
import { testClient, waitForTransaction, walletClient } from '../../contracts/utils/addTestContracts'
import { createSubname, wrapName } from '@ensdomains/ensjs/wallet'
import { getChainContractAddress } from '@ensdomains/ensjs/contracts'
import { registrySetApprovalForAllSnippet } from '@ensdomains/ensjs/contracts'

export type LegacySubname = {
  name: string
  nameOwner: User
  label: string
  owner?: User
  resolver?: `0x${string}`
  records?: RecordOptions
  duration?: number
  type?: 'wrapped' | 'legacy'
  subnames?: Omit<LegacySubname, 'name' | 'nameOwner'>[]
}

type Dependencies = {
  accounts: Accounts
  contracts: Contracts
}
// const DEFAULT_RESOLVER = RESOLVER_ADDRESSES['1337'][2] as `0x${string}`
const DEFAULT_RESOLVER = testClient.chain.contracts.legacyPublicResolver.address 
export const generateLegacySubname =
  ({ accounts, contracts }: Dependencies) =>
  async ({
    name,
    nameOwner,
    label,
    owner = nameOwner,
    resolver,
    records,
    type,
    subnames,
  }: LegacySubname) => {
    const subname = `${label}.${name}`
    console.log('generating legacy subname:', subname)

    const tx = await createSubname(walletClient, {
        name: `${label}.${name}`,
        contract: 'registry',
        owner: createAccounts().getAddress(owner) as `0x${string}`,
        account: createAccounts().getAddress(nameOwner) as `0x${string}`,
        resolverAddress: resolver ?? DEFAULT_RESOLVER,
      })
      const receipt = await waitForTransaction(tx)

    // Make records
    if (records && resolver) {
      await generateRecords({ contracts })({
        name: subname,
        owner,
        resolver,
        records,
      })
    }

    if (type === 'wrapped') {
   
      const approve_tx = await walletClient.writeContract({
        abi: registrySetApprovalForAllSnippet,
        address: getChainContractAddress({
          client: walletClient,
          contract: 'ensRegistry',
        }),
        functionName: 'setApprovalForAll',
        args: [
          getChainContractAddress({
            client: walletClient,
            contract: 'ensNameWrapper',
          }),
          true,
        ],
        account: createAccounts().getAddress(owner) as `0x${string}`,
      })
      const approve = await waitForTransaction(approve_tx)
      if (approve.status === 'success') console.log('approved name wrapper')
      else throw new Error(`failed to approve name wrapper`)

      const wrap_tx = await wrapName(walletClient, {
        name: subname,
        newOwnerAddress: accounts.getAddress(owner) as `0x${string}`,
        resolverAddress: getChainContractAddress({ client: walletClient, contract: 'ensPublicResolver' }),
        account: accounts.getAddress(owner) as `0x${string}`,
      })
      const wrap = await waitForTransaction(wrap_tx)
      if (wrap.status === 'success') console.log('wrapped subname:', subname)
      else throw new Error(`failed to wrap subname: ${subname}`)
    }
    // Create subnames
    const _subnames = (subnames || []).map((_subname) => ({
      ..._subname,
      name: `${label}.${name}`,
      nameOwner: owner,
      resolver: _subname.resolver ?? DEFAULT_RESOLVER,
    }))
    for (const eachSubname of _subnames) {
      await generateLegacySubname({ accounts, contracts })(eachSubname)
    }
  }