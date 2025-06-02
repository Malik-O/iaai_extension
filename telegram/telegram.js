// Telegram Web UI logic
// This file handles Telegram API integration, authentication, contact search, chat display, and sending messages.
// All comments are in English, code is in English only.

// Global variables for Telegram contact search
let tgAllContacts = [];
let tgFilteredContacts = [];
let tgCurrentRecipient = null;
let tgSearchTimeout;
let tgCartItems = [];

const TG_API_BASE_URL = "https://n8n.srv797581.hstgr.cloud/api";

const propertyMapping = {
	actualCashValue: { arabic: "القيمة النقدية الفعلية", emoji: "💰" },
	vehicle: { arabic: "المركبة", emoji: "🚗" },
	lotNumber: { arabic: "رقم القطعة", emoji: "🔢" },
	stockNumber: { arabic: "رقم المخزون", emoji: "🔢" },
	itemNumber: { arabic: "رقم العنصر", emoji: "🔢" },
	vin: { arabic: "رقم الهيكل", emoji: "🆔" },
	title: { arabic: "سند الملكية", emoji: "📄" },
	titleCode: { arabic: "رمز سند الملكية", emoji: "🔣" },
	titleStatus: { arabic: "حالة سند الملكية", emoji: "📋" },
	titleState: { arabic: "ولاية سند الملكية", emoji: "🏛️" },
	odometer: { arabic: "عداد المسافات", emoji: "🧮" },
	miles: { arabic: "الأميال", emoji: "🧮" },
	mileage: { arabic: "المسافة المقطوعة", emoji: "🧮" },
	damage: { arabic: "الضرر", emoji: "💥" },
	primaryDamage: { arabic: "الضرر الأساسي", emoji: "💥" },
	mainDamage: { arabic: "الضرر الرئيسي", emoji: "💥" },
	secondaryDamage: { arabic: "الضرر الثانوي", emoji: "💥" },
	additionalDamage: { arabic: "ضرر إضافي", emoji: "💥" },
	estRetailValue: { arabic: "القيمة التجارية المقدرة", emoji: "💰" },
	estimatedValue: { arabic: "القيمة المقدرة", emoji: "💰" },
	retailValue: { arabic: "القيمة التجارية", emoji: "💰" },
	value: { arabic: "القيمة", emoji: "💰" },
	cylinders: { arabic: "عدد الأسطوانات", emoji: "⚙️" },
	engineCylinders: { arabic: "أسطوانات المحرك", emoji: "⚙️" },
	color: { arabic: "اللون", emoji: "🎨" },
	exteriorColor: { arabic: "اللون الخارجي", emoji: "🎨" },
	interiorColor: { arabic: "اللون الداخلي", emoji: "🎨" },
	engine: { arabic: "المحرك", emoji: "⚙️" },
	engineType: { arabic: "نوع المحرك", emoji: "⚙️" },
	motor: { arabic: "المحرك", emoji: "⚙️" },
	transmission: { arabic: "ناقل الحركة", emoji: "🔄" },
	trans: { arabic: "ناقل الحركة", emoji: "🔄" },
	gearbox: { arabic: "علبة التروس", emoji: "🔄" },
	drive: { arabic: "نظام الدفع", emoji: "🚗" },
	driveType: { arabic: "نوع الدفع", emoji: "🚗" },
	driveLineType: { arabic: "نوع خط الدفع", emoji: "🚗" },
	drivetrain: { arabic: "نظام الدفع", emoji: "🚗" },
	body: { arabic: "الهيكل", emoji: "🚘" },
	bodyStyle: { arabic: "نوع الهيكل", emoji: "🚘" },
	bodyType: { arabic: "نوع الهيكل", emoji: "🚘" },
	vehicleType: { arabic: "نوع المركبة", emoji: "🚘" },
	fuel: { arabic: "الوقود", emoji: "⛽" },
	fuelType: { arabic: "نوع الوقود", emoji: "⛽" },
	keys: { arabic: "المفاتيح", emoji: "🔑" },
	key: { arabic: "المفتاح", emoji: "🔑" },
	highlights: { arabic: "النقاط البارزة", emoji: "✨" },
	specialNotes: { arabic: "ملاحظات خاصة", emoji: "📝" },
	comments: { arabic: "التعليقات", emoji: "💬" },
	description: { arabic: "الوصف", emoji: "📋" },
};

document.addEventListener("DOMContentLoaded", () => {
	// DOM Elements
	const tgStatusMessages = document.getElementById("tg-status-messages");
	const tgContactSearchInput = document.getElementById("tg-contact-search");
	const tgClearSearchBtn = document.getElementById("tg-clear-search");
	const tgSearchResultsContainer =
		document.getElementById("tg-search-results");
	const sendToTelegramBtn = document.getElementById("send-to-telegram");
	const tgRefreshPageBtn = document.getElementById("tg-refresh-page"); // Assuming tg-refresh-page is the ID

	// Toast Notification System
	if (!window.tgToastQueue) window.tgToastQueue = [];
	if (!window.tgIsShowingToast) window.tgIsShowingToast = false;

	function addStatusMessage(message, type = "info") {
		const toastContainer = document.getElementById("tg-toast-container");
		if (window.tgIsShowingToast && toastContainer) {
			const currentToast = toastContainer.querySelector(
				".toast-notification",
			);
			if (currentToast) {
				Array.from(
					toastContainer.querySelectorAll(".toast-notification"),
				).forEach((toast) => {
					toastContainer.removeChild(toast);
				});
				window.tgToastQueue = [];
			}
		}
		window.tgToastQueue.push({ message, type });
		tgProcessNextToast();
	}

	function tgProcessNextToast() {
		if (window.tgToastQueue.length === 0) {
			window.tgIsShowingToast = false;
			return;
		}
		window.tgIsShowingToast = true;
		const { message, type } = window.tgToastQueue.shift();
		const toast = document.createElement("div");
		toast.className = `toast-notification ${type}`;
		let icon = "info-circle";
		if (type === "success") icon = "check-circle";
		if (type === "warning") icon = "exclamation-triangle";
		if (type === "error") icon = "times-circle";
		toast.innerHTML = `
			<div class="toast-icon"><i class="fas fa-${icon}"></i></div>
			<div class="toast-content">${message}</div>
			<button class="toast-close"><i class="fas fa-times"></i></button>
		`;
		let toastContainer = document.getElementById("tg-toast-container");
		if (!toastContainer) {
			toastContainer = document.createElement("div");
			toastContainer.id = "tg-toast-container";
			document.body.appendChild(toastContainer);
		}
		toastContainer.appendChild(toast);
		const closeBtn = toast.querySelector(".toast-close");
		if (closeBtn) {
			closeBtn.addEventListener("click", () => {
				toast.classList.remove("show");
				toast.classList.add("hide");
				setTimeout(() => {
					if (toastContainer.contains(toast)) {
						toastContainer.removeChild(toast);
					}
					tgProcessNextToast();
				}, 500);
			});
		}
		setTimeout(() => {
			toast.classList.add("show");
			setTimeout(() => {
				if (
					document.body.contains(toast) &&
					!toast.classList.contains("hide")
				) {
					toast.classList.remove("show");
					toast.classList.add("hide");
					setTimeout(() => {
						if (toastContainer.contains(toast)) {
							toastContainer.removeChild(toast);
						}
						tgProcessNextToast();
					}, 500);
				}
			}, 5000);
		}, 10);
	}

	addStatusMessage("واجهة تيليجرام جاهزة.", "info");

	function tgLoadCartItems() {
		try {
			chrome.storage.local.get(["cart"], (result) => {
				tgCartItems = result.cart || [];
				tgRenderCartPreview(tgCartItems);
				tgToggleSendButtonState();
			});
		} catch (error) {
			console.error("Error loading cart items:", error);
			addStatusMessage(
				`فشل في تحميل عناصر العربة: ${error.message}`,
				"error",
			);
			tgRenderCartPreview([]);
		}
	}

	function tgRenderCartPreview(items) {
		const cartPreview = document.getElementById("tg-cart-preview");
		if (!cartPreview) return;
		const loadingDiv = cartPreview.querySelector(".cart-loading");
		if (loadingDiv) loadingDiv.style.display = "none";
		if (!items || items.length === 0) {
			cartPreview.innerHTML = `
				<div class="empty-cart-preview">
					<i class="fas fa-shopping-cart"></i>
					<p>عربة التسوق فارغة</p>
					<small>أضف بعض المنتجات إلى العربة أولاً</small>
				</div>
			`;
			return;
		}
		let html = '<div class="cart-items-container">';
		items.forEach((item, index) => {
			const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
				item.title,
			)}&background=229ed9&color=fff&size=48`;
			html += `
				<div class="cart-item" data-item-id="${index}">
					<div class="cart-item-image">
						<img src="${item.image || fallbackImage}" 
							 alt="${item.title}"
							 onerror="this.onerror=null; this.src='${fallbackImage}';">
					</div>
					<div class="cart-item-details">
						<div class="cart-item-title">${item.title}</div>
						<div class="cart-item-price">${item.price || "السعر غير متوفر"}</div>
						${item.variant ? `<div class="cart-item-variant">${item.variant}</div>` : ""}
						${
							item.quantity
								? `<div class="cart-item-quantity">الكمية: ${item.quantity}</div>`
								: ""
						}
						${
							item.additionalData?.vin
								? `<div class="cart-item-vin">رقم الهيكل: ${item.additionalData.vin}</div>`
								: ""
						}
					</div>
					<button class="remove-cart-item" onclick="tgRemoveCartItem(${index})" title="إزالة من العربة">
						<i class="fas fa-times"></i>
					</button>
				</div>
			`;
		});
		html += "</div>";
		cartPreview.innerHTML = html;
	}

	window.tgRemoveCartItem = function (index) {
		// Prefixed with tg
		chrome.storage.local.get(["cart"], (result) => {
			let cart = result.cart || [];
			cart.splice(index, 1);
			chrome.storage.local.set({ cart }, () => {
				tgLoadCartItems();
				addStatusMessage("تم حذف المنتج من العربة بنجاح", "success");
			});
		});
	};

	window.tgClearCart = function () {
		// Prefixed with tg
		if (confirm("هل أنت متأكد من رغبتك في إفراغ العربة؟")) {
			chrome.storage.local.set({ cart: [] }, () => {
				tgLoadCartItems();
				addStatusMessage("تم إفراغ العربة بنجاح", "success");
			});
		}
	};

	tgLoadCartItems();

	function showLoading(message = "جاري المعالجة...") {
		let overlay = document.getElementById("tg-loading-overlay");
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.id = "tg-loading-overlay";
			overlay.innerHTML = `<div class="spinner"></div><div>${message}</div>`;
			document.body.appendChild(overlay);
		} else {
			overlay.querySelector("div:last-child").textContent = message;
			overlay.style.display = "flex";
		}
	}
	function hideLoading() {
		const overlay = document.getElementById("tg-loading-overlay");
		if (overlay) overlay.style.display = "none";
	}

	function setupTelegramSessionLogic() {
		const apiIdInput = document.getElementById("tg-api-id");
		const apiHashInput = document.getElementById("tg-api-hash");
		const phoneInput = document.getElementById("tg-phone-number");
		const initBtn = document.getElementById("init-telegram");
		const logoutBtn = document.getElementById("logout-telegram");
		const storedSession = localStorage.getItem("telegram_session");
		const storedApiId = localStorage.getItem("telegram_apiId");
		const storedApiHash = localStorage.getItem("telegram_apiHash");

		if (storedSession && storedApiId && storedApiHash) {
			showLoading("جاري الاتصال بتيليجرام تلقائياً...");
			fetch(`${TG_API_BASE_URL}/telegram/init-session`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					apiId: storedApiId,
					apiHash: storedApiHash,
					session: storedSession,
				}),
			})
				.then((res) => res.json())
				.then((data) => {
					hideLoading();
					if (data.status === "success") {
						setConnectedUI(true);
					} else {
						addStatusMessage(
							data.message ||
								"فشل الاتصال بالجلسة المحفوظة. يرجى المحاولة مرة أخرى.",
							"error",
						);
						setConnectedUI(false);
						localStorage.removeItem("telegram_session");
					}
				})
				.catch((e) => {
					hideLoading();
					console.error("Error auto-connecting to Telegram:", e);
					addStatusMessage(
						"خطأ في الاتصال التلقائي بتيليجرام: " + e.message,
						"error",
					);
				});
		}

		if (initBtn) {
			initBtn.onclick = async () => {
				const apiId = apiIdInput.value.trim();
				const apiHash = apiHashInput.value.trim();
				const phoneNumber = phoneInput.value.trim();
				if (!apiId || !apiHash || !phoneNumber) {
					addStatusMessage("يرجى تعبئة جميع الحقول.", "warning");
					return;
				}
				const storedSession = localStorage.getItem("telegram_session");
				const storedApiId = localStorage.getItem("telegram_apiId");
				const storedApiHash = localStorage.getItem("telegram_apiHash");
				if (storedSession && storedApiId && storedApiHash) {
					showLoading("جاري الاتصال بتيليجرام...");
					fetch(`${TG_API_BASE_URL}/telegram/init-session`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							apiId: storedApiId,
							apiHash: storedApiHash,
							session: storedSession,
						}),
					})
						.then((res) => res.json())
						.then((data) => {
							hideLoading();
							if (data.status === "success") {
								addStatusMessage(
									"تم الاتصال بتيليجرام بنجاح!",
									"success",
								);
								setConnectedUI(true);
							} else {
								addStatusMessage(
									data.message ||
										"فشل الاتصال بالجلسة المحفوظة. أعد التهيئة.",
									"error",
								);
								setConnectedUI(false);
								localStorage.removeItem("telegram_session");
							}
						})
						.catch((e) => {
							hideLoading();
							console.error(
								"Error connecting to Telegram with stored session:",
								e,
							);
							addStatusMessage(
								"خطأ في الاتصال بتيليجرام: " + e.message,
								"error",
							);
						});
					return;
				}
				showLoading("جاري إرسال البيانات... يرجى الانتظار");
				try {
					const res = await fetch(
						`${TG_API_BASE_URL}/telegram/start-init`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								apiId,
								apiHash,
								phoneNumber,
							}),
						},
					);
					const data = await res.json();
					hideLoading();
					if (data.status === "success" && data.phoneCodeHash) {
						addStatusMessage(
							"تم إرسال رمز التحقق إلى تيليجرام. أدخل الكود.",
							"success",
						);
						tgShowCodeInput(
							apiId,
							apiHash,
							phoneNumber,
							data.phoneCodeHash,
						);
					} else {
						addStatusMessage(
							data.message || "فشل إرسال البيانات",
							"error",
						);
					}
				} catch (e) {
					hideLoading();
					console.error("Error starting Telegram initialization:", e);
					addStatusMessage(
						"خطأ في الاتصال بالخادم: " + e.message,
						"error",
					);
				}
			};
		}

		if (logoutBtn) {
			logoutBtn.onclick = () => {
				localStorage.removeItem("telegram_session");
				localStorage.removeItem("telegram_apiId");
				localStorage.removeItem("telegram_apiHash");
				addStatusMessage(
					"تم تسجيل الخروج وحذف بيانات الجلسة.",
					"success",
				);
				setConnectedUI(false);
				setTimeout(() => window.location.reload(), 600);
			};
		}
	}

	function tgShowCodeInput(apiId, apiHash, phoneNumber, phoneCodeHash) {
		const authSection = document.getElementById("tg-auth-section");
		if (!authSection) return;
		authSection.innerHTML = `
			<div class="tg-auth-inputs code-step">
				<div class="floating-input-container">
					<input type="text" id="tg-phone-code" placeholder=" " autocomplete="off" />
					<label for="tg-phone-code">رمز التحقق</label>
				</div>
				<button id="tg-complete-init" class="primary-button">
					<i class="fab fa-telegram-plane"></i> إكمال التهيئة
				</button>
			</div>
		`;
		const codeInput = document.getElementById("tg-phone-code");
		const completeBtn = document.getElementById("tg-complete-init");
		if (completeBtn) {
			completeBtn.onclick = async () => {
				const phoneCode = codeInput.value.trim();
				if (!phoneCode) {
					addStatusMessage("يرجى إدخال رمز التحقق.", "warning");
					return;
				}
				showLoading("جاري إكمال التهيئة...");
				try {
					const res = await fetch(
						`${TG_API_BASE_URL}/telegram/complete-init`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								phoneNumber,
								phoneCode,
								phoneCodeHash,
							}),
						},
					);
					const data = await res.json();
					hideLoading();
					if (data.status === "success" && data.session) {
						localStorage.setItem("telegram_session", data.session);
						localStorage.setItem("telegram_apiId", apiId);
						localStorage.setItem("telegram_apiHash", apiHash);
						setConnectedUI(true);
						setTimeout(setupTelegramSessionLogic, 500); // Re-setup logic, will hide inputs
					} else {
						addStatusMessage(
							data.message || "فشل التهيئة",
							"error",
						);
					}
				} catch (e) {
					hideLoading();
					console.error(
						"Error completing Telegram initialization:",
						e,
					);
					addStatusMessage(
						"خطأ في الاتصال بالخادم: " + e.message,
						"error",
					);
				}
			};
		}
	}

	function setConnectedUI(connected) {
		const status = document.getElementById("tg-connection-status");
		const initBtn = document.getElementById("init-telegram");
		const logoutBtn = document.getElementById("logout-telegram");
		const authInputs = document.querySelector(
			"#tg-auth-section .tg-auth-inputs", // More specific selector if needed
		);
		const authSection = document.getElementById("tg-auth-section");

		if (status && initBtn && logoutBtn && authSection) {
			if (connected) {
				status.className = "chatter-status online";
				status.innerHTML = '<span class="status-dot"></span> متصل';
				initBtn.disabled = true;
				logoutBtn.disabled = false;
				authSection.style.display = "none"; // Hide the whole auth section
				tgFetchContacts();
			} else {
				status.className = "chatter-status offline";
				status.innerHTML = '<span class="status-dot"></span> غير متصل';
				initBtn.disabled = false;
				logoutBtn.disabled = true;
				authSection.style.display = "block"; // Show the auth section
				// Ensure the initial input form is visible if not already code input
				if (!authSection.querySelector("#tg-phone-code")) {
					// Reset to initial auth form if not on code step
					const apiIdInput = document.getElementById("tg-api-id");
					const apiHashInput = document.getElementById("tg-api-hash");
					const phoneInput =
						document.getElementById("tg-phone-number");
					authSection.innerHTML = ` 
						<div class="tg-auth-inputs">
							<div class="floating-input-container">
								<input type="text" id="tg-api-id" placeholder=" " autocomplete="off" value="${
									apiIdInput?.value || ""
								}">
								<label for="tg-api-id">API ID</label>
							</div>
							<div class="floating-input-container">
								<input type="text" id="tg-api-hash" placeholder=" " autocomplete="off" value="${
									apiHashInput?.value || ""
								}">
								<label for="tg-api-hash">API Hash</label>
							</div>
							<div class="floating-input-container">
								<input type="text" id="tg-phone-number" placeholder=" " autocomplete="off" value="${
									phoneInput?.value || ""
								}">
								<label for="tg-phone-number">رقم الهاتف (مع رمز الدولة)</label>
							</div>
							<button id="init-telegram" class="primary-button">
								<i class="fab fa-telegram-plane"></i> تهيئة الاتصال
							</button>
						</div>
					`;
					// Re-attach event listener for the potentially new init button
					const newInitBtn = document.getElementById("init-telegram");
					if (newInitBtn) {
						// Ensure the original onclick logic is reassigned
						const apiIdInputRe =
							document.getElementById("tg-api-id");
						const apiHashInputRe =
							document.getElementById("tg-api-hash");
						const phoneInputRe =
							document.getElementById("tg-phone-number");
						newInitBtn.onclick = async () => {
							const apiId = apiIdInputRe.value.trim();
							const apiHash = apiHashInputRe.value.trim();
							const phoneNumber = phoneInputRe.value.trim();
							if (!apiId || !apiHash || !phoneNumber) {
								addStatusMessage(
									"يرجى تعبئة جميع الحقول.",
									"warning",
								);
								return;
							}
							showLoading("جاري إرسال البيانات... يرجى الانتظار");
							try {
								const res = await fetch(
									`${TG_API_BASE_URL}/telegram/start-init`,
									{
										method: "POST",
										headers: {
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											apiId,
											apiHash,
											phoneNumber,
										}),
									},
								);
								const data = await res.json();
								hideLoading();
								if (
									data.status === "success" &&
									data.phoneCodeHash
								) {
									addStatusMessage(
										"تم إرسال رمز التحقق إلى تيليجرام. أدخل الكود.",
										"success",
									);
									tgShowCodeInput(
										apiId,
										apiHash,
										phoneNumber,
										data.phoneCodeHash,
									);
								} else {
									addStatusMessage(
										data.message || "فشل إرسال البيانات",
										"error",
									);
								}
							} catch (e) {
								hideLoading();
								console.error(
									"Error re-starting Telegram initialization:",
									e,
								);
								addStatusMessage(
									"خطأ في الاتصال بالخادم: " + e.message,
									"error",
								);
							}
						};
					}
				}
				tgAllContacts = [];
				tgRenderSearchResults([]);
				tgShowNoResultsYet();
			}
		}
		tgToggleSendButtonState();
	}

	setupTelegramSessionLogic();

	async function tgFetchContacts() {
		if (!isConnected()) {
			addStatusMessage(
				"يرجى الاتصال بتيليجرام أولاً لتحميل جهات الاتصال",
				"warning",
			);
			return;
		}
		try {
			showLoading("جاري تحميل جهات الاتصال والمحادثات...");
			const response = await fetch(
				`${TG_API_BASE_URL}/telegram/contacts`,
			);
			if (!response.ok) {
				throw new Error(
					`خطأ في الاتصال: ${response.statusText} (${response.status})`,
				);
			}
			const data = await response.json();
			hideLoading();

			if (data && data.status === "success") {
				tgAllContacts = [];
				if (data.contacts && data.contacts.users) {
					const users = data.contacts.users.map((user) => ({
						id: user.id,
						name: user.firstName
							? `${user.firstName}${
									user.lastName ? " " + user.lastName : ""
							  }`
							: user.username || user.phone || "مستخدم غير معروف",
						phone: user.phone,
						username: user.username,
						type: "contact", // Hardcoded type for contacts
						image: null, // Placeholder for potential future image fetching
						status: user.status,
						isPremium: user.isPremium,
						isVerified: user.isVerified,
					}));
					tgAllContacts.push(...users);
				}
				if (data.chats && data.chats.items) {
					const chats = data.chats.items.map((chat) => ({
						id: chat.id,
						name: chat.title,
						username: chat.username,
						type:
							chat.isChannel && !chat.isMegagroup
								? "channel"
								: chat.isMegagroup
								? "group"
								: "chat", // Determine type
						image: null, // Placeholder
						participantsCount: chat.participantsCount,
						isVerified: chat.isVerified,
						isChannel: chat.isChannel, // Keep original flags for specific logic if needed
						isMegagroup: chat.isMegagroup,
					}));
					tgAllContacts.push(...chats);
				}
				addStatusMessage(
					`تم تحميل ${tgAllContacts.length} من جهات الاتصال والمحادثات بنجاح ✨`,
					"success",
				);
			} else {
				addStatusMessage(
					data.message || "لم نتمكن من تحميل البيانات",
					"error",
				);
			}
		} catch (error) {
			hideLoading();
			console.error("Error fetching Telegram contacts:", error);
			addStatusMessage(
				`حدث خطأ أثناء تحميل البيانات: ${error.message}`,
				"error",
			);
		}
	}

	function tgHandleSearchInput(e) {
		const searchTerm = e.target.value.trim().toLowerCase();
		const clearSearchBtn = document.getElementById("tg-clear-search");
		const searchResultsContainer =
			document.getElementById("tg-search-results");

		if (clearSearchBtn) {
			clearSearchBtn.style.display =
				searchTerm.length > 0 ? "block" : "none";
		}
		if (tgSearchTimeout) clearTimeout(tgSearchTimeout);
		if (searchResultsContainer) {
			searchResultsContainer.style.display = "block";
			searchResultsContainer.style.opacity = "1"; // Make sure it's visible
			searchResultsContainer.style.visibility = "visible";
		}
		tgSearchTimeout = setTimeout(() => {
			if (/^\+?\d+$/.test(searchTerm) && searchTerm.length >= 8) {
				tgShowNewNumberOption(searchTerm);
			} else if (searchTerm.length > 1) {
				tgFilterContacts(searchTerm);
			} else if (searchTerm.length === 0) {
				tgShowNoResultsYet();
			} else {
				tgShowNoResultsYet();
			}
		}, 300);
	}

	function tgFilterContacts(searchTerm) {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		if (!tgAllContacts.length && isConnected()) {
			// Only show warning if connected but no contacts
			addStatusMessage(
				"لا توجد جهات اتصال متاحة. حاول تحديث القائمة أو التحقق من الاتصال.",
				"warning",
			);
			return;
		}
		tgFilteredContacts = tgAllContacts.filter((contact) => {
			const nameMatch = contact.name?.toLowerCase().includes(searchTerm);
			const phoneMatch =
				contact.phone &&
				contact.phone.toLowerCase().includes(searchTerm);
			const usernameMatch =
				contact.username &&
				contact.username.toLowerCase().includes(searchTerm);
			return nameMatch || phoneMatch || usernameMatch;
		});
		tgRenderSearchResults(tgFilteredContacts);
	}

	function tgRenderSearchResults(items) {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		if (!searchResultsContainer) return;
		if (!items || items.length === 0) {
			searchResultsContainer.innerHTML = `
				<div class="no-results-found">
					<i class="fas fa-search"></i>
					<p>لم يتم العثور على نتائج</p>
				</div>`;
			return;
		}
		const groups = {
			contact: { title: "جهات الاتصال", icon: "user", items: [] },
			channel: { title: "القنوات", icon: "broadcast-tower", items: [] },
			group: { title: "المجموعات", icon: "users", items: [] },
			chat: { title: "المحادثات", icon: "comments", items: [] },
		};
		items.forEach((item) => {
			let typeKey = item.type; // Default to item.type (contact, channel, group, chat)
			if (groups[typeKey]) {
				groups[typeKey].items.push(item);
			} else {
				// Fallback for any unexpected types, though tgFetchContacts should categorize them.
				console.warn("Unknown contact/chat type:", item.type, item);
				groups.chat.items.push(item); // Put into generic chat
			}
		});
		let html = '<div class="search-results-inner">';
		Object.entries(groups).forEach(([typeKey, group]) => {
			if (group.items.length > 0) {
				html += `
					<div class="result-section">
						<div class="section-header">
							<i class="fas fa-${group.icon}"></i>
							<span>${group.title}</span>
							<span class="count">${group.items.length}</span>
						</div>
						<div class="section-items">`;
				group.items.forEach((item) => {
					const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
						item.name,
					)}&background=229ed9&color=fff&size=48`;
					let subtitle = "";
					if (item.type === "contact") {
						subtitle = item.phone || item.username || "";
					} else {
						subtitle =
							item.username ||
							(item.participantsCount
								? `${item.participantsCount} عضو`
								: "");
					}
					let badges = "";
					if (item.isVerified) {
						badges +=
							'<span class="badge verified" title="موثق"><i class="fas fa-check-circle"></i></span>';
					}
					if (item.isPremium && item.type === "contact") {
						badges +=
							'<span class="badge premium" title="مميز"><i class="fas fa-star"></i></span>';
					}
					html += `
						<div class="result-item ${item.type}" data-id="${item.id}" data-type="${
						item.type
					}" data-name="${item.name}" data-username="${
						item.username || ""
					}">
							<div class="item-avatar">
								<img src="${item.image || fallbackImage}" 
									 alt="${item.name}"
									 onerror="this.onerror=null; this.src='${fallbackImage}';">
								${
									item.type !== "contact"
										? `<span class="type-indicator"><i class="fas fa-${
												groups[typeKey]?.icon || "user"
										  }"></i></span>`
										: ""
								}
							</div>
							<div class="item-info">
								<div class="item-name">
									${item.name}
									${badges}
								</div>
								<div class="item-subtitle">${subtitle}</div>
							</div>
						</div>`;
				});
				html += "</div></div>";
			}
		});
		html += "</div>";
		searchResultsContainer.innerHTML = html;
		document.querySelectorAll(".result-item").forEach((item) => {
			item.addEventListener("click", tgHandleContactSelection);
		});
	}

	function tgHandleContactSelection(e) {
		const contactElement = e.currentTarget;
		const id = contactElement.dataset.id;
		const type = contactElement.dataset.type;
		const name = contactElement.dataset.name; // Get from data attribute for consistency
		const username = contactElement.dataset.username;
		const phone = contactElement.dataset.phone;
		const image = contactElement.querySelector("img")?.src; // Get current image source
		const isVerified =
			contactElement.querySelector(".badge.verified") !== null;
		const isPremium =
			contactElement.querySelector(".badge.premium") !== null;

		tgCurrentRecipient = {
			id: id,
			type: type,
			name: name,
			subtitle: phone || username || "", // Subtitle for display consistency
			image: image,
			isNew: contactElement.classList.contains("new-number"), // Check if it was the new number option
			isVerified: isVerified,
			isPremium: isPremium,
			username: username,
			phone: phone,
		};

		tgRenderSelectedRecipient(tgCurrentRecipient);
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		const searchContainer = document.querySelector(
			".contact-search-container",
		);
		if (searchResultsContainer) {
			searchResultsContainer.style.display = "none";
		}
		if (searchContainer) {
			searchContainer.style.display = "none";
		}
		const selectedRecipientDiv = document.getElementById(
			"tg-selected-recipient",
		);
		if (selectedRecipientDiv) selectedRecipientDiv.style.display = "block";
		const searchInput = document.getElementById("tg-contact-search");
		if (searchInput) {
			searchInput.value = "";
			searchInput.blur();
			const clearSearchBtn = document.getElementById("tg-clear-search");
			if (clearSearchBtn) clearSearchBtn.style.display = "none";
		}
		tgToggleSendButtonState();
	}

	function tgRenderSelectedRecipient(recipient) {
		const selectedRecipientContainer = document.getElementById(
			"tg-selected-recipient",
		);
		if (!selectedRecipientContainer) return;
		selectedRecipientContainer.style.display = "block";
		selectedRecipientContainer.style.width = "100%";
		let typeIcon = "user";
		let typeLabel = "مستخدم";
		if (recipient.type === "channel") {
			typeIcon = "broadcast-tower";
			typeLabel = "قناة";
		} else if (recipient.type === "group") {
			typeIcon = "users";
			typeLabel = "مجموعة";
		} else if (recipient.type === "chat") {
			typeIcon = "comments";
			typeLabel = "محادثة";
		}
		let badges = "";
		if (recipient.isVerified) {
			badges +=
				'<span class="badge verified" title="موثق"><i class="fas fa-check-circle"></i></span>';
		}
		if (recipient.isPremium && recipient.type === "contact") {
			badges +=
				'<span class="badge premium" title="مميز"><i class="fas fa-star"></i></span>';
		}
		const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
			recipient.name,
		)}&background=229ed9&color=fff&size=48`;
		selectedRecipientContainer.innerHTML = `
			<div class="selected-recipient ${recipient.type}">
				<div class="selected-recipient-content">
					<div class="selected-recipient-avatar">
						<img src="${recipient.image || fallbackImage}" alt="${recipient.name}" 
							 onerror="this.onerror=null; this.src='${fallbackImage}';">
						<span class="type-indicator"><i class="fas fa-${typeIcon}"></i></span>
					</div>
					<div class="selected-recipient-details">
						<div class="selected-recipient-name">
							${recipient.name}
							${badges}
						</div>
						<div class="selected-recipient-subtitle">${
							recipient.subtitle ||
							recipient.phone ||
							recipient.username ||
							""
						}</div>
						<div class="selected-recipient-type">${typeLabel}</div>
					</div>
					<button class="remove-recipient" id="tg-remove-recipient">
						<i class="fas fa-times"></i>
					</button>
				</div>
			</div>
		`;
		document
			.getElementById("tg-remove-recipient")
			?.addEventListener("click", tgRemoveSelectedRecipient);
	}

	function tgRemoveSelectedRecipient() {
		tgCurrentRecipient = null;
		const selectedRecipientDiv = document.getElementById(
			"tg-selected-recipient",
		);
		if (selectedRecipientDiv) {
			selectedRecipientDiv.style.display = "none";
			selectedRecipientDiv.innerHTML = "";
		}
		const searchContainer = document.querySelector(
			".contact-search-container",
		);
		if (searchContainer) searchContainer.style.display = "block";
		const searchInput = document.getElementById("tg-contact-search");
		if (searchInput) {
			searchInput.value = "";
		}
		const clearSearchBtn = document.getElementById("tg-clear-search");
		if (clearSearchBtn) clearSearchBtn.style.display = "none";
		tgShowNoResultsYet();
		tgToggleSendButtonState();
	}

	function tgShowNoResults() {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		if (searchResultsContainer) {
			searchResultsContainer.innerHTML = `<div class="no-results-found"><i class="fas fa-search"></i><p>لم يتم العثور على نتائج لتيليجرام</p></div>`;
		}
	}

	function tgShowNoResultsYet() {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		if (searchResultsContainer) {
			searchResultsContainer.innerHTML = `<div class="no-results-yet"><p>ابدأ الكتابة للبحث في جهات اتصال تيليجرام</p></div>`;
			searchResultsContainer.style.display = "block";
		}
	}

	function tgShowMessage(message) {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		if (searchResultsContainer) {
			searchResultsContainer.innerHTML = `<div class="no-results-yet"><p>${message}</p></div>`;
		}
	}

	function tgFormatPhone(phone) {
		if (!phone) return "";
		let cleanPhone = phone.replace(/[^\d+]/g, "");
		if (cleanPhone.startsWith("+")) {
			if (cleanPhone.length > 11)
				return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(
					4,
					7,
				)} ${cleanPhone.slice(7)}`;
		} else {
			if (cleanPhone.length > 8)
				return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(
					3,
					6,
				)} ${cleanPhone.slice(6)}`;
		}
		return phone;
	}

	function tgShowNewNumberOption(phoneNumber) {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		if (!searchResultsContainer) return;
		searchResultsContainer.style.display = "block";
		const cleanedInputPhone = phoneNumber.replace(/[^\d+]/g, "");
		const existingContact = tgAllContacts.find(
			(contact) =>
				contact.phone &&
				contact.phone.replace(/[^\d+]/g, "") === cleanedInputPhone,
		);
		if (existingContact) {
			tgRenderSearchResults([existingContact]);
		} else {
			const formattedPhone = tgFormatPhone(cleanedInputPhone);
			searchResultsContainer.innerHTML = `
				<div class="new-number-option">
					<div class="new-number-header"><i class="fas fa-plus-circle"></i><span>إضافة رقم جديد لتيليجرام</span></div>
					<div class="result-item contact new-number" 
						 data-id="${cleanedInputPhone}" 
						 data-type="contact" 
						 data-name="جهة اتصال جديدة (${formattedPhone})"
						 data-phone="${cleanedInputPhone}"
						 data-username="">
						<div class="item-avatar"><div class="avatar-placeholder"><i class="fas fa-user-plus"></i></div></div>
						<div class="item-info">
							<div class="item-name">جهة اتصال جديدة</div>
							<div class="item-subtitle">${formattedPhone}</div>
						</div>
					</div>
				</div>
			`;
			const newNumberElement =
				searchResultsContainer.querySelector(".new-number");
			if (newNumberElement) {
				newNumberElement.addEventListener(
					"click",
					tgHandleContactSelection,
				);
			}
		}
	}

	function isConnected() {
		return !!localStorage.getItem("telegram_session");
	}

	function tgToggleSendButtonState() {
		const sendBtn = document.getElementById("send-to-telegram");
		if (sendBtn) {
			const isDisabled = !(
				isConnected() &&
				tgCurrentRecipient &&
				tgCartItems.length > 0
			);
			sendBtn.disabled = isDisabled;
		}
	}

	if (tgContactSearchInput) {
		tgContactSearchInput.addEventListener("input", tgHandleSearchInput);
		tgContactSearchInput.addEventListener("focus", () => {
			if (tgSearchResultsContainer && !tgCurrentRecipient) {
				tgSearchResultsContainer.style.display = "block";
				if (tgContactSearchInput.value.length === 0) {
					tgShowNoResultsYet();
				} else {
					tgHandleSearchInput({ target: tgContactSearchInput });
				}
			}
		});
	}

	if (tgClearSearchBtn) {
		tgClearSearchBtn.addEventListener("click", () => {
			if (tgContactSearchInput) tgContactSearchInput.value = "";
			tgClearSearchBtn.style.display = "none";
			tgShowNoResultsYet();
			if (tgContactSearchInput) tgContactSearchInput.focus();
		});
	}

	document.addEventListener("click", (e) => {
		const searchSection = document.getElementById("tg-recipient-section");
		if (
			tgSearchResultsContainer &&
			searchSection &&
			!searchSection.contains(e.target) && // Click is outside the whole recipient section
			!e.target.closest("#tg-selected-recipient") // And not on the selected recipient itself
		) {
			tgSearchResultsContainer.style.display = "none";
		}
	});

	if (sendToTelegramBtn) {
		sendToTelegramBtn.addEventListener("click", sendCartToTelegram);
	}

	if (tgRefreshPageBtn) {
		tgRefreshPageBtn.addEventListener("click", () => {
			window.location.reload();
		});
	}

	if (isConnected()) {
		setConnectedUI(true);
	} else {
		setConnectedUI(false);
	}
	tgToggleSendButtonState();

	async function sendCartToTelegram() {
		if (!isConnected()) {
			addStatusMessage(
				"يرجى الاتصال بتيليجرام أولاً قبل محاولة الإرسال",
				"warning",
			);
			return;
		}
		if (!tgCurrentRecipient) {
			addStatusMessage(
				"يرجى اختيار جهة اتصال لإرسال العناصر إليها",
				"warning",
			);
			return;
		}
		if (!tgCartItems || tgCartItems.length === 0) {
			addStatusMessage("لا توجد عناصر في العربة للإرسال", "warning");
			return;
		}
		showLoading("جاري إرسال الرسائل...");
		try {
			addStatusMessage("جاري تجهيز العناصر للإرسال...", "info");
			const recipientIdentifier =
				tgCurrentRecipient.username ||
				tgCurrentRecipient.phone ||
				tgCurrentRecipient.id;
			if (!recipientIdentifier) {
				throw new Error("معرف المستلم غير صالح.");
			}
			const introMessageElement =
				document.getElementById("message-template");
			const introMessage = introMessageElement
				? introMessageElement.value.trim()
				: "";
			if (introMessage) {
				const introResponse = await fetch(
					`${TG_API_BASE_URL}/telegram/send`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipientIdentifier,
							text: introMessage,
						}),
					},
				);
				if (!introResponse.ok) {
					const errorData = await introResponse
						.json()
						.catch(() => ({}));
					throw new Error(
						`فشل في إرسال الرسالة الافتتاحية: ${
							errorData.message || introResponse.statusText
						}`,
					);
				}
			}
			for (const [index, item] of tgCartItems.entries()) {
				if (index > 0) {
					await fetch(`${TG_API_BASE_URL}/telegram/send`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipientIdentifier,
							text: "〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n",
						}),
					});
					await new Promise((resolve) => setTimeout(resolve, 200));
				}
				let messageText = `🚗 *${item.title || "Unknown Vehicle"}*\n\n`;
				const addProperty = (key, value) => {
					if (
						value &&
						value.toString().trim() &&
						value !== "N/A" &&
						value !== "Unknown" &&
						value !== "0" &&
						value !== "$0" &&
						value !== "$0.00"
					) {
						const mapping = Object.entries(propertyMapping).find(
							([k]) =>
								k.toLowerCase() === key.toLowerCase() ||
								k.toLowerCase().replace(/\s+/g, "") ===
									key.toLowerCase().replace(/\s+/g, ""),
						);
						if (mapping) {
							const [, { arabic, emoji }] = mapping;
							messageText += `${emoji} *${arabic}:* ${value}\n`;
							return true;
						}
						return false;
					}
					return false;
				};
				const mainProps = [
					"price",
					"vin",
					"odometer",
					"primaryDamage",
					"secondaryDamage",
					"estRetailValue",
					"engine",
					"transmission",
					"drive",
					"fuel",
					"color",
					"keys",
					"vehicleType",
					"vehicle",
					"lotNumber",
					"itemNumber",
					"stockNumber",
					"titleStatus",
					"titleState",
				];
				mainProps.forEach((propKey) => {
					if (item[propKey]) addProperty(propKey, item[propKey]);
				});
				if (item.additionalData) {
					const processedInAdditional = new Set();
					for (const mapKey in propertyMapping) {
						if (
							item.additionalData[mapKey] &&
							!mainProps.includes(mapKey)
						) {
							if (
								addProperty(mapKey, item.additionalData[mapKey])
							) {
								processedInAdditional.add(mapKey);
							}
						}
					}
					for (const key in item.additionalData) {
						if (
							!mainProps.includes(key) &&
							!processedInAdditional.has(key)
						) {
							addProperty(key, item.additionalData[key]);
						}
					}
				}
				const textResponse = await fetch(
					`${TG_API_BASE_URL}/telegram/send`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipientIdentifier,
							text: messageText.trim() ? messageText : item.title,
						}),
					},
				);
				await new Promise((resolve) => setTimeout(resolve, 200));
				if (!textResponse.ok) {
					const errorData = await textResponse
						.json()
						.catch(() => ({}));
					console.warn(
						`فشل في إرسال تفاصيل العنصر "${item.title}": ${
							errorData.message || textResponse.statusText
						}`,
					);
					addStatusMessage(
						`فشل جزئي: لم يتم إرسال تفاصيل "${item.title}"`,
						"warning",
					);
				}
				if (item.image) {
					try {
						const mainImgRes = await fetch(
							`${TG_API_BASE_URL}/telegram/sendMedia`,
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									username: recipientIdentifier,
									mediaUrl: item.image,
									caption: item.title || "",
								}),
							},
						);
						if (!mainImgRes.ok) {
							const errorData = await mainImgRes
								.json()
								.catch(() => ({}));
							console.warn(
								`فشل في إرسال الصورة الرئيسية لـ "${
									item.title
								}": ${
									errorData.message || mainImgRes.statusText
								}`,
							);
							addStatusMessage(
								`تحذير: فشل في إرسال الصورة الرئيسية لـ "${item.title}"`,
								"warning",
							);
						}
						await new Promise((resolve) =>
							setTimeout(resolve, 500),
						);
					} catch (error) {
						console.error(
							`Error sending main image for ${item.title}:`,
							error,
						);
						addStatusMessage(
							`تحذير: فشل في إرسال الصورة الرئيسية لـ "${item.title}": ${error.message}`,
							"warning",
						);
					}
				}
				const imagesToSend = new Set();
				const addImagesToSet = (imgArray) => {
					if (Array.isArray(imgArray)) {
						imgArray.forEach((imgUrl) => {
							if (imgUrl && typeof imgUrl === "string")
								imagesToSend.add(imgUrl);
						});
					} else if (imgUrl && typeof imgUrl === "string") {
						imagesToSend.add(imgUrl);
					}
				};
				addImagesToSet(item.additionalImages);
				if (item.additionalData) {
					addImagesToSet(item.additionalData.images);
					addImagesToSet(item.additionalData.additionalImages);
					addImagesToSet(item.additionalData.image_links);
					addImagesToSet(item.additionalData.imageLinks);
				}
				let sentImageCount = 0;
				for (const imgUrl of Array.from(imagesToSend)) {
					if (sentImageCount >= 4) break;
					if (imgUrl === item.image) continue;
					try {
						const addImgRes = await fetch(
							`${TG_API_BASE_URL}/telegram/sendMedia`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									username: recipientIdentifier,
									mediaUrl: imgUrl,
									caption: "",
								}),
							},
						);
						if (!addImgRes.ok) {
							const errorData = await addImgRes
								.json()
								.catch(() => ({}));
							console.warn(
								`فشل في إرسال صورة إضافية لـ "${item.title}": ${
									errorData.message || addImgRes.statusText
								}`,
							);
						} else {
							sentImageCount++;
						}
						await new Promise((resolve) =>
							setTimeout(resolve, 500),
						);
					} catch (error) {
						console.warn(
							`Failed to send additional image for "${item.title}":`,
							error,
						);
					}
				}
				if (index < tgCartItems.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
			hideLoading();
			addStatusMessage("تم إرسال جميع العناصر بنجاح! ✨", "success");
		} catch (error) {
			hideLoading();
			console.error("Error sending cart to Telegram:", error);
			addStatusMessage(`فشل في إرسال العناصر: ${error.message}`, "error");
		}
	}

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.action === "telegramSendStatus") {
			addStatusMessage(message.message, message.type);
			if (message.allSent) {
				const sendBtn = document.getElementById("send-to-telegram");
				if (sendBtn) sendBtn.disabled = false;
			}
			sendResponse({ status: "received" });
		} else if (message.action === "cartUpdated") {
			tgLoadCartItems();
			sendResponse({ status: "cart_reloaded" });
		}
		return true;
	});
});
