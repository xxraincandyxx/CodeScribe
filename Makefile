# Makefile

.PHONY: style show-files clean-logs clean-cache

style:
	@echo "Formatting Python files... 💅"
	@find . -name '*.py' -exec ruff format --config pyproject.toml {} + -o -name '*.pyi' -exec ruff format --config pyproject.toml {} +
	@echo "Formatting C/CPP files... 💅"
	@$(foreach file,$(C_FORMATTABLE_FILES), clang-format -i $(file) && echo "✨ Formatted: $(file)";)
	@echo "Formatting done! 💖"

show-files:
	@echo "📂 Files to be formatted:"
	@$(foreach file,$(C_FORMATTABLE_FILES), echo $(file);)

clean-logs:
	# Remove all logs dirs
	find . -type d -name "logs" -exec rm -rf {} +
	find . -type d -name "log" -exec rm -rf {} +

	# Remove all log files
	find . -name '*.log' -delete

	@echo "Clean complete!"

clean-cache:
	# Remove Python cache directories
	find . -type d -name '__pycache__' -exec rm -rf {} +

	# Remove macOS-specific files
	find . -name '.DS_Store' -delete

	@echo "Clean complete!"


# Makefile ends here
