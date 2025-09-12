# Deployment Guide

Integrate gates into CI pipelines to block regressions:

1. Install dependencies in the build environment.
2. Generate or load the gate configuration.
3. Execute a script that calls `runGate` and fails the job if `pass` is false.

Containerized environments should mount required datasets and inject provider secrets at runtime.
