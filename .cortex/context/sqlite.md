========================
CODE SNIPPETS
========================

TITLE: Setup for Windows
DESCRIPTION: Prerequisites for setting up SQLite testing on Windows, including installing Fossil, Unix-like command-line tools, and Visual Studio.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/tcl-extension-testing.md#_snippet_4>

LANGUAGE: markdown
CODE:

```
1. [Fossil][] installed.
2. Unix-like command-line tools installed. Example: [unxutils](https://unxutils.sourceforge.net/)
3. [Visual Studio](https://visualstudio.microsoft.com/vs/community/) installed. VS2015 or later required.
4. Check out source code and set environment variables.
   a. **TCLSOURCE** &rarr; The top-level directory of a Fossil check-out of the TCL source tree.
   b. **SQLITESOURCE** &rarr; A Fossil check-out of the SQLite source tree.
   c. **TCLBUILD** &rarr; A directory that does not exist at the start of the test and which will be deleted at the end of the test, and that will contain the test builds of the TCL libraries and the SQLite TCL Extensions.
   d. **ORIGINALPATH** &rarr; The original value of %PATH%. In other words, set as follows: `set ORIGINALPATH %PATH%`
```

---

TITLE: Installing Updated Autosetup in SQLite
DESCRIPTION: Commands to install the updated Autosetup framework in the SQLite repository, followed by checking which files were modified.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#2025-04-22_snippet_2>

LANGUAGE: Bash
CODE:

```
/path/to/autosetup-checkout/autosetup --install .
fossil status # show the modified files
```

---

TITLE: Starting a Local Web Server with althttpd
DESCRIPTION: A simple command to start the althttpd web server, enabling necessary features for the demo applications, including OPFS support.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/README-dist.txt#_snippet_1>

LANGUAGE: bash
CODE:

```
althttpd --enable-sab --page index.html
```

---

TITLE: Emscripten SDK Setup (Linux)
DESCRIPTION: Commands to clone the Emscripten repository, install the latest SDK tools, and activate it for the current user on a Linux environment.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
# Clone the emscripten repository:
$ sudo apt install git
$ git clone https://github.com/emscripten-core/emsdk.git
$ cd emsdk

# Download and install the latest SDK tools:
$ ./emsdk install latest

# Make the "latest" SDK "active" for the current user:
$ ./emsdk activate latest
```

---

TITLE: Installing Emscripten SDK in Linux
DESCRIPTION: Commands for installing the Emscripten SDK on a Linux system. This process involves cloning the repository, installing and activating the latest SDK tools for the current user.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/README.md#2025-04-22_snippet_0>

LANGUAGE: bash
CODE:

```
# Clone the emscripten repository:
$ sudo apt install git
$ git clone https://github.com/emscripten-core/emsdk.git
$ cd emsdk

# Download and install the latest SDK tools:
$ ./emsdk install latest

# Make the "latest" SDK "active" for the current user:
$ ./emsdk activate latest
```

---

TITLE: Updating Autosetup Command
DESCRIPTION: Command sequence for updating the Autosetup framework from a git repository checkout, showing how to install a fresh copy into the SQLite codebase.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#2025-04-22_snippet_1>

LANGUAGE: Bash
CODE:

```
$ git clone https://github.com/msteveb/autosetup
$ cd autosetup
# Or, if it's already checked out:
$ git pull
```

---

TITLE: Configure and Install Tcl on Unix-like Systems
DESCRIPTION: This snippet details the process of configuring, building, and installing a Tcl library on Unix-like systems. It emphasizes disabling shared libraries for simpler runtime environment setup and specifies the installation prefix. This is a prerequisite for testing the SQLite TCL extension.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/tcl-extension-testing.md#_snippet_0>

LANGUAGE: bash
CODE:

```
cd $TCLSOURCE
fossil up core-8-6-branch
fossil clean -x
cd unix
./configure --prefix=$TCLHOME --disable-shared
make install
```

---

TITLE: Build and Install SQLite Tcl Extension (Unix)
DESCRIPTION: Builds and installs the SQLite Tcl extension after configuration. The 'make test' command runs test cases to verify the build.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autoconf/tea/README.txt#_snippet_1>

LANGUAGE: makefile
CODE:

```
make test
make install
```

---

TITLE: Configuring SQLite for Release Builds
DESCRIPTION: Example of configuring SQLite for a release build with all features enabled.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/README.md#2025-04-22_snippet_4>

LANGUAGE: shell
CODE:

```
../sqlite/configure --enable-all
```

---

TITLE: Makefile Feature Flag Export Example
DESCRIPTION: Demonstrates how feature flags are exported from a configure script into Makefile.in, translating the X_Y format to the X.y convention for makefile consumption.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#_snippet_8>

LANGUAGE: Makefile
CODE:

```
LDFLAGS.shobj = @SHOBJ_LDFLAGS@
LDFLAGS.zlib = @LDFLAGS_ZLIB@
LDFLAGS.math = @LDFLAGS_MATH@
```

---

TITLE: Example: Parsing a File with Lemon
DESCRIPTION: Demonstrates a typical workflow for using a Lemon-generated parser to parse a file, including tokenization, parsing, and cleanup.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/lemon.html#_snippet_4>

LANGUAGE: c
CODE:

```
ParseTree *ParseFile(const char *zFilename) {
    Tokenizer *pTokenizer;
    void *pParser;
    Token sToken;
    int hTokenId;
    ParserState sState;

    pTokenizer = TokenizerCreate(zFilename);
    pParser = ParseAlloc(malloc);
    InitParserState(&sState);

    while (GetNextToken(pTokenizer, &hTokenId, &sToken)) {
        Parse(pParser, hTokenId, sToken, &sState);
    }
    Parse(pParser, 0, sToken, &sState); // Indicate end of input

    ParseFree(pParser, free);
    TokenizerFree(pTokenizer);
    return sState.treeRoot;
}
```

---

TITLE: Example Struct Binding Usage
DESCRIPTION: Demonstrates the practical application of the `StructBinder` macros to define and describe a C structure named `ExampleStruct`. It shows how to use `StructBinder` to start the JSON object for the struct and `M` to list its members with their respective details, followed by `_StructBinder` to close the object.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/jaccwabyt/jaccwabyt.md#_snippet_19>

LANGUAGE: c
CODE:

```
#define CurrentStruct ExampleStruct
    StructBinder {
      M(v4,"i");
      M(ppV,"p");
      M(v8,"j");
      M(xFunc,"v(p)");
    } _StructBinder;
#undef CurrentStruct
```

---

TITLE: Installing Autosetup in SQLite Checkout
DESCRIPTION: Shows the command to install the autosetup script within an SQLite project directory after updating or cloning.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#_snippet_13>

LANGUAGE: bash
CODE:

```
/path/to/autosetup-checkout/autosetup --install .
fossil status # show the modified files
```

---

TITLE: Complete Example of Using Inline Hex Database in SQLite CLI
DESCRIPTION: Shows a comprehensive example of embedding a hex database dump directly in a script. The example creates a small database with a table and runs queries against it. This allows creating test databases with specific content or deliberate corruptions.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/tool/dbtotxt.md#2025-04-22_snippet_1>

LANGUAGE: sql
CODE:

```
.open --hexdb
| size 8192 pagesize 4096 filename x9.db
| page 1 offset 0
|      0: 53 51 4c 69 74 65 20 66 6f 72 6d 61 74 20 33 00   SQLite format 3.
|     16: 10 00 01 01 00 40 20 20 00 00 00 04 00 00 00 02   .....@  ........
|     32: 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 04   ................
|     48: 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 00   ................
|     80: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 04   ................
|     96: 00 2e 30 38 0d 00 00 00 01 0f c0 00 0f c0 00 00   ..08............
|   4032: 3e 01 06 17 11 11 01 69 74 61 62 6c 65 74 31 74   >......itablet1t
|   4048: 31 02 43 52 45 41 54 45 20 54 41 42 4c 45 20 74   1.CREATE TABLE t
|   4064: 31 28 78 2c 79 20 44 45 46 41 55 4c 54 20 78 27   1(x,y DEFAULT x'
|   4080: 66 66 27 2c 7a 20 44 45 46 41 55 4c 54 20 30 29   ff',z DEFAULT 0)
| page 2 offset 4096
|      0: 0d 08 14 00 04 00 10 00 0e 05 0a 0f 04 15 00 10   ................
|     16: 88 02 03 05 90 04 0e 08 00 00 00 00 00 00 00 00   ................
|   1040: 00 00 00 00 ff 87 7c 02 05 8f 78 0e 08 00 00 00   ......|...x.....
|   2064: 00 00 00 ff 0c 0a 01 fb 00 00 00 00 00 00 00 00   ................
|   2560: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 83   ................
|   2576: 78 01 05 87 70 0e 08 00 00 00 00 00 00 00 00 00   x...p...........
|   3072: 00 00 00 00 00 00 00 00 00 ff 00 00 01 fb 00 00   ................
|   3584: 00 00 00 00 00 83 78 00 05 87 70 0e 08 00 00 00   ......x...p.....
|   4080: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff   ................
| end x9.db
SELECT rowid FROM t1;
PRAGMA integrity_check;
```

---

TITLE: Make Commands for Testing
DESCRIPTION: Examples of 'make' commands used to run different configurations of SQLite tests, including development, release, and specialized test runs.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/testrunner.md#_snippet_3>

LANGUAGE: makefile
CODE:

```
make devtest
make releasetest
make sdevtest
make testrunner
```

---

TITLE: Hello World Example
DESCRIPTION: Demonstrates basic SQLite database operations in Java using the JNI binding. It shows how to open an in-memory database, check for errors, and properly close the database connection.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/jni/README.md#_snippet_0>

LANGUAGE: java
CODE:

```
import org.sqlite.jni.*;
import static org.sqlite.jni.CApi.*;

...

final sqlite3 db = sqlite3_open(":memory:");
try {
  final int rc = sqlite3_errcode(db);
  if( 0 != rc ){
    if( null != db ){
      System.out.print("Error opening db: "+sqlite3_errmsg(db));
    }else{
      System.out.print("Error opening db: rc="+rc);
    }
    ... handle error ...
  }
  // ... else use the db ...
}finally{
  // ALWAYS close databases using sqlite3_close() or sqlite3_close_v2()
  // when done with them. All of their active statement handles must
  // first have been passed to sqlite3_finalize().
  sqlite3_close_v2(db);
}
```

---

TITLE: Converting Autosetup Variables in Makefile.in
DESCRIPTION: Example showing how autosetup-exported variables are converted from @X_Y@ format to X.y format in the Makefile for better readability and organization of build flags.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#2025-04-22_snippet_0>

LANGUAGE: Makefile
CODE:

```
LDFLAGS.shobj = @SHOBJ_LDFLAGS@
LDFLAGS.zlib = @LDFLAGS_ZLIB@
LDFLAGS.math = @LDFLAGS_MATH@
```

---

TITLE: SQLite3 Fiddle Initialization and Commands
DESCRIPTION: Describes the initialization process and provides examples of SQLite3 shell commands and SQL execution within the Fiddle. It includes settings for null values and headers, and instructions for executing commands.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/fiddle/index.html#_snippet_2>

LANGUAGE: APIDOC
CODE:

```
SQLite3 Fiddle Initialization:

  - Displays "Initializing app..." during startup.
  - Notes that slow connections may take time.
  - Suggests checking the JavaScript console for initialization errors.
  - Includes a placeholder for a terminal-like view.

SQLite3 Shell Commands and SQL Execution:

  - Execution Trigger: Use Ctrl-Enter or Shift-Enter to execute.
  - Selection Execution: If text is selected, only the selected part is executed.

Configuration Commands:

  .nullvalue <string>
    - Sets the string to display for NULL values.
    - Example: .nullvalue NULL

  .headers <on|off>
    - Toggles the display of SQL query result headers.
    - Example: .headers on

UI Controls:

  Run Clear Input
    - Clears the input area.

  Clear Output
    - Clears the output area.

  Interrupt
    - Stops a running query or command.

About Section:

  About SQLite Fiddle close
    - Displays information about the SQLite Fiddle and a close button.
```

---

TITLE: Creating Speed Test Directory
DESCRIPTION: Creates a directory named 'speed' in the parent directory to store performance measurement output files

SOURCE: <https://github.com/sqlite/sqlite/blob/master/test/speedtest.md#2025-04-22_snippet_0>

LANGUAGE: bash
CODE:

```
mkdir -p ../speed
```

---

TITLE: Install TCL Development Libraries
DESCRIPTION: Instructions for installing TCL development libraries on Windows, including downloading the source, compiling with nmake, and setting up the environment.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#_snippet_0>

LANGUAGE: makefile
CODE:

```
nmake /f makefile.vc INSTALLDIR=c:\Tcl release
nmake /f makefile.vc INSTALLDIR=c:\Tcl install
```

---

TITLE: Compiling SQLite with Additional Options
DESCRIPTION: Examples of how to add compile-time options to the SQLite build process, such as omitting deprecated features.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/README.md#2025-04-22_snippet_5>

LANGUAGE: shell
CODE:

```
./configure --enable-all
make OPTIONS=-DSQLITE_OMIT_DEPRECATED sqlite3
```

---

TITLE: SQLite3 JNI Hello World Example
DESCRIPTION: Demonstrates basic database operations using SQLite3 JNI bindings including opening an in-memory database, error handling, and proper resource cleanup. Shows the importance of explicitly closing database connections.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/jni/README.md#2025-04-22_snippet_0>

LANGUAGE: java
CODE:

```
import org.sqlite.jni.*;
import static org.sqlite.jni.CApi.*;

...

final sqlite3 db = sqlite3_open(":memory:");
try {
  final int rc = sqlite3_errcode(db);
  if( 0 != rc ){
    if( null != db ){
      System.out.print("Error opening db: "+sqlite3_errmsg(db));
    }else{
      System.out.print("Error opening db: rc="+rc);
    }
    ... handle error ...
  }
  // ... else use the db ...
}finally{
  // ALWAYS close databases using sqlite3_close() or sqlite3_close_v2()
  // when done with them. All of their active statement handles must
  // first have been passed to sqlite3_finalize().
  sqlite3_close_v2(db);
}
```

---

TITLE: Compiling SQLite on Windows with Additional Options
DESCRIPTION: Example of how to add compile-time options when building SQLite on Windows, such as omitting deprecated features.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/README.md#2025-04-22_snippet_8>

LANGUAGE: shell
CODE:

```
nmake /f Makefile.msc OPTIONS=-DSQLITE_OMIT_DEPRECATED sqlite3.exe
```

---

TITLE: Build SQLite Targets with nmake
DESCRIPTION: Examples of using nmake with Makefile.msc to build various SQLite targets on Windows. Some targets require a TCL installation.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#_snippet_1>

LANGUAGE: makefile
CODE:

```
nmake /f makefile.msc
nmake /f makefile.msc sqlite3.c
nmake /f makefile.msc sqlite3.exe
nmake /f makefile.msc sqldiff.exe
nmake /f makefile.msc sqlite3_rsync.exe
nmake /f makefile.msc tclextension-install
nmake /f makefile.msc devtest
nmake /f makefile.msc releasetest
nmake /f makefile.msc sqlite3_analyzer.exe
```

---

TITLE: SQLite Tcl Extension Build (General Unix)
DESCRIPTION: A general example of building the SQLite Tcl extension on Unix systems, including changing directory, configuring, and running tests.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autoconf/tea/README.txt#_snippet_4>

LANGUAGE: shell
CODE:

```
cd sqlite-*-tea
./configure --with-tcl=/path/to/tcl/install/root
make test
make install
```

---

TITLE: Configure and Install SQLite TCL Extension
DESCRIPTION: This snippet demonstrates how to configure the SQLite build to include the Tcl extension, specifying the Tcl installation directory. It then proceeds to install the extension and lists commands to verify its successful installation and correct version.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/tcl-extension-testing.md#_snippet_1>

LANGUAGE: bash
CODE:

```
cd $SQLITESOURCE
fossil clean -x
./configure --with-tcl=$TCLHOME --all
make tclextension-install
make tclextension-list
make tclextension-verify
```

---

TITLE: Compiling SQLite on Unix-like Systems
DESCRIPTION: Step-by-step commands to compile SQLite on Unix-like systems, including installing dependencies, unpacking source code, configuring the build environment, and building various targets.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/README.md#2025-04-22_snippet_2>

LANGUAGE: shell
CODE:

```
apt install gcc make tcl-dev  ;#  Make sure you have all the necessary build tools
tar xzf sqlite.tar.gz         ;#  Unpack the source tree into "sqlite"
mkdir bld                     ;#  Build will occur in a sibling directory
cd bld                        ;#  Change to the build directory
../sqlite/configure           ;#  Run the configure script
make sqlite3                  ;#  Builds the "sqlite3" command-line tool
make sqlite3.c                ;#  Build the "amalgamation" source file
make sqldiff                  ;#  Builds the "sqldiff" command-line tool
# Makefile targets below this point require tcl-dev
make tclextension-install     ;#  Build and install the SQLite TCL extension
make devtest                  ;#  Run development tests
make releasetest              ;#  Run full release tests
make sqlite3_analyzer         ;#  Builds the "sqlite3_analyzer" tool
```

---

TITLE: Installing Compiled TCL using nmake on Windows
DESCRIPTION: This command installs the previously compiled TCL build into the directory specified by `INSTALLDIR`. It uses the Visual C++ makefile (`makefile.vc`) and the `nmake` tool. This step must be run after the `nmake release` command, and the `INSTALLDIR` path must match the one used during compilation.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_1>

LANGUAGE: cmd
CODE:

```
nmake /f makefile.vc INSTALLDIR=c:\Tcl install
```

---

TITLE: Updating Emscripten SDK
DESCRIPTION: Commands for updating an existing Emscripten SDK installation to the latest version. This involves pulling changes, installing and activating the latest SDK.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/README.md#2025-04-22_snippet_1>

LANGUAGE: bash
CODE:

```
git pull
./emsdk install latest
./emsdk activate latest
```

---

TITLE: Configuring TCL Installation in Unix Environment
DESCRIPTION: Commands for configuring and installing TCL (Tool Command Language) in a user-specific directory. This is an optional step for certain SQLite build targets.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-unix.md#2025-04-22_snippet_0>

LANGUAGE: bash
CODE:

```
mkdir $HOME/local
```

LANGUAGE: bash
CODE:

```
./configure --prefix=$HOME/local
```

LANGUAGE: bash
CODE:

```
make install
```

---

TITLE: Building and Installing SQLite TCL Extension using nmake
DESCRIPTION: Builds and installs the SQLite TCL extension using `nmake` and `Makefile.msc`. This target requires a functional TCL installation (version 9.0 assumed, potentially specified via `TCLDIR=<dir>`). This allows SQLite databases to be manipulated from TCL scripts.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_7>

LANGUAGE: cmd
CODE:

```
nmake /f makefile.msc tclextension-install
```

---

TITLE: Comparing Performance Against Baseline
DESCRIPTION: Runs performance test on current SQLite version and compares results against the baseline using fossil xdiff

SOURCE: <https://github.com/sqlite/sqlite/blob/master/test/speedtest.md#2025-04-22_snippet_3>

LANGUAGE: tcl
CODE:

```
test/speedtest.tcl sqlite3.c ../speed/test.txt ../speed/baseline.txt
```

---

TITLE: dbtotxt Hex Dump Format Example
DESCRIPTION: An example illustrating the hex dump output format produced by the dbtotxt utility. This format includes page and offset information, followed by hexadecimal byte values and their ASCII representations.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/tool/dbtotxt.md#_snippet_1>

LANGUAGE: APIDOC
CODE:

```
| size 8192 pagesize 4096 filename x9.db
| page 1 offset 0
|      0: 53 51 4c 69 74 65 20 66 6f 72 6d 61 74 20 33 00   SQLite format 3.
|     16: 10 00 01 01 00 40 20 20 00 00 00 04 00 00 00 02   .....@  ........
|     32: 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 04   ................
|     48: 00 00 00 00 00 00 00 00 00 00 00 01 00 00 00 00   ................
|     80: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 04   ................
|     96: 00 2e 30 38 0d 00 00 00 01 0f c0 00 0f c0 00 00   ..08............
|   4032: 3e 01 06 17 11 11 01 69 74 61 62 6c 65 74 31 74   >......itablet1t
|   4048: 31 02 43 52 45 41 54 45 20 54 41 42 4c 45 20 74   1.CREATE TABLE t
|   4064: 31 28 78 2c 79 20 44 45 46 41 55 4c 54 20 78 27   1(x,y DEFAULT x'
|   4080: 66 66 27 2c 7a 20 44 45 46 41 55 4c 54 20 30 29   ff',z DEFAULT 0)
| page 2 offset 4096
|      0: 0d 08 14 00 04 00 10 00 0e 05 0a 0f 04 15 00 10   ................
|     16: 88 02 03 05 90 04 0e 08 00 00 00 00 00 00 00 00   ................
|   1040: 00 00 00 00 ff 87 7c 02 05 8f 78 0e 08 00 00 00   ......|...x.....
|   2064: 00 00 00 ff 0c 0a 01 fb 00 00 00 00 00 00 00 00   ................
|   2560: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 83   ................
|   2576: 78 01 05 87 70 0e 08 00 00 00 00 00 00 00 00 00   x...p...........
|   3072: 00 00 00 00 00 00 00 00 00 ff 00 00 01 fb 00 00   ................
|   3584: 00 00 00 00 00 83 78 00 05 87 70 0e 08 00 00 00   ......x...p.....
|   4080: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ff   ................
| end x9.db
```

---

TITLE: Specifying the Start Symbol
DESCRIPTION: The %start_symbol directive allows explicit designation of the grammar's start symbol, overriding the default behavior of using the first non-terminal encountered in the grammar file.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/lemon.html#_snippet_33>

LANGUAGE: APIDOC
CODE:

```
%start_symbol prog
```

---

TITLE: Lemon Grammar Rule Example
DESCRIPTION: Demonstrates a basic grammar rule structure in Lemon, showing a nonterminal on the left and a sequence of terminals and nonterminals on the right, terminated by a period.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/lemon.html#_snippet_9>

LANGUAGE: APIDOC
CODE:

```
expr ::= expr PLUS expr.
expr ::= expr TIMES expr.
expr ::= LPAREN expr RPAREN.
expr ::= VALUE.
```

---

TITLE: Building SQLite Amalgamation
DESCRIPTION: Compiles the current SQLite source into an amalgamation file

SOURCE: <https://github.com/sqlite/sqlite/blob/master/test/speedtest.md#2025-04-22_snippet_2>

LANGUAGE: bash
CODE:

```
make sqlite3.c
```

---

TITLE: Install TCL Development Libraries (Optional)
DESCRIPTION: Steps to install TCL development libraries in a private directory. This is optional and not required for building basic SQLite components like sqlite3.c or the sqlite3 command-line tool.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-unix.md#_snippet_0>

LANGUAGE: bash
CODE:

```
mkdir $HOME/local
./configure --prefix=$HOME/local
make install
```

---

TITLE: Compiling TCL Release Build using nmake on Windows
DESCRIPTION: This command compiles the TCL source code for a release build using the Visual C++ makefile (`makefile.vc`). It requires the `nmake` tool (usually available in a Visual Studio Developer Command Prompt) and the TCL source code. The `INSTALLDIR` parameter specifies the target directory for the installation phase (e.g., `c:\Tcl`).

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_0>

LANGUAGE: cmd
CODE:

```
nmake /f makefile.vc INSTALLDIR=c:\Tcl release
```

---

TITLE: SQLite WASM Initialization and OPFS Setup
DESCRIPTION: Initializes the WASM SQLite module and sets up the persistent file system (OPFS) if available. It returns the mount point of the OPFS directory or an empty string if not configured.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/speedtest1.html#_snippet_0>

LANGUAGE: javascript
CODE:

```
const wasmfsDir = function f(wasmUtil){
  if(undefined !== f._) return f._;
  const pdir = '/persistent';
  if( !self.FileSystemHandle || !self.FileSystemDirectoryHandle || !self.FileSystemFileHandle){
    return f._ = "";
  }
  try{
    if(0===wasmUtil.xCallWrapped( 'sqlite3_wasm_init_wasmfs', 'i32', ['string'], pdir )){
      return f._ = pdir;
    }else{
      return f._ = "";
    }
  }catch(e){
    // sqlite3_wasm_init_wasmfs() is not available
    return f._ = "";
  }
};
wasmfsDir._ = undefined;
```

---

TITLE: Autosetup API Reference
DESCRIPTION: Provides an overview of the Autosetup API, directing users to view documentation within the 'autosetup' directory files or via the './configure --reference' command. It also lists key configuration files.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#_snippet_0>

LANGUAGE: bash
CODE:

```
./configure --reference | less
```

LANGUAGE: apidoc
CODE:

```
proj.tcl: project-agnostic utility code for autosetup-driven projects.
sqlite-config.tcl: utility code specific to the SQLite project.
auto.def: the primary driver for the ./configure process.
autoconf/auto.def: the main driver script for the "autoconf" bundle's configure script.
```

---

TITLE: Direct-Only Examples in SQLite
DESCRIPTION: Lists examples of functions and virtual tables classified as Direct-Only due to potential side-effects outside the database file or information exfiltration capabilities. These include fts3_tokenizer, writefile, readfile, zipvfs, and csv.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/trusted-schema.md#_snippet_1>

LANGUAGE: sqlite
CODE:

```
-- Examples of Direct-Only functions/vtabs:
-- fts3_tokenizer()
-- writefile()
-- readfile()
-- zipvfs virtual table
-- csv virtual table
```

---

TITLE: Lemon Symbol Value Linking Error Example
DESCRIPTION: Shows an example in Lemon where an error is generated because a symbol ('C') is used in the grammar rule but not referenced in the associated C action, highlighting Lemon's strictness in symbol usage.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/lemon.html#_snippet_12>

LANGUAGE: APIDOC
CODE:

```
expr(A) ::= expr(B) PLUS expr(C).  { A = B; }
```

---

TITLE: Cloning and Updating Autosetup
DESCRIPTION: Demonstrates how to clone the autosetup repository from GitHub and how to update an existing checkout.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#_snippet_12>

LANGUAGE: bash
CODE:

```
$ git clone https://github.com/msteveb/autosetup
$ cd autosetup
# Or, if it's already checked out:
$ git pull
```

---

TITLE: SQLite Custom Collation Implementation Example (Java)
DESCRIPTION: Example of implementing a custom collation in Java using the improved API. It demonstrates overriding the `call` method for comparison and optionally the `xDestroy` method, along with managing local state.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/jni/README.md#_snippet_9>

LANGUAGE: java
CODE:

```
int rc = sqlite3_create_collation(db, "mycollation", SQLITE_UTF8, new SomeCallbackType(){

  // Required comparison function:
  @Override public int call(byte[] lhs, byte[] rhs){ ... }

  // Optional finalizer function:
  @Override public void xDestroy(){ ... }

  // Optional local state:
  private String localState1 =
    "This is local state. There are many like it, but this one is mine.";
  private MyStateType localState2 = new MyStateType();
  ...
});
```

---

TITLE: Updating Emscripten SDK
DESCRIPTION: Steps to update an existing Emscripten SDK installation to the latest version and reactivate it.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/README.md#_snippet_1>

LANGUAGE: bash
CODE:

```
git pull
./emsdk install latest
./emsdk activate latest
```

---

TITLE: Cleanup Tcl Installation Directory
DESCRIPTION: This command removes the Tcl installation directory created during the testing process. It's a cleanup step to ensure a clean environment for subsequent tests or to free up disk space.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/tcl-extension-testing.md#_snippet_3>

LANGUAGE: bash
CODE:

```
rm -rf $TCLHOME
```

---

TITLE: Unix-like Systems Compilation
DESCRIPTION: Steps to compile SQLite on Unix-like systems. This includes installing dependencies, unpacking the source, configuring the build, and making the desired targets like the sqlite3 command-line tool or the amalgamation source file.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/README.md#_snippet_3>

LANGUAGE: bash
CODE:

```
apt install gcc make tcl-dev  ;#  Make sure you have all the necessary build tools
tar xzf sqlite.tar.gz         ;#  Unpack the source tree into "sqlite"
mkdir bld                     ;#  Build will occur in a sibling directory
cd bld                        ;#  Change to the build directory
../sqlite/configure           ;#  Run the configure script
make sqlite3                  ;#  Builds the "sqlite3" command-line tool
make sqlite3.c                ;#  Build the "amalgamation" source file
make sqldiff                  ;#  Builds the "sqldiff" command-line tool
# Makefile targets below this point require tcl-dev
make tclextension-install     ;#  Build and install the SQLite TCL extension
make devtest                  ;#  Run development tests
make releasetest              ;#  Run full release tests
make sqlite3_analyzer         ;#  Builds the "sqlite3_analyzer" tool
```

LANGUAGE: bash
CODE:

```
../sqlite/configure --enable-all --enable-debug CFLAGS='-O0 -g'
```

LANGUAGE: bash
CODE:

```
../sqlite/configure --enable-all
```

LANGUAGE: bash
CODE:

```
./configure --enable-all
make OPTIONS=-DSQLITE_OMIT_DEPRECATED sqlite3
```

---

TITLE: Configure SQLite Tcl Extension (Unix)
DESCRIPTION: Configures the SQLite Tcl extension build process on Unix-like systems. It requires specifying the Tcl installation root. Use './configure --help' for all available flags.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autoconf/tea/README.txt#_snippet_0>

LANGUAGE: shell
CODE:

```
./configure --with-tcl=/path/to/tcl/install/root
```

LANGUAGE: shell
CODE:

```
./configure --with-tclsh=/path/to/tcl/install/root
```

---

TITLE: Updating SQLite Source to Different Versions Using Fossil
DESCRIPTION: Examples of Fossil commands to update the local SQLite repository to different versions or points in time.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/README.md#2025-04-22_snippet_1>

LANGUAGE: bash
CODE:

```
fossil update trunk             ;# latest trunk check-in
fossil update release           ;# latest official release
fossil update trunk:2024-01-01  ;# First trunk check-in after 2024-01-01
fossil update version-3.39.0    ;# Version 3.39.0
```

---

TITLE: Autosetup Customization - Flag Defaults
DESCRIPTION: Provides an example of how to define default values for flags within a custom TCL file for autosetup. This function allows overriding default flag values and is called during the configure process.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#_snippet_14>

LANGUAGE: tcl
CODE:

```
proc sqlite-custom-flags {}
{
  # If any existing --flags require different default values
  # then call:
  options-defaults {
    flag-name new-default-value
    ...
  }
  # ^^^ That will replace the default value but will not update
  # the --help text, which may lead to some confusion:
  # https://github.com/msteveb/autosetup/issues/77

  return {
   {*} {
     new-flag-name => {Help text}
     ...
   }
  };
}
```

---

TITLE: Configuring SQLite Build for Debugging
DESCRIPTION: Example of configuring SQLite for a debugging build with optimization disabled and debug symbols enabled.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/README.md#2025-04-22_snippet_3>

LANGUAGE: shell
CODE:

```
../sqlite/configure --enable-all --enable-debug CFLAGS='-O0 -g'
```

---

TITLE: Building the 'lemon' Executable
DESCRIPTION: Shows the command-line instructions for compiling the 'lemon' parser generator executable using standard C compilers on Unix-like systems and Windows.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/lemon.html#_snippet_8>

LANGUAGE: c
CODE:

```
cc -o lemon lemon.c
```

LANGUAGE: c
CODE:

```
cl lemon.c
```

---

TITLE: Initializing Default Test Environment in SQLite
DESCRIPTION: Default initialization sequence that runs at the start of processing each test script. Sets up database connections and NULL value display.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/jni/src/org/sqlite/jni/test-script-interpreter.md#2025-04-22_snippet_0>

LANGUAGE: sql
CODE:

```
--close all
--db 0
--new test.db
--null nil
```

---

TITLE: Set PATH for 32-bit TCL Installation
DESCRIPTION: When building a 32-bit version of SQLite and using a separate TCL installation directory (e.g., c:\tcl32), ensure the 32-bit TCL bin directory appears before the 64-bit one in the PATH environment variable.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#_snippet_3>

LANGUAGE: batch
CODE:

```
set PATH=c:\tcl32\bin;%PATH%
```

---

TITLE: Autosetup API Tips
DESCRIPTION: Highlights frequently useful Autosetup APIs for daily maintenance. It details functions for file executability checks, environment variable retrieval, error handling, option checking, and indented notices.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/autosetup/README.md#_snippet_1>

LANGUAGE: tcl
CODE:

```
file-isexec filename
  Should be used in place of [file executable], as it will also check for ${filename}.exe on Windows platforms. However, on such platforms it also assumes that _any_ existing file is executable.
```

LANGUAGE: tcl
CODE:

```
get-env VAR ?default?
  Will fetch an "environment variable" from the first of either: (1) a KEY=VALUE passed to the configure script or (2) the system's environment variables. Not to be confused with getenv, which only does the latter and is rarely, if ever, useful in this tree.
```

LANGUAGE: tcl
CODE:

```
proj-get-env VAR ?default?
  Works like get-env but will, if that function finds no match, look for a file named ./.env-$VAR and, if found, return its trimmed contents. This can be used, e.g., to set a developer's local preferences for the default CFLAGS.
  Tip: adding -O0 to .env-CFLAGS reduces rebuild times considerably at the cost of performance in make devtest and the like.
```

LANGUAGE: tcl
CODE:

```
proj-fatal msg
  Emits $msg to stderr and exits with non-zero. Its differences from autosetup's user-error are purely cosmetic.
```

LANGUAGE: tcl
CODE:

```
proj-if-opt-truthy flag thenScript ?elseScript?
  Evals thenScript if the given --flag is truthy, else it evals the optional elseScript.
```

LANGUAGE: tcl
CODE:

```
proj-indented-notice ?-error? ?-notice? msg
  Breaks its msg argument into lines, trims them, and emits them with consistent indentation. Exactly how it emits depends on the flags passed to it (or not), as covered in its docs. This will stick out starkly from normal output and is intended to be used only for important notices.
```

LANGUAGE: tcl
CODE:

```
proj-opt-truthy flag
  Returns 1 if --flag's value is "truthy," i.e. one of (1, on, enabled, yes, true).
```

LANGUAGE: tcl
CODE:

```
proj-opt-was-provided FLAG
  Returns 1 if --FLAG was explicitly provided to configure, else 0. This distinction can be used to determine, e.g., whether --with-readline was provided or whether we're searching for
```

---

TITLE: SQL IN Operator Rewrite Example
DESCRIPTION: Shows how SQLite optimizes an IN operator with 1-2 values by rewriting it as OR conditions.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/src/in-operator.md#2025-04-22_snippet_1>

LANGUAGE: sql
CODE:

```
x IN (y1,y2)
x=y1 OR x=y2
```

---

TITLE: C Struct Definition
DESCRIPTION: Example of a C struct definition that can be bound using the framework.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/wasm/jaccwabyt/jaccwabyt.md#_snippet_2>

LANGUAGE: c
CODE:

```
// C-side:
struct Foo {
  int member1;
  void * member2;
  int64_t member3;
};
```

---

TITLE: Building SQLite Components Requiring TCL
DESCRIPTION: Make commands for building SQLite components and running tests that require TCL. These targets depend on the TCL installation.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-unix.md#2025-04-22_snippet_3>

LANGUAGE: bash
CODE:

```
make tclextension-install
```

LANGUAGE: bash
CODE:

```
make devtest
```

LANGUAGE: bash
CODE:

```
make releasetest
```

LANGUAGE: bash
CODE:

```
make sqlite3_analyzer
```

---

TITLE: Implementing In-Memory VFS for SQLite in C
DESCRIPTION: The memvfs.c file implements a custom virtual file system (VFS) to store an entire SQLite database in RAM, providing sample code for creating a simple VFS setup.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/misc/README.md#2025-04-22_snippet_4>

LANGUAGE: C
CODE:

```
// Custom in-memory VFS
// Stores SQLite db in RAM
#include <sqlite3.h>
// Additional C code implementation...
```

---

TITLE: Compiling the ICU Extension (gcc)
DESCRIPTION: Provides a command-line example using gcc to compile the SQLite ICU extension as a shared library on a \*nix system. It includes necessary flags for shared object creation and ICU library linking.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/ext/icu/README.txt#_snippet_4>

LANGUAGE: bash
CODE:

```
gcc -fPIC -shared icu.c `pkg-config --libs --cflags icu-io` -o libSqliteIcu.so
```

---

TITLE: Running SQLite Release Tests using nmake
DESCRIPTION: Runs the SQLite release test suite using `nmake` and `Makefile.msc`. Similar to `devtest`, this target requires a TCL installation (potentially specified via `TCLDIR=<dir>`) to verify the stability and correctness of the build.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_9>

LANGUAGE: cmd
CODE:

```
nmake /f makefile.msc releasetest
```

---

TITLE: Checking Executable DLL Dependencies using dumpbin
DESCRIPTION: Uses the `dumpbin` utility (part of Microsoft Visual Studio tools) with the `/dependents` flag to list the dynamic-link libraries (DLLs) that the specified executable (`sqlite3_analyzer.exe` in this example) depends on. This is useful for verifying whether a library, like the TCL DLL, has been successfully statically linked.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_17>

LANGUAGE: cmd
CODE:

```
dumpbin /dependents sqlite3_analyzer.exe
```

---

TITLE: Running Baseline Performance Test
DESCRIPTION: Executes speedtest.tcl script to measure baseline performance using a reference SQLite amalgamation file and stores results in baseline.txt

SOURCE: <https://github.com/sqlite/sqlite/blob/master/test/speedtest.md#2025-04-22_snippet_1>

LANGUAGE: tcl
CODE:

```
test/speedtest.tcl ../baseline/sqlite3.c ../speed/baseline.txt
```

---

TITLE: Setting PATH for 32-bit TCL Build Environment
DESCRIPTION: Prepends the binary directory of a 32-bit TCL installation (assumed to be `c:\tcl32\bin`) to the current command prompt session's PATH environment variable. This ensures that the 32-bit `tclsh.exe` is found before any 64-bit version when running `nmake` for a 32-bit SQLite build.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_12>

LANGUAGE: cmd
CODE:

```
set PATH=c:\tcl32\bin;%PATH%
```

---

TITLE: SQLite Payload Size Encoding Examples
DESCRIPTION: Illustrates different encoding methods for a JSON numeric value '1' in SQLite, demonstrating how header size and payload size are determined by the initial byte and subsequent bytes.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/jsonb.md#_snippet_1>

LANGUAGE: APIDOC
CODE:

```
JSON Numeric Value '1' Encoding Examples:

  *  0x13 0x31
  *  0xc3 0x01 0x31
  *  0xd3 0x00 0x01 0x31
  *  0xe3 0x00 0x00 0x00 0x01 0x31
  *  0xf3 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x01 0x31
```

---

TITLE: Running SQLite Developer Tests using nmake
DESCRIPTION: Executes the SQLite developer test suite using `nmake` and `Makefile.msc`. This comprehensive test suite requires a TCL installation (potentially specified via `TCLDIR=<dir>`) to run.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_8>

LANGUAGE: cmd
CODE:

```
nmake /f makefile.msc devtest
```

---

TITLE: Running Releasetest with External Fuzzcheck DB
DESCRIPTION: Execute the `releasetest` target including an external fuzzcheck database. Examples show passing the database file path using the `--fuzzdb` command-line option or setting the `FUZZDB` environment variable with `make` or `nmake`.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/testrunner.md#_snippet_19>

LANGUAGE: Tcl
CODE:

```
tclsh test/testrunner.tcl releasetest --fuzzdb ../fuzz/20250415.db
```

LANGUAGE: Bash/Make
CODE:

```
FUZZDB=../fuzz/20250415.db make releasetest
```

LANGUAGE: NMake
CODE:

```
nmake /f Makefile.msc FUZZDB=../fuzz/20250415.db releasetest
```

---

TITLE: Build Configuration Command
DESCRIPTION: Standard command for configuring and building SQLite from source.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/LICENSE.md#2025-04-22_snippet_1>

LANGUAGE: shell
CODE:

```
./configure && make
```

---

TITLE: Building SQLDiff Utility using nmake
DESCRIPTION: Builds the `sqldiff.exe` utility program using `nmake` and `Makefile.msc`. This tool computes the differences between two SQLite database files. TCL installation is not required for this build target.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/compile-for-windows.md#2025-04-22_snippet_5>

LANGUAGE: cmd
CODE:

```
nmake /f makefile.msc sqldiff.exe
```

---

TITLE: Testing TCL 9.0 on Windows
DESCRIPTION: Steps to test SQLite with TCL 9.0 on Windows. This involves checking out Tcl source, building, installing, and verifying the SQLite TCL extension.

SOURCE: <https://github.com/sqlite/sqlite/blob/master/doc/tcl-extension-testing.md#_snippet_6>

LANGUAGE: batch
CODE:

```
mkdir %TCLBUILD%\tcl90
cd %TCLSOURCE%\win
fossil up core-9-0-0
fossil clean -x
set INSTALLDIR=%TCLBUILD%\tcl90
nmake /f makefile.vc release
nmake /f makefile.vc install
cd %SQLITESOURCE%
fossil clean -x
set TCLDIR=%TCLBUILD%\tcl90
set PATH=%TCLBUILD%\tcl90\bin;%ORIGINALPATH%
set TCLSH_CMD=%TCLBUILD%\tcl90\bin\tclsh90.exe
nmake /f Makefile.msc tclextension-install
nmake /f Makefile.msc tclextension-verify
tclsh90 test/testrunner.tcl release --explain
```
