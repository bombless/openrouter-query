import { AppWindow } from "../ui/app-window.slint";
import keytar from "keytar";

const API_BASE = "https://openrouter.ai/api/v1";
const SERVICE = "openrouter-query";
const ACCOUNT = "openrouter-api-key";
const window = new AppWindow();

function money(value) {
    if (value == null) return "不限 / 未提供";
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(n) : "—";
}
function count(value) {
    if (value == null) return "—";
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat("zh-CN").format(n) : "—";
}
async function getJson(path, apiKey) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    return payload;
}
async function postChat(apiKey, model, messages) {
    const response = await fetch(`${API_BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ model, messages, stream: false }),
        signal: AbortSignal.timeout(120000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    const answer = payload?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) throw new Error("模型没有返回文本内容。");
    return answer;
}

let availableModels = [];
let conversation = [];
let selectedModel = "";
let sending = false;

window.select_model_requested = (id) => {
    selectedModel = id;
    conversation = [];
    window.selected_model_id = id;
    window.selected_model_name = availableModels.find(m => m.id === id)?.name || id;
    window.chat_text = "已切换模型。开始输入消息即可进行多轮对话。";
};
window.send_requested = async () => {
    const apiKey = window.api_key.trim();
    const prompt = window.chat_input.trim();
    if (!apiKey) { window.status_text = "请先输入 OpenRouter API Key。"; return; }
    if (!selectedModel) { window.chat_text = "请先从左侧免费模型列表中选择一个模型。"; return; }
    if (!prompt || sending) return;
    sending = true;
    window.busy = true;
    const next = [...conversation, { role: "user", content: prompt }];
    window.chat_input = "";
    window.chat_text = [...next.map(m => `${m.role === "user" ? "你" : "助手"}：\n${m.content}`), "助手：\n正在生成…"].join("\n\n");
    try {
        const answer = await postChat(apiKey, selectedModel, next);
        conversation = [...next, { role: "assistant", content: answer }];
        window.chat_text = conversation.map(m => `${m.role === "user" ? "你" : "助手"}：\n${m.content}`).join("\n\n");
    } catch (error) {
        window.chat_text = [...next.map(m => `${m.role === "user" ? "你" : "助手"}：\n${m.content}`), `请求失败：\n${error.message}`].join("\n\n");
    } finally {
        sending = false;
        window.busy = false;
    }
};

async function refresh() {
    const apiKey = window.api_key.trim();
    if (!apiKey) { window.status_text = "请先输入 OpenRouter API Key。"; return; }
    window.busy = true;
    window.status_text = "正在读取 Key 使用统计和免费模型列表…";
    try {
        // Persist only in the operating system credential vault (Keychain / Credential Manager / Secret Service).
        await keytar.setPassword(SERVICE, ACCOUNT, apiKey);
        const [keyResponse, modelResponse] = await Promise.all([getJson("/key", apiKey), getJson("/models", apiKey)]);
        const key = keyResponse?.data;
        if (!key) throw new Error("Key 接口没有返回 data 字段。");
        const freeRequests = key.free_model_daily_requests ?? {};
        availableModels = (Array.isArray(modelResponse?.data) ? modelResponse.data : [])
            .filter(m => String(m.id || "").endsWith(":free"))
            .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
        window.key_label = key.label || "当前 API Key";
        window.usage_total = money(key.usage);
        window.usage_daily = money(key.usage_daily);
        window.usage_weekly = money(key.usage_weekly);
        window.usage_monthly = money(key.usage_monthly);
        window.limit_remaining = key.limit_remaining == null ? "不限额" : money(key.limit_remaining);
        window.free_used = count(freeRequests.used);
        window.free_limit = count(freeRequests.limit);
        window.free_remaining = count(freeRequests.remaining);
        window.free_model_count = count(availableModels.length);
        window.models = availableModels.map(m => ({
            id: m.id,
            name: m.name || m.id,
            details: `上下文 ${count(m.context_length)} · 输入 ${m.pricing?.prompt ?? "—"} · 输出 ${m.pricing?.completion ?? "—"}`,
        }));
        window.status_text = `查询成功 · ${key.is_free_tier ? "免费账户档位" : "非免费账户档位"} · ${new Date().toLocaleString()}`;
        if (!selectedModel && availableModels.length) window.select_model_requested(availableModels[0].id);
    } catch (error) {
        window.status_text = `查询失败：${error.message}\n请检查 API Key、系统凭据库、网络或 OpenRouter 服务状态。`;
    } finally { window.busy = false; }
}
window.refresh_requested = refresh;

try {
    const savedKey = await keytar.getPassword(SERVICE, ACCOUNT);
    if (savedKey) {
        window.api_key = savedKey;
        window.status_text = "已从系统凭据库恢复 API Key，正在刷新数据…";
        await refresh();
    }
} catch (error) {
    window.status_text = `无法读取系统凭据库：${error.message}。仍可手动输入 Key 使用。`;
}
await window.run();
