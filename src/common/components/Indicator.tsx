import React from 'react';

import styled from 'styled-components';

import { colors, px } from 'src/styles';

export type IndicatorProps = {
  color: 'success' | 'warning' | 'error' | 'info';
  size?: 's' | 'm';
} & React.HTMLAttributes<HTMLDivElement>;

const getSize = (size: 's' | 'm' | undefined): number => (size === 'm' ? 12 : 8);

const StyledIndicator = styled.div<IndicatorProps>`
  background-color: ${({ color }) => colors[color]};
  border: none;
  border-radius: 50%;
  height: ${({ size }) => px(getSize(size))};
  width: ${({ size }) => px(getSize(size))};
`;

const Indicator = (props: IndicatorProps) => <StyledIndicator {...props} />;

export default Indicator;
