class CortexCode < Formula
  desc "Terminal UI for Cortex-OS AI coding agent"
  homepage "https://github.com/jamiescottcraik/Cortex-OS"
  url "https://github.com/jamiescottcraik/Cortex-OS/releases/download/v0.1.0/cortex-code-x86_64-apple-darwin.tar.gz"
  sha256 "INSERT_SHA256_HERE"
  version "0.1.0"
  license "Apache-2.0"

  bottle :unneeded

  def install
    bin.install "cortex-code"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/cortex-code --version")
  end
end
