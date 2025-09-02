========================
CODE SNIPPETS
========================

TITLE: Install OpenAI CLI
DESCRIPTION: Installs the OpenAI CLI tool within a Python virtual environment using pip.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_0>

LANGUAGE: bash
CODE:

```
pip install openai-cli
```

----------------------------------------

TITLE: OpenAI CLI Interactive Mode
DESCRIPTION: Shows how to start an interactive shell session with the OpenAI CLI for continuous prompt-response interactions. Press Ctrl+C to exit.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_2>

LANGUAGE: bash
CODE:

```
$ openai repl
Prompt: Can generative AI replace humans?

No, generative AI cannot replace humans.
While generative AI can be used to automate certain tasks,
it cannot replace the creativity, intuition, and problem-solving
skills that humans possess.
Generative AI can be used to supplement human efforts,
but it cannot replace them.

Prompt: ^C
```

----------------------------------------

TITLE: Generate Fibonacci Python Module and Unit Tests
DESCRIPTION: A multi-step example demonstrating how to use the OpenAI CLI to generate a Python Fibonacci function and then create unit tests for it. It involves piping output between commands and using 'black' for formatting and 'pytest' for testing.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_5>

LANGUAGE: bash
CODE:

```
$ mkdir examples
$ touch examples/__init__.py
$ echo "Write Python function to calculate Fibonacci numbers" | openai complete - | black - > examples/fib.py
$ (echo 'Write unit tests for this Python module named "fib":
'; cat examples/fib.py) | openai complete - | black - > examples/test_fib.py
$ pytest -v examples/test_fib.py
============================== test session starts ==============================

examples/test_fib.py::TestFibonacci::test_eighth_fibonacci_number PASSED                                 [ 10%]
examples/test_fib.py::TestFibonacci::test_fifth_fibonacci_number PASSED                                  [ 20%]
examples/test_fib.py::TestFibonacci::test_first_fibonacci_number PASSED                                  [ 30%]
examples/test_fib.py::TestFibonacci::test_fourth_fibonacci_number PASSED                                 [ 40%]
examples/test_fib.py::TestFibonacci::test_negative_input PASSED                                          [ 50%]
examples/test_fib.py::TestFibonacci::test_ninth_fibonacci_number PASSED                                  [ 60%]
examples/test_fib.py::TestFibonacci::test_second_fibonacci_number PASSED                                 [ 70%]
examples/test_fib.py::TestFibonacci::test_seventh_fibonacci_number PASSED                                [ 80%]
examples/test_fib.py::TestFibonacci::test_sixth_fibonacci_number PASSED                                  [ 90%]
examples/test_fib.py::TestFibonacci::test_third_fibonacci_number PASSED                                  [100%]

=============================== 10 passed in 0.02s ===============================
```

----------------------------------------

TITLE: Build Standalone Binary
DESCRIPTION: Builds a standalone binary for the OpenAI CLI using 'pex' and moves it to the system's PATH for global access.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_4>

LANGUAGE: bash
CODE:

```
$ make openai && mv openai ~/bin/
$ openai repl
Prompt:
```

----------------------------------------

TITLE: OpenAI CLI Basic Usage
DESCRIPTION: Demonstrates basic usage of the OpenAI CLI for text completion by piping a prompt to the 'complete' command.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_1>

LANGUAGE: bash
CODE:

```
$ echo "Are cats faster than dogs?" | openai complete -
It depends on the breed of the cat and dog. Generally,
cats are faster than dogs over short distances,
but dogs are better at sustained running.
```

----------------------------------------

TITLE: OpenAI CLI Help Message
DESCRIPTION: Displays the main help message for the OpenAI CLI when run without any arguments, showing available options and commands.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_3>

LANGUAGE: bash
CODE:

```
$ openai
Usage: openai [OPTIONS] COMMAND [ARGS]...

Options:
  --help  Show this message and exit.

Commands:
  complete  Return OpenAI completion for a prompt from SOURCE.
  repl      Start interactive shell session for OpenAI completion API.
```

----------------------------------------

TITLE: Complete and Format Python Code
DESCRIPTION: This snippet demonstrates using the OpenAI CLI to complete Python code based on a prompt, format it with Black, and save the changes.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_8>

LANGUAGE: bash
CODE:

```
(echo "Add type annotations for this Python code"; cat examples/fib.py) | openai complete - | black - | tee tmp && mv tmp examples/fib.py
```

----------------------------------------

TITLE: Jaraco-Packaging Dependencies
DESCRIPTION: Dependencies for jaraco-packaging, a packaging utility.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_5>

LANGUAGE: python
CODE:

```
build[virtualenv]==1.2.2.post1
domdf-python-tools==3.9.0
jaraco-packaging==10.2.3
pytest-checkdocs==2.13.0
sphinx==8.1.3
```

----------------------------------------

TITLE: Sphinx Dependencies
DESCRIPTION: Dependencies for Sphinx, a documentation generator.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_3>

LANGUAGE: python
CODE:

```
alabaster==1.0.0
babel==2.17.0
docutils==0.21.2
imagesize==1.4.1
jinja2==3.1.5
markupsafe==3.0.2
pygments==2.19.1
snowballstemmer==2.2.0
sphinx==8.1.3
sphinxcontrib-applehelp==2.0.0
sphinxcontrib-devhelp==2.0.0
sphinxcontrib-htmlhelp==2.1.0
sphinxcontrib-jsmath==1.0.1
sphinxcontrib-qthelp==2.0.0
sphinxcontrib-serializinghtml==2.0.0
```

----------------------------------------

TITLE: Base Dependencies
DESCRIPTION: Core dependencies for the OpenAI CLI project.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_0>

LANGUAGE: python
CODE:

```
alabaster==1.0.0
astroid==3.3.8
babel==2.17.0
build[virtualenv]==1.2.2.post1
coverage[toml]==7.6.12
dill==0.3.9
distlib==0.3.9
domdf-python-tools==3.9.0
filelock==3.17.0
imagesize==1.4.1
iniconfig==2.0.0
isort==6.0.0
jaraco-context==6.0.1
jaraco-packaging==10.2.3
jinja2==3.1.5
markupsafe==3.0.2
mccabe==0.7.0
mypy==1.15.0
mypy-extensions==1.0.0
natsort==8.4.0
packaging==24.2
platformdirs==4.3.6
pluggy==1.5.0
pycodestyle==2.12.1
pyflakes==3.2.0
pygments==2.19.1
pyproject-hooks==1.2.0
pytest==8.3.4
snowballstemmer==2.2.0
sphinx==8.1.3
sphinxcontrib-applehelp==2.0.0
sphinxcontrib-devhelp==2.0.0
sphinxcontrib-htmlhelp==2.1.0
sphinxcontrib-jsmath==1.0.1
sphinxcontrib-qthelp==2.0.0
sphinxcontrib-serializinghtml==2.0.0
tomlkit==0.13.2
typing-extensions==4.12.2
virtualenv==20.29.2
```

----------------------------------------

TITLE: Mypy Static Analysis Output
DESCRIPTION: The output from running mypy on the initial Python Fibonacci code, indicating a missing return statement.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_10>

LANGUAGE: bash
CODE:

```
$ mypy examples/fib.py
examples/fib.py:1: error: Missing return statement  [return]
Found 1 error in 1 file (checked 1 source file)
```

----------------------------------------

TITLE: Pytest Dependencies
DESCRIPTION: Dependencies for Pytest, a testing framework.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_4>

LANGUAGE: python
CODE:

```
coverage[toml]==7.6.12
iniconfig==2.0.0
packaging==24.2
pluggy==1.5.0
pytest==8.3.4
```

----------------------------------------

TITLE: CI Dependencies
DESCRIPTION: Dependencies specifically for Continuous Integration (CI) processes.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_1>

LANGUAGE: python
CODE:

```
flake8==7.1.1
flake8-pyproject==1.2.3
mypy==1.15.0
pytest==8.3.4
pytest-checkdocs==2.13.0
pytest-cov==6.0.0
types-requests==2.32.0.20241016
```

----------------------------------------

TITLE: Python Fibonacci Function
DESCRIPTION: The Python code for the Fibonacci sequence function, including type hints.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_9>

LANGUAGE: python
CODE:

```
def Fibonacci(n: int) -> int:
    if n < 0:
        print("Incorrect input")
    # First Fibonacci number is 0
    elif n == 1:
        return 0
    # Second Fibonacci number is 1
    elif n == 2:
        return 1
    else:
        return Fibonacci(n - 1) + Fibonacci(n - 2)
```

----------------------------------------

TITLE: Pylint Dependencies
DESCRIPTION: Dependencies required for the Pylint static analysis tool.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_2>

LANGUAGE: python
CODE:

```
astroid==3.3.8
dill==0.3.9
isort==6.0.0
mccabe==0.7.0
platformdirs==4.3.6
pylint==3.3.4
tomlkit==0.13.2
```

----------------------------------------

TITLE: Rewrite Tests with Pytest Parametrized
DESCRIPTION: This snippet shows how to use the OpenAI CLI to rewrite Python tests to utilize pytest's `parametrize` decorator for more efficient testing.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_17>

LANGUAGE: bash
CODE:

```
(echo "Rewrite these tests to use pytest.parametrized"; cat examples/test_fib.py) | openai complete - | black - | tee tmp && mv tmp examples/test_fib.py
```

----------------------------------------

TITLE: Mypy Static Analysis Output (Incompatible Return)
DESCRIPTION: The output from running mypy after adding `return None`, which results in an incompatible return value type error.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_13>

LANGUAGE: bash
CODE:

```
$ mypy examples/fib.py
examples/fib.py:12: error: Incompatible return value type (got "None", expected "int")  [return-value]
Found 1 error in 1 file (checked 1 source file)
```

----------------------------------------

TITLE: Pytest Parametrized Fibonacci Tests
DESCRIPTION: The refactored Python test code using pytest's `parametrize` to test the Fibonacci function with multiple inputs and expected outputs.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_18>

LANGUAGE: python
CODE:

```
import pytest
from .fib import Fibonacci


@pytest.mark.parametrize(
    "n, expected",
    [(1, 0), (2, 1), (3, 1), (4, 2), (5, 3), (6, 5), (7, 8), (8, 13), (9, 21), (10, 34)],
)
def test_fibonacci(n, expected):
    assert Fibonacci(n) == expected
```

----------------------------------------

TITLE: Mypy Static Analysis Success
DESCRIPTION: The output from running mypy after the final correction, indicating that no issues were found.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_16>

LANGUAGE: bash
CODE:

```
$ mypy examples/fib.py
Success: no issues found in 1 source file
```

----------------------------------------

TITLE: Base Python Dependencies
DESCRIPTION: Lists the core Python packages required for the OpenAI CLI project. These include libraries for handling SSL certificates, character encoding, internationalized domain names, making HTTP requests, and managing network connections.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/base.txt#_snippet_0>

LANGUAGE: python
CODE:

```
certifi==2025.1.31
    # via requests
charset-normalizer==3.4.1
    # via requests
idna==3.10
    # via requests
requests==2.32.3
    # via -r requirements/base.in
urllib3==2.3.0
    # via requests
```

----------------------------------------

TITLE: Fix Mypy Warnings (Return Statement)
DESCRIPTION: This snippet shows how to use the OpenAI CLI to fix mypy warnings by adding a return statement to the Python code.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_11>

LANGUAGE: bash
CODE:

```
(echo "Fix mypy warnings in this Python code"; cat examples/fib.py; mypy examples/fib.py) | openai complete - | black - | tee tmp && mv tmp examples/fib.py
```

----------------------------------------

TITLE: Fix Mypy Warnings (Correct Return Value)
DESCRIPTION: This snippet demonstrates using the OpenAI CLI to fix the incompatible return value type error by changing the return statement to `return 0`.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_14>

LANGUAGE: bash
CODE:

```
(echo "Fix mypy warnings in this Python code"; cat examples/fib.py; mypy examples/fib.py) | openai complete - | black - | tee tmp && mv tmp examples/fib.py
```

----------------------------------------

TITLE: Flake8 Dependencies
DESCRIPTION: Dependencies for Flake8, a Python code linter.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_7>

LANGUAGE: python
CODE:

```
flake8==7.1.1
mccabe==0.7.0
pycodestyle==2.12.1
pyflakes==3.2.0
```

----------------------------------------

TITLE: Domdf-python-tools Dependencies
DESCRIPTION: Dependencies for domdf-python-tools, a utility library.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_9>

LANGUAGE: python
CODE:

```
domdf-python-tools==3.9.0
natsort==8.4.0
typing-extensions==4.12.2
```

----------------------------------------

TITLE: Python Fibonacci Function with Added Return
DESCRIPTION: The Python code for the Fibonacci function after adding a `return None` statement to address the mypy warning.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_12>

LANGUAGE: python
CODE:

```
def Fibonacci(n: int) -> int:
    if n < 0:
        print("Incorrect input")
    # First Fibonacci number is 0
    elif n == 1:
        return 0
    # Second Fibonacci number is 1
    elif n == 2:
        return 1
    else:
        return Fibonacci(n - 1) + Fibonacci(n - 2)
    return None  # Added return statement
```

----------------------------------------

TITLE: MyPy Dependencies
DESCRIPTION: Dependencies for MyPy, a static type checker for Python.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_8>

LANGUAGE: python
CODE:

```
mypy==1.15.0
mypy-extensions==1.0.0
```

----------------------------------------

TITLE: Generated Fibonacci Unit Tests
DESCRIPTION: Python unit tests for the Fibonacci function, generated using the OpenAI CLI. These tests cover various cases including negative input, base cases, and sequential Fibonacci numbers.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_7>

LANGUAGE: python
CODE:

```
import unittest
from .fib import Fibonacci


class TestFibonacci(unittest.TestCase):
    def test_negative_input(self):
        self.assertEqual(Fibonacci(-1), None)

    def test_first_fibonacci_number(self):
        self.assertEqual(Fibonacci(1), 0)

    def test_second_fibonacci_number(self):
        self.assertEqual(Fibonacci(2), 1)

    def test_third_fibonacci_number(self):
        self.assertEqual(Fibonacci(3), 1)

    def test_fourth_fibonacci_number(self):
        self.assertEqual(Fibonacci(4), 2)

    def test_fifth_fibonacci_number(self):
        self.assertEqual(Fibonacci(5), 3)

    def test_sixth_fibonacci_number(self):
        self.assertEqual(Fibonacci(6), 5)

    def test_seventh_fibonacci_number(self):
        self.assertEqual(Fibonacci(7), 8)
```

----------------------------------------

TITLE: Project Dependencies
DESCRIPTION: Lists the core Python dependencies for the OpenAI CLI project, including version specifications. These are the packages directly required for the project's functionality and development.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/local.txt#_snippet_0>

LANGUAGE: python
CODE:

```
asttokens==3.0.0
black==25.1.0
cfgv==3.4.0
click==8.1.8
decorator==5.1.1
executing==2.2.0
identify==2.6.7
ipdb==0.13.13
ipython==8.32.0
jedi==0.19.2
matplotlib-inline==0.1.7
nodeenv==1.9.1
parso==0.8.4
pathspec==0.12.1
pex==2.33.0
pexpect==4.9.0
pip-compile-multi==2.7.1
pip-tools==7.4.1
pre-commit==4.1.0
prompt-toolkit==3.0.50
ptyprocess==0.7.0
pure-eval==0.2.3
pyyaml==6.0.2
stack-data==0.6.3
toposort==1.10
traitlets==5.14.3
wcwidth==0.2.13
wheel==0.45.1
```

----------------------------------------

TITLE: Generated Fibonacci Python Function
DESCRIPTION: The Python code for the Fibonacci function, generated using the OpenAI CLI based on a natural language prompt.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_6>

LANGUAGE: python
CODE:

```
def Fibonacci(n):
    if n < 0:
        print("Incorrect input")
    # First Fibonacci number is 0
    elif n == 1:
        return 0
    # Second Fibonacci number is 1
    elif n == 2:
        return 1
    else:
        return Fibonacci(n - 1) + Fibonacci(n - 2)
```

----------------------------------------

TITLE: Virtualenv Dependencies
DESCRIPTION: Dependencies for virtualenv, a tool for creating isolated Python environments.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/ci.txt#_snippet_6>

LANGUAGE: python
CODE:

```
distlib==0.3.9
filelock==3.17.0
build[virtualenv]==1.2.2.post1
virtualenv==20.29.2
```

----------------------------------------

TITLE: CI Dependencies
DESCRIPTION: Specifies the dependencies required for the Continuous Integration (CI) environment of the OpenAI CLI project. These packages are typically used for building, testing, and deploying the project.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/local.txt#_snippet_1>

LANGUAGE: python
CODE:

```
-r ci.txt
```

----------------------------------------

TITLE: Unsafe Dependencies
DESCRIPTION: Highlights packages identified as potentially unsafe for inclusion in a requirements file. These might include build tools or packages that could have unintended side effects if not managed carefully.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/requirements/local.txt#_snippet_2>

LANGUAGE: python
CODE:

```
pip==25.0.1
setuptools==75.8.0
```

----------------------------------------

TITLE: Python Fibonacci Function with Corrected Return
DESCRIPTION: The Python code for the Fibonacci function after correcting the return statement to `return 0` to satisfy mypy.

SOURCE: <https://github.com/peterdemin/openai-cli/blob/main/README.rst#_snippet_15>

LANGUAGE: python
CODE:

```
def Fibonacci(n: int) -> int:
    if n < 0:
        print("Incorrect input")
    # First Fibonacci number is 0
    elif n == 1:
        return 0
    # Second Fibonacci number is 1
    elif n == 2:
        return 1
    else:
        return Fibonacci(n - 1) + Fibonacci(n - 2)
    return 0  # Changed return statement to return 0
```
