export type PrototypeLesson = {
  id: string;
  title: string;
  understood: string;
  conclusion: string;
  conditions: string;
  safetyNote: string;
  steps: Array<{ title: string; body: string }>;
  quiz: {
    question: string;
    options: Array<{ id: string; label: string }>;
    answer: string;
    explanation: string;
  };
};

export type PrototypeResult =
  | { kind: "lesson"; lesson: PrototypeLesson }
  | { kind: "blocked"; title: string; message: string; next: string }
  | { kind: "no_match"; title: string; message: string };

export type PrototypeRecord = {
  id: string;
  title: string;
  status: "completed";
  completedAt: string;
};

export const PROTOTYPE_QUESTION_KEY = "4060_prototype_question";
export const PROTOTYPE_RECORDS_KEY = "4060_prototype_records";

const lessons: PrototypeLesson[] = [
  {
    id: "kitchen-order",
    title: "厨房油污，应该先擦哪里？",
    understood: "你想学习厨房油污清洁的先后顺序，对吗？",
    conclusion: "先收走杂物，再从高处到低处、从轻污到重污分区清洁。",
    conditions: "适用于普通家庭厨房的日常整理与表面清洁。",
    safetyNote: "不同清洁剂不要自行混合；先查看产品标签，并保持通风。",
    steps: [
      { title: "先把台面腾空", body: "收走食物、餐具和小家电。能移动的先移开，避免边擦边搬，也避免清洁剂碰到食物。" },
      { title: "从高处往低处擦", body: "先处理柜门和墙面，再擦台面，最后处理灶台和地面。这样落下的灰尘不会弄脏已经擦好的地方。" },
      { title: "重油污单独处理", body: "先在不显眼处测试清洁用品，按标签要求使用。不要为了省事把不同清洁剂混在一起。" },
    ],
    quiz: {
      question: "清洁厨房时，下面哪个顺序更合适？",
      options: [
        { id: "a", label: "先擦地面，再擦柜门和台面" },
        { id: "b", label: "先收杂物，再从高处往低处擦" },
        { id: "c", label: "把几种清洁剂混在一起使用" },
      ],
      answer: "b",
      explanation: "先腾空，再从高到低，可以减少重复清洁，也更容易避开食物和餐具。",
    },
  },
  {
    id: "bedtime-order",
    title: "孩子睡前总拖延，怎么安排顺序？",
    understood: "你想学习怎样把孩子睡前的事情安排得更稳定，对吗？",
    conclusion: "把睡前活动固定成少量、重复、容易记住的顺序。",
    conditions: "以下仅用于一般生活习惯学习，不替代儿童健康或睡眠问题的专业评估。",
    safetyNote: "如果孩子出现呼吸异常、持续疼痛或其他明显不适，应及时寻求专业帮助。",
    steps: [
      { title: "先固定开始时间", body: "每天尽量在接近的时间开始准备，不临时增加很多新活动，让孩子知道接下来要睡觉了。" },
      { title: "只保留三件小事", body: "例如洗漱、换睡衣、讲一个故事。顺序越简单，越容易重复，也更方便照护者保持一致。" },
      { title: "提前说清最后一步", body: "开始前就说明故事结束后要关灯。用平静、重复的说法，避免一边催促一边不断改变规则。" },
    ],
    quiz: {
      question: "帮助孩子形成睡前顺序，哪种做法更合适？",
      options: [
        { id: "a", label: "每天临时决定很多活动" },
        { id: "b", label: "固定少量步骤，并尽量保持一致" },
        { id: "c", label: "孩子拖延时就取消全部沟通" },
      ],
      answer: "b",
      explanation: "少量、固定、可预期的步骤更容易让孩子和照护者一起坚持。",
    },
  },
  {
    id: "home-organize",
    title: "家里东西太多，应该从哪里开始收？",
    understood: "你想学习东西很多时，怎样开始整理而不容易乱，对吗？",
    conclusion: "先选一个小范围，只分保留、移走、待决定三类。",
    conditions: "适用于普通家庭物品的日常整理。",
    safetyNote: "药品、刀具、化学用品和儿童可能接触的危险物品应优先安全收纳。",
    steps: [
      { title: "只选一个小地方", body: "先整理一个抽屉或一小块台面，不要一开始把全屋物品都搬出来。" },
      { title: "只分成三类", body: "保留在这里、移到别处、暂时不能决定。分类越少，越容易继续。" },
      { title: "先让常用物品归位", body: "每天要用的放在容易拿到的位置；不常用的再集中收纳，并给待决定物品设一个复查时间。" },
    ],
    quiz: {
      question: "东西很多时，哪种开始方式更容易完成？",
      options: [
        { id: "a", label: "一次把全屋东西都搬出来" },
        { id: "b", label: "先整理一个小范围，并只分三类" },
        { id: "c", label: "先买很多收纳盒再决定" },
      ],
      answer: "b",
      explanation: "小范围和少分类能降低开始门槛，也不容易造成新的混乱。",
    },
  },
];

export function getPrototypeResult(question: string): PrototypeResult {
  const normalized = question.trim().toLowerCase();
  const highRiskTerms = ["误食", "喝了清洁剂", "呼吸困难", "急救", "吃什么药", "用药", "昏迷", "大量出血"];
  if (highRiskTerms.some((term) => normalized.includes(term))) {
    return {
      kind: "blocked",
      title: "这个问题目前不能在这里继续讲",
      message: "它可能涉及紧急健康或用药风险，普通学习步骤不适合处理。",
      next: "如有人正在明显不适或处于危险中，请立即联系当地急救服务或合适的专业人员。",
    };
  }

  if (normalized.includes("油") || normalized.includes("厨房") || normalized.includes("清洁")) return { kind: "lesson", lesson: lessons[0] };
  if (normalized.includes("睡") || normalized.includes("孩子") || normalized.includes("育儿")) return { kind: "lesson", lesson: lessons[1] };
  if (normalized.includes("收") || normalized.includes("整理") || normalized.includes("东西太多")) return { kind: "lesson", lesson: lessons[2] };

  return {
    kind: "no_match",
    title: "还没有找到足够可靠的内容",
    message: "这一版只准备了家政清洁、家庭整理和一般育儿习惯的演示内容，所以这次先不随便回答。",
  };
}

export function savePrototypeRecord(lesson: PrototypeLesson) {
  const current = readPrototypeRecords();
  const next: PrototypeRecord = { id: lesson.id, title: lesson.title, status: "completed", completedAt: new Date().toISOString() };
  window.localStorage.setItem(PROTOTYPE_RECORDS_KEY, JSON.stringify([next, ...current.filter((item) => item.id !== lesson.id)]));
}

export function readPrototypeRecords(): PrototypeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROTOTYPE_RECORDS_KEY);
    return raw ? (JSON.parse(raw) as PrototypeRecord[]) : [];
  } catch {
    return [];
  }
}
