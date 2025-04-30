class Logger {
    static func debug(_ message: @autoclosure () -> String) {
        #if DEBUG
        print("[DEBUG] \(message())")
        #endif
    }

    static func info(_ message: @autoclosure () -> String) {
        print("[INFO] \(message())")
    }

    static func warn(_ message: @autoclosure () -> String) {
        print("[WARN] ⚠️ \(message())")
    }

    static func error(_ message: @autoclosure () -> String) {
        print("[ERROR] 🛑 \(message())")
    }
}
