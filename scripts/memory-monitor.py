#!/usr/bin/env python3
"""
Simple Android memory monitor - tracks Native Heap and Unknown memory over time
"""

import subprocess
import time
import sys
from datetime import datetime

def get_memory_info(package):
    """Get Native Heap and Unknown memory from dumpsys"""
    try:
        cmd = ['adb', 'shell', 'dumpsys', 'meminfo', package]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            return None
            
        native_heap = 0
        unknown = 0
        total = 0
        
        for line in result.stdout.split('\n'):
            # Look for the memory table format (no colons)
            if line.strip().startswith('Native Heap') and ':' not in line:
                parts = line.split()
                if len(parts) >= 3 and parts[2].isdigit():
                    native_heap = int(parts[2]) / 1024.0  # KB to MB
            elif line.strip().startswith('Unknown') and ':' not in line:
                parts = line.split()
                if len(parts) >= 2 and parts[1].isdigit():
                    unknown = int(parts[1]) / 1024.0
            elif line.strip().startswith('TOTAL') and ':' not in line:
                parts = line.split()
                if len(parts) >= 2 and parts[1].isdigit():
                    total = int(parts[1]) / 1024.0
        
        # Get unreachable memory
        unreachable = 0
        try:
            cmd_unreachable = ['adb', 'shell', 'dumpsys', 'meminfo', package, '--unreachable']
            result_unreachable = subprocess.run(cmd_unreachable, capture_output=True, text=True)
            
            if result_unreachable.returncode == 0:
                for line in result_unreachable.stdout.split('\n'):
                    if 'Unreachable memory' in line:
                        # Extract number from format like "Unreachable memory: 12,345 bytes"
                        parts = line.split(':')
                        if len(parts) > 1:
                            number_str = parts[1].strip().split()[0].replace(',', '')
                            if number_str.isdigit():
                                unreachable = int(number_str) / 1024.0 / 1024.0  # bytes to MB
                    
        except:
            pass
                    
        return native_heap, unknown, total, unreachable
    except:
        return None

def main():
    package = sys.argv[1] if len(sys.argv) > 1 else 'net.siteed.audioplayground.development'
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    
    print(f"Monitoring memory for: {package}")
    print(f"Interval: {interval}s")
    print("Press Ctrl+C to stop\n")
    
    start_time = datetime.now()
    initial_native = None
    initial_unknown = None
    initial_total = None
    initial_unreachable = None
    
    try:
        while True:
            result = get_memory_info(package)
            if result:
                native, unknown, total, unreachable = result
                elapsed = (datetime.now() - start_time).total_seconds()
                
                # Store initial values
                if initial_native is None:
                    initial_native = native
                    initial_unknown = unknown
                    initial_total = total
                    initial_unreachable = unreachable
                
                # Calculate changes
                native_change = native - initial_native
                unknown_change = unknown - initial_unknown
                total_change = total - initial_total
                unreachable_change = unreachable - initial_unreachable
                
                # Clear line and print
                print(f"\r[{elapsed:6.0f}s] Native: {native:6.1f}MB ({native_change:+5.1f}) | "
                      f"Unknown: {unknown:6.1f}MB ({unknown_change:+5.1f}) | "
                      f"Total: {total:6.1f}MB ({total_change:+5.1f}) | "
                      f"Unreachable: {unreachable:4.1f}MB ({unreachable_change:+4.1f})", end='', flush=True)
                
                # Warn if growing too fast
                if native_change > 20:
                    print("\n⚠️  Native Heap increased by >20MB!")
                elif native_change > 10:
                    print("\n⚠️  Native Heap increased by >10MB")
                    
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print(f"\n\nStopped after {(datetime.now() - start_time).total_seconds():.0f} seconds")
        if initial_native:
            print(f"Native Heap change: {native - initial_native:+.1f} MB")
            print(f"Unknown change: {unknown - initial_unknown:+.1f} MB")
            print(f"Total change: {total - initial_total:+.1f} MB")
            print(f"Unreachable change: {unreachable - initial_unreachable:+.1f} MB")

if __name__ == "__main__":
    main()