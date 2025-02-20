//
//  FFT.swift
//  Pods
//
//  Created by Arthur Breton on 20/2/2025.
//

import Accelerate

class FFT {
    private let length: Int
    private var setup: vDSP_DFT_Setup?
    
    init(_ length: Int) {
        self.length = length
        self.setup = vDSP_DFT_zop_CreateSetup(
            nil,
            vDSP_Length(length),
            vDSP_DFT_Direction.FORWARD
        )
    }
    
    deinit {
        if let setup = setup {
            vDSP_DFT_DestroySetup(setup)
        }
    }
    
    func realForward(_ data: inout [Float]) {
        var realIn = data
        var imagIn = [Float](repeating: 0.0, count: length)
        var realOut = [Float](repeating: 0.0, count: length)
        var imagOut = [Float](repeating: 0.0, count: length)
        
        // Perform FFT
        vDSP_DFT_Execute(setup!,
                        &realIn,
                        &imagIn,
                        &realOut,
                        &imagOut)
        
        // Combine real and imaginary parts
        for i in 0..<length {
            data[2*i] = realOut[i]
            if 2*i + 1 < data.count {
                data[2*i + 1] = imagOut[i]
            }
        }
    }
    
    func processSegment(_ segment: [Float]) -> [Float] {
        var fftData = segment.count < length ?
            segment + [Float](repeating: 0, count: length - segment.count) :
            Array(segment.prefix(length))
        realForward(&fftData)
        return fftData
    }
}
