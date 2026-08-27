from sqlalchemy.orm import Session

from .models import Lesson


DEMO_LESSONS = [
    {
        "id": "kitchen-order",
        "title": "厨房油污，应该先擦哪里？",
        "domain": "housekeeping",
        "risk_level": "L0",
        "disclaimer": "适用于普通家庭厨房的日常整理与表面清洁。不同清洁剂不要自行混合，使用时保持通风。",
        "conclusion": "先收走杂物，再从高处到低处、从轻污到重污分区清洁。",
        "steps": [
            {"title": "先把台面腾空", "body": "收走食物、餐具和小家电，避免边擦边搬，也避免清洁剂碰到食物。"},
            {"title": "从高处往低处擦", "body": "先处理柜门和墙面，再擦台面，最后处理灶台和地面。"},
            {"title": "重油污单独处理", "body": "先在不显眼处测试清洁用品，按标签要求使用，不要混合不同清洁剂。"},
        ],
        "quiz": {"question": "清洁厨房时，下面哪个顺序更合适？", "options": [{"id": "a", "label": "先擦地面，再擦柜门和台面"}, {"id": "b", "label": "先收杂物，再从高处往低处擦"}, {"id": "c", "label": "把几种清洁剂混在一起使用"}], "correct_answer": "b"},
        "content_status": "internal_demo",
    },
    {
        "id": "bedtime-order",
        "title": "孩子睡前总拖延，怎么安排顺序？",
        "domain": "parenting",
        "risk_level": "L0",
        "disclaimer": "仅用于一般生活习惯学习，不替代儿童健康或睡眠问题的专业评估。",
        "conclusion": "把睡前活动固定成少量、重复、容易记住的顺序。",
        "steps": [
            {"title": "先固定开始时间", "body": "每天尽量在接近的时间开始准备，不临时增加很多新活动。"},
            {"title": "只保留三件小事", "body": "例如洗漱、换睡衣、讲一个故事。顺序越简单，越容易重复。"},
            {"title": "提前说清最后一步", "body": "开始前说明故事结束后要关灯，用平静、重复的说法保持一致。"},
        ],
        "quiz": {"question": "帮助孩子形成睡前顺序，哪种做法更合适？", "options": [{"id": "a", "label": "每天临时决定很多活动"}, {"id": "b", "label": "固定少量步骤，并尽量保持一致"}, {"id": "c", "label": "孩子拖延时就取消全部沟通"}], "correct_answer": "b"},
        "content_status": "internal_demo",
    },
    {
        "id": "home-organize",
        "title": "家里东西太多，应该从哪里开始收？",
        "domain": "organizing",
        "risk_level": "L0",
        "disclaimer": "适用于普通家庭物品的日常整理；危险物品应优先安全收纳。",
        "conclusion": "先选一个小范围，只分保留、移走、待决定三类。",
        "steps": [
            {"title": "只选一个小地方", "body": "先整理一个抽屉或一小块台面，不要一开始把全屋物品都搬出来。"},
            {"title": "只分成三类", "body": "保留在这里、移到别处、暂时不能决定。分类越少，越容易继续。"},
            {"title": "先让常用物品归位", "body": "每天要用的放在容易拿到的位置，不常用的再集中收纳。"},
        ],
        "quiz": {"question": "东西很多时，哪种开始方式更容易完成？", "options": [{"id": "a", "label": "一次把全屋东西都搬出来"}, {"id": "b", "label": "先整理一个小范围，并只分三类"}, {"id": "c", "label": "先买很多收纳盒再决定"}], "correct_answer": "b"},
        "content_status": "internal_demo",
    },
]


def seed_lessons(db: Session) -> None:
    for payload in DEMO_LESSONS:
        lesson = db.get(Lesson, payload["id"])
        if lesson is None:
            db.add(Lesson(**payload))
        else:
            for key, value in payload.items():
                setattr(lesson, key, value)
    legacy = db.get(Lesson, "housekeeping-order-demo")
    if legacy is not None:
        legacy.content_status = "archived_demo"
    db.commit()
