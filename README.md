# Lexi Cycle

Lexi Cycle 是一个英语主动回忆、拼写与间隔复习网站。前端部署到 Vercel，账户、个人词库和学习进度存储在 Supabase。

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

## Task 2 写作专项

首页新增“范文与模板”“观点与展开”“句型与短语”。围绕同一题目切换专项，支持提纲、因果链、英文段落、短语挖空、句子复现、迁移造句及整篇写作。有提示、少提示和独立练习可切换。

内容位于 `src/data/writing/`：12 篇范文、3 类模板、25 个观点条目、6 条展开路径、42 条表达练习和完整 Markdown 源材料。运行 `python3 scripts/import_writing.py`（仓库根目录）可重新导入已确认资料。固定练习例句中的来源已标注；范文 1 的题干为推拟，范文 3 保留开头修订记录。

草稿按账户、题目和练习分别自动保存在本机；提交记录会保留当时的内容、提示模式、自查项和耗时。整篇模式可以查看同一题目的已有提纲及观点段落。时间显示为草稿开始至今的时间，含离开页面的时间，可点击“重新计时”开始新一轮。

跨设备保存和恢复需要先在 Supabase SQL Editor 执行 `supabase/writing.sql`。未执行时本机练习仍可使用，云端失败会显示提示；可在记录页重试同步单条记录，草稿也可手动同步。恢复按钮只用较新的云端草稿替换本机内容。最多展示最近 300 条记录。

固定短语使用明确标准答案；自主观点、段落、迁移句和文章不会强制匹配范文。句子复现提供文本差异核对。自查与文本一致度均不是 IELTS 分数；当前版本未接入 AI 批改。

验证：`npm test`、`npm run lint`、`npm run typecheck`、`npm run build`。

### 所有专项计入学习榜单

执行顺序：`schema.sql` → `leaderboard.sql` → `dictation.sql` → `writing.sql` → **`leaderboard-all-practice.sql`**。已有部署只需执行最后的升级脚本（前提是前面的表已建立）。如果重新执行旧版 `leaderboard.sql`，请再次执行最后的升级脚本。

升级使用数据库触发器：常规词汇、句子默写和作文三个专项的有效提交统一更新榜单；保存草稿、空内容和跳过题目不计入。写作重复同步使用同一记录 ID，默写使用会话、句子及提交类型组成的稳定键；重试不会增加重复积分。历史云端写作和默写记录会补计一次，本机尚未同步的记录需在记录页同步后才计入。

今日／本周榜的完成量包含自主写作，但正确率和正确率样本系数只使用可判定正误的练习。自主写作计入总榜基础积分 5 分，不计作首次正确或新掌握；完成第 20 次的奖励与每日 300 分上限继续适用。固定短语只有独立、未查看参考、未在本轮答错时答对才计首次正确。默写在首次展示答案前记录初次答案是否正确；历史默写缺少这一信息，只补完成量及原记录相应的基础积分，不编造首次正确率。

`leaderboard-all-practice.test.sql` 提供可回滚的 PostgreSQL 集成检查，用于验证正常练习、写作、默写、重复同步、草稿、跳过、正确率和连续学习的汇总行为。需在实际测试数据库完成迁移后执行。
