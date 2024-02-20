import { QueryFunctionContext, queryOptions, useQuery } from '@tanstack/react-query'
import { Config } from 'wagmi'

import {
  getNameHistory,
  GetNameHistoryParameters,
  GetNameHistoryReturnType,
} from '@ensdomains/ensjs/subgraph'

import { useQueryOptions } from '@app/hooks/useQueryOptions'
import { CreateQueryKey, PartialBy, PublicClientWithChain, QueryConfig } from '@app/types'

type UseNameHistoryParameters = PartialBy<GetNameHistoryParameters, 'name'>

type UseNameHistoryReturnType = GetNameHistoryReturnType

type UseNameHistoryConfig = QueryConfig<UseNameHistoryReturnType, Error>

type QueryKey<TParams extends UseNameHistoryParameters> = CreateQueryKey<
  TParams,
  'getNameHistory',
  'graph'
>

export const getNameHistoryQueryFn =
  (config: Config) =>
  async <TParams extends UseNameHistoryParameters>({
    queryKey: [{ name }, chainId],
  }: QueryFunctionContext<QueryKey<TParams>>) => {
    if (!name) throw new Error('name is required')

    const publicClient = config.getClient({ chainId }) as PublicClientWithChain

    return getNameHistory(publicClient, { name })
  }

export const useNameHistory = <TParams extends UseNameHistoryParameters>({
  // config
  gcTime = 60,
  enabled = true,
  staleTime,
  scopeKey,

  // params
  ...params
}: TParams & UseNameHistoryConfig) => {
  const initialOptions = useQueryOptions({
    params,
    scopeKey,
    functionName: 'getNameHistory',
    queryDependencyType: 'graph',
    queryFn: getNameHistoryQueryFn,
  })

  const preparedOptions = queryOptions({
    queryKey: initialOptions.queryKey,
    queryFn: initialOptions.queryFn,
  })

  const query = useQuery({
    ...preparedOptions,
    enabled: enabled && !!params.name,
    gcTime,
    staleTime,
  })

  return {
    ...query,
    isCachedData: query.status === 'success' && query.isFetched && !query.isFetchedAfterMount,
  }
}
