# 阿嬷学院 v0.4.0｜第三阶段家政内测版

面向 40—60 岁、希望进入家政行业的女性，提供低门槛的入门学习与学习效果验证。本阶段只开放家政方向，形成“前测 → 课程学习 → 后测 → 学习报告”的可体验闭环。

当前代码标识：`0.4.0-phase3-slice1`。

> 课程是内部测试候选内容，尚未完成家政专业人员审核，不得以正式职业培训或证书课程名义对外发布。就业、考证和线下机构服务仍是后续阶段能力。

## 已实现

- 阿嬷学院手机端首页与家政学习路径
- 6 门家政入门候选课程及学习进度恢复
- 前测、逐题保存、交卷和后测
- 学习提升报告与下一步建议
- 家政问题提问、课程三步学习、随堂测验、学习记录
- SQLite 本地持久化与 FastAPI 接口

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

前端：

```bash
cd frontend
npm install
npm run dev -- --port 3001
```

访问 `http://localhost:3001`。前端默认通过 `/backend` 同源代理请求 `http://127.0.0.1:8740`，可参考 `frontend/.env.example` 调整。

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

## 发布边界

当前版本仅适合内部测试。对外测试前仍需完成课程专业审核、真实测试用户身份与邀请机制、隐私说明、生产数据库迁移、错误监控及部署验收。
