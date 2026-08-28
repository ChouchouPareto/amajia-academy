ASSESSMENT_VERSION = "v0.4-test-2"

SOURCE_IDS = {
    "beijing-contract",
    "cdc-chlorine",
    "gd-housekeeping-standard",
    "mofcom-convention",
    "ndrc-housekeeping-case",
    "nhc-disinfectant",
    "organizing-standard",
    "pingdingshan-home-service",
    "sz-health-cleaners",
    "urumqi-home-cleaning",
}


def q(
    question_id: str,
    knowledge_point: str,
    prompt: str,
    options: tuple[str, str, str],
    correct_answer: str,
    source_ids: tuple[str, ...],
    safety: bool = False,
) -> dict[str, object]:
    return {
        "id": question_id,
        "knowledge_point": knowledge_point,
        "prompt": prompt,
        "options": [
            {"id": option_id, "label": label}
            for option_id, label in zip(("a", "b", "c"), options, strict=True)
        ],
        "correct_answer": correct_answer,
        "is_safety_critical": safety,
        "source_ids": list(source_ids),
    }


PRE_QUESTIONS_V2 = [
    q("pre-h01-a", "职业规范", "到客户家后，发现今天要做的事情没有说清楚。你应该先怎么做？", ("按自己的想法开始", "确认服务内容和注意事项", "等客户离开再决定"), "b", ("mofcom-convention",)),
    q("pre-h01-b", "职业规范", "服务中看到客户的病历和日记，正确做法是什么？", ("不翻看、不传播，按约定处理", "拍照保存", "拿给别人看"), "a", ("mofcom-convention", "organizing-standard")),
    q("pre-h02-a", "清洁剂安全", "第一次使用一种清洁剂，最先应该做什么？", ("闻一闻再决定", "多倒一点试试", "看标签，按说明使用并保持通风"), "c", ("nhc-disinfectant", "gd-housekeeping-standard"), True),
    q("pre-h02-b", "清洁剂安全", "84消毒液能和洁厕灵一起使用吗？", ("不能，混用可能产生有毒气体", "可以，去污更快", "只要戴手套就能混用"), "a", ("cdc-chlorine", "sz-health-cleaners"), True),
    q("pre-h03-a", "厨房顺序", "清洁厨房柜门、台面和地面，通常先做哪里？", ("先擦高处，再擦低处", "先拖地，再擦柜门", "没有任何顺序"), "a", ("urumqi-home-cleaning", "ndrc-housekeeping-case")),
    q("pre-h03-b", "厨房顺序", "清洁厨房台面前，发现不知道台面是什么材质。你应该怎么做？", ("直接用强力清洁剂", "确认材质，再选合适用品和方法", "用钢丝球反复擦"), "b", ("gd-housekeeping-standard",), True),
    q("pre-h04-a", "卫生间分区", "擦洗手盆和马桶时，抹布应该怎么用？", ("同一块抹布连续擦", "按区域分开使用并做好标记", "只用清水冲一下"), "b", ("gd-housekeeping-standard", "ndrc-housekeeping-case"), True),
    q("pre-h04-b", "卫生间分区", "卫生间地面刚拖完很湿，接下来应该怎么做？", ("提醒湿滑，保持出口可安全通行", "不必提醒任何人", "关门马上离开"), "a", ("mofcom-convention", "gd-housekeeping-standard"), True),
    q("pre-h05-a", "整理隐私", "整理时遇到不确定要不要丢的物品，应该怎么办？", ("觉得没用就扔掉", "先收进自己的包里", "单独放好，请客户决定"), "c", ("organizing-standard",)),
    q("pre-h05-b", "整理隐私", "客户不在场时发现现金和贵重物品，正确做法是什么？", ("不擅自处理，及时联系客户确认", "换个地方藏起来", "拍照发到群里"), "a", ("organizing-standard", "beijing-contract")),
    q("pre-h06-a", "衣物洗涤", "把衣物放进洗衣机前，应该先做什么？", ("检查洗标、口袋，并进行分类", "所有衣物一起洗", "先倒满清洁剂"), "a", ("pingdingshan-home-service", "gd-housekeeping-standard")),
    q("pre-h06-b", "衣物洗涤", "深色衣物和浅色衣物怎样处理更合适？", ("高温一起洗", "根据洗标和材质分类洗涤", "只看衣服大小"), "b", ("pingdingshan-home-service", "gd-housekeeping-standard")),
]


POST_QUESTIONS_V2 = [
    q("post-h01-a", "职业规范", "客户临时增加一项没有约定、而且可能不安全的工作。你应该怎么做？", ("马上照做", "先说明风险并确认服务边界", "做完后再另外收费"), "b", ("mofcom-convention",), True),
    q("post-h01-b", "职业规范", "服务结束前，哪项做法更规范？", ("按约定自检，并与客户确认结果", "没做完也直接离开", "擅自增加费用"), "a", ("mofcom-convention", "ndrc-housekeeping-case")),
    q("post-h02-a", "清洁剂安全", "使用清洁剂时突然闻到强烈刺激气味，应该怎么做？", ("继续使用直到做完", "再加另一种清洁剂", "立即停止、离开并通风，按标签处置"), "c", ("nhc-disinfectant", "cdc-chlorine"), True),
    q("post-h02-b", "清洁剂安全", "准备用含氯消毒剂擦有颜色的衣物，哪项做法正确？", ("直接倒在衣物上", "先看标签；不适用就更换合适产品", "与洁厕灵混合后再用"), "b", ("cdc-chlorine",), True),
    q("post-h03-a", "厨房顺序", "厨房柜门、台面、地面都有灰尘，哪种顺序更合适？", ("地面、台面、柜门", "柜门、台面、地面", "三处同时擦"), "b", ("urumqi-home-cleaning", "ndrc-housekeeping-case")),
    q("post-h03-b", "厨房顺序", "面对石材台面和木质柜门，怎样选择清洁方法？", ("识别材质，分别选择合适的方法", "都用同一种强酸清洁剂", "都用钢丝球用力擦"), "a", ("gd-housekeeping-standard",), True),
    q("post-h04-a", "卫生间分区", "马桶区域的抹布用完后，可以马上擦洗手盆吗？", ("可以，不用清洗", "可以，只要看起来干净", "不可以，应使用分区工具"), "c", ("gd-housekeeping-standard", "ndrc-housekeeping-case"), True),
    q("post-h04-b", "卫生间分区", "拖卫生间地面时，怎样减少滑倒风险？", ("先堵住出口", "从里向外，提醒湿滑并留出安全通道", "把水留在地面自然干"), "b", ("mofcom-convention", "urumqi-home-cleaning"), True),
    q("post-h05-a", "整理隐私", "客户让你整理一叠私人文件，但没有说明分类方法。你应该怎么做？", ("先逐页阅读", "自行销毁旧文件", "保持内容私密，请客户确认分类规则"), "c", ("organizing-standard",)),
    q("post-h05-b", "整理隐私", "整理出一件看起来不值钱的旧物，正确做法是什么？", ("未经同意不丢弃，由客户决定", "直接扔掉节省空间", "带回家自己使用"), "a", ("organizing-standard",)),
    q("post-h06-a", "衣物洗涤", "一件衣物的洗标看不懂，最稳妥的做法是什么？", ("用最强洗涤程序", "暂停处理，先向客户确认", "和其他衣物一起洗"), "b", ("pingdingshan-home-service", "mofcom-convention")),
    q("post-h06-b", "衣物洗涤", "为了洗得更干净，洗涤剂是不是放得越多越好？", ("是，越多越干净", "只要泡沫多就行", "不是，应按产品说明和衣物情况使用"), "c", ("pingdingshan-home-service", "gd-housekeeping-standard")),
]
