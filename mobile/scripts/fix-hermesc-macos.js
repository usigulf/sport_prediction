/**
 * RN 0.81 npm tarball ships osx-bin/hermes (compiler) but not osx-bin/hermesc.
 * Expo export / eas update resolve the compiler by name "hermesc", so linking fixes OTA builds on macOS.
 * Gatekeeper may block unsigned hermes; `xattr -cr` clears quarantine so local export / eas update can run.
 * @see https://github.com/facebook/react-native/blob/main/packages/react-native/sdks/hermesc
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const osxBin = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'sdks',
  'hermesc',
  'osx-bin'
);
const hermes = path.join(osxBin, 'hermes');
const hermesc = path.join(osxBin, 'hermesc');

function chmodPlusX(p) {
  try {
    const st = fs.statSync(p);
    fs.chmodSync(p, st.mode | 0o111);
  } catch {
    /* ignore */
  }
}

/** npm unpack sometimes drops +x on shell helpers → Permission denied in Xcode (codegen, script_phases, …). */
function chmodAllShUnder(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      chmodAllShUnder(p);
    } else if (e.isFile() && e.name.endsWith('.sh')) {
      chmodPlusX(p);
    }
  }
}

if (process.platform !== 'win32') {
  chmodAllShUnder(
    path.join(__dirname, '..', 'node_modules', 'react-native', 'scripts')
  );
}

// Xcode 14: StaticFeatureFlags::getFlag is patched non-constexpr (Podfile); this must not stay `if constexpr`.
const workletsAnim = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-worklets',
  'apple',
  'worklets',
  'apple',
  'AnimationFrameQueue.mm'
);
if (process.platform === 'darwin' && fs.existsSync(workletsAnim)) {
  try {
    let mm = fs.readFileSync(workletsAnim, 'utf8');
    if (
      !mm.includes('octobetiQ_xcode14_worklets_if_constexpr') &&
      mm.includes('if constexpr (worklets::StaticFeatureFlags::getFlag("IOS_DYNAMIC_FRAMERATE_ENABLED"))')
    ) {
      mm = mm.replace(
        'if constexpr (worklets::StaticFeatureFlags::getFlag("IOS_DYNAMIC_FRAMERATE_ENABLED")) {',
        'if (worklets::StaticFeatureFlags::getFlag("IOS_DYNAMIC_FRAMERATE_ENABLED")) { // octobetiQ_xcode14_worklets_if_constexpr'
      );
      fs.writeFileSync(workletsAnim, mm);
    }
  } catch {
    /* ignore */
  }
}

const rnrFf = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'Common',
  'cpp',
  'reanimated',
  'Tools',
  'FeatureFlags.h'
);
const rnrUrm = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'Common',
  'cpp',
  'reanimated',
  'Fabric',
  'updates',
  'UpdatesRegistryManager.cpp'
);
const rnrVectors = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'Common',
  'cpp',
  'reanimated',
  'CSS',
  'common',
  'transforms',
  'vectors.cpp'
);
const rnrDefs = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'Common',
  'cpp',
  'reanimated',
  'CSS',
  'common',
  'definitions.h'
);
const rnrValInterp = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'Common',
  'cpp',
  'reanimated',
  'CSS',
  'interpolation',
  'values',
  'ValueInterpolator.cpp'
);

if (process.platform === 'darwin') {
  try {
    if (fs.existsSync(rnrFf)) {
      let h = fs.readFileSync(rnrFf, 'utf8');
      if (
        !h.includes('octobetiQ_xcode14_feature_flags_constexpr_fix') &&
        h.includes('static constexpr bool getFlag(const std::string_view &name)')
      ) {
        h = h.replace(
          /  static constexpr bool getFlag\(const std::string_view &name\) \{\n    std::string nameStr/,
          '  static bool getFlag(const std::string_view &name) { // octobetiQ_xcode14_feature_flags_constexpr_fix\n    std::string nameStr'
        );
        fs.writeFileSync(rnrFf, h);
      }
    }
    if (fs.existsSync(rnrUrm)) {
      let u = fs.readFileSync(rnrUrm, 'utf8');
      if (
        !u.includes('octobetiQ_xcode14_reanimated_if_constexpr') &&
        u.includes('if constexpr (!StaticFeatureFlags::getFlag(')
      ) {
        u = u.replace(
          'if constexpr (!StaticFeatureFlags::getFlag(\n                    "DISABLE_COMMIT_PAUSING_MECHANISM"))',
          'if (!StaticFeatureFlags::getFlag(\n                    "DISABLE_COMMIT_PAUSING_MECHANISM")) // octobetiQ_xcode14_reanimated_if_constexpr'
        );
        fs.writeFileSync(rnrUrm, u);
      }
    }
    if (fs.existsSync(rnrVectors)) {
      let v = fs.readFileSync(rnrVectors, 'utf8');
      if (!v.includes('octobetiQ_xcode14_std_headers')) {
        v = v.replace(
          '#include <reanimated/CSS/common/transforms/vectors.h>\n',
          '#include <reanimated/CSS/common/transforms/vectors.h>\n#include <cmath> // octobetiQ_xcode14_std_headers\n'
        );
        fs.writeFileSync(rnrVectors, v);
      }
    }
    if (fs.existsSync(rnrDefs)) {
      let d = fs.readFileSync(rnrDefs, 'utf8');
      if (!d.includes('octobetiQ_xcode14_std_headers')) {
        d = d.replace(
          '#include <jsi/jsi.h>\n#include <string>\n',
          '#include <jsi/jsi.h>\n#include <array>\n#include <functional>\n#include <optional>\n#include <string>\n'
        );
        d = d.replace('#include <vector>\n', '#include <vector>\n// octobetiQ_xcode14_std_headers\n');
        fs.writeFileSync(rnrDefs, d);
      }
    }
    if (fs.existsSync(rnrValInterp)) {
      let vi = fs.readFileSync(rnrValInterp, 'utf8');
      if (
        !vi.includes('octobetiQ_xcode14_aggregate_emplace') &&
        vi.includes('keyframes_.emplace_back(offset, std::nullopt)')
      ) {
        vi = vi.replace(
          `  for (const auto &[offset, value] : parsedKeyframes) {
    if (value.isUndefined()) {
      keyframes_.emplace_back(offset, std::nullopt);
    } else {
      keyframes_.emplace_back(
          offset, std::make_optional(createValue(rt, value)));
    }
  }
`,
          `  for (const auto &[offset, value] : parsedKeyframes) {
    if (value.isUndefined()) {
      keyframes_.push_back(ValueKeyframe{offset, std::nullopt}); // octobetiQ_xcode14_aggregate_emplace
    } else {
      keyframes_.push_back(
          ValueKeyframe{offset, std::make_optional(createValue(rt, value))});
    }
  }
`
        );
        fs.writeFileSync(rnrValInterp, vi);
      }
    }
  } catch {
    /* ignore */
  }
}

if (process.platform !== 'darwin') {
  process.exit(0);
}

if (!fs.existsSync(hermes)) {
  process.exit(0);
}

chmodPlusX(hermes);

if (!fs.existsSync(hermesc)) {
  try {
    fs.symlinkSync('hermes', hermesc);
  } catch (e) {
    if (e && e.code !== 'EEXIST') {
      console.warn('[fix-hermesc-macos] could not symlink hermesc:', e.message);
    }
  }
}

chmodPlusX(hermesc);

// Clear quarantine so macOS does not show "cannot be opened because the developer cannot be verified"
if (fs.existsSync(osxBin)) {
  try {
    execSync(`xattr -cr "${osxBin}"`, { stdio: 'ignore' });
  } catch {
    /* ignore — user can allow once in System Settings → Privacy & Security */
  }
}
