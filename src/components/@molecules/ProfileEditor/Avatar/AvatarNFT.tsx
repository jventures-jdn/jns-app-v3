/* eslint-disable @typescript-eslint/naming-convention */
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber'
import { ReactNode, useCallback, useState } from 'react'
import { TFunction, useTranslation } from 'react-i18next'
import styled, { DefaultTheme, css, keyframes } from 'styled-components'
import { useAccount, useInfiniteQuery } from 'wagmi'

import { AlertSVG, Button, Dialog, Heading, Input, Typography, mq } from '@ensdomains/thorin'

import MagnifyingGlassSVG from '@app/assets/MagnifyingGlass.svg'
import { InnerDialog } from '@app/components/@atoms/InnerDialog'
import { ScrollBoxWithSpinner, SpinnerRow } from '@app/components/@molecules/ScrollBoxWithSpinner'
import { useChainName } from '@app/hooks/useChainName'

type OwnedNFT = {
  contract: {
    address: string
  }
  id: {
    tokenId: string
    tokenMetadata: {
      tokenType: 'ERC721' | 'ERC1155'
    }
  }
  balance: string
  title: string
  description: string
  tokenUri: {
    raw: string
    gateway: string
  }
  media: {
    raw: string
    gateway: string
    thumbnail?: string
    format?: string
  }[]
  metadata: {
    image: string
    external_url: string
    background_color: string
    name: string
    description: string
    attributes: string
  }
}

type NFTResponse = {
  ownedNfts: OwnedNFT[]
  pageKey: string
  totalCount: number
}

const makeBaseURL = (network: string) =>
  `https://ens-nft-worker.ens-cf.workers.dev/v1/${network}/getNfts/`

const InnerScrollBox = styled.div(
  ({ theme }) => css`
    width: ${theme.space.full};
    display: grid;
    align-items: center;
    justify-content: center;
    grid-template-columns: repeat(auto-fill, ${theme.space['36']});
  `,
)

const NFTContainer = styled.div(
  ({ theme }) => css`
    width: ${theme.space['36']};

    padding: ${theme.space['2']};
    gap: ${theme.space['2']};

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    opacity: 0.8;

    transition: all 0.15s ease-in-out;
    cursor: pointer;

    color: ${theme.colors.textPrimary};

    &:hover {
      opacity: 1;
    }

    &[aria-disabled='true'] {
      cursor: not-allowed;
      opacity: 1;
      color: ${theme.colors.textTertiary};
    }
  `,
)

const fadeInKeyframes = ({ theme }: { theme: DefaultTheme }) => keyframes`
  from {
    background-color: ${theme.colors.greyLight};
  }
  to {
    background-color: ${theme.colors.greySurface};
  }
`

const NFTImage = styled.img(
  ({ theme }) => css`
    width: ${theme.space['32']};
    height: ${theme.space['32']};

    border-radius: ${theme.radii['2xLarge']};
    object-fit: cover;
    animation: ${fadeInKeyframes} 2s infinite alternate ease-in-out;
    background-color: ${theme.colors.backgroundSecondary};

    &[data-image-state='loaded'] {
      animation: none;
    }
  `,
)

const NFTName = styled(Typography)(
  ({ theme }) => css`
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 ${theme.space['2']};
    text-align: center;
    color: inherit;
  `,
)

const SelectedNFTContainer = styled.div(({ theme }) => [
  css`
    width: 100%;
    & div {
      padding: 0 ${theme.radii['2.5xLarge']};
      &:first-of-type {
        font-size: ${theme.fontSizes.headingThree};
      }
    }
  `,
  mq.sm.min(css`
    width: calc(80vw - 2 * ${theme.space['6']});
    max-width: ${theme.space['128']};
  `),
])

const SelectedNFTImageWrapper = styled.div(
  () => css`
    display: flex;
    justify-content: center;
  `,
)

const SelectedNFTImage = styled.img(
  ({ theme }) => css`
    width: ${theme.space.full};
    max-width: ${theme.space['72']};
    border-radius: ${theme.radii['2.5xLarge']};
    margin-bottom: ${theme.space['2']};
  `,
)

const LoadingContainer = styled.div(({ theme }) => [
  css`
    width: ${theme.space.full};
    height: ${theme.space['32']};

    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: ${theme.space['4']};
  `,
  mq.sm.min(css`
    gap: ${theme.space['6']};
    width: calc(80vw - 2 * ${theme.space['6']});
    max-width: ${theme.space['128']};
  `),
])

const LoadFailureContainer = styled.div(
  ({ theme }) => css`
    width: ${theme.space['32']};
    height: ${theme.space['32']};

    padding: ${theme.space['4']};

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${theme.space['1']};

    border-radius: ${theme.radii['2xLarge']};

    background-color: ${theme.colors.greySurface};
    color: ${theme.colors.textTertiary};

    & > svg {
      width: ${theme.space['5']};
      height: ${theme.space['5']};
    }
  `,
)

const NftItem = ({
  t,
  nft,
  setSelectedNft,
  i,
}: {
  t: TFunction
  nft: OwnedNFT
  setSelectedNft: (i: number) => void
  i: number
}) => {
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'loaded'>('loading')
  return (
    <NFTContainer
      data-testid={`nft-${nft.id.tokenId}-${nft.contract.address}`}
      as="button"
      onClick={(e) => {
        e.preventDefault()
        if (loadState === 'loaded') setSelectedNft(i)
      }}
      aria-disabled={loadState !== 'loaded'}
    >
      {loadState !== 'error' ? (
        <NFTImage
          src={nft.media[0].thumbnail || nft.media[0].gateway}
          loading="lazy"
          onError={() => setLoadState('error')}
          onLoad={() => setLoadState('loaded')}
          data-image-state={loadState}
        />
      ) : (
        <LoadFailureContainer>
          <AlertSVG />
          <Typography fontVariant="smallBold" color="textTertiary">
            {t('input.profileEditor.tabs.avatar.nft.loadError')}
          </Typography>
        </LoadFailureContainer>
      )}
      <NFTName>{nft.title || t('input.profileEditor.tabs.avatar.nft.unknown')}</NFTName>
    </NFTContainer>
  )
}

export const AvatarNFT = ({
  handleCancel,
  handleSubmit,
}: {
  handleCancel: () => void
  handleSubmit: (type: 'nft', uri: string, display: string) => void
}) => {
  const chain = useChainName()
  const { t } = useTranslation('transactionFlow')

  const { address: _address } = useAccount()
  const address = _address!

  const {
    data: NFTPages,
    fetchNextPage,
    isLoading,
  } = useInfiniteQuery(
    [chain, address, 'NFTs'],
    async ({ pageParam }: { pageParam?: string }) => {
      const urlParams = new URLSearchParams()
      urlParams.append('owner', address)
      urlParams.append('filters[]', 'SPAM')
      if (pageParam) {
        urlParams.append('pageKey', pageParam)
      }
      const response = (await fetch(`${makeBaseURL(chain)}?${urlParams.toString()}`, {
        method: 'GET',
        redirect: 'follow',
      }).then((res) => res.json())) as NFTResponse

      return {
        ...response,
        ownedNfts: response.ownedNfts.filter(
          (nft) =>
            (nft.media[0].thumbnail || nft.media[0].gateway) &&
            nft.contract.address !== '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85',
        ),
      } as NFTResponse
    },
    {
      keepPreviousData: true,
      getNextPageParam: (lastPage) => lastPage.pageKey,
    },
  )

  const [searchedInput, setSearchedInput] = useState('')
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null)

  const NFTs = NFTPages?.pages
    .reduce((prev, curr) => [...prev, ...curr.ownedNfts], [] as OwnedNFT[])
    .filter((nft) => nft.title.toLowerCase().includes(searchedInput))

  const hasNextPage = !!NFTPages?.pages[NFTPages.pages.length - 1].pageKey
  const fetchPage = useCallback(() => fetchNextPage(), [fetchNextPage])

  if (selectedNFT !== null) {
    const nftReference = NFTs?.[selectedNFT]!

    const handleConfirm = () => {
      const string = `eip155:1/${nftReference.id.tokenMetadata.tokenType.toLowerCase()}:${
        nftReference.contract.address
      }/${BigNumber.from(nftReference.id.tokenId).toString()}`
      handleSubmit('nft', string, nftReference.media[0].gateway)
    }

    return (
      <>
        <Dialog.Heading
          title={t('input.profileEditor.tabs.avatar.nft.selected.title')}
          subtitle={t('input.profileEditor.tabs.avatar.nft.selected.subtitle')}
        />
        <SelectedNFTContainer>
          <SelectedNFTImageWrapper>
            <SelectedNFTImage src={nftReference.media[0].gateway} />
          </SelectedNFTImageWrapper>
          <Typography weight="bold">
            {nftReference.title || t('input.profileEditor.tabs.avatar.nft.unknown')}
          </Typography>
          <Typography>{nftReference.description}</Typography>
        </SelectedNFTContainer>
        <Dialog.Footer
          leading={
            <Button colorStyle="accentSecondary" onClick={() => setSelectedNFT(null)}>
              {t('action.back', { ns: 'common' })}
            </Button>
          }
          trailing={
            <Button onClick={handleConfirm}>{t('action.confirm', { ns: 'common' })}</Button>
          }
        />
      </>
    )
  }

  let innerContent: ReactNode

  if (isLoading) {
    innerContent = (
      <LoadingContainer>
        <Heading>{t('input.profileEditor.tabs.avatar.nft.loading')}</Heading>
        <SpinnerRow />
      </LoadingContainer>
    )
  } else if (NFTs && (NFTs.length > 0 || searchedInput !== '')) {
    innerContent = (
      <InnerDialog style={{ overflow: 'hidden' }}>
        <Input
          icon={<MagnifyingGlassSVG />}
          hideLabel
          label="search"
          value={searchedInput}
          onChange={(e) => setSearchedInput(e.target.value)}
          placeholder={t('input.profileEditor.tabs.avatar.nft.searchPlaceholder')}
          data-testid="avatar-search-input"
          clearable
        />
        {NFTs.length > 0 ? (
          <ScrollBoxWithSpinner
            data-testid="nft-scroll-box"
            style={{ width: '100%' }}
            onReachedBottom={fetchPage}
            showSpinner={hasNextPage}
          >
            <InnerScrollBox>
              {NFTs?.map((NFT, i) => (
                <NftItem
                  t={t}
                  nft={NFT}
                  setSelectedNft={setSelectedNFT}
                  i={i}
                  key={`${NFT.id.tokenId}-${NFT.contract.address}`}
                />
              ))}
            </InnerScrollBox>
          </ScrollBoxWithSpinner>
        ) : (
          <LoadingContainer>
            <Heading>{t('input.profileEditor.tabs.avatar.nft.noResults')}</Heading>
          </LoadingContainer>
        )}
      </InnerDialog>
    )
  } else {
    innerContent = (
      <LoadingContainer>
        <Heading>{t('input.profileEditor.tabs.avatar.nft.noNFTs')}</Heading>
      </LoadingContainer>
    )
  }

  return (
    <>
      <Dialog.Heading title={t('input.profileEditor.tabs.avatar.nft.title')} />
      {innerContent}
      <Dialog.Footer
        leading={
          <Button colorStyle="accentSecondary" onClick={handleCancel}>
            {t('action.cancel', { ns: 'common' })}
          </Button>
        }
        trailing={null}
      />
    </>
  )
}
