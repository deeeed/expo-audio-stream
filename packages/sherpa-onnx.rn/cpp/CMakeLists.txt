cmake_minimum_required(VERSION 3.13)

# Define the library name
project(sherpa_onnx_rn)

# Create a minimal library that can be used to satisfy React Native's New Architecture requirements
add_library(
    sherpa_onnx_rn
    SHARED
    dummy/dummy.cpp
) 