import { BigNumber } from '@ethersproject/bignumber'
import { toUtf8Bytes } from '@ethersproject/strings/lib/utf8'
import { AllCurrentFuses } from '@jfinchain/jnsjs/utils/fuses'

import {
  CURRENCY_FLUCTUATION_BUFFER_PERCENTAGE,
  NAMEWRAPPER_AWARE_RESOLVERS,
  RESOLVER_ADDRESSES,
  networkName,
} from './constants'

export const getSupportedNetworkName = (networkId: number) =>
  networkName[`${networkId}` as keyof typeof networkName] || 'unknown'

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET ? 3502 : 3501
const baseMetadataURL =
  isTestnet === 3502
    ? 'https://jns-metadata.testnet.jfinchain.com'
    : 'https://jns-metadata.jfinchain.com'

// eslint-disable-next-line consistent-return
export function imageUrlUnknownRecord(name: string, network: number) {
  const supported = getSupportedNetworkName(network)

  return `${baseMetadataURL}/${supported}/avatar/${name}?timestamp=${Date.now()}`
}

export function ensNftImageUrl(name: string, network: number, regAddr: string) {
  const supported = getSupportedNetworkName(network)

  return `${baseMetadataURL}/${supported}/${regAddr}/${name}/image`
}

export const shortenAddress = (address = '', maxLength = 10, leftSlice = 5, rightSlice = 5) => {
  if (address.length < maxLength) {
    return address
  }

  return `${address.slice(0, leftSlice)}...${address.slice(-rightSlice)}`
}

export const secondsToDays = (seconds: number) => Math.floor(seconds / (60 * 60 * 24))

export const secondsToHours = (seconds: number) => Math.floor(seconds / (60 * 60))

export const daysToSeconds = (days: number) => days * 60 * 60 * 24

export const yearsToSeconds = (years: number) => years * 60 * 60 * 24 * 365

export const secondsToYears = (seconds: number) => seconds / (60 * 60 * 24 * 365)

export const formatExpiry = (expiry: Date) =>
  `${expiry.toLocaleDateString(undefined, {
    month: 'long',
  })} ${expiry.getDate()}, ${expiry.getFullYear()}`

export const formatDateTime = (date: Date) => {
  const baseFormatted = date.toLocaleTimeString('en', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    timeZoneName: 'short',
  })
  return `${baseFormatted}`
}

export const formatFullExpiry = (expiryDate?: Date) =>
  expiryDate ? `${formatExpiry(expiryDate)}, ${formatDateTime(expiryDate)}` : ''

export const makeEtherscanLink = (data: string, network?: string, route: string = 'tx') =>
  `https://${network === 'jfin' ? '' : 'testnet.'}jfinscan.com/${route}/${data}`

export const isBrowser = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
)

export const checkDNSName = (name: string): boolean => {
  const labels = name?.split('.')

  return !!labels && labels[labels.length - 1] !== 'jfin'
}

export const checkETH2LDFromName = (name: string) => {
  const labels = name.split('.')
  if (labels.length !== 2) return false
  if (labels[1] !== 'jfin') return false
  return true
}

export const checkDNS2LDFromName = (name: string) => {
  const labels = name.split('.')
  if (labels.length !== 2) return false
  if (labels[1] === 'jfin') return false
  return true
}

export const checkSubname = (name: string) => name.split('.').length > 2

export const isLabelTooLong = (label: string) => {
  const bytes = toUtf8Bytes(label)
  return bytes.byteLength > 255
}

export const getTestId = (props: any, fallback: string): string => {
  return props['data-testid'] ? String(props['data-testid']) : fallback
}

export const deleteProperty = <T extends Record<string, any>, K extends keyof T>(
  key: K,
  { [key]: _, ...newObj }: T,
): Omit<T, K> => newObj

export const deleteProperties = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> => {
  const newObj = { ...obj }
  for (const key of keys) {
    delete newObj[key]
  }
  return newObj
}

export const getLabelFromName = (name: string = '') => name.split('.')[0]

export const validateExpiry = (
  name: string,
  fuses: AllCurrentFuses | undefined,
  expiry: Date | undefined,
  pccExpired?: boolean,
) => {
  const isDotETH = checkETH2LDFromName(name)
  if (isDotETH) return expiry
  if (!fuses) return undefined
  return pccExpired || fuses.parent.PARENT_CANNOT_CONTROL ? expiry : undefined
}

export const canEditRecordsWhenWrappedCalc = (
  isWrapped: boolean,
  resolverAddress: string = RESOLVER_ADDRESSES[isTestnet]?.[0],
  chainId: number = isTestnet,
) => {
  if (!isWrapped) return true
  return NAMEWRAPPER_AWARE_RESOLVERS[chainId]?.includes(resolverAddress)
}

export const hexToNumber = (hex: string) => parseInt(hex, 16)

export const calculateValueWithBuffer = (value: BigNumber) =>
  value.mul(CURRENCY_FLUCTUATION_BUFFER_PERCENTAGE).div(100)
