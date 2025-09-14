---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting Guide

## "Security report file not found"

Check the path passed to `check-policy.js` and ensure the report exists.

## "Malformed JSON"

Confirm Semgrep ran with `--json` and the output file is complete.

## Policy fails unexpectedly

Inspect threshold env vars or CLI flags and review counts in the report.
