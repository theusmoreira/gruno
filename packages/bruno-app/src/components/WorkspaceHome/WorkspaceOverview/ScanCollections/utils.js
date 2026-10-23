import { normalizePath } from 'utils/common/path';

export const formatScanSummary = (summary) => {
  if (!summary) return '';
  return `${summary.found || 0} found, ${summary.added || 0} added, ${summary.alreadyExisted || 0} already existed`;
};

export const hasScanDetails = (summary) => {
  return !!summary && ((summary.problems || []).length > 0 || (summary.absent || []).length > 0);
};

export const getAbsentPaths = (summary) => {
  return new Set(((summary && summary.absent) || []).map((item) => normalizePath(item.path)));
};

// A collection is absent when the workspace lists it but its folder is gone from disk
// (the unopenable list) or the last scan reported it as absent.
export const isCollectionAbsent = (collection, absentPaths) => {
  if (!collection) return false;
  if (collection.failedToOpen) return true;
  return !!collection.pathname && !!absentPaths && absentPaths.has(normalizePath(collection.pathname));
};
