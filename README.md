# Recall

英语主动回忆、拼写与间隔复习网站。前端部署到 Vercel，账户、个人词库和学习进度存储在 Supabase。

## 本地运行

1. 在 Supabase 创建项目。
2. 在 SQL Editor 执行 `supabase/schema.sql`。
3. 复制 `.env.example` 为 `.env.local`，填写 Project URL 和 Publishable key。
4. 安装并运行：

```bash
npm install
npm run dev
```

## 部署到 Vercel

将 Vercel 的 Root Directory 设置为 `code`，并添加以下环境变量：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Build Command 使用 `npm run build`，Output Directory 使用 `dist`。`vercel.json` 已配置 SPA 深链接回退。更新环境变量后需要重新部署。

在 Supabase Authentication 的 URL Configuration 中，将 Vercel 正式域名设为 Site URL，并把预览或自定义域名加入 Redirect URLs。生产环境应启用邮箱验证。

## 个人词库格式

支持 JSON 数组，或 `{ "items": [...] }`。每个词条至少需要：

```json
{
  "id": "my-0001",
  "category": "My IELTS",
  "lemma": "begin",
  "sentence": "the class began at nine",
  "translation": "课程九点开始",
  "answer": "began",
  "targetType": "word",
  "aliases": []
}
```

同一账户再次上传相同 `id` 会更新词条。不同账户的数据由数据库 RLS 隔离。
