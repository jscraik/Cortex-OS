# Hugging Face cache migration

This document explains how to migrate legacy Hugging Face cache directories named `models--*` into the newer `hub/` layout and how to run the included migration helper.

## Migration script

Path: `scripts/hf/migrate_models_to_hub.sh`

Summary:

- Safely merges any `models--*` directories from a source huggingface cache directory into a `hub/` subdirectory.
- Uses `rsync` to preserve file attributes and avoid data loss.
- Removes empty source directories after successful transfer.

Usage examples:

Dry-run (no changes):

```bash
./scripts/hf/migrate_models_to_hub.sh --dry-run
```

Actual migration (default source on macOS external SSD setup):

```bash
./scripts/hf/migrate_models_to_hub.sh
```

Override source/dest:

```bash
./scripts/hf/migrate_models_to_hub.sh --source /path/to/hf --dest /path/to/hf/hub
```

## Scheduling

You can run the script periodically using either `cron` or macOS `launchd`. See `scripts/hf/cron.example` and `scripts/hf/migrate.models.launchd.plist` examples.

## Integrity checks

To verify transferred files you can compute checksums for a model directory:

```bash
find /path/to/hub/models--<name> -type f -print0 | sort -z | xargs -0 sha256sum > model-checksums.sha256
```

## Contact

If anything looks wrong, open an issue in this repo or contact the maintainer.
