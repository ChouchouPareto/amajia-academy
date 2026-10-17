"""Tests never use live model credentials or published default invitations."""
import os
import secrets

os.environ["APP_ENV"] = "test"
os.environ["LEARNER_INVITE_CODE"] = secrets.token_hex(16)
os.environ["ADMIN_INVITE_CODE"] = secrets.token_hex(16)
for key in ("AI_API_KEY", "DASHSCOPE_API_KEY", "AI_EMBEDDING_MODEL"):
    os.environ[key] = ""
