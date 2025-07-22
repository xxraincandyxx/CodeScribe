import os
import re
from pathlib import Path
import pathspec


# --- Comment Removal Logic (Extensible) ---
# ... (This part remains unchanged)
def _remove_python_comments(content):
  content = re.sub(r"#.*", "", content)
  content = re.sub(r"\"\"\"[\s\S]*?\"\"\"", "", content)
  content = re.sub(r"'''[\s\S]*?'''", "", content)
  return content


def _remove_c_style_comments(content):
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
# ... (This part remains unchanged)
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
  "default": "",
}

# --- Main Extraction Logic ---


class ProjectExtractor:
  def __init__(self, root_path, ignore_patterns_str, include_only_paths_str, 
                 max_file_size_kb, ignore_comments=False, external_files_data=None):
    self.root_path = Path(root_path).resolve()
    self.ignore_comments = ignore_comments
    self.max_file_size_bytes = max_file_size_kb * 1024

    # Parse .gitignore style patterns for ignoring files
    ignore_lines = [p.strip() for p in ignore_patterns_str.splitlines() if p.strip()]
    self.spec = pathspec.PathSpec.from_lines("gitwildmatch", ignore_lines)

    # Parse user-specified paths to include
    self.include_only_paths = [p.strip() for p in include_only_paths_str.splitlines() if p.strip()]

    self.external_files = external_files_data or []

  def _get_files_to_process(self):
    """
    Determines the final list of files to be processed based on include/ignore rules.
    """
    initial_file_set = set()

    if not self.include_only_paths:
      # Mode 1: Scan the entire project directory
      for p in self.root_path.rglob("*"):
        initial_file_set.add(p)
    else:
      # Mode 2: Scan only specified files/directories
      for rel_path in self.include_only_paths:
        full_path = self.root_path / rel_path
        if not full_path.exists():
          # You might want to log this or notify the user
          print(f"Warning: Specified include path does not exist: {full_path}")
          continue
        if full_path.is_file():
          initial_file_set.add(full_path)
        elif full_path.is_dir():
          for p in full_path.rglob("*"):
            initial_file_set.add(p)

    # Filter the collected files using the ignore spec
    final_files = []
    for p in initial_file_set:
      # Path relative to the root is needed for pathspec matching
      try:
        relative_path = p.relative_to(self.root_path)
        if not self.spec.match_file(str(relative_path)):
          final_files.append(p)
      except ValueError:
        # This can happen if a path is outside the root, though our logic should prevent it.
        continue

    return [f for f in final_files if f.is_file()]

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

    return "Project Structure:\n```\n" + self._build_tree_string(tree) + "\n```\n"

  def _build_tree_string(self, tree, prefix=""):
    """Recursively builds the tree string for display."""
    lines = []
    entries = sorted(tree.keys())
    for i, name in enumerate(entries):
      connector = "└── " if i == len(entries) - 1 else "├── "
      lines.append(f"{prefix}{connector}{name}")
      if isinstance(tree[name], dict):  # It's a directory
        extension = "    " if i == len(entries) - 1 else "│   "
        # *** BUG FIX IS HERE: Changed extend to append ***
        # extend() was iterating over the string, adding char by char.
        # append() adds the entire multi-line string as one element.
        lines.append(self._build_tree_string(tree[name], prefix + extension))
    return "\n".join(lines)
  
  def _process_single_file(self, file_path, relative_path_str):
        """Helper to process one file and return its markdown content."""
        # Check file size
        try:
            file_size = file_path.stat().st_size
            if file_size > self.max_file_size_bytes:
                return f"[File skipped: Exceeds size limit of {self.max_file_size_bytes / 1024} KB]\n"
        except FileNotFoundError:
            return f"[File not found at path: {file_path}]\n"
        
        # Read and process content
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            if self.ignore_comments:
                remover = COMMENT_REMOVERS.get(file_path.suffix)
                if remover:
                    content = remover(content)
            
            content = re.sub(r'\n\s*\n', '\n\n', content).strip()
            lang_tag = LANGUAGE_MAP.get(file_path.suffix, LANGUAGE_MAP['default'])
            
            return f"```{lang_tag}\n{content}\n```\n"

        except Exception as e:
            return f"```\n[Error reading file: {e}]\n```\n"

  def extract(self):
        """Main method to generate the full markdown output."""
        markdown_parts = []

        # --- Part 1: Process the main project directory (if provided) ---
        if self.root_path:
            if not self.root_path.is_dir():
                raise ValueError(f"Error: Provided root path '{self.root_path}' is not a valid directory.")

            files_to_process = self._get_files_to_process()
            if files_to_process:
                tree_string = self._generate_file_tree(files_to_process)
                markdown_parts.append(tree_string)
            
                for file_path in sorted(files_to_process):
                    relative_path = file_path.relative_to(self.root_path)
                    content_md = self._process_single_file(file_path, str(relative_path))
                    markdown_parts.append(f"---\n**File:** `{relative_path}`\n\n{content_md}")
        
        # --- Part 2: Process external files ---
        if self.external_files:
            markdown_parts.append("\n---\n### External Files\n---")
            for item in self.external_files:
                file_path_str = item.get('path')
                description = item.get('description', 'No description provided.')
                
                if not file_path_str:
                    continue

                file_path = Path(file_path_str).resolve()
                
                header = f"\n**External File:** `{file_path_str}`\n"
                desc_md = f"**Description:**\n> {description}\n\n"
                content_md = self._process_single_file(file_path, file_path_str)
                
                markdown_parts.append(header + desc_md + content_md)

        if not markdown_parts:
            return "No files were selected or found to process. Please check your paths and settings."

        return "\n".join(markdown_parts)
