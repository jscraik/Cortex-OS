{
  description = "Dev shell for cortex-code (nightly Rust 2024 edition)";

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
        # Nightly toolchain matching rust-toolchain.toml
        rust = pkgs.rust-bin.nightly.latest.default;
      in
      {
        devShells.default = pkgs.mkShell {
          name = "cortex-code-dev";
          packages = [
            rust
            pkgs.cargo
            pkgs.pkg-config
            pkgs.openssl
          ];
          shellHook = ''
            echo "[cortex-code] Nightly dev shell active"
            rustc --version || true
            cargo --version || true
          '';
        };
      }
    );
}
