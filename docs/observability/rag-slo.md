# RAG Service SLOs

This document defines initial SLOs for the RAG service and suggested alert thresholds.

## Latency (p50/p95/p99)

- Ingest total latency
  - p50 ≤ 300ms, p95 ≤ 800ms, p99 ≤ 1500ms
- Retrieve latency (embed + store query)
  - p50 ≤ 200ms, p95 ≤ 600ms, p99 ≤ 1200ms
- Reranker latency
  - p50 ≤ 250ms, p95 ≤ 700ms, p99 ≤ 1400ms

## Error Rate

- Overall error rate (5m rate): ≤ 1%
- Per-component error rate (5m rate): ≤ 2%

## Availability

- Monthly availability ≥ 99.9%

## Resource Utilization (guidance)

- CPU: average < 60%, spikes < 85% (5m)
- Memory RSS: average < 70% of container limit, spikes < 90%

## Alerting

- Warning when p95 exceeds SLO by 10% for 10 minutes
- Critical when p99 exceeds SLO by 20% for 10 minutes
- Warning when overall error rate ≥ 1% for 10 minutes
- Critical when overall error rate ≥ 2% for 10 minutes

## Notes

- Adjust thresholds based on production baselines; these are initial targets.
- Maintain separate SLOs for background batch ingest paths if applicable.
