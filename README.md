# OpenRouter Query

一个使用 **Slint + Node.js** 构建的原生桌面小工具。输入 OpenRouter API Key 后，查看 Key 的消费统计、免费请求额度和当前免费模型列表。

## 功能

- 查询 Key 累计、今日、本周、本月消费（USD）
- 查询 Key 剩余额度
- 查询免费模型每日请求已用量、上限和剩余量
- 获取模型目录，并筛选 ID 以 `:free` 结尾的模型
- 显示模型上下文长度、输入价格和输出价格
- Key 输入框使用密码模式；Key 只保存在当前应用进程内，不写入配置文件或仓库

## 环境要求

- Node.js 22.18 或更新版本
- npm
- Slint Node.js 当前为 Beta 版本，首次运行需要安装其平台依赖

## 运行

```bash
npm install
npm start
```

## 使用

1. 启动应用。
2. 在 API KEY 输入框粘贴 OpenRouter API Key。
3. 点击「查询数据」。
4. 点击按钮可再次刷新统计。

## 数据来源

- `GET https://openrouter.ai/api/v1/key`：当前 Key 的使用量、额度与 `free_model_daily_requests`。
- `GET https://openrouter.ai/api/v1/models`：模型目录；本应用筛选模型 ID 以 `:free` 结尾的免费变体。

免费请求计数是账户级的免费模型请求额度，不是每个模型单独分配的额度。OpenRouter 的免费模型规则和每日上限可能调整，请以接口实时返回值和[官方限额文档](https://openrouter.ai/docs/api-reference/limits)为准。

## 安全说明

- API Key 通过 HTTPS 请求 OpenRouter。
- Key 不会写入磁盘、日志或 Git 仓库；关闭应用后需要重新输入。
- 请勿在他人设备上输入 API Key。若怀疑 Key 泄露，请在 OpenRouter 控制台撤销并重新生成。

## 项目结构

```
.
├── src/
│   └── main.js
├── ui/
│   └── app-window.slint
├── package.json
└── README.md
```

## License

MIT
