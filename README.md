# 阿嬷学院 v0.5.3 Beta 2

家政入门学习与 AI 专业陪学的邀请制测试版本。

当前版本：`0.5.3-beta.2-conversational-feedback`。这是源代码预发布，不是已部署的在线服务。GitHub 仓库或 Release 链接不能直接运行本项目。

## 本次更新

- 专业对话内完成课程理解检查、复述、真人教练反馈、补充重交与下一课；与基础版共享记录。
- 可从底部对话框输入复述（或使用浏览器单轮听写），先填入草稿，确认后才提交；返回页面和恢复网络时刷新复核状态。
- 新增教练复核工作台 `/admin/practice`，包含固定版本课程依据、顺序/安全/交接核对、禁止自审及原始试点计数。
- 学后回顾可在对话中恢复与完成；薄弱点可带入提问，不要求整套重刷。没有课前测评时保留真实学后成绩，不计算提升幅度。
- 修复学员接口暴露正确答案、越级结课、重复提交，以及本机 127.0.0.1 开发脚本被拦截的问题。

线上复述不等于实操考核、职业认证或上岗资格。草稿尚不支持跨刷新保存；听写能力取决于浏览器，未新增全双工通话、系统推送或自动专业判卷。

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

**安全发布限制（2026-10-17）：** 对锁定依赖执行 `npm audit` 报告10项依赖告警（9 high、1 critical），涉及 Next.js 16.3.2、sharp 及开发工具依赖。测试与构建通过不代表安全审计通过；本次只同步已验收的源码测试版，没有更换框架依赖。不得直接将此版本部署为面向公网的生产服务；需先完成依赖修复和回归验收。可参考 [Next.js 安全公告](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)，实际影响需按部署方式核查。

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

启动会自动执行迁移。升级前先备份数据库；从 v0.5.2 升级会新增迁移 0009_practice_attempts，用于复述与人工复核记录。更早版本还会执行 0008_learning_preferences。不要复制示例环境覆盖已有生产配置；回退程序与数据库应使用同一时点的备份。

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

新增闭环验收脚本：在 frontend 执行 `PLAYWRIGHT_MODULE=/absolute/path/to/playwright node scripts/outcomes.smoke.cjs`。需 backend/.venv、Chrome 及空闲的 3023/8763 端口。脚本创建临时数据库与随机邀请码，关闭真实模型密钥，结束后关闭自己的测试服务；不会针对真实用户数据库运行。覆盖对话草稿、取消、失败保留、返回刷新、教练复核、共享记录和学后回顾。发布前本地验收：后端28项、前端检查及构建、浏览器16类场景通过；这不代替生产与真实手机语音验收。

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
| /admin/content、/admin/invitations、/admin/practice | 内容审核、邀请码与复述复核 |

版本变化见 [CHANGELOG.md](CHANGELOG.md)。本仓库不包含个人运行配置、真实密钥、用户数据库或内部工作资料。
