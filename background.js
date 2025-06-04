// API configuration
const API_BASE_URL = "http://localhost:3000";

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "sendTelegramMessages") {
		// استخدم username من الرسالة
		const { username, items, name } = message.payload || {};
		if (!username) {
			sendResponse({ status: "error", message: "Username is required" });
			return true;
		}
		// ضع فلاج processing في localStorage
		chrome.storage.local.set({ telegram_sending_processing: true });
		if (!items || !Array.isArray(items) || items.length === 0) {
			chrome.storage.local.get(["cart"], async (result) => {
				const cart = result.cart || [];
				try {
					await sendEachViaTelegram(
						username,
						cart.map((item) => ({ href: item.href })),
						name,
					);
				} finally {
					chrome.storage.local.set({
						telegram_sending_processing: false,
					});
					sendResponse({ status: "processing" });
				}
			});
			return true;
		} else {
			sendEachViaTelegram(username, items, name).finally(() => {
				chrome.storage.local.set({
					telegram_sending_processing: false,
				});
				sendResponse({ status: "processing" });
			});
			return true;
		}
	}

	if (message.action === "sendWhatsappMessages") {
		const { number, items, name } = message.payload || {};
		if (!number) {
			sendResponse({ status: "error", message: "Number is required" });
			return true;
		}
		// ضع فلاج processing في localStorage
		chrome.storage.local.set({ whatsapp_sending_processing: true });
		if (!items || !Array.isArray(items) || items.length === 0) {
			chrome.storage.local.get(["cart"], async (result) => {
				const cart = result.cart || [];
				try {
					await sendEachViaWhatsapp(
						number,
						cart.map((item) => ({ href: item.href })),
						name,
					);
				} finally {
					chrome.storage.local.set({
						whatsapp_sending_processing: false,
					});
					sendResponse({ status: "processing" });
				}
			});
			return true;
		} else {
			sendEachViaWhatsapp(number, items, name).finally(() => {
				chrome.storage.local.set({
					whatsapp_sending_processing: false,
				});
				sendResponse({ status: "processing" });
			});
			return true;
		}
	}
});

// Keep track of port connections to detect when popup is open
chrome.runtime.onConnect.addListener((port) => {
	if (port.name === "popup") {
		// Popup is opened
		port.onDisconnect.addListener(() => {
			// Popup is closed, but scraping continues in background
		});
	}
});

async function sendEachViaTelegram(username, items, name) {
	const cartResult = await new Promise((resolve) => {
		chrome.storage.local.get(["cart"], resolve);
	});
	let cart = cartResult.cart || [];
	const setPromises = [];
	for (const item of items) {
		if (!item.href) continue;
		try {
			const res = await fetch(
				`${API_BASE_URL}/scrape-and-send/via-telegram`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						to: username,
						href: item.href,
					}),
				},
			);
			if (res.ok) {
				const idx = cart.findIndex((c) => c.href === item.href);
				if (idx !== -1) {
					if (!Array.isArray(cart[idx]["sent-via-telegram"])) {
						cart[idx]["sent-via-telegram"] = [];
					}
					cart[idx]["sent-via-telegram"].push({
						username: name || username,
						time: Date.now(),
					});
				}
			}
		} catch (err) {
			console.warn("فشل إرسال العنصر عبر تيليجرام:", item.href, err);
		}
	}
	// حفظ cart بعد انتهاء كل الإرسال
	await new Promise((resolve) => {
		chrome.storage.local.set({ cart }, resolve);
	});
}

async function sendEachViaWhatsapp(number, items, name) {
	// تحميل السلة مرة واحدة
	const result = await new Promise((resolve) => {
		chrome.storage.local.get(["cart"], resolve);
	});
	let cart = result.cart || [];

	for (const item of items) {
		if (!item.href) continue;
		try {
			const res = await fetch(
				`${API_BASE_URL}/scrape-and-send/via-whatsapp`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						to: number,
						href: item.href,
					}),
				},
			);
			if (res.ok) {
				const idx = cart.findIndex((c) => c.href === item.href);
				if (idx !== -1) {
					if (!Array.isArray(cart[idx]["sent-via-whatsapp"])) {
						cart[idx]["sent-via-whatsapp"] = [];
					}
					cart[idx]["sent-via-whatsapp"].push({
						username: name || number,
						time: Date.now(),
					});
				}
			}
		} catch (err) {
			console.warn("فشل إرسال العنصر عبر واتساب:", item.href, err);
		}
	}
	// حفظ cart بعد انتهاء كل الإرسال
	await new Promise((resolve) => {
		chrome.storage.local.set({ cart }, resolve);
	});
}

// Spinner badge animation for extension icon (يعمل دائماً في الخلفية)
const SPINNER_FRAMES = ["◐", "◓", "◑", "◒"];
let spinnerFrameIndex = 0;
let spinnerInterval = null;

function startBadgeSpinner() {
	if (spinnerInterval) return;
	spinnerInterval = setInterval(() => {
		chrome.storage.local.get(
			["whatsapp_sending_processing", "telegram_sending_processing"],
			(result) => {
				let badgeText = "";
				let badgeColor = "#bbb";
				const frame =
					SPINNER_FRAMES[spinnerFrameIndex % SPINNER_FRAMES.length];
				spinnerFrameIndex++;
				if (
					result.whatsapp_sending_processing &&
					result.telegram_sending_processing
				) {
					badgeText = frame;
					badgeColor = "#5b8cfa";
				} else if (result.whatsapp_sending_processing) {
					badgeText = frame;
					badgeColor = "#25d366";
				} else if (result.telegram_sending_processing) {
					badgeText = frame;
					badgeColor = "#229ed9";
				} else {
					stopBadgeSpinner();
					return;
				}
				chrome.action.setBadgeText({ text: badgeText });
				chrome.action.setBadgeBackgroundColor({ color: badgeColor });
			},
		);
	}, 300);
}
function stopBadgeSpinner() {
	if (spinnerInterval) {
		clearInterval(spinnerInterval);
		spinnerInterval = null;
		chrome.action.setBadgeText({ text: "" });
	}
}
function updateExtensionBadge() {
	chrome.storage.local.get(
		["whatsapp_sending_processing", "telegram_sending_processing"],
		(result) => {
			if (
				result.whatsapp_sending_processing ||
				result.telegram_sending_processing
			) {
				startBadgeSpinner();
			} else {
				stopBadgeSpinner();
			}
		},
	);
}
// راقب التغييرات في التخزين
chrome.storage.onChanged.addListener((changes, area) => {
	if (
		area === "local" &&
		(changes.whatsapp_sending_processing ||
			changes.telegram_sending_processing)
	) {
		updateExtensionBadge();
	}
});
// تحقق عند بدء الخلفية
updateExtensionBadge();
