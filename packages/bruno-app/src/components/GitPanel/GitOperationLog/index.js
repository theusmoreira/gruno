import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const GitOperationLog = ({ operationUid }) => {
  const progressData = useSelector((state) =>
    operationUid ? state.app.gitOperationProgress[operationUid]?.progressData : null
  );

  if (!progressData || progressData.length === 0) {
    return null;
  }

  return (
    <StyledWrapper data-testid="git-operation-log">
      <pre>{progressData.join('')}</pre>
    </StyledWrapper>
  );
};

export default GitOperationLog;
