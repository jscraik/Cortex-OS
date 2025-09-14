---
title: Architecture
sidebar_label: Architecture
---

# Architecture

SimLab is composed of four core modules:

1. **SimRunner** - orchestrates the simulation triad of user simulator, agent adapter, and judge
2. **UserSimulator** - produces persona-driven prompts that model user behavior
3. **AgentAdapter** - bridges Cortex-OS PRP agents with the simulator
4. **Judge** - scores each turn for goal achievement, SOP adherence, brand alignment, and factual accuracy

Communication between components is synchronous and runs entirely in-process for deterministic behavior.

