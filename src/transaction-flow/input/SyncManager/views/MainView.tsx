import { Trans, useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import { Button, Dialog, Helper } from '@ensdomains/thorin'

import { CustomTypography } from '@app/components/customs'

const Container = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: ${theme.space[4]};
  `,
)

const Description = styled.div(
  () => css`
    text-align: center;
  `,
)

type Props = {
  manager: string
  showWarning: boolean
  onCancel: () => void
  onConfirm: () => void
}

export const MainView = ({ manager, showWarning, onCancel, onConfirm }: Props) => {
  const { t } = useTranslation('transactionFlow')
  return (
    <Container>
      <Description>
        <CustomTypography color="text">
          <Trans t={t} i18nKey="input.syncManager.description" values={{ manager }} />
        </CustomTypography>
      </Description>
      {showWarning && <Helper type="warning">{t('input.syncManager.warning')}</Helper>}
      <Dialog.Footer
        leading={
          <Button colorStyle="accentSecondary" onClick={onCancel}>
            {t('action.cancel', { ns: 'common' })}
          </Button>
        }
        trailing={<Button onClick={onConfirm}>{t('action.next', { ns: 'common' })}</Button>}
      />
    </Container>
  )
}
