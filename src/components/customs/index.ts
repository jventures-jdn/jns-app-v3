import styled, { css } from 'styled-components'

import { Heading, Select, Typography } from '@ensdomains/thorin'

export const CustomSelect = styled(Select)(
  ({ theme }) =>
    css`
      button:hover {
        color: ${theme.colors.textSecondary};
      }
    `,
)

export const CustomHeading = styled(Heading)(
  ({ theme }) => css`
    color: ${theme.colors.textPrimary};
  `,
)

export const CustomTypography = styled(Typography)(
  ({ theme }) => css`
    color: ${theme.colors.textTertiary};
  `,
)
