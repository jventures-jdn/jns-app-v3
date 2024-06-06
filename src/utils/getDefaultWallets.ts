import { Chain, WalletList, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet } from '@rainbow-me/rainbowkit/wallets'
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect'

export interface MyWalletOptions {
  projectId: string
  chains: Chain[]
}

export const getDefaultWallets = ({
  projectId,
  chains,
}: {
  appName: string
  projectId: string
  chains: Chain[]
}) => {
  const chainId = process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ? 3502 : 3501
  const isTestnet = chainId === 3502
  const wallets: WalletList = [
    {
      groupName: 'Popular',
      wallets: [
        {
          id: 'join',
          name: 'JOIN',
          iconUrl: './joinwallet.png',
          iconBackground: 'transparent',
          createConnector: () => {
            const connector = new WalletConnectConnector({
              chains,
              options: {
                projectId,
              },
            })
            return {
              connector,
              mobile: {
                getUri: async () => 'https://jfinwallet.page.link/',
              },
              qrCode: {
                getUri: async () => 'https://jfinwallet.page.link/',
              },
            }
          },
        },
        ...(isTestnet
          ? [
              {
                id: 'join-dev',
                name: 'JOIN Dev',
                iconUrl: './joinwallet.png',
                iconBackground: 'transparent',
                createConnector: () => {
                  const connector = new WalletConnectConnector({
                    chains,
                    options: {
                      projectId,
                    },
                  })
                  return {
                    connector,

                    mobile: {
                      getUri: async () => 'https://joinwalletdev.page.link',
                    },
                    qrCode: {
                      getUri: async () => 'https://joinwalletdev.page.link',
                    },
                  }
                },
              },
            ]
          : []),
        metaMaskWallet({ chains, projectId }),
      ],
    },
  ]

  return connectorsForWallets(wallets)
}
