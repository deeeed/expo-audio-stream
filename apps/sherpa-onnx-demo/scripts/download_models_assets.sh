#!/bin/bash

# start from the parent of scripts location
cd $(dirname $0)/..

# Download models and assets

# TTS Models

vits_icefall_en_ljspeech_low=https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-icefall-en_US-ljspeech-low.tar.bz2

# download all models to assets/models/
mkdir -p assets/models

# download all models to assets/models/
wget -P assets/models $vits_icefall_en_ljspeech_low
cd assets/models
tar -xvjf vits-icefall-en_US-ljspeech-low.tar.bz2
#cd vits-icefall-en_US-ljspeech-low
rm -rf vits-icefall-en_US-ljspeech-low.tar.bz2

