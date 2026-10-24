import * as vscode from 'vscode';

/** Runtime UI strings (toasts, prompts, errors, picker labels). */
const en: Record<string, string> = {
	// Model picker
	'model.k3.1-pro.detail': 'Newest flagship model, up to 1M context, thinking only',
	'model.k3.1-pro.tooltip':
		'Kimi Code K3.1 Pro — newest flagship (3T params), up to 1M context, image/video input. Thinking-only model: low/high/max effort (default high); the API rejects turning thinking off.',
	'model.k3.1-pro-highspeed.detail': 'High-speed K3.1 Pro (~2-3x faster), up to 1M context',
	'model.k3.1-pro-highspeed.tooltip':
		'Kimi Code K3.1 Pro Highspeed — same capability as K3.1 Pro at ~2-3x speed (about 2x usage). Up to 1M context, image/video input, thinking-only with low/high/max effort.',
	'model.kimi-k3.1-pro.detail': 'Newest flagship model, 1M context, thinking only',
	'model.kimi-k3.1-pro.tooltip':
		'Kimi K3.1 Pro — newest flagship (3T params), 1M context, image/video input. Thinking-only model: low/high/max effort (default high); the API rejects turning thinking off.',
	'model.kimi-k3.1-pro-highspeed.detail': 'High-speed flagship (~2-3x faster), 1M context',
	'model.kimi-k3.1-pro-highspeed.tooltip':
		'Kimi K3.1 Pro HighSpeed — same capability as K3.1 Pro at ~2-3x speed. 1M context, image/video input, thinking-only with low/high/max effort.',
	'model.k3.detail': 'Kimi Code flagship model, 1M context',
	'model.k3.tooltip':
		'Kimi Code K3 — flagship coding model, 1M context window, image/video input. Supports low/high/max reasoning effort; turning thinking off routes to the K2.8 no-thinking backend.',
	'model.k3-256k.detail': 'Kimi Code flagship model, 256K context',
	'model.k3-256k.tooltip':
		'Kimi Code K3 256K — lower-quota K3 variant with 256K context and image input. Supports low/high/max reasoning effort; turning thinking off routes to the K2.8 no-thinking backend.',
	'model.kimi-for-coding.detail': 'K2.8 Preview in Kimi Code, up to 1M context',
	'model.kimi-for-coding.tooltip':
		'Kimi for Coding — K2.8 Preview under the existing model id, up to 1M context, image/video input. Supports low/high/max reasoning effort; turning thinking off routes to the K2.8 no-thinking backend.',
	'model.kimi-for-coding-highspeed.detail': 'High-speed Kimi Code model, 256K context',
	'model.kimi-for-coding-highspeed.tooltip':
		'Kimi for Coding HighSpeed — K2.7 Code HighSpeed in Kimi Code, 256K context, image/video input, about 5-6x output speed. Thinking stays on and has no effort selector.',
	'model.kimi-k3.detail': 'Flagship model, 1M context, always reasons',
	'model.kimi-k3.tooltip':
		'Kimi K3 — flagship model (2.8T params), 1M context window, native visual understanding. Always reasons and supports low/high/max reasoning effort.',
	'model.kimi-k2.7-code.detail': 'Coding model, 256K context, always reasons',
	'model.kimi-k2.7-code.tooltip':
		'Kimi K2.7 Code — coding-focused, 256K context, text/image/video input, thinking always on with Preserved Thinking.',
	'model.kimi-k2.7-code-highspeed.detail': 'High-speed coding model (~180 tokens/s)',
	'model.kimi-k2.7-code-highspeed.tooltip':
		'Kimi K2.7 Code HighSpeed — same as K2.7 Code but ~180 tokens/s (up to 260 in short context). 256K context.',
	'model.kimi-k2.6.detail': 'General model, 256K context',
	'model.kimi-k2.6.tooltip':
		'Kimi K2.6 — general-purpose, 256K context, text/image/video input, toggleable thinking mode. Note: the K2 series is scheduled to be retired from the Open Platform by the end of December 2026.',
	'model.custom.detail': 'Custom model',

	// Auth
	'auth.apiKeyRequiredDetail': 'Run "Kimi: Set API Key" to configure.',
	'auth.prompt':
		'Enter a Kimi API key. The extension will detect Kimi Code membership vs Standard API access automatically, and set the region when possible.',
	'auth.placeholder': 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
	'auth.emptyValidation': 'API key cannot be empty',
	'auth.saved': 'Kimi API key saved.',
	'auth.removed': 'Kimi API key removed.',
	'auth.notConfigured': 'Kimi API key not configured. Run "Kimi: Set API Key" from the Command Palette.',
	'auth.detecting': 'Checking Kimi membership and Standard API access…',
	'auth.saved.membershipDetected': 'Detected Kimi Code membership access and switched to Membership mode.',
	'auth.saved.standardDetected': 'Detected a Standard API key and switched to Standard API ({0}).',
	'auth.saved.standardFallback': 'Saved this Standard API key as a fallback for Membership mode and set the region to {0}.',
	'auth.saved.unknown': 'Kimi API key saved, but the extension could not determine the correct mode automatically. Current mode was kept.',
	'auth.invalid': 'This API key is not valid for Kimi Code membership or the Kimi Open Platform. It was not saved.',
	'auth.detect.placeHolder': 'Choose where to save this key because automatic detection was inconclusive',
	'auth.detect.membership': 'Save as Kimi Code membership key',
	'auth.detect.membershipDetail': 'Use this for Kimi Code membership access and quota tracking.',
	'auth.detect.standard': 'Save as Standard API key',
	'auth.detect.standardDetail': 'Use this for Open Platform pay-as-you-go access and balance tracking.',
	'auth.detect.standardDetailWithRegion': 'Use this for Open Platform pay-as-you-go access and set the region to {0}.',
	'region.international': 'International',
	'region.china': 'Mainland China',

	// Login method selection (membership mode)
	'auth.login.placeHolder': 'Choose how to sign in to Kimi Code Membership',
	'auth.login.oauth': 'Sign in with browser (OAuth)',
	'auth.login.oauthDetail': 'Authorize via the Kimi device-code login flow (recommended).',
	'auth.login.apiKey': 'Paste an API key',
	'auth.login.apiKeyDetail': 'Paste any Kimi API key. The extension will auto-detect membership vs Standard API access.',
	'auth.promptMembership': 'Enter a Kimi API key. Membership keys stay in Membership mode; Open Platform keys can be saved as Standard API fallback automatically.',

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

	// Thinking effort control
	'effort.title': 'Thinking Effort',
	'effort.off.label': 'Off',
	'effort.off.desc': 'Disable reasoning for faster responses',
	'effort.off.unavailable': 'Not available — this model always reasons and cannot be turned off.',
	'effort.low.label': 'Low',
	'effort.low.desc': 'Light reasoning — fastest, lowest cost',
	'effort.high.label': 'High',
	'effort.high.desc': 'Balanced reasoning (recommended)',
	'effort.max.label': 'Max',
	'effort.max.desc': 'Deepest reasoning — best for hard coding, uses more quota',

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
	'usage.switchToStandard.prompt': 'Your Kimi Code membership quota is exhausted. Switch to Standard API ({0}) and continue with available balance {1}?',
	'usage.switchToStandard.confirm': 'Switch to Standard API',
	'usage.switchToStandard.cancel': 'Not now',
	'usage.switchToStandard.done': 'Switched to Standard API ({0}) after membership quota exhaustion.',
};

const zh: Record<string, string> = {
	'model.k3.1-pro.detail': '最新旗舰模型，最高 100 万上下文，仅支持思考模式',
	'model.k3.1-pro.tooltip': 'Kimi Code K3.1 Pro — 全新旗舰模型（3T 级参数），最高 100 万上下文，支持图片/视频输入。仅支持思考模式：low/high/max 三档（默认 high）；关闭思考的请求会被 API 拒绝。',
	'model.k3.1-pro-highspeed.detail': '高速版 K3.1 Pro（约 2-3 倍速），最高 100 万上下文',
	'model.k3.1-pro-highspeed.tooltip': 'Kimi Code K3.1 Pro Highspeed — 与 K3.1 Pro 能力一致，速度约 2-3 倍（消耗约 2 倍）。最高 100 万上下文，支持图片/视频输入，仅支持思考模式，low/high/max 三档。',
	'model.kimi-k3.1-pro.detail': '最新旗舰模型，100 万上下文，仅支持思考模式',
	'model.kimi-k3.1-pro.tooltip': 'Kimi K3.1 Pro — 全新旗舰模型（3T 级参数），100 万上下文，支持图片/视频输入。仅支持思考模式：low/high/max 三档（默认 high）；关闭思考的请求会被 API 拒绝。',
	'model.kimi-k3.1-pro-highspeed.detail': '高速版旗舰模型（约 2-3 倍速），100 万上下文',
	'model.kimi-k3.1-pro-highspeed.tooltip': 'Kimi K3.1 Pro HighSpeed — 与 K3.1 Pro 能力一致，速度约 2-3 倍。100 万上下文，支持图片/视频输入，仅支持思考模式，low/high/max 三档。',
	'model.k3.detail': 'Kimi Code 旗舰模型，100 万上下文',
	'model.k3.tooltip': 'Kimi Code K3 — 旗舰编程模型，100 万上下文窗口，支持图片/视频输入。支持 low/high/max 三档思考强度；关闭思考后会路由到 K2.8 Preview 无思考后端。',
	'model.k3-256k.detail': 'Kimi Code 旗舰模型，25.6 万上下文',
	'model.k3-256k.tooltip': 'Kimi Code K3 256K — 更省额度的 K3 变体，25.6 万上下文，支持图片输入。支持 low/high/max 三档思考强度；关闭思考后会路由到 K2.8 Preview 无思考后端。',
	'model.kimi-for-coding.detail': 'Kimi Code 中的 K2.8 Preview，最高 100 万上下文',
	'model.kimi-for-coding.tooltip': 'Kimi for Coding — 沿用原模型 ID 的 K2.8 Preview，最高 100 万上下文，支持图片/视频输入。支持 low/high/max 三档思考强度；关闭思考后会路由到 K2.8 Preview 无思考后端。',
	'model.kimi-for-coding-highspeed.detail': '高速 Kimi Code 模型，25.6 万上下文',
	'model.kimi-for-coding-highspeed.tooltip': 'Kimi for Coding HighSpeed — Kimi Code 中的 K2.7 Code HighSpeed，25.6 万上下文，支持图片/视频输入，输出速度约为普通版 5-6 倍。思考始终开启，不提供强度选择。',
	'model.kimi-k3.detail': '旗舰模型，100 万上下文，始终推理',
	'model.kimi-k3.tooltip': 'Kimi K3 — 旗舰模型（2.8T 参数），100 万上下文窗口，原生视觉理解，始终推理，并支持 low/high/max 三档思考强度。',
	'model.kimi-k2.7-code.detail': '编程模型，25.6 万上下文，始终推理',
	'model.kimi-k2.7-code.tooltip': 'Kimi K2.7 Code — 专注编程，25.6 万上下文，支持文本/图像/视频输入，始终开启思考与思考保留。',
	'model.kimi-k2.7-code-highspeed.detail': '高速编程模型（约 180 tokens/s）',
	'model.kimi-k2.7-code-highspeed.tooltip': 'Kimi K2.7 Code HighSpeed — 与 K2.7 Code 相同，输出约 180 tokens/s（短上下文最高 260）。25.6 万上下文。',
	'model.kimi-k2.6.detail': '通用模型，25.6 万上下文',
	'model.kimi-k2.6.tooltip': 'Kimi K2.6 — 通用模型，25.6 万上下文，支持文本/图像/视频输入，可切换思考模式。注意：K2 系列计划于 2026 年 12 月底从开放平台下线。',
	'model.custom.detail': '自定义模型',

	'auth.apiKeyRequiredDetail': '请运行“Kimi: Set API Key”进行配置。',
	'auth.prompt': '请输入一个 Kimi API 密钥。扩展会自动检测它是 Kimi Code 会员还是标准 API，并在可能时自动设置区域。',
	'auth.placeholder': 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
	'auth.emptyValidation': 'API 密钥不能为空',
	'auth.saved': 'Kimi API 密钥已保存。',
	'auth.removed': 'Kimi API 密钥已删除。',
	'auth.notConfigured': '尚未配置 Kimi API 密钥。请在命令面板运行“Kimi: Set API Key”。',
	'auth.detecting': '正在检查 Kimi 会员与标准 API 权限…',
	'auth.saved.membershipDetected': '已检测到 Kimi Code 会员权限，并自动切换到会员模式。',
	'auth.saved.standardDetected': '已检测到标准 API 密钥，并自动切换到标准 API（{0}）。',
	'auth.saved.standardFallback': '已将该标准 API 密钥保存为会员模式的后备，并将区域设置为 {0}。',
	'auth.saved.unknown': 'Kimi API 密钥已保存，但扩展暂时无法自动判断正确模式，已保留当前模式。',
	'auth.invalid': '这个 API 密钥既无法用于 Kimi Code 会员，也无法用于 Kimi 开放平台，因此未被保存。',
	'auth.detect.placeHolder': '自动检测未得出明确结果，请选择把这个密钥保存到哪里',
	'auth.detect.membership': '保存为 Kimi Code 会员密钥',
	'auth.detect.membershipDetail': '用于 Kimi Code 会员访问与配额跟踪。',
	'auth.detect.standard': '保存为标准 API 密钥',
	'auth.detect.standardDetail': '用于开放平台按量付费访问与余额跟踪。',
	'auth.detect.standardDetailWithRegion': '用于开放平台按量付费访问，并将区域设置为 {0}。',
	'region.international': '国际站',
	'region.china': '中国大陆',

	// 登录方式选择（会员模式）
	'auth.login.placeHolder': '选择 Kimi Code 会员的登录方式',
	'auth.login.oauth': '浏览器登录（OAuth）',
	'auth.login.oauthDetail': '通过 Kimi 设备码登录流程授权（推荐）。',
	'auth.login.apiKey': '粘贴 API 密钥',
	'auth.login.apiKeyDetail': '可粘贴任意 Kimi API 密钥，扩展会自动判断是会员还是标准 API。',
	'auth.promptMembership': '请输入一个 Kimi API 密钥。会员密钥会保留在会员模式；开放平台密钥可自动保存为标准 API 后备。',

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

	'effort.title': '思考强度',
	'effort.off.label': '关闭',
	'effort.off.desc': '关闭推理以获得更快响应',
	'effort.off.unavailable': '不可用——该模型始终开启思考，无法关闭。',
	'effort.low.label': '低',
	'effort.low.desc': '轻度推理——最快、消耗最低',
	'effort.high.label': '高',
	'effort.high.desc': '均衡推理（推荐）',
	'effort.max.label': '最高',
	'effort.max.desc': '最深入的推理——适合复杂编程，消耗更多额度',

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
	'usage.switchToStandard.prompt': '你的 Kimi Code 会员套餐额度已用尽。是否切换到标准 API（{0}），并继续使用当前可用余额 {1}？',
	'usage.switchToStandard.confirm': '切换到标准 API',
	'usage.switchToStandard.cancel': '暂不切换',
	'usage.switchToStandard.done': '检测到会员额度耗尽，已切换到标准 API（{0}）。',
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
