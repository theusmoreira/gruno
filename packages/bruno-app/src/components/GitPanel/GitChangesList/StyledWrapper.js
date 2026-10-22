import styled from 'styled-components';

const StyledWrapper = styled.div`
  .git-changes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .git-changes-count {
    font-weight: 400;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .git-file-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 26px;
    padding: 0 4px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.base};

    &:hover {
      background: ${(props) => props.theme.border.subtle};
    }
  }

  .git-file-open {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 6px;
    padding: 0;
    text-align: left;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
  }

  .git-file-name {
    flex-shrink: 0;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .git-file-directory {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    direction: rtl;
    text-align: left;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .git-file-status {
    margin-left: auto;
    width: 14px;
    text-align: center;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted};

    &.status-M,
    &.status-R {
      color: ${(props) => props.theme.colors.text.warning};
    }

    &.status-A,
    &.status-U {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.status-D,
    &.status-C {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .git-conflict-notice {
    margin-bottom: 4px;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default StyledWrapper;
