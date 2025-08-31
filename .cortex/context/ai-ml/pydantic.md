========================
CODE SNIPPETS
========================
TITLE: Install Pydantic from GitHub repository (uv)
DESCRIPTION: Installs the Pydantic library directly from its main branch on GitHub using uv. This is useful for installing the latest development version.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_9

LANGUAGE: bash
CODE:

```
uv add 'git+https://github.com/pydantic/pydantic@main'
```

---

TITLE: Install Pydantic from GitHub repository with extras (uv)
DESCRIPTION: Installs Pydantic from its GitHub repository with specified extra dependencies (e.g., 'email', 'timezone') using uv.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_10

LANGUAGE: bash
CODE:

```
uv add 'git+https://github.com/pydantic/pydantic@main#egg=pydantic[email,timezone]'
```

---

TITLE: Install Pydantic from GitHub repository (pip)
DESCRIPTION: Installs the Pydantic library directly from its main branch on GitHub using pip. This is useful for installing the latest development version.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_7

LANGUAGE: bash
CODE:

```
pip install 'git+https://github.com/pydantic/pydantic@main'
```

---

TITLE: Install Pydantic from GitHub repository with extras (pip)
DESCRIPTION: Installs Pydantic from its GitHub repository with specified extra dependencies (e.g., 'email', 'timezone') using pip.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_8

LANGUAGE: bash
CODE:

```
pip install 'git+https://github.com/pydantic/pydantic@main#egg=pydantic[email,timezone]'
```

---

TITLE: Install Pydantic with optional email support (uv)
DESCRIPTION: Installs Pydantic with the 'email' extra dependency using uv, enabling email validation features.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_5

LANGUAGE: bash
CODE:

```
uv add 'pydantic[email]'
```

---

TITLE: Install Pydantic with uv
DESCRIPTION: Installs the Pydantic library using the uv package manager. uv is a fast, modern Python package installer.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_1

LANGUAGE: bash
CODE:

```
uv add pydantic
```

---

TITLE: Install Pydantic with optional email support (pip)
DESCRIPTION: Installs Pydantic with the 'email' extra dependency using pip, enabling email validation features.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_3

LANGUAGE: bash
CODE:

```
pip install 'pydantic[email]'
```

---

TITLE: Install Pydantic with pip
DESCRIPTION: Installs the Pydantic library using the pip package manager. This is the standard method for installing Python packages.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install pydantic
```

---

TITLE: Install Pydantic with optional email and timezone support (uv)
DESCRIPTION: Installs Pydantic with both 'email' and 'timezone' extra dependencies using uv, providing full support for email validation and timezone handling.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_6

LANGUAGE: bash
CODE:

```
uv add 'pydantic[email,timezone]'
```

---

TITLE: Install Pydantic and Dependencies
DESCRIPTION: This command installs Pydantic, its dependencies, test dependencies, and documentation dependencies using the project's Makefile. It sets up the complete development environment.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_4

LANGUAGE: bash
CODE:

```
make install
```

---

TITLE: Install Pydantic with optional email and timezone support (pip)
DESCRIPTION: Installs Pydantic with both 'email' and 'timezone' extra dependencies using pip, providing full support for email validation and timezone handling.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_4

LANGUAGE: bash
CODE:

```
pip install 'pydantic[email,timezone]'
```

---

TITLE: Update Documentation Examples with Pytest
DESCRIPTION: Command to run Pydantic's documentation tests and automatically update any outdated code examples found within the documentation files. This ensures examples remain accurate and runnable.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_11

LANGUAGE: bash
CODE:

```
# Run tests and update code examples
pytest tests/test_docs.py --update-examples
```

---

TITLE: Install Development Tools
DESCRIPTION: Commands to install essential development tools like uv (a Python package installer and virtual environment manager) and pre-commit (a framework for managing and automating pre-commit hooks).

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_3

LANGUAGE: bash
CODE:

```
pipx install uv
pipx install pre-commit
```

---

TITLE: Install Bump Pydantic Tool
DESCRIPTION: Installs the 'bump-pydantic' tool, a beta utility designed to help automate code transformations for Pydantic V1 to V2 migration. It's installed via pip.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/migration.md#_snippet_1

LANGUAGE: bash
CODE:

```
pip install bump-pydantic
```

---

TITLE: Install Pydantic with conda
DESCRIPTION: Installs the Pydantic library from the conda-forge channel using the conda package manager. This method is suitable for users within the Anaconda ecosystem.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/install.md#_snippet_2

LANGUAGE: bash
CODE:

```
conda install pydantic -c conda-forge
```

---

TITLE: Configure Mypy with Pydantic Plugin (pyproject.toml)
DESCRIPTION: Example configuration for pyproject.toml to enable the pydantic plugin and set various mypy and pydantic-mypy specific strictness flags. This setup enhances type checking for Pydantic models.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/mypy.md#_snippet_3

LANGUAGE: toml
CODE:

```
[tool.mypy]
plugins = ["pydantic.mypy"]

follow_imports = "silent"
warn_redundant_casts = true
warn_unused_ignores = true
disallow_any_generics = true
no_implicit_reexport = true
disallow_untyped_defs = true

[tool.pydantic-mypy]
init_forbid_extra = true
init_typed = true
warn_required_dynamic_aliases = true
```

---

TITLE: Install datamodel-code-generator
DESCRIPTION: Installs the datamodel-code-generator library using pip. This is the initial step required to utilize the tool for generating Pydantic models from data schemas.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/datamodel_code_generator.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install datamodel-code-generator
```

---

TITLE: Configure Mypy with Pydantic Plugin (mypy.ini)
DESCRIPTION: Example configuration for mypy.ini to enable the pydantic plugin and set various mypy and pydantic-mypy specific strictness flags. This setup enhances type checking for Pydantic models.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/mypy.md#_snippet_2

LANGUAGE: ini
CODE:

```
[mypy]
plugins = pydantic.mypy

follow_imports = silent
warn_redundant_casts = True
warn_unused_ignores = True
disallow_any_generics = True
no_implicit_reexport = True
disallow_untyped_defs = True

[pydantic-mypy]
init_forbid_extra = True
init_typed = True
warn_required_dynamic_aliases = True
```

---

TITLE: Install Pydantic V1
DESCRIPTION: Installs a specific version of Pydantic V1 using pip. This is useful if you need to maintain compatibility with Pydantic V1 for existing projects or specific features.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/migration.md#_snippet_3

LANGUAGE: bash
CODE:

```
pip install "pydantic==1.*
"
```

---

TITLE: Install Pydantic V2
DESCRIPTION: Installs the latest production release of Pydantic V2 using pip. This command ensures you have the most up-to-date version for new projects or upgrades.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/migration.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install -U pydantic
```

---

TITLE: Pydantic with ARQ Job Queue Example
DESCRIPTION: Demonstrates defining a Pydantic model for job data, serializing it for enqueueing, and validating/deserializing it during job processing with ARQ. Requires Redis and ARQ installed.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/examples/queues.md#_snippet_3

LANGUAGE: python
CODE:

```
import asyncio
from typing import Any

from arq import create_pool
from arq.connections import RedisSettings

from pydantic import BaseModel, EmailStr


class User(BaseModel):
    id: int
    name: str
    email: EmailStr


REDIS_SETTINGS = RedisSettings()


async def process_user(ctx: dict[str, Any], user_data: dict[str, Any]) -> None:
    user = User.model_validate(user_data)
    print(f'Processing user: {repr(user)}')


async def enqueue_jobs(redis):
    user1 = User(id=1, name='John Doe', email='john@example.com')
    user2 = User(id=2, name='Jane Doe', email='jane@example.com')

    await redis.enqueue_job('process_user', user1.model_dump())
    print(f'Enqueued user: {repr(user1)}')

    await redis.enqueue_job('process_user', user2.model_dump())
    print(f'Enqueued user: {repr(user2)}')


class WorkerSettings:
    functions = [process_user]
    redis_settings = REDIS_SETTINGS


async def main():
    redis = await create_pool(REDIS_SETTINGS)
    await enqueue_jobs(redis)


if __name__ == '__main__':
    asyncio.run(main())
```

---

TITLE: Install flake8-pydantic Plugin
DESCRIPTION: Installs the flake8-pydantic plugin using pip. This plugin provides linting capabilities for Pydantic models within your project.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/linting.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install flake8-pydantic
```

---

TITLE: Mypy Configuration File Example
DESCRIPTION: An example of a Mypy configuration file (`.ini` format) used by the test suite. These files specify Mypy settings and plugins to be applied during type checking for specific test cases.

SOURCE: https://github.com/pydantic/pydantic/blob/main/tests/mypy/README.md#_snippet_3

LANGUAGE: ini
CODE:

```
[mypy]
plugins = pydantic.mypy

[mypy "test_mypy.py"]
ignore_missing_imports = true
```

---

TITLE: Pydantic Model Example
DESCRIPTION: Demonstrates a Pydantic BaseModel with various field types and potential validation issues. This snippet is used to illustrate the benefits of the Pydantic mypy plugin.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/mypy.md#_snippet_0

LANGUAGE: python
CODE:

```
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class Model(BaseModel):
    age: int
    first_name = 'John'
    last_name: Optional[str] = None
    signup_ts: Optional[datetime] = None
    list_of_ints: list[int]


m = Model(age=42, list_of_ints=[1, '2', b'3'])
print(m.middle_name)  # not a model field!
Model()  # will raise a validation error for age and list_of_ints
```

---

TITLE: Python Docstring Example: Function
DESCRIPTION: Illustrates the Google-style docstring format for a Python function, detailing arguments and return values. This adheres to PEP 257 and is checked by pydocstyle for consistency.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_10

LANGUAGE: python
CODE:

```
def bar(self, baz: int) -> str:
    """A function docstring.

    Args:
        baz: A description of `baz`.

    Returns:
        A description of the return value.
    """

    return 'bar'
```

---

TITLE: Pydantic Data Model Example (Python)
DESCRIPTION: Demonstrates creating a Pydantic BaseModel for user data. It shows how to define fields with type hints, default values, and optional types. The example validates external data, converting types and handling missing values.

SOURCE: https://github.com/pydantic/pydantic/blob/main/README.md#_snippet_0

LANGUAGE: Python
CODE:

```
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str = 'John Doe'
    signup_ts: Optional[datetime] = None
    friends: list[int] = []

external_data = {'id': '123', 'signup_ts': '2017-06-01 12:22', 'friends': [1, '2', b'3']}
user = User(**external_data)
print(user)
#> User id=123 name='John Doe' signup_ts=datetime.datetime(2017, 6, 1, 12, 22) friends=[1, 2, 3]
print(user.id)
#> 123
```

---

TITLE: Get Pydantic Version String
DESCRIPTION: Access the primary version string of the Pydantic library. This is typically a simple string representation of the installed version.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/api/version.md#_snippet_0

LANGUAGE: python
CODE:

```
import pydantic

print(pydantic.__version__)
```

---

TITLE: Install Pydantic for AWS Lambda
DESCRIPTION: Installs the Pydantic library for AWS Lambda functions using pip. This command specifies platform compatibility (manylinux2014_x86_64), a target directory for packaging, the CPython implementation, a compatible Python version (3.10), and ensures pre-built binary wheels are used. This is crucial for ensuring compatibility between your local development environment and the AWS Lambda runtime.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/aws_lambda.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install \
    --platform manylinux2014_x86_64 \  # (1)!
    --target=<your_package_dir> \  # (2)!
    --implementation cp \  # (3)!
    --python-version 3.10 \  # (4)!
    --only-binary=:all: \  # (5)!
    --upgrade pydantic  # (6)!
```

---

TITLE: Python Docstring Example: Class
DESCRIPTION: Demonstrates the correct Google-style docstring format for a Python class, including documentation for class attributes. This follows PEP 257 guidelines and is linted by pydocstyle.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_9

LANGUAGE: python
CODE:

```
class Foo:
    """A class docstring.

    Attributes:
        bar: A description of bar. Defaults to "bar".
    """

    bar: str = 'bar'
```

---

TITLE: Get Pydantic Version (pre-v2)
DESCRIPTION: This command is used to get Pydantic version information for versions prior to v2.0. It's essential for users on older Pydantic versions when reporting issues.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_1

LANGUAGE: python
CODE:

```
import pydantic.utils; print(pydantic.utils.version_info())
```

---

TITLE: Pydantic `__pydantic_on_complete__()` Hook
DESCRIPTION: Introduces a new hook, `__pydantic_on_complete__()`, which is executed once a Pydantic model is fully ready and all its fields are complete. This hook is useful for performing final setup or validation steps after a model has been initialized.

SOURCE: https://github.com/pydantic/pydantic/blob/main/HISTORY.md#_snippet_0

LANGUAGE: python
CODE:

```
class MyModel:
    # ... model definition ...

    def __pydantic_on_complete__(self):
        # This method is called after the model is fully ready
        print("Model is complete and ready to use!")

```

---

TITLE: BaseModel Instantiated Directly: Python Example
DESCRIPTION: This error occurs when `BaseModel` is instantiated directly without inheriting from it. The example shows how to catch this specific PydanticUserError.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/usage_errors.md#_snippet_22

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, PydanticUserError

try:
    BaseModel()
except PydanticUserError as exc_info:
    assert exc_info.code == 'base-model-instantiated'
```

---

TITLE: Pydantic Documentation Syntax Highlighting
DESCRIPTION: Fixes local syntax highlighting issues within the documentation extensions. This ensures that code examples in the documentation are displayed correctly.

SOURCE: https://github.com/pydantic/pydantic/blob/main/HISTORY.md#_snippet_161

LANGUAGE: APIDOC
CODE:

```
Pydantic Documentation Syntax Highlighting:

Updated docs extensions to fix local syntax highlighting.
```

---

TITLE: Basic Pydantic Logging with Logfire
DESCRIPTION: Demonstrates how to configure Logfire and log a Pydantic BaseModel instance. This snippet shows the basic setup for sending Pydantic model data to Logfire for observability.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/logfire.md#_snippet_0

LANGUAGE: python
CODE:

```
from datetime import date

import logfire

from pydantic import BaseModel

logfire.configure()  # (1)!


class User(BaseModel):
    name: str
    country_code: str
    dob: date


user = User(name='Anne', country_code='USA', dob='2000-01-01')
logfire.info('user processed: {user!r}', user=user)  # (2)!
```

---

TITLE: Config and model_config Both Defined: Python Example
DESCRIPTION: This error occurs when both the legacy `class Config` and the modern `model_config` are defined within the same Pydantic model. The example illustrates catching this conflict.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/usage_errors.md#_snippet_18

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, ConfigDict, PydanticUserError

try:

    class Model(BaseModel):
        model_config = ConfigDict(from_attributes=True)

        a: str

        class Config:
            from_attributes = True

except PydanticUserError as exc_info:
    assert exc_info.code == 'config-both'
```

---

TITLE: Pydantic JSON Schema Generation Example
DESCRIPTION: Illustrates how to generate a JSON Schema from a Pydantic model, which is useful for self-documenting APIs and integrating with tools that support the JSON Schema format.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/why.md#_snippet_3

LANGUAGE: python
CODE:

```
from datetime import datetime

from pydantic import BaseModel


class Address(BaseModel):
    street: str
    city: str
    zipcode: str


class Meeting(BaseModel):
    when: datetime
    where: Address
    why: str = 'No idea'


print(Meeting.model_json_schema())
"""
{
    '$defs': {
        'Address': {
            'properties': {
                'street': {'title': 'Street', 'type': 'string'},
                'city': {'title': 'City', 'type': 'string'},
                'zipcode': {'title': 'Zipcode', 'type': 'string'},
            },
            'required': ['street', 'city', 'zipcode'],
            'title': 'Address',
            'type': 'object',
        }
    },
    'properties': {
        'when': {'format': 'date-time', 'title': 'When', 'type': 'string'},
        'where': {'$ref': '#/$defs/Address'},
        'why': {'default': 'No idea', 'title': 'Why', 'type': 'string'},
    },
    'required': ['when', 'where'],
    'title': 'Meeting',
    'type': 'object',
}
"""
```

---

TITLE: Use Bump Pydantic Tool
DESCRIPTION: Demonstrates the command-line usage of the 'bump-pydantic' tool. Navigate to your project's root directory and specify the package name to initiate the migration process.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/migration.md#_snippet_2

LANGUAGE: bash
CODE:

```
cd /path/to/repo_folder
bump-pydantic my_package
```

---

TITLE: Pydantic Time Parsing Example
DESCRIPTION: Demonstrates Pydantic's capability to parse time strings into Python's datetime.time objects.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/api/standard_library_types.md#_snippet_3

LANGUAGE: python
CODE:

```
from datetime import time

from pydantic import BaseModel


class Meeting(BaseModel):
    t: time = None


m = Meeting(t=time(4, 8, 16))

print(m.model_dump())
#> {'t': datetime.time(4, 8, 16)}

```

---

TITLE: Pydantic Data Conversion Example
DESCRIPTION: Demonstrates how Pydantic automatically casts input data to conform to model field types, potentially leading to information loss. Includes an example of using strict mode for type enforcement.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/models.md#_snippet_9

LANGUAGE: python
CODE:

```
from pydantic import BaseModel


class Model(BaseModel):
    a: int
    b: float
    c: str


print(Model(a=3.000, b='2.72', c=b'binary data').model_dump())
#> {'a': 3, 'b': 2.72, 'c': 'binary data'}


class ModelWithList(BaseModel):
    items: list[int]


print(ModelWithList(items=(1, 2, 3)))
#> items=[1, 2, 3]
```

---

TITLE: Undefined Annotation: Python Example
DESCRIPTION: This error is raised when Pydantic encounters an undefined annotation during schema generation. The example shows how to catch `PydanticUndefinedAnnotation` for a forward-referenced type.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/usage_errors.md#_snippet_23

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, PydanticUndefinedAnnotation


class Model(BaseModel):
    a: 'B'  # noqa F821


try:
    Model.model_rebuild()
except PydanticUndefinedAnnotation as exc_info:
    assert exc_info.code == 'undefined-annotation'
```

---

TITLE: Pydantic BaseModel Example for Mypy Testing
DESCRIPTION: Illustrates a Pydantic `BaseModel` definition and its instantiation with an extra keyword argument. This serves as a typical input file for the Mypy test suite, demonstrating a scenario that Mypy would analyze for type checking errors.

SOURCE: https://github.com/pydantic/pydantic/blob/main/tests/mypy/README.md#_snippet_0

LANGUAGE: python
CODE:

```
from pydantic import BaseModel


class Model(BaseModel):
    a: int


model = Model(a=1, b=2)
```

---

TITLE: Pydantic Strict Mode and Data Coercion Example
DESCRIPTION: Shows how Pydantic handles data validation, contrasting default type coercion with strict mode, and demonstrates parsing JSON data with type conversion.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/why.md#_snippet_4

LANGUAGE: python
CODE:

```
from datetime import datetime

from pydantic import BaseModel, ValidationError


class Meeting(BaseModel):
    when: datetime
    where: bytes


m = Meeting.model_validate({'when': '2020-01-01T12:00', 'where': 'home'})
print(m)
#> when=datetime.datetime(2020, 1, 1, 12, 0) where=b'home'
try:
    m = Meeting.model_validate(
        {'when': '2020-01-01T12:00', 'where': 'home'},
        strict=True
    )
except ValidationError as e:
    print(e)
    """
2 validation errors for Meeting
when
  Input should be a valid datetime [type=datetime_type, input_value='2020-01-01T12:00', input_type=str]
where
  Input should be a valid bytes [type=bytes_type, input_value='home', input_type=str]
"""

m_json = Meeting.model_validate_json(
    '{"when": "2020-01-01T12:00", "where": "home"}'
)
print(m_json)
#> when=datetime.datetime(2020, 1, 1, 12, 0) where=b'home'
```

---

TITLE: Pydantic Model Validation Examples
DESCRIPTION: Demonstrates the usage of Pydantic's model_validate, model_validate_json, and model_validate_strings methods with various inputs, including successful validations and error handling for invalid data.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/models.md#_snippet_21

LANGUAGE: python
CODE:

```
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ValidationError


class User(BaseModel):
    id: int
    name: str = 'John Doe'
    signup_ts: Optional[datetime] = None


# Example 1: model_validate with a dictionary
m = User.model_validate({'id': 123, 'name': 'James'})
print(m)
#> id=123 name='James' signup_ts=None

# Example 2: model_validate with invalid input type
try:
    User.model_validate(['not', 'a', 'dict'])
except ValidationError as e:
    print(e)
    """
    1 validation error for User
      Input should be a valid dictionary or instance of User [type=model_type, input_value=['not', 'a', 'dict'], input_type=list]
    """

# Example 3: model_validate_json with valid JSON string
m = User.model_validate_json('{"id": 123, "name": "James"}')
print(m)
#> id=123 name='James' signup_ts=None

# Example 4: model_validate_json with invalid data type in JSON
try:
    m = User.model_validate_json('{"id": 123, "name": 123}')
except ValidationError as e:
    print(e)
    """
    1 validation error for User
    name
      Input should be a valid string [type=string_type, input_value=123, input_type=int]
    """

# Example 5: model_validate_json with invalid JSON format
try:
    m = User.model_validate_json('invalid JSON')
except ValidationError as e:
    print(e)
    """
    1 validation error for User
      Invalid JSON: expected value at line 1 column 1 [type=json_invalid, input_value='invalid JSON', input_type=str]
    """

# Example 6: model_validate_strings with string values
m = User.model_validate_strings({'id': '123', 'name': 'James'})
print(m)
#> id=123 name='James' signup_ts=None

# Example 7: model_validate_strings with datetime string
m = User.model_validate_strings(
    {'id': '123', 'name': 'James', 'signup_ts': '2024-04-01T12:00:00'}
)
print(m)
#> id=123 name='James' signup_ts=datetime.datetime(2024, 4, 1, 12, 0)

# Example 8: model_validate_strings with strict=True and invalid datetime format
try:
    m = User.model_validate_strings(
        {'id': '123', 'name': 'James', 'signup_ts': '2024-04-01'},
        strict=True
    )
except ValidationError as e:
    print(e)
    """
    1 validation error for User
    signup_ts
      Input should be a valid datetime, invalid datetime separator, expected `T`, `t`, `_` or space [type=datetime_parsing, input_value='2024-04-01', input_type=str]
    """

```

---

TITLE: Clone Pydantic Repository
DESCRIPTION: Instructions to clone your fork of the Pydantic repository from GitHub and navigate into the project directory. This is the first step in setting up a local development environment.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_2

LANGUAGE: bash
CODE:

```
git clone git@github.com:<your username>/pydantic.git
cd pydantic
```

---

TITLE: Format Full Changelog Link for GitHub Release
DESCRIPTION: Defines the format for the full changelog link to be included in the GitHub release body, comparing the previous and current versions.

SOURCE: https://github.com/pydantic/pydantic/blob/main/release/README.md#_snippet_5

LANGUAGE: Markdown
CODE:

```
Full Changelog: https://github.com/pydantic/pydantic/compare/v{PREV_VERSION}...v{VERSION}/
```

---

TITLE: Instantiate and Print Model with Generic Owners
DESCRIPTION: Provides an example of creating an instance of the `Model` class, populating it with `Owner` objects containing specific types (`Car`, `House`), and printing the resulting model. This demonstrates successful instantiation.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/types.md#_snippet_20

LANGUAGE: python
CODE:

```
model = Model(
    car_owner=Owner(name='John', item=Car(color='black')),
    home_owner=Owner(name='James', item=House(rooms=3)),
)
print(model)

```

---

TITLE: Mapping validate_as to Validator Types
DESCRIPTION: Shows how the `validate_as` method in the pipeline API maps to Pydantic's `BeforeValidator`, `AfterValidator`, and `WrapValidator`. It provides examples for pre-processing, post-processing, and wrapping validation logic.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/experimental.md#_snippet_2

LANGUAGE: python
CODE:

```
from typing import Annotated

from pydantic.experimental.pipeline import transform, validate_as

# BeforeValidator
Annotated[int, validate_as(str).str_strip().validate_as(...)]  # (1)!
# AfterValidator
Annotated[int, transform(lambda x: x * 2)]  # (2)!
# WrapValidator
Annotated[
    int,
    validate_as(str)
    .str_strip()
    .validate_as(...)
    .transform(lambda x: x * 2),  # (3)!
]
```

---

TITLE: Create GitHub Release Tag and Body
DESCRIPTION: Creates a new release on GitHub. This involves setting the tag to `v{VERSION}`, the title to `v{VERSION} {DATE}`, and populating the body with the prepared `HISTORY.md` section and a full changelog link.

SOURCE: https://github.com/pydantic/pydantic/blob/main/release/README.md#_snippet_4

LANGUAGE: shell
CODE:

```
git tag v{VERSION}
git push origin v{VERSION}
```

---

TITLE: Pydantic Model Serialization Examples
DESCRIPTION: Demonstrates serializing a Pydantic model to a Python dict (with Python objects), a JSONable dict, and a JSON string, showcasing options like excluding unset or default fields.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/why.md#_snippet_2

LANGUAGE: python
CODE:

```
from datetime import datetime

from pydantic import BaseModel


class Meeting(BaseModel):
    when: datetime
    where: bytes
    why: str = 'No idea'


m = Meeting(when='2020-01-01T12:00', where='home')
print(m.model_dump(exclude_unset=True))
#> {'when': datetime.datetime(2020, 1, 1, 12, 0), 'where': b'home'}
print(m.model_dump(exclude={'where'}, mode='json'))
#> {'when': '2020-01-01T12:00:00', 'why': 'No idea'}
print(m.model_dump_json(exclude_defaults=True))
#> {"when":"2020-01-01T12:00:00","where":"home"}
```

---

TITLE: Keyword Arguments Removed (regex): Python Example
DESCRIPTION: This error indicates that certain keyword arguments, like `regex`, have been removed in Pydantic V2. The example shows a V1-style usage that would trigger this error.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/usage_errors.md#_snippet_19

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, Field, PydanticUserError

try:

    class Model(BaseModel):
        x: str = Field(regex='test')

except PydanticUserError as exc_info:
    assert exc_info.code == 'removed-kwargs'
```

---

TITLE: datetime_past Pydantic Validation Example
DESCRIPTION: Shows the 'datetime_past' error, triggered when a value assigned to a PastDatetime field is not in the past. The example creates a datetime object in the future.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/validation_errors.md#_snippet_23

LANGUAGE: python
CODE:

```
from datetime import datetime, timedelta

from pydantic import BaseModel, PastDatetime, ValidationError


class Model(BaseModel):
    x: PastDatetime


try:
    Model(x=datetime.now() + timedelta(100))
except ValidationError as exc:
    print(repr(exc.errors()[0]['type']))
    #> 'datetime_past'
```

---

TITLE: Validate INI Data with Pydantic
DESCRIPTION: Shows how to load and validate data from an INI configuration file using Python's `configparser` module and a Pydantic `BaseModel`. The example defines a `Person` model and validates data from a specific section of the INI file.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/examples/files.md#_snippet_12

LANGUAGE: ini
CODE:

```
[PERSON]
name = John Doe
age = 30
email = john@example.com
```

LANGUAGE: python
CODE:

```
import configparser

from pydantic import BaseModel, EmailStr, PositiveInt


class Person(BaseModel):
    name: str
    age: PositiveInt
    email: EmailStr


config = configparser.ConfigParser()
config.read('person.ini')
person = Person.model_validate(config['PERSON'])
print(person)
#> name='John Doe' age=30 email='john@example.com'
```

---

TITLE: decimal_parsing Pydantic Validation Example
DESCRIPTION: Demonstrates the 'decimal_parsing' error, which occurs when a value cannot be parsed into a Decimal number. The example attempts to parse the string 'test' into a Decimal field.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/validation_errors.md#_snippet_27

LANGUAGE: python
CODE:

```
from decimal import Decimal

from pydantic import BaseModel, Field, ValidationError


class Model(BaseModel):
    x: Decimal = Field(decimal_places=3)


try:
    Model(x='test')
except ValidationError as exc:
    print(repr(exc.errors()[0]['type']))
    #> 'decimal_parsing'
```

---

TITLE: Prepare Release with Python Script
DESCRIPTION: Runs the release preparation script from the repository root. This script updates the version number in `version.py`, runs `uv lock`, and adds a new section to `HISTORY.md`. A `--dry-run` flag can be used to preview changes without modifying files.

SOURCE: https://github.com/pydantic/pydantic/blob/main/release/README.md#_snippet_1

LANGUAGE: shell
CODE:

```
uv run release/prepare.py {VERSION}
```

---

TITLE: Model Field Overridden: Python Example
DESCRIPTION: This error is raised when a field defined on a base class was overridden by a non-annotated attribute. The example demonstrates catching this specific PydanticUserError.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/usage_errors.md#_snippet_14

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, PydanticUserError


class Foo(BaseModel):
    a: float


try:

    class Bar(Foo):
        x: float = 12.3
        a = 123.0

except PydanticUserError as exc_info:
    assert exc_info.code == 'model-field-overridden'
```

---

TITLE: Pydantic init_typed Example
DESCRIPTION: Demonstrates how Pydantic's default data conversion allows string input for integer fields. The `init_typed` plugin setting prevents this by synthesizing `__init__` with explicit type annotations for fields.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/mypy.md#_snippet_4

LANGUAGE: python
CODE:

```
class Model(BaseModel):
    a: int


Model(a='1')
```

---

TITLE: Pydantic Date Parsing Example
DESCRIPTION: Shows how Pydantic can convert Unix timestamps (integers or floats) and date strings into Python's datetime.date objects.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/api/standard_library_types.md#_snippet_2

LANGUAGE: python
CODE:

```
from datetime import date

from pydantic import BaseModel


class Birthday(BaseModel):
    d: date = None


my_birthday = Birthday(d=1679616000.0)

print(my_birthday.model_dump())
#> {'d': datetime.date(2023, 3, 24)}

```

---

TITLE: Mypy Configuration for Pydantic Plugin
DESCRIPTION: Shows how to enable the Pydantic mypy plugin by adding 'pydantic.mypy' to the plugins list in mypy configuration files.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/mypy.md#_snippet_1

LANGUAGE: ini
CODE:

```
[mypy]
plugins = pydantic.mypy
```

LANGUAGE: toml
CODE:

```
[tool.mypy]
plugins = ['pydantic.mypy']
```

---

TITLE: Pydantic: ContextVar for Model Instantiation with Context
DESCRIPTION: Illustrates a workaround for passing context during direct Pydantic model instantiation using `ContextVar` and a custom `__init__`. This enables context-aware validation when creating model instances, requiring `pydantic`, `contextvars`, and `typing`. The example shows multiplying a number by a context-provided multiplier.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/validators.md#_snippet_18

LANGUAGE: python
CODE:

```
from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Generator

from pydantic import BaseModel, ValidationInfo, field_validator

_init_context_var = ContextVar('_init_context_var', default=None)


@contextmanager
def init_context(value: dict[str, Any]) -> Generator[None]:
    token = _init_context_var.set(value)
    try:
        yield
    finally:
        _init_context_var.reset(token)


class Model(BaseModel):
    my_number: int

    def __init__(self, /, **data: Any) -> None:
        self.__pydantic_validator__.validate_python(
            data,
            self_instance=self,
            context=_init_context_var.get(),
        )

    @field_validator('my_number')
    @classmethod
    def multiply_with_context(cls, value: int, info: ValidationInfo) -> int:
        if isinstance(info.context, dict):
            multiplier = info.context.get('multiplier', 1)
            value = value * multiplier
        return value


print(Model(my_number=2))
#> my_number=2

with init_context({'multiplier': 3}):
    print(Model(my_number=2))
    #> my_number=6

print(Model(my_number=2))
#> my_number=2
```

---

TITLE: Build Documentation
DESCRIPTION: Builds the project's documentation using mkdocs-material. This command is used to verify that any documentation changes you've made render correctly.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_8

LANGUAGE: bash
CODE:

```
make docs
```

---

TITLE: Get Detailed Pydantic Version Info
DESCRIPTION: Retrieve more detailed version information for Pydantic, which might include build numbers, commit hashes, or other version-related metadata.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/api/version.md#_snippet_1

LANGUAGE: python
CODE:

```
from pydantic.version import version_info

print(version_info())
```

---

TITLE: Schema for Unknown Type: Python Example
DESCRIPTION: This error occurs when Pydantic fails to generate a schema for an unknown or unsupported type. The example shows a model with an integer literal as a type annotation, triggering the error.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/usage_errors.md#_snippet_24

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, PydanticUserError

try:

    class Model(BaseModel):
        x: 43 = 123

except PydanticUserError as exc_info:
    assert exc_info.code == 'schema-for-unknown-type'
```

---

TITLE: Get Pydantic Version (v2+)
DESCRIPTION: This command retrieves the Pydantic version information, which is crucial for reporting bugs or issues. It executes a Python script to print the version details.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/contributing.md#_snippet_0

LANGUAGE: python
CODE:

```
import pydantic.version; print(pydantic.version.version_info())
```

---

TITLE: Pydantic Dataclass Field Constraints Example
DESCRIPTION: Demonstrates applying Pydantic `Field` constraints to Python dataclasses, specifically using `init_var` and `kw_only` to control field inclusion and instantiation behavior.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/fields.md#_snippet_24

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, Field
from pydantic.dataclasses import dataclass


@dataclass
class Foo:
    bar: str
    baz: str = Field(init_var=True)
    qux: str = Field(kw_only=True)


class Model(BaseModel):
    foo: Foo


model = Model(foo=Foo('bar', baz='baz', qux='qux'))
print(model.model_dump())  # (1)!
#> {'foo': {'bar': 'bar', 'qux': 'qux'}}
```

---

TITLE: enum Pydantic Validation Example
DESCRIPTION: Illustrates the 'enum' error, which occurs when an input value does not match any of the members in an Enum field. The example uses a string Enum and provides an invalid option.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/validation_errors.md#_snippet_31

LANGUAGE: python
CODE:

```
from enum import Enum

from pydantic import BaseModel, ValidationError


class MyEnum(str, Enum):
    option = 'option'


class Model(BaseModel):
    x: MyEnum


try:
    Model(x='other_option')
except ValidationError as exc:
    print(repr(exc.errors()[0]['type']))
    #> 'enum'
```

---

TITLE: Pydantic String Field Constraints Example
DESCRIPTION: Demonstrates how to use Pydantic's `Field` function to apply string constraints such as minimum length, maximum length, and regular expression patterns within a `BaseModel`.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/fields.md#_snippet_21

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, Field


class Foo(BaseModel):
    short: str = Field(min_length=3)
    long: str = Field(max_length=10)
    regex: str = Field(pattern=r'^\d*$')  # (1)!


foo = Foo(short='foo', long='foobarbaz', regex='123')
print(foo)
#> short='foo' long='foobarbaz' regex='123'
```

---

TITLE: Check `pydantic_core` Files (Python)
DESCRIPTION: This Python snippet uses `importlib.metadata` to list files within the `pydantic-core` package. It helps verify if the compiled library and type stubs, specifically `_pydantic_core`, are present, which is crucial for correct Pydantic installation.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/integrations/aws_lambda.md#_snippet_1

LANGUAGE: python
CODE:

```
from importlib.metadata import files
print([file for file in files('pydantic-core') if file.name.startswith('_pydantic_core')])
"""
[PackagePath('pydantic_core/_pydantic_core.pyi'), PackagePath('pydantic_core/_pydantic_core.cpython-312-x86_64-linux-gnu.so')]
"""
```

---

TITLE: JSON Schema Invalid Type: Python Example
DESCRIPTION: This error is raised when Pydantic encounters a type it cannot convert into a JSON schema, such as `ImportString` in this example. The code demonstrates triggering and catching this error.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/usage_errors.md#_snippet_21

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, ImportString, PydanticUserError


class Model(BaseModel):
    a: ImportString


try:
    Model.model_json_schema()
except PydanticUserError as exc_info:
    assert exc_info.code == 'invalid-for-json-schema'
```

---

TITLE: dict_type Pydantic Validation Example
DESCRIPTION: Demonstrates the 'dict_type' error, raised when the input value's type is not a dictionary for a dict field. The example attempts to assign a list to a dictionary field.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/validation_errors.md#_snippet_30

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, ValidationError


class Model(BaseModel):
    x: dict


try:
    Model(x=['1', '2'])
except ValidationError as exc:
    print(repr(exc.errors()[0]['type']))
    #> 'dict_type'
```

---

TITLE: Validate YAML Data with Pydantic
DESCRIPTION: Illustrates how to load and validate data from a YAML file using the `PyYAML` library and a Pydantic `BaseModel`. The example defines a `Person` model and validates the loaded YAML data.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/examples/files.md#_snippet_10

LANGUAGE: yaml
CODE:

```
name: John Doe
age: 30
email: john@example.com
```

LANGUAGE: python
CODE:

```
import yaml

from pydantic import BaseModel, EmailStr, PositiveInt


class Person(BaseModel):
    name: str
    age: PositiveInt
    email: EmailStr


with open('person.yaml') as f:
    data = yaml.safe_load(f)

person = Person.model_validate(data)
print(person)
#> name='John Doe' age=30 email='john@example.com'
```

---

TITLE: datetime_parsing Pydantic Validation Example
DESCRIPTION: Illustrates the 'datetime_parsing' error, which occurs when a string value cannot be parsed into a datetime field. The example uses a strict datetime field and invalid JSON input.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/validation_errors.md#_snippet_22

LANGUAGE: python
CODE:

```
import json
from datetime import datetime

from pydantic import BaseModel, Field, ValidationError


class Model(BaseModel):
    x: datetime = Field(strict=True)


try:
    Model.model_validate_json(json.dumps({'x': 'not a datetime'}))
except ValidationError as exc:
    print(repr(exc.errors()[0]['type']))
    #> 'datetime_parsing'
```

---

TITLE: Pydantic Boolean Validation Example
DESCRIPTION: Demonstrates Pydantic's flexible boolean validation, accepting various string representations, integers 0/1, and standard booleans. It also shows how a ValidationError is raised for invalid inputs.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/api/standard_library_types.md#_snippet_0

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, ValidationError


class BooleanModel(BaseModel):
    bool_value: bool


print(BooleanModel(bool_value=False))
#> bool_value=False
print(BooleanModel(bool_value='False'))
#> bool_value=False
print(BooleanModel(bool_value=1))
#> bool_value=True
try:
    BooleanModel(bool_value=[])
except ValidationError as e:
    print(str(e))
    """
    1 validation error for BooleanModel
    bool_value
      Input should be a valid boolean [type=bool_type, input_value=[], input_type=list]
    """

```

---

TITLE: Pydantic Configuration API
DESCRIPTION: Documentation for Pydantic's configuration system, including ConfigDict, with_config, ExtraValues, and BaseConfig. This section details how to manage model configuration and settings.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/api/config.md#_snippet_0

LANGUAGE: APIDOC
CODE:

```
pydantic.config:
  members:
    - ConfigDict
    - with_config
    - ExtraValues
    - BaseConfig
  options:
    group_by_category: false
```

---

TITLE: Pydantic Configuration Boundary Example
DESCRIPTION: Demonstrates that `ConfigDict` settings applied to a parent Pydantic model (e.g., `Parent`) do not propagate to nested models (e.g., `User`) used as field annotations. The `str_max_length` on `Parent` does not affect the `name` field in `User`, showing independent configuration boundaries.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/config.md#_snippet_8

LANGUAGE: python
CODE:

```
from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    name: str


class Parent(BaseModel):
    user: User

    model_config = ConfigDict(str_max_length=2)


print(Parent(user={'name': 'John Doe'}))
#> user=User(name='John Doe')
```

---

TITLE: `missing_keyword_only_argument` Validation Error Example (Python)
DESCRIPTION: This error is raised when a required keyword-only argument is not provided to a function decorated with `validate_call`. The example defines a function `foo` with a keyword-only argument `a` and calls it without passing `a`.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/validation_errors.md#_snippet_60

LANGUAGE: python
CODE:

```
from pydantic import ValidationError, validate_call


@validate_call
def foo(*, a: int):
    return a


try:
    foo()
except ValidationError as exc:
    print(repr(exc.errors()[0]['type']))
    #> 'missing_keyword_only_argument'
```

---

TITLE: decimal_whole_digits Pydantic Validation Example
DESCRIPTION: Shows the 'decimal_whole_digits' error, triggered when a Decimal value has more digits before the decimal point than allowed by the combined max_digits and decimal_places constraints. The example uses max_digits=6 and decimal_places=3.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/errors/validation_errors.md#_snippet_29

LANGUAGE: python
CODE:

```
from decimal import Decimal

from pydantic import BaseModel, Field, ValidationError


class Model(BaseModel):
    x: Decimal = Field(max_digits=6, decimal_places=3)


try:
    Model(x='12345.6')
except ValidationError as exc:
    print(repr(exc.errors()[0]['type']))
    #> 'decimal_whole_digits'
```

---

TITLE: Pydantic Decimal Field Constraints Example
DESCRIPTION: Shows how to constrain `Decimal` types in Pydantic models using `Field` with `max_digits` and `decimal_places` parameters to enforce precision.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/fields.md#_snippet_23

LANGUAGE: python
CODE:

```
from decimal import Decimal

from pydantic import BaseModel, Field


class Foo(BaseModel):
    precise: Decimal = Field(max_digits=5, decimal_places=2)


foo = Foo(precise=Decimal('123.45'))
print(foo)
#> precise=Decimal('123.45')
```

---

TITLE: Pydantic Timedelta Parsing Example
DESCRIPTION: Illustrates Pydantic's support for parsing timedelta values from integers, floats (seconds), and various string formats including ISO 8601.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/api/standard_library_types.md#_snippet_4

LANGUAGE: python
CODE:

```
from datetime import timedelta

from pydantic import BaseModel


class Model(BaseModel):
    td: timedelta = None


m = Model(td='P3DT12H30M5S')

print(m.model_dump())
#> {'td': datetime.timedelta(days=3, seconds=45005)}

```

---

TITLE: Generate JSON Schema for Boolean
DESCRIPTION: Demonstrates the JSON Schema generated for a boolean type by Pydantic's GenerateJsonSchema class, starting from a core schema.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/internals/architecture.md#_snippet_5

LANGUAGE: json
CODE:

```
{
    "type": "boolean"
}
```

---

TITLE: Pydantic User Data Readability
DESCRIPTION: This Python snippet illustrates a Pydantic User object with nested Address details. It emphasizes Pydantic's ability to create more readable and maintainable data models compared to plain string representations.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/plugins/devtools_output.html#_snippet_0

LANGUAGE: python
CODE:

```
user: User(
    id=123,
    name='John Doe',
    signup_ts=datetime.datetime(2019, 6, 1, 12, 22),
    friends=[ 1234, 4567, 7890, ],
    address=Address(
        street='Testing',
        country='uk',
        lat=51.5,
        lng=0.0,
    ),
)
```

---

TITLE: Pydantic Model Copying Example
DESCRIPTION: Demonstrates how to duplicate Pydantic models using the `model_copy()` method, including options for updating fields and performing deep copies. Shows how `deep=True` affects nested model references.

SOURCE: https://github.com/pydantic/pydantic/blob/main/docs/concepts/models.md#_snippet_23

LANGUAGE: python
CODE:

```
from pydantic import BaseModel


class BarModel(BaseModel):
    whatever: int


class FooBarModel(BaseModel):
    banana: float
    foo: str
    bar: BarModel


m = FooBarModel(banana=3.14, foo='hello', bar={'whatever': 123})

print(m.model_copy(update={'banana': 0}))
#> banana=0 foo='hello' bar=BarModel(whatever=123)

# normal copy gives the same object reference for bar:
print(id(m.bar) == id(m.model_copy().bar))
#> True
# deep copy gives a new object reference for `bar`:
print(id(m.bar) == id(m.model_copy(deep=True).bar))
#> False
```
