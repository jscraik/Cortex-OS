# Rendered by render-config.mjs. Do not edit the rendered file directly.

prometheus.exporter.self "alloy_check" {}

discovery.relabel "alloy_check" {
  targets = prometheus.exporter.self.alloy_check.targets

  rule { target_label = "instance" replacement = constants.hostname }
  rule { target_label = "alloy_hostname" replacement = constants.hostname }
  rule { target_label = "job" replacement = "integrations/alloy-check" }
}

prometheus.scrape "alloy_check" {
  targets         = discovery.relabel.alloy_check.output
  forward_to      = [prometheus.relabel.alloy_check.receiver]
  scrape_interval = "${SCRAPE_INTERVAL}"
}

prometheus.relabel "alloy_check" {
  forward_to = [prometheus.remote_write.metrics_service.receiver]
  rule {
    source_labels = ["__name__"]
    regex         = "(alloy_build.*|process_start_time_seconds|prometheus_remote_write_wal_samples_appended_total)"
    action        = "keep"
  }
}

// Cortex-OS gateway metrics
prometheus.scrape "cortex_gateway" {
  targets = [
    {
      __address__ = "${GATEWAY_ADDR}"
      job         = "cortex/gateway"
    }
  ]
  metrics_path    = "/metrics"
  scrape_interval = "${SCRAPE_INTERVAL}"
  forward_to      = [prometheus.relabel.cortex_gateway.receiver]
}

prometheus.relabel "cortex_gateway" {
  forward_to = [prometheus.remote_write.metrics_service.receiver]
  rule {
    source_labels = ["__name__"]
    regex         = "(http_request_duration_ms|http_request_errors_total)"
    action        = "keep"
  }
  rule {
    target_label = "instance"
    replacement  = constants.hostname
  }
}

prometheus.remote_write "metrics_service" {
  endpoint {
    url = "${GCLOUD_HOSTED_METRICS_URL}"
    basic_auth {
      username = "${GCLOUD_HOSTED_METRICS_ID}"
      password = "${GCLOUD_RW_API_KEY}"
    }
  }
}

