import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'ui/Button';
import { openGitDiffTab } from 'providers/ReduxStore/slices/git/actions';
import SegmentedControl from 'ui/SegmentedControl';
import VisualDiffContent from 'components/Git/VisualDiffViewer/VisualDiffContent';
import { formatIpcError } from 'utils/common/error';
import { visualDiffSections, sectionHasChanges, hasVisualChanges } from './visualDiffSections';
import GitPatchView from './GitPatchView';
import StyledWrapper from './StyledWrapper';

const CHANGE_LABELS = {
  staged: { old: 'Last commit', new: 'Staged' },
  unstaged: { old: 'Before', new: 'Working copy' }
};

const useGitFileDiff = (collectionPath, gitDiff, refreshKey) => {
  const [result, setResult] = useState({ loading: true, diff: null, error: null });

  // Re-read the diff whenever the panel refreshes the Git status, so an open tab follows saves and commits.
  useEffect(() => {
    let cancelled = false;
    setResult((previous) => ({ ...previous, loading: true }));
    window.ipcRenderer
      .invoke('renderer:git-file-diff', { collectionPath, file: gitDiff.path, changeType: gitDiff.changeType })
      .then((diff) => !cancelled && setResult({ loading: false, diff, error: null }))
      .catch((error) => !cancelled && setResult({ loading: false, diff: null, error: formatIpcError(error) }));
    return () => {
      cancelled = true;
    };
  }, [collectionPath, gitDiff.path, gitDiff.changeType, refreshKey]);

  return result;
};

const OTHER_CHANGE_TYPE = { staged: 'unstaged', unstaged: 'staged' };

const GitDiffTab = ({ collection, gitDiff }) => {
  const dispatch = useDispatch();
  const refreshKey = useSelector((state) => state.git.byCollection[collection.uid]?.lastRefreshedAt);
  const otherChangeType = OTHER_CHANGE_TYPE[gitDiff.changeType];
  const hasOtherChanges = useSelector((state) =>
    Boolean(state.git.byCollection[collection.uid]?.[otherChangeType]?.some((file) => file.path === gitDiff.path))
  );
  const { loading, diff, error } = useGitFileDiff(collection.pathname, gitDiff, refreshKey);
  const [selectedView, setSelectedView] = useState(null);

  const canShowVisual = Boolean(diff && (diff.oldParsed || diff.newParsed));
  const view = selectedView || (canShowVisual ? 'visual' : 'text');
  const labels = CHANGE_LABELS[gitDiff.changeType];

  const renderBody = () => {
    if (error) {
      return <div className="git-diff-notice git-diff-error" data-testid="git-diff-error">{error}</div>;
    }
    if (!diff) {
      return loading ? <div className="git-diff-notice">Loading diff…</div> : null;
    }
    if (diff.isTooLarge) {
      return <div className="git-diff-notice">This diff is too large to display. Review it from the terminal.</div>;
    }
    if (!diff.patch) {
      return (
        <div className="flex flex-col items-start gap-2" data-testid="git-diff-empty">
          <div className="git-diff-notice">No {gitDiff.changeType} changes in this file.</div>
          {hasOtherChanges && (
            <Button
              size="sm"
              variant="outline"
              color="secondary"
              onClick={() => dispatch(openGitDiffTab(collection.uid, { path: gitDiff.path }, otherChangeType))}
              data-testid="git-diff-open-other"
            >
              Show {otherChangeType} changes
            </Button>
          )}
        </div>
      );
    }
    if (view === 'visual') {
      if (!hasVisualChanges(diff.oldParsed, diff.newParsed)) {
        return (
          <div className="git-diff-notice" data-testid="git-diff-no-visual-changes">
            The URL, parameters, headers, auth and body did not change. See the Text view for the full change.
          </div>
        );
      }
      return (
        <VisualDiffContent
          oldData={diff.oldParsed}
          newData={diff.newParsed}
          sections={visualDiffSections}
          sectionHasChanges={sectionHasChanges}
          oldLabel={labels.old}
          newLabel={labels.new}
          hideUnchanged
        />
      );
    }
    return <GitPatchView patch={diff.patch} />;
  };

  return (
    <StyledWrapper data-testid="git-diff-tab">
      <div className="git-diff-header">
        <div className="git-diff-title">
          <span className="git-diff-path" title={gitDiff.path}>{gitDiff.path}</span>
          <span className="git-diff-change-type">{gitDiff.changeType === 'staged' ? 'Staged' : 'Not staged'}</span>
        </div>
        <SegmentedControl
          ariaLabel="Diff view"
          name="git-diff-view"
          size="sm"
          value={view}
          onChange={setSelectedView}
          items={[
            { value: 'visual', label: 'Visual', disabled: !canShowVisual },
            { value: 'text', label: 'Text' }
          ]}
          data-testid="git-diff-view"
        />
      </div>
      <div className="git-diff-body">{renderBody()}</div>
    </StyledWrapper>
  );
};

export default GitDiffTab;
