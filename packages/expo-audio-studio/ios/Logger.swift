class Logger {
    // Similar to Android's TAG_PREFIX for consistent cross-platform logging
    private static let TAG_PREFIX = "ExpoAudioStudio"
    
    static func debug(_ className: String, _ message: @autoclosure () -> String) {
        #if DEBUG
        print("[\(TAG_PREFIX):\(className)] [DEBUG] \(message())")
        #endif
    }

    static func info(_ className: String, _ message: @autoclosure () -> String) {
        print("[\(TAG_PREFIX):\(className)] [INFO] \(message())")
    }

    static func warn(_ className: String, _ message: @autoclosure () -> String) {
        print("[\(TAG_PREFIX):\(className)] [WARN] ⚠️ \(message())")
    }

    static func error(_ className: String, _ message: @autoclosure () -> String) {
        print("[\(TAG_PREFIX):\(className)] [ERROR] 🛑 \(message())")
    }
    
    // For backward compatibility with code that doesn't specify a class name
    static func debug(_ message: @autoclosure () -> String) {
        debug("General", message())
    }
    
    static func info(_ message: @autoclosure () -> String) {
        info("General", message())
    }
    
    static func warn(_ message: @autoclosure () -> String) {
        warn("General", message())
    }
    
    static func error(_ message: @autoclosure () -> String) {
        error("General", message())
    }
}
