import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  .git-diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .git-diff-title {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .git-diff-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
  }

  .git-diff-change-type {
    flex-shrink: 0;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .git-diff-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 12px 16px;
  }

  .git-diff-notice {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .git-diff-error {
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default StyledWrapper;
