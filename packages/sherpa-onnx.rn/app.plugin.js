const { createRunOncePlugin, withGradleProperties } = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-siteed-sherpa-onnx-rn';
const PICK_FIRST_PATTERN = '**/libonnxruntime.so';

function appendCsvValue(current, next) {
  const values = String(current || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values.includes(next)) {
    values.push(next);
  }

  return values.join(',');
}

function withSherpaOnnxAndroidPackaging(config) {
  return withGradleProperties(config, (config) => {
    const existing = config.modResults.find((item) => item.type === 'property' && item.key === 'android.packagingOptions.pickFirsts');

    if (existing) {
      existing.value = appendCsvValue(existing.value, PICK_FIRST_PATTERN);
      return config;
    }

    config.modResults.push({
      type: 'property',
      key: 'android.packagingOptions.pickFirsts',
      value: PICK_FIRST_PATTERN,
    });

    return config;
  });
}

module.exports = createRunOncePlugin(
  withSherpaOnnxAndroidPackaging,
  PLUGIN_NAME,
  require('./package.json').version
);
