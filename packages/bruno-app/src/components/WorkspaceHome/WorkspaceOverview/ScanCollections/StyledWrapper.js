import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;

  .scan-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  .scan-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
    background: transparent;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.sm};
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .scan-panel {
    border: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
    border-radius: 4px;
    padding: 8px 10px;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
  }

  .scan-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .scan-dismiss {
    display: inline-flex;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
  }

  .scan-section-title {
    margin-top: 8px;
    font-weight: 500;
  }

  .scan-list {
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
  }

  .scan-item {
    padding: 2px 0;
    word-break: break-all;
  }

  .scan-item-detail {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.xs};
  }
`;

export default StyledWrapper;
