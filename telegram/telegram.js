// Telegram Web UI logic
// This file handles Telegram API integration, authentication, contact search, chat display, and sending messages.
// All comments are in English, code is in English only.

// Global variables for Telegram contact search
let tgAllContacts = [];
let tgFilteredContacts = [];
let tgCurrentRecipient = null;
let tgSearchTimeout;
let tgCartItems = []; // Renamed from cartItems to avoid conflict if any global cartItems existed

const TG_API_BASE_URL = "https://n8n.srv797581.hstgr.cloud/api"; // Assuming API_BASE_URL is this for Telegram

// Add propertyMapping at the top of the file after global variables
const propertyMapping = {
	// Primary Properties
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
	// Add styles for search results container
	const style = document.createElement("style");
	style.textContent = `
		#tg-search-results {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: white;
			border: 1px solid #e0e0e0;
			border-radius: 8px;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
			max-height: 400px;
			overflow-y: auto;
			z-index: 1000;
			margin-top: 4px;
			display: none;
		}

		.search-results-inner {
			padding: 8px 0;
		}

		.alphabet-group {
			margin-bottom: 8px;
		}

		.alphabet-group-header {
			padding: 4px 16px;
			font-weight: 500;
			color: #229ed9;
			background: #f5f5f5;
		}

		.alphabet-group-contacts {
			padding: 4px 0;
		}

		.contact-item {
			padding: 8px 16px;
			display: flex;
			align-items: center;
			cursor: pointer;
			transition: background-color 0.2s;
		}

		.contact-item:hover {
			background-color: #f5f9fa;
		}

		.contact-avatar {
			width: 40px;
			height: 40px;
			margin-right: 12px;
			border-radius: 50%;
			overflow: hidden;
		}

		.contact-info {
			flex: 1;
		}

		.contact-name {
			font-weight: 500;
			margin-bottom: 2px;
		}

		.contact-phone {
			color: #666;
			font-size: 0.9em;
		}

		.contact-type {
			padding: 4px 8px;
			border-radius: 4px;
			background: #e3f2fd;
			color: #229ed9;
			font-size: 0.8em;
		}

		.no-results-found,
		.no-results-yet {
			padding: 24px;
			text-align: center;
			color: #666;
		}

		.no-results-found i,
		.no-results-yet i {
			font-size: 24px;
			margin-bottom: 8px;
			color: #229ed9;
		}
	`;
	document.head.appendChild(style);

	// DOM Elements
	const tgStatusMessages = document.getElementById("tg-status-messages");
	const tgContactSearchInput = document.getElementById("tg-contact-search");
	const tgClearSearchBtn = document.getElementById("tg-clear-search");
	const tgSearchResultsContainer =
		document.getElementById("tg-search-results");
	const sendToTelegramBtn = document.getElementById("send-to-telegram");
	const tgRefreshPageBtn = document.getElementById("tg-refresh-page");

	// Toast Notification System (from chatter.js, adapted for Telegram)
	if (!window.tgToastQueue) window.tgToastQueue = [];
	if (!window.tgIsShowingToast) window.tgIsShowingToast = false;

	function addStatusMessage(message, type = "info") {
		// إذا كان هناك إشعار نشط حالياً، قم بإزالته واستبداله بالإشعار الجديد
		const toastContainer = document.getElementById("tg-toast-container");
		if (window.tgIsShowingToast && toastContainer) {
			// أوقف أي تحريك متبقي
			const currentToast = toastContainer.querySelector(
				".toast-notification",
			);
			if (currentToast) {
				// حذف جميع الإشعارات النشطة
				Array.from(
					toastContainer.querySelectorAll(".toast-notification"),
				).forEach((toast) => {
					toastContainer.removeChild(toast);
				});

				// إفراغ قائمة الانتظار للتأكد من أن الإشعار الجديد سيظهر فوراً
				window.tgToastQueue = [];
			}
		}

		// Add message to the queue
		window.tgToastQueue.push({ message, type });

		// Process queue immediately
		tgProcessNextToast();
	}

	// Process next toast in queue
	function tgProcessNextToast() {
		// If queue is empty, we're done
		if (window.tgToastQueue.length === 0) {
			window.tgIsShowingToast = false;
			return;
		}

		// Set flag that we're showing a toast
		window.tgIsShowingToast = true;

		// Get next toast from queue
		const { message, type } = window.tgToastQueue.shift();

		// Create toast element
		const toast = document.createElement("div");
		toast.className = `toast-notification ${type}`;

		// Add icon based on type
		let icon = "info-circle";
		if (type === "success") icon = "check-circle";
		if (type === "warning") icon = "exclamation-triangle";
		if (type === "error") icon = "times-circle";

		toast.innerHTML = `
			<div class="toast-icon"><i class="fas fa-${icon}"></i></div>
			<div class="toast-content">${message}</div>
			<button class="toast-close"><i class="fas fa-times"></i></button>
		`;

		// Create toast container if it doesn't exist
		let toastContainer = document.getElementById("tg-toast-container");
		if (!toastContainer) {
			toastContainer = document.createElement("div");
			toastContainer.id = "tg-toast-container";
			document.body.appendChild(toastContainer);

			// Add CSS for toast container
			const style = document.createElement("style");
			style.textContent = `
				#tg-toast-container {
					position: fixed;
					bottom: 20px;
					right: 20px;
					z-index: 10000;
					direction: rtl;
				}
				
				.toast-notification {
					display: flex;
					align-items: center;
					background-color: white;
					color: #333;
					padding: 0;
					border-radius: 12px;
					margin-top: 12px;
					box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
					transform: translateX(120%);
					opacity: 0;
					transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), 
								opacity 0.3s ease;
					min-width: 320px;
					max-width: 420px;
					font-size: 14px;
					overflow: hidden;
					position: relative;
				}
				
				.toast-icon {
					display: flex;
					align-items: center;
					justify-content: center;
					min-width: 50px;
					min-height: 50px;
				}
				
				.toast-icon i {
					font-size: 20px;
				}
				
				.toast-content {
					padding: 16px 12px;
					padding-right: 16px;
					padding-left: 4px;
					flex: 1;
				}
				
				.toast-close {
					background: transparent;
					border: none;
					color: #999;
					cursor: pointer;
					font-size: 14px;
					margin: 0 10px;
					padding: 5px;
					transition: color 0.2s;
				}
				
				.toast-close:hover {
					color: #333;
				}
				
				.toast-notification.info {
					border-right: 4px solid #229ed9;
				}
				.toast-notification.info .toast-icon {
					color: #229ed9;
				}
				
				.toast-notification.success {
					border-right: 4px solid #2ecc71;
				}
				.toast-notification.success .toast-icon {
					color: #2ecc71;
				}
				
				.toast-notification.warning {
					border-right: 4px solid #f39c12;
				}
				.toast-notification.warning .toast-icon {
					color: #f39c12;
				}
				
				.toast-notification.error {
					border-right: 4px solid #e74c3c;
				}
				.toast-notification.error .toast-icon {
					color: #e74c3c;
				}
				
				.toast-notification.show {
					transform: translateX(0);
					opacity: 1;
				}
				
				.toast-notification.hide {
					transform: translateX(120%);
					opacity: 0;
				}
				
				@keyframes progress {
					0% { width: 100%; }
					100% { width: 0%; }
				}
				
				.toast-notification::after {
					content: '';
					position: absolute;
					bottom: 0;
					right: 0;
					height: 3px;
					width: 100%;
					background-color: rgba(0, 0, 0, 0.1);
				}
				
				.toast-notification.show::after {
					animation: progress 5s linear forwards;
				}
				
				@media (max-width: 480px) {
					#tg-toast-container {
						left: 16px;
						right: 16px;
						bottom: 16px;
					}
					
					.toast-notification {
						min-width: 100%;
						max-width: 100%;
					}
				}
			`;
			document.head.appendChild(style);
		}

		// Add toast to container
		toastContainer.appendChild(toast);

		// Add close button handler
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

		// Show toast with animation
		setTimeout(() => {
			toast.classList.add("show");
			// Auto hide after 5 seconds
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
	// End of Toast System

	// Example: show a message on load
	addStatusMessage("Telegram UI loaded. Please implement logic.", "info");

	// Load cart items and render them in the Telegram cart preview section
	function tgLoadCartItems() {
		try {
			chrome.storage.local.get(["cart"], (result) => {
				tgCartItems = result.cart || [];
				tgRenderCartPreview(tgCartItems);
				tgToggleSendButtonState();
			});
		} catch (error) {
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

		// Hide loading
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
							 onerror="this.onerror=null; this.src='${fallbackImage}'">
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
					<button class="remove-cart-item" onclick="removeCartItem(${index})" title="إزالة من العربة">
						<i class="fas fa-times"></i>
					</button>
				</div>
			`;
		});

		html += "</div>";
		cartPreview.innerHTML = html;

		// Add the styles for cart preview
		const style = document.createElement("style");
		style.textContent = `
			.cart-items-container {
				max-height: 400px;
				overflow-y: auto;
				padding: 12px;
				background: #fff;
				border-radius: 12px;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
			}

			.cart-item {
				display: flex;
				align-items: flex-start;
				padding: 16px;
				border: 1px solid #eef2f7;
				border-radius: 12px;
				margin-bottom: 12px;
				background: white;
				transition: all 0.3s ease;
				position: relative;
				gap: 24px;
			}

			.cart-item:hover {
				transform: translateY(-2px);
				box-shadow: 0 6px 12px rgba(34, 158, 217, 0.1);
				border-color: #229ed9;
			}

			.cart-item-image {
				width: 80px;
				height: 80px;
				border-radius: 8px;
				overflow: hidden;
				background: #f8f9fa;
				flex-shrink: 0;
			}

			.cart-item-image img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				transition: transform 0.3s ease;
			}

			.cart-item:hover .cart-item-image img {
				transform: scale(1.05);
			}

			.cart-item-details {
				flex: 1;
				min-width: 0;
				padding-top: 4px;
			}

			.cart-item-title {
				font-weight: 600;
				font-size: 1.1em;
				color: #2c3e50;
				margin-bottom: 8px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.cart-item-price {
				color: #229ed9;
				font-weight: 600;
				font-size: 1.1em;
				margin-bottom: 8px;
			}

			.cart-item-variant,
			.cart-item-quantity,
			.cart-item-vin {
				font-size: 0.9em;
				color: #64748b;
				margin-top: 4px;
			}

			.remove-cart-item {
				background: none;
				border: none;
				color: #dc3545;
				cursor: pointer;
				padding: 8px;
				border-radius: 50%;
				opacity: 0;
				transition: all 0.3s ease;
				position: absolute;
				right: 8px;
				top: 8px;
			}

			.cart-item:hover .remove-cart-item {
				opacity: 1;
			}

			.remove-cart-item:hover {
				background: #fff1f2;
				transform: scale(1.1);
			}

			.empty-cart-preview {
				text-align: center;
				padding: 40px 20px;
				color: #64748b;
				background: #f8fafc;
				border-radius: 12px;
				margin: 20px 0;
			}

			.empty-cart-preview i {
				font-size: 48px;
				color: #229ed9;
				margin-bottom: 16px;
				opacity: 0.5;
			}

			.empty-cart-preview p {
				margin: 8px 0;
				font-size: 1.2em;
				font-weight: 500;
				color: #2c3e50;
			}

			.empty-cart-preview small {
				color: #64748b;
				font-size: 0.9em;
			}

			/* Scrollbar Styling */
			.cart-items-container::-webkit-scrollbar {
				width: 8px;
			}

			.cart-items-container::-webkit-scrollbar-track {
				background: #f1f5f9;
				border-radius: 4px;
			}

			.cart-items-container::-webkit-scrollbar-thumb {
				background: #cbd5e1;
				border-radius: 4px;
			}

			.cart-items-container::-webkit-scrollbar-thumb:hover {
				background: #94a3b8;
			}

			/* Loading Animation */
			.cart-loading {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 40px 20px;
				background: #f8fafc;
				border-radius: 12px;
			}

			.spinner {
				width: 40px;
				height: 40px;
				border: 3px solid #e2e8f0;
				border-top: 3px solid #229ed9;
				border-radius: 50%;
				animation: spin 1s linear infinite;
				margin-bottom: 16px;
			}

			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}

			.cart-loading p {
				color: #64748b;
				font-size: 0.9em;
				margin: 0;
			}
		`;
		document.head.appendChild(style);
	}

	// Add these new functions for cart management
	window.removeCartItem = function (index) {
		chrome.storage.local.get(["cart"], (result) => {
			let cart = result.cart || [];
			cart.splice(index, 1);
			chrome.storage.local.set({ cart }, () => {
				tgLoadCartItems();
				addStatusMessage("تم حذف المنتج من العربة بنجاح", "success");
			});
		});
	};

	window.clearCart = function () {
		if (confirm("هل أنت متأكد من رغبتك في إفراغ العربة؟")) {
			chrome.storage.local.set({ cart: [] }, () => {
				tgLoadCartItems();
				addStatusMessage("تم إفراغ العربة بنجاح", "success");
			});
		}
	};

	// Call tgLoadCartItems when the page loads
	tgLoadCartItems();

	// Helper: show/hide loading overlay
	function showLoading(message = "جاري المعالجة...") {
		let overlay = document.getElementById("tg-loading-overlay");
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.id = "tg-loading-overlay";
			overlay.style.cssText = `
				position: fixed;z-index: 9999;top: 0;left: 0;width: 100vw;height: 100vh;
				background: rgba(255,255,255,0.7);display: flex;align-items: center;justify-content: center;flex-direction: column;`;
			overlay.innerHTML = `<div class="spinner" style="margin-bottom:16px;"></div><div style="font-size:18px;color:#229ed9;font-weight:500;">${message}</div>`;
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

	// Telegram session logic
	function setupTelegramSessionLogic() {
		const apiIdInput = document.getElementById("tg-api-id");
		const apiHashInput = document.getElementById("tg-api-hash");
		const phoneInput = document.getElementById("tg-phone-number");
		const initBtn = document.getElementById("init-telegram");
		const logoutBtn = document.getElementById("logout-telegram");

		const storedSession = localStorage.getItem("telegram_session");
		const storedApiId = localStorage.getItem("telegram_apiId");
		const storedApiHash = localStorage.getItem("telegram_apiHash");

		// Auto-connect if session exists
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
							"فشل الاتصال بالجلسة المحفوظة. يرجى المحاولة مرة أخرى.",
							"error",
						);
						setConnectedUI(false);
						localStorage.removeItem("telegram_session");
					}
				})
				.catch((e) => {
					hideLoading();
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

				// إذا كان هناك session مخزن، استخدمه مباشرة
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
									"فشل الاتصال بالجلسة المحفوظة. أعد التهيئة.",
									"error",
								);
								setConnectedUI(false);
								localStorage.removeItem("telegram_session");
							}
						})
						.catch((e) => {
							hideLoading();
							addStatusMessage(
								"خطأ في الاتصال بتيليجرام: " + e.message,
								"error",
							);
						});
					return;
				}

				// إذا لم يوجد session، أرسل البيانات للتهيئة
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
				// إعادة تحميل واجهة التهيئة
				setTimeout(() => window.location.reload(), 600);
			};
		}
	}

	function tgShowCodeInput(apiId, apiHash, phoneNumber, phoneCodeHash) {
		const authSection = document.getElementById("tg-auth-section");
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
						setTimeout(setupTelegramSessionLogic, 500);
					} else {
						addStatusMessage(
							data.message || "فشل التهيئة",
							"error",
						);
					}
				} catch (e) {
					hideLoading();
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
			"#tg-auth-section .tg-auth-inputs",
		);

		if (connected) {
			status.className = "chatter-status online";
			status.innerHTML = '<span class="status-dot"></span> متصل';
			initBtn.disabled = true;
			logoutBtn.disabled = false;
			if (authInputs) authInputs.style.display = "none";
			tgFetchContacts(); // Fetch contacts when connection is established
		} else {
			status.className = "chatter-status offline";
			status.innerHTML = '<span class="status-dot"></span> غير متصل';
			initBtn.disabled = false;
			logoutBtn.disabled = true;
			if (authInputs) authInputs.style.display = ""; // أو "flex" حسب التصميم الأصلي
			tgAllContacts = []; // Clear contacts if not connected
			tgRenderSearchResults([]); // Clear search results display
			tgShowNoResultsYet(); // Show initial message for search
		}
		tgToggleSendButtonState(); // Update send button based on new connection state
	}

	setupTelegramSessionLogic();

	// New code for Telegram contact search and selection
	let tgAllContacts = [];
	let tgFilteredContacts = [];
	let tgCurrentRecipient = null;
	let tgSearchTimeout;

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
				throw new Error(`خطأ في الاتصال: ${response.status}`);
			}
			const data = await response.json();
			hideLoading();

			if (data && data.status === "success") {
				// Process contacts
				tgAllContacts = [];

				// Add users/contacts
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
						type: "contact",
						image: null,
						status: user.status,
						isPremium: user.isPremium,
						isVerified: user.isVerified,
					}));
					tgAllContacts.push(...users);
				}

				// Add chats (channels and groups)
				if (data.chats && data.chats.items) {
					const chats = data.chats.items.map((chat) => ({
						id: chat.id,
						name: chat.title,
						username: chat.username,
						type: chat.type,
						image: null,
						participantsCount: chat.participantsCount,
						isVerified: chat.isVerified,
						isChannel: chat.isChannel,
						isMegagroup: chat.isMegagroup,
					}));
					tgAllContacts.push(...chats);
				}

				addStatusMessage(
					`تم تحميل ${tgAllContacts.length} من جهات الاتصال والمحادثات بنجاح ✨`,
					"success",
				);
			} else {
				addStatusMessage("لم نتمكن من تحميل البيانات", "error");
			}
		} catch (error) {
			hideLoading();
			addStatusMessage(
				`حدث خطأ أثناء تحميل البيانات: ${error.message}`,
				"error",
			);
		}
	}

	function tgHandleSearchInput(e) {
		const searchTerm = e.target.value.trim();
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
			searchResultsContainer.style.opacity = "1";
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
				addStatusMessage("يرجى كتابة حرفين على الأقل للبحث", "info");
			}
		}, 300);
	}

	function tgFilterContacts(searchTerm) {
		const searchResultsContainer =
			document.getElementById("tg-search-results");

		if (!tgAllContacts.length) {
			addStatusMessage(
				"لا توجد جهات اتصال متاحة. يرجى الاتصال بتيليجرام أولاً",
				"warning",
			);
			return;
		}

		tgFilteredContacts = tgAllContacts.filter((contact) => {
			const nameMatch = contact.name.toLowerCase().includes(searchTerm);
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

		// Group items by type
		const groups = {
			contact: { title: "جهات الاتصال", icon: "user", items: [] },
			channel: { title: "القنوات", icon: "broadcast-tower", items: [] },
			group: { title: "المجموعات", icon: "users", items: [] },
		};

		items.forEach((item) => {
			const type =
				item.type === "channel" && item.isMegagroup
					? "group"
					: item.type;
			if (groups[type]) {
				groups[type].items.push(item);
			}
		});

		let html = '<div class="search-results-inner">';

		// Render each section
		Object.entries(groups).forEach(([type, group]) => {
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
						subtitle = item.username;
					}

					let badges = "";
					if (item.isVerified) {
						badges +=
							'<span class="badge verified" title="موثق"><i class="fas fa-check-circle"></i></span>';
					}
					if (item.isPremium) {
						badges +=
							'<span class="badge premium" title="مميز"><i class="fas fa-star"></i></span>';
					}

					html += `
						<div class="result-item ${item.type}" data-id="${item.id}" data-type="${
						item.type
					}">
							<div class="item-avatar">
								<img src="${item.image || fallbackImage}" 
									 alt="${item.name}"
									 onerror="this.src='${fallbackImage}'">
								${
									item.type !== "contact"
										? `<span class="type-indicator"><i class="fas fa-${group.icon}"></i></span>`
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

		// Add click handlers
		document.querySelectorAll(".result-item").forEach((item) => {
			item.addEventListener("click", tgHandleContactSelection);
		});

		// Update the search input styles
		const searchStyles = `
			/* Search input improvements */
			.search-input-wrapper {
				position: relative;
				margin-bottom: 12px;
				width: 100%;
			}

			#tg-contact-search {
				width: 100%;
				padding: 12px 40px 12px 48px; /* Increased left padding for icon */
				border: 2px solid #eef2f7;
				border-radius: 12px;
				font-size: 1em;
				transition: all 0.2s ease;
				direction: rtl;
			}

			#tg-contact-search:focus {
				border-color: #229ed9;
				box-shadow: 0 0 0 3px rgba(34, 158, 217, 0.1);
			}

			.search-icon {
				position: absolute;
				right: 16px; /* Adjusted for RTL */
				top: 50%;
				transform: translateY(-50%);
				color: #64748b;
				pointer-events: none; /* Ensures the icon doesn't interfere with input */
			}

			.clear-search-btn {
				position: absolute;
				left: 12px; /* Adjusted for RTL */
				top: 50%;
				transform: translateY(-50%);
				background: none;
				border: none;
				color: #64748b;
				cursor: pointer;
				padding: 4px;
				display: none;
			}

			.clear-search-btn:hover {
				color: #2c3e50;
			}
		`;

		// Add the styles
		const style = document.createElement("style");
		style.textContent = `
			.search-results-inner {
				background: white;
				border-radius: 12px;
				overflow: hidden;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
			}

			.result-section {
				margin-bottom: 8px;
			}

			.section-header {
				padding: 12px 16px;
				background: #f7f9fc;
				color: #229ed9;
				font-weight: 600;
				display: flex;
				align-items: center;
				gap: 8px;
				border-bottom: 1px solid #eef2f7;
			}

			.section-header .count {
				margin-right: auto;
				background: #e3f2fd;
				padding: 2px 8px;
				border-radius: 12px;
				font-size: 0.85em;
			}

			.section-items {
				padding: 8px 0;
			}

			.result-item {
				display: flex;
				align-items: center;
				padding: 12px 16px;
				cursor: pointer;
				transition: all 0.2s ease;
				gap: 12px;
				border-bottom: 1px solid #f0f2f5;
			}

			.result-item:last-child {
				border-bottom: none;
			}

			.result-item:hover {
				background: #f7f9fc;
			}

			.item-avatar {
				position: relative;
				width: 48px;
				height: 48px;
				border-radius: 50%;
				overflow: hidden;
				background: #f0f2f5;
				flex-shrink: 0;
			}

			.item-avatar img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.type-indicator {
				position: absolute;
				bottom: -2px;
				right: -2px;
				background: #229ed9;
				color: white;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 10px;
				border: 2px solid white;
			}

			.item-info {
				flex: 1;
				min-width: 0;
				padding-left: 8px;
			}

			.item-name {
				font-weight: 500;
				color: #2c3e50;
				margin-bottom: 4px;
				display: flex;
				align-items: center;
				gap: 6px;
				font-size: 1.1em;
			}

			.item-subtitle {
				color: #64748b;
				font-size: 0.9em;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.badge {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				font-size: 10px;
			}

			.badge.verified {
				color: #229ed9;
			}

			.badge.premium {
				color: #f1c40f;
			}

			.no-results-found {
				text-align: center;
				padding: 32px 16px;
				color: #64748b;
			}

			.no-results-found i {
				font-size: 32px;
				margin-bottom: 12px;
				opacity: 0.5;
			}

			/* Container specific styles */
			#tg-search-results {
				position: absolute;
				top: 100%;
				left: 0;
				right: 0;
				background: white;
				border-radius: 12px;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
				margin-top: 8px;
				max-height: 400px;
				overflow-y: auto;
				z-index: 1000;
			}

			/* Scrollbar styling */
			#tg-search-results::-webkit-scrollbar {
				width: 8px;
			}

			#tg-search-results::-webkit-scrollbar-track {
				background: #f1f5f9;
				border-radius: 4px;
			}

			#tg-search-results::-webkit-scrollbar-thumb {
				background: #cbd5e1;
				border-radius: 4px;
			}

			#tg-search-results::-webkit-scrollbar-thumb:hover {
				background: #94a3b8;
			}

			/* Search container positioning */
			.contact-search-container {
				position: relative;
				width: 100%;
			}

			.search-input-wrapper {
				position: relative;
				width: 100%;
			}
		`;

		// Add or update the styles
		let searchStyleElement = document.getElementById("tg-search-styles");
		if (!searchStyleElement) {
			searchStyleElement = document.createElement("style");
			searchStyleElement.id = "tg-search-styles";
			document.head.appendChild(searchStyleElement);
		}
		searchStyleElement.textContent = style.textContent + searchStyles;
	}

	function tgHandleContactSelection(e) {
		const contactElement = e.currentTarget;
		const type = contactElement.dataset.type;
		const id = contactElement.dataset.id;
		const name = contactElement
			.querySelector(".item-name")
			.textContent.trim();
		const subtitle = contactElement
			.querySelector(".item-subtitle")
			.textContent.trim();
		const image = contactElement.querySelector("img").src;
		const isVerified =
			contactElement.querySelector(".badge.verified") !== null;
		const isPremium =
			contactElement.querySelector(".badge.premium") !== null;
		console.log("dataset", contactElement.dataset, subtitle);
		// Create the recipient object
		const phone = /^\+?\d/.test(subtitle)
			? subtitle.replace(/[^\d]/g, "")
			: null;
		tgCurrentRecipient = {
			id: id,
			type: type,
			name: name,
			subtitle: subtitle,
			image: image,
			isNew:
				type === "contact" &&
				contactElement.classList.contains("new-number"),
			isVerified: isVerified,
			isPremium: isPremium,
			// Get username from the contact object if it exists
			username: phone ? null : subtitle,
			phone: phone,
		};

		console.log("Selected recipient:", tgCurrentRecipient); // Debug log

		// Update UI to show selected recipient
		tgRenderSelectedRecipient(tgCurrentRecipient);

		// Hide search results and search container
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

		// Clear and blur search input
		const searchInput = document.getElementById("tg-contact-search");
		if (searchInput) {
			searchInput.value = "";
			searchInput.blur();
		}

		// Update send button state
		tgToggleSendButtonState();
	}

	function tgRenderSelectedRecipient(recipient) {
		const selectedRecipientContainer = document.getElementById(
			"tg-selected-recipient",
		);
		if (!selectedRecipientContainer) return;

		selectedRecipientContainer.style.display = "block"; // Changed from flex to block
		selectedRecipientContainer.style.width = "100%"; // Ensure full width

		// Get the appropriate icon based on type
		let typeIcon = "user";
		let typeLabel = "مستخدم";
		if (recipient.type === "channel") {
			typeIcon = "broadcast-tower";
			typeLabel = "قناة";
		} else if (recipient.type === "group") {
			typeIcon = "users";
			typeLabel = "مجموعة";
		}

		// Create badges HTML
		let badges = "";
		if (recipient.isVerified) {
			badges +=
				'<span class="badge verified" title="موثق"><i class="fas fa-check-circle"></i></span>';
		}
		if (recipient.isPremium) {
			badges +=
				'<span class="badge premium" title="مميز"><i class="fas fa-star"></i></span>';
		}

		selectedRecipientContainer.innerHTML = `
			<div class="selected-recipient ${recipient.type}">
				<div class="selected-recipient-content">
					<div class="selected-recipient-avatar">
						<img src="${recipient.image}" alt="${
			recipient.name
		}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(
			recipient.name,
		)}&background=229ed9&color=fff&size=48'">
						<span class="type-indicator"><i class="fas fa-${typeIcon}"></i></span>
					</div>
					<div class="selected-recipient-details">
						<div class="selected-recipient-name">
							${recipient.name}
							${badges}
						</div>
						<div class="selected-recipient-subtitle">${recipient.subtitle}</div>
						<div class="selected-recipient-type">${typeLabel}</div>
					</div>
					<button class="remove-recipient" id="tg-remove-recipient">
						<i class="fas fa-times"></i>
					</button>
				</div>
			</div>
		`;

		// Update the styles for the selected recipient
		const style = document.createElement("style");
		style.textContent = `
			#tg-selected-recipient {
				width: 100%;
				margin-bottom: 16px;
			}

			.selected-recipient {
				width: 100%;
				background: white;
				border-radius: 12px;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
				position: relative;
				border: 2px solid #eef2f7;
				transition: all 0.2s ease;
			}

			.selected-recipient:hover {
				border-color: #229ed9;
				box-shadow: 0 4px 12px rgba(34, 158, 217, 0.1);
			}

			.selected-recipient-content {
				display: flex;
				align-items: center;
				padding: 16px;
				gap: 16px;
				width: 100%;
			}

			.selected-recipient-avatar {
				position: relative;
				width: 48px;
				height: 48px;
				border-radius: 50%;
				overflow: hidden;
				background: #f0f2f5;
				flex-shrink: 0;
			}

			.selected-recipient-avatar img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.type-indicator {
				position: absolute;
				bottom: -2px;
				right: -2px;
				background: #229ed9;
				color: white;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 10px;
				border: 2px solid white;
			}

			.selected-recipient-details {
				flex: 1;
				min-width: 0;
			}

			.selected-recipient-name {
				font-weight: 600;
				color: #2c3e50;
				margin-bottom: 4px;
				display: flex;
				align-items: center;
				gap: 6px;
			}

			.selected-recipient-subtitle {
				color: #64748b;
				font-size: 0.9em;
				margin-bottom: 4px;
			}

			.selected-recipient-type {
				display: inline-block;
				padding: 2px 8px;
				background: #e3f2fd;
				color: #229ed9;
				border-radius: 12px;
				font-size: 0.85em;
				font-weight: 500;
			}

			.remove-recipient {
				position: absolute;
				top: 8px;
				left: 8px; /* Changed to left for RTL */
				background: none;
				border: none;
				color: #64748b;
				cursor: pointer;
				padding: 8px;
				border-radius: 50%;
				transition: all 0.2s ease;
			}

			.remove-recipient:hover {
				background: #fff1f2;
				color: #dc3545;
			}

			.selected-recipient.channel .selected-recipient-type {
				background: #fff8e1;
				color: #f39c12;
			}

			.selected-recipient.group .selected-recipient-type {
				background: #e8f5e9;
				color: #27ae60;
			}

			.badge {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				font-size: 10px;
			}

			.badge.verified {
				color: #229ed9;
			}

			.badge.premium {
				color: #f1c40f;
			}
		`;
		document.head.appendChild(style);

		// Add click handler for remove button
		document
			.getElementById("tg-remove-recipient")
			?.addEventListener("click", tgRemoveSelectedRecipient);
	}

	function tgRemoveSelectedRecipient() {
		tgCurrentRecipient = null;
		document.getElementById("tg-selected-recipient").style.display = "none";
		document.getElementById("tg-selected-recipient").innerHTML = "";
		document.querySelector(".contact-search-container").style.display =
			"flex";
		document.getElementById("tg-contact-search").value = "";
		document.getElementById("tg-clear-search").style.display = "none";
		tgShowNoResultsYet();
		tgToggleSendButtonState();
	}

	function tgShowNoResults() {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		searchResultsContainer.innerHTML = `<div class="no-results-found"><i class="fas fa-search"></i><p>لم يتم العثور على نتائج لتيليجرام</p></div>`;
	}

	function tgShowNoResultsYet() {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		searchResultsContainer.innerHTML = `<div class="no-results-yet"><p>ابدأ الكتابة للبحث في جهات اتصال تيليجرام</p></div>`;
	}

	function tgShowMessage(message) {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		searchResultsContainer.innerHTML = `<div class="no-results-yet"><p>${message}</p></div>`;
	}

	function tgFormatPhone(phone) {
		if (!phone) return "";
		let cleanPhone = phone.replace(/^\+/, "");
		if (cleanPhone.length > 8) {
			if (cleanPhone.length >= 11)
				return `+${cleanPhone.slice(0, 3)} ${cleanPhone.slice(
					3,
					5,
				)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
			else if (cleanPhone.length >= 10)
				return `+${cleanPhone.slice(0, 3)} ${cleanPhone.slice(
					3,
					5,
				)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
			else
				return `+${cleanPhone.slice(0, 2)} ${cleanPhone.slice(
					2,
					5,
				)} ${cleanPhone.slice(5)}`;
		}
		return phone;
	}

	function tgGroupContactsByFirstLetter(contacts) {
		const groups = {};
		const arabicLetters = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");
		contacts.forEach((contact) => {
			let firstChar = contact.name.charAt(0).toUpperCase();
			let group;
			if (arabicLetters.includes(firstChar)) group = firstChar;
			else if (/[A-Za-z]/.test(firstChar))
				group = firstChar.toUpperCase();
			else if (/[0-9]/.test(firstChar)) group = "123";
			else group = "#";
			if (!groups[group]) groups[group] = [];
			groups[group].push(contact);
		});
		const sortedGroups = {};
		arabicLetters.forEach((letter) => {
			if (groups[letter]) sortedGroups[letter] = groups[letter];
		});
		for (let i = 65; i <= 90; i++) {
			const letter = String.fromCharCode(i);
			if (groups[letter]) sortedGroups[letter] = groups[letter];
		}
		if (groups["123"]) sortedGroups["123"] = groups["123"];
		if (groups["#"]) sortedGroups["#"] = groups["#"];
		return sortedGroups;
	}

	function tgShowNewNumberOption(phoneNumber) {
		const searchResultsContainer =
			document.getElementById("tg-search-results");
		searchResultsContainer.style.display = "block";
		const existingContact = tgAllContacts.find(
			(contact) => contact.phone === phoneNumber.replace(/^\+/, ""),
		);

		if (existingContact) {
			tgRenderSearchResults([existingContact]);
		} else {
			const formattedPhone = tgFormatPhone(phoneNumber);
			searchResultsContainer.innerHTML = `
				<div class="new-number-option">
					<div class="new-number-header"><i class="fas fa-plus-circle"></i><span>إضافة رقم جديد لتيليجرام</span></div>
					<div class="contact-item tg-contact-item new-number" data-phone="${phoneNumber.replace(
						/^\+/,
						"",
					)}" data-name="جهة اتصال جديدة (${phoneNumber})" data-id="${phoneNumber.replace(
				/^\+/,
				"",
			)}">
						<div class="contact-avatar"><div class="avatar-placeholder"><i class="fas fa-user-plus"></i></div></div>
						<div class="contact-info">
							<div class="contact-name">جهة اتصال جديدة</div>
							<div class="contact-phone">${formattedPhone}</div>
						</div>
						<div class="contact-type new">جديد</div>
					</div>
				</div>
			`;
			document
				.querySelector(".new-number")
				.addEventListener("click", tgHandleContactSelection);
		}
	}

	// Helper to check Telegram connection status (needs to be defined or imported)
	function isConnected() {
		// This function should ideally check the actual connection status of Telegram
		// For now, we'll check if a session is stored, assuming it means connected.
		// Replace with a more robust check if available.
		return !!localStorage.getItem("telegram_session");
	}

	// Helper to get API_BASE_URL (needs to be defined or imported)
	const API_BASE_URL = "https://n8n.srv797581.hstgr.cloud/api"; // Assuming this is defined elsewhere

	// Function to toggle send button state
	function tgToggleSendButtonState() {
		const sendBtn = document.getElementById("send-to-telegram");
		if (sendBtn) {
			const isDisabled = !(
				isConnected() &&
				tgCurrentRecipient &&
				tgCartItems.length > 0
			);
			sendBtn.disabled = isDisabled;

			if (isDisabled) {
				if (!isConnected()) {
					addStatusMessage("يرجى الاتصال بتيليجرام أولاً", "warning");
				} else if (!tgCurrentRecipient) {
					addStatusMessage(
						"يرجى اختيار جهة اتصال للإرسال",
						"warning",
					);
				} else if (tgCartItems.length === 0) {
					addStatusMessage(
						"العربة فارغة. يرجى إضافة منتجات للإرسال",
						"warning",
					);
				}
			}
		}
	}

	// Telegram Contact Search Specific Initializations
	if (tgContactSearchInput) {
		tgContactSearchInput.addEventListener("input", tgHandleSearchInput);
		tgContactSearchInput.addEventListener("focus", () => {
			// Fetching contacts is now handled by setConnectedUI or initial load
			if (tgSearchResultsContainer)
				tgSearchResultsContainer.style.display = "block";
		});
	}

	if (tgClearSearchBtn) {
		tgClearSearchBtn.addEventListener("click", () => {
			tgContactSearchInput.value = "";
			tgClearSearchBtn.style.display = "none";
			tgShowNoResultsYet();
			tgContactSearchInput.focus();
		});
	}

	document.addEventListener("click", (e) => {
		if (
			tgSearchResultsContainer &&
			!e.target.closest(".contact-search-container") &&
			!e.target.closest(".search-results-container")
		) {
			tgSearchResultsContainer.style.display = "none";
		}
	});

	if (sendToTelegramBtn) {
		sendToTelegramBtn.addEventListener("click", sendCartToTelegram);
	}

	// Initial call to setup UI based on connection
	if (isConnected()) {
		tgFetchContacts();
	} else {
		tgShowNoResultsYet(); // Show initial message if not connected
	}
	tgToggleSendButtonState(); // Initial state of send button

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

		try {
			addStatusMessage("جاري تجهيز العناصر للإرسال...", "info");
			console.log({ tgCurrentRecipient });
			const recipient =
				tgCurrentRecipient.username || "+" + tgCurrentRecipient.phone;

			// Get intro message
			const introMessage = document
				.getElementById("message-template")
				?.value.trim();

			// Send intro message if exists
			if (introMessage) {
				const introResponse = await fetch(
					`${API_BASE_URL}/telegram/send`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipient,
							text: introMessage,
						}),
					},
				);

				if (!introResponse.ok) {
					throw new Error("فشل في إرسال الرسالة الافتتاحية");
				}
			}

			// Process each cart item
			for (const [index, item] of tgCartItems.entries()) {
				// Send divider between items
				if (index > 0) {
					await fetch(`${API_BASE_URL}/telegram/send`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipient,
							text: "〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n",
						}),
					});
				}

				// Create detailed message text
				let messageText = `🚗 *${item.title}*\n\n`;

				// Function to process and add a property to the message
				const addProperty = (key, value) => {
					if (
						value &&
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

				// Process main properties first
				const mainProps = [
					"price",
					"vehicleType",
					"vehicleMake",
					"vehicleModel",
					"vehicleYear",
					"vin",
				];
				mainProps.forEach((prop) => {
					if (item[prop]) addProperty(prop, item[prop]);
				});

				messageText += "\n"; // Add spacing after main properties

				// Process additional data
				if (item.additionalData) {
					const processedKeys = new Set(mainProps);

					// Sort properties by mapping order
					const sortedProps = Object.keys(item.additionalData).sort(
						(a, b) => {
							const aIndex = Object.keys(propertyMapping).indexOf(
								a.toLowerCase(),
							);
							const bIndex = Object.keys(propertyMapping).indexOf(
								b.toLowerCase(),
							);
							return (
								(aIndex === -1 ? Infinity : aIndex) -
								(bIndex === -1 ? Infinity : bIndex)
							);
						},
					);

					for (const key of sortedProps) {
						if (!processedKeys.has(key.toLowerCase())) {
							const value = item.additionalData[key];
							if (
								typeof value === "string" ||
								typeof value === "number"
							) {
								if (addProperty(key, value)) {
									processedKeys.add(key.toLowerCase());
								}
							}
						}
					}
				}

				// Send text message
				const textResponse = await fetch(
					`${API_BASE_URL}/telegram/send`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipient,
							text: messageText,
						}),
					},
				);

				if (!textResponse.ok) {
					throw new Error("فشل في إرسال تفاصيل العنصر");
				}

				// Send images
				if (item.image) {
					try {
						await fetch(`${API_BASE_URL}/telegram/sendMedia`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								username: recipient,
								mediaUrl: item.image,
								caption: "",
							}),
						});
					} catch (error) {
						addStatusMessage(
							`تحذير: فشل في إرسال الصورة الرئيسية: ${error.message}`,
							"warning",
						);
					}
				}

				// Process additional images
				const processImages = async (images) => {
					if (Array.isArray(images)) {
						for (const imgUrl of images.slice(0, 5)) {
							// Limit to 5 additional images
							try {
								await fetch(
									`${API_BASE_URL}/telegram/sendMedia`,
									{
										method: "POST",
										headers: {
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											username: recipient,
											mediaUrl: imgUrl,
											caption: "",
										}),
									},
								);
							} catch (error) {
								console.warn(
									"Failed to send additional image:",
									error,
								);
							}
						}
					}
				};

				// Send additional images from different possible sources
				if (item.additionalData) {
					await processImages(item.additionalData.images);
					await processImages(item.additionalData.additionalImages);
				}
				await processImages(item.additionalImages);

				// Add delay between items
				if (index < tgCartItems.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}

			addStatusMessage("تم إرسال جميع العناصر بنجاح! ✨", "success");
		} catch (error) {
			addStatusMessage(`فشل في إرسال العناصر: ${error.message}`, "error");
		}
	}
});

// Ensure cartItems is available for toggleSendButtonState
let cartItems = []; // Define or ensure this is loaded correctly, e.g. from loadCartItems
chrome.storage.local.get(["cart"], (result) => {
	cartItems = result.cart || [];
	//Potentially call toggleSendButtonState() here again if tgCurrentRecipient might be set before cart loads
});
