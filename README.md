# 阿嬷学院 v0.5.2 Beta 2

家政入门学习与 AI 专业陪学的邀请制测试版本。

当前版本：`0.5.2-beta.2-ui-fusion`。这是源代码预发布，不是已部署的在线服务。GitHub 仓库或 Release 链接不能直接运行本项目。

## 当前能力

- 基础版按课程学习，专业版在对话内逐步讲解、补讲、检查与保存进度。
- 统一登录入口按账号保存的偏好进入基础或专业首页；切换版本先选择，再确认。
- 共享账号、课程、知识与学习记录，不混用两个版本的学习页面。
- 12 门家政就业入门候选课程、100 道候选情景题、掌握度与测评报告。
- 课程与媒体审核、版本固定、已发布知识检索与回答来源。
- 浏览器中文播报、单轮语音输入及文字降级。
- UI V2：统一顶部间距与左对齐、白卡片轻阴影、深绿主操作、凹陷输入、来源与素材按需展开。
- HttpOnly 会话、角色权限、账号数据删除、管理员邀请码发放、数据库增量迁移。

专业版测试期间免费。版本偏好不是付费资格；正式收费需要补充服务端权益校验。

## 测试与内容边界

课程、题库及部分素材位仍是候选内容，不代表专业审核通过、职业资格或实际就业能力。正式回答仅检索已发布知识；没有可靠内容时应停止生成。尚未实现全双工实时语音通话；听写和播报不等于实时通话。

此版本不能直接以正式职业培训或证书课程对外服务。真实专业审核、授权图视频、真实手机与微信端验收、生产安全加固、监控与部署仍待完成。

## 技术栈

Next.js 16.3.2 / React 19.2.6 / TypeScript；Node.js 22—24。后端 FastAPI / SQLAlchemy / Alembic / Python 3.12，本地使用 SQLite。

## 本地启动

后端环境变量样例见 `backend/.env.example`。实际配置保存在本机或部署平台，不能提交到仓库。先设置私有的 `LEARNER_INVITE_CODE` 和 `ADMIN_INVITE_CODE`；空值不会创建开发邀请码。不要将邀请码发送到公共仓库。

```bash
cd backend
uv run --python 3.12 --with-requirements requirements.txt \
  python -m uvicorn app.main:app --reload --port 8740
```

启动前须将环境变量注入当前进程；样例文件不会自动变成运行配置。生产环境不自动创建开发邀请码，管理员身份需通过安全运维流程配置。

```bash
cd frontend
npm ci
npm run dev -- --port 3001
```

本机访问 http://localhost:3001。前端通过 /backend 代理到 127.0.0.1:8740，可使用 API_SERVER_BASE 修改后端地址。localhost 地址只适用于运行服务的电脑，不能作为外部试用链接分享。

启动会自动执行迁移。升级前先备份数据库；本版本新增 0008_learning_preferences 表，用于账号版本偏好。不要复制示例环境覆盖已有生产配置。

## 模型与素材

通过服务端 AI_API_BASE、AI_API_KEY、AI_MODEL、AI_PROVIDER 配置 OpenAI-compatible 服务。AI_COACH_MODEL 与 AI_ROUTER_MODEL 可独立配置陪学和意图路由模型。不向浏览器暴露密钥。

实际模型可用、课程已发布且输出通过检查后，才能标记为模型生成。素材必须有来源、授权和审核状态；缺失时不使用虚假图片或视频代替。

## 质量检查

```bash
cd backend
uv run --python 3.12 --with-requirements requirements.txt python -m pytest -q
cd ../frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

浏览器验收脚本：frontend/scripts/ui-v2.smoke.cjs。需预先安装 Playwright/Chrome，设置 PLAYWRIGHT_MODULE、UI_TEST_URL、UI_TEST_INVITE，并仅针对隔离测试数据库运行。脚本会更改测试账号偏好与课程进度，不能对生产账号执行。

## 主要路由

| 路由 | 用途 |
|---|---|
| / | 按账号偏好进入对应首页 |
| /basic | 基础版首页 |
| /coach | 专业版对话陪学 |
| /choose-mode | 选择并确认学习版本 |
| /housekeeping | 家政课程 |
| /records | 学习记录 |
| /assessment/pre、/assessment/post | 前后测 |
| /report | 学习报告 |
| /search | 基础版知识搜索 |
| /career-path | 上岗准备路径 |
| /welcome、/account | 登录与账号 |
| /admin/content、/admin/invitations | 内容审核与邀请码管理 |

版本变化见 [CHANGELOG.md](CHANGELOG.md)。本仓库不包含个人运行配置、真实密钥、用户数据库或内部工作资料。
