"""Reviewed-source candidate curriculum for the Mainland China housekeeping pilot.

These records are content candidates. Seeding them must never mark them as
professionally approved or published; the admin review workflow owns that state.
"""

CONTENT_VERSION = 2

SOURCES = {
    "mohrss-standard-2019": {
        "title": "家政服务员国家职业技能标准（2019年版）",
        "authority": "中华人民共和国人力资源和社会保障部",
        "level": "A",
        "url": "https://chinajob.mohrss.gov.cn/upload/resources/jnbzpdf/4ccc6a76ab911f6feae513.pdf",
    },
    "mofcom-rules": {
        "title": "家庭服务业管理暂行办法",
        "authority": "中华人民共和国商务部",
        "level": "A",
        "url": "https://www.mofcom.gov.cn/zfxxgk/zc/gz/art/2021/art_025e6f6164e24702845a26bf95f1020c.html",
    },
    "mofcom-convention-2024": {
        "title": "家政服务公约",
        "authority": "商务部指导、中国家庭服务业协会发布",
        "level": "B",
        "url": "https://fms.mofcom.gov.cn/zxdt/art/2024/art_24d089ea4c594ed3ad4754d371f183a6.html",
    },
    "nhc-disinfectant": {
        "title": "消毒剂使用指南",
        "authority": "国家卫生健康委员会",
        "level": "B",
        "url": "https://www.nhc.gov.cn/xcs/zhengcwj/202002/5ea4a3616c224df7b3c2460bfc278577.shtml",
    },
    "nhc-home-disinfection": {
        "title": "如何做好家庭消毒",
        "authority": "国家卫生健康委员会",
        "level": "B",
        "url": "https://www.nhc.gov.cn/wjw/hygq/202101/70cc458ebaa442bfb33585bac81bc4ad.shtml",
    },
    "fire-home-2024": {
        "title": "家庭消防安全指南",
        "authority": "国家消防救援局",
        "level": "B",
        "url": "https://www.119.gov.cn/kp/hzyf/jt/2024/45745.shtml",
    },
    "osta-query": {
        "title": "技能人才评价证书全国联网查询",
        "authority": "中国就业培训技术指导中心",
        "level": "A",
        "url": "https://osta.mohrss.gov.cn/career",
    },
    "osta-service": {
        "title": "技能人才评价工作网",
        "authority": "中国就业培训技术指导中心",
        "level": "A",
        "url": "https://osta.mohrss.gov.cn/",
    },
    "openstd-housekeeping": {
        "title": "家政服务国家标准检索",
        "authority": "国家市场监督管理总局、国家标准化管理委员会",
        "level": "A",
        "url": "https://openstd.samr.gov.cn/bzgk/std/std_list?p.p1=0&p.p2=%E5%AE%B6%E6%94%BF%E6%9C%8D%E5%8A%A1&p.p90=circulation_date&p.p91=desc",
    },
    "gbt-45440-2025": {
        "title": "GB/T 45440-2025 电子商务家政 家政服务人员能力信息描述",
        "authority": "国家市场监督管理总局、国家标准化管理委员会",
        "level": "B",
        "url": "https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=E350C5211ED9504DE9F53FAB5AE0EE7E",
    },
    "state-council-family-service": {
        "title": "国务院办公厅关于发展家庭服务业的指导意见",
        "authority": "国务院办公厅",
        "level": "A",
        "url": "https://chinajob.mohrss.gov.cn/h5/c/2010-10-28/28851.shtml",
    },
}


def refs(*source_ids: str) -> list[dict[str, str]]:
    return [{"id": source_id, **SOURCES[source_id]} for source_id in source_ids]


COURSE_META = {
    "housekeeping-work-basics": {"code": "H01", "summary": "分清岗位边界，做到守时、诚信、尊重隐私。", "minutes": 9},
    "service-confirmation": {"code": "H02", "summary": "开工前确认任务、材质、工具、风险和验收。", "minutes": 9},
    "workplace-safety": {"code": "H03", "summary": "识别滑倒、触电、燃气、火灾和搬运风险。", "minutes": 10},
    "cleaner-safety": {"code": "H04", "summary": "读懂标签，保持通风，清洁剂绝不随意混用。", "minutes": 10},
    "home-cleaning-sop": {"code": "H05", "summary": "按从上到下、从里到外、先干后湿完成清洁。", "minutes": 10},
    "kitchen-order": {"code": "H06", "summary": "按正确顺序完成普通家庭厨房基础清洁。", "minutes": 10},
    "bathroom-safety": {"code": "H07", "summary": "工具分区，防止交叉污染和地面滑倒。", "minutes": 10},
    "laundry-basics": {"code": "H08", "summary": "看洗标、查口袋、按颜色材质分类洗涤。", "minutes": 10},
    "home-organize": {"code": "H09", "summary": "尊重所有权，只分类归位，不擅自丢弃。", "minutes": 9},
    "communication-handover": {"code": "H10", "summary": "会报告异常、邀请验收并留下清楚记录。", "minutes": 9},
    "employment-rights": {"code": "H11", "summary": "会看合同、查证书，并识别招聘与收费陷阱。", "minutes": 10},
    "doorstep-simulation": {"code": "H12", "summary": "完成从接单确认到交付验收的全流程演练。", "minutes": 12},
}


def course(course_id: str, title: str, risk: str, disclaimer: str, conclusion: str,
           steps: list[tuple[str, str]], quiz: tuple[str, tuple[str, str, str], str, str],
           source_ids: tuple[str, ...]) -> dict[str, object]:
    question, options, answer, explanation = quiz
    return {
        "id": course_id,
        "title": title,
        "domain": "housekeeping",
        "risk_level": risk,
        "disclaimer": disclaimer,
        "conclusion": conclusion,
        "steps": [{"title": item[0], "body": item[1]} for item in steps],
        "quiz": {
            "question": question,
            "options": [{"id": key, "label": value} for key, value in zip(("a", "b", "c"), options, strict=True)],
            "correct_answer": answer,
            "explanation": explanation,
        },
        "objectives": [conclusion],
        "source_refs": refs(*source_ids),
        "content_status": "internal_test_candidate",
    }


COURSES = [
    course("housekeeping-work-basics", "认识家政工作与职业边界", "L0", "本课是就业入门，不替代职业培训、实操认证或就业保证。",
           "先分清岗位和服务边界；不会的专项工作要如实说明。",
           [("分清三类岗位", "家务服务、母婴护理和家庭照护是不同工种，不能把做过家务等同于掌握专业照护。"), ("如实说明能力", "身份、健康、技能和经历都要真实，不会的任务先说明。"), ("保护家庭边界", "不翻看、不拍摄、不传播客户隐私，不擅动贵重和私人用品。")],
           ("客户临时要求照护婴儿，但合同只约定保洁，先做什么？", ("直接答应", "说明能力并重新确认职责", "不告而别"), "b", "专项照护必须先确认能力、责任和合同边界。"), ("mohrss-standard-2019", "mofcom-rules")),
    course("service-confirmation", "上门服务前五项确认", "L1", "任何新增或高风险任务都应先协商，不能默认执行。",
           "开工前确认任务、材质、工具、风险和验收。",
           [("确认任务", "说清区域、重点、不包含项目、预计时间和费用。"), ("确认材质与风险", "询问不能使用的产品、贵重物品、宠物、门禁和隐私区域。"), ("确认验收", "约定完成标准、异常报告和新增工作的处理方式。")],
           ("遇到合同外的新任务，应怎么做？", ("默认免费增加", "先说明并重新协商", "做完再争论"), "b", "新增服务应先协商范围、风险、时间和费用。"), ("mofcom-rules", "mofcom-convention-2024")),
    course("workplace-safety", "上门安全与紧急处理", "L3", "涉及火灾、燃气、触电或严重伤情时先撤离并联系专业救援。",
           "危险发生时先停手、隔离或撤离，再按情况拨打119、120或110。",
           [("先看环境", "检查湿滑、破损电线、明火、燃气味、高处和搬运通道。"), ("保护自己", "穿防滑包脚鞋，按任务使用手套等防护，不用不稳的凳子登高。"), ("正确求助", "不冒险处置失控危险，不返回火场取物，不实施未受训医疗操作。")],
           ("闻到明显燃气味，哪项更合适？", ("开灯检查", "避免电火花、撤离并在室外求助", "点火找漏点"), "b", "燃气环境要避免火源和电火花，优先撤离求助。"), ("mohrss-standard-2019", "fire-home-2024")),
    course("cleaner-safety", "清洁剂与消毒剂安全", "L3", "按产品标签使用并保持通风；不同产品不得凭经验混合。",
           "先读标签、做好防护、保持通风，不认识的产品不用，不同产品不混。",
           [("读完整标签", "确认用途、适用表面、用量、接触时间、防护和禁忌。"), ("分开使用保存", "保留原包装，远离儿童和食品，不用饮料瓶分装。"), ("知道何时停止", "出现刺激气味、头晕、皮肤眼睛不适或材质异常时立即停用并离开暴露区。")],
           ("洁厕产品能和含氯消毒剂混用吗？", ("可以增强效果", "不能，必须分开按标签用", "戴手套就可以"), "b", "不同清洁剂和消毒剂不得自行混合。"), ("mohrss-standard-2019", "nhc-disinfectant")),
    course("home-cleaning-sop", "全屋基础清洁顺序", "L1", "适用于普通家庭日常清洁；特殊材质先确认。",
           "先整理再清洁，从上到下、从里到外、先干后湿、洁污分区。",
           [("整理与分区", "先收纳散落物，划分卧室、厨房、卫生间和清洁工具。"), ("按稳定顺序做", "先除浮尘，再处理局部污渍，最后清洁地面并保持出口可走。"), ("复位与自检", "复位物品，检查边角、积水、异味和损伤，再请客户验收。")],
           ("全屋清洁的合适原则是？", ("先拖地再掸灰", "先整理、从上到下、最后地面", "一块抹布全屋用"), "b", "稳定顺序可以减少返工和交叉污染。"), ("mohrss-standard-2019",)),
    course("kitchen-order", "厨房清洁与食品区安全", "L2", "清洁前确认关火、温度和电器状态，清洁用品不得污染食品。",
           "先移开食品餐具，再从轻污到重污、从高处到低处清洁。",
           [("腾空食品区", "收走食品、餐具和可移动小家电，生熟用品分开。"), ("确认火电与材质", "关火并等待表面降温；电器按说明断电，台面先确认材质。"), ("最后处理重污和地面", "灶台油污单独处理，食品接触面按产品要求清水处理。")],
           ("清洁厨房台面前第一步是？", ("直接喷强力产品", "移开食品并确认材质", "先把地面弄湿"), "b", "先隔离食品和确认材质可减少污染与损伤。"), ("mohrss-standard-2019", "nhc-disinfectant", "fire-home-2024")),
    course("bathroom-safety", "卫生间清洁与防滑", "L2", "密闭空间不随意使用刺激性产品，污物和锐器不得徒手接触。",
           "工具按区域分开，先相对干净处后污染处，最后从里向外处理地面。",
           [("通风并移物", "先移开毛巾和洗漱用品，确认地面、插座和通风情况。"), ("洁污工具分区", "台盆、淋浴、马桶、地面分工具或明确标记，避免混用。"), ("防滑收尾", "冲净或擦净残留，从里向外处理地面并提示湿滑。")],
           ("马桶抹布可以直接擦洗手盆吗？", ("可以", "不可以，应分区", "晾干后一定可以"), "b", "分区工具可降低交叉污染。"), ("mohrss-standard-2019", "nhc-disinfectant")),
    course("laundry-basics", "衣物洗涤、晾晒与收纳", "L1", "贵重、特殊面料或无洗护标签的衣物先询问，不自行试错。",
           "先看洗护标志和口袋，再按颜色、材质和污染程度分类。",
           [("检查", "检查洗护标志、口袋、破损、饰品和特殊污渍。"), ("分类与洗涤", "深浅色、不同材质和特殊用品分开，按说明选择程序与用量。"), ("晾晒收纳", "按材质晾晒，完全干燥后折叠或悬挂，发现异常及时报告。")],
           ("看不懂贵重衣物的洗标怎么办？", ("用轻柔模式试试", "暂停并向客户确认", "加倍洗涤剂"), "b", "不确定时先确认，不能用客户财物试错。"), ("mohrss-standard-2019",)),
    course("home-organize", "家庭整理与物品保护", "L1", "未经同意不丢弃、不捐赠、不改变重要物品位置。",
           "从小区域开始分类；现金、证件、药品、钥匙和隐私物品单独确认。",
           [("先定小范围", "每次只处理一块台面或一个抽屉，避免把全屋翻乱。"), ("分为三类", "原位保留、移到约定位置、需要客户确认。"), ("交接留痕", "重要物品当面确认，按约定用位置清单或照片完成交接。")],
           ("发现一件看似没用的旧物，怎么做？", ("直接扔掉", "放入待确认区", "带回家"), "b", "物品所有权属于客户，未经同意不能处置。"), ("mohrss-standard-2019", "mofcom-rules")),
    course("communication-handover", "沟通、异常报告与验收", "L1", "发生争议优先联系机构并保存记录，不争吵、不曝光客户。",
           "先描述事实，再说明影响和选项；完成后共同验收。",
           [("确认式沟通", "用短句复述任务，让客户确认，避免只说‘知道了’。"), ("报告异常", "停止可能造成损害的操作，说明发现了什么、在哪里、下一步有哪些选择。"), ("共同验收", "按清单检查完成项、未完成项、损伤和新增问题。")],
           ("清洁中发现台面出现异常褪色，先做什么？", ("继续擦完", "停手并立即报告", "用更强产品覆盖"), "b", "发现异常先停止，防止损害扩大。"), ("mofcom-rules", "mofcom-convention-2024")),
    course("employment-rights", "求职、合同、证书与防骗", "L1", "证书、补贴、工资和社保政策会变化，应查询官方最新信息。",
           "核验机构和证书，读清合同，不交来源不明费用，不允许扣押证件。",
           [("核验招聘方", "确认企业或平台身份、岗位内容、收费和工资支付主体。"), ("读合同", "核对服务范围、报酬、休息、食宿、保险、解除和争议处理。"), ("查证书防骗局", "在官方平台核验证书和评价机构，拒绝交钱免考、包过或培训贷。")],
           ("有人承诺交钱免考拿全国证书，应怎么做？", ("立刻付款", "通过官方渠道核验并拒绝可疑承诺", "交出身份证原件"), "b", "证书与评价机构应在官方渠道核验。"), ("mofcom-rules", "mofcom-convention-2024", "osta-query")),
    course("doorstep-simulation", "一次完整的上门服务演练", "L2", "线上模拟不等于实操合格；上岗前仍需完成线下操作评估。",
           "能从接单、上门确认、安全检查、分区操作到验收交接完整走一遍。",
           [("接单与确认", "核对地址、时间、联系人、任务、材料、费用和特殊风险。"), ("操作与记录", "按区域执行SOP，遇到不确定或异常先停手、询问、记录。"), ("验收与复盘", "完成工具清洁和物品复位，请客户验收，并记录下次需要改进的技能。")],
           ("完整服务结束前最后一项是什么？", ("不告而别", "共同验收并记录异常", "删除所有记录"), "b", "共同验收和交接能减少遗漏与纠纷。"), ("mohrss-standard-2019", "mofcom-rules", "mofcom-convention-2024")),
]


MEDIA_REQUIREMENTS = [
    {"course_id": item["id"], "required": [
        {"type": "image", "title": f"{item['title']}风险识别图", "status": "needed", "license_required": True},
        {"type": "video", "title": f"{item['title']}竖屏示范", "duration_seconds": 60, "status": "needed", "license_required": True},
    ]} for item in COURSES
]
