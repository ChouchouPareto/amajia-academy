# 4060AI学习助手｜第一阶段纵向切片

本项目只实现第一阶段内部闭环：测试身份进入、选择演示问题、确认、3步学习、答题、完成和学习记录恢复。

> 所有知识文案均为未审核的内部演示内容，不可对真实用户发布。当前未接入语音、真实模型、微信登录和支付。

## 目录

- `backend/`：FastAPI、SQLAlchemy和SQLite本地持久化。
- `frontend/`：Next.js手机Web页面。

## 后端启动

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8740
```

## 前端启动

```bash
cd frontend
npm install
npm run dev -- --port 3740
```

访问 `http://localhost:3740`。

## 检查

```bash
cd backend && pytest
cd frontend && npm run lint && npm run typecheck && npm run build
```
