#!/usr/bin/env python3
from cortex_mlx.router import ModelRouter


def main():
    router = ModelRouter()
    out = router.chat("Hello from Cortex-OS!")
    print(out)


if __name__ == "__main__":
    main()
