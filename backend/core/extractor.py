"""
Core logic for extracting project structure and file contents into markdown.

This module contains the ProjectExtractor class, which is responsible for
traversing a project directory, applying include/ignore rules, reading file
contents, and formatting the output as a single markdown string.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any

import pathspec

# --- Language and Comment Removal Definitions ---

# Maps file extensions to their corresponding comment removal functions.
COMMENT_REMOVERS = {
  ".py": lambda c: re.sub(r"(\"\"\"[\s\S]*?\"\"\"|'''[\s\S]*?'''|#.*)", "", c),
  ".js": lambda c: re.sub(r"(/\*[\s\S]*?\*/|//.*)", "", c),
  ".jsx": lambda c: re.sub(r"(/\*[\s\S]*?\*/|//.*)", "", c),
  ".ts": lambda c: re.sub(r"(/\*[\s\S]*?\*/|//.*)", "", c),
  ".tsx": lambda c: re.sub(r"(/\*[\s\S]*?\*/|//.*)", "", c),
  ".html": lambda c: re.sub(r"<!--[\s\S]*?-->", "", c),
  ".css": lambda c: re.sub(r"/\*[\s\S]*?\*/", "", c),
  # Add other languages as needed
}

# Maps file extensions to markdown language tags for code blocks.
LANGUAGE_MAP = {
  ".py": "python",
  ".js": "javascript",
  ".jsx": "jsx",
  ".ts": "typescript",
  ".tsx": "tsx",
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
  "default": "",
}


class ProjectExtractor:
  """
  Extracts a project's structure and file contents into a markdown format.
  """

  def __init__(
    self,
    root_path: str,
    ignore_patterns_str: str,
    include_only_paths_str: str,
    max_file_size_kb: int,
    ignore_comments: bool = False,
    external_files_data: Optional[List[Dict[str, str]]] = None,
  ):
    """
    Initializes the ProjectExtractor.

    Args:
        root_path: The absolute path to the project's root directory.
        ignore_patterns_str: A string of .gitignore-style patterns, one per line.
        include_only_paths_str: A string of specific files/directories to include.
        max_file_size_kb: The maximum size for a file to be included, in KB.
        ignore_comments: If True, comments will be stripped from supported files.
        external_files_data: A list of dictionaries for external files to include.
    """
    self.root_path = Path(root_path).resolve() if root_path else None
    self.ignore_comments = ignore_comments
    self.max_file_size_bytes = max_file_size_kb * 1024
    self.external_files = external_files_data or []

    ignore_lines = [p.strip() for p in ignore_patterns_str.splitlines() if p.strip()]
    self.spec = pathspec.PathSpec.from_lines("gitwildmatch", ignore_lines)

    self.include_only_paths = [p.strip() for p in include_only_paths_str.splitlines() if p.strip()]

  def _get_files_to_process(self) -> List[Path]:
    """
    Determines the final list of local project files to process.

    Returns:
        A sorted list of Path objects representing files to be included.
    """
    if not self.root_path:
      return []

    initial_file_set = set()

    if not self.include_only_paths:
      # Scan the entire project directory
      for p in self.root_path.rglob("*"):
        initial_file_set.add(p)
    else:
      # Scan only specified files/directories
      for rel_path in self.include_only_paths:
        full_path = self.root_path / rel_path
        if not full_path.exists():
          print(f"Warning: Specified include path does not exist: {full_path}")
          continue
        if full_path.is_file():
          initial_file_set.add(full_path)
        elif full_path.is_dir():
          for p in full_path.rglob("*"):
            initial_file_set.add(p)

    # Filter the collected files using the ignore spec
    final_files = [p for p in initial_file_set if not self.spec.match_file(str(p.relative_to(self.root_path)))]

    return sorted([f for f in final_files if f.is_file()])

  def _generate_file_tree(self, file_paths: List[Path]) -> str:
    """
    Generates a string representation of the file tree.

    Args:
        file_paths: A list of file paths to include in the tree.

    Returns:
        A formatted string representing the project structure.
    """
    tree: Dict[str, Any] = {}
    for path in file_paths:
      parts = path.relative_to(self.root_path).parts
      current_level = tree
      for i, part in enumerate(parts):
        if i == len(parts) - 1:  # File
          current_level[part] = None
        else:  # Directory
          current_level = current_level.setdefault(part, {})

    tree_string = self._build_tree_string(tree)
    return f"Project Structure:\n```\n{tree_string}\n```\n"

  def _build_tree_string(self, tree: Dict[str, Any], prefix: str = "") -> str:
    """
    Recursively builds the file tree string for display.

    Args:
        tree: The dictionary representation of the file tree.
        prefix: The prefix for the current recursion level (for indentation).

    Returns:
        The formatted tree string.
    """
    lines = []
    entries = sorted(tree.keys())
    for i, name in enumerate(entries):
      connector = "└── " if i == len(entries) - 1 else "├── "
      lines.append(f"{prefix}{connector}{name}")
      if isinstance(tree[name], dict):  # Directory
        extension = "    " if i == len(entries) - 1 else "│   "
        # BUG FIX: Use append, not extend. extend() iterates over the string.
        lines.append(self._build_tree_string(tree[name], prefix + extension))
    return "\n".join(lines)

  def _process_single_file(self, file_path: Path) -> str:
    """
    Reads, processes, and formats the content of a single file.

    Args:
        file_path: The Path object for the file to process.

    Returns:
        A markdown-formatted string containing the file's content or an error.
    """
    try:
      if file_path.stat().st_size > self.max_file_size_bytes:
        return f"[File skipped: Exceeds size limit of {self.max_file_size_bytes / 1024} KB]\n"

      with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

      if self.ignore_comments:
        remover = COMMENT_REMOVERS.get(file_path.suffix)
        if remover:
          content = remover(content)

      # Normalize newlines and remove excessive blank lines
      content = re.sub(r"\n\s*\n", "\n\n", content).strip()
      lang_tag = LANGUAGE_MAP.get(file_path.suffix, LANGUAGE_MAP["default"])

      return f"```{lang_tag}\n{content}\n```\n"

    except FileNotFoundError:
      return f"```\n[File not found at path: {file_path}]\n```\n"
    except Exception as e:
      return f"```\n[Error reading file: {e}]\n```\n"

  def extract(self) -> str:
    """
    Main method to generate the full markdown output for the project.

    Returns:
        A single string containing the complete markdown output.
    """
    markdown_parts: List[str] = []

    # Part 1: Process the main project directory (if provided)
    if self.root_path:
      if not self.root_path.is_dir():
        raise ValueError(f"Provided root path '{self.root_path}' is not a valid directory.")

      files_to_process = self._get_files_to_process()
      if files_to_process:
        markdown_parts.append(self._generate_file_tree(files_to_process))
        for file_path in files_to_process:
          relative_path = file_path.relative_to(self.root_path)
          content_md = self._process_single_file(file_path)
          markdown_parts.append(f"---\n**File:** `{relative_path}`\n\n{content_md}")

    # Part 2: Process external files
    if self.external_files:
      markdown_parts.append("\n---\n### External Files\n---")
      for item in self.external_files:
        file_path_str = item.get("path")
        description = item.get("description", "No description provided.")
        if not file_path_str:
          continue

        file_path = Path(file_path_str).resolve()
        header = f"\n**External File:** `{file_path_str}`\n"
        desc_md = f"**Description:**\n> {description}\n\n"
        content_md = self._process_single_file(file_path)
        markdown_parts.append(header + desc_md + content_md)

    if not markdown_parts:
      return "No files were found or selected. Please check your paths and settings."

    return "\n".join(markdown_parts)
