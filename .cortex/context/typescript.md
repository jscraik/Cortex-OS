========================

# CODE SNIPPETS

TITLE: Run a Node.js Container
DESCRIPTION: Starts an interactive, pseudo-TTY session in a new Node.js container. The container is automatically removed upon exit. This is a basic command to get a running Node.js environment.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_0

LANGUAGE: docker
CODE:

```
docker run -it --rm node
```

---

TITLE: Docker Setup for Tsserverfuzzer
DESCRIPTION: Clones the tsserverfuzzer repository and starts a Docker container. It mounts the current directory as /fuzzer, sets the working directory, and runs as the 'node' user. Supports Windows %cd% and PowerShell $pwd for directory mounting.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_5

LANGUAGE: bash
CODE:

```
c:\> cd work
C:\work> git clone ...tsserverfuzzer...
C:\work> cd tsserverfuzzer
C:\work\tsserverfuzzer> docker run -it --rm -v %cd%:/fuzzer -w /fuzzer -u node node bash
```

LANGUAGE: powershell
CODE:

```
PS C:\work> cd work
PS C:\work> git clone ...tsserverfuzzer...
PS C:\work> cd tsserverfuzzer
PS C:\work\tsserverfuzzer> docker run -it --rm -v $pwd:/fuzzer -w /fuzzer -u node node bash
```

---

TITLE: Install and Link TypeScript Globally
DESCRIPTION: Installs the TypeScript compiler globally using npm and links it to the project's environment. This is a prerequisite for using the TypeScript compiler API.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Using-the-Compiler-API-(TypeScript-1.4).md#_snippet_0

LANGUAGE: bash
CODE:

```
npm install -g typescript
npm link typescript
```

---

TITLE: Install Node.js Declaration Files
DESCRIPTION: Installs the TypeScript declaration files for Node.js, which are necessary for using Node.js APIs in TypeScript projects and examples.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Using-the-Compiler-API.md#_snippet_1

LANGUAGE: sh
CODE:

```
npm install -D @types/node
```

---

TITLE: Install and Run Gollum Wiki
DESCRIPTION: Instructions to install Gollum, a static site generator, and start the local wiki server. This allows for local development and testing of wiki content.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/README.md#_snippet_0

LANGUAGE: sh
CODE:

```
# Install the deps
gem install gollum

# Start the server
gollum
```

---

TITLE: Install Latest TypeScript Version
DESCRIPTION: Installs the latest version of TypeScript using npm. This is a prerequisite for using the `--generateTrace` feature, which was introduced in TypeScript 4.1.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Performance-Tracing.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm install typescript@latest
```

---

TITLE: Example Usage: Machine without Provided Actors
DESCRIPTION: Shows a basic example of creating a machine using `setup` when no specific actors are provided, demonstrating the flexibility of the system.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/inferenceExactOptionalProperties2.errors.txt#_snippet_2

LANGUAGE: typescript
CODE:

```
// no provided actors, `assign` should still work
setup().createMachine({
  entry: assign(() => ({})),
});

```

---

TITLE: Install and Link TypeScript Globally
DESCRIPTION: Installs the TypeScript compiler globally using npm and links it to the local project environment. This is a prerequisite for using TypeScript from the command line or programmatically.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Using-the-Compiler-API.md#_snippet_0

LANGUAGE: sh
CODE:

```
npm install -g typescript
npm link typescript
```

---

TITLE: TypeScript Project Setup and Testing
DESCRIPTION: A sequence of bash commands to set up the TypeScript development environment, install dependencies, and run tests.

SOURCE: https://github.com/microsoft/typescript/blob/main/CONTRIBUTING.md#_snippet_6

LANGUAGE: bash
CODE:

```
cd TypeScript
npm ci
hereby runtests-parallel
```

---

TITLE: Mounting .npmrc for Containerized npm Install
DESCRIPTION: Mounts the user's local .npmrc file into the Docker container in read-only mode. This allows the container to use the host's npm authentication credentials for installing packages.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_10

LANGUAGE: dockerfile
CODE:

```
docker run ... -v %USERPROFILE%\.npmrc:/home/node/.npmrc:ro ...
```

---

TITLE: Installing Sudo in Minimal Node Docker Image
DESCRIPTION: Installs 'sudo' and updates package lists within a minimal Node.js Docker container. This is a workaround for code that requires elevated privileges, as the base image does not include sudo by default.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_11

LANGUAGE: bash
CODE:

```
docker run -it --rm ... node bash
# Inside container:
# apt update; apt install sudo
# Then run your script:
# node /work/index.js 1 3.3 3.4 false
```

---

TITLE: Analyze TypeScript Trace with analyze-trace
DESCRIPTION: Installs and executes the `@typescript/analyze-trace` package to provide a quick summary of potential performance issues identified in the generated trace files. The `some_directory` argument should point to the directory where trace files were generated.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Performance-Tracing.md#_snippet_2

LANGUAGE: sh
CODE:

```
npm install @typescript/analyze-trace
npx analyze-trace some_directory
```

---

TITLE: Run Container as Specific User and Directory
DESCRIPTION: Starts an interactive `bash` session in a Node.js container, running as the `node` user and setting the working directory to `/home/node`. This is useful for simulating user-specific environments.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_3

LANGUAGE: docker
CODE:

```
docker run -it --rm -u node -w /home/node node bash
```

---

TITLE: Executing Commands in a Running Docker Container
DESCRIPTION: This example shows how to start an interactive bash shell within a running Docker container. First, you use `docker ps` to find the container ID, then `docker exec -it <container-id> bash` to enter the container's environment.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_14

LANGUAGE: shell
CODE:

```
C:\> docker ps
... node id ...
C:\> docker exec -it 123 bash
```

---

TITLE: Running Tsserverfuzzer Commands in Docker
DESCRIPTION: Executes essential commands within the Docker container: installing Node.js dependencies, building the project, checking git status, and running the main fuzzer script.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_6

LANGUAGE: bash
CODE:

```
node@...:/fuzzer$ npm install
...
node@...:/fuzzer$ npm run build
...
node@...:/fuzzer$ git status
...
node@...:/fuzzer$ node lib/Fuzzer/main.js
```

---

TITLE: Run Container with Mounted Volume
DESCRIPTION: Starts an interactive `bash` session in a Node.js container, mounting the host's `c:\foo` directory to `/work` inside the container. Changes made in `/work` will persist on the host.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_4

LANGUAGE: docker
CODE:

```
docker run -it --rm -v c:\foo:/work node bash
```

---

TITLE: Run Container with Custom Command
DESCRIPTION: Starts an interactive session in a Node.js container and overrides the default entrypoint to launch a `bash` shell. This allows executing custom commands within the container before it exits.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_2

LANGUAGE: docker
CODE:

```
docker run -it --rm node bash
```

---

TITLE: Run a Specific Node.js Version Container
DESCRIPTION: Starts an interactive session in a Node.js container, specifically using the `12` tag for the image. If no tag is specified, `:latest` is used by default. The container is removed after use.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_1

LANGUAGE: docker
CODE:

```
docker run -it --rm node:12
```

---

TITLE: Docker Port Forwarding for Debugging
DESCRIPTION: Starts a Docker container and forwards port 9242 from the container to port 9229 on the host. This is crucial for attaching a debugger from the host machine to the process running inside the container.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_7

LANGUAGE: bash
CODE:

```
docker run ...same... -p 9229:9242 node bash
```

---

TITLE: React JSX Setup Example
DESCRIPTION: A valid example of setting up JSX with React in a TypeScript file, demonstrating the `jsxImportSource` directive and basic JSX structure. This serves as a reference for correct configuration.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/jsxJsxsCjsTransformCustomImportPragma(jsx=react-jsxdev).errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
/// <reference path="/.lib/react16.d.ts" />
/* @jsxImportSource react */
import "./preact";
const a = <>
  <p></p>
  text
  <div className="foo"></div>
</>

export {};
```

---

TITLE: JavaScript Example with Docker GUI Reference
DESCRIPTION: This snippet demonstrates a JavaScript string concatenation, referencing the availability of a Docker GUI for Windows users. It's a simple example illustrating how JavaScript might be used in conjunction with Docker concepts.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_12

LANGUAGE: javascript
CODE:

```
const orGUI =
  "Or, as long as you're a gui-dependent windows user,"
  + "just use the docker gui...";

console.log(orGUI);
```

---

TITLE: TypeScript: Incremental Build Watcher
DESCRIPTION: This TypeScript code snippet demonstrates how to create an incremental build system. It sets up a file watcher using Node.js's `fs` module and the TypeScript Language Service to detect file changes, update file versions, and re-emit compiled outputs. The example includes error handling for compilation diagnostics.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Using-the-Compiler-API-(TypeScript-1.4).md#_snippet_4

LANGUAGE: TypeScript
CODE:

```
/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/typescript/typescript.d.ts" />

import fs = require("fs");
import ts = require("typescript");
import path = require("path");


function watch(filenames: string[], options: ts.CompilerOptions) {
    var files: ts.Map<{ version: number; text: string; }> = {};

    // Add the default library file
    filenames.unshift(path.join(path.dirname(require.resolve('typescript')), 'lib.d.ts'));

    // initialize the list of files
    filenames.forEach(filename => {
        files[filename] = { version: 0, text: fs.readFileSync(filename).toString() };
    });

    // Create the language service host to allow the LS to communicate with the host
    var servicesHost: ts.LanguageServiceHost = {
        getScriptFileNames: () => filenames,
        getScriptVersion: (filename) => files[filename] && files[filename].version.toString(),
        getScriptSnapshot: (filename) => {
            var file = files[filename];
            return {
                getText: (start, end) => file.text.substring(start, end),
                getLength: () => file.text.length,
                getLineStartPositions: () => [],
                getChangeRange: (oldSnapshot) => undefined
            };
        },
        getCurrentDirectory: () => process.cwd(),
        getScriptIsOpen: () => true,
        getCompilationSettings: () => options,
        getDefaultLibFilename:(options) => 'lib.d.ts',
        log: (message) => console.log(message)
    };

    // Create the language service files
    var services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry())

    // Now let's watch the files
    filenames.forEach(filename => {
        // First time around, emit all files
        emitFile(filename);

        // Add a watch on the file to handle next change
        fs.watchFile(filename,
            { persistent: true, interval: 250 },
            (curr, prev) => {
                // Check timestamp
                if (+curr.mtime <= +prev.mtime) {
                    return;
                }

                var file = files[filename];

                // Update the version to signal a change in the file
                file.version++;

                // Clear the text to force a new read
                file.text = fs.readFileSync(filename).toString();

                // write the changes to disk
                emitFile(filename);
            });
    });


    function emitFile(filename: string) {
        var output = services.getEmitOutput(filename);

        if (output.emitOutputStatus === ts.EmitReturnStatus.Succeeded) {
            console.log(`Emitting ${filename}`);
        }
        else {
            console.log(`Emitting ${filename} failed`);
            var allDiagnostics = services.getCompilerOptionsDiagnostics()
                .concat(services.getSyntacticDiagnostics(filename))
                .concat(services.getSemanticDiagnostics(filename));

            allDiagnostics.forEach(diagnostic => {
                var lineChar = diagnostic.file.getLineAndCharacterFromPosition(diagnostic.start);
                console.log(`  ${diagnostic.file && diagnostic.file.filename} (${lineChar.line},${lineChar.character}): ${diagnostic.messageText}`);
            });
        }

        output.outputFiles.forEach(o => {
            fs.writeFileSync(o.name, o.text, "utf8");
        });
    }
}

// Initialize files constituting the program as all .ts files in the current directory
var currentDirectoryFiles = fs.readdirSync(process.cwd()).
    filter(filename=> filename.length >= 3 && filename.substr(filename.length - 3, 3) === ".ts");
    //map(filename => path.join(process.cwd(), filename));

// Start the watcher
watch(currentDirectoryFiles, { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });

```

---

TITLE: Intl DisplayNames API
DESCRIPTION: Demonstrates the Intl.DisplayNames API for getting human-readable names for locales, regions, scripts, and languages. Includes examples of creating DisplayNames instances and using the 'of' method.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/es2020IntlAPIs.errors.txt#_snippet_2

LANGUAGE: APIDOC
CODE:

```
Intl.DisplayNames(locales?: string | string[], options?: DisplayNamesOptions)
  Provides human-readable names for BCP 47 language tags.
  Parameters:
    locales: A string with a BCP 47 language tag, or an array of such tags.
    options: An object with properties like 'type' (e.g., 'region', 'language', 'script', 'currency') and 'style'.

  of(code: string): string | undefined
    Returns the display name for a given code.
    Parameters:
      code: The code (e.g., 'US', 'en', 'Latn') to look up.

Example Usage:
const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' });
console.log(regionNamesInEnglish.of('US')); // Expected: "United States"

const regionNamesInTraditionalChinese = new Intl.DisplayNames(['zh-Hant'], { type: 'region' });
console.log(regionNamesInTraditionalChinese.of('US')); // Expected: "美國"

// Example with type 'language'
console.log((new Intl.DisplayNames(undefined, {type: 'language'})).of('en-GB')); // Expected: "British English"
```

---

TITLE: JSX Fragment Opening Tag
DESCRIPTION: Demonstrates the basic syntax for an opening JSX fragment tag in TypeScript. This snippet shows a common starting point for JSX structures.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/linkedEditingJsxTag10.linkedEditing.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
const jsx = <>

```

---

TITLE: Example Usage: Actor Spawning with Type Checking
DESCRIPTION: Demonstrates how to use the `setup` function to create a machine and spawn actors, highlighting a type error when an incorrect actor type is provided to `spawn`.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/inferenceExactOptionalProperties2.errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
declare const counterLogic: ActorLogic<{ type: "INCREMENT" }>;

// example usage
setup({
  actors: { counter: counterLogic },
}).createMachine({
  entry: assign((spawn) => {
    spawn("counter"); // ok
    spawn("alarm"); // error
          ~~~~~~~
!!! error TS2345: Argument of type '"alarm"' is not assignable to parameter of type '"counter"'.
    return {};
  }),
});

```

---

TITLE: Baseline Module: Prepare Baseline Report
DESCRIPTION: Prepares the content for the baseline report HTML file. It either reads existing content from 'baseline-report.html' or starts with a predefined HTML header, removing the trailer if reading existing content.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/parserharness.errors.txt#_snippet_72

LANGUAGE: typescript
CODE:

```
function prepareBaselineReport(): string {
    var reportContent = htmlLeader;
    // Delete the baseline-report.html file if needed
    if (IO.fileExists(reportFilename)) {
        reportContent = IO.readFile(reportFilename);
        reportContent = reportContent.replace(htmlTrailer, '');
    } else {
        reportContent = htmlLeader;
    }
    return reportContent;
}
```

---

TITLE: Valid React JSX Import Source
DESCRIPTION: Demonstrates a correct setup for React JSX using the `/* @jsxImportSource react */` pragma. This example shows how to import components and use JSX syntax with React, assuming the necessary types and runtime are available.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/jsxJsxsCjsTransformKeyPropCustomImportPragma(jsx=react-jsx).errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
/// <reference path="/.lib/react16.d.ts" />
/* @jsxImportSource react */
import "./preact";
const props2 = { answer: 42 }
const a2 = <div key="foo" {...props2}>text</div>;
const b2 = <div {...props2} key="bar">text</div>;

export {};

```

---

TITLE: Install Dependencies
DESCRIPTION: Installs all necessary project dependencies using npm ci, which is recommended for CI environments or when ensuring a clean install.

SOURCE: https://github.com/microsoft/typescript/blob/main/CONTRIBUTING.md#_snippet_4

LANGUAGE: bash
CODE:

```
npm ci
```

---

TITLE: TypeScript ESM to ESM Import Example
DESCRIPTION: Shows a standard ECMAScript module importing other ECMAScript modules using defined import maps. This setup allows for cleaner module referencing within the project.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModulesPackageImports(module=node16).errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
// esm format file
    import * as cjs from "#cjs";
    import * as mjs from "#mjs";
    import * as type from "#type";
    cjs;
    mjs;
    type;
```

---

TITLE: TypeScript MSI Installer File Locations
DESCRIPTION: Describes the installation paths for TypeScript files when using the MSI installer on Windows, differentiating between versions before and after 2.3.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/TypeScript-MSBuild-In-Depth.md#_snippet_1

LANGUAGE: text
CODE:

```
Microsoft SDKs Folder:
  "%ProgramFiles%\Microsoft SDKs\TypeScript\<version-number>"
    (contains tsc.exe and dependencies)
  "%ProgramFiles%\Microsoft SDKs\TypeScript\<version-number>\build"
    (versions 2.3+; contains Microsoft.TypeScript.targets, TypeScript.Tasks.dll, dependencies)
  "%ProgramFiles%\Microsoft SDKs\TypeScript\<version-number>\versions"
    (versions 2.3+; used by stub target file)

MSBuild folder:
  "%ProgramFile%\MSBuild\Microsoft\VisualStudio\v14.0\TypeScript"
    (contains stub target file for versions 2.3+)
```

---

TITLE: JSX Fragment with Invalid Start Character
DESCRIPTION: Shows a syntax error where a JSX fragment starts with an unexpected character.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/linkedEditingJsxTag10.linkedEditing.txt#_snippet_12

LANGUAGE: typescript
CODE:

```
const jsx = > </>;

```

---

TITLE: TypeScript ESM to ESM Import Example
DESCRIPTION: Shows a standard ECMAScript module importing other ECMAScript modules using defined import maps. This setup allows for cleaner module referencing within the project.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModulesPackageImports(module=node18).errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
// esm format file
    import * as cjs from "#cjs";
    import * as mjs from "#mjs";
    import * as type from "#type";
    cjs;
    mjs;
    type;
```

---

TITLE: TypeScript: Get Accessor Cannot Have Parameters or Must Return Value
DESCRIPTION: This snippet illustrates TypeScript errors TS1054 and TS2378. TS1054 indicates that a 'get' accessor in a class cannot accept parameters. TS2378 signifies that a 'get' accessor must always return a value, which is not satisfied in the example.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/parserMemberAccessorDeclaration12.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
class C {
   get Foo(a: number) { }
       ~~~
!!! error TS1054: A 'get' accessor cannot have parameters.
       ~~~
!!! error TS2378: A 'get' accessor must return a value.
}

```

---

TITLE: Install TypeScript and Locate tsserver
DESCRIPTION: Installs the TypeScript package via npm and demonstrates how to locate the tsserver executable within the installed package.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Standalone-Server-(tsserver).md#_snippet_0

LANGUAGE: cmd
CODE:

```
npm install --save typescript
ls node_modules\typescript\lib\tsserver.js
```

---

TITLE: Get TypeScript Version
DESCRIPTION: Command to check the currently installed version of the TypeScript compiler.

SOURCE: https://github.com/microsoft/typescript/blob/main/CONTRIBUTING.md#_snippet_0

LANGUAGE: bash
CODE:

```
tsc --v
```

---

TITLE: TypeScript Main Program Execution
DESCRIPTION: Represents a call to the Main method within the Program class of TypeScriptAllInOne, typically used to start application execution.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/constructorWithIncompleteTypeAnnotation.errors.txt#_snippet_15

LANGUAGE: TypeScript
CODE:

```
TypeScriptAllInOne.Program.Main();
```

---

TITLE: TypeScript Bot Command Example
DESCRIPTION: Demonstrates how to invoke the TypeScript bot by issuing a command within a GitHub comment. This is a user-facing interaction example.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Tooling-On-The-Compiler-Repo.md#_snippet_0

LANGUAGE: markdown
CODE:

```
@typescript-bot pack this
```

---

TITLE: Define Decorator Variable in TypeScript
DESCRIPTION: Defines a variable `dec` intended for use as a TypeScript decorator. This setup is a prerequisite for applying custom decorators in the following examples.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/esDecorators-classDeclaration-exportModifier.2.errors.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
var dec;
```

---

TITLE: Example TypeScript Class for Documentation
DESCRIPTION: This is an example of a TypeScript class with JSDoc comments for the class itself and its constructor parameters. This input demonstrates the structure expected by the documentation generator script.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Using-the-Compiler-API.md#_snippet_15

LANGUAGE: typescript
CODE:

```
/**
 * Documentation for C
 */
class C {
    /**
     * constructor documentation
     * @param a my parameter documentation
     * @param b another parameter documentation
     */
    constructor(a: string, b: C) { }
}

```

---

TITLE: Empty TypeScript File
DESCRIPTION: An empty TypeScript file used as a placeholder or for testing harness setup. It contains only an export statement to ensure it's treated as a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/modulePreserve4.errors.txt#_snippet_15

LANGUAGE: typescript
CODE:

```
export {}; // Silly test harness
```

---

TITLE: Basic TypeScript Import Example
DESCRIPTION: A simple TypeScript file demonstrating how to import a module. This snippet shows the basic syntax for importing external modules, which is fundamental for organizing code in TypeScript projects.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/pathsValidation5.errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
import 'someModule';
```

---

TITLE: TypeScript: Calling Get Accessors
DESCRIPTION: Demonstrates TypeScript error TS6234 where a 'get' accessor is incorrectly called as a function. This occurs when trying to invoke a property that is defined with a getter, leading to a 'not callable' error. The examples show this in both non-generic and generic class contexts.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/instancePropertyInClassType.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
module NonGeneric {
    class C {
        x: string;
        get y() {
            return 1;
        }
        set y(v) { }
        fn() { return this; }
        constructor(public a: number, private b: number) { }
    }

    var c = new C(1, 2);
    var r = c.fn();
    var r2 = r.x;
    var r3 = r.y;
    r.y = 4;
    var r6 = c.y(); // error
               ~
```

LANGUAGE: typescript
CODE:

```
module Generic {
    class C<T,U> {
        x: T;
        get y() {
            return null;
        }
        set y(v: U) { }
        fn() { return this; }
        constructor(public a: T, private b: U) { }
    }

    var c = new C(1, '');
    var r = c.fn();
    var r2 = r.x;
    var r3 = r.y;
    r.y = '';
    var r6 = c.y(); // error
               ~
```

---

TITLE: TypeScript typeof on Classes and Instances
DESCRIPTION: Illustrates how 'typeof' can be applied to classes to get their constructor type and to instances to get their object type. This helps in typing variables that hold class constructors or instances.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/typeofAnExportedType.errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
export class C {
    foo: string;
}
export var c: C;
var c2: C;

export var r3: typeof C;
export var r4: typeof c;
export var r4b: typeof c2;
```

---

TITLE: TypeScript Greeter Class and Functions
DESCRIPTION: Demonstrates a TypeScript Greeter class with a constructor and a greet method. Includes example functions `foo` and `foo2` to create and use Greeter instances, showcasing class instantiation and array manipulation.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapSample.sourcemap.txt#_snippet_19

LANGUAGE: TypeScript
CODE:

```
"use strict";

class Greeter {
    constructor(public greeting: string) {
    }

    greet() {
        return "<h1>" + this.greeting + "</h1>";
    }
}

function foo(greeting: string): Foo.Bar.Greeter {
    return new Greeter(greeting);
}

var greeter = new Greeter("Hello, world!");
var str = greeter.greet();

function foo2(greeting: string, ...restGreetings: string[]) {
    var greeters: Greeter[] = [];
    greeters[0] = new Greeter(greeting);
    for (var i = 0; i < restGreetings.length; i++) {
        greeters.push(new Greeter(restGreetings[i]));
    }

    return greeters;
}

var b = foo2("Hello", "World", "!");
for (var j = 0; j < b.length; j++) {
    b[j].greet();
}
```

---

TITLE: Get TypeScript Compiler Version
DESCRIPTION: Retrieves the version of the installed TypeScript compiler. This information is crucial for reporting issues.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Performance.md#_snippet_28

LANGUAGE: npm
CODE:

```
npx tsc -v
```

LANGUAGE: yarn
CODE:

```
yarn tsc -v
```

---

TITLE: Install hereby Command Line Tool
DESCRIPTION: Installs the 'hereby' command-line tool globally, which is used for building and testing changes within the TypeScript project.

SOURCE: https://github.com/microsoft/typescript/blob/main/CONTRIBUTING.md#_snippet_2

LANGUAGE: bash
CODE:

```
npm install -g hereby
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/maprootUrlSubfolderSpecifyOutputFile/node/maprootUrlSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/maprootUrlsourcerootUrlSubfolderSpecifyOutputFile/node/maprootUrlsourcerootUrlSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/sourcerootUrlSubfolderSpecifyOutputFile/node/sourcerootUrlSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: TypeScript Auto Imports Setup
DESCRIPTION: Illustrates the basic setup for auto-imports in a TypeScript file, showing an import statement for a component.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/autoImportAllowTsExtensions3.baseline.md#_snippet_0

LANGUAGE: typescript
CODE:

```
// === Auto Imports ===
// @Filename: /main.ts
import { Component } from "./Component.tsx";
/*|*/
```

---

TITLE: Remove Default TypeScript Props Import
DESCRIPTION: This snippet shows how to remove the default Microsoft.TypeScript.Default.props import from a project file. It is necessary when manually managing TypeScript integration.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Configuring-MSBuild-projects-to-use-NuGet.md#_snippet_0

LANGUAGE: XML
CODE:

```
<Import
         Project="$(MSBuildExtensionsPath32)\Microsoft\VisualStudio\v$(VisualStudioVersion)\TypeScript\Microsoft.TypeScript.Default.props"
         Condition="Exists('$(MSBuildExtensionsPath32)\Microsoft\VisualStudio\v$(VisualStudioVersion)\TypeScript\Microsoft.TypeScript.Default.props')" />
```

---

TITLE: Preact JSX Import Source Error Example
DESCRIPTION: Illustrates a Preact JSX import source setup that triggers a TypeScript error (TS2875). The error indicates that the required module path 'preact/jsx-runtime' could not be found, suggesting a missing dependency or type definition.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/jsxJsxsCjsTransformKeyPropCustomImportPragma(jsx=react-jsx).errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
/// <reference path="/.lib/react16.d.ts" />
/* @jsxImportSource preact */
const props = { answer: 42 }
const a = <div key="foo" {...props}>text</div>;
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
!!! error TS2875: This JSX tag requires the module path 'preact/jsx-runtime' to exist, but none could be found. Make sure you have types for the appropriate package installed.
const b = <div {...props} key="bar">text</div>;

export {};

```

---

TITLE: TypeScript Project Import Example
DESCRIPTION: An example of importing React and createStore from Redux within a TypeScript file.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/nodeModulesAtTypesPriority.errors.txt#_snippet_4

LANGUAGE: typescript
CODE:

```
import React from "react";
import { createStore } from "redux";
```

---

TITLE: Install and Use pprof-it Locally
DESCRIPTION: Instructions for installing pprof-it as a local dependency and using it with npm scripts to profile TypeScript builds. This method allows integration with existing build workflows.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Performance.md#_snippet_33

LANGUAGE: sh
CODE:

```
npm install --no-save pprof-it
```

LANGUAGE: sh
CODE:

```
npm --node-option="--require pprof-it" run <your-script-name>
```

---

TITLE: TypeScript File /a.ts Example
DESCRIPTION: This is a simple TypeScript file containing a class definition. It is presented as part of a project structure where compilation errors might occur.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/jsFileCompilationWithOutDeclarationFileNameSameAsInputJsFile.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
class c {
    }

```

---

TITLE: Remove Default TypeScript Targets Import
DESCRIPTION: This snippet demonstrates removing the default Microsoft.TypeScript.targets import from a project file. This step is crucial for custom TypeScript build configurations.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Configuring-MSBuild-projects-to-use-NuGet.md#_snippet_1

LANGUAGE: XML
CODE:

```
<Import
        Project="$(MSBuildExtensionsPath32)\Microsoft\VisualStudio\v$(VisualStudioVersion)\TypeScript\Microsoft.TypeScript.targets"
        Condition="Exists('$(MSBuildExtensionsPath32)\Microsoft\VisualStudio\v$(VisualStudioVersion)\TypeScript\Microsoft.TypeScript.targets')" />
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/sourceRootAbsolutePathSubfolderSpecifyOutputFile/node/sourceRootAbsolutePathSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: TypeScript typeof on Enums
DESCRIPTION: Explains how to use the 'typeof' operator with enums to get the type of the enum itself (which is an object at runtime) and its members.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/typeofAnExportedType.errors.txt#_snippet_4

LANGUAGE: typescript
CODE:

```
export enum E {
    A
}
export var r10: typeof E;
export var r11: typeof E.A;
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/mapRootAbsolutePathSubfolderSpecifyOutputFile/node/mapRootAbsolutePathSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: Export TypeScript Class A as Namespace
DESCRIPTION: Exports all members from './a' as a namespace 'a'. This setup is part of the chain leading to the 'import type' error.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/exportNamespace2.errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
export * as a from './a';
```

---

TITLE: Compile TypeScript String to JavaScript
DESCRIPTION: Demonstrates how to create a TypeScript Program and compile code using the Compiler API. It utilizes `createCompilerHost` for default file system interactions and `createTypeChecker` to retrieve diagnostics.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Using-the-Compiler-API-(TypeScript-1.4).md#_snippet_1

LANGUAGE: typescript
CODE:

```
/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/typescript/typescript.d.ts" />

import ts = require("typescript");

export function compile(filenames: string[], options: ts.CompilerOptions): void {
    var host = ts.createCompilerHost(options);
    var program = ts.createProgram(filenames, options, host);
    var checker = ts.createTypeChecker(program, /*produceDiagnostics*/ true);
    var result = checker.emitFiles();

    var allDiagnostics = program.getDiagnostics()
        .concat(checker.getDiagnostics())
        .concat(result.diagnostics);

    allDiagnostics.forEach(diagnostic => {
        var lineChar = diagnostic.file.getLineAndCharacterFromPosition(diagnostic.start);
        console.log(`${diagnostic.file.filename} (${lineChar.line},${lineChar.character}): ${diagnostic.messageText}`);
    });

    console.log(`Process exiting with code '${result.emitResultStatus}'.`);
    process.exit(result.emitResultStatus);
}

compile(process.argv.slice(2), { noEmitOnError: true, noImplicitAny: true,
                                 target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
```

---

TITLE: Inspecting and Removing Docker Containers
DESCRIPTION: This section details how to list running Docker containers using `docker ps` and how to forcefully remove a specific container using its ID with `docker rm -f`. It's a common pattern for managing stray processes.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Docker-Quickstart.md#_snippet_13

LANGUAGE: shell
CODE:

```
docker ps
docker rm -f <container-id>
```

---

TITLE: Import fromBar from bar
DESCRIPTION: Imports 'fromBar' from an external package named 'bar'. This example illustrates importing a named export from an installed package.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/autoImportAllowTsExtensions2.baseline.md#_snippet_2

LANGUAGE: ts
CODE:

```
import { fromBar } from "bar";

fromBar
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/outSubfolderSpecifyOutputFile/node/outSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: TypeScript Configuration File
DESCRIPTION: The tsconfig.json file specifies compiler options and files to include in a TypeScript project. This example includes a single file 'a.ts'.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/typingsLookup3.errors.txt#_snippet_0

LANGUAGE: json
CODE:

```
{ "files": "a.ts" }
```

---

TITLE: TypeScript Class Instantiation and Method Call
DESCRIPTION: Demonstrates the instantiation of a 'Greeter' class with a string argument and calling its 'greet' method. This snippet showcases basic object-oriented usage in TypeScript.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapSample.sourcemap.txt#_snippet_5

LANGUAGE: typescript
CODE:

```
class Greeter {
    greeting: string;
    constructor(message: string) {
        this.greeting = message;
    }
    greet() {
        return "Hello, " + this.greeting;
    }
}

var greeter = new Greeter("Hello, world!");
var str = greeter.greet();
```

---

TITLE: TypeScript Generator and Accessor Error Example
DESCRIPTION: This snippet demonstrates a TypeScript compilation error where a 'yield' expression is used within a 'get' accessor, which is not permitted. The TypeScript compiler flags this as an error because 'get' accessors are not generator functions and must return a value, not yield one. This highlights the strict rules for generator functions and class accessors in TypeScript.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/YieldExpression17_es6.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var v = { get foo() { yield foo; } }
```

---

TITLE: TypeScript Module Definition Example
DESCRIPTION: Illustrates a basic TypeScript module declaration using 'export ='. This pattern is used for exporting a single entity, such as a function, from a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/jsdocReferenceGlobalTypeInCommonJs.errors.txt#_snippet_2

LANGUAGE: typescript
CODE:

```
declare function f(): string;
export = f;
```

---

TITLE: TypeScript Greeter Class and Functions
DESCRIPTION: This snippet demonstrates a TypeScript class 'Greeter' with a constructor and a 'greet' method. It also includes utility functions 'foo' and 'foo2' for creating and managing Greeter instances. This code is intended to be compiled into JavaScript, with source maps generated to link back to the original TypeScript.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapSample.sourcemap.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
namespace Foo {
    export namespace Bar {
        export class Greeter {
            constructor(public greeting: string) {
            }

            greet() {
                return "<h1>" + this.greeting + "</h1>";
            }
        }

        function foo(greeting: string): Foo.Bar.Greeter {
            return new Greeter(greeting);
        }

        var greeter = new Greeter("Hello, world!");
        var str = greeter.greet();

        function foo2(greeting: string, ...restGreetings: string[]) {
            var greeters: Greeter[] = [];
            greeters[0] = new Greeter(greeting);
            for (var i = 0; i < restGreetings.length; i++) {
                greeters.push(new Greeter(restGreetings[i]));
            }

            return greeters;
        }

        var b = foo2("Hello", "World", "!");
        for (var j = 0; j < b.length; j++) {
            b[j].greet();
        }
    }
}
```

---

TITLE: TypeScript for loop with missing initialization
DESCRIPTION: Presents a 'for' loop in TypeScript where the initialization statement is omitted. The loop variable must be declared and initialized before the loop starts.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/for.errors.txt#_snippet_3

LANGUAGE: typescript
CODE:

```
for (; i < 10;) { // ok
    i++;
}
```

LANGUAGE: typescript
CODE:

```
for (; i > 1; i--) { // ok
}
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/sourceRootRelativePathSubfolderSpecifyOutputFile/node/sourceRootRelativePathSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: TypeScript Greeter Class and Usage
DESCRIPTION: Defines a Greeter class with a constructor and a greet method. It also shows how to instantiate the class, call its method, and includes a helper function within a namespace. The code demonstrates basic TypeScript syntax for classes, methods, functions, and variables.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapSample.sourcemap.txt#_snippet_16

LANGUAGE: typescript
CODE:

```
"use strict";

class Greeter {
    constructor(public greeting: string) {
    }

    greet() {
        return "<h1>" + this.greeting + "</h1>";
    }
}

function foo(greeting: string): Foo.Bar.Greeter {
    return new Greeter(greeting);
}

var greeter = new Greeter("Hello, world!");
var str = greeter.greet();

function foo2(greeting: string, ...restGreetings: string[]) {
    var greeters: Greeter[] = [];
    greeters[0] = new Greeter(greeting);
    for (var i = 0; i < restGreetings.length; i++) {
    }
}
```

---

TITLE: TypeScript Getter Returning String
DESCRIPTION: A valid TypeScript `get` accessor example that successfully returns a string value. This demonstrates a standard use case for getters.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/functionsMissingReturnStatementsAndExpressions.errors.txt#_snippet_12

LANGUAGE: typescript
CODE:

```
class C {
    public get m3() {
        return "Okay, because this is a return expression.";
    }
}
```

---

TITLE: TypeScript: Accessing Bun File API
DESCRIPTION: This TypeScript code snippet demonstrates accessing the `Bun.file()` API to create a file object. It requires type definitions for Bun to resolve the 'Bun' global object. The provided example shows the usage that triggers a TypeScript compilation error if types are not installed.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/typingsSuggestionBun2.errors.txt#_snippet_1

LANGUAGE: typescript
CODE:

```
const file = Bun.file("/a.ts");

```

---

TITLE: TypeScript Test Compilation Context Setup
DESCRIPTION: Defines functions for pre-compilation and post-compilation steps, along with a context object to manage these operations. This setup is typically used within a testing harness for managing compilation units.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/parserharness.errors.txt#_snippet_52

LANGUAGE: typescript
CODE:

```
var addedFiles = [];
var precompile = () => {
    // REVIEW: if any dependency has a triple slash reference then does postCompile potentially have to do a recreate since we can't update references with updateUnit?
    // easy enough to do if so, prefer to avoid the recreate cost until it proves to be an issue
    dependencies.forEach(dep => {
        addUnit(dep.content, dep.name, false, Harness.Compiler.isDeclareFile(dep.name));
        addedFiles.push(dep.name);
    });
};
var postcompile = () => {
    addedFiles.forEach(file => {
        updateUnit('', file);
    });
};
var context = {
    filename: filename,
    preCompile: precompile,
    postCompile: postcompile
};
return context;
```

---

TITLE: TypeScript Module Example (m1.ts)
DESCRIPTION: Demonstrates basic TypeScript syntax including variable declaration, class definition, instance creation, and function definition within a module.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/project/mapRootRelativePathSubfolderSpecifyOutputFile/node/mapRootRelativePathSubfolderSpecifyOutputFile.errors.txt#_snippet_0

LANGUAGE: typescript
CODE:

```
var m1_a1 = 10;
class m1_c1 {
    public m1_c1_p1: number;
}

var m1_instance1 = new m1_c1();
function m1_f1() {
    return m1_instance1;
}
```

---

TITLE: TypeScript Module Import Example
DESCRIPTION: Demonstrates importing JavaScript and TypeScript modules in a TypeScript file. It shows how to import default exports from different file types using relative paths.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/extensionLoadingPriority(moduleresolution=node16).errors.txt#_snippet_3

LANGUAGE: typescript
CODE:

```
import a from "./a.js";
import dir from "./dir";
```

---

TITLE: Generic Function with `get${T}` Mapped Type in TypeScript
DESCRIPTION: This example highlights a TypeScript error (TS2322) in a generic function where a mapped type with a template literal key (`get${RemappedT}`) is used to access a property. The error indicates that the retrieved value type is not assignable to the generic type parameter `T` due to potential type mismatches.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/mappedTypeConstraints2.errors.txt#_snippet_3

LANGUAGE: typescript
CODE:

```
type Foo<T extends string> = {
    [RemappedT in T as `get${RemappedT}`]: RemappedT;
};

const get = <T extends string>(t: T, foo: Foo<T>): T => foo[`get${t}`];  // Type 'Foo<T>[`get${T}`]' is not assignable to type 'T'

// Error details:
// mappedTypeConstraints2.ts(82,57): error TS2322: Type 'Foo<T>[`get${T}`]' is not assignable to type 'T'.
//   'T' could be instantiated with an arbitrary type which could be unrelated to 'Foo<T>[`get${T}`]'.
```

---

TITLE: Declare Variable in TypeScript
DESCRIPTION: This snippet shows the original TypeScript code for declaring a variable 'x' and assigning it the value '1'. It is the source code that gets compiled.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/isolatedModulesSourceMap.sourcemap.txt#_snippet_0

LANGUAGE: TypeScript
CODE:

```
export var x = 1;
```

---

TITLE: Install Latest TypeScript Version
DESCRIPTION: Command to install the latest nightly build of TypeScript, useful for testing if a bug has already been fixed.

SOURCE: https://github.com/microsoft/typescript/blob/main/CONTRIBUTING.md#_snippet_1

LANGUAGE: bash
CODE:

```
npm install typescript@next
```

---

TITLE: Sample Project package.json
DESCRIPTION: Defines the dependencies for a sample project used to test a local TypeScript plugin. It includes a 'file:' dependency to link the plugin directly from its source directory.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Writing-a-Language-Service-Plugin.md#_snippet_9

LANGUAGE: json
CODE:

```
{
    "name": "sample_project",
    "dependencies": {
        "your_plugin": "file:..",
        "typescript": "^4.4.3"
    }
}
```

---

TITLE: Basic TypeScript Hello World
DESCRIPTION: A fundamental TypeScript code snippet demonstrating a variable declaration and assignment. This example is often used for initial setup and testing of a TypeScript environment.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/declFileEmitDeclarationOnlyError2.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
var hello = "yo!";
console.log(hello);
```

---

TITLE: TypeScript Plugin: Full Example
DESCRIPTION: A comprehensive example of a TypeScript plugin that integrates configuration from tsconfig.json to filter completion entries and includes diagnostic logging. It sets up a proxy for the Language Service and modifies completion results.

SOURCE: https://github.com/microsoft/typescript/blob/main/__wiki__/Writing-a-Language-Service-Plugin.md#_snippet_8

LANGUAGE: ts
CODE:

```
function init(modules: { typescript: typeof import("typescript/lib/tsserverlibrary") }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    // Get a list of things to remove from the completion list from the config object.
    // If nothing was specified, we'll just remove 'caller'
    const whatToRemove: string[] = info.config.remove || ["caller"];

    // Diagnostic logging
    info.project.projectService.logger.info(
      "I'm getting set up now! Check the log for this message."
    );

    // Set up decorator object
    const proxy: ts.LanguageService = Object.create(null);
    for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
      const x = info.languageService[k]!;
      // @ts-expect-error - JS runtime trickery which is tricky to type tersely
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
    }

    // Remove specified entries from completion list
    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);
      if (!prior) return

      const oldLength = prior.entries.length;
      prior.entries = prior.entries.filter(e => whatToRemove.indexOf(e.name) < 0);

      // Sample logging for diagnostic purposes
      if (oldLength !== prior.entries.length) {
        const entriesRemoved = oldLength - prior.entries.length;
        info.project.projectService.logger.info(
          `Removed ${entriesRemoved} entries from the completion list`
        );
      }

      return prior;
    };

    return proxy;
  }

  return { create };
}

export = init;
```

---

TITLE: Basic TypeScript Hello World
DESCRIPTION: A fundamental TypeScript code snippet demonstrating a variable declaration and assignment. This example is often used for initial setup and testing of a TypeScript environment.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/declFileEmitDeclarationOnlyError1.errors.txt#_snippet_1

LANGUAGE: TypeScript
CODE:

```
var hello = "yo!";
console.log(hello);
```

---

TITLE: TypeScript Traditional for Loop
DESCRIPTION: Illustrates a traditional for loop iterating over a predefined array. This example shows the setup for iterating through a fixed list of items using an index.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/sourceMapValidationDestructuringForOfArrayBindingPatternDefaultValues.sourcemap.txt#_snippet_10

LANGUAGE: TypeScript
CODE:

```
for (var _g = 0, _h = [robotA, robotB]; _g < _h.length; _g++) {
    // Loop body would go here
}
```

---

TITLE: Intl.Locale Constructor and Methods
DESCRIPTION: Demonstrates the Intl.Locale constructor for creating locale objects and accessing their properties. Includes examples of creating a Locale object and using resolvedOptions.

SOURCE: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/es2020IntlAPIs.errors.txt#_snippet_4

LANGUAGE: APIDOC
CODE:

```
new Intl.Locale(tag?: string, options?: LocaleOptions)
  Creates a new Locale object.
  Parameters:
    tag: A string representing a BCP 47 language tag.
    options: An object with properties to customize the locale.

  resolvedOptions(): ResolvedLocaleOptions
    Returns an object with the canonicalized locale properties.

Example Usage:
// Creating a Locale object
const locale = new Intl.Locale('en-US');
console.log(locale.language); // "en"
console.log(locale.region);   // "US"

// Using resolvedOptions
const localesArg = ["es-ES", new Intl.Locale("en-US")];
console.log((new Intl.DisplayNames(localesArg, {type: 'language'})).resolvedOptions().locale); // "es-ES"
```
