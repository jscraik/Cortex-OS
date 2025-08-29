#!/usr/bin/env bash
# Helper script to sign artifacts locally using cosign (OIDC or key file)
set -euo pipefail

ARTIFACTS=("pnpm-lock.yaml" "pnpm-lock.yaml.sig")

usage(){
  cat <<EOF
Usage: $0 [sign|verify] [artifact]

Requires cosign installed. For OIDC signing, set COSIGN_EXPERIMENTAL=1 and have 'cosign' configured.
You can also use key-pair mode with COSIGN_PASSWORD and COSIGN_KEY.
EOF
}

if [ "$#" -lt 1 ]; then
  usage
  exit 2
fi

CMD=$1
ART=${2:-pnpm-lock.yaml}

case "$CMD" in
  sign)
    if ! command -v cosign >/dev/null 2>&1; then
      echo "cosign not found"
      exit 1
    fi
    echo "Signing $ART"
    cosign sign --output-signature "$ART.sig" "$ART"
    echo "Signed: $ART.sig"
    ;;
  verify)
    if ! command -v cosign >/dev/null 2>&1; then
      echo "cosign not found"
      exit 1
    fi
    if [ -z "${COSIGN_PUBKEY:-}" ]; then
      echo "Set COSIGN_PUBKEY env to the public key file or value"
      exit 2
    fi
    cosign verify-blob --key "$COSIGN_PUBKEY" --signature "$ART.sig" "$ART"
    ;;
  *)
    usage
    exit 2
    ;;
esac
