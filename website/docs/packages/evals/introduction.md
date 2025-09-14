---
title: Introduction
sidebar_label: Introduction
---

# Introduction

`@cortex-os/evals` is a lightweight toolkit for validating AI features before rollout. It answers a single question: *does this feature meet the minimum quality bar?*

The package ships evaluation suites that measure retrieval accuracy and router responsiveness. Integrators can plug in their own embedders, memory stores and router implementations while relying on a consistent pass/fail gate.
