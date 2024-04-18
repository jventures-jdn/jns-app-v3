import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { filter } from 'lodash'
import debounce from 'lodash/debounce'
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useTransition, { TransitionState } from 'react-transition-state'
import usePrevious from 'react-use/lib/usePrevious'
import styled, { css } from 'styled-components'
import { isAddress } from 'viem'
import { useAccount, useChainId, useEnsAvatar } from 'wagmi'

import {
  GetExpiryReturnType,
  GetOwnerReturnType,
  GetPriceReturnType,
  GetWrapperDataReturnType,
} from '@ensdomains/ensjs/public'
import { normalise } from '@ensdomains/ensjs/utils'
import { BackdropSurface, mq, Portal, Typography } from '@ensdomains/thorin'

import { useBasicName } from '@app/hooks/useBasicName'
import { useDebounce } from '@app/hooks/useDebounce'
import { useLocalStorage } from '@app/hooks/useLocalStorage'
import { createQueryKey } from '@app/hooks/useQueryOptions'
import { useRouterWithHistory } from '@app/hooks/useRouterWithHistory'
import { useValidate, validate, ValidationResult } from '@app/hooks/useValidate'
import { useElementSize } from '@app/hooks/useWindowSize'
import { useZorb } from '@app/hooks/useZorb'
import { useBreakpoint } from '@app/utils/BreakpointProvider'
import { ensAvatarConfig } from '@app/utils/query/ipfsGateway'
import { getRegistrationStatus } from '@app/utils/registrationStatus'
import { thread, yearsToSeconds } from '@app/utils/utils'

import { FakeSearchInputBox, SearchInputBox } from './SearchInputBox'
import { SearchResult } from './SearchResult'
import { AnyItem, HistoryItem } from './types'

/* eslint-disable jsx-a11y/click-events-have-key-events */

/* eslint-disable jsx-a11y/no-static-element-interactions */

/* eslint-disable jsx-a11y/interactive-supports-focus */

const BOX_SEARCH_ENDPOINT = 'https://dotbox-worker.ens-cf.workers.dev/search'

const Container = styled.div<{ $size: 'medium' | 'extraLarge' }>(
  ({ $size }) => css`
    width: 100%;
    position: relative;
    ${$size === 'extraLarge' &&
    mq.sm.min(css`
      padding-left: 48px;
      padding-right: 48px;
    `)}
  `,
)

const SearchResultsContainer = styled.div<{
  $state: TransitionState
}>(
  ({ theme, $state }) => css`
    position: absolute;
    width: 100%;
    height: min-content;
    top: calc(100% + ${theme.space['3']});

    background-color: #f7f7f7;
    box-shadow: 0 2px 12px ${theme.colors.border};
    border-radius: ${theme.radii.extraLarge};
    border: ${theme.borderWidths.px} ${theme.borderStyles.solid} ${theme.colors.border};
    &[data-error='true'] {
      border-color: ${theme.colors.red};
    }

    overflow: hidden;

    opacity: 0;
    z-index: 1000;
    transform: translateY(-${theme.space['2']});
    transition:
      0.35s all cubic-bezier(1, 0, 0.22, 1.6),
      0s border-color linear 0s,
      0s width linear 0s;

    ${$state === 'entered'
      ? css`
          opacity: 1;
          transform: translateY(0px);
        `
      : css`
          & > div {
            cursor: default;
          }
        `}
  `,
)

const FloatingSearchContainer = styled.div<{ $state: TransitionState }>(
  ({ theme, $state }) => css`
    width: 95%;

    position: fixed;
    left: 2.5%;
    z-index: 9999;
    top: ${theme.space['4']};

    display: flex;
    flex-direction: column;

    opacity: 0;

    & > div:nth-child(2) {
      width: 95vw !important;
    }

    ${$state === 'entered' &&
    css`
      opacity: 1;
    `}
  `,
)

const InputAndCancel = styled.div(
  () => css`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  `,
)

const CancelButton = styled(Typography)(
  ({ theme }) => css`
    padding: ${theme.space['3']};
  `,
)

const MobileSearchInput = ({
  state,
  toggle,
  searchInputRef,
  SearchResultsElement,
  SearchInputElement,
}: {
  state: TransitionState
  toggle: (value: boolean) => void
  searchInputRef: RefObject<HTMLInputElement>
  SearchResultsElement: JSX.Element
  SearchInputElement: JSX.Element
}) => {
  const { t } = useTranslation('common')

  useEffect(() => {
    if (state === 'entered') {
      searchInputRef.current?.focus()
    }
  }, [searchInputRef, state])

  return (
    <>
      <FakeSearchInputBox
        onClick={(e) => {
          toggle(true)
          // MOBILE SAFARI FIX:
          // focus on the fake input first, then wait for the transition to finish and focus on the real input
          // this allows the keyboard to pop up
          e.currentTarget.focus()
          e.preventDefault()
          setTimeout(() => searchInputRef.current?.focus(), 350)
        }}
      />
      {state !== 'unmounted' && (
        <Portal>
          <BackdropSurface
            $empty={false}
            onClick={() => toggle(false)}
            $state={state}
            data-testid="search-input-backdrop"
          />
          <FloatingSearchContainer $state={state}>
            <InputAndCancel>
              {SearchInputElement}
              <CancelButton as="button" onClick={() => toggle(false)}>
                {t('action.cancel')}
              </CancelButton>
            </InputAndCancel>
            {SearchResultsElement}
          </FloatingSearchContainer>
        </Portal>
      )}
    </>
  )
}

const useGetDotBox = (normalisedOutput: any) => {
  const searchParam = useDebounce(normalisedOutput, 500)
  console.log('serachParam: ', searchParam)

  const { data, status } = useQuery({
    queryKey: [searchParam],
    queryFn: async () => {
      const response = await fetch(`${BOX_SEARCH_ENDPOINT}?domain=${searchParam}`)
      return response.json()
    },
    staleTime: 10 * 1000,
    enabled: !!searchParam,
  })

  return { data, status }
}

const useSearchResult = (normalisedOutput: any, inputVal: any) => {
  const searchParam = useDebounce(normalisedOutput, 500)
  // const prevSearchParam = usePrevious(searchParam)

  // const { isValid, isETH, is2LD, isShort, type, name } = useValidate({
  //   input: inputVal,
  //   enabled: !inputIsAddress && !isEmpty,
  // })

  const { data, status } = useQuery({
    queryKey: [searchParam],
    queryFn: async () => {
      const response = await fetch(`${BOX_SEARCH_ENDPOINT}?domain=${searchParam}`)

      const validationResult = validate(searchParam)
      console.log('validationResult: ', validationResult)

      return response.json()
    },
    staleTime: 10 * 1000,
    enabled: !!searchParam,
  })
}

const useAddEventListeners = (
  searchInputRef: any,
  handleKeyDown: any,
  handleFocusIn: any,
  handleFocusOut: any,
) => {
  useEffect(() => {
    const searchInput = searchInputRef.current
    if (searchInput) {
      searchInput?.addEventListener('keydown', handleKeyDown)
      searchInput?.addEventListener('focusin', handleFocusIn)
      searchInput?.addEventListener('focusout', handleFocusOut)
      return () => {
        searchInput?.removeEventListener('keydown', handleKeyDown)
        searchInput?.removeEventListener('focusin', handleFocusIn)
        searchInput?.removeEventListener('focusout', handleFocusOut)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleFocusIn, handleFocusOut, handleKeyDown, searchInputRef.current])
}

const handleKeyDown =
  (handleSearch: any, setSelected: any, searchItems: any) => (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      return handleSearch()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((prev) => (prev - 1 + searchItems.length) % searchItems.length)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((prev) => (prev + 1) % searchItems.length)
    }
  }

/*
const handleSearch =
  ({
    normalisedOutput,
    queryClient,
    router,
    searchItems,
    selected,
    setHistory,
    chainId,
    address,
  }: {
    normalisedOutput: string
    queryClient: QueryClient
    router: any
    searchItems: any
    selected: boolean
    setHistory: () => void
    chainId: number
    address: string
  }) =>
  () => {
    let selectedItem = searchItems[selected] as SearchItem
    if (!selectedItem) return
    if (selectedItem.type === 'error' || selectedItem.type === 'text') return
    if (selectedItem.type === 'nameWithDotEth') {
      selectedItem = {
        type: 'name',
        value: `${normalisedOutput}.eth`,
      }
    }
    if (!selectedItem.value) {
      selectedItem.value = normalisedOutput
    }
    if (selectedItem.type === 'name') {
      const labels = selectedItem.value.split('.')
      const isDotETH = labels.length === 2 && labels[1] === 'eth'
      if (isDotETH && labels[0].length < 3) {
        return
      }
    }
    let path =
      selectedItem.type === 'address'
        ? `/address/${selectedItem.value}`
        : `/profile/${selectedItem.value}`
    if (selectedItem.type === 'nameWithDotEth' || selectedItem.type === 'name') {
      const currentValidation =
        queryClient.getQueryData<ValidationResult>(
          createQueryKey({
            queryDependencyType: 'independent',
            functionName: 'validate',
            params: { input: selectedItem.value },
          }),
        ) || validate(selectedItem.value)
      if (currentValidation.is2LD && currentValidation.isETH && currentValidation.isShort) {
        return
      }
      const ownerData = queryClient.getQueryData<GetOwnerReturnType>(
        createQueryKey({
          address,
          chainId,
          functionName: 'getOwner',
          queryDependencyType: 'standard',
          params: { name: selectedItem.value },
        }),
      )
      const wrapperData = queryClient.getQueryData<GetWrapperDataReturnType>(
        createQueryKey({
          address,
          chainId,
          functionName: 'getWrapperData',
          queryDependencyType: 'standard',
          params: { name: selectedItem.value },
        }),
      )
      const expiryData = queryClient.getQueryData<GetExpiryReturnType>(
        createQueryKey({
          address,
          chainId,
          functionName: 'getExpiry',
          queryDependencyType: 'standard',
          params: { name: selectedItem.value },
        }),
      )
      const priceData = queryClient.getQueryData<GetPriceReturnType>(
        createQueryKey({
          address,
          chainId,
          functionName: 'getPrice',
          queryDependencyType: 'standard',
          params: { name: selectedItem.value, duration: yearsToSeconds(1) },
        }),
      )
      if (ownerData) {
        const registrationStatus = getRegistrationStatus({
          timestamp: Date.now(),
          validation: currentValidation,
          ownerData,
          wrapperData,
          expiryData,
          priceData,
        })
        if (registrationStatus === 'available') {
          path = `/register/${selectedItem.value}`
        }
      }
    }
    if ('isHistory' in selectedItem) {
      delete (selectedItem as SearchItem & { isHistory?: boolean }).isHistory
    }

    setHistory((prev) => [
      ...prev
        .filter((item) => !(item.value === selectedItem.value && item.type === selectedItem.type))
        .slice(0, 25),
      { ...selectedItem, lastAccessed: Date.now() } as HistoryItem,
    ])

    setInputVal('')
    searchInputRef.current?.blur()
    router.pushWithHistory(path)
  }
  */

const handleSearch = (router: any, setHistory: any) => (nameType: any, text: string) => {
  setHistory((prev: any) => [
    ...prev.filter((item) => item.text === text && item.nameType === nameType),
    { lastAccessed: Date.now(), nameType, text },
  ])
  router.push(`/${text}`)
}

const useSelectionManager = ({
  inputVal,
  setSelected,
  state,
}: {
  inputVal: any
  setSelected: any
  state: any
}) => {
  useEffect(() => {
    if (inputVal === '') {
      setSelected(-1)
    } else {
      setSelected(0)
    }
  }, [inputVal, setSelected])

  useEffect(() => {
    if (state === 'unmounted') {
      setSelected(-1)
    }
  }, [state, setSelected])
}

interface SearchItem {
  isLoading: boolean
  isFromHistory: boolean
  nameType: 'eth-name' | 'addresss' | 'dns'
  value?: string
}

const formatEthText = (name: string, isETH: boolean) => {
  if (!name) return ''
  if (isETH) return name
  if (name.includes('.')) return ''
  return `${name}.eth`
}
const addEthDropdownItem = (dropdownItems: SearchItem[], name: any, isETH: boolean) => [
  {
    text: formatEthText(name, isETH),
    nameType: 'eth',
  },
  ...dropdownItems,
]

const formatBoxText = (name: string) => {
  if (!name) return ''
  if (name?.endsWith('.box')) return name
  if (name.includes('.')) return ''
  return `${name}.box`
}
const addBoxDropdownItem = (dropdownItems: SearchItem[], name: string, isValid: boolean) => [
  {
    text: formatBoxText(name),
    nameType: 'box',
    isValid,
  },
  ...dropdownItems,
]

const formatTldText = (name: string) => {
  if (!name) return ''
  if (name.includes('.')) return ''
  return name
}
const addTldDropdownItem = (dropdownItems: SearchItem[], name: string) => [
  {
    text: formatTldText(name),
    isLoading: true,
    nameType: 'tld',
  },
  ...dropdownItems,
]

const addAddressItem = (dropdownItems: SearchItem[], name: string, inputIsAddress: boolean) => [
  {
    text: inputIsAddress ? name : '',
    nameType: 'address',
  },
  ...dropdownItems,
]

const MAX_DROPDOWN_ITEMS = 6
const addHistoryDropdownItems = (dropdownItems: SearchItem[], history: any) => {
  const historyItemDrawCount = MAX_DROPDOWN_ITEMS - dropdownItems.filter((item) => item.text).length

  if (historyItemDrawCount > 0) {
    const filteredHistoryItems = history.filter(
      (historyItem: any) =>
        dropdownItems.findIndex(
          (dropdownItem) =>
            dropdownItem.nameType === historyItem.nameType &&
            dropdownItem.text === historyItem.text,
        ) === -1,
    )
    const historyItems = filteredHistoryItems?.slice(0, historyItemDrawCount + 1)
    return [...historyItems, ...dropdownItems]
  }

  return dropdownItems
}

const formatDnsText = (name: string, isETH: boolean) => {
  if (!name) return ''
  if (!name.includes('.')) return ''
  if (name.endsWith('.box')) return ''
  if (isETH) return ''
  return name
}
const addDnsDropdownItem = (dropdownItems: SearchItem[], name: any, isETH: boolean) => [
  {
    text: formatDnsText(name, isETH),
    nameType: 'dns',
  },
  ...dropdownItems,
]

const addErrorDropdownItem = (dropdownItems: SearchItem[], name: string, isValid: boolean) =>
  isValid || name === ''
    ? dropdownItems
    : [
        {
          text: 'Invalid name',
          nameType: 'error',
        },
      ]

const useBuildDropdownItems = (inputVal: string, history: any): SearchItem[] => {
  const inputIsAddress = useMemo(() => isAddress(inputVal), [inputVal])

  const { isValid, isETH, name } = useValidate({
    input: inputVal,
    enabled: !inputIsAddress && !inputVal,
  })

  return thread(
    '->',
    [],
    [addDnsDropdownItem, name, isETH],
    [addAddressItem, name, inputIsAddress],
    [addEthDropdownItem, name, isETH],
    [addBoxDropdownItem, name, isValid],
    [addTldDropdownItem, name],
    [addHistoryDropdownItems, history],
    [addErrorDropdownItem, name, isValid],
  )
    .reverse()
    .filter((item: any) => item.text)
}

export const SearchInput = ({ size = 'extraLarge' }: { size?: 'medium' | 'extraLarge' }) => {
  const { t } = useTranslation('common')
  const router = useRouterWithHistory()
  const breakpoints = useBreakpoint()
  const queryClient = useQueryClient()
  const chainId = useChainId()
  const { address } = useAccount()

  const [inputVal, setInputVal] = useState('')

  const [state, toggle] = useTransition({
    enter: true,
    exit: true,
    preEnter: true,
    preExit: true,
    mountOnEnter: true,
    unmountOnExit: true,
    timeout: {
      enter: 0,
      exit: 350,
    },
  })

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchInputContainerRef = useRef<HTMLDivElement>(null)
  const { width } = useElementSize(searchInputContainerRef.current)

  const [selected, setSelected] = useState(0)

  const [history, setHistory] = useLocalStorage<HistoryItem[]>('search-history', [])
  console.log('history: ', history)

  const handleFocusIn = useCallback(() => toggle(true), [toggle])
  const handleFocusOut = useCallback(() => toggle(false), [toggle])

  const dropdownItems = useBuildDropdownItems(inputVal, history)
  console.log('dropdownItems: ', dropdownItems)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSearchCb = useCallback(handleSearch(router, setHistory), [router, setHistory])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleKeyDownCb = useCallback(
    handleKeyDown(handleSearch(router, setHistory), setSelected, dropdownItems),
    [handleSearch, setSelected, dropdownItems.length],
  )

  useAddEventListeners(searchInputRef, handleKeyDownCb, handleFocusIn, handleFocusOut)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // const handleHoverCb = useCallback(handleHover(setSelected), [setSelected])

  useSelectionManager({ inputVal, setSelected, state })

  console.log('selected: ', selected)

  const SearchInputElement = (
    <SearchInputBox
      containerRef={searchInputContainerRef}
      ref={searchInputRef}
      input={inputVal}
      setInput={setInputVal}
      size={size}
    />
  )

  const SearchResultsElement = (
    <SearchResultsContainer
      style={{
        width: width === Infinity ? undefined : width,
      }}
      onMouseLeave={() => inputVal === '' && setSelected(0)}
      $state={state}
      data-testid="search-input-results"
      // data-error={!isValid && !inputIsAddress && inputVal !== ''}
    >
      {dropdownItems.map((item, index) => (
        <SearchResult
          clickCallback={handleSearchCb}
          hoverCallback={setSelected}
          index={index}
          selected={index === selected}
          type={item.type}
          isLoading={item.isLoading}
          key={`${item.nameType}-${item.text}`}
          text={item.text}
          nameType={item.nameType}
        />
      ))}
    </SearchResultsContainer>
  )

  console.log('state: ', state)

  if (breakpoints.sm) {
    return (
      <Container data-testid="search-input-desktop" $size={size}>
        {SearchInputElement}
        {state !== 'unmounted' && SearchResultsElement}
      </Container>
    )
  }

  return (
    <Container data-testid="search-input-mobile" $size="extraLarge">
      <MobileSearchInput
        {...{
          SearchInputElement,
          SearchResultsElement,
          searchInputRef,
          state,
          toggle,
        }}
      />
    </Container>
  )
}
