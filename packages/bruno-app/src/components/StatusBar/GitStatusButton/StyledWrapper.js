import styled from 'styled-components';

const StyledWrapper = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 4px;
  cursor: pointer;
  outline: none;
  white-space: nowrap;

  &.is-active {
    color: ${(props) => props.theme.brand};
  }

  .git-status-label {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export default StyledWrapper;
