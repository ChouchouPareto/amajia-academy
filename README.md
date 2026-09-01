# 阿嬷学院 v0.5.0｜家政内测与 AI 专业陪学版

面向 40—60 岁、希望进入家政行业的女性，提供低门槛的入门学习与学习效果验证。本阶段只开放家政方向，形成“前测 → 课程学习 → 后测 → 学习报告”的可体验闭环。

当前代码标识：`0.5.0-phase4-slice20-conversational-coach`。

> 课程是内部测试候选内容，尚未完成家政专业人员审核，不得以正式职业培训或证书课程名义对外发布。就业、考证和线下机构服务仍是后续阶段能力。

## 已实现

- 阿嬷学院手机端首页与家政学习路径
- 6 门家政入门候选课程及学习进度恢复
- 前测、逐题保存、交卷和后测
- 学习提升报告与下一步建议
- 家政问题提问、课程三步学习、随堂测验、学习记录
- 课程版本草稿、来源登记、专业/安全审核、发布、下架与版本恢复
- 学习记录固定关联开始学习时的课程版本，后续发布不会改写历史内容
- Alembic 数据库迁移与管理员操作幂等审计
- 邀请码登录、HttpOnly 会话 Cookie、学员/内容管理员角色权限
- 隐私同意版本、退出登录、账号和学习数据删除
- 管理员单独发放测试用户邀请码，明文邀请码只在生成时返回一次
- SQLite 本地持久化与 FastAPI 接口
- 首页“问 AI”悬浮入口和问题理解确认
- 首页课程切换、大字模式、AI 操作引导和账号管理快捷入口
- “从入门到上岗”五阶段概览：线上基础、实操、技能等级证书核验与就业准备
- 浏览器原生中文播报：AI 回答、课程结论与步骤、课程测验及前后测题目
- 仅检索已发布课程的受控回答、课程来源展示与回答追溯
- 模型未配置时的课程知识降级，以及课程未审核时的停止生成
- 登录后统一选择基础学习版或 AI 专业陪学版，两种方式共享用户、课程与学习进度
- AI 专业版采用独立的对话式学习端口，结合学习记录自然推荐下一步
- AI 学习提醒、示例问题、课程步骤和理解检查融入连续对话，不展示为功能菜单
- AI 对话历史、受控课程检索、标准图片/视频素材接口及父子 Agent 架构预留

## 技术栈与版本

- 前端：Next.js 16、React 19、TypeScript，Node.js 22
- 后端：FastAPI、SQLAlchemy、Pydantic，Python 3.12
- 本地数据库：SQLite

版本约束分别记录在 `.nvmrc`、`.python-version` 和 `VERSION`。

## 本地启动

后端：

```bash
cd backend
uv run --python 3.12 --with-requirements requirements.txt \
  uvicorn app.main:app --reload --port 8740
```

启动时会自动执行 Alembic 迁移。也可以手动执行：

```bash
cd backend
uv run --python 3.12 --with-requirements requirements.txt \
  alembic upgrade head
```

前端：

```bash
cd frontend
npm install
npm run dev -- --port 3001
```

访问 `http://localhost:3001`。前端默认通过 `/backend` 同源代理请求 `http://127.0.0.1:8740`，可参考 `frontend/.env.example` 调整。

### 启用真实模型回答

后端采用 OpenAI-compatible HTTP 接口，配置项位于 `backend/.env.example`：`AI_API_BASE`、`AI_API_KEY`、`AI_MODEL`、`AI_PROVIDER`。只有同时满足以下条件，前端才会标记为“AI 生成回答”：

1. 对应课程版本已完成审核并处于 `published`；
2. 服务端已配置模型，不向浏览器暴露密钥；
3. 模型输出通过结构校验与安全后检查。

未配置模型但有已发布课程时，系统明确标记为“已审核课程整理”；没有已发布课程时停止生成，只推荐候选课程。当前六门种子课程尚未完成真实专业审核，因此本地默认显示“受控准备中”，这不是故障。

## 质量检查

```bash
cd backend
uv run --python 3.12 --with-requirements requirements.txt pytest -q

cd ../frontend
npm run lint
npm run typecheck
npm run build
```

## 主要路由

- `/`：首页和下一步行动
- `/housekeeping`：家政课程路径
- `/assessment/pre`：学习前测
- `/assessment/post`：学习后测
- `/report`：学习报告
- `/ask`：家政问题提问
- `/records`：学习记录
- `/welcome`：内部测试邀请码登录
- `/privacy`：内部测试与隐私说明
- `/account`：退出登录与删除学习数据
- `/career-path`：从入门学习到上岗准备的全流程概览
- `/admin/content`：内部课程审核与发布
- `/admin/invitations`：测试用户邀请码发放

学习前后测当前使用题库版本 `v0.4-test-2`：前测 12 题、后测 12 题，六个家政模块各 2 题。旧版测评记录继续按其原题库版本读取和评分。

提问页在提交后原地展示回答或暂停生成原因，并提示相关课程；只有用户主动点击“去学习相关课程”才进入学习页。有效回答支持浏览器中文播报。

开发环境默认学习邀请码为 `INVITE_CODE_REMOVED`，管理员邀请码为
`INVITE_CODE_REMOVED`，可以通过环境变量替换。生产环境不会自动创建这两个邀请码；应先安全配置管理员身份，再由管理员逐个发放学员邀请码。`ADMIN_API_KEY` 只保留为内部应急访问方式，不能向测试用户发送。

## 发布边界

当前版本仅适合邀请制内部测试。系统已经具备测试用户身份、数据删除和课程审核工具，但六门种子课程仍属于过渡期候选内容；完成真实专业人员审核前，不得作为正式职业培训或证书课程对外传播。下一步仍需完成生产数据库配置、CSRF 与限流加固、错误监控、部署验收及首批用户试学。
