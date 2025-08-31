========================
CODE SNIPPETS
========================
TITLE: Initialize MLX Arrays and Inspect Properties
DESCRIPTION: This snippet demonstrates how to import the `mlx.core` library, create basic arrays with different data types (integer and float), and inspect their fundamental properties such as shape and data type. It shows the initial setup for working with MLX arrays.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/quick_start

LANGUAGE: python
CODE:

```
import mlx.core as mx
>> a = mx.array([1, 2, 3, 4])
>> a.shape
[4]
>> a.dtype
int32
>> b = mx.array([1.0, 2.0, 3.0, 4.0])
>> b.dtype
float32
```

---

TITLE: Install MLX Python API from Source
DESCRIPTION: These commands guide the user through cloning the MLX repository, installing the Python library for production, development, and enabling faster builds, running tests, and generating stubs for IDE auto-completion and type checking.

SOURCE: https://ml-explore.github.io/mlx/build/html/install

LANGUAGE: Shell
CODE:

```
git clone git@github.com:ml-explore/mlx.git mlx && cd mlx
```

LANGUAGE: Shell
CODE:

```
pip install .
```

LANGUAGE: Shell
CODE:

```
pip install -e ".[dev]"
```

LANGUAGE: Shell
CODE:

```
python setup.py build_ext --inplace
```

LANGUAGE: Shell
CODE:

```
python -m unittest discover python/tests
```

LANGUAGE: Shell
CODE:

```
python setup.py generate_stubs
```

---

TITLE: Build and Install MLX C++ Library from Source
DESCRIPTION: Outlines the steps to build and install the MLX C++ library from source. This involves cloning the repository, creating a build directory, configuring with CMake, compiling with make, running tests, and finally installing the library.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
git clone git@github.com:ml-explore/mlx.git mlx && cd mlx
```

LANGUAGE: shell
CODE:

```
mkdir -p build && cd build
```

LANGUAGE: shell
CODE:

```
cmake .. && make -j
```

LANGUAGE: shell
CODE:

```
make test
```

LANGUAGE: shell
CODE:

```
make install
```

---

TITLE: Apply Gradient Transformations in MLX
DESCRIPTION: This snippet demonstrates how to use MLX's automatic differentiation capabilities, specifically the `mx.grad` function. It shows how to compute the first and second derivatives of a mathematical function (sine) with respect to its input, highlighting the composability of transformations.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/quick_start

LANGUAGE: python
CODE:

```
x = mx.array(0.0)
>> mx.sin(x)
array(0, dtype=float32)
>> mx.grad(mx.sin)(x)
array(1, dtype=float32)
>> mx.grad(mx.grad(mx.sin))(x)
array(-0, dtype=float32)
```

---

TITLE: Build and Install MLX Python Library from Source
DESCRIPTION: Provides a sequence of commands to clone the MLX repository, install the Python library from the local source directory, and set up an editable development environment with testing capabilities. It also includes an option to generate stubs for IDE auto-completion.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
git clone git@github.com:ml-explore/mlx.git mlx && cd mlx
```

LANGUAGE: shell
CODE:

```
pip install .
```

LANGUAGE: shell
CODE:

```
pip install -e ".[dev]"
```

LANGUAGE: shell
CODE:

```
python setup.py build_ext --inplace
```

LANGUAGE: shell
CODE:

```
python -m unittest discover python/tests
```

LANGUAGE: shell
CODE:

```
python setup.py generate_stubs
```

---

TITLE: Run MLX C++ Example Executable
DESCRIPTION: Executes the compiled MLX C++ example program located in the build directory.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/mlx_in_cpp

LANGUAGE: bash
CODE:

```
./build/example
```

---

TITLE: MLX Training Graph: Basic Setup Without Compilation
DESCRIPTION: Provides a foundational example of setting up a training loop in MLX, including model definition, optimizer, loss function, and gradient computation. This snippet shows the standard iterative process of updating model parameters without applying `mlx.compile`.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/compile

LANGUAGE: python
CODE:

```
import mlx.core as mx
import mlx.nn as nn
import mlx.optimizers as optim

# 4 examples with 10 features each
x = mx.random.uniform(shape=(4, 10))

# 0, 1 targets
y = mx.array([0, 1, 0, 1])

# Simple linear model
model = nn.Linear(10, 1)

# SGD with momentum
optimizer = optim.SGD(learning_rate=0.1, momentum=0.8)

def loss_fn(model, x, y):
    logits = model(x).squeeze()
    return nn.losses.binary_cross_entropy(logits, y)

loss_and_grad_fn = nn.value_and_grad(model, loss_fn)

# Perform 10 steps of gradient descent
for it in range(10):
    loss, grads = loss_and_grad_fn(model, x, y)
    optimizer.update(model, grads)
    mx.eval(model.parameters(), optimizer.state)
```

---

TITLE: Build and Install MLX C++ API from Source
DESCRIPTION: These commands detail the process of cloning the MLX repository, creating a build directory, configuring and compiling the C++ library using CMake and Make, running tests, and installing the compiled artifacts.

SOURCE: https://ml-explore.github.io/mlx/build/html/install

LANGUAGE: Shell
CODE:

```
git clone git@github.com:ml-explore/mlx.git mlx && cd mlx
```

LANGUAGE: Shell
CODE:

```
mkdir -p build && cd build
```

LANGUAGE: Shell
CODE:

```
cmake .. && make -j
```

LANGUAGE: Shell
CODE:

```
make test
```

LANGUAGE: Shell
CODE:

```
make install
```

---

TITLE: Minimize MLX Binary Size with CMake
DESCRIPTION: Demonstrates how to use CMake flags to produce a smaller MLX binary. This example disables the CPU backend, safetensors, and GGUF support, while enabling shared libraries and Metal JIT, along with setting the build type to `MinSizeRel`.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: cmake
CODE:

```
cmake .. \
  -DCMAKE_BUILD_TYPE=MinSizeRel \
  -DBUILD_SHARED_LIBS=ON \
  -DMLX_BUILD_CPU=OFF \
  -DMLX_BUILD_SAFETENSORS=OFF \
  -DMLX_BUILD_GGUF=OFF \
  -DMLX_METAL_JIT=ON
```

---

TITLE: MLX CMake Build Options
DESCRIPTION: Documents various CMake options available for configuring the MLX build process. These options control features like building tests, examples, benchmarks, and specific backends (Metal, CPU), as well as enabling Python bindings, debug modes, and support for safetensors and GGUF.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: APIDOC
CODE:

```
MLX_BUILD_TESTS: ON
  - Controls whether MLX tests are built.
MLX_BUILD_EXAMPLES: OFF
  - Controls whether MLX examples are built.
MLX_BUILD_BENCHMARKS: OFF
  - Controls whether MLX benchmarks are built.
MLX_BUILD_METAL: ON
  - Controls whether the Metal backend is built.
MLX_BUILD_CPU: ON
  - Controls whether the CPU backend is built.
MLX_BUILD_PYTHON_BINDINGS: OFF
  - Controls whether Python bindings are built.
MLX_METAL_DEBUG: OFF
  - Enables debug mode for the Metal backend.
MLX_BUILD_SAFETENSORS: ON
  - Controls whether support for SafeTensors is built.
MLX_BUILD_GGUF: ON
  - Controls whether support for GGUF is built.
MLX_METAL_JIT: OFF
  - Controls whether Metal JIT compilation is enabled.
```

---

TITLE: API Reference: mlx.nn.init.constant
DESCRIPTION: Comprehensive documentation for the `mlx.nn.init.constant` function, including its signature, parameters, return value, and an example of its usage.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.constant

LANGUAGE: APIDOC
CODE:

```
mlx.nn.init.constant(value: float, dtype: Dtype = mlx.core.float32) -> Callable[[array], [array]]
  Description: An initializer that returns an array filled with `value`.
  Parameters:
    value (float): The value to fill the array with.
    dtype (Dtype, optional): The data type of the array. Default: `mlx.core.float32`.
  Returns:
    Callable[[array], [array]]: An initializer that returns an array with the same shape as the input, filled with `value`.
  Example:
    init_fn = nn.init.constant(0.5)
    init_fn(mx.zeros((2, 2)))
    array([[0.5, 0.5],
           [0.5, 0.5]], dtype=float32)
```

---

TITLE: MLX Distributed Backend Initialization Logic Examples
DESCRIPTION: These Python examples clarify the behavior of `mx.distributed.init()` when selecting different backends ('mpi', 'ring', 'any'). They illustrate how subsequent calls to `init()` without arguments will return the same backend if one was successfully initialized previously, and how multiple backends can be initialized independently.

SOURCE: https://ml-explore.github.io/mlx/build/html/usage/distributed

LANGUAGE: python
CODE:

```
# Case 1: Initialize MPI regardless if it was possible to initialize the ring backend
world = mx.distributed.init(backend="mpi")
world2 = mx.distributed.init()  # subsequent calls return the MPI backend!

# Case 2: Initialize any backend
world = mx.distributed.init(backend="any")  # equivalent to no arguments
world2 = mx.distributed.init()  # same as above

# Case 3: Initialize both backends at the same time
world_mpi = mx.distributed.init(backend="mpi")
world_ring = mx.distributed.init(backend="ring")
world_any = mx.distributed.init()  # same as MPI because it was initialized first!
```

---

TITLE: Python Example: MLX `qr` Factorization Usage
DESCRIPTION: Illustrates how to perform QR factorization on a sample 2x2 matrix using `mlx.linalg.qr` in Python. The example demonstrates passing a matrix and an optional stream, then prints the resulting `Q` and `R` matrices.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.linalg.qr

LANGUAGE: Python
CODE:

```
A = mx.array([[2., 3.], [1., 2.]])
Q, R = mx.linalg.qr(A, stream=mx.cpu)
Q
array([[-0.894427, -0.447214],
       [-0.447214, 0.894427]], dtype=float32)
R
array([[-2.23607, -3.57771],
       [0, 0.447214]], dtype=float32)
```

---

TITLE: Evaluate MLX Arrays with `mx.eval` and Implicit Evaluation
DESCRIPTION: This example illustrates MLX's lazy evaluation model, where operations are not computed until their results are needed. It shows how to explicitly force evaluation using `mx.eval()` and demonstrates implicit evaluation when printing an array or converting it to a NumPy array.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/quick_start

LANGUAGE: python
CODE:

```
c = a + b    # c not yet evaluated
>> mx.eval(c)  # evaluates c
>> c = a + b
>> print(c)     # Also evaluates c
array([2, 4, 6, 8], dtype=float32)
>> c = a + b
>> import numpy as np
>> np.array(c)   # Also evaluates c
array([2., 4., 6., 8.], dtype=float32)
```

---

TITLE: Build MLX C++ API with CUDA Support
DESCRIPTION: These commands create a build directory, navigate into it, and then use `cmake` to configure the build with CUDA support enabled (`-DMLX_BUILD_CUDA=ON`) before compiling the project using `make`.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
mkdir -p build && cd build
cmake .. -DMLX_BUILD_CUDA=ON && make -j
```

---

TITLE: Example Usage of MLX Glorot Uniform Initializer in Python
DESCRIPTION: This Python code snippet demonstrates how to use the `mlx.nn.init.glorot_uniform` initializer. It shows how to create an initializer function and apply it to an array, including an example with a custom gain value.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.glorot_uniform

LANGUAGE: python
CODE:

```
init_fn = nn.init.glorot_uniform()
init_fn(mx.zeros((2, 2)))
# Expected output:
# array([[0.223404, -0.890597],
#        [-0.379159, -0.776856]], dtype=float32)
init_fn(mx.zeros((2, 2)), gain=4.0)
# Expected output:
# array([[-1.90041, 3.02264],
#        [-0.912766, 4.12451]], dtype=float32)
```

---

TITLE: Run MLX C++ Example Executable
DESCRIPTION: Executes the compiled MLX C++ example program. This command runs the application created by the CMake build process, demonstrating the MLX functionality.

SOURCE: https://ml-explore.github.io/mlx/build/html/dev/mlx_in_cpp

LANGUAGE: Shell
CODE:

```
./build/example
```

---

TITLE: Example JSON Hostfile Structure
DESCRIPTION: Provides the schema for a JSON hostfile used by `mlx.launch` to define remote hosts. Each object in the list specifies an SSH hostname for connection and a list of IP addresses for inter-node communication.

SOURCE: https://ml-explore.github.io/mlx/build/html/usage/launching_distributed

LANGUAGE: JSON
CODE:

```
[
    {"ssh": "hostname1", "ips": ["123.123.1.1", "123.123.2.1"]},
    {"ssh": "hostname2", "ips": ["123.123.1.2", "123.123.2.2"]
]
```

---

TITLE: Launch MLX Distributed Program for Local Testing
DESCRIPTION: This example shows how to use `mlx.launch` to test a distributed MLX program on a single localhost, specifying the number of processes (`-n 2`) to simulate a distributed environment.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/launching_distributed

LANGUAGE: shell
CODE:

```
mlx.launch -n 2 my_script.py
```

---

TITLE: Apply 1D Average Pooling with mlx.nn.AvgPool1d
DESCRIPTION: This example demonstrates how to initialize and use the `mlx.nn.AvgPool1d` class to perform 1-dimensional average pooling on a randomly generated MLX array. It shows the basic setup with `kernel_size` and `stride` parameters.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.AvgPool1d

LANGUAGE: Python
CODE:

```
import mlx.core as mx
import mlx.nn.layers as nn
x = mx.random.normal(shape=(4, 16, 5))
pool = nn.AvgPool1d(kernel_size=2, stride=2)
pool(x)
```

---

TITLE: Add Executable and Link MLX in CMake
DESCRIPTION: Configures CMake to build the `example.cpp` source file into an executable named 'example' and links it against the MLX library, ensuring the program can use MLX functionalities.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/mlx_in_cpp

LANGUAGE: cmake
CODE:

```
add_executable(example example.cpp)
target_link_libraries(example PRIVATE mlx)
```

---

TITLE: Install CUDA Toolkit and BLAS/LAPACK Headers on Ubuntu (Linux CUDA)
DESCRIPTION: These commands download and install the NVIDIA CUDA keyring, update package lists, install the CUDA toolkit, and then install BLAS, LAPACK, and LAPACKE development headers for building MLX with CUDA support on Ubuntu.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
dpkg -i cuda-keyring_1.1-1_all.deb
apt-get update -y
apt-get -y install cuda-toolkit-12-9
apt-get install libblas-dev liblapack-dev liblapacke-dev -y
```

---

TITLE: Build MLX C++ Example Project
DESCRIPTION: Commands to configure and build the CMake project. The first command configures the build directory for a Release build, and the second command compiles the project.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/mlx_in_cpp

LANGUAGE: bash
CODE:

```
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

---

TITLE: Launching MLX Distributed Programs with `mpirun` and `mlx.launch` (DYLD_LIBRARY_PATH)
DESCRIPTION: These shell commands illustrate how to launch a distributed MLX program using either `mpirun` directly or the `mlx.launch` helper script, specifically addressing the need to set `DYLD_LIBRARY_PATH` for Homebrew installations of MPI. `mlx.launch` automates this process.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/distributed

LANGUAGE: shell
CODE:

```
$ mpirun -np 2 -x DYLD_LIBRARY_PATH=/opt/homebrew/lib/ python test.py
$ # or simply
$ mlx.launch -n 2 test.py
```

---

TITLE: Initialize MLX and Define Linear Regression Parameters
DESCRIPTION: Imports the MLX core package and sets up essential parameters for the linear regression model. These parameters include the number of features, the total number of examples, the iterations for Stochastic Gradient Descent (SGD), and the learning rate for the optimization process.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/examples/linear_regression

LANGUAGE: python
CODE:

```
import mlx.core as mx

num_features = 100
num_examples = 1_000
num_iters = 10_000  # iterations of SGD
lr = 0.01  # learning rate for SGD
```

---

TITLE: Example Usage of mlx.nn.AvgPool3d in Python
DESCRIPTION: Demonstrates how to initialize and apply the `AvgPool3d` layer from `mlx.nn` using a sample 5-dimensional input tensor generated with `mlx.core.random.normal`. The example sets a kernel size and stride of 2 for the pooling operation.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.AvgPool3d

LANGUAGE: Python
CODE:

```
import mlx.core as mx
import mlx.nn.layers as nn
x = mx.random.normal(shape=(8, 16, 32, 32, 4))
pool = nn.AvgPool3d(kernel_size=2, stride=2)
pool(x)
```

---

TITLE: Install MLX Extensions Package with pip
DESCRIPTION: This command installs the MLX extensions package from the current directory using pip. It ensures that the compiled C++ and Metal libraries, specified as `package_data` in the setup configuration, are correctly copied alongside the Python binding, making the extension importable.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/extensions

LANGUAGE: bash
CODE:

```
python -m pip install .
```

---

TITLE: Example: Llama Model Instantiation and Token Sampling in MLX
DESCRIPTION: This example demonstrates how to instantiate a Llama model, materialize its parameters using `mx.eval()`, and then use its `generate` method to sample tokens. It highlights MLX's lazy evaluation by showing that computation is deferred until `mx.eval()` is explicitly called on the generated output. The snippet processes a prompt and generates a specified number of tokens.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/examples/llama-inference

LANGUAGE: python
CODE:

```
model = Llama(num_layers=12, vocab_size=8192, dims=512, mlp_dims=1024, num_heads=8)

# Since MLX is lazily evaluated nothing has actually been materialized yet.
# We could have set the `dims` to 20_000 on a machine with 8GB of RAM and the
# code above would still run. Let's actually materialize the model.
mx.eval(model.parameters())

prompt = mx.array([[1, 10, 8, 32, 44, 7]])  # <-- Note the double brackets because we
                                            #     have a batch dimension even
                                            #     though it is 1 in this case

generated = [t for i, t in zip(range(10), model.generate(prompt, 0.8))]

# Since we haven't evaluated anything, nothing is computed yet. The list
# `generated` contains the arrays that hold the computation graph for the
# full processing of the prompt and the generation of 10 tokens.
#
# We can evaluate them one at a time, or all together. Concatenate them or
# print them. They would all result in very similar runtimes and give exactly
# the same results.
mx.eval(generated)
```

---

TITLE: Python: Example Usage of MLX Custom Extension
DESCRIPTION: This Python script demonstrates how to import and use a custom MLX extension, `axpby`, after installation. It initializes MLX arrays, calls the custom operation, and prints the shape, dtype, and verifies the correctness of the result.

SOURCE: https://ml-explore.github.io/mlx/build/html/dev/extensions

LANGUAGE: Python
CODE:

```
import mlx.core as mx
from mlx_sample_extensions import axpby

a = mx.ones((3, 4))
b = mx.ones((3, 4))
c = axpby(a, b, 4.0, 2.0, stream=mx.cpu)

print(f"c shape: {c.shape}")
print(f"c dtype: {c.dtype}")
print(f"c is correct: {mx.all(c == 6.0).item()}")
```

LANGUAGE: text
CODE:

```
c shape: [3, 4]
c dtype: float32
c is correct: True
```

---

TITLE: Example Usage of mlx.nn.init.he_uniform
DESCRIPTION: Demonstrates how to use the `he_uniform` initializer to create an initialization function and apply it to an MLX array. The example shows both the default behavior (using `fan_in`) and custom initialization with `mode="fan_out"` and a specified `gain`.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.he_uniform

LANGUAGE: Python
CODE:

```
init_fn = nn.init.he_uniform()
init_fn(mx.zeros((2, 2)))  # uses fan_in
# Expected output: array([[0.0300242, -0.0184009],
#                        [0.793615, 0.666329]], dtype=float32)
init_fn(mx.zeros((2, 2)), mode="fan_out", gain=5)
# Expected output: array([[-1.64331, -2.16506],
#                        [1.08619, 5.79854]], dtype=float32)
```

---

TITLE: Create MLX C++ Example Program
DESCRIPTION: Defines a simple C++ program that demonstrates basic usage of the MLX library by creating two arrays, adding them, and printing the result to standard output.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/mlx_in_cpp

LANGUAGE: C++
CODE:

```
#include <iostream>

#include "mlx/mlx.h"

namespace mx = mlx::core;

int main() {
  auto x = mx::array({1, 2, 3});
  auto y = mx::array({1, 2, 3});
  std::cout << x + y << std::endl;
  return 0;
}
```

---

TITLE: Python: Setuptools Configuration for MLX Extensions
DESCRIPTION: This Python `setup.py` script configures a `setuptools` project for MLX extensions. It uses `mlx.extension.CMakeExtension` and `mlx.extension.CMakeBuild` to integrate the CMake build process, defines package data for the compiled libraries, and sets up basic project metadata.

SOURCE: https://ml-explore.github.io/mlx/build/html/dev/extensions

LANGUAGE: Python
CODE:

```
from mlx import extension
from setuptools import setup

if __name__ == "__main__":
    setup(
        name="mlx_sample_extensions",
        version="0.0.0",
        description="Sample C++ and Metal extensions for MLX primitives.",
        ext_modules=[extension.CMakeExtension("mlx_sample_extensions._ext")],
        cmdclass={"build_ext": extension.CMakeBuild},
        packages=["mlx_sample_extensions"],
        package_data={"mlx_sample_extensions": ["*.so", "*.dylib", "*.metallib"]},
        extras_require={"dev":[]},
        zip_safe=False,
        python_requires=">=3.8",
    )
```

---

TITLE: Installing OpenMPI for MLX Distributed Training (Conda)
DESCRIPTION: This command provides the recommended method for installing OpenMPI using the Anaconda package manager. OpenMPI is a crucial dependency for enabling MPI-based distributed training with MLX, and this installation ensures compatibility and proper setup.

SOURCE: https://ml-explore.github.io/mlx/build/html/usage/distributed

LANGUAGE: shell
CODE:

```
$ conda install conda-forge::openmpi
```

---

TITLE: Example: Using mlx.optimizers.exponential_decay with SGD
DESCRIPTION: This Python example demonstrates how to initialize an exponential decay learning rate schedule and integrate it with an `mlx.optimizers.SGD` optimizer. It shows how the learning rate changes over several update steps.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/optimizers/_autosummary/mlx.optimizers.exponential_decay

LANGUAGE: Python
CODE:

```
lr_schedule = optim.exponential_decay(1e-1, 0.9)
optimizer = optim.SGD(learning_rate=lr_schedule)
optimizer.learning_rate

for _ in range(5): optimizer.update({}, {})

optimizer.learning_rate
```

---

TITLE: Install MLX Python Package
DESCRIPTION: Installs the MLX Python package using pip, which includes the necessary C++ library components for development.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/mlx_in_cpp

LANGUAGE: bash
CODE:

```
pip install -U mlx
```

---

TITLE: Example Usage of mlx.nn.init.uniform
DESCRIPTION: Demonstrates how to use the `mlx.nn.init.uniform` function to create an initializer and apply it to an MLX array, showing the resulting array with uniformly distributed values. This snippet illustrates the basic workflow for initializing an array with random values from a uniform distribution.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.uniform

LANGUAGE: Python
CODE:

```
>>> init_fn = nn.init.uniform(low=0, high=1)
>>> init_fn(mx.zeros((2, 2)))
array([[0.883935, 0.863726],
       [0.617261, 0.417497]], dtype=float32)
```

---

TITLE: Launching MLX Distributed Programs with `mlx.launch` (MPI Backend)
DESCRIPTION: This shell command demonstrates how to launch a distributed MLX program using the `mlx.launch` helper script with the MPI backend. It specifies the number of processes (`-n 2`) and the Python script to execute, handling MPI setup nuisances automatically.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/distributed

LANGUAGE: shell
CODE:

```
$ mlx.launch --backend mpi -n 2 test.py
```

---

TITLE: Get Parameter Shapes in MLX Module
DESCRIPTION: Illustrates using `mlx.utils.tree_map` to recursively apply a function to all parameters within an MLX module. This example specifically retrieves the shape of each parameter, providing detailed information about the model's internal tensors.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn

LANGUAGE: python
CODE:

```
from mlx.utils import tree_map
shapes = tree_map(lambda p: p.shape, mlp.parameters())
```

---

TITLE: Basic CMakeLists.txt Setup for MLX C++
DESCRIPTION: Initializes the CMake project, specifying the minimum required CMake version, the project name, and setting the C++ standard to C++17. This forms the foundational configuration for any C++ project using CMake.

SOURCE: https://ml-explore.github.io/mlx/build/html/dev/mlx_in_cpp

LANGUAGE: CMake
CODE:

```
cmake_minimum_required(VERSION 3.27)

project(example LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
```

---

TITLE: Launching with MPI Backend and Custom Arguments
DESCRIPTION: Shows how to configure `mlx.launch` to use the MPI backend. This example includes passing a specific MPI argument (`--mca btl_tcp_if_include en0`) to control network interface usage and references an external hostfile (`hosts.json`).

SOURCE: https://ml-explore.github.io/mlx/build/html/usage/launching_distributed

LANGUAGE: Shell
CODE:

```
mlx.launch --backend mpi --mpi-arg '--mca btl_tcp_if_include en0' --hostfile hosts.json my_script.py
```

---

TITLE: Install MLX Python Package
DESCRIPTION: Installs or updates the MLX Python package using pip. This is often the first step, as the Python installation can provide the necessary C++ libraries and CMake configuration for development.

SOURCE: https://ml-explore.github.io/mlx/build/html/dev/mlx_in_cpp

LANGUAGE: Python
CODE:

```
pip install -U mlx
```

---

TITLE: Launch MLX Distributed Programs
DESCRIPTION: These shell commands illustrate how to use the `mlx.launch` helper script to run distributed MLX programs. Examples include launching a script with a specified number of local processes and launching it across multiple remote hosts via SSH, demonstrating the output from different ranks.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/distributed

LANGUAGE: shell
CODE:

```
$ mlx.launch -n 4 my_script.py
3 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
2 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
1 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
0 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
```

LANGUAGE: shell
CODE:

```
$ mlx.launch --hosts ip1,ip2,ip3,ip4 my_script.py
3 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
2 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
1 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
0 array([4, 4, 4, ..., 4, 4, 4], dtype=float32)
```

---

TITLE: Example Usage of mlx.nn.init.he_normal in Python
DESCRIPTION: This Python example demonstrates how to use the `he_normal` initializer function from the MLX library. It shows basic initialization and an advanced usage with 'fan_out' mode and a custom gain.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.he_normal

LANGUAGE: Python
CODE:

```
>>> init_fn = nn.init.he_normal()
>>> init_fn(mx.zeros((2, 2)))  # uses fan_in
array([[-1.25211, 0.458835],
           [-0.177208, -0.0137595]], dtype=float32)
>>> init_fn(mx.zeros((2, 2)), mode="fan_out", gain=5)
array([[5.6967, 4.02765],
           [-4.15268, -2.75787]], dtype=float32)
```

---

TITLE: Efficient MLX Distributed Gradient Averaging with `mlx.nn.average_gradients`
DESCRIPTION: This Python example shows a more efficient way to average gradients in a distributed MLX setup using the built-in `mlx.nn.average_gradients` function. It aggregates multiple gradients for fewer communication steps, improving performance compared to per-gradient communication.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/distributed

LANGUAGE: python
CODE:

```
model = ...
optimizer = ...
dataset = ...

def step(model, x, y):
    loss, grads = loss_grad_fn(model, x, y)
    grads = mlx.nn.average_gradients(grads)
    optimizer.update(model, grads)
    return loss

for x, y in dataset:
    loss = step(model, x, y)
    mx.eval(loss, model.parameters())
```

---

TITLE: Python Example for mlx.core.linalg.eig
DESCRIPTION: Illustrative Python code demonstrating the usage of `mlx.core.linalg.eig`. This example computes the eigenvalues and eigenvectors for a 2x2 matrix, showcasing the function's input and the complex array outputs for both eigenvalues and eigenvectors.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.linalg.eig

LANGUAGE: Python
CODE:

```
A = mx.array([[1., -2.], [-2., 1.]])
w, v = mx.linalg.eig(A, stream=mx.cpu)
w
# array([3+0j, -1+0j], dtype=complex64)
v
# array([[0.707107+0j, 0.707107+0j],
#        [-0.707107+0j, 0.707107+0j]], dtype=complex64)
```

---

TITLE: Example Usage of mlx.core.kron in Python
DESCRIPTION: Demonstrates how to use the `mlx.core.kron` function in Python to compute the Kronecker product of two sample MLX arrays and print the result.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.kron

LANGUAGE: python
CODE:

```
a = mx.array([[1, 2], [3, 4]])
b = mx.array([[0, 5], [6, 7]])
result = mx.kron(a, b)
print(result)
# Expected Output:
# array([[0, 5, 0, 10],
#        [6, 7, 12, 14],
#        [0, 15, 0, 20],
#        [18, 21, 24, 28]], dtype=int32)
```

---

TITLE: Install MLX Python Library via Conda
DESCRIPTION: Installs the MLX Python library using the conda package manager from the conda-forge channel. This provides an alternative installation method to pip.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
conda install conda-forge::mlx
```

---

TITLE: MLX Neural Network Loss Functions
DESCRIPTION: This entry details the loss functions provided by `mlx.nn.losses`. These functions quantify the difference between predicted and true values, guiding the optimization process during model training. For detailed parameter specifications and usage examples, refer to the official MLX documentation.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.remainder

LANGUAGE: APIDOC
CODE:

```
mlx.nn.losses.binary_cross_entropy
mlx.nn.losses.cosine_similarity_loss
mlx.nn.losses.cross_entropy
mlx.nn.losses.gaussian_nll_loss
mlx.nn.losses.hinge_loss
mlx.nn.losses.huber_loss
mlx.nn.losses.kl_div_loss
mlx.nn.losses.l1_loss
mlx.nn.losses.log_cosh_loss
mlx.nn.losses.margin_ranking_loss
mlx.nn.losses.mse_loss
mlx.nn.losses.nll_loss
mlx.nn.losses.smooth_l1_loss
mlx.nn.losses.triplet_loss
```

---

TITLE: Install MLX with CUDA Support via pip
DESCRIPTION: Installs the MLX library with support for its CUDA backend using pip. This is intended for Linux platforms equipped with CUDA 12 and a GPU with SM 7.0 (Volta) or higher.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
pip install mlx-cuda
```

---

TITLE: Example Usage of mlx.optimizers.join_schedules in Python
DESCRIPTION: This Python example demonstrates how to use `mlx.optimizers.join_schedules` to create a composite learning rate schedule. It combines a linear schedule for the initial steps with a cosine decay schedule for subsequent steps, and shows how to apply it to an optimizer and observe the learning rate changes.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/optimizers/_autosummary/mlx.optimizers.join_schedules

LANGUAGE: Python
CODE:

```
linear = optim.linear_schedule(0, 1e-1, steps=10)
cosine = optim.cosine_decay(1e-1, 200)
lr_schedule = optim.join_schedules([linear, cosine], [10])
optimizer = optim.Adam(learning_rate=lr_schedule)
print(optimizer.learning_rate)
# Expected output: array(0.0, dtype=float32)
for _ in range(12): optimizer.update({}, {})
print(optimizer.learning_rate)
# Expected output: array(0.0999938, dtype=float32)
```

---

TITLE: mlx.launch Command Line Utility
DESCRIPTION: Comprehensive documentation for the `mlx.launch` command-line utility, detailing its purpose, usage patterns, available parameters, and specific configurations for MPI and Ring backends. This tool is designed for launching Python scripts in a distributed fashion.

SOURCE: https://ml-explore.github.io/mlx/build/html/usage/launching_distributed

LANGUAGE: APIDOC
CODE:

```
mlx.launch <options> <script.py>

Description:
  A helper script provided by the MLX Python package for launching Python scripts in a distributed manner across several nodes. It allows launching using either the MPI backend or the ring backend. It connects to provided hosts, launches the input script on each, monitors processes, and forwards output.

Usage Examples:
  mlx.launch --hosts ip1,ip2 my_script.py
  mlx.launch -n 2 my_script.py (for localhost testing)
  mlx.launch --backend mpi --mpi-arg '--mca btl_tcp_if_include en0' --hostfile hosts.json my_script.py

Parameters/Options:
  -n <num_processes>: (integer) Number of processes to launch, typically for localhost testing.
  --hosts <ip1,ip2,...>: (string, comma-separated IPs/hostnames) Specifies the hosts to launch the script on. Can be used instead of a hostfile.
  --hostfile <path>: (string) Path to a JSON hostfile that defines the list of hosts and their IPs. This allows for more complex host definitions.
    Hostfile Schema:
      [
          {"ssh": "hostname1", "ips": ["123.123.1.1", "123.123.2.1"]},
          {"ssh": "hostname2", "ips": ["123.123.1.2", "123.123.2.2"]
      ]
    Note: Use `mlx.distributed_config --over ethernet` to create a hostfile.
  --backend <backend_name>: (string, default: 'ring') Specifies the distributed backend to use.
    Supported values: 'mpi', 'ring'.
  --print-python: (flag) Prints the Python binary path that `mlx.launch` will use on remote hosts, useful for debugging.

MPI Specifics (--backend mpi):
  - `mlx.launch` acts as a thin wrapper over `mpirun`.
  - IPs in the hostfile are ignored.
  - Stronger SSH connectivity requirement: every node needs to be able to connect to every other node.
  - `mpirun` must be available on every node at the same path.
  --mpi-arg '<arg>': (string) Passes arguments directly to `mpirun`. E.g., `--mpi-arg '--mca btl_tcp_if_include en0'`.

Ring Specifics (--backend ring, default):
  - `--hosts` argument only accepts IPs, not hostnames. Use a hostfile if SSHing to a hostname different from the IP to bind to.
  --starting-port <port>: (integer) Defines the base port to bind to on remote hosts. Rank 0 uses this port, and subsequent IPs/ranks increment by 1.
  --connections-per-ip <num>: (integer) Increases the number of connections between neighboring nodes. Corresponds to `--mca btl_tcp_links <num>` for `mpirun`.
```

---

TITLE: Build MLX Python API with CUDA Support
DESCRIPTION: This command uses `pip install` with a `CMAKE_ARGS` environment variable to enable CUDA support during the build process for the MLX Python API. The `.[dev]` indicates an editable installation with development dependencies.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
CMAKE_ARGS="-DMLX_BUILD_CUDA=ON" pip install -e ".[dev]"
```

---

TITLE: Install BLAS and LAPACK Headers on Ubuntu (Linux CPU)
DESCRIPTION: This command updates package lists and installs necessary BLAS, LAPACK, and LAPACKE development headers required for building MLX on Linux systems without CUDA support.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
apt-get update -y
apt-get install libblas-dev liblapack-dev liblapacke-dev -y
```

---

TITLE: Build MLX Extensions In-Place with setup.py
DESCRIPTION: This command compiles and builds MLX extensions, including C++ and Metal libraries, using `setup.py`. The `-j8` flag specifies parallel compilation with 8 jobs, and `--inplace` ensures the built extensions are placed directly within the source directory for immediate use.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/extensions

LANGUAGE: bash
CODE:

```
python setup.py build_ext -j8 --inplace
```

---

TITLE: Install MLX Python Library via pip
DESCRIPTION: Installs the MLX Python library from PyPI using pip. This method requires an Apple silicon M-series chip, a native Python version 3.9 or higher, and macOS 13.5 or later.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
pip install mlx
```

---

TITLE: MLX Training Loop with `mlx.nn.average_gradients`
DESCRIPTION: This example demonstrates a more efficient way to perform distributed gradient averaging in MLX by leveraging the built-in `mlx.nn.average_gradients` function. This function is designed to aggregate multiple gradients together, reducing communication overhead compared to individual gradient averaging, and simplifies the distributed training setup.

SOURCE: https://ml-explore.github.io/mlx/build/html/usage/distributed

LANGUAGE: python
CODE:

```
model = ...
optimizer = ...
dataset = ...

def step(model, x, y):
    loss, grads = loss_grad_fn(model, x, y)
    grads = mlx.nn.average_gradients(grads) # <---- This line was added
    optimizer.update(model, grads)
    return loss

for x, y in dataset:
    loss = step(model, x, y)
    mx.eval(loss, model.parameters())
```

---

TITLE: Flattening Python Trees with `mlx.utils.tree_flatten` Example
DESCRIPTION: Demonstrates how to use `mlx.utils.tree_flatten` to convert a nested list into a flat list of key-value pairs. It shows examples with and without a custom prefix.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.utils.tree_flatten

LANGUAGE: Python
CODE:

```
from mlx.utils import tree_flatten

print(tree_flatten([[[0]]]))
# [("0.0.0", 0)]

print(tree_flatten([[[0]]], ".hello"))
# [("hello.0.0.0", 0)]
```

---

TITLE: MLX Array Initialization for Mixed-Device Example
DESCRIPTION: Initializes two MLX arrays with specific shapes using uniform random values. These arrays serve as input arguments for the 'fun' function, demonstrating data preparation for computations that leverage unified memory across different devices for performance optimization.

SOURCE: https://ml-explore.github.io/mlx/build/html/usage/unified_memory

LANGUAGE: Python
CODE:

```
a = mx.random.uniform(shape=(4096, 512))
b = mx.random.uniform(shape=(512, 4))
```

---

TITLE: Install MLX Python Package via Conda
DESCRIPTION: Installs the MLX library for Python using conda from the conda-forge channel. This provides an alternative installation method for users preferring conda.

SOURCE: https://ml-explore.github.io/mlx/build/html/install

LANGUAGE: Shell
CODE:

```
conda install conda-forge::mlx
```

---

TITLE: MLX Core Metal Integration API
DESCRIPTION: Documentation for MLX core functions interacting with Apple's Metal framework, including checking availability, retrieving device information, and controlling GPU capture for debugging.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.identity

LANGUAGE: APIDOC
CODE:

```
mlx.core.metal.is_available
mlx.core.metal.device_info
mlx.core.metal.start_capture
mlx.core.metal.stop_capture
```

---

TITLE: Configure Xcode Developer Directory
DESCRIPTION: Sets the DEVELOPER_DIR environment variable to specify a particular Xcode installation to use during the build process. This is useful when multiple Xcode versions are present on the system.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/install

LANGUAGE: shell
CODE:

```
export DEVELOPER_DIR="/path/to/Xcode.app/Contents/Developer/"
```

---

TITLE: MLX Distributed Backend Initialization Logic
DESCRIPTION: This Python code demonstrates various scenarios for initializing the MLX distributed backend using `mx.distributed.init()`. It clarifies how to explicitly select 'mpi' or 'ring' backends, or use 'any' for automatic selection, and how subsequent calls to `init()` without arguments return the previously initialized backend.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/usage/distributed

LANGUAGE: python
CODE:

```
# Case 1: Initialize MPI regardless if it was possible to initialize the ring backend
world = mx.distributed.init(backend="mpi")
world2 = mx.distributed.init()  # subsequent calls return the MPI backend!

# Case 2: Initialize any backend
world = mx.distributed.init(backend="any")  # equivalent to no arguments
world2 = mx.distributed.init()  # same as above

# Case 3: Initialize both backends at the same time
world_mpi = mx.distributed.init(backend="mpi")
world_ring = mx.distributed.init(backend="ring")
world_any = mx.distributed.init()  # same as MPI because it was initialized first!
```

---

TITLE: Install BLAS and LAPACK Dependencies on Linux (CPU)
DESCRIPTION: These commands update package lists and install necessary BLAS, LAPACK, and LAPACKE development headers required for building MLX with CPU support on Ubuntu-based Linux distributions.

SOURCE: https://ml-explore.github.io/mlx/build/html/install

LANGUAGE: Shell
CODE:

```
apt-get update -y
```

LANGUAGE: Shell
CODE:

```
apt-get install libblas-dev liblapack-dev liblapacke-dev -y
```

---

TITLE: Initialize Identity Matrix with MLX
DESCRIPTION: This Python example demonstrates how to use the `mlx.nn.init.identity` function to create an initializer and apply it to a zero array to produce an identity matrix.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.identity

LANGUAGE: python
CODE:

```
>>> init_fn = nn.init.identity()
>>> init_fn(mx.zeros((2, 2)))
array([[1, 0],
       [0, 1]], dtype=float32)
```

---

TITLE: MLX Core Devices and Streams API Reference
DESCRIPTION: API documentation for managing devices and streams in MLX core, including `Device`, `Stream` classes, and functions for setting/getting default devices/streams, creating new streams, and synchronization.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.utils.tree_unflatten

LANGUAGE: APIDOC
CODE:

```
mlx.core.Device
  - Represents a computational device (e.g., CPU, GPU).

mlx.core.Stream
  - Represents a computational stream for asynchronous operations.

mlx.core.default_device()
  - Returns the current default device.

mlx.core.set_default_device(device)
  - Sets the default device for MLX operations.
  - Parameters:
    - device: The device to set as default.

mlx.core.default_stream(device=None)
  - Returns the default stream for a given device or the current default device.
  - Parameters:
    - device: Optional device to query.

mlx.core.new_stream(device=None)
  - Creates and returns a new stream for a given device or the current default device.
  - Parameters:
    - device: Optional device to create the stream on.

mlx.core.set_default_stream(stream)
  - Sets the default stream for the current default device.
  - Parameters:
    - stream: The stream to set as default.

mlx.core.stream(stream)
  - Context manager to temporarily set the default stream.
  - Parameters:
    - stream: The stream to use within the context.

mlx.core.synchronize(stream=None)
  - Synchronizes the specified stream or all operations on the default stream if none is specified.
  - Parameters:
    - stream: Optional stream to synchronize.
```

---

TITLE: Example Usage of mlx.nn.init.normal in Python
DESCRIPTION: Demonstrates how to use the `mlx.nn.init.normal` function to create an initializer and apply it to an MLX array, showing the resulting array with values sampled from a normal distribution.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.init.normal

LANGUAGE: python
CODE:

```
init_fn = nn.init.normal()
init_fn(mx.zeros((2, 2)))
# Expected output:
# array([[-0.982273, -0.534422],
#        [0.380709, 0.0645099]], dtype=float32)
```

---

TITLE: Install CUDA and BLAS/LAPACK Dependencies on Linux
DESCRIPTION: These commands install the NVIDIA CUDA toolkit along with BLAS, LAPACK, and LAPACKE development headers, preparing an Ubuntu-based Linux system for building MLX with CUDA support.

SOURCE: https://ml-explore.github.io/mlx/build/html/install

LANGUAGE: Shell
CODE:

```
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
```

LANGUAGE: Shell
CODE:

```
dpkg -i cuda-keyring_1.1-1_all.deb
```

LANGUAGE: Shell
CODE:

```
apt-get update -y
```

LANGUAGE: Shell
CODE:

```
apt-get -y install cuda-toolkit-12-9
```

LANGUAGE: Shell
CODE:

```
apt-get install libblas-dev liblapack-dev liblapacke-dev -y
```

---

TITLE: MLX Neural Network Weight Initializers
DESCRIPTION: Documentation for various weight initialization strategies available in `mlx.nn.init`. Proper initialization is crucial for stable and efficient training of deep neural networks.

SOURCE: https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.tan

LANGUAGE: APIDOC
CODE:

```
mlx.nn.init.constant
  - Initializes weights with a constant value.
mlx.nn.init.normal
  - Initializes weights from a normal distribution.
mlx.nn.init.uniform
  - Initializes weights from a uniform distribution.
mlx.nn.init.identity
  - Initializes weights as an identity matrix.
mlx.nn.init.glorot_normal
  - Initializes weights using Glorot (Xavier) normal initialization.
mlx.nn.init.glorot_uniform
  - Initializes weights using Glorot (Xavier) uniform initialization.
mlx.nn.init.he_normal
  - Initializes weights using He normal initialization.
mlx.nn.init.he_uniform
  - Initializes weights using He uniform initialization.
```

---

TITLE: CMake Find MLX (Python Installation)
DESCRIPTION: Configures CMake to locate the MLX C++ library when it has been installed via the Python package. It uses Python's `mlx --cmake-dir` command to dynamically determine the MLX installation path, ensuring correct linking.

SOURCE: https://ml-explore.github.io/mlx/build/html/dev/mlx_in_cpp

LANGUAGE: CMake
CODE:

```
find_package(
  Python 3.9
  COMPONENTS Interpreter Development.Module
  REQUIRED)
execute_process(
  COMMAND "${Python_EXECUTABLE}" -m mlx --cmake-dir
  OUTPUT_STRIP_TRAILING_WHITESPACE
  OUTPUT_VARIABLE MLX_ROOT)
```

---

TITLE: Install MLX with CUDA Backend via Pip
DESCRIPTION: Installs the MLX library with CUDA support using pip. This is intended for Linux platforms with CUDA 12 and SM 7.0 (Volta) or newer GPUs.

SOURCE: https://ml-explore.github.io/mlx/build/html/install

LANGUAGE: Shell
CODE:

```
pip install mlx-cuda
```

---

TITLE: Manually Set MLX Root Path in CMake
DESCRIPTION: Specifies the installation path for the MLX C++ library directly in CMake. This is useful when MLX is installed in a non-standard location or CMake cannot automatically find it.

SOURCE: https://ml-explore.github.io/mlx/build/html/_sources/dev/mlx_in_cpp

LANGUAGE: cmake
CODE:

```
set(MLX_ROOT "/path/to/mlx/")
```
