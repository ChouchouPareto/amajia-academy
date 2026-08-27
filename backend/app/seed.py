from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import CourseVersion, Lesson


COURSE_META = {
    "housekeeping-work-basics": {"code": "H01", "summary": "认识家政工作的基本边界、守时、沟通与物品保护。", "minutes": 8},
    "cleaner-safety": {"code": "H02", "summary": "看懂标签，保持通风，记住清洁剂不能随意混用。", "minutes": 9},
    "kitchen-order": {"code": "H03", "summary": "按正确顺序完成普通家庭厨房的基础清洁。", "minutes": 8},
    "bathroom-safety": {"code": "H04", "summary": "分区使用工具，降低交叉污染和化学品风险。", "minutes": 10},
    "home-organize": {"code": "H05", "summary": "从小区域开始整理，并保护客户的隐私物品。", "minutes": 8},
    "laundry-basics": {"code": "H06", "summary": "先看洗标和颜色，再选择合适的基础洗涤方式。", "minutes": 9},
}


COURSES = [
    {
        "id": "housekeeping-work-basics", "title": "认识家政工作与基本规范", "domain": "housekeeping", "risk_level": "L0",
        "disclaimer": "本课是职业入门知识，不等同于职业培训、实操认证或就业保证。",
        "conclusion": "先确认服务范围，再开始工作；守时、尊重隐私、保护物品是基本规范。",
        "steps": [
            {"title": "先确认今天做什么", "body": "开始前和服务对象确认区域、重点和不能触碰的物品，遇到不清楚的事情先问。"},
            {"title": "保护隐私和物品", "body": "不翻看私人文件，不传播家庭信息；移动贵重或易碎物品前先确认。"},
            {"title": "完工后一起检查", "body": "按约定区域检查一遍，说明已经完成的内容和需要注意的地方。"},
        ],
        "quiz": {"question": "开始家政服务前，哪种做法更合适？", "options": [{"id": "a", "label": "按自己的习惯直接开始"}, {"id": "b", "label": "先确认服务范围和注意事项"}, {"id": "c", "label": "先整理客户的私人文件"}], "correct_answer": "b", "explanation": "先确认范围可以减少误会，也能保护客户隐私和物品。"},
        "content_status": "internal_test_candidate",
    },
    {
        "id": "cleaner-safety", "title": "清洁工具与清洁剂安全", "domain": "housekeeping", "risk_level": "L2",
        "disclaimer": "使用前阅读产品标签并保持通风；不同清洁剂不要自行混合。",
        "conclusion": "先看标签、戴好防护、保持通风，不认识的清洁剂不要混用。",
        "steps": [
            {"title": "先看标签", "body": "确认适用表面、使用方法和警示内容，不用没有标签或来路不明的液体。"},
            {"title": "做好通风和防护", "body": "打开门窗，按标签要求使用手套，避免清洁剂接触眼睛和皮肤。"},
            {"title": "分开存放和使用", "body": "不同产品不自行混合，用完盖紧并放在儿童接触不到的地方。"},
        ],
        "quiz": {"question": "使用清洁剂时，下面哪项必须记住？", "options": [{"id": "a", "label": "几种产品混合效果更强"}, {"id": "b", "label": "先看标签并保持通风"}, {"id": "c", "label": "没有标签也可以凭味道判断"}], "correct_answer": "b", "explanation": "标签和通风是基础安全要求，不同清洁剂不能随意混合。"},
        "content_status": "internal_test_candidate",
    },
    {
        "id": "kitchen-order", "title": "厨房清洁基本顺序", "domain": "housekeeping", "risk_level": "L1",
        "disclaimer": "适用于普通家庭厨房的日常表面清洁；使用清洁剂时遵守标签并保持通风。",
        "conclusion": "先收走杂物，再从高处到低处、从轻污到重污分区清洁。",
        "steps": [
            {"title": "先把台面腾空", "body": "收走食物、餐具和小家电，避免边擦边搬，也避免清洁剂碰到食物。"},
            {"title": "从高处往低处擦", "body": "先处理柜门和墙面，再擦台面，最后处理灶台和地面。"},
            {"title": "重油污单独处理", "body": "先在不显眼处测试清洁用品，按标签要求使用，不混合不同清洁剂。"},
        ],
        "quiz": {"question": "清洁厨房时，哪个顺序更合适？", "options": [{"id": "a", "label": "先擦地面，再擦柜门"}, {"id": "b", "label": "先收杂物，再从高处往低处擦"}, {"id": "c", "label": "把不同清洁剂混合使用"}], "correct_answer": "b", "explanation": "先腾空、再从高到低，可以减少重复清洁。"},
        "content_status": "internal_test_candidate",
    },
    {
        "id": "bathroom-safety", "title": "卫生间清洁与分区", "domain": "housekeeping", "risk_level": "L2",
        "disclaimer": "地面湿滑时先设置提醒；清洁剂按标签使用并保持通风。",
        "conclusion": "工具分区、先干后湿、从相对干净处到较脏处，并随时防滑。",
        "steps": [
            {"title": "先通风并移开物品", "body": "打开门窗或排风，收起毛巾和洗漱用品，先确认地面是否湿滑。"},
            {"title": "工具按区域分开", "body": "马桶、台盆和地面尽量使用不同抹布或刷具，避免交叉污染。"},
            {"title": "最后处理地面", "body": "从里向外清洁地面，保持出口可走，并在地面干燥前提醒他人注意。"},
        ],
        "quiz": {"question": "卫生间清洁时，哪种做法更安全？", "options": [{"id": "a", "label": "一块抹布擦所有区域"}, {"id": "b", "label": "工具分区并最后清洁地面"}, {"id": "c", "label": "关紧门窗使用清洁剂"}], "correct_answer": "b", "explanation": "分区能降低交叉污染，最后处理地面也更容易控制湿滑风险。"},
        "content_status": "internal_test_candidate",
    },
    {
        "id": "home-organize", "title": "客厅与卧室整理", "domain": "housekeeping", "risk_level": "L1",
        "disclaimer": "私人文件、药品、贵重物品和不确定的物品不要擅自处理。",
        "conclusion": "先选小区域，只做分类和归位，不擅自丢弃客户物品。",
        "steps": [
            {"title": "只选一个小区域", "body": "先整理一个抽屉或一块台面，不要一开始把全屋物品搬出来。"},
            {"title": "分为三类", "body": "留在这里、移到别处、需要确认。拿不准的物品放到需要确认一类。"},
            {"title": "归位后再检查", "body": "常用物品放在容易拿到的位置，私人和贵重物品保持原状并请客户确认。"},
        ],
        "quiz": {"question": "遇到不确定能不能丢的物品，应该怎么做？", "options": [{"id": "a", "label": "直接丢掉"}, {"id": "b", "label": "放到需要确认一类"}, {"id": "c", "label": "带走处理"}], "correct_answer": "b", "explanation": "不确定的物品必须先确认，不能擅自丢弃或带走。"},
        "content_status": "internal_test_candidate",
    },
    {
        "id": "laundry-basics", "title": "衣物洗涤基础", "domain": "housekeeping", "risk_level": "L1",
        "disclaimer": "贵重、特殊面料或看不懂洗标的衣物，先向物主确认，不自行尝试。",
        "conclusion": "先看洗标，再按颜色和面料分类，不确定时先确认。",
        "steps": [
            {"title": "先检查洗标和口袋", "body": "查看能否机洗、温度和晾晒要求，同时检查口袋里是否有纸巾或物品。"},
            {"title": "按颜色和面料分类", "body": "深浅颜色分开，容易掉色或特殊面料单独处理。"},
            {"title": "选择合适程序", "body": "按洗标和洗衣机说明选择程序，不为了更干净随意增加清洁剂。"},
        ],
        "quiz": {"question": "洗衣前第一步更合适的是？", "options": [{"id": "a", "label": "先看洗标并检查口袋"}, {"id": "b", "label": "所有衣物一起洗"}, {"id": "c", "label": "多加清洁剂"}], "correct_answer": "a", "explanation": "洗标、口袋和分类检查能减少染色、变形和物品损坏。"},
        "content_status": "internal_test_candidate",
    },
]


def seed_lessons(db: Session) -> None:
    for payload in COURSES:
        lesson = db.get(Lesson, payload["id"])
        if lesson is None:
            lesson = Lesson(**payload)
            db.add(lesson)
            db.flush()
        else:
            for key, value in payload.items():
                setattr(lesson, key, value)
        version = db.scalar(select(CourseVersion).where(CourseVersion.course_id == payload["id"], CourseVersion.version == 1))
        if version is None:
            db.add(CourseVersion(course_id=payload["id"], version=1, objectives=[payload["conclusion"]], source_refs=[], review_status="pending"))
    legacy = db.get(Lesson, "bedtime-order")
    if legacy is not None:
        legacy.content_status = "archived_demo"
    db.commit()
