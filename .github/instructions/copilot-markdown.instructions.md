Developer: # AI-Assisted Markdown Documentation Guidelines

**Purpose:**
Establish clear, consistent standards for generating and maintaining Markdown documentation within Cortex OS projects, focusing on clarity, accessibility, and automation compliance.

**Applies to:** All Markdown (`.md`, `.mdx`) files across the repository.

---

## Canonical References
- [Code Review Standards](./copilot-codeReview.instructions.md)
- [Commit Message Standards](./copilot-commitMessage.instructions.md)

---

## 1. Metadata Headers
Every Markdown documentation file must have a standardized metadata header. Continuous Integration (CI) checks will fail on missing or incomplete headers.

- **Project & Specification Documents:**
  
  Use an HTML comment block as a header at the top of files such as `README.md`, `CONTRIBUTING.md`, or other instruction docs:
  
  ```md
  <!--
  file_path: "<relative/path/from/repo/root>"
  description: "Concise document purpose statement."
  maintainer: "@github-handle"
  last_updated: "YYYY-MM-DD"
  version: "X.Y.Z"
  status: "active"
  -->
  ```

- **Content & Blog Posts:**
  
  Use YAML front-matter for posts (e.g., in `/content/posts/`):
  
  ```yaml
  ---
  post_title: "How to Write Accessible Code for AI"
  author: "@jamiescottcraik"
  post_slug: "accessible-code-for-ai"
  post_date: "2025-07-13"
  categories: ["Accessibility", "AI"]
  tags: ["WCAG", "Development"]
  summary: "A guide to building inclusive applications with AI at the core."
  ai_note: "Draft assisted by Ollama Llama3."
  ---
  ```

---

## 2. Content and Formatting Standards
- **Headings:** The H1 (title) is implicit. The first visible heading should be `##`, with `###` for subsections. Avoid deeper heading levels; break files up if needed.
- **Line Length:** Limit lines to a maximum of 100 characters.
- **Lists:** Use `-` for unordered lists and `1.` for ordered lists. Indent nested lists by two spaces.
- **Code Blocks:** Use fenced code blocks with the language specified. For whole file examples, include the filename if supported.
- **Links:** Use descriptive text for hyperlinks; avoid non-contextual phrases like "click here".
- **Images:** Always provide meaningful alt text.
- **Whitespace:** Place a single blank line between block elements. Each file ends with a newline, and trailing spaces are not allowed.
- **HTML:** Use native Markdown whenever possible; avoid raw HTML markup.

---

## 3. File Naming and Organization
- **Project documentation:** Store in `/docs`.
- **Component documentation:** Place `README.md` files next to their components (e.g., `src/components/ui/button/README.md`).
- **Blog posts:** Place in `content/posts/`. Use kebab-case filenames prefixed with date: `YYYY-MM-DD-title.md`.

---

## 4. Accessibility Guidelines
- Use semantic, orderly heading structures for navigation.
- Provide captions for complex images in addition to alt text.
- Ensure all color choices and badge contrast ratios meet WCAG 2.2 standards.

---

## 5. Automation and Enforcement
- Automated checks (such as markdownlint, remark-lint, and custom accessibility tests) are required and enforced via CI.

---

Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual, not implementation-level.
For irreversible actions or external system changes, require explicit user confirmation before proceeding.

**End of Specification**

© 2025 brAInwav LLC – Strive for inclusivity, resilience, and security in every line of documentation.
