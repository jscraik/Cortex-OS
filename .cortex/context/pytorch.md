========================
CODE SNIPPETS
========================
TITLE: Install PyTorch with Intel GPU Support (Release Wheels)
DESCRIPTION: Installs the release versions of PyTorch, Torchvision, and Torchaudio with support for Intel GPUs (XPU) using pip.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_0

LANGUAGE: bash
CODE:

```
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/xpu
```

---

TITLE: Install PyTorch with Intel GPU Support (Nightly Wheels)
DESCRIPTION: Installs the latest nightly builds of PyTorch, Torchvision, and Torchaudio with support for Intel GPUs (XPU) using pip.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_1

LANGUAGE: bash
CODE:

```
pip3 install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/xpu
```

---

TITLE: Inference with FP32 on XPU
DESCRIPTION: Example of running inference with a ResNet50 model on Intel GPU using FP32 precision.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_4

LANGUAGE: python
CODE:

```
import torch
import torchvision.models as models

model = models.resnet50(weights="ResNet50_Weights.DEFAULT")
model.eval()
data = torch.rand(1, 3, 224, 224)

model = model.to("xpu")
data = data.to("xpu")

with torch.no_grad():
    model(data)

print("Execution finished")
```

---

TITLE: Training with FP32 on XPU
DESCRIPTION: Example of training a ResNet50 model on CIFAR10 dataset using Intel GPU with FP32 precision and SGD optimizer.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_7

LANGUAGE: python
CODE:

```
import torch
import torchvision

LR = 0.001
DOWNLOAD = True
DATA = "datasets/cifar10/"

transform = torchvision.transforms.Compose(
    [
        torchvision.transforms.Resize((224, 224)),
        torchvision.transforms.ToTensor(),
        torchvision.transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
    ]
)
train_dataset = torchvision.datasets.CIFAR10(
    root=DATA,
    train=True,
    transform=transform,
    download=DOWNLOAD,
)
train_loader = torch.utils.data.DataLoader(dataset=train_dataset, batch_size=128)
train_len = len(train_loader)

model = torchvision.models.resnet50()
criterion = torch.nn.CrossEntropyLoss()
optimizer = torch.optim.SGD(model.parameters(), lr=LR, momentum=0.9)
model.train()
model = model.to("xpu")
criterion = criterion.to("xpu")

print(f"Initiating training")
for batch_idx, (data, target) in enumerate(train_loader):
    data = data.to("xpu")
    target = target.to("xpu")
    optimizer.zero_grad()
    output = model(data)
    loss = criterion(output, target)
    loss.backward()
    optimizer.step()
    if (batch_idx + 1) % 10 == 0:
         iteration_loss = loss.item()
         print(f"Iteration [{batch_idx+1}/{train_len}], Loss: {iteration_loss:.4f}")
torch.save(
    {
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
    },
    "checkpoint.pth",
)

print("Execution finished")
```

---

TITLE: PyTorch Developer Environment Setup
DESCRIPTION: Steps and resources for setting up the developer environment for PyTorch, including installing prerequisites, forking and cloning the repository, installing dependencies, and building from source.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/The-Ultimate-Guide-to-PyTorch-Contributions.md#_snippet_3

LANGUAGE: markdown
CODE:

```
- [[Install Prerequisites|Developer Environment Prerequisites]]
- [[Fork, clone, and checkout the PyTorch source|Fork Clone and Checkout]]
- [[Install Dependencies]]
- [[Build PyTorch from source|Build-PyTorch]]
    - [[Debugging your PyTorch build|Debugging PyTorch Build]]
- [[Tips for developing PyTorch|Development Tips]]
- [[PyTorch Workflow Git cheatsheet|PyTorch Workflow Cheatsheet]]
```

---

TITLE: Install PyTorch OpenReg Example
DESCRIPTION: Commands to install the PyTorch OpenReg example as a standalone Python package, allowing it to be used or developed locally.

SOURCE: https://github.com/pytorch/pytorch/blob/main/test/cpp_extensions/open_registration_extension/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
python -m pip install -e .
```

LANGUAGE: shell
CODE:

```
python -m pip install .
```

---

TITLE: PyTorch Basics and Workflow
DESCRIPTION: Learn the fundamental concepts of PyTorch development, including environment setup, core workflow, and how PyTorch is utilized in various applications.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Core-Frontend-Onboarding.md#_snippet_0

LANGUAGE: Python
CODE:

```
import torch

# Example of basic tensor operation
x = torch.rand(5, 3)
print(x)
```

---

TITLE: PyTorch C++ Frontend Installation
DESCRIPTION: Provides information on how to install the PyTorch C++ frontend library distribution. It directs users to a specific link for detailed instructions, including an example of how to build a minimal application that depends on LibTorch.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/cpp/source/frontend.rst#_snippet_3

LANGUAGE: APIDOC
CODE:

```
Installation Instructions:

Follow this link for instructions on installing the C++ frontend library distribution: https://pytorch.org/cppdocs/installing.html

Includes an example for building a minimal application depending on LibTorch.
```

---

TITLE: Inference with AMP on XPU
DESCRIPTION: Example of running inference with Automatic Mixed Precision (AMP) on Intel GPU. Supports FP16 and BF16.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_5

LANGUAGE: python
CODE:

```
import torch
import torchvision.models as models

model = models.resnet50(weights="ResNet50_Weights.DEFAULT")
model.eval()
data = torch.rand(1, 3, 224, 224)

model = model.to("xpu")
data = data.to("xpu")

with torch.no_grad():
    d = torch.rand(1, 3, 224, 224)
    d = d.to("xpu")
    # set dtype=torch.bfloat16 for BF16
    with torch.autocast(device_type="xpu", dtype=torch.float16, enabled=True):
        model(data)

print("Execution finished")
```

---

TITLE: Cloning and Setting Up PyTorch Repository
DESCRIPTION: Steps to fork the PyTorch repository on GitHub, clone the fork locally, and add an upstream remote for synchronization with the main repository.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Fork-Clone-and-Checkout.md#_snippet_0

LANGUAGE: bash
CODE:

```
git clone https://github.com/<username>/pytorch.git
cd pytorch
git remote add upstream https://github.com/pytorch/pytorch.git
git remote -v
```

---

TITLE: PyTorch CIFAR-10 Training with torch.compile
DESCRIPTION: This example showcases training a ResNet-50 model on CIFAR-10, specifically highlighting the use of `torch.compile` for potential performance optimizations. It follows a similar structure to the standard training loop but incorporates `torch.compile(model)` before the training begins. This allows PyTorch to optimize the model's execution graph. The snippet includes data loading, model setup, training, and checkpoint saving.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_10

LANGUAGE: python
CODE:

```
import torch
import torchvision

LR = 0.001
DOWNLOAD = True
DATA = "datasets/cifar10/"

transform = torchvision.transforms.Compose(
    [
        torchvision.transforms.Resize((224, 224)),
        torchvision.transforms.ToTensor(),
        torchvision.transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
    ]
)
train_dataset = torchvision.datasets.CIFAR10(
    root=DATA,
    train=True,
    transform=transform,
    download=DOWNLOAD,
)
train_loader = torch.utils.data.DataLoader(dataset=train_dataset, batch_size=128)
train_len = len(train_loader)

model = torchvision.models.resnet50()
criterion = torch.nn.CrossEntropyLoss()
optimizer = torch.optim.SGD(model.parameters(), lr=LR, momentum=0.9)
model.train()
model = model.to("xpu")
criterion = criterion.to("xpu")
model = torch.compile(model)

print(f"Initiating training with torch compile")
for batch_idx, (data, target) in enumerate(train_loader):
    data = data.to("xpu")
    target = target.to("xpu")
    optimizer.zero_grad()
    output = model(data)
    loss = criterion(output, target)
    loss.backward()
    optimizer.step()
    if (batch_idx + 1) % 10 == 0:
         iteration_loss = loss.item()
         print(f"Iteration [{batch_idx+1}/{train_len}], Loss: {iteration_loss:.4f}")
torch.save(
    {
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
    },
    "checkpoint.pth",
)

print("Execution finished")
```

---

TITLE: PyTorch Module Usage Examples
DESCRIPTION: Provides runnable code examples demonstrating how to instantiate and use a PyTorch module, including creating a module with and without bias, and printing the output tensor size.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/torch.nn-Module-Documentation-Style-Guide.md#_snippet_4

LANGUAGE: python
CODE:

```
Examples::
    >>> m = nn.Linear(20, 30)
    >>> input = torch.randn(128, 20)
    >>> output = m(input)
    >>> print(output.size())
    torch.Size([128, 30])

    >>> # Example of creating a Linear layer with no bias.
    >>> m = nn.Linear(3, 3, bias=False)
    >>> input = torch.randn(10, 3)
    >>> output = m(input)
    >>> print(output.size())
    torch.Size([10, 3])
```

---

TITLE: Train with AMP on XPU
DESCRIPTION: Example for training with Automatic Mixed Precision (AMP) on Intel GPU. Note: GradScaler requires FP64 support, which is not native to Intel® Arc™ A-Series Graphics. Disable GradScaler if using these GPUs.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_8

LANGUAGE: python
CODE:

```
import torch
import torchvision

# Note: Training with GradScaler requires hardware support for FP64.
# FP64 is not natively supported by the Intel® Arc™ A-Series Graphics.
# If you run your workloads on Intel® Arc™ A-Series Graphics, please disable GradScaler.

# Example placeholder for AMP training setup
# ... (rest of the training code would follow here)
```

---

TITLE: Check Intel GPU Availability
DESCRIPTION: Checks if Intel GPU (XPU) is available for PyTorch. Ensure drivers are installed correctly if it returns False.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_2

LANGUAGE: python
CODE:

```
import torch
print(torch.xpu.is_available())  # torch.xpu is the API for Intel GPU support
```

---

TITLE: Nightly PyTorch Checkout
DESCRIPTION: Uses the `tools/nightly.py` script to check out a new nightly development branch of PyTorch and activate a conda environment.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Fork-Clone-and-Checkout.md#_snippet_1

LANGUAGE: bash
CODE:

```
cd pytorch
./tools/nightly.py checkout -b my-nightly-branch
conda activate pytorch-deps
```

---

TITLE: Migrate from CUDA to XPU
DESCRIPTION: Demonstrates how to change device references from 'cuda' to 'xpu' when migrating code for Intel GPU support.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_3

LANGUAGE: python
CODE:

```
# CUDA CODE
tensor = torch.tensor([1.0, 2.0]).to("cuda")

# CODE for Intel GPU
tensor = torch.tensor([1.0, 2.0]).to("xpu")
```

---

TITLE: torch.compile with ResNet50 Pretrained Model
DESCRIPTION: An example demonstrating how to use torch.compile with a pretrained ResNet50 model loaded from the PyTorch hub. This showcases the compatibility of torch.compile with complex, real-world models.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.md#_snippet_2

LANGUAGE: python
CODE:

```
import torch
model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet50', pretrained=True)
opt_model = torch.compile(model, backend="inductor")
opt_model(torch.randn(1,3,64,64))
```

---

TITLE: Inference with torch.compile on XPU
DESCRIPTION: Demonstrates inference performance improvement using `torch.compile` on Intel GPU. Compares pre-compile and post-compile execution times.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/get_start_xpu.rst#_snippet_6

LANGUAGE: python
CODE:

```
import torch
import torchvision.models as models
import time

model = models.resnet50(weights="ResNet50_Weights.DEFAULT")
model.eval()
data = torch.rand(1, 3, 224, 224)
ITERS = 10

model = model.to("xpu")
data = data.to("xpu")

for i in range(ITERS):
    start = time.time()
    with torch.no_grad():
        model(data)
        torch.xpu.synchronize()
    end = time.time()
    print(f"Inference time before torch.compile for iteration {i}: {(end-start)*1000} ms")

model = torch.compile(model)
for i in range(ITERS):
    start = time.time()
    with torch.no_grad():
        model(data)
        torch.xpu.synchronize()
    end = time.time()
    print(f"Inference time after torch.compile for iteration {i}: {(end-start)*1000} ms")

print("Execution finished")
```

---

TITLE: Basic torch.compile Example with Pointwise Operators
DESCRIPTION: Demonstrates using torch.compile with pointwise operators (cos, sin) for inference. It highlights the concept of operator fusion for performance gains, especially on GPUs with memory bandwidth limitations. The example can be run on GPU or CPU.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.md#_snippet_0

LANGUAGE: python
CODE:

```
import torch
def fn(x):
   a = torch.cos(x)
   b = torch.sin(a)
   return b
new_fn = torch.compile(fn, backend="inductor")
input_tensor = torch.randn(10000).to(device="cuda:0")
a = new_fn(input_tensor)
```

---

TITLE: Loading Pretrained Model from HuggingFace Hub
DESCRIPTION: Demonstrates downloading and optimizing a pretrained model directly from the HuggingFace hub using libraries like transformers. This highlights the interoperability of torch.compile with popular model repositories.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.md#_snippet_3

LANGUAGE: python
CODE:

```
import torch
from transformers import BertTokenizer, BertModel
```

---

TITLE: TIMM Model Optimization with torch.compile
DESCRIPTION: This example demonstrates optimizing a TIMM model ('resnext101_32x8d') using torch.compile with the 'inductor' backend. It includes loading a pre-trained model, compiling it, and performing a forward pass with random input.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.md#_snippet_5

LANGUAGE: python
CODE:

```
import timm
import torch

model = timm.create_model('resnext101_32x8d', pretrained=True, num_classes=2)
opt_model = torch.compile(model, backend="inductor")
opt_model(torch.randn(64,3,7,7))
```

---

TITLE: CUDA Basics in PyTorch
DESCRIPTION: Get started with using CUDA for GPU acceleration in PyTorch, including moving tensors to the GPU and performing computations.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Core-Frontend-Onboarding.md#_snippet_6

LANGUAGE: Python
CODE:

```
import torch

if torch.cuda.is_available():
    device = torch.device("cuda")
    x = torch.randn(3, 3, device=device)
    print(f"Tensor on device: {x.device}")
    y = torch.ones_like(x, device=device)
    z = x + y
    print(z)
else:
    print("CUDA not available. Running on CPU.")
```

---

TITLE: Windows Conda Environment Setup
DESCRIPTION: Sets up a Conda environment for PyTorch installation on Windows systems. It activates a specified Conda installation directory using a batch script, creates a new Conda environment, activates it, and then calls the Visual Studio C++ build tools.

SOURCE: https://github.com/pytorch/pytorch/blob/main/README.md#_snippet_4

LANGUAGE: bash
CODE:

```
source <CONDA_INSTALL_DIR>\Scripts\activate.bat
conda create -y -n <CONDA_NAME>
conda activate <CONDA_NAME>
call "C:\Program Files\Microsoft Visual Studio\<VERSION>\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
```

---

TITLE: Installing and Running tlparse
DESCRIPTION: Provides instructions for installing the tlparse tool and using it to analyze a collected trace directory. tlparse generates an HTML report for visualization.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_troubleshooting.md#_snippet_6

LANGUAGE: bash
CODE:

```
pip install tlparse
tlparse /tmp/tracedir
```

---

TITLE: Hogwild! Training Example (PyTorch)
DESCRIPTION: A minimal PyTorch example demonstrating the Hogwild! training approach. It involves sharing model memory and starting multiple processes for parallel training. Requires a `MyModel` class and data loading setup.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/multiprocessing.rst#_snippet_2

LANGUAGE: python
CODE:

```
import torch.multiprocessing as mp
from model import MyModel

def train(model):
    # Construct data_loader, optimizer, etc.
    for data, labels in data_loader:
        optimizer.zero_grad()
        loss_fn(model(data), labels).backward()
        optimizer.step()  # This will update the shared parameters

if __name__ == '__main__':
    num_processes = 4
    model = MyModel()
    # NOTE: this is required for the ``fork`` method to work
    model.share_memory()
    processes = []
    for rank in range(num_processes):
        p = mp.Process(target=train, args=(model,))
        p.start()
        processes.append(p)
    for p in processes:
        p.join()
```

---

TITLE: Torch Distributed Elastic Quickstart
DESCRIPTION: This section provides a quick start guide for using Torch Distributed Elastic, covering essential steps to set up and run distributed PyTorch training jobs with fault-tolerance and elasticity.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/distributed.elastic.md#_snippet_0

LANGUAGE: python
CODE:

```
# Example usage (conceptual, actual code would be in the quickstart guide)
import torch.distributed.elastic as etcd

# Define your distributed training function
def train_fn():
    # ... your distributed training logic ...
    pass

# Configure and run the distributed job
conf = etcd.Config(metrics_interval=10)
etcd.run(train_fn, config=conf)

```

---

TITLE: Install Ninja Build System
DESCRIPTION: Instructions to install the Ninja build system for faster PyTorch builds. Requires running `python setup.py clean` if PyTorch was previously built.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Development-Tips.md#_snippet_7

LANGUAGE: bash
CODE:

```
pip install ninja
```

---

TITLE: nn.Linear Module Documentation Example
DESCRIPTION: Demonstrates the standard structure for documenting a PyTorch nn module, including mathematical formulas, notes, warnings, arguments, shape information, attributes, and usage examples.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/torch.nn-Module-Documentation-Style-Guide.md#_snippet_0

LANGUAGE: python
CODE:

```
r"""
Applies a linear transformation to the incoming data.

.. math::\n    y = xA^T + b\n
where :math:`x` is the input, :math:`A` is the ``weight`` parameter, :math:`b` is the
optional ``bias`` parameter, and :math:`y` is the output.

Note:
    This module supports :ref:`TensorFloat32<tf32_on_ampere>`.

Warning:
    Use of this module will melt your hard drive!

Args:
    in_features (int): The size of each input sample.
    out_features (int): The size of each output sample.
    bias (bool, optional): If set to ``False``, the layer will not learn an
        additive bias. Default: ``True``.

Shape:
    - Input: :math:`(*, H_{in})`, where :math:`*` represents any number of
      dimensions (including none) and :math:`H_{in} = \text{in\_features}`.
    - Output: :math:`(*, H_{out})`, where all but the last dimension
      match the input shape and :math:`H_{out} = \text{out\_features}`.

Attributes:
    weight: The learnable weights of the module of shape :math:`(H_{out}, H_{in})`, where
            :math:`H_{in} = \text{in\_features}` and :math:`H_{out} = \text{out\_features}`.
            The values are initialized from :math:`\mathcal{U}(-\sqrt{k}, \sqrt{k})`, where
            :math:`k = \frac{1}{\text{in1\_features}}`.
    bias: The learnable bias of the module of shape :math:`(H_{out})`. Only present when
          :attr:`bias` is ``True``. The values are initialized from
          :math:`\mathcal{U}(-\sqrt{k}, \sqrt{k})`, where :math:`k = \frac{1}{H_{in}}`.

Examples::
    >>> m = nn.Linear(20, 30)
    >>> input = torch.randn(128, 20)
    >>> output = m(input)
    >>> print(output.size())
    torch.Size([128, 30])

    >>> # Example of creating a Linear layer with no bias.
    >>> m = nn.Linear(3, 3, bias=False)
    >>> input = torch.randn(10, 3)
    >>> output = m(input)
    >>> print(output.size())
    torch.Size([10, 3])
"""
```

---

TITLE: Setup Miniconda for MacOS CI
DESCRIPTION: Example of a GitHub Actions workflow step using the `setup-miniconda` action to install Python and dependencies for MacOS CI jobs. It specifies Python version, Conda environment file, and pip requirements file.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/A-quick-guide-on-how-to-add-and-cache-dependencies-on-PyTorch-CI.md#_snippet_8

LANGUAGE: YAML
CODE:

```
- name: Setup miniconda (arm64, py3.9)
  if: ${{ runner.arch == 'ARM64' }}
  uses: pytorch/test-infra/.github/actions/setup-miniconda@main
  with:
    python-version: 3.9
    environment-file: .github/requirements/conda-env-${{ runner.os }}-${{ runner.arch }}
    pip-requirements-file: .github/requirements/pip-requirements-${{ runner.os }}.txt
```

---

TITLE: Common PyTorch Build Dependencies
DESCRIPTION: Installs essential build tools and dependencies required for compiling PyTorch from source. This includes CMake and Ninja for the build system, and pip for installing Python requirements.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Install-Dependencies.md#_snippet_0

LANGUAGE: bash
CODE:

```
conda install cmake ninja
pip install -r requirements.txt
```

---

TITLE: Install Katex for Documentation Build
DESCRIPTION: Installs the Katex library, a dependency for rendering mathematical formulas in the documentation. It provides commands for local and global installation, addressing potential version compatibility issues.

SOURCE: https://github.com/pytorch/pytorch/blob/main/README.md#_snippet_27

LANGUAGE: shell
CODE:

```
npm install katex
```

LANGUAGE: shell
CODE:

```
npm install -g katex
```

LANGUAGE: shell
CODE:

```
npm install -g katex@0.13.18
```

---

TITLE: Prepare PyTorch Environment
DESCRIPTION: Steps to set up a Python virtual environment using `venv`, install pip, and then install the project's requirements. It also includes activating the virtual environment.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Build-PyTorch-and-LibTorch-on-Windows-ARM64.md#_snippet_2

LANGUAGE: cmd
CODE:

```
python -m pip install --upgrade pip
python -m venv .venv
echo * > .venv\.gitignore
call .\.venv\Scripts\activate

pip install -r requirements.txt
```

---

TITLE: Linux Conda Environment Setup
DESCRIPTION: Sets up a Conda environment for PyTorch installation on Linux systems. It activates a specified Conda installation directory, creates a new Conda environment, and activates it.

SOURCE: https://github.com/pytorch/pytorch/blob/main/README.md#_snippet_3

LANGUAGE: bash
CODE:

```
source <CONDA_INSTALL_DIR>/bin/activate
conda create -y -n <CONDA_NAME>
conda activate <CONDA_NAME>
```

---

TITLE: Installing Miniz with vcpkg
DESCRIPTION: This snippet demonstrates how to install the Miniz library using the vcpkg package manager. It includes cloning the vcpkg repository, bootstrapping it, integrating it with the system, and then installing Miniz.

SOURCE: https://github.com/pytorch/pytorch/blob/main/third_party/miniz-3.0.2/readme.md#_snippet_0

LANGUAGE: bash
CODE:

```
git clone https://github.com/Microsoft/vcpkg.git
cd vcpkg
./bootstrap-vcpkg.sh
./vcpkg integrate install
./vcpkg install miniz
```

---

TITLE: Nightly PyTorch Pull
DESCRIPTION: Pulls the latest nightly commits into the current branch and reinstalls PyTorch dependencies and nightly binaries into a specified conda environment.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Fork-Clone-and-Checkout.md#_snippet_3

LANGUAGE: bash
CODE:

```
./tools/nightly.py pull -n my-env
conda activate my-env
```

---

TITLE: Nightly PyTorch Checkout with Existing Conda Environment
DESCRIPTION: Checks out a new nightly development branch of PyTorch and activates a specified existing conda environment.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Fork-Clone-and-Checkout.md#_snippet_2

LANGUAGE: bash
CODE:

```
./tools/nightly.py checkout -b my-nightly-branch -n my-env
conda activate my-env
```

---

TITLE: Running PyTorch LibTorch Example Application
DESCRIPTION: This snippet demonstrates how to execute a compiled LibTorch application and shows the expected output, which includes a 2x3 tensor with floating-point values. The output may vary slightly due to randomness.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/cpp/source/installing.rst#_snippet_5

LANGUAGE: sh
CODE:

```
root@4b5a67132e81:/example-app/build# ./example-app
0.2063  0.6593  0.0866
0.0796  0.5841  0.1569
[ Variable[CPUFloatType]{2,3} ]
```

---

TITLE: Optimizing TIMM Model with torch.compile (Python)
DESCRIPTION: Shows how to apply `torch.compile` to a pre-trained model from the TIMM library. This demonstrates `torch.compile`'s broad compatibility with popular PyTorch model ecosystems, enabling performance optimization for various computer vision models.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.rst#_snippet_4

LANGUAGE: python
CODE:

```
import timm
import torch
model = timm.create_model('resnext101_32x8d', pretrained=True, num_classes=2)
opt_model = torch.compile(model, backend="inductor")
opt_model(torch.randn(64,3,7,7))
```

---

TITLE: Basic Compilation with functorch
DESCRIPTION: This example demonstrates a basic compilation of a PyTorch function using functorch. It showcases the core compilation process but may require specific setup or modifications due to the experimental nature of the feature.

SOURCE: https://github.com/pytorch/pytorch/blob/main/functorch/examples/compilation/README.md#_snippet_0

LANGUAGE: python
CODE:

```
import torch
from functorch import compile

def forward(x):
    return torch.sin(x) + x

compiled_forward = compile(forward)

input_tensor = torch.randn(3, 3)
output = compiled_forward(input_tensor)
print(output)
```

---

TITLE: PyTorch C++ API Quick Walkthrough
DESCRIPTION: A brief introduction to using the PyTorch C++ API for deploying models or performing computations in C++ environments.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Core-Frontend-Onboarding.md#_snippet_9

LANGUAGE: C++
CODE:

```
#include <torch/torch.h>

int main() {
  // Create a tensor
  torch::Tensor tensor = torch::rand({2, 3});
  std::cout << tensor << std::endl;

  // Perform an operation
  torch::Tensor result = tensor.relu();
  std::cout << result << std::endl;

  return 0;
}
```

---

TITLE: Example of Optimized PyTorch Build with Flags
DESCRIPTION: An example of a PyTorch build command with multiple environment variables set to disable various components for faster compilation.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Development-Tips.md#_snippet_4

LANGUAGE: bash
CODE:

```
DEBUG=1 USE_DISTRIBUTED=0 USE_MKLDNN=0 USE_CUDA=0 BUILD_TEST=0 USE_FBGEMM=0 USE_NNPACK=0 USE_QNNPACK=0 USE_XNNPACK=0 python setup.py develop
```

---

TITLE: Install Windows Dependencies
DESCRIPTION: Installs MKL static libraries and include files for Windows systems.

SOURCE: https://github.com/pytorch/pytorch/blob/main/README.md#_snippet_10

LANGUAGE: bash
CODE:

```
pip install mkl-static mkl-include
```

---

TITLE: PyTorch with C++
DESCRIPTION: Introduction to using PyTorch from C++, covering installation and basic usage.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Home.md#_snippet_44

LANGUAGE: markdown
CODE:

```
[PyTorch with C++](https://github.com/pytorch/pytorch/blob/master/docs/source/cpp_index.rst)
```

---

TITLE: Tutorials Build and Deployment
DESCRIPTION: Overview of the build and deployment process for PyTorch tutorials. Pull requests trigger rebuilds using CircleCI, with a Netlify build for quick review. Final deployment is handled by GitHub Actions.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/community/contribution_guide.rst#_snippet_5

LANGUAGE: rst
CODE:

```
For tutorials, pull requests trigger a rebuild of the entire site using CircleCI to test the effects of the change. This build is sharded into 9 worker builds and takes around 40 minutes total. At the same time, we do a Netlify build using *make html-noplot*, which builds the site without rendering the notebook output into pages for quick review.

After a PR is accepted, the site is rebuilt and deployed using GitHub Actions.
```

---

TITLE: Install MONAI Library for ONNX Export Examples
DESCRIPTION: This command installs the MONAI library, which provides the HighResNet model used in the subsequent Python examples. It is a necessary prerequisite for running the memory usage demonstrations of the ONNX exporters.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/onnx_dynamo_memory_usage.rst#_snippet_0

LANGUAGE: bash
CODE:

```
pip install monai
```

---

TITLE: CUDA Build Environment Setup
DESCRIPTION: Configures environment variables for building PyTorch with CUDA support, including setting paths for MKL libraries and optionally overriding the CUDA host compiler.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Build-PyTorch.md#_snippet_5

LANGUAGE: cmd
CODE:

```
:: Set the environment variables after you have downloaded and unzipped the mkl package,
:: else CMake would throw an error as `Could NOT find OpenMP`.
set CMAKE_INCLUDE_PATH={Your directory}\mkl\include
set LIB={Your directory}\mkl\lib;%LIB%

:: Read the content in the previous section carefully before you proceed.
:: [Optional] If you want to override the underlying toolset used by Ninja and Visual Studio with CUDA, please run the following script block.
:: "Visual Studio 2019 Developer Command Prompt" will be run automatically.
:: Make sure you have CMake >= 3.12 before you do this when you use the Visual Studio generator.
set CMAKE_GENERATOR_TOOLSET_VERSION=14.27
set DISTUTILS_USE_SDK=1
for /f "usebackq tokens=*" %i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -version [15^,17^) -products * -latest -property installationPath`) do call "%i\VC\Auxiliary\Build\vcvarsall.bat" x64 -vcvars_ver=%CMAKE_GENERATOR_TOOLSET_VERSION%

:: [Optional] If you want to override the CUDA host compiler
set CUDAHOSTCXX=C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Tools\MSVC\14.27.29110\bin\HostX64\x64\cl.exe

python setup.py develop
```

---

TITLE: Install Katex globally with yarn
DESCRIPTION: Installs Katex globally using yarn, which may be more convenient for Facebook employees using devservers. It also shows how to install a specific version.

SOURCE: https://github.com/pytorch/pytorch/blob/main/CONTRIBUTING.md#_snippet_26

LANGUAGE: bash
CODE:

```
yarn global add katex
yarn global add katex@0.13.18

```

---

TITLE: Installing C++ Distributions of PyTorch
DESCRIPTION: Instructions for installing PyTorch C++ distributions, including dependencies and build processes.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Home.md#_snippet_51

LANGUAGE: markdown
CODE:

```
[Installing C++ Distributions of PyTorch](https://github.com/pytorch/pytorch/blob/master/docs/cpp/source/installing.rst)
```

---

TITLE: Windows PyTorch Build Dependencies
DESCRIPTION: Installs MKL for math acceleration and packages required for torch.distributed functionality on Windows. Note that distributed package support on Windows is a prototype feature.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Install-Dependencies.md#_snippet_3

LANGUAGE: bash
CODE:

```
conda install mkl mkl-include

# Add these packages if torch.distributed is needed.
# Distributed package support on Windows is a prototype feature and is subject to changes.
conda install -c conda-forge libuv=1.39
```

---

TITLE: Inspecting Generated Triton Kernel for Pointwise Operations (Python)
DESCRIPTION: Shows an example of the Triton kernel code generated by TorchInductor for the fused `cos` and `sin` operations. This illustrates how `torch.compile` optimizes operations by combining them into a single kernel, reducing memory reads and writes. The code is generated by setting `TORCH_COMPILE_DEBUG=1`.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.rst#_snippet_1

LANGUAGE: python
CODE:

```
@pointwise(size_hints=[16384], filename=__file__, triton_meta={'signature': {'in_ptr0': '*fp32', 'out_ptr0': '*fp32', 'xnumel': 'i32'}, 'device': 0, 'constants': {}, 'mutated_arg_names': [], 'configs': [AttrsDescriptor(divisible_by_16=(0, 1, 2), equal_to_1=())]})
@triton.jit
def triton_(in_ptr0, out_ptr0, xnumel, XBLOCK : tl.constexpr):
   xnumel = 10000
   xoffset = tl.program_id(0) * XBLOCK
   xindex = xoffset + tl.arange(0, XBLOCK)[:]
   xmask = xindex < xnumel
   x0 = xindex
   tmp0 = tl.load(in_ptr0 + (x0), xmask, other=0.0)
   tmp1 = tl.cos(tmp0)
   tmp2 = tl.sin(tmp1)
   tl.store(out_ptr0 + (x0 + tl.zeros([XBLOCK], tl.int32)), tmp2, xmask)
```

---

TITLE: Linux PyTorch Build Dependencies
DESCRIPTION: Installs MKL for math acceleration and optional MAGMA for CUDA support on Linux. It also includes instructions for building Triton if torch.compile with Inductor is to be used.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Install-Dependencies.md#_snippet_1

LANGUAGE: bash
CODE:

```
conda install mkl mkl-include

# CUDA only: Add LAPACK support for the GPU if needed
conda install -c pytorch magma-cuda110  # or the magma-cuda* that matches your CUDA version from https://anaconda.org/pytorch/repo

# (optional) If using torch.compile with inductor/triton, install the matching version of triton
# Run from the pytorch directory after cloning
make triton
```

---

TITLE: Build and Serve PyTorch Documentation Locally
DESCRIPTION: Instructions for building and serving the PyTorch documentation site locally using Jekyll. This requires installing rbenv and yarn dependencies.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Developer-FAQ.md#_snippet_0

LANGUAGE: bash
CODE:

```
# Install rbenv and yarn dependencies for a jekyll website
# Follow https://github.com/pytorch/pytorch.github.io
cd <path_to>/pytorch.github.io

# Serve the doc site locally
make serve
```

---

TITLE: Build libtorch using CMake
DESCRIPTION: Builds the C++ libtorch.so directly with CMake. This example demonstrates building a Release version from the main branch and installing it to a specified directory. It requires cloning the repository with submodules and setting CMake variables for build type, Python executable, and installation prefix.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/libtorch.rst#_snippet_2

LANGUAGE: bash
CODE:

```
git clone -b main --recurse-submodule https://github.com/pytorch/pytorch.git
cd pytorch
mkdir ../pytorch-build && cd ../pytorch-build
cmake -DBUILD_SHARED_LIBS:BOOL=ON -DCMAKE_BUILD_TYPE:STRING=Release -DPYTHON_EXECUTABLE:PATH=`which python3` -DCMAKE_INSTALL_PREFIX:PATH=../pytorch-install ../pytorch
cmake --build . --target install
```

---

TITLE: Optimizing HuggingFace BERT Model with torch.compile (Python)
DESCRIPTION: Illustrates the integration of `torch.compile` with a pre-trained BERT model from the HuggingFace Transformers library. It shows how to optimize a complex NLP model for inference, highlighting that only one line of code is needed to apply `torch.compile`. The example also notes that removing GPU device placement will generate C++ kernels for CPU optimization.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.rst#_snippet_3

LANGUAGE: python
CODE:

```
import torch
from transformers import BertTokenizer, BertModel
# Copy pasted from here https://huggingface.co/bert-base-uncased
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
model = BertModel.from_pretrained("bert-base-uncased").to(device="cuda:0")
model = torch.compile(model, backend="inductor") # This is the only line of code that we changed
text = "Replace me by any text you'd like."
encoded_input = tokenizer(text, return_tensors='pt').to(device="cuda:0")
output = model(**encoded_input)
```

---

TITLE: Trigger PyTorch Windows Rebuild (Setup Script)
DESCRIPTION: Rebuilds and installs PyTorch using its setup script with CMake.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Debugging-Windows-with-Remote-Desktop-or-CDB-(CLI-windbg)-on-CircleCI.md#_snippet_6

LANGUAGE: python
CODE:

```
python setup.py install --cmake
```

---

TITLE: MacOS PyTorch Build Dependencies
DESCRIPTION: Installs MKL for math acceleration on Intel x86 processors and packages required for torch.distributed functionality on MacOS.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Install-Dependencies.md#_snippet_2

LANGUAGE: bash
CODE:

```
# Add this package on intel x86 processor machines only
conda install mkl mkl-include

# Add these packages if torch.distributed is needed
conda install pkg-config libuv
```

---

TITLE: Building PyTorch Documentation Prerequisites
DESCRIPTION: Commands to install the necessary Python packages for building PyTorch documentation. This includes installing requirements from a file and ensuring `katex` is available in the system's PATH.

SOURCE: https://github.com/pytorch/pytorch/blob/main/CONTRIBUTING.md#_snippet_23

LANGUAGE: bash
CODE:

```
cd docs
pip install -r requirements.txt
# `katex` must also be available in your PATH.
# npm install -g katex
```

---

TITLE: PyTorch CUDA Basics Wiki Link
DESCRIPTION: A link to the PyTorch wiki page for comprehensive CUDA basics and development information.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Development-Tips.md#_snippet_20

LANGUAGE: APIDOC
CODE:

```
See more cuda development tips [here](https://github.com/pytorch/pytorch/wiki/CUDA-basics)
```

---

TITLE: PyTorch Tutorials
DESCRIPTION: Tutorials for using PyTorch, built using Sphinx-Gallery from executable Python source files or reStructuredText (rst) files. They help users understand specific tasks or concepts.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/community/contribution_guide.rst#_snippet_4

LANGUAGE: python
CODE:

```
Site: https://pytorch.org/tutorials
GitHub: https://github.com/pytorch/tutorials
```

---

TITLE: Optimizing ResNet50 with torch.compile from PyTorch Hub (Python)
DESCRIPTION: Demonstrates how to apply `torch.compile` to a pre-trained ResNet50 model loaded from PyTorch Hub for inference. This showcases `torch.compile`'s ability to optimize larger, real-world models, leveraging backends like 'inductor' for performance gains.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_get_started.rst#_snippet_2

LANGUAGE: python
CODE:

```
import torch
model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet50', pretrained=True)
opt_model = torch.compile(model, backend="inductor")
opt_model(torch.randn(1,3,64,64))
```

---

TITLE: Example Benchmark Commands
DESCRIPTION: These are example commands demonstrating how to run PyTorch benchmarks for performance testing on both training and inference workloads using different scripts and configurations.

SOURCE: https://github.com/pytorch/pytorch/blob/main/benchmarks/dynamo/README.md#_snippet_8

LANGUAGE: shell
CODE:

```
./benchmarks/dynamo/torchbench.py --performance --training --amp --backend=inductor --output=torchbench_training.csv
./benchmarks/dynamo/torchbench.py --performance --inference --bfloat16 --backend=inductor --output=torchbench_inference.csv

./benchmarks/dynamo/huggingface.py --performance --training --amp --backend=inductor --output=huggingface_training.csv
./benchmarks/dynamo/huggingface.py --performance --inference --bfloat16 --backend=inductor --output=huggingface_inference.csv

./benchmarks/dynamo/timm_models.py --performance --training --amp --backend=inductor --output=timm_models_training.csv
./benchmarks/dynamo/timm_models.py --performance --inference --bfloat16 --backend=inductor --output=timm_models_inference.csv
```

---

TITLE: PyTorch Installation and Previous Versions
DESCRIPTION: Provides links to resources for installing PyTorch and accessing instructions for previous versions. This is crucial for users who need to set up PyTorch or manage older installations.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/PyTorch-Versions.md#_snippet_1

LANGUAGE: markdown
CODE:

```
Installation instructions can be found on the PyTorch [Get Started](https://pytorch.org/get-started/locally/) page.

You can
visit [this page](https://pytorch.org/get-started/previous-versions/) for instructions for
previous versions.
```

---

TITLE: Install PyTorch on macOS
DESCRIPTION: Installs PyTorch in development mode on macOS using the setup.py script.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/setup/Build-PyTorch.md#_snippet_0

LANGUAGE: bash
CODE:

```
python3 setup.py develop
```

---

TITLE: PyTorch Compile for Training
DESCRIPTION: Shows how to apply torch.compile to a training loop. It includes model definition, optimizer setup, and a compiled training function.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/torch.compiler_troubleshooting.md#_snippet_11

LANGUAGE: python
CODE:

```
# training
model = ...
opt = torch.optim.Adam(model.parameters())

@torch.compile
def train(mod, data):
    opt.zero_grad(True)
    pred = mod(data[0])
    loss = torch.nn.CrossEntropyLoss()(pred, data[1])
    loss.backward()
    opt.step()

for _ in range(N_ITERS):
    inp = ...
    train(model, inp)
```

---

TITLE: Install Common Dependencies
DESCRIPTION: Installs common build dependencies like CMake and Ninja, and then installs project-specific requirements from a file.

SOURCE: https://github.com/pytorch/pytorch/blob/main/README.md#_snippet_6

LANGUAGE: bash
CODE:

```
conda install cmake ninja
# Run this command from the PyTorch directory after cloning the source code using the “Get the PyTorch Source“ section below
pip install -r requirements.txt
```

---

TITLE: Setup PyTorch Development Environment
DESCRIPTION: Clones the PyTorch repository, sets up the development environment with virtual environment activation, and provides options for CUDA or ROCm pre-built binaries.

SOURCE: https://github.com/pytorch/pytorch/blob/main/CONTRIBUTING.md#_snippet_0

LANGUAGE: bash
CODE:

```
git clone git@github.com:<USERNAME>/pytorch.git
cd pytorch
git remote add upstream git@github.com:pytorch/pytorch.git

make setup-env
# Or run `make setup-env-cuda` for pre-built CUDA binaries
# Or run `make setup-env-rocm` for pre-built ROCm binaries
source venv/bin/activate  # or `& .\venv\Scripts\Activate.ps1` on Windows
```

---

TITLE: Getting Started with NativeRT ModelRunner
DESCRIPTION: Demonstrates the minimal C++ code required to load and run inference using NativeRT's ModelRunner with a PT2 archive. It initializes the ModelRunner with model details, device configuration, and executor type, then loads sample inputs and executes the model.

SOURCE: https://github.com/pytorch/pytorch/blob/main/torch/nativert/OVERVIEW.md#_snippet_0

LANGUAGE: cpp
CODE:

```
#include <nativert/core/ModelRunner.h>

int main(int argc, char** argv) {
  auto model_name = "my_model";
  auto model_path = "/path/to/my/model";
  const auto device = torch::Device(torch::kCUDA, 0);
  ExecutorType executor_type = ExecutorType::INTERPRETER;

  RuntimeConfigs cfg;
  auto reader =
      std::make_shared<caffe2::serialize::PyTorchStreamReader>(
          std::make_unique<caffe2::serialize::FileAdapter>(
              build::getResourcePath(std::move(model_path)).string()));

  auto runner = ModelRunner(
    std::move(reader),
    std::move(model_name),
    executor_type,
    std::move(cfg),
    Placement(device));

  const auto [args, kwargs] =
      runner.loadSampleInputs(std::move(reader), Placement(device));

  auto output = runner.run(args, kwargs);

  return 0;
}
```

---

TITLE: Build PyTorch with MKL and MAGMA on Windows
DESCRIPTION: This script demonstrates how to download and set up MKL and MAGMA components for building PyTorch on Windows. It includes steps for downloading the necessary 7z archives, extracting them, and setting environment variables for MKL and MAGMA paths. Ensure you have 7z and curl installed.

SOURCE: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/windows.rst#_snippet_0

LANGUAGE: bat
CODE:

```
REM Make sure you have 7z and curl installed.

REM Download MKL files
curl https://s3.amazonaws.com/ossci-windows/mkl_2020.2.254.7z -k -O
7z x -aoa mkl_2020.2.254.7z -omkl

REM Download MAGMA files
REM version available:
REM 2.5.4 (CUDA 10.1 10.2 11.0 11.1) x (Debug Release)
REM 2.5.3 (CUDA 10.1 10.2 11.0) x (Debug Release)
REM 2.5.2 (CUDA 9.2 10.0 10.1 10.2) x (Debug Release)
REM 2.5.1 (CUDA 9.2 10.0 10.1 10.2) x (Debug Release)
set "CUDA_PREFIX=cuda102"
set "CONFIG=release"
set "HOST=https://s3.amazonaws.com/ossci-windows"
curl -k "%HOST%/magma_2.5.4_%CUDA_PREFIX%_%CONFIG%.7z" -o magma.7z
7z x -aoa magma.7z -omagma

REM Setting essential environment variables
set "CMAKE_INCLUDE_PATH=%cd%\mkl\include"
set "LIB=%cd%\mkl\lib;%LIB%"
set "MAGMA_HOME=%cd%\magma"
```

---

TITLE: Start Lightweight HTTP Server
DESCRIPTION: Starts a lightweight HTTP server on a remote machine to serve documentation files, allowing local access.

SOURCE: https://github.com/pytorch/pytorch/blob/main/CONTRIBUTING.md#_snippet_31

LANGUAGE: python
CODE:

```
python -m http.server 8000 <path_to_html_output>

```

---

TITLE: Tensor Initialization Examples
DESCRIPTION: Provides examples of tensor initialization with different shapes, data types, and strides, as used in various PyTorch operator demonstrations.

SOURCE: https://github.com/pytorch/pytorch/blob/main/benchmarks/dynamo/microbenchmarks/operator_inp_logs/timm_train/pit_b_224_training.txt#_snippet_19

LANGUAGE: python
CODE:

```
cnt: 1, (([T([64, 1, 256], f16, stride=(0, 256, 1)), T([64, 961, 256], f16, stride=(246016, 1, 961))], 1), {})
```

LANGUAGE: python
CODE:

```
cnt: 1, (([T([64, 1, 512], f16), T([64, 256, 512], f16, stride=(131072, 1, 256))], 1), {})
```

LANGUAGE: python
CODE:

```
cnt: 1, (([T([64, 1, 1024], f16), T([64, 64, 1024], f16, stride=(65536, 1, 64))], 1), {})
```

---

TITLE: Install Dependencies
DESCRIPTION: Installs the necessary Python packages for running the benchmarks. Ensure PyTorch is already installed.

SOURCE: https://github.com/pytorch/pytorch/blob/main/benchmarks/dynamo/genai_layers/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
pip install -r requirements.txt
```

---

TITLE: Running PyTorch Tests with run_test.py
DESCRIPTION: Explains how to use the `run_test.py` script for running PyTorch tests, which offers advanced features like selective runs, distributed testing, and CI optimizations. It also covers installing dependencies.

SOURCE: https://github.com/pytorch/pytorch/blob/main/__wiki__/Running-and-writing-tests.md#_snippet_2

LANGUAGE: python
CODE:

```
python test/run_test.py
python test/run_test.py -h
pip install -r .ci/docker/requirements-ci.txt
```
