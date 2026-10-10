#!/usr/bin/env python3
"""Run a launch stage or poll its readiness, with a deadline and progress."""
import os
import signal
import subprocess
import sys
import time


def signal_group(process, sig):
    try:
        os.killpg(process.pid, sig)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        # Darwin can report EPERM for an empty group after its leader is reaped.
        if process.poll() is None:
            raise
        return False


def stop(process):
    signal_group(process, signal.SIGTERM)
    grace = time.monotonic() + 1
    while time.monotonic() < grace and signal_group(process, 0):
        process.poll()
        time.sleep(0.05)
    signal_group(process, signal.SIGKILL)
    process.wait()


def interrupted(_signal, _frame):
    raise InterruptedError("launch interrupted")


def progress(label, started, ceiling):
    print(f"[preflight] Waiting for {label}: {time.monotonic() - started:.1f}s / {ceiling}s", flush=True)


def command_result(command, mode, deadline, label, started, ceiling):
    process = subprocess.Popen(command, start_new_session=True,
                               stdout=subprocess.PIPE if mode == "poll" else None,
                               stderr=subprocess.PIPE if mode == "poll" else None)
    finished = False
    try:
        while time.monotonic() < deadline:
            remaining = deadline - time.monotonic()
            try:
                output, error = process.communicate(timeout=min(remaining, 10))
                finished = True
                return process.returncode, output or b"", error or b""
            except subprocess.TimeoutExpired:
                progress(label, started, ceiling)
        return 124, b"", b"readiness command exceeded its deadline"
    finally:
        if not finished:
            stop(process)


def wait_ready(mode, ceiling, label, command):
    started = time.monotonic()
    deadline = started + float(ceiling)
    last_error = ""
    next_progress = started
    while time.monotonic() < deadline:
        if time.monotonic() >= next_progress:
            progress(label, started, ceiling)
            next_progress = time.monotonic() + 10
        probe_deadline = min(deadline, time.monotonic() + 15) if mode == "poll" else deadline
        code, output, error = command_result(command, mode, probe_deadline, label, started, ceiling)
        if code == 0:
            sys.stdout.buffer.write(output)
            print(f"[preflight] PASS {label} ready after {time.monotonic() - started:.1f}s", flush=True)
            return 0
        last_error = (error or output).decode(errors="replace")[-2000:]
        if mode == "run":
            break
        time.sleep(min(0.5, max(0, deadline - time.monotonic())))
    print(f"[preflight] FAIL {label} did not become ready within {ceiling}s. {last_error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        sys.exit(wait_ready(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]))
    except InterruptedError:
        sys.exit(130)
