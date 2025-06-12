# Storybook Quick Start

## Run Storybook
```bash
cd packages/expo-audio-ui && yarn storybook
# http://localhost:6068
```

## For Agents
```bash
# Review the plan and choose a path
cursor docs/AGENT_STORYBOOK_UPGRADE_PLAN.md
```

## Component Status
✅ **Working**: DecibelGauge, AnimatedCandle  
⚠️ **Needs Stories**: RecordButton, AudioVisualizer, Waveform, DecibelMeter, AudioTimeRangeSelector

## Future Commands (Not Yet Implemented)
```bash
yarn agent:story <component>          # Validate component
yarn agent:story:visual <component>   # Visual regression
yarn agent:story:all                  # Test all components
``` 