import styled from 'styled-components';

const StyledWrapper = styled.div`
  textarea {
    width: 100%;
    resize: vertical;
    padding: 6px 8px;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }
  }
`;

export default StyledWrapper;
