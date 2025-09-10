{
  description = "Dev shells for Cortex-OS (Rust nightly + node)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ rust-overlay.overlays.default ];
        pkgs = import nixpkgs { inherit system overlays; };
        rust = pkgs.rust-bin.nightly.latest.default;
      in
      {
        devShells.default = pkgs.mkShell {
          name = "cortex-os-dev";
          packages = [
            rust
            pkgs.cargo
            pkgs.pkg-config
            pkgs.openssl
            pkgs.nodejs_22
            pkgs.pnpm
          ];
          shellHook = ''
            echo "[cortex-os] Dev shell (nightly rust + node)"
            rustc --version || true
            node --version || true
            pnpm --version || true
          '';
        };
      }
    );
}
