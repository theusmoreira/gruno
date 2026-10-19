import { useDispatch, useSelector } from 'react-redux';
import { IconGitBranch } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import { toggleGitPanel } from 'providers/ReduxStore/slices/git';
import StyledWrapper from './StyledWrapper';

const GitStatusButton = ({ collectionUid }) => {
  const dispatch = useDispatch();
  const isPanelOpen = useSelector((state) => state.git.isPanelOpen);
  const gitState = useSelector((state) => state.git.byCollection[collectionUid]);
  const branch = gitState?.isRepo ? gitState.branch : null;

  return (
    <ToolHint text={isPanelOpen ? 'Close Git panel' : 'Open Git panel'} toolhintId="GitPanel" place="top" offset={10}>
      <StyledWrapper
        as="button"
        className={isPanelOpen ? 'is-active' : ''}
        onClick={() => dispatch(toggleGitPanel())}
        aria-label="Toggle Git panel"
        aria-pressed={isPanelOpen}
        data-testid="git-status-button"
      >
        <IconGitBranch size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="git-status-label">{branch || 'Git'}</span>
        {gitState?.ahead > 0 && <span data-testid="git-status-ahead">↑{gitState.ahead}</span>}
        {gitState?.behind > 0 && <span data-testid="git-status-behind">↓{gitState.behind}</span>}
      </StyledWrapper>
    </ToolHint>
  );
};

export default GitStatusButton;
