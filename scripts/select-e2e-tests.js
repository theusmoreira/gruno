#!/usr/bin/env node
/*
 * Picks the Playwright specs worth running on a pull request from the files it changes.
 *
 * Reads the changed paths (one per line) on stdin and prints JSON:
 *   { "mode": "full" }                         run the whole suite
 *   { "mode": "focused", "specs": [...] }      run these spec files/directories
 *
 * The nightly run covers the whole suite, so a pull request only needs the areas it touches plus a
 * small smoke set that always runs.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SMOKE_SPECS = [
  'tests/start',
  'tests/git',
  'tests/collection/create',
  'tests/collection/create-requests',
  'tests/environments/create-environment'
];

// Changes here affect every spec, so a focused run would prove nothing.
const FULL_SUITE_TRIGGERS = [
  /^playwright\//,
  /^playwright\.config\.ts$/,
  /^tests\/utils\//,
  /^package-lock\.json$/,
  /^packages\/bruno-tests\//
];

// Source path patterns (matched case-insensitively) and the e2e areas that exercise them.
const AREA_RULES = [
  [/git/i, ['tests/git', 'tests/collection/git', 'tests/collection/zip-git-metadata', 'tests/workspace/git-backed-collections']],
  [/environment/i, ['tests/environments']],
  [/variable/i, ['tests/variables-tab', 'tests/variable-tooltip', 'tests/variable-datatypes', 'tests/set-as-variable', 'tests/unresolved-variables-info']],
  [/interpolat/i, ['tests/interpolation']],
  [/runner/i, ['tests/runner']],
  [/import|converters/i, ['tests/import']],
  [/export/i, ['tests/export']],
  [/preferences/i, ['tests/preferences']],
  [/sidebar/i, ['tests/sidebar']],
  [/workspace/i, ['tests/workspace']],
  [/graphql/i, ['tests/graphql']],
  [/grpc|protobuf/i, ['tests/grpc', 'tests/protobuf']],
  [/websocket/i, ['tests/websockets']],
  [/(^|[/-])sse([/.-]|$)/i, ['tests/sse']],
  [/cookie/i, ['tests/cookies']],
  [/devtools/i, ['tests/devtools']],
  [/hotkey|shortcut/i, ['tests/shortcuts']],
  [/snapshot/i, ['tests/snapshots']],
  [/codemirror|codeeditor/i, ['tests/code-editor', 'tests/codeeditor-state', 'tests/codemirror-linkaware', 'tests/autocomplete']],
  [/responsepane|response-example|responseexample/i, ['tests/response', 'tests/response-examples']],
  [/requestpane|requesttab/i, ['tests/request']],
  [/script|bruno-js/i, ['tests/scripting', 'tests/script-errors']],
  [/dotenv/i, ['tests/dotenv']],
  [/proxy/i, ['tests/proxy']],
  [/onboarding/i, ['tests/onboarding']],
  [/mock-?server/i, ['tests/mock-server']],
  [/statusbar|footer/i, ['tests/footer']],
  [/collectionsettings|foldersettings/i, ['tests/collection', 'tests/folder']]
];

const SPEC_FILE = /\.spec\.(ts|js)$/;

const hasSpecs = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).some((entry) => entry.isFile() && SPEC_FILE.test(entry.name));

// A changed fixture or helper inside tests/ selects the nearest directory that holds specs.
const specsForTestFile = (file) => {
  if (SPEC_FILE.test(file)) {
    return fs.existsSync(path.join(ROOT, file)) ? file : null;
  }
  let directory = path.posix.dirname(file);
  while (directory !== 'tests' && directory !== '.') {
    const absolute = path.join(ROOT, directory);
    if (fs.existsSync(absolute) && hasSpecs(absolute)) {
      return directory;
    }
    directory = path.posix.dirname(directory);
  }
  return null;
};

const selectE2eTests = (changedFiles) => {
  if (changedFiles.some((file) => FULL_SUITE_TRIGGERS.some((pattern) => pattern.test(file)))) {
    return { mode: 'full' };
  }

  const specs = new Set(SMOKE_SPECS);
  for (const file of changedFiles) {
    if (file.startsWith('tests/')) {
      const spec = specsForTestFile(file);
      if (spec) {
        specs.add(spec);
      }
    } else if (file.startsWith('packages/')) {
      AREA_RULES.filter(([pattern]) => pattern.test(file)).forEach(([, areas]) => areas.forEach((area) => specs.add(area)));
    }
  }

  const existing = [...specs].filter((spec) => fs.existsSync(path.join(ROOT, spec)));
  // A parent directory already runs everything below it.
  const specsToRun = existing.filter((spec) => !existing.some((other) => other !== spec && spec.startsWith(`${other}/`)));
  return { mode: 'focused', specs: specsToRun.sort() };
};

if (require.main === module) {
  const changedFiles = fs.readFileSync(0, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean);
  process.stdout.write(JSON.stringify(selectE2eTests(changedFiles)));
}

module.exports = { selectE2eTests };
