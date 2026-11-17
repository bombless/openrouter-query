# OpenRouter Query

一个使用 **Slint + Node.js** 构建的原生桌面工具：查看 OpenRouter Key 用量、浏览免费模型，并直接与选中的免费模型进行多轮对话。

## 功能

- 查询 Key 累计、今日、本周、本月消费与剩余额度
- 获取免费模型目录（模型 ID 以 `:free` 结尾），支持滚动浏览
- 点击模型即可选择并开始独立会话
- 多轮上下文对话，通过 OpenRouter `/chat/completions` 请求
- API Key 持久化到操作系统凭据库，关闭并重新打开应用后自动恢复

## 运行

需要 Node.js 22.18+、npm，以及 Slint Node.js 平台依赖。

```bash
npm install
npm start
```

## API Key 安全

Key 使用 `keytar` 存入操作系统凭据管理设施（macOS Keychain、Windows Credential Manager，或 Linux Secret Service）。应用不会将 Key 明文写入项目配置文件或仓库。首次输入 Key 后点击「查询数据」即可保存；后续启动会尝试自动恢复。

若系统未配置可用凭据服务，应用会提示错误，但仍可手动输入 Key 使用。请勿在他人设备上保存 Key；如怀疑泄露，请在 OpenRouter 控制台撤销并重新生成。

## 使用

1. 输入 OpenRouter API Key，点击「查询数据」。
2. 在左侧滚动列表中点击一个免费模型。
3. 在右侧输入消息并点击「发送」；后续消息会沿用当前会话上下文。
4. 点击其他模型会开始一个新的会话。

## 数据来源

- `GET /api/v1/key`：Key 使用量、额度与免费请求统计
- `GET /api/v1/models`：免费模型目录
- `POST /api/v1/chat/completions`：多轮对话

免费请求额度以 OpenRouter 实时接口和[官方限额文档](https://openrouter.ai/docs/api-reference/limits)为准。

## License

MIT
