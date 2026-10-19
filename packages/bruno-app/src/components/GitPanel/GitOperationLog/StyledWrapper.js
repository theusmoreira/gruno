import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: ${(props) => props.theme.border.radius.sm};

  pre {
    margin: 0;
    padding: 6px 8px;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

export default StyledWrapper;
