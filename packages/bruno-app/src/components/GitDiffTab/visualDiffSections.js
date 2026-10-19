import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import VisualDiffUrlBar from 'components/Git/VisualDiffViewer/VisualDiffUrlBar';
import VisualDiffParams from 'components/Git/VisualDiffViewer/VisualDiffParams';
import VisualDiffHeaders from 'components/Git/VisualDiffViewer/VisualDiffHeaders';
import VisualDiffAuth from 'components/Git/VisualDiffViewer/VisualDiffAuth';
import VisualDiffBody from 'components/Git/VisualDiffViewer/VisualDiffBody';

const sectionDataPaths = {
  url: ['request.url', 'request.method'],
  params: ['request.params'],
  headers: ['request.headers'],
  auth: ['request.auth'],
  body: ['request.body']
};

const hasItems = (value) => Array.isArray(value) && value.length > 0;

export const visualDiffSections = [
  {
    key: 'url',
    title: 'URL',
    Component: VisualDiffUrlBar,
    hasContent: (data) => Boolean(data?.request?.url || data?.request?.method)
  },
  {
    key: 'params',
    title: 'Parameters',
    Component: VisualDiffParams,
    hasContent: (data) => hasItems(data?.request?.params)
  },
  {
    key: 'headers',
    title: 'Headers',
    Component: VisualDiffHeaders,
    hasContent: (data) => hasItems(data?.request?.headers)
  },
  {
    key: 'auth',
    title: 'Authentication',
    Component: VisualDiffAuth,
    hasContent: (data) => Boolean(data?.request?.auth?.mode && data.request.auth.mode !== 'none')
  },
  {
    key: 'body',
    title: 'Body',
    Component: VisualDiffBody,
    hasContent: (data) => Boolean(data?.request?.body?.mode && data.request.body.mode !== 'none')
  }
];

export const sectionHasChanges = (sectionKey, oldData, newData) =>
  sectionDataPaths[sectionKey].some((dataPath) => !isEqual(get(oldData, dataPath), get(newData, dataPath)));

export const hasVisualChanges = (oldData, newData) =>
  visualDiffSections.some(({ key }) => sectionHasChanges(key, oldData, newData));
