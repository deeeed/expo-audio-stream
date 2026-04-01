'use strict';

module.exports = {
  'playground.agentic_ready': {
    description: 'The playground app is running with the agentic bridge installed.',
    async: false,
    expression: 'JSON.stringify(globalThis.__AGENTIC__?.getRoute() || null)',
    assert: { operator: 'not_null', field: 'pathname' },
    hint: 'Start the playground app in dev mode and confirm the bridge is loaded.',
    fixtures: {
      pass: '{"pathname":"/record","segments":["(tabs)","record"]}',
      fail: 'null',
    },
  },
  'playground.record_screen_visible': {
    description: 'The record screen wrapper is mounted and discoverable by testID.',
    async: false,
    expression:
      'JSON.stringify({ visible: !!globalThis.__AGENTIC__?.findFiberByTestId?.("record-screen-wrapper") })',
    assert: { operator: 'eq', field: 'visible', value: true },
    hint: 'Navigate to the record tab before running record-screen flows.',
    fixtures: {
      pass: '{"visible":true}',
      fail: '{"visible":false}',
    },
  },
};
