import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex-shrink: 0;
  width: 320px;
  height: 100%;

  .git-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${(props) => props.theme.bg};
    color: ${(props) => props.theme.text};
    border-left: 1px solid ${(props) => props.theme.border.border1};
  }

  .git-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .git-panel-title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
  }

  .git-panel-branch {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .git-panel-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .git-panel-notice {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
