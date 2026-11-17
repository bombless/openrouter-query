import { AppWindow } from "../ui/app-window.slint";

const API_BASE = "https://openrouter.ai/api/v1";
const window = new AppWindow();

function money(value) {
    if (value === null || value === undefined) return "不限 / 未提供";
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    }).format(number);
}

function count(value) {
    if (value === null || value === undefined) return "—";
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("zh-CN").format(number) : "—";
}

async function getJson(path, apiKey) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(20000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.error?.message || payload?.message || response.statusText;
        throw new Error(`HTTP ${response.status}: ${message}`);
    }
    return payload;
}

async function refresh() {
    const apiKey = window.api_key.trim();
    if (!apiKey) {
        window.status_text = "请先输入 OpenRouter API Key。";
        return;
    }

    window.busy = true;
    window.status_text = "正在读取 Key 使用统计和免费模型列表…";

    try {
        const [keyResponse, modelResponse] = await Promise.all([
            getJson("/key", apiKey),
            getJson("/models", apiKey),
        ]);

        const key = keyResponse?.data;
        if (!key) throw new Error("Key 接口没有返回 data 字段。");

        const freeRequests = key.free_model_daily_requests ?? {};
        const models = Array.isArray(modelResponse?.data) ? modelResponse.data : [];
        const freeModels = models
            .filter((model) => String(model.id || "").endsWith(":free"))
            .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));

        window.key_label = key.label || "当前 API Key";
        window.usage_total = money(key.usage);
        window.usage_daily = money(key.usage_daily);
        window.usage_weekly = money(key.usage_weekly);
        window.usage_monthly = money(key.usage_monthly);
        window.limit_remaining = key.limit_remaining == null
            ? "不限额"
            : money(key.limit_remaining);
        window.free_used = count(freeRequests.used);
        window.free_limit = count(freeRequests.limit);
        window.free_remaining = count(freeRequests.remaining);
        window.free_model_count = count(freeModels.length);

        window.models_text = freeModels.length
            ? freeModels.map((model, index) => {
                const context = model.context_length
                    ? `上下文 ${count(model.context_length)}`
                    : "上下文未知";
                const prompt = model.pricing?.prompt;
                const completion = model.pricing?.completion;
                return `${String(index + 1).padStart(2, "0")}. ${model.name || model.id}\n    ${model.id}\n    ${context}  ·  输入 ${prompt ?? "—"}  ·  输出 ${completion ?? "—"}`;
            }).join("\n\n")
            : "当前模型列表中没有 ID 以 :free 结尾的模型。";

        const tier = key.is_free_tier ? "免费账户档位" : "非免费账户档位";
        window.status_text = `查询成功 · ${tier} · 数据更新时间：${new Date().toLocaleString()}`;
    } catch (error) {
        window.status_text = `查询失败：${error.message}\n请检查 API Key、网络连接或 OpenRouter 服务状态。`;
    } finally {
        window.busy = false;
    }
}

window.refresh_requested = refresh;

await window.run();
