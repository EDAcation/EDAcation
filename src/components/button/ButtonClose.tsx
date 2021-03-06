import {XIcon} from '@primer/octicons-react';
import {sx, SxProp} from '@primer/react';
import {get} from '@primer/react/lib/constants';
import {ComponentProps} from '@primer/react/lib/utils/types';
import React from 'react';
import styled from 'styled-components';

const StyledButton = styled.button<SxProp>`
    border: none;
    padding: 0;
    background: transparent;
    outline: none;
    cursor: pointer;
    border-radius: ${get('radii.2')};
    color: ${get('colors.fg.muted')};
    &:focus {
        box-shadow: ${get('shadows.btn.focusShadow')};
    }
    &:hover {
        color: ${get('colors.accent.fg')};
    }
    ${sx};
`;

export type ButtonCloseProps = ComponentProps<typeof StyledButton>;

export const ButtonClose: React.FC<ButtonCloseProps> = (props) => {
    return (
        <StyledButton aria-label="Close" {...props}>
            <XIcon />
        </StyledButton>
    );
};
