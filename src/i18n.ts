import * as vscode from 'vscode';

/** Runtime UI strings (toasts, prompts, errors, picker labels). */
const en: Record<string, string> = {
	// Model picker
	'model.kimi-k3.detail': 'Flagship model, 1M context, always reasons',
	'model.kimi-k3.tooltip':
		'Kimi K3 — flagship model (2.8T params), 1M context window, native visual understanding. Always reasons (reasoning_effort=max).',
	'model.kimi-k2.7-code.detail': 'Coding model, 256K context, always reasons',
	'model.kimi-k2.7-code.tooltip':
		'Kimi K2.7 Code — coding-focused, 256K context, text/image/video input, thinking always on with Preserved Thinking.',
	'model.kimi-k2.7-code-highspeed.detail': 'High-speed coding model (~180 tokens/s)',
	'model.kimi-k2.7-code-highspeed.tooltip':
		'Kimi K2.7 Code HighSpeed — same as K2.7 Code but ~180 tokens/s (up to 260 in short context). 256K context.',
	'model.kimi-k2.6.detail': 'General model, 256K context',
	'model.kimi-k2.6.tooltip':
		'Kimi K2.6 — general-purpose, 256K context, text/image/video input, toggleable thinking mode.',
	'model.kimi-k2.5.detail': 'General model, 256K context',
	'model.kimi-k2.5.tooltip': 'Kimi K2.5 — general-purpose, 256K context, toggleable thinking mode.',
	'model.custom.detail': 'Custom model',

	// Auth
	'auth.apiKeyRequiredDetail': 'Run "Kimi: Set API Key" to configure.',
	'auth.prompt':
		'Enter your Kimi (Moonshot AI) API key. Create one at platform.kimi.ai (International) or platform.kimi.com (Mainland China).',
	'auth.placeholder': 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
	'auth.emptyValidation': 'API key cannot be empty',
	'auth.saved': 'Kimi API key saved.',
	'auth.removed': 'Kimi API key removed.',
	'auth.notConfigured': 'Kimi API key not configured. Run "Kimi: Set API Key" from the Command Palette.',

	// Login method selection (membership mode)
	'auth.login.placeHolder': 'Choose how to sign in to Kimi Code Membership',
	'auth.login.oauth': 'Sign in with browser (OAuth)',
	'auth.login.oauthDetail': 'Authorize via the Kimi device-code login flow (recommended).',
	'auth.login.apiKey': 'Paste an API key',
	'auth.login.apiKeyDetail': 'Use a Kimi Code Console API key from kimi.com/code/console.',
	'auth.promptMembership': 'Enter your Kimi Code API key from kimi.com/code/console.',

	// OAuth (Kimi Code membership login)
	'oauth.prompt': 'Authorize Kimi Code: open the URL and enter code {0} (expires in {1} min).',
	'oauth.copyCode': 'Copy Code',
	'oauth.openUrl': 'Open URL',
	'oauth.waiting': 'Waiting for Kimi Code authorization…',
	'oauth.loginSuccess': 'Kimi Code authorized. Membership models are now available.',
	'oauth.expired': 'The Kimi Code authorization code expired. Please try again.',
	'oauth.denied': 'Kimi Code authorization was denied.',
	'oauth.startFailed': 'Failed to start Kimi Code login. Check your network and try again.',
	'oauth.tokenFailed': 'Kimi Code login failed: {0}',

	// Thinking control
	'thinking.title': 'Thinking',
	'thinking.on': 'On',
	'thinking.off': 'Off',
	'thinking.on.desc': 'Enable step-by-step reasoning (recommended)',
	'thinking.off.desc': 'Disable reasoning for faster responses',

	// Request limits
	'request.toolsLimitExceeded':
		'Kimi supports at most {0} tools in one request, but this request has {1}. Use VS Code Configure Tools to disable tools you rarely use.',
	'request.retry.rateLimited': 'Kimi is rate limited. Retrying in {0}s ({1}/{2}).',
	'request.retry.busy': 'Kimi is busy. Retrying in {0}s ({1}/{2}).',

	// HTTP errors
	'error.http.400': '[{0}] Invalid request. Check the request parameters.',
	'error.http.401':
		'[{0}] Authentication failed. Check your Kimi API key, or create one for your selected platform.',
	'error.http.401.withCreateApiKeyLink':
		'[{0}] Authentication failed. Check your Kimi API key, or [create one]({1}).',
	'error.http.402': '[{0}] Your Kimi balance is used up. Top up or check your voucher validity.',
	'error.http.404':
		'[{0}] Model or endpoint not found. Check your Region and model id settings.',
	'error.http.422': '[{0}] Invalid parameters. Check the request parameters.',
	'error.http.429': '[{0}] Too many requests. Slow down and try again.',
	'error.http.500': '[{0}] Kimi server error. Retry after a short wait.',
	'error.http.503': '[{0}] Kimi service is overloaded. Retry after a short wait.',
	'error.http.generic': '[{0}] The service returned an error response.',

	// Network errors
	'error.network.dns':
		'[{0}] DNS lookup failed. Check your network connection, firewall, proxy settings, or custom Base URL.',
	'error.network.unreachable':
		'[{0}] The target is unreachable or refused the connection. Check your Base URL, proxy, network, or firewall.',
	'error.network.interrupted':
		'[{0}] The connection was interrupted. Check your network, firewall, or proxy, or try again later.',
	'error.network.timeout':
		'[{0}] Connection timed out. Try again later, or check your network, firewall, or proxy.',
	'error.network.tls':
		'[{0}] TLS/certificate verification failed. Check your proxy settings, certificates, or custom Base URL.',
	'error.network.aborted':
		'[{0}] The request was aborted. If you did not cancel it, check your network or proxy, or try again later.',
	'error.network.protocol':
		'[{0}] The HTTP connection or response parsing failed. Check your proxy, custom Base URL, or service response.',
	'error.network.configuration':
		'[{0}] The request configuration is invalid. Check your custom Base URL or extension settings.',
	'error.network.generic':
		'[{0}] Network request failed. Check your network connection, firewall, proxy settings, or custom Base URL.',
	'error.unknown': 'Kimi request failed: {0}',

	// Error action buttons
	'error.action.setApiKey': 'Set API Key',
	'error.action.createApiKey': 'Create API Key',
	'error.action.viewDetails': 'Show Logs',

	// Lifecycle
	'extension.activateFailed': 'Kimi failed to activate. Run "Kimi: Show Logs" for details.',

	// Usage (membership quota + Standard API balance) status bar
	'usage.status.loading': 'Refreshing…',
	'usage.status.ok.short': '$(sparkle) Kimi {0}%',
	'usage.status.balance.short': '$(wallet) Kimi {0}{1}',
	'usage.status.no-data': 'No usage data for this key.',
	'usage.status.auth-error': 'API key invalid. Click to set your key.',
	'usage.status.network-error': 'Usage unavailable (offline).',
	'usage.status.server-error': 'Usage request failed. Try again later.',
	'usage.tooltip.lastUpdated': 'Last updated: {0}',
	'usage.tooltip.offline': 'Usage unavailable (offline). Showing last data.',
	'usage.tooltip.exhausted': 'Balance exhausted — inference is blocked. Top up or add a voucher.',
	'usage.metric.session': '5h window',
	'usage.metric.weekly': 'Weekly quota',
	'usage.metric.webSearches': 'Web Searches',
	'usage.metric.window.session': '5-hour rolling',
	'usage.metric.window.weekly': '7-day rolling',
	'usage.metric.window.webSearches': 'Monthly',
	'usage.metric.resetsAt': 'Resets: {0}',
	'usage.metric.resetsIn': 'Resets in {0}',
	'usage.plan.label': 'Plan: {0}',
	'usage.plan.renewsAt': 'Renews: {0}',
	'usage.panel.title': 'Kimi Usage',
	'usage.panel.refresh': 'Refresh',
	'usage.panel.setKey': 'Set API Key',
	'usage.panel.offline': 'Offline · showing last data',
	'usage.panel.unavailable': 'Usage unavailable. Use a Kimi Open Platform key or Kimi Code membership (no `baseUrl` override) to view details.',
	'usage.panel.lastUpdated': 'Last updated: {0}',
	'usage.balance.section': 'Account Balance',
	'usage.balance.available': 'Available',
	'usage.balance.voucher': 'Voucher',
	'usage.balance.cash': 'Cash',
	'usage.balance.booster': 'Booster (Extra Usage)',
};

const zh: Record<string, string> = {
	'model.kimi-k3.detail': '旗舰模型，100 万上下文，始终推理',
	'model.kimi-k3.tooltip': 'Kimi K3 — 旗舰模型（2.8T 参数），100 万上下文窗口，原生视觉理解，始终推理（reasoning_effort=max）。',
	'model.kimi-k2.7-code.detail': '编程模型，25.6 万上下文，始终推理',
	'model.kimi-k2.7-code.tooltip': 'Kimi K2.7 Code — 专注编程，25.6 万上下文，支持文本/图像/视频输入，始终开启思考与思考保留。',
	'model.kimi-k2.7-code-highspeed.detail': '高速编程模型（约 180 tokens/s）',
	'model.kimi-k2.7-code-highspeed.tooltip': 'Kimi K2.7 Code HighSpeed — 与 K2.7 Code 相同，输出约 180 tokens/s（短上下文最高 260）。25.6 万上下文。',
	'model.kimi-k2.6.detail': '通用模型，25.6 万上下文',
	'model.kimi-k2.6.tooltip': 'Kimi K2.6 — 通用模型，25.6 万上下文，支持文本/图像/视频输入，可切换思考模式。',
	'model.kimi-k2.5.detail': '通用模型，25.6 万上下文',
	'model.kimi-k2.5.tooltip': 'Kimi K2.5 — 通用模型，25.6 万上下文，可切换思考模式。',
	'model.custom.detail': '自定义模型',

	'auth.apiKeyRequiredDetail': '请运行“Kimi: Set API Key”进行配置。',
	'auth.prompt': '请输入你的 Kimi（月之暗面）API 密钥。可在 platform.kimi.ai（国际版）或 platform.kimi.com（中国大陆）创建。',
	'auth.placeholder': 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
	'auth.emptyValidation': 'API 密钥不能为空',
	'auth.saved': 'Kimi API 密钥已保存。',
	'auth.removed': 'Kimi API 密钥已删除。',
	'auth.notConfigured': '尚未配置 Kimi API 密钥。请在命令面板运行“Kimi: Set API Key”。',

	// 登录方式选择（会员模式）
	'auth.login.placeHolder': '选择 Kimi Code 会员的登录方式',
	'auth.login.oauth': '浏览器登录（OAuth）',
	'auth.login.oauthDetail': '通过 Kimi 设备码登录流程授权（推荐）。',
	'auth.login.apiKey': '粘贴 API 密钥',
	'auth.login.apiKeyDetail': '使用 kimi.com/code/console 的 Kimi Code API 密钥。',
	'auth.promptMembership': '请输入来自 kimi.com/code/console 的 Kimi Code API 密钥。',

	// OAuth（Kimi Code 会员登录）
	'oauth.prompt': '授权 Kimi Code：打开链接并输入验证码 {0}（{1} 分钟内有效）。',
	'oauth.copyCode': '复制验证码',
	'oauth.openUrl': '打开链接',
	'oauth.waiting': '等待 Kimi Code 授权完成…',
	'oauth.loginSuccess': 'Kimi Code 授权成功，会员模型现已可用。',
	'oauth.expired': 'Kimi Code 授权码已过期，请重试。',
	'oauth.denied': 'Kimi Code 授权已被拒绝。',
	'oauth.startFailed': '启动 Kimi Code 登录失败，请检查网络后重试。',
	'oauth.tokenFailed': 'Kimi Code 登录失败：{0}',

	'thinking.title': '思考',
	'thinking.on': '开启',
	'thinking.off': '关闭',
	'thinking.on.desc': '启用逐步推理（推荐）',
	'thinking.off.desc': '关闭推理以获得更快响应',

	'request.toolsLimitExceeded':
		'Kimi 单次请求最多支持 {0} 个工具，但本次请求包含 {1} 个。请使用 VS Code 的“配置工具”关闭不常用的工具。',
	'request.retry.rateLimited': 'Kimi 请求过于频繁。将在 {0} 秒后重试（{1}/{2}）。',
	'request.retry.busy': 'Kimi 服务繁忙。将在 {0} 秒后重试（{1}/{2}）。',

	'error.http.400': '[{0}] 请求无效。请检查请求参数。',
	'error.http.401': '[{0}] 身份验证失败。请检查你的 Kimi API 密钥，或为所选平台创建一个。',
	'error.http.401.withCreateApiKeyLink': '[{0}] 身份验证失败。请检查你的 Kimi API 密钥，或[创建一个]({1})。',
	'error.http.402': '[{0}] 你的 Kimi 余额已用尽。请充值或检查代金券有效期。',
	'error.http.404': '[{0}] 未找到模型或接口。请检查区域和模型 ID 设置。',
	'error.http.422': '[{0}] 参数无效。请检查请求参数。',
	'error.http.429': '[{0}] 请求过于频繁。请放慢速度后重试。',
	'error.http.500': '[{0}] Kimi 服务器错误。请稍后重试。',
	'error.http.503': '[{0}] Kimi 服务繁忙。请稍后重试。',
	'error.http.generic': '[{0}] 服务返回了错误响应。',

	'error.network.dns': '[{0}] DNS 解析失败。请检查网络连接、防火墙、代理设置或自定义 Base URL。',
	'error.network.unreachable': '[{0}] 目标不可达或拒绝连接。请检查 Base URL、代理、网络或防火墙。',
	'error.network.interrupted': '[{0}] 连接中断。请检查网络、防火墙或代理，或稍后重试。',
	'error.network.timeout': '[{0}] 连接超时。请稍后重试，或检查网络、防火墙或代理。',
	'error.network.tls': '[{0}] TLS/证书校验失败。请检查代理设置、证书或自定义 Base URL。',
	'error.network.aborted': '[{0}] 请求已中止。若非你主动取消，请检查网络或代理，或稍后重试。',
	'error.network.protocol': '[{0}] HTTP 连接或响应解析失败。请检查代理、自定义 Base URL 或服务响应。',
	'error.network.configuration': '[{0}] 请求配置无效。请检查自定义 Base URL 或扩展设置。',
	'error.network.generic': '[{0}] 网络请求失败。请检查网络连接、防火墙、代理设置或自定义 Base URL。',
	'error.unknown': 'Kimi 请求失败：{0}',

	'error.action.setApiKey': '设置 API 密钥',
	'error.action.createApiKey': '创建 API 密钥',
	'error.action.viewDetails': '查看日志',

	'extension.activateFailed': 'Kimi 激活失败。请运行“Kimi: Show Logs”查看详情。',

	// 用量（会员配额 + 标准 API 余额）状态栏
	'usage.status.loading': '刷新中…',
	'usage.status.ok.short': '$(sparkle) Kimi {0}%',
	'usage.status.balance.short': '$(wallet) Kimi {0}{1}',
	'usage.status.no-data': '此密钥暂无用量数据。',
	'usage.status.auth-error': 'API 密钥无效。点击设置密钥。',
	'usage.status.network-error': '无法获取用量（离线）。',
	'usage.status.server-error': '用量请求失败，请稍后重试。',
	'usage.tooltip.lastUpdated': '最后更新：{0}',
	'usage.tooltip.offline': '无法获取用量（离线）。显示上次数据。',
	'usage.tooltip.exhausted': '余额已耗尽——推理被阻止。请充值或添加代金券。',
	'usage.metric.session': '5 小时窗口',
	'usage.metric.weekly': '周配额',
	'usage.metric.webSearches': '网页搜索',
	'usage.metric.window.session': '5 小时滚动',
	'usage.metric.window.weekly': '7 天滚动',
	'usage.metric.window.webSearches': '每月',
	'usage.metric.resetsAt': '重置时间：{0}',
	'usage.metric.resetsIn': '{0} 后重置',
	'usage.plan.label': '套餐：{0}',
	'usage.plan.renewsAt': '续期时间：{0}',
	'usage.panel.title': 'Kimi 用量',
	'usage.panel.refresh': '刷新',
	'usage.panel.setKey': '设置 API 密钥',
	'usage.panel.offline': '离线 · 显示上次数据',
	'usage.panel.unavailable': '暂无用量数据。请使用 Kimi 开放平台密钥或 Kimi Code 会员（未配置 baseUrl 覆盖时）以查看详情。',
	'usage.panel.lastUpdated': '最后更新：{0}',
	'usage.balance.section': '账户余额',
	'usage.balance.available': '可用余额',
	'usage.balance.voucher': '代金券',
	'usage.balance.cash': '现金余额',
	'usage.balance.booster': '加油包（Extra Usage）',
};

function isZh(): boolean {
	return vscode.env.language.toLowerCase() === 'zh-cn';
}

/** Translate `key`, substituting `{0}`, `{1}`, … with `args`. */
export function t(key: string, ...args: string[]): string {
	const dict = isZh() ? zh : en;
	let text = dict[key] ?? en[key];
	if (text === undefined) {
		return key;
	}
	for (let i = 0; i < args.length; i++) {
		text = text.replaceAll(`{${i}}`, String(args[i]));
	}
	return text;
}
