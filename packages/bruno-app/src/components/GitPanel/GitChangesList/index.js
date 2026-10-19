import { useDispatch } from 'react-redux';
import { IconMinus, IconPlus } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import { stageGitFiles, unstageGitFiles } from 'providers/ReduxStore/slices/git/actions';
import GitFileRow from './GitFileRow';
import StyledWrapper from './StyledWrapper';

const stagedStatusCode = (file) => file.fileIndex;

const unstagedStatusCode = (file) => (file.working_dir === '?' ? 'U' : file.working_dir.trim() || file.fileIndex);

const GitChangesSection = ({ title, files, testId, bulkAction, children }) => (
  <section className="git-changes-section" data-testid={testId}>
    <div className="git-changes-header">
      <span>
        {title} <span className="git-changes-count">{files.length}</span>
      </span>
      {bulkAction}
    </div>
    <ul>{children}</ul>
  </section>
);

const GitChangesList = ({ collectionUid, gitState }) => {
  const dispatch = useDispatch();
  const { staged, unstaged, conflicted, tooManyFiles, operation } = gitState;
  const busy = Boolean(operation);

  // Failures are already shown by the panel's error banner.
  const stage = (files) => dispatch(stageGitFiles(collectionUid, files.map((file) => file.path))).catch(() => {});
  const unstage = (files) => dispatch(unstageGitFiles(collectionUid, files.map((file) => file.path))).catch(() => {});

  if (tooManyFiles) {
    return (
      <div className="git-panel-notice" data-testid="git-too-many-files">
        Too many changed files to list. Review them from the terminal.
      </div>
    );
  }

  if (staged.length === 0 && unstaged.length === 0 && conflicted.length === 0) {
    return (
      <div className="git-panel-notice" data-testid="git-no-changes">
        No changes in this collection.
      </div>
    );
  }

  return (
    <StyledWrapper className="flex flex-col gap-3">
      {conflicted.length > 0 && (
        <GitChangesSection title="Conflicts" files={conflicted} testId="git-conflicted-changes">
          <li className="git-conflict-notice">Resolve these conflicts from the terminal.</li>
          {conflicted.map((file) => (
            <GitFileRow key={file.path} file={file} statusCode="C" />
          ))}
        </GitChangesSection>
      )}

      {staged.length > 0 && (
        <GitChangesSection
          title="Staged changes"
          files={staged}
          testId="git-staged-changes"
          bulkAction={(
            <ActionIcon label="Unstage all" size="sm" disabled={busy} onClick={() => unstage(staged)} data-testid="git-unstage-all">
              <IconMinus size={14} strokeWidth={1.5} />
            </ActionIcon>
          )}
        >
          {staged.map((file) => (
            <GitFileRow
              key={file.path}
              file={file}
              statusCode={stagedStatusCode(file)}
              actionLabel="Unstage"
              actionIcon={<IconMinus size={14} strokeWidth={1.5} />}
              onAction={(target) => unstage([target])}
              disabled={busy}
            />
          ))}
        </GitChangesSection>
      )}

      {unstaged.length > 0 && (
        <GitChangesSection
          title="Changes"
          files={unstaged}
          testId="git-unstaged-changes"
          bulkAction={(
            <ActionIcon label="Stage all" size="sm" disabled={busy} onClick={() => stage(unstaged)} data-testid="git-stage-all">
              <IconPlus size={14} strokeWidth={1.5} />
            </ActionIcon>
          )}
        >
          {unstaged.map((file) => (
            <GitFileRow
              key={file.path}
              file={file}
              statusCode={unstagedStatusCode(file)}
              actionLabel="Stage"
              actionIcon={<IconPlus size={14} strokeWidth={1.5} />}
              onAction={(target) => stage([target])}
              disabled={busy}
            />
          ))}
        </GitChangesSection>
      )}
    </StyledWrapper>
  );
};

export default GitChangesList;
