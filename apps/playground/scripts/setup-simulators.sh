#!/bin/bash

# Define the simulators and their types
simulator_names=("iPhone 13 Pro Max" "iPhone 8 Plus" "iPad Pro (12.9-inch) (6th generation)")
simulator_types=("com.apple.CoreSimulator.SimDeviceType.iPhone-13-Pro-Max" "com.apple.CoreSimulator.SimDeviceType.iPhone-8-Plus" "com.apple.CoreSimulator.SimDeviceType.iPad-Pro-12-9-inch-6th-generation-8GB")

# Define the runtime you want to use
runtime="com.apple.CoreSimulator.SimRuntime.iOS-15-0"

# Check if the simulator exists
function simulator_exists {
    local name=$1
    xcrun simctl list devices | grep -q "$name"
    return $?
}

# Create the simulator
function create_simulator {
    local name=$1
    local type=$2
    echo "Creating simulator $name..."
    xcrun simctl create "$name" "$type" "$runtime"
}

# Main loop to check and create simulators
for index in "${!simulator_names[@]}"; do
    name="${simulator_names[$index]}"
    type="${simulator_types[$index]}"
    if simulator_exists "$name"; then
        echo "Simulator $name already exists."
    else
        create_simulator "$name" "$type"
    fi
done
