========================

# CODE SNIPPETS

TITLE: Incomplete Editable Install Syntax
DESCRIPTION: Illustrates an example of an incomplete or unterminated syntax for an editable install with extras, which may lead to installation errors.

SOURCE: https://github.com/astral-sh/uv/blob/main/crates/uv-requirements-txt/test-data/requirements-txt/editable.txt#_snippet_1

LANGUAGE: python
CODE:

```
pip install -e ./editable[d
```

---

TITLE: Create new GitHub repository with gh CLI
DESCRIPTION: Demonstrates how to quickly create a new GitHub repository using the `gh` command-line interface. The `--clone` flag ensures that the repository is cloned locally immediately after creation, streamlining the setup process for a new reproduction.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/troubleshooting/reproducible-examples.md#_snippet_7

LANGUAGE: console
CODE:

```
$ gh repo create uv-mre-1234 --clone
```

---

TITLE: uv Docker Installation Guide Updates
DESCRIPTION: Updates and improvements to the Docker installation guide for uv, including specific instructions for projects and certificate handling.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.3.x.md#_snippet_14

LANGUAGE: APIDOC
CODE:

```
Docker Guide:
  - Improvements to the Docker installation guide.
  - Update Docker guide for projects.
  - Install `ca-certificates` in docker and use pipefail.
```

---

TITLE: Install uv (macOS/Linux)
DESCRIPTION: Installs uv using a standalone installer script downloaded via curl or wget.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_0

LANGUAGE: console
CODE:

```
$ curl -LsSf https://astral.sh/uv/install.sh | sh
```

LANGUAGE: console
CODE:

```
$ wget -qO- https://astral.sh/uv/install.sh | sh
```

---

TITLE: Install uv via PyPI with pip
DESCRIPTION: Installs uv using the standard pip package installer.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_7

LANGUAGE: console
CODE:

```
$ pip install uv
```

---

TITLE: Python API: Install packages
DESCRIPTION: Example of using the uv Python API to install packages.

SOURCE: https://github.com/astral-sh/uv/blob/main/crates/uv-requirements-txt/test-data/requirements-txt/empty.txt#_snippet_5

LANGUAGE: python
CODE:

```
from uv import install

install(["requests"])
```

---

TITLE: Python API: Install packages
DESCRIPTION: Example of using the uv Python API to install packages.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/hatchling_editable/README.md#_snippet_5

LANGUAGE: python
CODE:

```
from uv import install

install(["requests"])
```

---

TITLE: View uv Installer Help
DESCRIPTION: Executes the uv installation script with the --help flag to display available command-line options and arguments. This is useful for understanding all customization possibilities beyond environment variables.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/installer.md#_snippet_4

LANGUAGE: console
CODE:

```
curl -LsSf https://astral.sh/uv/install.sh | sh -s -- --help
```

---

TITLE: Automatic Python Download Example
DESCRIPTION: Demonstrates uv's automatic Python download feature. If Python 3.12 is not installed, uv will download it before executing the command.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/install-python.md#_snippet_7

LANGUAGE: console
CODE:

```
$ uvx python@3.12 -c "print('hello world')"
```

---

TITLE: Python API: Install packages
DESCRIPTION: Example of using the uv Python API to install packages.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/dependent_locals/first_local/README.md#_snippet_5

LANGUAGE: python
CODE:

```
from uv import install

install(["requests"])
```

---

TITLE: Python API: Install packages
DESCRIPTION: Example of using the uv Python API to install packages.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/dependent_locals/second_local/README.md#_snippet_5

LANGUAGE: python
CODE:

```
from uv import install

install(["requests"])
```

---

TITLE: Python API: Install packages
DESCRIPTION: Example of using the uv Python API to install packages.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/root_editable/README.md#_snippet_5

LANGUAGE: python
CODE:

```
from uv import install

install(["requests"])
```

---

TITLE: Install uv using the Installer Script in Dockerfile
DESCRIPTION: This Dockerfile example demonstrates installing uv using its official installer script. It first installs `curl` and `ca-certificates` to enable downloading the script and the release archive, then executes the installer and cleans up the script.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/docker.md#_snippet_2

LANGUAGE: dockerfile
CODE:

```
FROM python:3.12-slim-trixie

# The installer requires curl (and certificates) to download the release archive
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates

# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh
```

---

TITLE: Install uv (Windows)
DESCRIPTION: Installs uv using a standalone PowerShell script downloaded and executed via irm and iex.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_2

LANGUAGE: pwsh-session
CODE:

```
PS> powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

TITLE: Verify uv Installation
DESCRIPTION: This snippet demonstrates running the `uv` command to verify its installation. It shows the initial help output, confirming that uv is accessible and providing a list of available commands.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/first-steps.md#_snippet_0

LANGUAGE: console
CODE:

```
$ uv
An extremely fast Python package manager.

Usage: uv [OPTIONS] <COMMAND>

...
```

---

TITLE: Install uv via PyPI with pipx
DESCRIPTION: Installs uv into an isolated environment using pipx.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_6

LANGUAGE: console
CODE:

```
$ pipx install uv
```

---

TITLE: Install uv with WinGet
DESCRIPTION: Installs uv using the WinGet package manager.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_9

LANGUAGE: console
CODE:

```
$ winget install --id=astral-sh.uv  -e
```

---

TITLE: uv Initialization and Project Setup
DESCRIPTION: Commands for initializing new projects or managing project setup, including hints for common issues.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.4.x.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
uv init:
  Description: Initializes a new project or project configuration.
  Commands:
    uv init --no-project
      Description: Alias for initializing without a project.
    uv init --no-workspace
      Description: Hints at `--no-workspace` in failure scenarios.
    uv init
      Description: Pins `.python-version` in `uv init`.
      Parameters:
        --pin-python-version: Pins the `.python-version` file.
```

---

TITLE: Install a Tool with Extra Dependencies
DESCRIPTION: Explains how to install a tool along with additional, optional packages using the `--with` flag. This is useful for installing plugins or extensions that enhance the tool's functionality, such as `mkdocs-material` for `mkdocs`.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/tools.md#_snippet_14

LANGUAGE: console
CODE:

```
uv tool install mkdocs --with mkdocs-material
```

---

TITLE: uv documentation updates
DESCRIPTION: Includes various documentation updates, such as adding examples for git+https support, documenting installer variables, clarifying private classifier usage, updating pip-and-uv strictness examples, fixing `uv python install` documentation, and documenting `RUST_LOG` for mimicking `--verbose`.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.5.x.md#_snippet_17

LANGUAGE: apidoc
CODE:

```
Documentation:
  - Added examples for git+https support.
  - Documented installer variables.
  - Clarified private classifier usage.
  - Updated pip-and-uv strictness example.
  - Fixed `uv python install` documentation.
  - Documented `RUST_LOG` for mimicking `--verbose`.
```

---

TITLE: Docker MRE with uv Commands
DESCRIPTION: An example Dockerfile demonstrating a full reproducible example workflow using uv commands. It initializes a project, adds a dependency, syncs, and runs a Python command.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/troubleshooting/reproducible-examples.md#_snippet_2

LANGUAGE: dockerfile
CODE:

```
FROM --platform=linux/amd64 ghcr.io/astral-sh/uv:0.5.24-debian-slim

RUN uv init /mre
WORKDIR /mre
RUN uv add pydantic
RUN uv sync
RUN uv run -v python -c "import pydantic"
```

---

TITLE: Generated requirements.txt with Pinned Versions
DESCRIPTION: An example of a `requirements.txt` file generated after compiling dependencies. It lists all packages with their exact versions, ensuring reproducible installations across different environments.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/migration/pip-to-project.md#_snippet_6

LANGUAGE: text
CODE:

```
annotated-types==0.7.0
    # via pydantic
anyio==4.8.0
    # via starlette
fastapi==0.115.11
    # via -r requirements.in
idna==3.10
    # via anyio
pydantic==2.10.6
    # via
    #   -r requirements.in
    #   fastapi
pydantic-core==2.27.2
    # via pydantic
sniffio==1.3.1
    # via anyio
starlette==0.46.1
    # via fastapi
typing-extensions==4.12.2
    # via
    #   fastapi
    #   pydantic
    #   pydantic-core
```

---

TITLE: Start marimo in a non-project environment
DESCRIPTION: Starts the marimo interactive environment within a pre-configured virtual environment. Packages installed via marimo's UI in this setup will use `uv pip install`.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/marimo.md#_snippet_8

LANGUAGE: shell
CODE:

```
uv run marimo edit
```

---

TITLE: PyTorch Project Configuration
DESCRIPTION: Example `pyproject.toml` configuration for a project using PyTorch. This setup specifies Python version requirements and lists PyTorch and Torchvision as dependencies, suitable for managing PyTorch installations with uv.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/pytorch.md#_snippet_0

LANGUAGE: toml
CODE:

```
[project]
name = "project"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "torch>=2.7.0",
  "torchvision>=0.22.0",
]
```

---

TITLE: Verify Tool Installation
DESCRIPTION: After installing a tool, its executables are available in the `PATH`. This snippet shows how to verify that an installed tool, like `ruff`, is accessible and functional.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/tools.md#_snippet_13

LANGUAGE: shell
CODE:

```
$ ruff --version
```

---

TITLE: Install uv with Scoop
DESCRIPTION: Installs uv using the Scoop package manager.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_10

LANGUAGE: console
CODE:

```
$ scoop install main/uv
```

---

TITLE: Inspect uv installer script (Windows)
DESCRIPTION: Allows inspection of the uv standalone installer script before execution using 'more'.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_5

LANGUAGE: pwsh-session
CODE:

```
PS> powershell -c "irm https://astral.sh/uv/install.ps1 | more"
```

---

TITLE: Example Constraints File
DESCRIPTION: An example of a `constraints.txt` file format used with `uv build --build-constraint`. It specifies package versions and their corresponding SHA256 hashes for verification.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/build.md#_snippet_4

LANGUAGE: text
CODE:

```
setuptools==68.2.2 --hash=sha256:b454a35605876da60632df1a60f736524eb73cc47bbc9f3f1ef1b644de74fd2a
```

---

TITLE: PyTorch Guide Updates
DESCRIPTION: Details updates to the PyTorch guide, including adding an ROCm example and upgrading the guide to support CUDA 12.8 and PyTorch 2.7. This ensures the documentation reflects the latest compatible versions and hardware acceleration options.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.7.x.md#_snippet_14

LANGUAGE: Markdown
CODE:

```
## PyTorch Guide

This guide provides instructions for using uv with PyTorch, including ROCm support and compatibility with CUDA 12.8 and PyTorch 2.7.
```

---

TITLE: Create and Clone GitHub Repository with CLI
DESCRIPTION: Shows how to use the GitHub CLI (`gh`) to quickly create a new repository and clone it locally. This is useful for setting up minimal reproducible examples.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/troubleshooting/reproducible-examples.md#_snippet_6

LANGUAGE: console
CODE:

```
$ gh repo create uv-mre-1234 --clone
```

---

TITLE: Default Resolution Example
DESCRIPTION: Demonstrates the default behavior of uv pip compile, which installs the latest version of each package, and the resulting requirements.txt file.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/resolution.md#_snippet_4

LANGUAGE: python
CODE:

```
flask>=2.0.0
```

LANGUAGE: text
CODE:

```
# This file was autogenerated by uv via the following command:
#    uv pip compile requirements.in
blinker==1.7.0
    # via flask
click==8.1.7
    # via flask
flask==3.0.0
itsdangerous==2.1.2
    # via flask
jinja2==3.1.2
    # via flask
markupsafe==2.1.3
    # via
    #   jinja2
    #   werkzeug
werkzeug==3.0.1
    # via flask
```

---

TITLE: Specify Installation Prefix (prefix)
DESCRIPTION: Installs packages into specified directories (`lib`, `bin`, etc.) as if a virtual environment existed at that location. It's generally recommended to use `--python` for alternate environments, as `--prefix` installations reference the installing interpreter, potentially causing portability issues. The default value is `None`.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/settings.md#_snippet_119

LANGUAGE: toml
CODE:

```
[tool.uv.pip]
prefix = "./prefix"
```

LANGUAGE: uvconfig
CODE:

```
[pip]
prefix = "./prefix"
```

---

TITLE: Test Package Installation with uv Run
DESCRIPTION: Command to test if a package can be installed and imported. Uses `--no-project` to avoid local installation and `--with` to specify the package.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/package.md#_snippet_6

LANGUAGE: console
CODE:

```
$ uv run --with <PACKAGE> --no-project -- python -c "import <PACKAGE>"
```

---

TITLE: Git SSH Authentication Examples
DESCRIPTION: Examples of Git URLs using SSH for authentication with private repositories. These formats are used when cloning or installing packages from Git sources that require SSH access.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/authentication.md#_snippet_0

LANGUAGE: console
CODE:

```
git+ssh://git@<hostname>/...
(e.g., git+ssh://git@github.com/astral-sh/uv)
```

LANGUAGE: console
CODE:

```
git+ssh://git@<host>/...
(e.g., git+ssh://git@github.com-key-2/astral-sh/uv)
```

---

TITLE: Install uv with Homebrew
DESCRIPTION: Installs uv using the Homebrew package manager.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_8

LANGUAGE: console
CODE:

```
$ brew install uv
```

---

TITLE: uv pip compile example workflow
DESCRIPTION: Provides an example workflow for compiling the current environment's packages using `uv pip compile`. This helps users understand how to replicate their current setup.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.1.x.md#_snippet_115

LANGUAGE: shell
CODE:

```
# Example workflow:
# 1. Activate your environment
# 2. Run uv pip compile to generate requirements.txt
# 3. Use the generated file for reproducible builds.
```

---

TITLE: Install PyTorch via uv pip interface
DESCRIPTION: This example demonstrates how to use the `uv pip` command to install PyTorch, mirroring the functionality of the standard `pip` command. It shows installing CPU-only PyTorch on Linux using a specific index URL.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/pytorch.md#_snippet_18

LANGUAGE: shell
CODE:

```
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

---

TITLE: Inspect uv installer script (macOS/Linux)
DESCRIPTION: Allows inspection of the uv standalone installer script before execution using 'less'.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_4

LANGUAGE: console
CODE:

```
$ curl -LsSf https://astral.sh/uv/install.sh | less
```

---

TITLE: Install Alternative Python Implementation
DESCRIPTION: Installs an alternative Python implementation, such as PyPy, by specifying the implementation and target Python version.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/install-python.md#_snippet_3

LANGUAGE: console
CODE:

```
$ uv python install pypy@3.10
```

---

TITLE: Install uv with setup-uv Action
DESCRIPTION: Installs the latest version of uv using the astral-sh/setup-uv GitHub Action. This action handles installation, PATH configuration, and caching.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/github.md#_snippet_0

LANGUAGE: yaml
CODE:

```
name: Example

jobs:
  uv-example:
    name: python
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v6
```

---

TITLE: uv Python Installation and Environment
DESCRIPTION: Information related to Python installation directories and environment setup within the uv project.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.3.x.md#_snippet_12

LANGUAGE: APIDOC
CODE:

```
Python Environment:
  - Documented the Python installation directory.
  - Allow manylinux compatibility override via `_manylinux` module.
```

---

TITLE: View uv Version
DESCRIPTION: Checks the installed version of uv, including build commit and date. This is useful for troubleshooting and reporting issues.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/help.md#_snippet_4

LANGUAGE: console
CODE:

```
$ uv self version
```

---

TITLE: Install Tool from Alternative Sources
DESCRIPTION: Uses the '--from' option to install and run tools from alternative sources like Git repositories, specifying branches, tags, or commits.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/tools.md#_snippet_7

LANGUAGE: console
CODE:

```
$ uvx --from git+https://github.com/httpie/cli httpie
$ uvx --from git+https://github.com/httpie/cli@master httpie
$ uvx --from git+https://github.com/httpie/cli@3.2.4 httpie
$ uvx --from git+https://github.com/httpie/cli@2843b87 httpie
```

---

TITLE: Start marimo server with uvx
DESCRIPTION: Initiates a marimo server instance for ad-hoc notebook access. This command uses uvx to ensure marimo runs in an isolated environment, providing a clean setup for interactive development.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/marimo.md#_snippet_0

LANGUAGE: shell
CODE:

```
uvx marimo edit
```

---

TITLE: Initialize Project with Options
DESCRIPTION: Demonstrates using the `--bare` option in conjunction with other flags like `--description`, `--author-from`, `--vcs`, and `--python-pin` to customize project initialization.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_22

LANGUAGE: console
CODE:

```
$ uv init example --bare --description "Hello world" --author-from git --vcs git --python-pin
```

---

TITLE: Install a Tool with a Specific Python Interpreter
DESCRIPTION: Shows how to install a tool using a designated Python interpreter version using the `--python` option. This is crucial for ensuring the tool's dependencies are resolved and installed against the correct Python environment, especially in multi-Python setups.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/tools.md#_snippet_19

LANGUAGE: console
CODE:

```
uv tool install --python 3.10 ruff
```

---

TITLE: Build uv from source with Cargo
DESCRIPTION: Builds uv from its Git repository using Cargo. Requires a Rust toolchain.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_11

LANGUAGE: console
CODE:

```
$ cargo install --git https://github.com/astral-sh/uv uv
```

---

TITLE: Create Basic Application Project
DESCRIPTION: Initializes a new project for an application. Creates a pyproject.toml, a sample main.py, README.md, and a .python-version file in the specified directory.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_0

LANGUAGE: console
CODE:

```
uv init example-app
```

---

TITLE: Install uv
DESCRIPTION: Instructions for installing uv, the Python package installer and resolver, using pip.

SOURCE: https://github.com/astral-sh/uv/blob/main/crates/uv-requirements-txt/test-data/requirements-txt/empty.txt#_snippet_0

LANGUAGE: shell
CODE:

```
pip install uv
```

---

TITLE: List Installed Python Versions
DESCRIPTION: Displays a list of all Python versions that uv has installed and is managing on your system, along with available versions.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/install-python.md#_snippet_6

LANGUAGE: console
CODE:

```
$ uv python list
```

---

TITLE: Initialize a new Python project with uv
DESCRIPTION: Demonstrates creating a new Python project using the `uv init` command. It shows both initializing in a new directory and in the current working directory, and lists the files created by the command.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/projects.md#_snippet_0

LANGUAGE: console
CODE:

```
$ uv init hello-world
$ cd hello-world
```

LANGUAGE: console
CODE:

```
$ mkdir hello-world
$ cd hello-world
$ uv init
```

LANGUAGE: text
CODE:

```
├── .gitignore
├── .python-version
├── README.md
├── main.py
└── pyproject.toml
```

---

TITLE: View uv Command Help Menu
DESCRIPTION: Displays the general help menu for the uv command-line tool. Use this to get an overview of available commands and options.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/help.md#_snippet_0

LANGUAGE: console
CODE:

```
$ uv --help
```

---

TITLE: Generated requirements.txt from pip freeze
DESCRIPTION: An example of a `requirements.txt` file generated using `pip freeze`. This method captures the exact versions of packages installed in the current environment, which may include packages not explicitly listed in the input requirements.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/migration/pip-to-project.md#_snippet_8

LANGUAGE: text
CODE:

```
annotated-types==0.7.0
anyio==4.8.0
fastapi==0.115.11
idna==3.10
pydantic==2.10.6
pydantic-core==2.27.2
sniffio==1.3.1
starlette==0.46.1
typing-extensions==4.12.2
```

---

TITLE: uv install --with Extras
DESCRIPTION: Respects comma-separated extras in the `--with` flag for `uv install`. This allows for specifying multiple optional dependencies more conveniently.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.5.x.md#_snippet_13

LANGUAGE: cli
CODE:

```
uv install package[extra1,extra2]
```

---

TITLE: Install Specific Python Version
DESCRIPTION: Installs a particular Python version. You can specify a single version or multiple versions to be installed.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/install-python.md#_snippet_1

LANGUAGE: console
CODE:

```
$ uv python install 3.12
```

---

TITLE: Editable Install with Extras
DESCRIPTION: Demonstrates how to perform an editable install of a package, including specific optional dependencies (extras). This allows for development where certain features can be included or excluded.

SOURCE: https://github.com/astral-sh/uv/blob/main/crates/uv-requirements-txt/test-data/requirements-txt/editable.txt#_snippet_0

LANGUAGE: python
CODE:

```
pip install -e ./editable[d,dev]
```

LANGUAGE: python
CODE:

```
pip install -e ./editable[d, dev] ; python_version >= "3.9" and os_name == "posix"
```

LANGUAGE: python
CODE:

```
pip install -e ./editable ; python_version >= "3.9" and os_name == "posix"
```

LANGUAGE: python
CODE:

```
pip install -e ./editable # comment
```

LANGUAGE: python
CODE:

```
pip install -e ./editable #comment
```

---

TITLE: uv pip install for unmanaged projects
DESCRIPTION: Introduces the capability to use `uv pip install` for unmanaged projects, enhancing flexibility in project setup and dependency management. This feature aims to streamline workflows for projects not adhering to standard package management structures.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.2.x.md#_snippet_138

LANGUAGE: APIDOC
CODE:

```
uv pip install [options] <package> ...

Description:
  Installs packages using uv's pip compatibility layer, now supporting unmanaged projects.

Purpose:
  Allows users to leverage uv's performance benefits for installing packages even in project structures that are not explicitly managed by tools like Poetry or Hatch.

Example:
  uv pip install requests
  uv pip install --target /path/to/unmanaged/project requests
```

---

TITLE: uv Project Initialization and Management
DESCRIPTION: Demonstrates initializing a new project, adding dependencies, running commands within the project context, generating a lockfile, and synchronizing dependencies.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/index.md#_snippet_2

LANGUAGE: console
CODE:

```
$ uv init example
Initialized project `example` at `/home/user/example`

$ cd example

$ uv add ruff
Creating virtual environment at: .venv
Resolved 2 packages in 170ms
   Built example @ file:///home/user/example
Prepared 2 packages in 627ms
Installed 2 packages in 1ms
 + example==0.1.0 (from file:///home/user/example)
 + ruff==0.5.4

$ uv run ruff check
All checks passed!

$ uv lock
Resolved 2 packages in 0.33ms

$ uv sync
Resolved 2 packages in 0.70ms
Audited 1 package in 0.02ms
```

---

TITLE: Install Python in ARM musl Images
DESCRIPTION: Provides an example of installing Python 3.12 using the Alpine Linux package manager (`apk`) for ARM musl environments, as uv does not directly support this. This is a workaround for environments where uv cannot manage Python installation.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/docker.md#_snippet_9

LANGUAGE: shell
CODE:

```
apk add --no-cache python3~=3.12
```

---

TITLE: Lowest Resolution Example
DESCRIPTION: Shows the output of uv pip compile with the --resolution lowest flag, which installs the lowest possible version for all dependencies.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/resolution.md#_snippet_5

LANGUAGE: python
CODE:

```
# This file was autogenerated by uv via the following command:
#    uv pip compile requirements.in --resolution lowest
click==7.1.2
    # via flask
flask==2.0.0
itsdangerous==2.0.0
    # via flask
jinja2==3.0.0
    # via flask
markupsafe==2.0.0
    # via jinja2
werkzeug==2.0.0
    # via flask
```

---

TITLE: Install from requirements.txt
DESCRIPTION: Shows how to use uv to install packages listed in a requirements.txt file.

SOURCE: https://github.com/astral-sh/uv/blob/main/crates/uv-requirements-txt/test-data/requirements-txt/empty.txt#_snippet_2

LANGUAGE: shell
CODE:

```
uv pip install --requirement requirements.txt
```

---

TITLE: Install uv
DESCRIPTION: Instructions for installing uv, the Python package installer and resolver, using pip.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/root_editable/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pip install uv
```

---

TITLE: Testing Python Package Installation with uv run
DESCRIPTION: This section describes how to verify the installation and importability of a Python package using the `uv run` command. It explains the purpose of the `--no-project` flag to ensure testing against an installed version and the `--refresh-package` option to avoid cached versions during testing.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/package.md#_snippet_10

LANGUAGE: APIDOC
CODE:

```
uv run --with <PACKAGE> --no-project -- python -c "import <PACKAGE>"
  - Executes a command within a uv-managed environment, primarily used for testing package installation and importability.
  - Parameters:
    - --with <PACKAGE>: Specifies the package to be made available in the execution environment.
    - --no-project: Prevents `uv` from installing the package from the current local project directory, ensuring the test uses an installed version.
    - --refresh-package <PACKAGE>: Forces `uv` to refresh the specified package, bypassing any cached versions. Useful when testing recently updated packages.
  - Usage:
    - Typically used to verify that a package can be successfully installed and imported after publishing or building.
```

LANGUAGE: console
CODE:

```
$ uv run --with <PACKAGE> --no-project -- python -c "import <PACKAGE>"
```

---

TITLE: View uv Specific Command Help Menu
DESCRIPTION: Displays the help menu for a specific uv command, such as 'uv init'. This provides detailed information about that particular command's usage and options.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/help.md#_snippet_1

LANGUAGE: console
CODE:

```
$ uv init --help
```

---

TITLE: Pip Compile Bytecode Configuration
DESCRIPTION: Compile Python files to bytecode after installation. Trades longer installation times for faster start times, useful for CLI applications and Docker containers.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/settings.md#_snippet_80

LANGUAGE: toml
CODE:

```
[tool.uv.pip]
compile-bytecode = true
```

LANGUAGE: uvconfig
CODE:

```
[pip]
compile-bytecode = true
```

---

TITLE: Install uv
DESCRIPTION: Instructions for installing uv, the Python package installer and resolver, using pip.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/dependent_locals/first_local/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pip install uv
```

---

TITLE: uv python install and Mirrors
DESCRIPTION: Enables configuration of Python and PyPy install mirrors via `uv.toml` and allows passing Python download mirrors directly to `uv python install`. This provides greater flexibility in managing Python installations from custom sources.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.5.x.md#_snippet_4

LANGUAGE: cli
CODE:

```
uv python install --python-mirror <URL>
# or via uv.toml configuration
```

---

TITLE: Install uv
DESCRIPTION: Instructions for installing uv, the Python package installer and resolver, using pip.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/dependent_locals/second_local/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pip install uv
```

---

TITLE: uv documentation: Add installer options for Linux
DESCRIPTION: Provides documentation specifically for passing installer options on Linux systems.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.4.x.md#_snippet_83

LANGUAGE: markdown
CODE:

```
Documentation for passing installer options on Linux.
```

---

TITLE: Install Default Python Executables
DESCRIPTION: Installs versioned Python executables and also creates `python` and `python3` symlinks in your PATH for convenience. This option is experimental.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/install-python.md#_snippet_4

LANGUAGE: console
CODE:

```
$ uv python install --default
```

---

TITLE: Sample main.py for Application
DESCRIPTION: Provides the content of the default main.py file generated for an application project, including a simple main function.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_3

LANGUAGE: python
CODE:

```
def main():
    print("Hello from example-app!")


if __name__ == "__main__":
    main()
```

---

TITLE: Install Command-Line Tools with uv tool install
DESCRIPTION: Install command-line tools from Python packages globally using `uv tool install`. After installation, the tool's executables are available in the system's PATH.

SOURCE: https://github.com/astral-sh/uv/blob/main/README.md#_snippet_6

LANGUAGE: console
CODE:

```
$ uv tool install ruff
Resolved 1 package in 6ms
Installed 1 package in 2ms
 + ruff==0.5.0
Installed 1 executable: ruff

$ ruff --version
ruff 0.5.0
```

---

TITLE: Get System Python Environment Prefix
DESCRIPTION: A Python command to retrieve the prefix of the system Python installation, often used to target the system environment with uv.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/config.md#_snippet_8

LANGUAGE: console
CODE:

```
python -c "import sysconfig; print(sysconfig.get_config_var('prefix'))"
```

---

TITLE: Initialize a new project with uv
DESCRIPTION: This console command demonstrates how to create a new Python project that utilizes the uv build backend. Running 'uv init' will set up the necessary project structure and configuration.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/build-backend.md#_snippet_1

LANGUAGE: console
CODE:

```
$ uv init
```

---

TITLE: Install uv
DESCRIPTION: Instructions for installing uv, the Python package installer and resolver, using pip.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/hatchling_editable/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
pip install uv
```

---

TITLE: View uv Version (Alias)
DESCRIPTION: An alias for 'uv self version' to check the installed version of uv. This command provides the same output.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/help.md#_snippet_5

LANGUAGE: console
CODE:

```
$ uv --version
```

---

TITLE: Documentation Updates
DESCRIPTION: Various documentation improvements including clarifying `exclude-newer` settings, tweaking comments, updating copyright year, adding AWS Lambda integration guide, and instructions for installing with Scoop.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.5.x.md#_snippet_125

LANGUAGE: APIDOC
CODE:

```
Documentation:
  - Clarifies `exclude-newer` settings.
  - Tweaks script `--no-project` comment.
  - Updates copyright year.
  - Adds AWS Lambda integration guide.
  - Adds instructions for installing with Scoop.
```

---

TITLE: Setup and Run Jupyter in Standalone Environment
DESCRIPTION: This section details how to create a virtual environment using `uv`, install `pydantic` and `jupyterlab`, and then launch Jupyter Lab. It covers commands for both macOS/Linux and Windows to set up a standalone Jupyter environment.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/jupyter.md#_snippet_7

LANGUAGE: console
CODE:

```
uv venv --seed
uv pip install pydantic
uv pip install jupyterlab
.venv/bin/jupyter lab
```

LANGUAGE: pwsh-session
CODE:

```
uv venv --seed
uv pip install pydantic
uv pip install jupyterlab
.venv\Scripts\jupyter lab
```

---

TITLE: Install and Use uv Tools
DESCRIPTION: Installs a tool like `cowsay` using `uv tool install` and then demonstrates its usage. It also shows how to set a constant location for tool binaries.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/docker.md#_snippet_8

LANGUAGE: dockerfile
CODE:

```
ENV PATH=/root/.local/bin:$PATH
RUN uv tool install cowsay
```

LANGUAGE: console
CODE:

```
$ docker run -it $(docker build -q .) /bin/bash -c "cowsay -t hello"
  _____
| hello |
  =====
     \
      \
        ^__^
        (oo)\
        (__)\
            ||----w |
            ||     ||
```

LANGUAGE: dockerfile
CODE:

```
ENV UV_TOOL_BIN_DIR=/opt/uv-bin/

```

---

TITLE: uv tool install: Respect upgrades and fetch managed toolchains
DESCRIPTION: The `uv tool install` command now respects upgrades during installation and automatically fetches managed toolchains if necessary. This simplifies the installation process and ensures that tools are up-to-date and properly configured.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.2.x.md#_snippet_86

LANGUAGE: APIDOC
CODE:

```
uv tool install
  - Installs the specified tools and now respects upgrades and fetches managed toolchains if necessary.
  - Usage: uv tool install [OPTIONS] <tool>...
  - Options:
    - tool: The name of the tool to install.

```

---

TITLE: Install Package with pip
DESCRIPTION: Demonstrates the imperative installation of a package directly into the active Python environment using the `pip install` command. This is a common way to add dependencies during development.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/migration/pip-to-project.md#_snippet_0

LANGUAGE: console
CODE:

```
$ pip install fastapi
```

---

TITLE: Install from requirements.txt
DESCRIPTION: Shows how to use uv to install packages listed in a requirements.txt file.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/root_editable/README.md#_snippet_2

LANGUAGE: shell
CODE:

```
uv pip install --requirement requirements.txt
```

---

TITLE: Create a Minimal Project
DESCRIPTION: Initializes a project with only a `pyproject.toml` file, skipping other standard project files and VCS initialization.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_19

LANGUAGE: console
CODE:

```
$ uv init example --bare
```

---

TITLE: Install uv (Windows)
DESCRIPTION: Installs uv using the official standalone installer script for Windows systems via PowerShell.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/index.md#_snippet_1

LANGUAGE: powershell
CODE:

```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

TITLE: Get Package Version
DESCRIPTION: Retrieves the version of the current package. This command is useful for checking the installed version of your project.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/projects.md#_snippet_7

LANGUAGE: shell
CODE:

```
$ uv version
hello-world 0.7.0
```

---

TITLE: Install from requirements.txt
DESCRIPTION: Shows how to use uv to install packages listed in a requirements.txt file.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/hatchling_editable/README.md#_snippet_2

LANGUAGE: shell
CODE:

```
uv pip install --requirement requirements.txt
```

---

TITLE: Using uv Temporarily in Dockerfile
DESCRIPTION: This example shows how to use the uv binary temporarily within a Dockerfile without needing to install it permanently. The uv binary is mounted from a Docker image for a single RUN command.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/docker.md#_snippet_18

LANGUAGE: dockerfile
CODE:

```
RUN --mount=from=ghcr.io/astral-sh/uv,source=/uv,target=/bin/uv \
    uv sync
```

---

TITLE: Build Project and View Artifacts
DESCRIPTION: Builds the project in the current directory, placing the resulting source distribution (sdist) and binary distribution (wheel) into the `dist/` subdirectory. Shows how to list the generated files.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/build.md#_snippet_0

LANGUAGE: console
CODE:

```
uv build
ls dist/
```

---

TITLE: Install uv with Standalone Installers
DESCRIPTION: Installs uv using standalone shell scripts for macOS, Linux, and Windows. These scripts handle downloading and setting up uv on your system.

SOURCE: https://github.com/astral-sh/uv/blob/main/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
# On macOS and Linux.
curl -LsSf https://astral.sh/uv/install.sh | sh
```

LANGUAGE: powershell
CODE:

```
# On Windows.
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

TITLE: Install from requirements.txt
DESCRIPTION: Shows how to use uv to install packages listed in a requirements.txt file.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/dependent_locals/first_local/README.md#_snippet_2

LANGUAGE: shell
CODE:

```
uv pip install --requirement requirements.txt
```

---

TITLE: Install Latest Python
DESCRIPTION: Installs the latest available Python version managed by uv. Once installed, uv automatically uses this version and adds it to your PATH.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/install-python.md#_snippet_0

LANGUAGE: console
CODE:

```
$ uv python install
```

---

TITLE: Install specific uv version (macOS/Linux)
DESCRIPTION: Installs a specific version of uv by including the version number in the download URL.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_1

LANGUAGE: console
CODE:

```
$ curl -LsSf https://astral.sh/uv/0.8.11/install.sh | sh
```

---

TITLE: Install Dependencies from requirements.txt
DESCRIPTION: Shows how to install all dependencies listed in a `requirements.txt` file into the current Python environment. This file typically contains exact version specifiers for reproducible builds.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/migration/pip-to-project.md#_snippet_3

LANGUAGE: text
CODE:

```
fastapi
```

LANGUAGE: console
CODE:

```
$ pip install -r requirements.txt
```

---

TITLE: uv Python Commands
DESCRIPTION: Commands for installing, listing, finding, pinning, and uninstalling Python versions.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/features.md#_snippet_0

LANGUAGE: APIDOC
CODE:

```
uv python install
  - Installs Python versions.

uv python list
  - Views available Python versions.

uv python find
  - Finds an installed Python version.

uv python pin
  - Pins the current project to use a specific Python version.

uv python uninstall
  - Uninstalls a Python version.
```

---

TITLE: uv build failure example with numpy
DESCRIPTION: Demonstrates a typical build failure when uv attempts to install an older package version on an unsupported Python. It shows the error message and the stderr output from the build backend, highlighting the `ModuleNotFoundError` for `distutils`.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/troubleshooting/build-failures.md#_snippet_0

LANGUAGE: console
CODE:

```
$ uv pip install -p 3.13 'numpy<1.20'
Resolved 1 package in 62ms
  × Failed to build `numpy==1.19.5`
  ├─▶ The build backend returned an error
  ╰─▶ Call to `setuptools.build_meta:__legacy__.build_wheel()` failed (exit status: 1)

      [stderr]
      Traceback (most recent call last):
        File "<string>", line 8, in <module>
          from setuptools.build_meta import __legacy__ as backend
        File "/home/konsti/.cache/uv/builds-v0/.tmpi4bgKb/lib/python3.13/site-packages/setuptools/__init__.py", line 9, in <module>
          import distutils.core
      ModuleNotFoundError: No module named 'distutils'

      hint: `distutils` was removed from the standard library in Python 3.12. Consider adding a constraint (like `numpy >1.19.5`) to avoid building a version of `numpy` that depends
      on `distutils`.

```

---

TITLE: Execute Application Main File
DESCRIPTION: Demonstrates how to run the main Python file of an application project using the 'uv run' command.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_4

LANGUAGE: console
CODE:

```
cd example-app
uv run main.py
```

---

TITLE: uv CLI Command Examples
DESCRIPTION: Provides examples of `uv` CLI commands mentioned in the changelog.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.7.x.md#_snippet_50

LANGUAGE: shell
CODE:

```
uv python pin --rm

```

LANGUAGE: shell
CODE:

```
uv sync

```

LANGUAGE: shell
CODE:

```
uv add

```

LANGUAGE: shell
CODE:

```
uv remove

```

LANGUAGE: shell
CODE:

```
uv export --no-editable

```

LANGUAGE: shell
CODE:

```
uv add --group mygroup --script

```

LANGUAGE: shell
CODE:

```
uv --torch-backend XPU

```

LANGUAGE: shell
CODE:

```
uv --torch-backend ROCm

```

---

TITLE: pyproject.toml for Basic Application
DESCRIPTION: Shows the content of the pyproject.toml file for a standard application project. It includes basic project metadata but no build system or packaging information.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_2

LANGUAGE: toml
CODE:

```
[project]
name = "example-app"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.11"
dependencies = []
```

---

TITLE: Example Lambda Event Payload
DESCRIPTION: A sample JSON structure representing an event payload that can be sent to an AWS Lambda function, simulating an HTTP GET request.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/integration/aws-lambda.md#_snippet_20

LANGUAGE: json
CODE:

```
{
  "httpMethod": "GET",
  "path": "/",
  "requestContext": {},
  "version": "1.0"
}
```

---

TITLE: Running a Library Function
DESCRIPTION: Demonstrates how to import and execute a function from a locally built library using `uv run`.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_13

LANGUAGE: console
CODE:

```
$ cd example-lib
$ uv run python -c "import example_lib; print(example_lib.hello())"
Hello from example-lib!
```

---

TITLE: uv Tool Commands
DESCRIPTION: Commands for running and installing tools published to Python package indexes.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/features.md#_snippet_3

LANGUAGE: APIDOC
CODE:

```
uvx / uv tool run
  - Runs a tool in a temporary environment.

uv tool install
  - Installs a tool user-wide.

uv tool uninstall
  - Uninstalls a tool.

uv tool list
  - Lists installed tools.

uv tool update-shell
  - Updates the shell to include tool executables.
```

---

TITLE: Install Multiple Python Versions
DESCRIPTION: Installs several specified Python versions simultaneously. This is useful for testing across different Python environments.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/guides/install-python.md#_snippet_2

LANGUAGE: console
CODE:

```
$ uv python install 3.11 3.12
```

---

TITLE: uv tool install --editable Documentation
DESCRIPTION: Provides documentation for the `uv tool install --editable` command. This feature allows for the installation of Python packages in editable mode, which is useful for development workflows.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.5.x.md#_snippet_168

LANGUAGE: APIDOC
CODE:

```
uv tool install --editable <package_name>

Description:
  Installs a Python package in editable mode.

Parameters:
  <package_name>: The name of the package to install.

Usage:
  Installs a package such that changes in the source directory are immediately reflected without reinstallation.
```

---

TITLE: Install uv (macOS/Linux)
DESCRIPTION: Installs uv using the official standalone installer script for macOS and Linux systems via curl.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/index.md#_snippet_0

LANGUAGE: console
CODE:

```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

TITLE: Install from requirements.txt
DESCRIPTION: Shows how to use uv to install packages listed in a requirements.txt file.

SOURCE: https://github.com/astral-sh/uv/blob/main/scripts/packages/dependent_locals/second_local/README.md#_snippet_2

LANGUAGE: shell
CODE:

```
uv pip install --requirement requirements.txt
```

---

TITLE: Installer arguments: --exclude-newer
DESCRIPTION: The `--exclude-newer` option has been added to the installer arguments, allowing users to exclude newer versions of packages during installation. This provides more control over the installation process and can be useful for resolving compatibility issues.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.2.x.md#_snippet_90

LANGUAGE: APIDOC
CODE:

```
--exclude-newer
  - Excludes newer versions of packages during installation.
  - Usage: uv install --exclude-newer <package>...
  - Options:
    - package: The name of the package to install.

```

---

TITLE: uv Tool Management Commands
DESCRIPTION: Documentation for commands related to managing tools with uv, including installation, execution, and hints for available executables. Covers changes to `uv tool install`, `uv tool run`, and `uvx` behavior.

SOURCE: https://github.com/astral-sh/uv/blob/main/changelogs/0.2.x.md#_snippet_92

LANGUAGE: cli
CODE:

```
uv tool install
  - Installs tools.
  - Exit with zero when request is already satisfied.

uv tool run
  - Runs executables from installed tools.
  - Suggests valid commands when a command is not found.
  - References `uvx` when appropriate for error messages.

uvx
  - Warns when a requested executable is not provided by the package.
```

---

TITLE: Install uv with Custom Path (Windows)
DESCRIPTION: Installs the uv package to a custom directory on Windows systems using the UV_INSTALL_DIR environment variable. This command uses PowerShell to set the environment variable and execute the installation script.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/reference/installer.md#_snippet_1

LANGUAGE: pwsh-session
CODE:

```
PS> powershell -ExecutionPolicy ByPass -c {$env:UV_INSTALL_DIR = "C:\Custom\Path";irm https://astral.sh/uv/install.ps1 | iex}
```

---

TITLE: Application Project Directory Structure
DESCRIPTION: Illustrates the file structure of a basic application project created with 'uv init'.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/init.md#_snippet_1

LANGUAGE: console
CODE:

```
tree example-app
example-app
├── .python-version
├── README.md
├── main.py
└── pyproject.toml
```

---

TITLE: Install specific uv version (Windows)
DESCRIPTION: Installs a specific version of uv on Windows by including the version number in the PowerShell download URL.

SOURCE: https://github.com/astral-sh/uv/blob/main/docs/getting-started/installation.md#_snippet_3

LANGUAGE: pwsh-session
CODE:

```
PS> powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/0.8.11/install.ps1 | iex"
```
