"""100 candidate scenario questions mapped to the 12-course curriculum.

The bank is intentionally separate from the short pre/post assessment. It can
feed lesson checks, spaced review and future randomized assessments after
content review.
"""

from .content_catalog_v1 import COURSE_META


CONCEPTS = [
    ("housekeeping-work-basics", "岗位边界", "合同只约定保洁，客户临时要求照护婴儿", "说明能力并重新确认职责", "直接答应", "假装没听见", "mohrss-standard-2019"),
    ("housekeeping-work-basics", "隐私保护", "清洁时看到客户的病历和聊天记录", "不翻看、不拍摄、不传播", "拍照留作谈资", "读完再放回", "mofcom-rules"),
    ("service-confirmation", "任务确认", "上门后发现服务区域没有说清楚", "先确认区域、重点和禁区", "按自己习惯开始", "等出问题再问", "mofcom-rules"),
    ("service-confirmation", "贵重物品", "工作区放有现金、证件和易碎品", "请客户确认位置与处理方式", "先全部搬走", "装进包里保管", "mofcom-convention-2024"),
    ("workplace-safety", "燃气安全", "进入厨房闻到明显燃气味", "避免电火花、撤离并在室外求助", "打开灯找漏点", "点火检查", "fire-home-2024"),
    ("workplace-safety", "高处作业", "客户让你踩摇晃的凳子擦外窗", "拒绝危险方式并改用安全方案", "小心一点继续", "让客户扶着就做", "fire-home-2024"),
    ("cleaner-safety", "产品混用", "客户建议洁厕产品和含氯消毒剂混用", "拒绝混合并按标签分开使用", "少量混合", "戴手套后混合", "nhc-disinfectant"),
    ("cleaner-safety", "异常暴露", "使用产品时出现强烈刺激气味和头晕", "立即停用、离开并通风求助", "忍到做完", "加香味剂遮盖", "nhc-disinfectant"),
    ("home-cleaning-sop", "操作顺序", "柜顶、台面和地面都有灰尘", "从上到下并最后处理地面", "先拖地再擦柜顶", "三处同时用一块布", "mohrss-standard-2019"),
    ("home-cleaning-sop", "洁污分区", "卧室、厨房和卫生间都要清洁", "工具分区或明确标记", "一块抹布全屋用", "只看工具是否干燥", "mohrss-standard-2019"),
    ("kitchen-order", "食品隔离", "准备清洁放有食品和餐具的台面", "先移开食品餐具并确认材质", "直接喷清洁剂", "把食品堆到角落", "mohrss-standard-2019"),
    ("kitchen-order", "油锅起火", "烹饪时油锅突然起火", "关火并用锅盖覆盖，及时求助", "向锅里泼水", "端着锅往外跑", "fire-home-2024"),
    ("bathroom-safety", "工具分区", "刚用抹布擦完马桶，接着要擦洗手盆", "更换洗手盆专用工具", "直接继续擦", "只用水冲一下继续", "mohrss-standard-2019"),
    ("bathroom-safety", "防滑", "卫生间地面刚拖完仍有积水", "提示湿滑并保持出口可走", "关门离开", "铺纸盖住积水", "mofcom-convention-2024"),
    ("laundry-basics", "洗护标签", "贵重衣物没有洗护标签或看不懂", "暂停并请客户确认或送专业洗护", "用轻柔模式试洗", "多加洗涤剂", "mohrss-standard-2019"),
    ("laundry-basics", "衣物分类", "深浅色和不同材质衣物需要清洗", "按标签、颜色和材质分类", "全部高温混洗", "只按衣服大小分", "mohrss-standard-2019"),
    ("home-organize", "处置权限", "整理出一件看似没用的旧物", "放入待确认区由客户决定", "直接丢弃", "带回家使用", "mofcom-rules"),
    ("communication-handover", "异常报告", "擦拭时发现台面开始褪色", "立即停手并报告事实", "继续做完", "换更强产品覆盖", "mofcom-rules"),
    ("employment-rights", "证书防骗", "培训方承诺交钱免考拿全国证书", "通过官方渠道核验并拒绝可疑承诺", "马上付款", "交出身份证原件", "osta-query"),
    ("doorstep-simulation", "验收交接", "约定任务已经完成，准备离开", "复位、自检、共同验收并记录异常", "直接离开", "删除全部工作记录", "mofcom-convention-2024"),
]

VARIANTS = (
    ("如果你正在第一次上门服务，面对以下情况：{scenario}。最合适的第一步是什么？", ("correct", "wrong1", "wrong2")),
    ("阿姨在工作中遇到这件事：{scenario}。哪种做法更规范？", ("wrong1", "correct", "wrong2")),
    ("请判断下面情景应如何处理：{scenario}。", ("wrong2", "wrong1", "correct")),
    ("客户催得很急，但出现了这个情况：{scenario}。你应该选择哪一项？", ("correct", "wrong2", "wrong1")),
    ("复盘今天的服务时发现曾遇到：{scenario}。正确做法是哪一个？", ("wrong2", "correct", "wrong1")),
)


def build_bank() -> list[dict[str, object]]:
    bank: list[dict[str, object]] = []
    for concept_index, (course_id, point, scenario, correct, wrong1, wrong2, source_id) in enumerate(CONCEPTS, start=1):
        values = {"correct": correct, "wrong1": wrong1, "wrong2": wrong2}
        for variant_index, (prompt, order) in enumerate(VARIANTS, start=1):
            correct_answer = ("a", "b", "c")[order.index("correct")]
            bank.append({
                "id": f"hq-{concept_index:02d}-{variant_index}",
                "course_id": course_id,
                "course_code": COURSE_META[course_id]["code"],
                "knowledge_point": point,
                "question_type": "scenario_choice",
                "difficulty": 1 if variant_index < 3 else 2,
                "risk_level": "L3" if course_id in ("workplace-safety", "cleaner-safety") else "L1",
                "is_safety_critical": course_id in ("workplace-safety", "cleaner-safety", "kitchen-order", "bathroom-safety"),
                "prompt": prompt.format(scenario=scenario),
                "options": [{"id": key, "label": values[name]} for key, name in zip(("a", "b", "c"), order, strict=True)],
                "correct_answer": correct_answer,
                "explanation": f"本题考查{point}：{correct}。",
                "common_mistake": wrong1,
                "source_ids": [source_id],
                "review_status": "candidate",
                "version": "v1.0-candidate",
            })
    return bank


HOUSEKEEPING_QUESTION_BANK_V1 = build_bank()


def assessment_set(variant_index: int) -> list[dict[str, object]]:
    """Return one reviewed-candidate item per course for a 12-item assessment."""
    selected: list[dict[str, object]] = []
    for course_id in COURSE_META:
        item = next(
            question
            for question in HOUSEKEEPING_QUESTION_BANK_V1
            if question["course_id"] == course_id and str(question["id"]).endswith(f"-{variant_index}")
        )
        selected.append(item)
    return selected

assert len(HOUSEKEEPING_QUESTION_BANK_V1) == 100
assert len({item["id"] for item in HOUSEKEEPING_QUESTION_BANK_V1}) == 100
