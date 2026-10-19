# 步调 GitHub Pages 发布包

这是可上传到 GitHub 的公开静态网站包，包含网页、样式、交互脚本和 Pages 自动发布工作流。没有 API 密钥，也不包含项目内部材料。

## 发布步骤

1. 在 GitHub 新建公开仓库，建议命名为 `budiao-campus-agent`。
2. 把本文件所在目录里的全部内容上传到仓库根目录，包含隐藏目录 `.github/workflows`、`site` 文件夹和本 README。
3. 打开仓库的 **Settings → Pages**，将 **Build and deployment → Source** 设为 **GitHub Actions**。
4. 打开 **Actions**，等 `Deploy GitHub Pages` 工作流变为绿色。
5. 页面网址会是 `https://你的GitHub用户名.github.io/budiao-campus-agent/`；复制该网址用于评委体验。

GitHub Free 账号的 Pages 需要公开仓库，因此仓库源码会公开。这个发布包不含密钥或个人资料。不要把任何 API 密钥上传到仓库。

## 当前功能边界

- 计划推荐在浏览器中按本地规则生成，运动历史保存在访问者当前浏览器，不同步到云端。
- GPS 需要手机浏览器授权；公开 HTTPS 页面可申请定位。浏览器后台运行、锁屏定位效果因手机而异。
- 页面中的“体验 AI 对话（扣子）”会打开团队的扣子智能体链接；扣子聊天需要登录扣子。
- GitHub Pages 只托管静态网页，不运行 Node.js 服务端。因此网页本身不是已连接模型的在线聊天机器人。
