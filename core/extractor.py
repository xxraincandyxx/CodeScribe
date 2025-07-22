import os
import re
from pathlib import Path
import pathspec

# --- Comment Removal Logic (Extensible) ---


def _remove_python_comments(content):
  # Remove single-line comments
  content = re.sub(r"#.*", "", content)
  # Remove multi-line string comments (docstrings) - basic version
  content = re.sub(r"\"\"\"[\s\S]*?\"\"\"", "", content)
  content = re.sub(r"'''[\s\S]*?'''", "", content)
  return content


def _remove_c_style_comments(content):
  # Remove single-line // comments and multi-line /* ... */ comments
  content = re.sub(r"//.*", "", content)
  content = re.sub(r"/\*[\s\S]*?\*/", "", content)
  return content


def _remove_html_comments(content):
  return re.sub(r"<!--[\s\S]*?-->", "", content)


COMMENT_REMOVERS = {
  ".py": _remove_python_comments,
  ".js": _remove_c_style_comments,
  ".c": _remove_c_style_comments,
  ".cpp": _remove_c_style_comments,
  ".h": _remove_c_style_comments,
  ".hpp": _remove_c_style_comments,
  ".css": _remove_c_style_comments,
  ".html": _remove_html_comments,
  ".xml": _remove_html_comments,
}

# --- Language Mapping for Markdown ---

LANGUAGE_MAP = {
  ".py": "python",
  ".js": "javascript",
  ".html": "html",
  ".css": "css",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".java": "java",
  ".sh": "shell",
  ".rb": "ruby",
  ".md": "markdown",
  ".json": "json",
  ".xml": "xml",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".sql": "sql",
  ".go": "go",
  ".rs": "rust",
  "default": "",  # For unknown file types
}

# --- Main Extraction Logic ---


class ProjectExtractor:
  def __init__(self, root_path, ignore_patterns_str, ignore_comments=False):
    self.root_path = Path(root_path).resolve()
    self.ignore_comments = ignore_comments

    # Create a pathspec object from .gitignore-style patterns
    ignore_lines = [p.strip() for p in ignore_patterns_str.splitlines() if p.strip()]
    self.spec = pathspec.PathSpec.from_lines("gitwildmatch", ignore_lines)

  def _get_files_to_include(self):
    """Walks the directory and yields files that are not ignored."""
    all_files = []
    for p in self.root_path.rglob("*"):
      # Path relative to the root, needed for pathspec matching
      relative_path = p.relative_to(self.root_path)
      if not self.spec.match_file(str(relative_path)):
        all_files.append(p)
    return all_files

  def _generate_file_tree(self, file_paths):
    """Generates a string representation of the file tree."""
    tree = {}
    for path in file_paths:
      if path.is_dir():
        continue
      relative_path = path.relative_to(self.root_path)
      parts = relative_path.parts
      current_level = tree
      for i, part in enumerate(parts):
        if i == len(parts) - 1:  # It's a file
          current_level[part] = None
        else:  # It's a directory
          if part not in current_level:
            current_level[part] = {}
          current_level = current_level[part]

    return "Project Structure:\n```\n" + self._build_tree_string(tree) + "```\n"

  def _build_tree_string(self, tree, prefix=""):
    """Recursively builds the tree string for display."""
    lines = []
    entries = sorted(tree.keys())
    for i, name in enumerate(entries):
      connector = "└── " if i == len(entries) - 1 else "├── "
      lines.append(f"{prefix}{connector}{name}")
      if isinstance(tree[name], dict):  # It's a directory
        extension = "    " if i == len(entries) - 1 else "│   "
        lines.extend(self._build_tree_string(tree[name], prefix + extension))
    return "\n".join(lines)

  def extract(self):
    """Main method to generate the full markdown output."""
    if not self.root_path.is_dir():
      raise ValueError(f"Error: Provided path '{self.root_path}' is not a valid directory.")

    files_to_process = [f for f in self._get_files_to_include() if f.is_file()]

    # 1. Generate the file structure tree
    tree_string = self._generate_file_tree(files_to_process)

    # 2. Generate content for each file
    markdown_parts = [tree_string]

    for file_path in sorted(files_to_process):
      relative_path = file_path.relative_to(self.root_path)

      try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
          content = f.read()

        # Optional: Remove comments
        if self.ignore_comments:
          remover = COMMENT_REMOVERS.get(file_path.suffix)
          if remover:
            content = remover(content)

        # Clean up excessive newlines after comment removal
        content = re.sub(r"\n\s*\n", "\n\n", content).strip()

        lang_tag = LANGUAGE_MAP.get(file_path.suffix, LANGUAGE_MAP["default"])

        markdown_parts.append(f"---\n**File:** `{relative_path}`\n\n```{lang_tag}\n{content}\n```\n")

      except Exception as e:
        # Handle binary files or read errors gracefully
        markdown_parts.append(f"---\n**File:** `{relative_path}`\n\n```\n[Error reading file: {e}]\n```\n")

    return "\n".join(markdown_parts)
