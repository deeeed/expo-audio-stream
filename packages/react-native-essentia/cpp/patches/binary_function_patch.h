#pragma once

#define BINARY_FUNCTION_PATCH_APPLIED

// Define std::binary_function for C++17 and above
namespace std {
    template <class Arg1, class Arg2, class Result>
    struct binary_function {
        typedef Arg1 first_argument_type;
        typedef Arg2 second_argument_type;
        typedef Result result_type;
    };
}
