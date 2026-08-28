"""Tool contracts available to the AI coach orchestrator.

The model never receives database access. Runtime code resolves a reviewed
Tool contract, validates its access mode, then executes application services.
"""

from dataclasses import dataclass
from typing import Literal


ToolAccess = Literal["read", "write"]


@dataclass(frozen=True)
class CoachTool:
    name: str
    version: str
    purpose: str
    access: ToolAccess
    requires_confirmation: bool


TOOLS: dict[str, CoachTool] = {
    "retrieve_knowledge": CoachTool("retrieve_knowledge", "1.0.0", "检索已审核、已发布的课程知识", "read", False),
    "get_learning_state": CoachTool("get_learning_state", "1.0.0", "读取当前用户的课程与测评状态", "read", False),
    "retrieve_media": CoachTool("retrieve_media", "0.1.0-reserved", "获取已审核且授权有效的标准媒体", "read", False),
    "save_learning_progress": CoachTool("save_learning_progress", "1.0.0", "保存用户明确完成的学习步骤", "write", True),
    "submit_learning_check": CoachTool("submit_learning_check", "1.0.0", "提交用户主动选择的理解检查答案", "write", True),
    "schedule_review": CoachTool("schedule_review", "0.1.0-reserved", "根据错题建立复习任务", "write", True),
}


def get_tool(name: str) -> CoachTool:
    try:
        return TOOLS[name]
    except KeyError as exc:
        raise ValueError(f"Unknown coach tool: {name}") from exc

