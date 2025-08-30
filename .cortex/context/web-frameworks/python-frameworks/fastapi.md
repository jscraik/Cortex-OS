========================

# CODE SNIPPETS

TITLE: Install FastAPI and Uvicorn
DESCRIPTION: Commands to install the FastAPI framework and Uvicorn, an ASGI server required to run FastAPI applications. Uvicorn is recommended for development and production environments.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/index.md#_snippet_0

LANGUAGE: Console
CODE:

```
pip install fastapi
```

LANGUAGE: Console
CODE:

```
pip install "uvicorn[standard]"
```

---

TITLE: Install FastAPI with all optional dependencies
DESCRIPTION: Command to install FastAPI along with all its optional dependencies, including Uvicorn, which is used to run the application. This is recommended for a complete development setup.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/tutorial/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
$ pip install "fastapi[all]"
```

---

TITLE: Install FastAPI with Standard Dependencies
DESCRIPTION: An example command to install the FastAPI library along with its standard extra dependencies using `pip`. This illustrates a common package installation process, typically performed within a virtual environment.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh-hant/docs/virtual-environments.md#_snippet_4

LANGUAGE: Shell
CODE:

```
pip install "fastapi[standard]"
```

---

TITLE: Example JSON Response from FastAPI Endpoint
DESCRIPTION: A sample JSON output demonstrating the structure of a response from the `/items/{item_id}` endpoint when accessed with specific parameters, showing the item ID and query parameter.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/index.md#_snippet_3

LANGUAGE: JSON
CODE:

```
{"item_id": 5, "q": "somequery"}
```

---

TITLE: Install FastAPI with standard dependencies
DESCRIPTION: Command to install FastAPI with its standard dependencies. This is suitable for production applications where specific optional features might be installed separately to minimize dependencies.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/tutorial/index.md#_snippet_2

LANGUAGE: Shell
CODE:

```
pip install "fastapi[standard]"
```

---

TITLE: Example JSON Response from FastAPI Root Endpoint
DESCRIPTION: This JSON snippet illustrates the typical response received when accessing the root endpoint (`/`) of the basic FastAPI application. It's a simple dictionary containing a 'message' key with 'Hello World' as its value, demonstrating a fundamental API output.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ko/docs/tutorial/first-steps.md#_snippet_2

LANGUAGE: JSON
CODE:

```
{"message": "Hello World"}
```

---

TITLE: Define Basic FastAPI Application Endpoints
DESCRIPTION: Example Python code for a simple FastAPI application defining a root endpoint and an item endpoint with path and query parameters. Includes both synchronous and asynchronous function definitions for handling requests.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/index.md#_snippet_1

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Running FastAPI Development Server
DESCRIPTION: This command starts the FastAPI development server using the specified Python file. It watches for file changes and automatically reloads the server. It requires the `fastapi` package to be installed.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/es/docs/tutorial/index.md#_snippet_0

LANGUAGE: console
CODE:

```
$ <font color="#4E9A06">fastapi</font> dev <u style="text-decoration-style:single">main.py</u>
```

---

TITLE: Initializing FastAPI and Defining Basic Routes
DESCRIPTION: This code initializes a FastAPI application and defines two GET routes: one for the root path ('/') and another for '/items/{item_id}'. The '/items/{item_id}' route accepts an integer item_id and an optional string query parameter q.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/az/docs/index.md#_snippet_0

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Install and Run FastAPI Development Server with CLI
DESCRIPTION: Demonstrates how to install FastAPI and use the new `fastapi dev` command to start a development server. The output shows the server address, API documentation URL, and notes about development mode versus production (`fastapi run`).

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/release-notes.md#_snippet_8

LANGUAGE: Shell
CODE:

```
$ pip install --upgrade fastapi

$ fastapi dev main.py


 ╭────────── FastAPI CLI - Development mode ───────────╮
 │                                                     │
 │  Serving at: http://127.0.0.1:8000                  │
 │                                                     │
 │  API docs: http://127.0.0.1:8000/docs               │
 │                                                     │
 │  Running in development mode, for production use:   │
 │                                                     │
 │  fastapi run                                        │
 │                                                     │
 ╰─────────────────────────────────────────────────────╯

INFO:     Will watch for changes in these directories: ['/home/user/code/awesomeapp']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [2248755] using WatchFiles
INFO:     Started server process [2248757]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

TITLE: Install Uvicorn with standard dependencies
DESCRIPTION: Command to install Uvicorn, the ASGI server, with its standard dependencies. Uvicorn is commonly used to run FastAPI applications in both development and production environments.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/tutorial/index.md#_snippet_3

LANGUAGE: Shell
CODE:

```
pip install "uvicorn[standard]"
```

---

TITLE: Installing Uvicorn
DESCRIPTION: This command installs Uvicorn, an ASGI server, which is required to run FastAPI applications. The `[standard]` extra installs commonly used Uvicorn dependencies.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/he/docs/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
$ pip install "uvicorn[standard]"

---> 100%
```

---

TITLE: Install FastAPI with Standard Dependencies
DESCRIPTION: This command installs FastAPI along with a set of standard optional dependencies. These dependencies provide additional features and integrations for FastAPI applications.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/es/docs/tutorial/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
pip install "fastapi[standard]"
```

---

TITLE: Installing Python Packages with pip
DESCRIPTION: Demonstrates how to install specific versions of Python packages using the `pip` command, highlighting its use in managing project dependencies and illustrating potential version conflicts when installing globally. It also shows a general package installation example.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/virtual-environments.md#_snippet_13

LANGUAGE: Shell
CODE:

```
$ pip install "harry==1"
```

LANGUAGE: Shell
CODE:

```
$ pip install "harry==3"
```

LANGUAGE: Shell
CODE:

```
$ pip install "fastapi[standard]"
```

---

TITLE: Run FastAPI application with Uvicorn
DESCRIPTION: Instructions on how to start a FastAPI application using Uvicorn, including the command and expected console output. This command enables auto-reloading for development.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/tutorial/index.md#_snippet_0

LANGUAGE: Shell
CODE:

```
$ uvicorn main:app --reload

INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [28720]
INFO:     Started server process [28722]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

TITLE: Create a Basic FastAPI Application
DESCRIPTION: This snippet shows the minimal Python code required to set up a FastAPI application. It imports `FastAPI`, creates an application instance, and defines a root endpoint (`/`) that returns a simple JSON message. This forms the foundation for any FastAPI project.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ko/docs/tutorial/first-steps.md#_snippet_0

LANGUAGE: Python
CODE:

```
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Hello World"}
```

---

TITLE: Example JSON Response
DESCRIPTION: Example JSON response from the /items/{item_id} endpoint with a query parameter.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/index.md#_snippet_5

LANGUAGE: JSON
CODE:

```
{"item_id": 5, "q": "somequery"}
```

---

TITLE: Install FastAPI with Standard Dependencies via Pip
DESCRIPTION: Installs the FastAPI framework along with a set of recommended standard dependencies, such as `fastapi-cloud-cli`, using Python's package installer, pip. It is highly recommended to perform this installation within a virtual environment to manage project dependencies effectively.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/tutorial/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
$ pip install "fastapi[standard]"
```

---

TITLE: Create a Basic FastAPI 'Hello World' Application
DESCRIPTION: This comprehensive snippet demonstrates the fundamental structure of a FastAPI application. It includes importing FastAPI, initializing the app, defining a GET route for the root path ('/'), and returning a simple JSON response. This is the typical starting point for any FastAPI project.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/tutorial/first-steps.md#_snippet_5

LANGUAGE: python
CODE:

```
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}
```

---

TITLE: Install FastAPI with all extras
DESCRIPTION: Command to install FastAPI along with all its optional dependencies, including `pydantic-settings`. This is a convenient way to get all common FastAPI features installed at once.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/advanced/settings.md#_snippet_1

LANGUAGE: bash
CODE:

```
pip install "fastapi[all]"
```

---

TITLE: Running FastAPI application with Uvicorn
DESCRIPTION: This command starts the FastAPI application using Uvicorn, a production-ready ASGI server. The `--reload` flag enables automatic server restarts upon code changes, which is useful for development.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pl/docs/index.md#_snippet_4

LANGUAGE: console
CODE:

```
uvicorn main:app --reload
```

---

TITLE: Run FastAPI Application with Uvicorn
DESCRIPTION: Command to start the FastAPI development server using Uvicorn. The `--reload` flag enables automatic server restarts on code changes, which is ideal for development workflows.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/index.md#_snippet_2

LANGUAGE: Console
CODE:

```
uvicorn main:app --reload
```

---

TITLE: Run FastAPI Application with Uvicorn
DESCRIPTION: This console command initiates the Uvicorn server to host the FastAPI application. `main:app` specifies the Python module (`main.py`) and the FastAPI instance (`app`). The `--reload` flag enables automatic server restarts upon code changes, which is highly beneficial during development.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ko/docs/tutorial/first-steps.md#_snippet_1

LANGUAGE: console
CODE:

```
uvicorn main:app --reload
```

---

TITLE: FastAPI Asynchronous GET Endpoints
DESCRIPTION: This Python example demonstrates the same FastAPI GET endpoints as the basic setup, but implements them using `async def`. This approach is recommended when your endpoint logic involves asynchronous operations (e.g., `await` calls) to prevent blocking the event loop.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/id/docs/index.md#_snippet_1

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Installing FastAPI
DESCRIPTION: This command installs the FastAPI library using pip, the Python package installer. It is a prerequisite for using FastAPI in your Python projects.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/he/docs/index.md#_snippet_0

LANGUAGE: Shell
CODE:

```
$ pip install fastapi

---> 100%
```

---

TITLE: Example requirements.txt content
DESCRIPTION: An example of a `requirements.txt` file, specifying Python packages and their exact versions required for a project. This file ensures consistent dependency installation across different environments.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/virtual-environments.md#_snippet_10

LANGUAGE: requirements.txt
CODE:

```
fastapi[standard]==0.113.0
pydantic==2.8.0
```

---

TITLE: Serve All Built FastAPI Documentation Locally
DESCRIPTION: After building all language versions, this command starts a simple local server to preview the complete documentation site, including all translated content. It's intended for final review before deployment, serving at http://127.0.0.1:8008.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/contributing.md#_snippet_12

LANGUAGE: console
CODE:

```
// Use the command "serve" after running "build-all"
$ python ./scripts/docs.py serve

Warning: this is a very simple server. For development, use mkdocs serve instead.
This is here only to preview a site with translations already built.
Make sure you run the build-all command first.
Serving at: http://127.0.0.1:8008
```

---

TITLE: Installing Uvicorn ASGI server
DESCRIPTION: This command installs Uvicorn, an ASGI server, using pip. Uvicorn is required for running FastAPI applications in a production environment. The `[standard]` extra installs commonly used dependencies for Uvicorn.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pl/docs/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
pip install "uvicorn[standard]"
```

---

TITLE: JSON Response Example
DESCRIPTION: This JSON snippet shows an example response from the /items/{item_id} endpoint, including the item_id and the query parameter q.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/bn/docs/index.md#_snippet_5

LANGUAGE: JSON
CODE:

```
{"item_id": 5, "q": "somequery"}
```

---

TITLE: Installing Uvicorn ASGI server
DESCRIPTION: This command installs Uvicorn, an ASGI server, which is required for running FastAPI applications in production. The [standard] option installs recommended dependencies.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/uk/docs/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
pip install uvicorn[standard]
```

---

TITLE: Initializing FastAPI Application
DESCRIPTION: This code initializes a basic FastAPI application with two GET endpoints: one for the root path ('/') and another for retrieving items by ID ('/items/{item_id}'). It demonstrates how to define path parameters and optional query parameters.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ru/docs/index.md#_snippet_2

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Installing FastAPI with pip
DESCRIPTION: This command installs the FastAPI library using pip, the Python package installer. It fetches the latest version of FastAPI and its dependencies from the Python Package Index (PyPI).

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pl/docs/index.md#_snippet_0

LANGUAGE: Shell
CODE:

```
pip install fastapi
```

---

TITLE: Install FastAPI without Optional Dependencies
DESCRIPTION: Shows the command to install FastAPI with only its core dependencies, excluding any optional packages for a minimal setup.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/index.md#_snippet_14

LANGUAGE: Python
CODE:

```
pip install fastapi
```

---

TITLE: Installing Uvicorn
DESCRIPTION: Install Uvicorn, an ASGI server, for production use. The `[standard]` extra installs commonly used dependencies.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/vi/docs/index.md#_snippet_1

LANGUAGE: console
CODE:

```
$ pip install "uvicorn[standard]"

---> 100%
```

---

TITLE: Run FastAPI Development Server
DESCRIPTION: This command starts the FastAPI development server, watching for changes in `main.py` and automatically reloading the application. It provides a local URL for accessing the API and its interactive documentation. This mode is suitable for development, while `fastapi run` is recommended for production.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/tutorial/index.md#_snippet_0

LANGUAGE: Shell
CODE:

```
$ fastapi dev main.py
```

---

TITLE: Initializing FastAPI App with Basic Endpoints
DESCRIPTION: Creates a FastAPI application instance and defines two GET endpoints: one for the root path ('/') and another for '/items/{item_id}' with a path parameter and an optional query parameter. It uses the FastAPI library and returns JSON responses.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/index.md#_snippet_2

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Install FastAPI with Standard Dependencies
DESCRIPTION: Demonstrates how to install FastAPI including its recommended 'standard' set of optional dependencies, which provide common functionalities like email validation, testing, templating, form parsing, and a production-ready server.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/index.md#_snippet_13

LANGUAGE: Python
CODE:

```
pip install "fastapi[standard]"
```

---

TITLE: Example requirements.txt
DESCRIPTION: Shows the format of a requirements.txt file, which lists the packages and their versions required for a project. This file is used with pip install -r requirements.txt.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ja/docs/virtual-environments.md#_snippet_14

LANGUAGE: requirements.txt
CODE:

```
fastapi[standard]==0.113.0
pydantic==2.8.0
```

---

TITLE: Basic FastAPI Application Testing with TestClient
DESCRIPTION: Demonstrates how to set up a basic FastAPI application and test it using `TestClient` from `fastapi.testclient` and `pytest`. This self-contained example shows a simple GET endpoint and its corresponding test function, illustrating the fundamental approach to testing FastAPI apps.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/tutorial/testing.md#_snippet_0

LANGUAGE: Python
CODE:

```
from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI()

@app.get("/")
def read_main():
    return {"msg": "Hello World"}

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"msg": "Hello World"}
```

---

TITLE: Installing FastAPI
DESCRIPTION: Install FastAPI using pip. This command installs the core FastAPI library.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/vi/docs/index.md#_snippet_0

LANGUAGE: console
CODE:

```
$ pip install fastapi

---> 100%
```

---

TITLE: Body with Examples
DESCRIPTION: Demonstrates how to pass a single example for the expected data in `Body()`. This example shows how to define a request body with an example for the API documentation.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/tutorial/schema-extra-example.md#_snippet_3

LANGUAGE: Python
CODE:

```
from typing import Optional

from fastapi import Body, FastAPI

app = FastAPI()


@app.post("/items/")
async def create_item(
    item: str = Body(
        examples=[
            {
                "name": "Foo",
                "description": "A very nice Item",
                "price": 50.2,
                "tax": 3.2,
            }
        ]
    ),
):
    return item
```

---

TITLE: Run FastAPI Application with Uvicorn
DESCRIPTION: This command starts the FastAPI application using Uvicorn, a lightning-fast ASGI server. The `--reload` flag enables automatic server restarts on code changes, ideal for development.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/tutorial/first-steps.md#_snippet_0

LANGUAGE: console
CODE:

```
$ uvicorn main:app --reload

<span style="color: green;">INFO</span>:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
<span style="color: green;">INFO</span>:     Started reloader process [28720]
<span style="color: green;">INFO</span>:     Started server process [28722]
<span style="color: green;">INFO</span>:     Waiting for application startup.
<span style="color: green;">INFO</span>:     Application startup complete.
```

---

TITLE: FastAPI Application Initialization
DESCRIPTION: Demonstrates the initial steps to set up a FastAPI application: importing the `FastAPI` class and creating an instance of it. This instance serves as the main entry point for defining API routes and functionalities.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/tutorial/first-steps.md#_snippet_4

LANGUAGE: Python
CODE:

```
from fastapi import FastAPI

app = FastAPI()
```

---

TITLE: Build Basic FastAPI Docker Image with Uvicorn and Gunicorn
DESCRIPTION: This Dockerfile provides a basic setup for a FastAPI application using the `tiangolo/uvicorn-gunicorn-fastapi` base image. It copies `requirements.txt`, installs dependencies, and then copies the application code. This is suitable for standard FastAPI projects.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/deployment/docker.md#_snippet_15

LANGUAGE: Dockerfile
CODE:

```
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.9

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./app /app
```

---

TITLE: Installing httpx for testing
DESCRIPTION: Shows how to install the httpx library, which is required for using TestClient.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/uk/docs/tutorial/testing.md#_snippet_0

LANGUAGE: Shell
CODE:

```
$ pip install httpx
```

---

TITLE: Multi-stage Docker build for FastAPI with Poetry
DESCRIPTION: This multi-stage Dockerfile is designed for FastAPI projects managing dependencies with Poetry. The first stage (`requirements-stage`) installs Poetry and exports project dependencies to a `requirements.txt` file. The second, final stage then uses this `requirements.txt` to install dependencies via `pip`, ensuring that Poetry and its build dependencies are not included in the final, smaller image. The `CMD` command starts the Uvicorn server.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/deployment/docker.md#_snippet_6

LANGUAGE: Dockerfile
CODE:

```
FROM python:3.9 as requirements-stage

WORKDIR /tmp

RUN pip install poetry

COPY ./pyproject.toml ./poetry.lock* /tmp/

RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

FROM python:3.9

WORKDIR /code

COPY --from=requirements-stage /tmp/requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
```

---

TITLE: Defining Asynchronous Routes in FastAPI
DESCRIPTION: This code demonstrates how to define asynchronous routes in FastAPI using `async def`. It includes two GET routes, one for the root path ('/') and another for '/items/{item_id}'. The '/items/{item_id}' route accepts an integer item_id and an optional string query parameter q.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/az/docs/index.md#_snippet_1

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Example JavaScript Code from ReDoc
DESCRIPTION: This is an example of the JavaScript code that might be served by ReDoc. It shows the beginning of the bundled JavaScript file.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/how-to/custom-docs-ui-assets.md#_snippet_7

LANGUAGE: JavaScript
CODE:

```
/*! For license information please see redoc.standalone.js.LICENSE.txt */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t(require("null")):...
```

---

TITLE: Installing Uvicorn with pip
DESCRIPTION: This command installs Uvicorn, an ASGI server, using pip. Uvicorn is recommended for production environments. The `[standard]` extra installs additional features.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/bn/docs/index.md#_snippet_1

LANGUAGE: console
CODE:

```
$ pip install "uvicorn[standard]"
```

---

TITLE: Install project packages directly
DESCRIPTION: Installs specified Python packages and their dependencies directly into the active virtual environment. This method is suitable for quick installations but less ideal for reproducible project setups compared to using a requirements file.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/virtual-environments.md#_snippet_8

LANGUAGE: console
CODE:

```
pip install "fastapi[standard]"
```

LANGUAGE: console
CODE:

```
uv pip install "fastapi[standard]"
```

---

TITLE: Initializing FastAPI App with Async Endpoints
DESCRIPTION: Creates a FastAPI application instance and defines two asynchronous GET endpoints: one for the root path ('/') and another for '/items/{item_id}' with a path parameter and an optional query parameter. It uses the FastAPI library and returns JSON responses using async def.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/index.md#_snippet_3

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: FastAPI Auto-Generated OpenAPI Schema
DESCRIPTION: This comprehensive API documentation snippet showcases a portion of the OpenAPI schema automatically generated by FastAPI. It details the API's version, title, and available paths, including their HTTP methods (e.g., GET) and expected responses. This schema is the backbone for interactive documentation tools like Swagger UI and ReDoc, providing a machine-readable description of the API.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ko/docs/tutorial/first-steps.md#_snippet_3

LANGUAGE: JSON
CODE:

```
{
    "openapi": "3.0.2",
    "info": {
        "title": "FastAPI",
        "version": "0.1.0"
    },
    "paths": {
        "/items/": {
            "get": {
                "responses": {
                    "200": {
                        "description": "Successful Response",
                        "content": {
                            "application/json": {
                                "schema": {}
                            }
                        }
                    }
                }
            }
        },
        "/": {
            "get": {
                "responses": {
                    "200": {
                        "description": "Successful Response",
                        "content": {
                            "application/json": {
                                "schema": {}
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "schemas": {}
    }
}
```

---

TITLE: Run FastAPI development server
DESCRIPTION: This command starts the FastAPI development server in development mode, watching for changes in the specified application file. It provides detailed logs including server startup information, URLs for the application, and its interactive documentation.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/tutorial/first-steps.md#_snippet_0

LANGUAGE: console
CODE:

```
$ fastapi dev main.py

  FastAPI   Starting development server 🚀

             Searching for package file structure from directories
             with __init__.py files
             Importing from /home/user/code/awesomeapp

    module   🐍 main.py

      code   Importing the FastAPI app object from the module with
             the following code:

             from main import app

       app   Using import string: main:app

    server   Server started at http://127.0.0.1:8000
    server   Documentation at http://127.0.0.1:8000/docs

       tip   Running in development mode, for production use:
             fastapi run

             Logs:

      INFO   Will watch for changes in these directories:
             ['/home/user/code/awesomeapp']
      INFO   Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C
             to quit)
      INFO   Started reloader process [383138] using WatchFiles
      INFO   Started server process [383153]
      INFO   Waiting for application startup.
      INFO   Application startup complete.
```

---

TITLE: Install Python Multipart Package for FastAPI
DESCRIPTION: Installs the `python-multipart` package, which is essential for FastAPI to handle 'form data' used by OAuth2 for sending username and password. While included with `fastapi[standard]`, it requires manual installation if only `fastapi` is installed.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/tutorial/security/first-steps.md#_snippet_0

LANGUAGE: console
CODE:

```
pip install python-multipart
```

---

TITLE: Initializing FastAPI Application with Async
DESCRIPTION: This code initializes a FastAPI application with asynchronous route handlers using `async def`. It includes two GET endpoints: one for the root path ('/') and another for retrieving items by ID ('/items/{item_id}'). It demonstrates how to define path parameters and optional query parameters in an asynchronous context.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ru/docs/index.md#_snippet_3

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Example FastAPI Application File Structure
DESCRIPTION: Illustrates a typical directory and file organization for a larger FastAPI application, highlighting Python package structure with `__init__.py` files and submodules. This setup allows for better organization and import management.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/tutorial/bigger-applications.md#_snippet_0

LANGUAGE: text
CODE:

```
.\n├── app                  # "app" is a Python package\n│   ├── __init__.py      # this file makes "app" a "Python package"\n│   ├── main.py          # "main" module, e.g. import app.main\n│   ├── dependencies.py  # "dependencies" module, e.g. import app.dependencies\n│   └── routers          # "routers" is a "Python subpackage"\n│   │   ├── __init__.py  # makes "routers" a "Python subpackage"\n│   │   ├── items.py     # "items" submodule, e.g. import app.routers.items\n│   │   └── users.py     # "users" submodule, e.g. import app.routers.users\n│   └── internal         # "internal" is a "Python subpackage"\n│       ├── __init__.py  # makes "internal" a "Python subpackage"\n│       └── admin.py     # "admin" submodule, e.g. import app.internal.admin
```

---

TITLE: Serve built documentation for local preview
DESCRIPTION: After successfully building the documentation with the `build-all` command, this command serves the generated `./site/` content locally for preview. It's a simple server intended specifically for previewing translated sites, and not recommended for general development purposes.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/contributing.md#_snippet_11

LANGUAGE: console
CODE:

```
// Use the command "serve" after running "build-all"
$ python ./scripts/docs.py serve

Warning: this is a very simple server. For development, use mkdocs serve instead.
This is here only to preview a site with translations already built.
Make sure you run the build-all command first.
Serving at: http://127.0.0.1:8008
```

---

TITLE: Install Uvicorn
DESCRIPTION: Install Uvicorn, an ASGI server, for running FastAPI applications in a production environment. The `[standard]` extra installs commonly used dependencies.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh-hant/docs/index.md#_snippet_1

LANGUAGE: bash
CODE:

```
pip install "uvicorn[standard]"
```

---

TITLE: Install Specific Python Package Version with pip
DESCRIPTION: Illustrates how to install a specific version of a Python package (e.g., `harry` version 1) using the `pip` command. This is crucial for managing project dependencies and ensuring compatibility.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh-hant/docs/virtual-environments.md#_snippet_2

LANGUAGE: Shell
CODE:

```
pip install "harry==1"
```

---

TITLE: Get Enum Value
DESCRIPTION: This example demonstrates how to get the string value of an Enum member using `.value`.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pt/docs/tutorial/path-params.md#_snippet_6

LANGUAGE: python
CODE:

```
    return {"model_name": model_name, "message": "Have some residuals": model_name.value}
```

---

TITLE: Installing a Python Package using pip
DESCRIPTION: This command demonstrates how to install a Python package (fastapi with standard extras) using pip, the Python package installer. It shows the typical output of the installation process.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ja/docs/virtual-environments.md#_snippet_19

LANGUAGE: bash
CODE:

```
pip install "fastapi[standard]"
```

---

TITLE: Install FastAPI
DESCRIPTION: Install FastAPI using pip. This command installs the core FastAPI library.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh-hant/docs/index.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install fastapi
```

---

TITLE: Create Basic FastAPI GET Endpoints
DESCRIPTION: This Python code defines a simple FastAPI application with two GET endpoints. The root endpoint ('/') returns a 'Hello World' message, and the '/items/{item_id}' endpoint retrieves an item by ID, optionally accepting a query parameter 'q'.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/id/docs/index.md#_snippet_0

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Creating a basic FastAPI application
DESCRIPTION: This Python code defines a simple FastAPI application with two endpoints: `/` which returns a greeting, and `/items/{item_id}` which returns the item ID and an optional query parameter. It imports FastAPI, creates an app instance, and defines the endpoints using decorators.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pl/docs/index.md#_snippet_2

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
```

---

TITLE: Updated PATH after Python install (Windows)
DESCRIPTION: Example of how the PATH variable might be updated after installing Python in a custom directory on Windows.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/es/docs/environment-variables.md#_snippet_4

LANGUAGE: plaintext
CODE:

```
C:\Program Files\Python312\Scripts;C:\Program Files\Python312;C:\Windows\System32;C:\opt\custompython\bin
```

---

TITLE: Installing Uvicorn with pip
DESCRIPTION: This command installs Uvicorn, an ASGI (Asynchronous Server Gateway Interface) server, using pip. Uvicorn is required to run FastAPI applications in production. The `[standard]` extra installs recommended dependencies.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/fa/docs/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
$ pip install "uvicorn[standard]"
```

---

TITLE: Installing Uvicorn with Standard Dependencies
DESCRIPTION: This command installs Uvicorn, a high-performance ASGI server, along with recommended dependencies like uvloop for improved concurrency.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/fr/docs/deployment/manually.md#_snippet_0

LANGUAGE: bash
CODE:

```
$ pip install "uvicorn[standard]"

---> 100%
```

---

TITLE: Updated PATH Variable after Python Installation (Windows)
DESCRIPTION: This example shows how the PATH variable might be updated after installing Python in a custom directory on Windows. The Python installation directory is appended to the existing PATH.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pt/docs/environment-variables.md#_snippet_9

LANGUAGE: plaintext
CODE:

```
C:\Program Files\Python312\Scripts;C:\Program Files\Python312;C:\Windows\System32;C:\opt\custompython\bin
```

---

TITLE: Install FastAPI with Standard Dependencies and Run CLI
DESCRIPTION: This snippet demonstrates the new way to install FastAPI with its standard dependencies using `pip install "fastapi[standard]"` and how to invoke the FastAPI CLI directly via `python -m fastapi`. This change simplifies dependency management and provides a direct entry point for CLI operations.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/release-notes.md#_snippet_6

LANGUAGE: bash
CODE:

```
pip install "fastapi[standard]"
```

LANGUAGE: bash
CODE:

```
python -m fastapi
```

---

TITLE: Installing Uvicorn
DESCRIPTION: This command installs Uvicorn, an ASGI server, along with the 'standard' extras. Uvicorn is used to run FastAPI applications in a production environment. The 'standard' extras provide additional features and optimizations.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ko/docs/index.md#_snippet_1

LANGUAGE: Shell
CODE:

```
$ pip install "uvicorn[standard]"
```

---

TITLE: FastAPI Main App File
DESCRIPTION: This is an example of a FastAPI application defined in main.py. It defines a simple GET endpoint that returns a JSON response.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ko/docs/tutorial/testing.md#_snippet_2

LANGUAGE: Python
CODE:

```
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_main():
    return {"msg": "Hello World"}
```

---

TITLE: Define Asynchronous GET Path Operation for Root
DESCRIPTION: This example shows how to define an asynchronous GET endpoint for the root path ('/') using the `@app.get()` decorator. The `async def` function handles incoming requests and returns a dictionary, which FastAPI automatically serializes to JSON.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/tutorial/first-steps.md#_snippet_2

LANGUAGE: Python
CODE:

```
@app.get("/")
async def root():
    return {"message": "Hello World"}
```

---

TITLE: Installing FastAPI with pip
DESCRIPTION: This command installs the FastAPI library using pip, the Python package installer. It's a prerequisite for using FastAPI in your Python projects.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/uk/docs/index.md#_snippet_0

LANGUAGE: Shell
CODE:

```
pip install fastapi
```

---

TITLE: Example JSON Response
DESCRIPTION: This JSON response is returned when accessing the /items/{item_id} endpoint with a query parameter. It demonstrates how FastAPI automatically serializes data into JSON format.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pl/docs/index.md#_snippet_5

LANGUAGE: JSON
CODE:

```
{"item_id": 5, "q": "somequery"}
```

---

TITLE: Create a Path Operation for Testing
DESCRIPTION: This snippet creates a simple path operation to test if the custom documentation setup is working correctly. It defines a GET endpoint at the root path that returns a dictionary with a message.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/how-to/custom-docs-ui-assets.md#_snippet_2

LANGUAGE: Python
CODE:

```
@app.get("/")
async def read_root():
    return {"message": "Hello World"}
```

---

TITLE: Install FastAPI Development Requirements
DESCRIPTION: Installs all project dependencies and the local FastAPI version in editable mode using pip. This setup is crucial for local development, allowing direct testing of code changes without needing to reinstall the package.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/contributing.md#_snippet_0

LANGUAGE: Bash
CODE:

```
pip install -r requirements.txt
```

---

TITLE: Updated PATH Variable after Python Installation (Linux, macOS)
DESCRIPTION: This example shows how the PATH variable might be updated after installing Python in a custom directory on Linux or macOS. The Python installation directory is appended to the existing PATH.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pt/docs/environment-variables.md#_snippet_8

LANGUAGE: plaintext
CODE:

```
/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/custompython/bin
```

---

TITLE: Install FastAPI with Standard Dependencies
DESCRIPTION: This command demonstrates the current recommended way to install FastAPI, explicitly including its standard optional dependencies. Previously, these dependencies were installed by default, but now they require explicit inclusion using the `[standard]` extra. This change addresses user feedback regarding unwanted default dependencies and provides more control over the installation footprint.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/release-notes.md#_snippet_7

LANGUAGE: Shell
CODE:

```
pip install "fastapi[standard]"
```

LANGUAGE: Shell
CODE:

```
pip install fastapi
```

---

TITLE: Installing Hypercorn with Trio Support
DESCRIPTION: This command installs Hypercorn with support for Trio, an alternative asynchronous framework to asyncio.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/fr/docs/deployment/manually.md#_snippet_4

LANGUAGE: bash
CODE:

```
$ pip install "hypercorn[trio]"
---> 100%
```

---

TITLE: Body with Multiple Examples
DESCRIPTION: Demonstrates how to pass multiple examples for the expected data in `Body()`. This example shows how to define a request body with multiple examples for the API documentation.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/tutorial/schema-extra-example.md#_snippet_4

LANGUAGE: Python
CODE:

```
from typing import Optional

from fastapi import Body, FastAPI

app = FastAPI()


@app.post("/items/")
async def create_item(
    item: str = Body(
        examples=[
            {
                "name": "Foo",
                "description": "A very nice Item",
                "price": 50.2,
                "tax": 3.2,
            },
            {
                "name": "Bar",
                "price": 62,
                "description": "The Bar fighters",
                "tax": 2.2,
            },
        ]
    ),
):
    return item
```

---

TITLE: Installing FastAPI with standard extras using pip
DESCRIPTION: This command demonstrates how to install FastAPI with the 'standard' extras using pip. It downloads and installs FastAPI and its dependencies into the current environment.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/vi/docs/virtual-environments.md#_snippet_19

LANGUAGE: console
CODE:

```
// Đừng chạy lệnh này ngay, đây chỉ là một ví dụ 🤓
$ pip install "fastapi[standard]"
---> 100%
```

---

TITLE: Install Uvicorn with Standard Dependencies
DESCRIPTION: Install Uvicorn, a high-performance ASGI server built on uvloop and httptools. The `standard` extra includes recommended dependencies for optimal performance, such as `uvloop` for an efficient asyncio event loop.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/deployment/manually.md#_snippet_0

LANGUAGE: Shell
CODE:

```
pip install "uvicorn[standard]"
```

---

TITLE: Installing Hypercorn with Trio Support
DESCRIPTION: This command installs Hypercorn with Trio support, allowing the use of Trio as a backend for the ASGI server.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/deployment/manually.md#_snippet_4

LANGUAGE: console
CODE:

```
$ pip install "hypercorn[trio]"
---> 100%
```

---

TITLE: Returning a Dictionary
DESCRIPTION: This snippet demonstrates how to return a dictionary containing item information in FastAPI. It shows how to access item attributes and include them in the response.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pl/docs/index.md#_snippet_9

LANGUAGE: Python
CODE:

```
return {"item_name": item.name, "item_id": item_id}
```

---

TITLE: Initialize FastAPI Application Instance
DESCRIPTION: This snippet demonstrates the foundational steps for any FastAPI application: importing the `FastAPI` class and creating an instance of it. The `app` instance serves as the central object for defining all API routes and operations.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/tutorial/first-steps.md#_snippet_1

LANGUAGE: Python
CODE:

```
from fastapi import FastAPI

app = FastAPI()
```

---

TITLE: FastAPI Application with Pydantic Model and PUT Request
DESCRIPTION: Updated FastAPI application demonstrating how to define a Pydantic `BaseModel` for request body validation and how to implement a `PUT` endpoint that accepts a structured request body, enhancing API data handling.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/index.md#_snippet_4

LANGUAGE: Python
CODE:

```
from typing import Union

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    price: float
    is_offer: Union[bool, None] = None


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_name": item.name, "item_id": item_id}
```

---

TITLE: Create a basic Dockerfile for FastAPI
DESCRIPTION: This Dockerfile demonstrates how to build a basic Docker image for a FastAPI application using the official `tiangolo/uvicorn-gunicorn-fastapi:python3.9` base image. It copies `requirements.txt`, installs dependencies, and then copies the application code into the `/app` directory.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/deployment/docker.md#_snippet_4

LANGUAGE: Dockerfile
CODE:

```
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.9

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./app /app
```

---

TITLE: Example requirements.txt file
DESCRIPTION: This is an example of a requirements.txt file. It lists the packages and their versions that are required for the project.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/vi/docs/virtual-environments.md#_snippet_16

LANGUAGE: txt
CODE:

```
fastapi[standard]==0.113.0
pydantic==2.8.0
```

---

TITLE: Basic Dockerfile for FastAPI Application
DESCRIPTION: This Dockerfile defines the steps to containerize a FastAPI application. It starts from a Python base image, sets the working directory, and efficiently installs dependencies by leveraging Docker's build cache. Finally, it copies the application code and specifies the command to run the Uvicorn server.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/deployment/docker.md#_snippet_0

LANGUAGE: Dockerfile
CODE:

```
FROM python:3.9

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
```

---

TITLE: Installing Pytest
DESCRIPTION: This command shows how to install pytest using pip. It is necessary to create and activate a virtual environment before installing pytest.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/pt/docs/tutorial/testing.md#_snippet_9

LANGUAGE: bash
CODE:

```
pip install pytest
```

---

TITLE: Start Traefik Proxy with Configuration
DESCRIPTION: Command to launch the Traefik proxy, instructing it to use the `traefik.toml` configuration file. This initiates the proxy server, enabling it to handle incoming requests and route them according to the defined rules.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/zh/docs/advanced/behind-a-proxy.md#_snippet_5

LANGUAGE: console
CODE:

```
./traefik --configFile=traefik.toml
```

---

TITLE: FastAPI Application with GET and PUT Endpoints
DESCRIPTION: This Python code defines a FastAPI application with multiple endpoints. It includes a root GET endpoint, a GET endpoint for items with path and optional query parameters, and a PUT endpoint for updating items. The example demonstrates the use of Pydantic for defining request body models and type hinting for automatic validation and documentation.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/index.md#_snippet_3

LANGUAGE: python
CODE:

```
from typing import Union

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    price: float
    is_offer: Union[bool, None] = None


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_name": item.name, "item_id": item_id}
```

---

TITLE: Example JSON Response from FastAPI GET Endpoint
DESCRIPTION: This JSON object represents a typical response from a FastAPI GET endpoint, specifically '/items/{item_id}?q=somequery'. It demonstrates how path parameters (item_id) and query parameters (q) are reflected in the API's output.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/em/docs/index.md#_snippet_2

LANGUAGE: json
CODE:

```
{"item_id": 5, "q": "somequery"}
```

---

TITLE: Creating a FastAPI Instance
DESCRIPTION: This code snippet shows how to create an instance of the FastAPI class, which serves as the main entry point for defining API endpoints.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/tutorial/first-steps.md#_snippet_2

LANGUAGE: Python
CODE:

```
app = FastAPI()
```

---

TITLE: Installing Hypercorn
DESCRIPTION: This command installs Hypercorn, an ASGI server that is compatible with HTTP/2.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/deployment/manually.md#_snippet_1

LANGUAGE: console
CODE:

```
$ pip install hypercorn

---> 100%
```

---

TITLE: Installing Uvicorn with Standard Dependencies
DESCRIPTION: This command installs Uvicorn, a high-performance ASGI server, along with recommended additional dependencies, including uvloop for improved concurrency performance.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/de/docs/deployment/manually.md#_snippet_0

LANGUAGE: console
CODE:

```
$ pip install "uvicorn[standard]"

---> 100%
```

---

TITLE: Initializing FastAPI Application
DESCRIPTION: Creates an instance of the FastAPI class, which serves as the entry point for building the API. The `app` variable is used to define and interact with the API.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/ru/docs/tutorial/first-steps.md#_snippet_2

LANGUAGE: Python
CODE:

```
app = FastAPI()
```

---

TITLE: Example PATH Variable on Windows
DESCRIPTION: Illustrates a typical `PATH` environment variable string for Windows systems, showing common directories where executables are located, including Python installation paths. Directories are separated by a semicolon.

SOURCE: https://github.com/tiangolo/fastapi/blob/master/docs/en/docs/environment-variables.md#_snippet_7

LANGUAGE: plaintext
CODE:

```
C:\Program Files\Python312\Scripts;C:\Program Files\Python312;C:\Windows\System32
```
