/*
 * Copyright 2011 The Emscripten Authors.  All rights reserved.
 * Emscripten is available under two separate licenses, the MIT license and the
 * University of Illinois/NCSA Open Source License.  Both these licenses can be
 * found in the LICENSE file.
 */

#include <stdio.h>

// emcc cpp/hello.cpp -o public/wasm/hello.js  -s WASM=1 -O1
int main() {
    printf("hello, world!\n");
    return 0;
}