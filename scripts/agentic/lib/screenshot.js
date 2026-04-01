'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { PNG } = require('pngjs');

function sanitizeFileSegment(value) {
  return String(value || 'unnamed')
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 80) || 'unnamed';
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, png) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function comparePngFiles(options) {
  const {
    actualPath,
    baselinePath,
    diffPath = '',
    maxDiffPixels = 0,
    maxDiffRatio = 0,
    pixelThreshold = 16,
  } = options;

  const actual = readPng(actualPath);
  const baseline = readPng(baselinePath);

  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return {
      pass: false,
      reason: 'dimension_mismatch',
      actualSize: {
        width: actual.width,
        height: actual.height,
      },
      baselineSize: {
        width: baseline.width,
        height: baseline.height,
      },
    };
  }

  const diffImage = new PNG({ width: actual.width, height: actual.height });
  let diffPixels = 0;
  const totalPixels = actual.width * actual.height;

  for (let i = 0; i < actual.data.length; i += 4) {
    const dr = Math.abs(actual.data[i] - baseline.data[i]);
    const dg = Math.abs(actual.data[i + 1] - baseline.data[i + 1]);
    const db = Math.abs(actual.data[i + 2] - baseline.data[i + 2]);
    const da = Math.abs(actual.data[i + 3] - baseline.data[i + 3]);
    const delta = Math.max(dr, dg, db, da);
    const changed = delta > pixelThreshold;

    if (changed) {
      diffPixels += 1;
      diffImage.data[i] = 255;
      diffImage.data[i + 1] = 61;
      diffImage.data[i + 2] = 92;
      diffImage.data[i + 3] = 255;
      continue;
    }

    const luminance = Math.round(
      baseline.data[i] * 0.299 +
        baseline.data[i + 1] * 0.587 +
        baseline.data[i + 2] * 0.114
    );
    const faded = Math.min(255, Math.round(luminance * 0.5 + 48));
    diffImage.data[i] = faded;
    diffImage.data[i + 1] = faded;
    diffImage.data[i + 2] = faded;
    diffImage.data[i + 3] = 255;
  }

  const diffRatio = totalPixels > 0 ? diffPixels / totalPixels : 0;
  const pass = diffPixels <= maxDiffPixels && diffRatio <= maxDiffRatio;

  if (diffPath) {
    writePng(diffPath, diffImage);
  }

  return {
    pass,
    reason: pass ? 'within_threshold' : 'diff_exceeded',
    diffPixels,
    diffRatio,
    maxDiffPixels,
    maxDiffRatio,
    pixelThreshold,
    width: actual.width,
    height: actual.height,
    diffPath: diffPath ? path.resolve(diffPath) : '',
  };
}

module.exports = {
  comparePngFiles,
  ensureParentDir,
  sanitizeFileSegment,
};
