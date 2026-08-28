from collections import defaultdict

from .assessment_bank_v2 import ASSESSMENT_VERSION, POST_QUESTIONS_V2, PRE_QUESTIONS_V2


LEGACY_PRE_QUESTIONS = [
    {"id": "pre-h01", "knowledge_point": "职业规范", "prompt": "开始家政服务前，第一件更合适的事是什么？", "options": [{"id": "a", "label": "直接开始"}, {"id": "b", "label": "确认服务范围和注意事项"}, {"id": "c", "label": "翻看私人文件"}], "correct_answer": "b", "is_safety_critical": False},
    {"id": "pre-h02", "knowledge_point": "清洁剂安全", "prompt": "使用不熟悉的清洁剂前，应该先做什么？", "options": [{"id": "a", "label": "看标签并保持通风"}, {"id": "b", "label": "和其他产品混合"}, {"id": "c", "label": "凭气味判断"}], "correct_answer": "a", "is_safety_critical": True},
    {"id": "pre-h03", "knowledge_point": "厨房顺序", "prompt": "厨房日常清洁更合适的顺序是？", "options": [{"id": "a", "label": "先地面后柜门"}, {"id": "b", "label": "从高处到低处"}, {"id": "c", "label": "哪里脏先擦哪里"}], "correct_answer": "b", "is_safety_critical": False},
    {"id": "pre-h04", "knowledge_point": "卫生间分区", "prompt": "卫生间不同区域的抹布应该怎样使用？", "options": [{"id": "a", "label": "尽量分区"}, {"id": "b", "label": "一块擦全部"}, {"id": "c", "label": "只看颜色"}], "correct_answer": "a", "is_safety_critical": True},
    {"id": "pre-h05", "knowledge_point": "整理隐私", "prompt": "遇到不确定能不能丢的客户物品怎么办？", "options": [{"id": "a", "label": "直接丢"}, {"id": "b", "label": "先放到一边并确认"}, {"id": "c", "label": "带走"}], "correct_answer": "b", "is_safety_critical": False},
    {"id": "pre-h06", "knowledge_point": "衣物洗涤", "prompt": "洗衣前应该先检查什么？", "options": [{"id": "a", "label": "洗标和口袋"}, {"id": "b", "label": "只看衣服大小"}, {"id": "c", "label": "先加清洁剂"}], "correct_answer": "a", "is_safety_critical": False},
]

LEGACY_POST_QUESTIONS = [
    {"id": "post-h01", "knowledge_point": "职业规范", "prompt": "客户没有说明一件贵重物品能否移动，你应该？", "options": [{"id": "a", "label": "先确认"}, {"id": "b", "label": "直接移动"}, {"id": "c", "label": "藏起来"}], "correct_answer": "a", "is_safety_critical": False},
    {"id": "post-h02", "knowledge_point": "清洁剂安全", "prompt": "清洁时闻到刺激气味，哪项做法更合适？", "options": [{"id": "a", "label": "继续加量"}, {"id": "b", "label": "停止使用并通风，按标签处理"}, {"id": "c", "label": "混入另一种产品"}], "correct_answer": "b", "is_safety_critical": True},
    {"id": "post-h03", "knowledge_point": "厨房顺序", "prompt": "柜门、台面和地面应优先按什么顺序？", "options": [{"id": "a", "label": "地面、台面、柜门"}, {"id": "b", "label": "柜门、台面、地面"}, {"id": "c", "label": "同时进行"}], "correct_answer": "b", "is_safety_critical": False},
    {"id": "post-h04", "knowledge_point": "卫生间分区", "prompt": "清洁卫生间地面时，哪项更安全？", "options": [{"id": "a", "label": "最后从里向外并提醒湿滑"}, {"id": "b", "label": "最先把出口弄湿"}, {"id": "c", "label": "关闭通风"}], "correct_answer": "a", "is_safety_critical": True},
    {"id": "post-h05", "knowledge_point": "整理隐私", "prompt": "整理私人文件时正确做法是？", "options": [{"id": "a", "label": "查看内容后分类"}, {"id": "b", "label": "保持原状并请客户确认"}, {"id": "c", "label": "自行销毁"}], "correct_answer": "b", "is_safety_critical": False},
    {"id": "post-h06", "knowledge_point": "衣物洗涤", "prompt": "一件衣物洗标看不懂时应该？", "options": [{"id": "a", "label": "用最强程序"}, {"id": "b", "label": "先向物主确认"}, {"id": "c", "label": "和深色衣物一起洗"}], "correct_answer": "b", "is_safety_critical": False},
]


QUESTION_BANKS = {
    "v0.4-test-1": {"pre": LEGACY_PRE_QUESTIONS, "post": LEGACY_POST_QUESTIONS},
    ASSESSMENT_VERSION: {"pre": PRE_QUESTIONS_V2, "post": POST_QUESTIONS_V2},
}


def questions_for(kind: str, version: str = ASSESSMENT_VERSION) -> list[dict[str, object]]:
    if kind not in ("pre", "post"):
        raise ValueError("unsupported assessment kind")
    bank = QUESTION_BANKS.get(version)
    if bank is None:
        raise ValueError("unsupported assessment version")
    return bank[kind]


def public_questions(kind: str, version: str = ASSESSMENT_VERSION) -> list[dict[str, object]]:
    public_keys = {"id", "knowledge_point", "prompt", "options", "is_safety_critical"}
    return [
        {key: value for key, value in question.items() if key in public_keys}
        for question in questions_for(kind, version)
    ]


def score_answers(
    kind: str, answers: dict[str, str], version: str = ASSESSMENT_VERSION
) -> tuple[int, int, dict[str, bool]]:
    questions = questions_for(kind, version)
    module_results: dict[str, list[bool]] = defaultdict(list)
    correct = 0
    for question in questions:
        is_correct = answers.get(str(question["id"])) == question["correct_answer"]
        correct += int(is_correct)
        module_results[str(question["knowledge_point"])].append(is_correct)
    results = {name: all(values) for name, values in module_results.items()}
    score = round(correct / len(questions) * 100)
    return score, correct, results
