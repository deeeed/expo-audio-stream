#!/usr/bin/env python3
"""Run a launch stage or poll its readiness, with a deadline and progress."""
import os
import signal
import subprocess
import sys
import time


def stop(process):
    if process.poll() is None:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=1)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()


def interrupted(_signal, _frame):
    raise InterruptedError("launch interrupted")


def main():
    mode, ceiling, label, *command = sys.argv[1:]
    started = time.monotonic()
    deadline = started + float(ceiling)
    last_error = ""
    next_progress = started
    while time.monotonic() < deadline:
        if time.monotonic() >= next_progress:
            print(f"[preflight] Waiting for {label}: {time.monotonic() - started:.1f}s / {ceiling}s", flush=True)
            next_progress = time.monotonic() + 10
        process = subprocess.Popen(command, start_new_session=True,
                                   stdout=subprocess.PIPE if mode == "poll" else None,
                                   stderr=subprocess.PIPE if mode == "poll" else None)
        try:
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    output, error = process.communicate(timeout=min(remaining, 10 if mode == "run" else 15))
                    if process.returncode == 0:
                        if output:
                            sys.stdout.buffer.write(output)
                        print(f"[preflight] PASS {label} ready after {time.monotonic() - started:.1f}s", flush=True)
                        return 0
                    if mode == "run":
                        return process.returncode
                    last_error = (error or output or b"").decode(errors="replace")[-2000:]
                    break
                except subprocess.TimeoutExpired:
                    if mode == "poll":
                        last_error = "readiness probe did not answer within 15 seconds"
                        break
                    print(f"[preflight] Waiting for {label}: {time.monotonic() - started:.1f}s / {ceiling}s", flush=True)
        finally:
            stop(process)
        if mode == "run":
            break
        time.sleep(min(0.5, max(0, deadline - time.monotonic())))
    print(f"[preflight] FAIL {label} did not become ready within {ceiling}s. {last_error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        sys.exit(main())
    except InterruptedError:
        sys.exit(130)
