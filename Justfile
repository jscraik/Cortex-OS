set shell := ["/opt/homebrew/bin/bash", "-lc"]

alias default := help

help:
	@echo "Available recipes:"
	@echo "  scout PATTERN PATH         - repo-aware pattern search (rg, semgrep, ast-grep)"
	@echo "  codemod FIND REPLACE PATH  - comby rewrite via agent toolkit"
	@echo "  verify LISTFILE            - run validators against files listed"
	@echo "  tsq QUERY [PATH]           - tree-sitter query helper"
	@echo "  apply-diff DIFF            - apply unified diff file"
	@echo "  apply-diff-stdin           - apply unified diff from stdin"

scout pattern path:
	/opt/homebrew/bin/bash tools/agent-toolkit/rg_search.sh {{pattern}} {{path}}
	/opt/homebrew/bin/bash tools/agent-toolkit/semgrep_search.sh {{pattern}} {{path}} || true
	/opt/homebrew/bin/bash tools/agent-toolkit/astgrep_search.sh {{pattern}} {{path}} || true

codemod find replace path:
	/opt/homebrew/bin/bash tools/agent-toolkit/comby_rewrite.sh {{find}} {{replace}} {{path}}

verify listfile:
	/opt/homebrew/bin/bash tools/agent-toolkit/run_validators.sh {{listfile}}

tsq query path=".":
	/opt/homebrew/bin/bash tools/agent-toolkit/treesitter_query.sh {{query}} {{path}}

apply-diff diff:
	/opt/homebrew/bin/bash tools/agent-toolkit/patch_apply.sh --diff {{diff}}

apply-diff-stdin:
	/opt/homebrew/bin/bash tools/agent-toolkit/patch_apply.sh --stdin
