#import "EssentiaMinimal.h"
#import <React/RCTLog.h>

// Include our binary_function patch before any C++ headers
#include "../cpp/patches/binary_function_patch.h"

// Now include Essentia headers
#include <essentia/essentia.h>
#include <essentia/version.h>
#include <essentia/algorithmfactory.h>
#include <essentia/essentiamath.h>

#include <vector>
#include <string>

@implementation EssentiaMinimal

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (instancetype)init {
  if (self = [super init]) {
    // Initialize Essentia
    essentia::init();
  }
  return self;
}

- (void)dealloc {
  // Shut down Essentia
  essentia::shutdown();
}

RCT_EXPORT_METHOD(testEssentiaVersion:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // Get Essentia version
  std::string version = essentia::version;

  // Return as a string
  resolve([NSString stringWithUTF8String:version.c_str()]);
}

RCT_EXPORT_METHOD(testSimpleAlgorithm:(NSArray *)input
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  try {
    // Convert input array to vector
    std::vector<float> data;
    for (NSNumber *num in input) {
      data.push_back([num floatValue]);
    }

    // Create algorithm factory object
    essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

    // Create DCRemoval algorithm
    essentia::standard::Algorithm* dc = factory.create("DCRemoval");

    // Input/output vectors
    std::vector<float> signal(data), signalNoDC;

    // Connect input and output
    dc->input("signal").set(signal);
    dc->output("signal").set(signalNoDC);

    // Run the algorithm
    dc->compute();

    // Clean up
    delete dc;

    // Convert the output to NSArray
    NSMutableArray *result = [NSMutableArray arrayWithCapacity:signalNoDC.size()];
    for (size_t i = 0; i < signalNoDC.size(); i++) {
      [result addObject:@(signalNoDC[i])];
    }

    // Return the result
    resolve(result);

  } catch (const std::exception& e) {
    reject(@"essentia_error", [NSString stringWithUTF8String:e.what()], nil);
  }
}

// RCT_EXPORT_METHOD(getAlgorithmInfo:(nonnull NSString *)algorithm
//                   resolver:(nonnull RCTPromiseResolveBlock)resolve
//                   rejecter:(nonnull RCTPromiseRejectBlock)reject) {
//   try {
//     // Get the AlgorithmFactory instance
//     essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

//     // Check if the algorithm exists
//     std::vector<std::string> algos = factory.keys();
//     std::string algoName = [algorithm UTF8String];
//     if (std::find(algos.begin(), algos.end(), algoName) == algos.end()) {
//       reject(@"algorithm_not_found",
//              [NSString stringWithFormat:@"Algorithm '%@' does not exist", algorithm],
//              nil);
//       return;
//     }

//     // Create an instance of the algorithm
//     essentia::standard::Algorithm* algo = factory.create(algoName);

//     // Get inputs
//     NSMutableArray *inputsArray = [NSMutableArray array];
//     for (const auto& input : algo->inputs()) {
//       NSString *name = [NSString stringWithUTF8String:input.first.c_str()];
//       NSString *type = [NSString stringWithUTF8String:input.second->typeInfo().name()];
//       [inputsArray addObject:@{@"name": name, @"type": type}];
//     }

//     // Get outputs
//     NSMutableArray *outputsArray = [NSMutableArray array];
//     for (const auto& output : algo->outputs()) {
//       NSString *name = [NSString stringWithUTF8String:output.first.c_str()];
//       NSString *type = [NSString stringWithUTF8String:output.second->typeInfo().name()];
//       [outputsArray addObject:@{@"name": name, @"type": type}];
//     }

//     // Get default parameters
//     NSMutableDictionary *paramsDict = [NSMutableDictionary dictionary];
//     std::map<std::string, essentia::Parameter> params = algo->defaultParameters();
//     for (const auto& param : params) {
//       NSString *key = [NSString stringWithUTF8String:param.first.c_str()];
//       const essentia::Parameter& p = param.second;

//       // Map Parameter::Type to a string
//       NSString *type;
//       switch (p.type()) {
//         case essentia::Parameter::INT:
//           type = @"int";
//           break;
//         case essentia::Parameter::REAL:
//           type = @"real";
//           break;
//         case essentia::Parameter::STRING:
//           type = @"string";
//           break;
//         case essentia::Parameter::BOOL:
//           type = @"bool";
//           break;
//         default:
//           type = @"unknown";
//           break;
//       }

//       NSString *value = [NSString stringWithUTF8String:p.toString().c_str()];
//       paramsDict[key] = @{@"type": type, @"value": value};
//     }

//     // Construct the result dictionary
//     NSDictionary *result = @{
//       @"name": algorithm,
//       @"inputs": inputsArray,
//       @"outputs": outputsArray,
//       @"parameters": paramsDict
//     };

//     // Clean up
//     delete algo;

//     // Resolve the promise with the result
//     resolve(result);
//   } catch (const std::exception& e) {
//     reject(@"essentia_error", [NSString stringWithUTF8String:e.what()], nil);
//   }
// }

// RCT_EXPORT_METHOD(getAllAlgorithms:(RCTPromiseResolveBlock)resolve
//                   rejecter:(RCTPromiseRejectBlock)reject) {
//   try {
//     // Get the AlgorithmFactory instance
//     essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();
//     // Retrieve all algorithm names
//     std::vector<std::string> algos = factory.keys();

//     // Convert std::vector<std::string> to NSMutableArray of NSString
//     NSMutableArray *algorithmNames = [NSMutableArray arrayWithCapacity:algos.size()];
//     for (const auto& algo : algos) {
//       [algorithmNames addObject:[NSString stringWithUTF8String:algo.c_str()]];
//     }

//     // Resolve the promise with the array of algorithm names
//     resolve(algorithmNames);
//   } catch (const std::exception& e) {
//     // Reject the promise with the error message if something goes wrong
//     reject(@"essentia_error", [NSString stringWithUTF8String:e.what()], nil);
//   }
// }

@end