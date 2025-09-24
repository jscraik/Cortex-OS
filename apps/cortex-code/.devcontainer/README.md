# Containerized Development

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

We provide the following options to facilitate Codex development in a container. This is particularly useful for verifying the Linux build when working on a macOS host.

## Docker

To build the Docker image locally for x64 and then run it with the repo mounted under `/workspace`:

```shell
CODEX_DOCKER_IMAGE_NAME=codex-linux-dev
docker build --platform=linux/amd64 -t "$CODEX_DOCKER_IMAGE_NAME" ./.devcontainer
docker run --platform=linux/amd64 --rm -it -e CARGO_TARGET_DIR=/workspace/codex-rs/target-amd64 -v "$PWD":/workspace -w /workspace/codex-rs "$CODEX_DOCKER_IMAGE_NAME"
```

Note that `/workspace/target` will contain the binaries built for your host platform, so we include `-e CARGO_TARGET_DIR=/workspace/codex-rs/target-amd64` in the `docker run` command so that the binaries built inside your container are written to a separate directory.

For arm64, specify `--platform=linux/amd64` instead for both `docker build` and `docker run`.

Currently, the `Dockerfile` works for both x64 and arm64 Linux, though you need to run `rustup target add x86_64-unknown-linux-musl` yourself to install the musl toolchain for x64.

## VS Code

VS Code recognizes the `devcontainer.json` file and gives you the option to develop Codex in a container. Currently, `devcontainer.json` builds and runs the `arm64` flavor of the container.

From the integrated terminal in VS Code, you can build either flavor of the `arm64` build (GNU or musl):

```shell
cargo build --target aarch64-unknown-linux-musl
cargo build --target aarch64-unknown-linux-gnu
```
