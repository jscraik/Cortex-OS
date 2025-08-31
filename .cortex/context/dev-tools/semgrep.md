========================
CODE SNIPPETS
========================

TITLE: Install Semgrep CLI
DESCRIPTION: Commands to install the Semgrep command-line interface on various operating systems and environments, including macOS via Homebrew, Linux/macOS via Python pip, and a Docker-based approach for trying Semgrep without direct installation.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/README.md#_snippet_0>

LANGUAGE: Bash
CODE:

```
# For macOS
$ brew install semgrep
```

LANGUAGE: Bash
CODE:

```
# For Ubuntu/WSL/Linux/macOS
$ python3 -m pip install semgrep
```

LANGUAGE: Bash
CODE:

```
# To try Semgrep without installation run via Docker
$ docker run -it -v "${PWD}:/src" semgrep/semgrep semgrep login
$ docker run -e SEMGREP_APP_TOKEN=<TOKEN> --rm -v "${PWD}:/src" semgrep/semgrep semgrep ci
```

---

TITLE: Verify Semgrep Installation and View Help
DESCRIPTION: Run Semgrep with the `--help` flag to confirm successful installation and get an overview of its command-line options and functionalities.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/spacegrep/markdown.md#_snippet_1>

LANGUAGE: sh
CODE:

```
semgrep --help
```

---

TITLE: Upgrade Semgrep Installation
DESCRIPTION: Commands to upgrade Semgrep based on the installation method (Homebrew, pip, or Docker). These commands ensure you have the latest version of Semgrep installed on your system.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/README.md#_snippet_3>

LANGUAGE: sh
CODE:

```
# Using Homebrew
$ brew upgrade semgrep

# Using pip
$ python3 -m pip install --upgrade semgrep

# Using Docker
$ docker pull semgrep/semgrep:latest
```

---

TITLE: Run Interactive Semgrep Query for Python
DESCRIPTION: Example command to run a Semgrep query interactively from the CLI, demonstrating how to search for specific code patterns, such as `==` comparisons where both sides are identical, specifically for Python source code.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/README.md#_snippet_1>

LANGUAGE: Bash
CODE:

```
semgrep -e '$X == $X' --lang=py path/to/src
```

---

TITLE: Verify Semgrep Installation and View Help
DESCRIPTION: Run the Semgrep command with the `--help` flag to confirm successful installation and get an overview of its available functionalities and options.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/aliengrep/markdown.md#_snippet_1>

LANGUAGE: sh
CODE:

```
semgrep --help
```

---

TITLE: Installing Python Packages from Direct URLs
DESCRIPTION: This example illustrates how to specify Python packages directly from a URL, such as a GitHub archive. It also shows how to include a hash for integrity verification, although the hash in the example is a placeholder comment.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_nested_dep_dupes/a/b/requirements.txt#_snippet_4>

LANGUAGE: Python
CODE:

```
at-url @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip
at-url-with-hash @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip#look-this-is-not-a-comment
```

---

TITLE: Semgrep Manual Development Setup and Build
DESCRIPTION: These commands outline the initial setup and routine build process for Semgrep developers. It includes updating submodules, running an infrequent setup, and performing daily builds and tests using makefiles.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/INSTALL.md#_snippet_0>

LANGUAGE: bash
CODE:

```
git submodule update --init --recursive
make setup       # meant to be run infrequently, may not be sufficient
make             # routine build
make test        # test everything
```

---

TITLE: Semgrep CLI Quick Start Scan
DESCRIPTION: Demonstrates how to quickly start a scan with Semgrep using the `scan` subcommand and automatic configuration.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/snapshots/test_help/test_help_text/-h/help.txt#_snippet_1>

LANGUAGE: Shell
CODE:

```
semgrep scan --config auto
```

---

TITLE: Install Semgrep on macOS, Linux, or via Docker
DESCRIPTION: Instructions for installing Semgrep using Homebrew for macOS, pip for Ubuntu/WSL/Linux, or Docker for a quick trial without local installation.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/aliengrep/markdown.md#_snippet_0>

LANGUAGE: sh
CODE:

```
# For macOS
$ brew install semgrep

# On Ubuntu/WSL/linux, we recommend installing via `pip`
$ python3 -m pip install semgrep

# To try Semgrep without installation run via Docker
$ docker run --rm -v "${PWD}:/src" returntocorp/semgrep --help
```

---

TITLE: Install Semgrep via Homebrew, Pip, or Docker
DESCRIPTION: Instructions for installing Semgrep on macOS using Homebrew, on Ubuntu/WSL/Linux using pip, or trying it without installation using Docker for quick evaluation.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/spacegrep/markdown.md#_snippet_0>

LANGUAGE: sh
CODE:

```
# For macOS
$ brew install semgrep

# On Ubuntu/WSL/linux, we recommend installing via `pip`
$ python3 -m pip install semgrep

# To try Semgrep without installation run via Docker
$ docker run --rm -v "${PWD}:/src" returntocorp/semgrep --help
```

---

TITLE: Build and Install spacegrep Binary
DESCRIPTION: These commands compile the `spacegrep` binary from source using `make build` and then install it to the system's `$PATH` using `make install`, making it globally accessible.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/src/spacegrep/README.md#_snippet_3>

LANGUAGE: Shell
CODE:

```
make build  # builds the spacegrep binary
make install # puts spacegrep on your $PATH
```

---

TITLE: Direct Python Package Installations and Unsafe Packages
DESCRIPTION: This section illustrates direct package installations in a requirements file, alongside a comment highlighting packages that are generally considered unsafe to include directly due to their nature (e.g., setuptools for build systems). These packages are typically managed implicitly or through other means.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_folder_no_src/requirements/stage.txt#_snippet_1>

LANGUAGE: pip-requirements
CODE:

```
# The following packages are considered to be unsafe in a requirements file:
# setuptools

pytest
pytest-cov
beautifulsoup4
```

---

TITLE: Python Package Installation from Direct URL to Wheel
DESCRIPTION: This snippet shows how to install a Python package directly from a URL pointing to a `.whl` (wheel) file, bypassing package indexes.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements3/requirements3.txt#_snippet_8>

LANGUAGE: Python
CODE:

```
http://wxpython.org/Phoenix/snapshot-builds/wxPython_Phoenix-3.0.3.dev1820+49a8884-cp34-none-win_amd64.whl
```

---

TITLE: Apply GNU LGPL Notice to Library Source Files
DESCRIPTION: This template provides the standard GNU Lesser General Public License notice to be attached to the start of each source file of a new library. It includes copyright information, redistribution terms, and warranty disclaimers, and directs users to the full license text.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/languages/python/menhir/license.txt#_snippet_0>

LANGUAGE: Text
CODE:

```
    <one line to give the library's name and a brief idea of what it does.>
    Copyright (C) <year>  <name of author>

    This library is free software; you can redistribute it and/or
    modify it under the terms of the GNU Lesser General Public
    License as published by the Free Software Foundation; either
    version 2.1 of the License, or (at your option) any later version.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public
    License along with this library; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
```

---

TITLE: Specifying Python Package Requirements from URLs
DESCRIPTION: This snippet demonstrates how to specify Python package requirements directly from a URL. It includes examples of installing from a zip archive URL and also shows how to include a hash in the URL for integrity verification, although the hash in the example is noted as not being a comment.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements/requirements.txt#_snippet_4>

LANGUAGE: Python Requirements
CODE:

```
at-url @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip
at-url-with-hash @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip#look-this-is-not-a-comment
```

---

TITLE: Specify Python Packages from Local or Remote Wheel Files
DESCRIPTION: This snippet demonstrates how to directly specify a local or remote Python wheel (.whl) file as a dependency. This is useful for installing specific builds, pre-compiled packages, or packages not available on PyPI.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/osv_parsing/requirements/file-format-example/requirements.txt#_snippet_3>

LANGUAGE: Requirements
CODE:

```
./downloads/numpy-1.9.2-cp34-none-win32.whl
http://wxpython.org/Phoenix/snapshot-builds/wxPython_Phoenix-3.0.3.dev1820+49a8884-cp34-none-win_amd64.whl
```

---

TITLE: Python Package Installation from URL
DESCRIPTION: This snippet shows how to specify a package to be installed directly from a URL, including support for a hash to verify the integrity of the downloaded file.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements3/requirements3.txt#_snippet_5>

LANGUAGE: Python
CODE:

```
at-url @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip
at-url-with-hash @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip#look-this-is-not-a-comment
```

---

TITLE: Advanced Python Requirements File Features with Conditions
DESCRIPTION: This snippet demonstrates advanced features of Python requirements files, including conditional package installations based on Python version or operating system. It shows how to specify package versions, extras, and apply multiple conditions for installation.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_folder_no_src/requirements/stage.txt#_snippet_2>

LANGUAGE: pip-requirements
CODE:

```
space-eqeq == 0.6.1
eqeq-star [security] == 2.8.*, <= 2.8.1 ; python_version < "2.7"
extras-only [security] == 2.8.4 ; python_version < "2.7"
condition-only ==2.8.5 ; python_version < "2.7"
extras-and-two-conditions[security] == 2.8.3 ; python_version < "2.7" or sys_platform == 'darwin'
```

---

TITLE: Upgrade Semgrep Installation
DESCRIPTION: Provides commands to upgrade Semgrep based on the installation method: Homebrew, pip, or Docker. Users should run the command corresponding to their initial installation.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/aliengrep/markdown.md#_snippet_9>

LANGUAGE: sh
CODE:

```
# Using Homebrew
$ brew upgrade semgrep
```

LANGUAGE: python
CODE:

```
# Using pip
$ python3 -m pip install --upgrade semgrep
```

LANGUAGE: docker
CODE:

```
# Using Docker
$ docker pull returntocorp/semgrep:latest
```

---

TITLE: Template for GNU LGPL Copyright Notice
DESCRIPTION: A template to be attached to the start of each source file of a library licensed under the GNU Lesser General Public License. It includes placeholders for the library's name, author, copyright year, and the standard LGPL distribution terms, emphasizing the exclusion of warranty.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/libs/commons/license.txt#_snippet_0>

LANGUAGE: Legal Text
CODE:

```
<one line to give the library's name and a brief idea of what it does.>
Copyright (C) <year>  <name of author>

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
```

---

TITLE: Advanced Python Requirements File Features
DESCRIPTION: Examples demonstrating advanced features of pip requirements files, including package names with spaces, extras, version specifiers with wildcards, and environment markers for conditional installation.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes/requirements.txt#_snippet_3>

LANGUAGE: Python Requirements
CODE:

```
space-eqeq == 0.6.1
eqeq-star [security] == 2.8.*, <= 2.8.1 ; python_version < "2.7"
extras-only [security] == 2.8.4 ; python_version < "2.7"
condition-only ==2.8.5 ; python_version < "2.7"
extras-and-two-conditions[security] == 2.8.3 ; python_version < "2.7" or sys_platform == 'darwin'
```

---

TITLE: Python Package Installation from Local Path
DESCRIPTION: This snippet illustrates how to specify a local path to a Python distribution file (e.g., a `.whl` file) for installation, useful for offline installations or custom builds.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements3/requirements3.txt#_snippet_7>

LANGUAGE: Python
CODE:

```
./downloads/numpy-1.9.2-cp34-none-win32.whl
```

---

TITLE: Python Package Installation from URLs and Local Paths
DESCRIPTION: This snippet illustrates how to specify Python package installations directly from a URL (e.g., a Git repository archive or a wheel file) or from a local file path. This method is useful for installing packages not available on PyPI or for specific local builds.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements/stage.txt#_snippet_3>

LANGUAGE: Python
CODE:

```
at-url @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip
at-url-with-hash @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip#look-this-is-not-a-comment

# It is possible to refer to specific local distribution paths.
./downloads/numpy-1.9.2-cp34-none-win32.whl

# It is possible to refer to URLs.
http://wxpython.org/Phoenix/snapshot-builds/wxPython_Phoenix-3.0.3.dev1820+49a8884-cp34-none-win_amd64.whl
```

---

TITLE: Run Semgrep on Go (govwa)
DESCRIPTION: Demonstrates how to clone the `govwa` repository and run Semgrep with a security audit ruleset. This example targets a vulnerable Go application.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/aliengrep/markdown.md#_snippet_5>

LANGUAGE: bash
CODE:

```
git clone https://github.com/0c34/govwa
semgrep -f https://semgrep.dev/p/r2c-security-audit govwa
```

---

TITLE: Semgrep CLI Subcommand Help
DESCRIPTION: Shows how to get detailed help information for any specific `semgrep` subcommand.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/snapshots/test_help/test_help_text/-h/help.txt#_snippet_2>

LANGUAGE: Shell
CODE:

```
semgrep SUBCOMMAND --help
```

---

TITLE: Sample Copyright Disclaimer for Employers/Schools
DESCRIPTION: An example of a copyright disclaimer statement for employers or schools to sign, relinquishing their copyright interest in a library developed by an employee or student. This sample includes placeholders for the organization's name, library name, author, and signatory details.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/languages/cpp/menhir/license.txt#_snippet_1>

LANGUAGE: Text
CODE:

```
Yoyodyne, Inc., hereby disclaims all copyright interest in the
library `Frob' (a library for tweaking knobs) written by James Random Hacker.

<signature of Ty Coon>, 1 April 1990
Ty Coon, President of Vice
```

---

TITLE: Sample Copyright Disclaimer for GNU LGPL
DESCRIPTION: An example of a copyright disclaimer to be signed by an employer or school, relinquishing copyright interest in a library developed by an employee or student. This ensures the library can be freely distributed under the GNU LGPL without employer claims.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/libs/commons/license.txt#_snippet_1>

LANGUAGE: Legal Text
CODE:

```
Yoyodyne, Inc., hereby disclaims all copyright interest in the
library `Frob' (a library for tweaking knobs) written by James Random Hacker.

<signature of Ty Coon>, 1 April 1990
Ty Coon, President of Vice
```

---

TITLE: Pulling and Running Semgrep Docker Image
DESCRIPTION: This snippet demonstrates how to pull the latest development version of the `semgrep` Docker image from DockerHub and then run it to start an interactive bash session inside the container. This is the initial step for using the pre-installed `semgrep` environment.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/perf/README.md#_snippet_3>

LANGUAGE: bash
CODE:

```
docker pull returntocorp/semgrep:develop     # updates your local copy
docker run -it returntocorp/semgrep:develop  # starts bash in container
```

---

TITLE: Referencing Local Python Distribution Paths
DESCRIPTION: This example shows how to specify a local file path to a Python wheel (`.whl`) file or other distribution. This is particularly useful for offline installations, custom builds, or when distributing pre-compiled packages.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_nested_dep_dupes/a/b/requirements.txt#_snippet_6>

LANGUAGE: Python
CODE:

```
./downloads/numpy-1.9.2-cp34-none-win32.whl
```

---

TITLE: Upgrade Semgrep using various package managers
DESCRIPTION: Provides commands to upgrade Semgrep based on the installation method: Homebrew, pip, or Docker.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/spacegrep/markdown.md#_snippet_8>

LANGUAGE: sh
CODE:

```
# Using Homebrew
$ brew upgrade semgrep

# Using pip
$ python3 -m pip install --upgrade semgrep

# Using Docker
$ docker pull returntocorp/semgrep:latest
```

---

TITLE: Advanced Features of pip Requirements File Format
DESCRIPTION: This snippet demonstrates various advanced syntaxes supported by pip's requirements file format. It includes examples of conditional package installation based on Python version or system platform, direct URL references to packages, and inclusion of other requirement or constraint files.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_multiple_lockfiles/requirements/stage.txt#_snippet_2>

LANGUAGE: Python
CODE:

```
space-eqeq == 0.6.1
eqeq-star [security] == 2.8.*, <= 2.8.1 ; python_version < "2.7"
extras-only [security] == 2.8.4 ; python_version < "2.7"
condition-only ==2.8.5 ; python_version < "2.7"
extras-and-two-conditions[security] == 2.8.3 ; python_version < "2.7" or sys_platform == 'darwin'

at-url @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip
at-url-with-hash @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip#look-this-is-not-a-comment

-r other-requirements.txt
-c constraints.txt

./downloads/numpy-1.9.2-cp34-none-win32.whl

http://wxpython.org/Phoenix/snapshot-builds/wxPython_Phoenix-3.0.3.dev1820+49a8884-cp34-none-win_amd64.whl
```

---

TITLE: Advanced Conditional Python Package Dependencies
DESCRIPTION: Examples demonstrating advanced features of Python `requirements.txt` files, including specifying optional 'extras' for a package and applying conditional installations based on Python version or operating system.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirement/requirement.txt#_snippet_3>

LANGUAGE: Python Requirements
CODE:

```
space-eqeq == 0.6.1
eqeq-star [security] == 2.8.*, <= 2.8.1 ; python_version < "2.7"
extras-only [security] == 2.8.4 ; python_version < "2.7"
condition-only ==2.8.5 ; python_version < "2.7"
extras-and-two-conditions[security] == 2.8.3 ; python_version < "2.7" or sys_platform == 'darwin'
```

---

TITLE: Running Semgrep Development Version with Pipenv
DESCRIPTION: This snippet demonstrates how to activate a pipenv shell within the Semgrep directory to run the development version of the `semgrep` command without a full installation. It allows for quick testing and interaction with the `semgrep` CLI.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/INSTALL.md#_snippet_1>

LANGUAGE: bash
CODE:

```
cd semgrep
pipenv shell
semgrep --help
```

---

TITLE: Specify Python Requirements with Version Constraints
DESCRIPTION: This snippet demonstrates various version specifiers for Python packages in a requirements file. It includes examples for exact version matching (==), minimum version (>=), version exclusion (!=), and compatible release (~=), allowing precise control over dependency versions.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/osv_parsing/requirements/file-format-example/requirements.txt#_snippet_1>

LANGUAGE: Requirements
CODE:

```
docopt == 0.6.1
keyring >= 4.1.1
coverage != 3.5
Mopidy-Dirble ~= 1.1
```

---

TITLE: Define a Semgrep Benchmark Run Configuration (YAML)
DESCRIPTION: This YAML snippet provides an example of how to configure a specific Semgrep benchmark run. It defines the benchmark's name, the target repositories with their commit hashes, the Semgrep rule configurations to apply, and any additional command-line options for Semgrep.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/perf/README.md#_snippet_2>

LANGUAGE: yaml
CODE:

```
runs:
  - name: zulip # zulip rules on zulip
    repos:
      - url: https://github.com/zulip/zulip
        commit_hash: 829f9272d2c4299a0c0a37a09802248d8136c0a8
    rule_configs:
      - rules/zulip/semgrep.yml
    opts: [--fast]
```

---

TITLE: Run Semgrep CLI with Text Output Format using run_semgrep_in_tmp
DESCRIPTION: Example of specifying the output format as plain text using `OutputFormat.TEXT` instead of the default JSON output when running Semgrep via the fixture.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/README.md#_snippet_8>

LANGUAGE: Python
CODE:

```
run_semgrep_in_tmp("r2c/python", output_format=OutputFormat.TEXT)
```

---

TITLE: Mounting Local Code into Semgrep Docker Container
DESCRIPTION: This example illustrates how to mount a local directory into the `semgrep` Docker container using the `-v` option. It shows how to verify the mounted content and confirm the `semgrep` user and version inside the container, enabling testing of local code.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/perf/README.md#_snippet_4>

LANGUAGE: bash
CODE:

```
$ ls
my_stuff
$ docker run -v "$(pwd)"/my_stuff:/home/semgrep/my_stuff -it returntocorp/semgrep:develop
bash-5.1$ whoami
semgrep
bash-5.1$ ls ~
my_stuff
bash-5.1$ semgrep --version
0.46.0
```

---

TITLE: Specify Python Requirements Without Version Constraints
DESCRIPTION: This snippet shows how to list Python packages in a requirements file without specifying any particular version. When installed, pip will typically resolve to the latest compatible version available.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/osv_parsing/requirements/file-format-example/requirements.txt#_snippet_0>

LANGUAGE: Requirements
CODE:

```
pytest
pytest-cov
beautifulsoup4
```

---

TITLE: Run Semgrep with Single Rule Patterns or Rule Sets
DESCRIPTION: Examples demonstrating how to run Semgrep with a single inline rule pattern (e.g., for Python to find `X == X` bugs) or by specifying an entire rule set from the Semgrep Registry for comprehensive analysis across many languages.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/spacegrep/markdown.md#_snippet_2>

LANGUAGE: sh
CODE:

```
# Check for Python == where the left and right hand sides are the same (often a bug)
$ semgrep -e '$X == $X' --lang=py path/to/src

# Run a ruleset with rules for many languages
$ semgrep --config=https://semgrep.dev/p/r2c-CI path/to/src
```

---

TITLE: Semgrep Dependency-Aware Scan Results (JSON Output)
DESCRIPTION: Displays the detailed JSON output from a Semgrep scan, including scan errors, paths scanned, and a list of findings. This example highlights a Software Composition Analysis (SCA) finding for the 'faker' package, detailing its ecosystem, version, and reachability.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc/rulesdependency_awarepython-poetry-sca.yaml-dependency_awarepoetry/results.txt#_snippet_0>

LANGUAGE: JSON
CODE:

```
{
  "errors": [],
  "paths": {
    "scanned": [
      "targets/dependency_aware/poetry/poetry.lock",
      "targets/dependency_aware/poetry/sca-poetry.py"
    ]
  },
  "results": [
    {
      "check_id": "rules.dependency_aware.python-poetry-sca",
      "end": {
        "col": 6,
        "line": 1,
        "offset": 5
      },
      "extra": {
        "engine_kind": "OSS",
        "fingerprint": "0x42",
        "lines": "requires login",
        "message": "oh no",
        "metadata": {},
        "sca_info": {
          "dependency_match": {
            "dependency_pattern": {
              "ecosystem": "pypi",
              "package": "faker",
              "semver_range": "<= 13.11.1"
            },
            "found_dependency": {
              "allowed_hashes": {},
              "children": [
                {
                  "package": "python-dateutil",
                  "version": "2.8.2"
                },
                {
                  "package": "typing-extensions",
                  "version": "4.2.0"
                }
              ],
              "ecosystem": "pypi",
              "line_number": 17,
              "lockfile_path": "targets/dependency_aware/poetry/poetry.lock",
              "manifest_path": "targets/dependency_aware/poetry/pyproject.toml",
              "package": "faker",
              "transitivity": "direct",
              "version": "13.11.1"
            },
            "lockfile": "targets/dependency_aware/poetry/poetry.lock"
          },
          "reachability_rule": true,
          "reachable": true,
          "sca_finding_schema": 20220913
        },
        "severity": "WARNING",
        "validation_state": "NO_VALIDATOR"
      },
      "path": "targets/dependency_aware/poetry/sca-poetry.py",
      "start": {
        "col": 1,
        "line": 1,
        "offset": 0
      }
    }
  ],
  "skipped_rules": [],
  "time": {
    "max_memory_bytes": "<masked in tests>",
    "parsing_time": {
      "per_file_time": {
        "mean": "<masked in tests>",
        "std_dev": "<masked in tests>"
      },
      "total_time": "<masked in tests>",
      "very_slow_files": "<masked in tests>"
    },
    "profiling_times": "<masked in tests>",
    "rules": [],
    "rules_parse_time": "<masked in tests>",
    "targets": [],
    "total_bytes": 0
  },
  "version": "0.42"
}
```

---

TITLE: Python Package Installation from URLs and Local Paths
DESCRIPTION: This snippet demonstrates how to specify Python packages directly from URLs (including archives and wheel files), local distribution paths, and how to refer to other requirement or constraint files using -r and -c flags.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements_multiple_lockfiles_no_src/requirements/stage.txt#_snippet_3>

LANGUAGE: Python
CODE:

```
at-url @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip
at-url-with-hash @ https://github.com/urllib3/urllib3/archive/refs/tags/1.26.8.zip#look-this-is-not-a-comment

# It is possible to refer to other requirement files or constraints files.
-r other-requirements.txt
-c constraints.txt

# It is possible to refer to specific local distribution paths.
./downloads/numpy-1.9.2-cp34-none-win32.whl

# It is possible to refer to URLs.
http://wxpython.org/Phoenix/snapshot-builds/wxPython_Phoenix-3.0.3.dev1820+49a8884-cp34-none-win_amd64.whl
```

---

TITLE: GNU LGPL License Notice Template for Libraries
DESCRIPTION: This template provides the standard GNU Lesser General Public License notice to be attached to new software libraries. It includes placeholders for the library's name, copyright year, and author, along with the full license text and warranty disclaimers. It is recommended to place this notice at the start of each source file.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/libs/lib_parsing/license.txt#_snippet_0>

LANGUAGE: Text
CODE:

```
<one line to give the library's name and a brief idea of what it does.>
Copyright (C) <year>  <name of author>

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
```

---

TITLE: Example Semgrep Scan Results JSON Output
DESCRIPTION: Provides a comprehensive example of the JSON structure returned by Semgrep after a scan, specifically highlighting the `results` array with `sca_info` for supply chain analysis findings, `paths` scanned, and overall `time` and `version` information. This output can be parsed to automate vulnerability management.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc/rulesdependency_awareswift-sca.yaml-dependency_awareswiftpmv1/results.txt#_snippet_0>

LANGUAGE: JSON
CODE:

```
{
  "errors": [],
  "paths": {
    "scanned": [
      "targets/dependency_aware/swiftpm/v1/Package.resolved",
      "targets/dependency_aware/swiftpm/v1/Package.swift"
    ]
  },
  "results": [
    {
      "check_id": "rules.dependency_aware.swift-swiftpm-sca",
      "end": {
        "col": 1,
        "line": 28,
        "offset": 0
      },
      "extra": {
        "engine_kind": "OSS",
        "fingerprint": "0x42",
        "lines": "requires login",
        "message": "oh no",
        "metadata": {},
        "sca_info": {
          "dependency_match": {
            "dependency_pattern": {
              "ecosystem": "swiftpm",
              "package": "swift-collections",
              "semver_range": "< 2.0.6"
            },
            "found_dependency": {
              "allowed_hashes": {},
              "ecosystem": "swiftpm",
              "git_ref": "d029d9d39c87bed85b1c50adee7c41795261a192",
              "line_number": 28,
              "lockfile_path": "targets/dependency_aware/swiftpm/v1/Package.resolved",
              "manifest_path": "targets/dependency_aware/swiftpm/v1/Package.swift",
              "package": "swift-collections",
              "resolved_url": "https://github.com/apple/swift-collections.git",
              "transitivity": "direct",
              "version": "1.0.6"
            },
            "lockfile": "targets/dependency_aware/swiftpm/v1/Package.resolved"
          },
          "reachability_rule": true,
          "reachable": false,
          "sca_finding_schema": 20220913
        },
        "severity": "WARNING"
      },
      "path": "targets/dependency_aware/swiftpm/v1/Package.resolved",
      "start": {
        "col": 1,
        "line": 28,
        "offset": 0
      }
    }
  ],
  "skipped_rules": [],
  "time": {
    "max_memory_bytes": "<masked in tests>",
    "profiling_times": "<masked in tests>",
    "rules": [],
    "rules_parse_time": "<masked in tests>",
    "targets": [],
    "total_bytes": 0
  },
  "version": "0.42"
}
```

---

TITLE: Example Document for spacegrep Pattern Matching
DESCRIPTION: This document demonstrates various occurrences of the `exec` keyword, including function calls, comments, and strings, to be processed by spacegrep. It showcases how `spacegrep` handles different contexts.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/src/spacegrep/README.md#_snippet_1>

LANGUAGE: Generic Code
CODE:

```
import exec as safe_function
safe_function(user_input)

exec("ls")

exec(some_var)

some_exec(foo)

exec (foo)

exec (
    bar
)

# exec(foo)

print("exec(bar)")
```

---

TITLE: Python Dictionary Direct Access to Get Method Autofix
DESCRIPTION: Semgrep rule `rules.autofix.use-dict-get` identifies direct dictionary access (e.g., `dict[key]`) that can lead to `KeyNotFound` errors if the key does not exist. The autofix suggests replacing such access with the safer `.get()` method (e.g., `dict.get(key)`). This snippet illustrates two examples of the original problematic expressions and their corresponding autofixed versions.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/snapshots/test_autofix/test_autofix_text_output/autofix.yaml-autofix.py-text-not-dryrun/results.txt#_snippet_0>

LANGUAGE: Python
CODE:

```
inputs[x]
```

LANGUAGE: Python
CODE:

```
inputs.get(x)
```

LANGUAGE: Python
CODE:

```
inputs[x + 1]
```

LANGUAGE: Python
CODE:

```
inputs.get((x + 1))
```

---

TITLE: Run Semgrep on Node.js + Express (juice-shop)
DESCRIPTION: Demonstrates how to clone the `juice-shop` repository and run Semgrep with a security audit ruleset. This example targets a vulnerable Node.js and Express application.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/aliengrep/markdown.md#_snippet_3>

LANGUAGE: bash
CODE:

```
git clone https://github.com/bkimminich/juice-shop
semgrep -f https://semgrep.dev/p/r2c-security-audit juice-shop
```

---

TITLE: Semgrep Scan Status and Summary (Stderr)
DESCRIPTION: This plain text output from standard error provides a summary of the Semgrep scan process, including the number of files scanned, rules applied, and the total number of findings.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc__lockfileless/rulesdependency_awarejava-gradle-sca.yaml-dependency_awaregradle-no-lockfile/results.txt#_snippet_1>

LANGUAGE: Plain Text
CODE:

```

┌─────────────┐
│ Scan Status │
└─────────────┘
  Scanning 19 files tracked by git with 0 Code rules, 1 Supply Chain rule:


  CODE RULES
  Nothing to scan.

  SUPPLY CHAIN RULES
  Scanning 1 file.


┌──────────────┐
│ Scan Summary │
└──────────────┘

Ran 1 rule on 2 files: 1 finding.
```

---

TITLE: Semgrep CLI Basic Usage
DESCRIPTION: Illustrates the general command structure for `semgrep`, including the quick start command `semgrep scan --config auto` and how to access help for specific subcommands using `semgrep SUBCOMMAND --help`. By default, if no subcommand is passed, `scan` is executed.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/snapshots/test_help/test_help_text/--help/help.txt#_snippet_0>

LANGUAGE: Shell
CODE:

```
semgrep [OPTIONS] COMMAND [ARGS]...
semgrep scan --config auto
semgrep SUBCOMMAND --help
```

---

TITLE: Semgrep Scan Results JSON Output
DESCRIPTION: The `stdout` of a Semgrep scan, presented as a JSON object. It contains details about detected findings, such as `check_id`, `path`, `start`/`end` positions, and `sca_info` for supply chain analysis, including `dependency_match` details.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc/rulesdependency_awarenested_package_lock.yaml-dependency_awarenested_package_lock/results.txt#_snippet_0>

LANGUAGE: JSON
CODE:

```
{
  "errors": [],
  "paths": {
    "scanned": [
      "targets/dependency_aware/nested_package_lock/package-lock.json"
    ]
  },
  "results": [
    {
      "check_id": "rules.dependency_aware.nested_package_lock",
      "end": {
        "col": 1,
        "line": 40,
        "offset": 0
      },
      "extra": {
        "engine_kind": "OSS",
        "fingerprint": "0x42",
        "lines": "requires login",
        "message": "oh no",
        "metadata": {},
        "sca_info": {
          "dependency_match": {
            "dependency_pattern": {
              "ecosystem": "npm",
              "package": "@types/jquery",
              "semver_range": "== 3.3.1"
            },
            "found_dependency": {
              "allowed_hashes": {
                "sha512": [
                  "6b8243708849847627a160a41b7c53d826715d9780f7625e444112a2b8340cc43766c8ee285e3c87b5cae25e469761916bf22d191a4a313d29c8af3cc9182a5d"
                ]
              },
              "ecosystem": "npm",
              "line_number": 40,
              "lockfile_path": "targets/dependency_aware/nested_package_lock/package-lock.json",
              "package": "@types/jquery",
              "resolved_url": "https://registry.npmjs.org/@types/jquery/-/jquery-3.3.22.tgz",
              "transitivity": "transitive",
              "version": "3.3.1"
            },
            "lockfile": "targets/dependency_aware/nested_package_lock/package-lock.json"
          },
          "reachability_rule": false,
          "reachable": false,
          "sca_finding_schema": 20220913
        },
        "severity": "WARNING"
      },
      "path": "targets/dependency_aware/nested_package_lock/package-lock.json",
      "start": {
        "col": 1,
        "line": 40,
        "offset": 0
      }
    }
  ],
  "skipped_rules": [],
  "time": {
    "max_memory_bytes": "<masked in tests>",
    "profiling_times": "<masked in tests>",
    "rules": [],
    "rules_parse_time": "<masked in tests>",
    "targets": [],
    "total_bytes": 0
  },
  "version": "0.42"
}
```

---

TITLE: Semgrep Scan Status and Summary Console Output
DESCRIPTION: The plain text output to stderr, providing a summary of the Semgrep scan process, including the number of files scanned, rules applied (Code and Supply Chain), and a final scan summary with findings count.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc/rulesdependency_awarejava-gradle-sca.yaml-dependency_awaregradle-kts/results.txt#_snippet_2>

LANGUAGE: Shell
CODE:

```


┌─────────────┐
│ Scan Status │
└─────────────┘
  Scanning 3 files tracked by git with 0 Code rules, 1 Supply Chain rule:


  CODE RULES
  Nothing to scan.

  SUPPLY CHAIN RULES
  Scanning 1 file and 1 dependency source.

  Dependency Sources                                    Resolution Method   Ecosystem   Dependencies   Rules
 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  targets/dependency_aware/gradle-kts/gradle.lockfile   Lockfile            Maven       317                1



┌──────────────┐
│ Scan Summary │
└──────────────┘
✅ Scan completed successfully.
 • Findings: 1 (1 blocking)
 • Rules run: 1
 • Targets scanned: 2
 • Parsed lines: ~100.0%
 • No ignore information available
Ran 1 rule on 2 files: 1 finding.

```

---

TITLE: Semgrep Scan Results JSON Output
DESCRIPTION: This JSON object represents the detailed results of a Semgrep dependency-aware scan. It includes information about scanned paths, detected findings (e.g., SCA vulnerabilities), and scan metadata. Each finding details the "check_id", "path", "start"/"end" positions, and "extra" information like "sca_info" for dependency matches and reachability.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc__requirements_lockfiles/rulesdependency_awarepython-requirements-sca.yaml-dependency_awarerequirements_multiple_lockfiles_dep_dupes_no_src/results.txt#_snippet_0>

LANGUAGE: JSON
CODE:

```
{
  "errors": [],
  "paths": {
    "scanned": [
      "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements/prod.txt",
      "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements/stage.txt",
      "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements.txt"
    ]
  },
  "results": [
    {
      "check_id": "rules.dependency_aware.python-requirements-sca",
      "end": {
        "col": 1,
        "line": 37,
        "offset": 0
      },
      "extra": {
        "engine_kind": "OSS",
        "fingerprint": "0x42",
        "lines": "requires login",
        "message": "oh no",
        "metadata": {},
        "sca_info": {
          "dependency_match": {
            "dependency_pattern": {
              "ecosystem": "pypi",
              "package": "pandas",
              "semver_range": "<= 1.4.2"
            },
            "found_dependency": {
              "allowed_hashes": {},
              "ecosystem": "pypi",
              "line_number": 37,
              "lockfile_path": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements.txt",
              "manifest_path": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements.in",
              "package": "pandas",
              "transitivity": "direct",
              "version": "1.4.2"
            },
            "lockfile": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements.txt"
          },
          "reachability_rule": true,
          "reachable": false,
          "sca_finding_schema": 20220913
        },
        "severity": "WARNING"
      },
      "path": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements.txt",
      "start": {
        "col": 1,
        "line": 37,
        "offset": 0
      }
    },
    {
      "check_id": "rules.dependency_aware.python-requirements-sca",
      "end": {
        "col": 1,
        "line": 1,
        "offset": 0
      },
      "extra": {
        "engine_kind": "OSS",
        "fingerprint": "0x42",
        "lines": "requires login",
        "message": "oh no",
        "metadata": {},
        "sca_info": {
          "dependency_match": {
            "dependency_pattern": {
              "ecosystem": "pypi",
              "package": "pandas",
              "semver_range": "<= 1.4.2"
            },
            "found_dependency": {
              "allowed_hashes": {},
              "ecosystem": "pypi",
              "line_number": 1,
              "lockfile_path": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements/prod.txt",
              "manifest_path": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements.in",
              "package": "pandas",
              "transitivity": "direct",
              "version": "1.4.2"
            },
            "lockfile": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements/prod.txt"
          },
          "reachability_rule": true,
          "reachable": false,
          "sca_finding_schema": 20220913
        },
        "severity": "WARNING"
      },
      "path": "targets/dependency_aware/requirements_multiple_lockfiles_dep_dupes_no_src/requirements/prod.txt",
      "start": {
        "col": 1,
        "line": 1,
        "offset": 0
      }
    }
  ],
  "skipped_rules": [],
  "time": {
    "max_memory_bytes": "<masked in tests>",
    "profiling_times": "<masked in tests>",
    "rules": [],
    "rules_parse_time": "<masked in tests>",
    "targets": [],
    "total_bytes": 0
  },
  "version": "0.42"
}
```

---

TITLE: Run Semgrep on Python + Flask (Vulnerable-Flask-App)
DESCRIPTION: Demonstrates how to clone the `Vulnerable-Flask-App` repository and run Semgrep with a security audit ruleset. This example targets a vulnerable Python and Flask application.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/aliengrep/markdown.md#_snippet_6>

LANGUAGE: bash
CODE:

```
git clone https://github.com/we45/Vulnerable-Flask-App
semgrep -f https://semgrep.dev/p/r2c-security-audit Vulnerable-Flask-App
```

---

TITLE: Listing Unsafe and Direct Python Package Requirements
DESCRIPTION: This snippet demonstrates how to include comments about packages considered unsafe in a requirements file. It also shows examples of directly listing packages without specific version constraints, which pip will install to their latest compatible versions.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements/requirements.txt#_snippet_2>

LANGUAGE: Python Requirements
CODE:

```
# The following packages are considered to be unsafe in a requirements file:
# setuptools

pytest
pytest-cov
beautifulsoup4
```

---

TITLE: Specifying Python Package Requirements from Local Paths
DESCRIPTION: This snippet shows how to install a Python package directly from a local file path, specifically referencing a .whl (wheel) distribution file. This is useful for installing pre-built packages or packages not available in public repositories.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/targets/dependency_aware/requirements/requirements.txt#_snippet_6>

LANGUAGE: Python Requirements
CODE:

```
./downloads/numpy-1.9.2-cp34-none-win32.whl
```

---

TITLE: Python Variable Assignment
DESCRIPTION: This snippet shows a basic variable assignment in Python, where an integer value is assigned to a variable 'x'.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/snapshots/test_baseline/test_worktree_state_restored/output.txt#_snippet_0>

LANGUAGE: Python
CODE:

```
x = 23478921
```

---

TITLE: Semgrep Console Output: Scan Status and Summary
DESCRIPTION: This plain text output from Semgrep's standard error stream provides a high-level overview of the scan process. It reports the number of files scanned, the types of rules applied (Code and Supply Chain), and a final summary indicating the total rules run and findings identified. In this specific example, a single supply chain rule found one issue.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc__lockfileless/rulesdependency_awarenuget-newtonsoft-json-parity.yaml-dependency_awarenuget_no_lockfile/results.txt#_snippet_1>

LANGUAGE: Plain Text
CODE:

```
┌─────────────┐
│ Scan Status │
└─────────────┘
  Scanning 7 files tracked by git with 0 Code rules, 1 Supply Chain rule:


  CODE RULES
  Nothing to scan.

  SUPPLY CHAIN RULES
  Nothing to scan.


┌──────────────┐
│ Scan Summary │
└──────────────┘

Ran 1 rule on 1 file: 1 finding.
```

---

TITLE: Example Semgrep File Performance Statistics JSON
DESCRIPTION: An example JSON array showing performance metrics for a single file, including size, scan count, parse time, match time, and total run time. This data is typically found under 'Performance statistics for slowest files'.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/metrics.md#_snippet_3>

LANGUAGE: JSON
CODE:

```
[{"size": 6725,"numTimesScanned": 147,"parseTime": 0.013289928436279297,"matchTime": 0.05480456352233887,"runTime": 0.20836973190307617}]
```

---

TITLE: Run Semgrep CLI with Default Configuration using run_semgrep_in_tmp
DESCRIPTION: Example of using the `run_semgrep_in_tmp` pytest fixture to execute the `semgrep` command-line tool with a specified configuration, defaulting to files in `e2e/targets/basic/`.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/README.md#_snippet_4>

LANGUAGE: Python
CODE:

```
run_semgrep_in_tmp("r2c/python")
```

---

TITLE: Sample Copyright Disclaimer for Employers/Schools
DESCRIPTION: An example of a copyright disclaimer to be signed by an employer or school, relinquishing their copyright interest in a library developed by an employee or student, ensuring the library can be freely distributed under the LGPL.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/languages/javascript/menhir/license.txt#_snippet_1>

LANGUAGE: Legal Template
CODE:

```
Yoyodyne, Inc., hereby disclaims all copyright interest in the
library `Frob' (a library for tweaking knobs) written by James Random Hacker.

<signature of Ty Coon>, 1 April 1990
Ty Coon, President of Vice
```

---

TITLE: Semgrep CLI General Usage
DESCRIPTION: Provides the general syntax for using the `semgrep` command-line tool, including options, commands, and arguments.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/snapshots/test_help/test_help_text/-h/help.txt#_snippet_0>

LANGUAGE: Shell
CODE:

```
semgrep [OPTIONS] COMMAND [ARGS]...
```

---

TITLE: Semgrep YAML Rule Match Examples for 'importantKey'
DESCRIPTION: This snippet provides examples of YAML structures that match the `rules.foo` finding in `targets/yaml/yaml_capture.yaml`. It demonstrates different forms of `importantKey` usage, including boolean properties and array elements, as detected by the Semgrep rule.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e/snapshots/test_output/test_yaml_capturing/results.txt#_snippet_0>

LANGUAGE: YAML
CODE:

```
importantKey:
  prop1: true
importantKey:
  - idk: true
importantKey:
  prop1: true
importantKey:
  - idk: true
```

---

TITLE: Semgrep Command Exit Code
DESCRIPTION: The exit code of the Semgrep command, indicating successful execution.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ssc/test_ssc/rulesdependency_awarejava-gradle-sca.yaml-dependency_awaregradle-kts/results.txt#_snippet_0>

LANGUAGE: Shell
CODE:

```
0
```

---

TITLE: Semgrep Python Finding and Autofix Example
DESCRIPTION: This snippet illustrates a Semgrep code finding in a Python file (`org/examples/foo.py`) where a 'useless comparison to 5' is detected. It also shows the suggested autofix, changing `x == 5` to `x == 2`.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/cli/tests/default/e2e-other/snapshots/test_ci/test_subdir/orgexamples-True/output.txt#_snippet_0>

LANGUAGE: Python
CODE:

```
# Original code
x == 5

# Suggested autofix
x == 2
```

---

TITLE: GNU LGPL Copyright Notice Template for Libraries
DESCRIPTION: Template for applying the GNU Lesser General Public License terms to a new software library, including copyright, redistribution, and warranty disclaimers. This notice should be attached to the start of each source file.

SOURCE: <https://github.com/semgrep/semgrep/blob/develop/languages/javascript/menhir/license.txt#_snippet_0>

LANGUAGE: Legal Template
CODE:

```
<one line to give the library's name and a brief idea of what it does.>
Copyright (C) <year>  <name of author>

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
```
