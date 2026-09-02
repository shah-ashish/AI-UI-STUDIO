import os

# Base URL for the model API (e.g. OpenAI, Ollama, OpenRouter, or local vLLM)
model_base_url = os.getenv("MODEL_BASE_URL", "http://localhost:11434/v1")

# Research model name
research_model_name = os.getenv("RESEARCH_MODEL_NAME", "deepseek-r1")

# Coding model name
coding_model_name = os.getenv("CODING_MODEL_NAME", "deepseek-coder")

# Request timeout in seconds
timeout = int(os.getenv("TIMEOUT", 60))
