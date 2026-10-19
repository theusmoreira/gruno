import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: ${(props) => props.theme.font.size.sm};
  line-height: 1.6;
  border: 1px solid ${(props) => props.theme.border.border1};
  border-radius: ${(props) => props.theme.border.radius.sm};
  overflow-x: auto;

  .patch-row {
    display: flex;
    min-width: max-content;
    padding-right: 12px;
  }

  .patch-marker {
    flex-shrink: 0;
    width: 24px;
    text-align: center;
    user-select: none;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .patch-text {
    white-space: pre;
  }

  .added {
    background: color-mix(in srgb, ${(props) => props.theme.colors.text.green} 13%, transparent);

    .patch-marker {
      color: ${(props) => props.theme.colors.text.green};
    }
  }

  .deleted {
    background: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 13%, transparent);

    .patch-marker {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .hunk,
  .meta {
    color: ${(props) => props.theme.colors.text.muted};
    background: ${(props) => props.theme.border.subtle};
  }
`;

export default StyledWrapper;
