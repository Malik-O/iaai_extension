document.addEventListener("DOMContentLoaded", () => {
	// API configuration
	const API_BASE_URL = "https://n8n.srv797581.hstgr.cloud/api"; // Change this to your WhatsApp API server URL

	// DOM Elements
	const connectionStatus = document.getElementById("connection-status");
	const initWhatsAppBtn = document.getElementById("init-whatsapp");
	const logoutWhatsAppBtn = document.getElementById("logout-whatsapp");
	const qrContainer = document.getElementById("qr-container");
	const qrLoading = document.getElementById("qr-loading");
	const qrCode = document.getElementById("qr-code");
	const recipientNumber = document.getElementById("recipient-number");
	const validateNumberBtn = document.getElementById("validate-number");
	const cartPreview = document.getElementById("cart-preview");
	const messageTemplate = document.getElementById("message-template");
	const sendToWhatsAppBtn = document.getElementById("send-to-whatsapp");
	const statusMessages = document.getElementById("status-messages");
	const refreshPageBtn = document.getElementById("refresh-page");

	// State
	let isConnected = false;
	let isInitializing = false;
	let currentRecipient = null;
	let cartItems = [];
	let qrCheckInterval;
	let statusCheckInterval;
	let phoneInputTimeout;

	// إضافة متغير لتتبع وقت بدء التهيئة
	let initializationStartTime = null;
	// الحد الأقصى للوقت المسموح للتهيئة (بالمللي ثانية) - 30 ثانية
	const MAX_INITIALIZATION_TIME = 30000;

	// Initialize
	init();

	function init() {
		checkConnectionStatus(true);
		loadCartItems();

		// Setup event listeners
		initWhatsAppBtn.addEventListener("click", initializeWhatsApp);
		logoutWhatsAppBtn.addEventListener("click", logoutWhatsApp);
		recipientNumber.addEventListener("input", onRecipientNumberInput);
		sendToWhatsAppBtn.addEventListener("click", sendCartToWhatsApp);

		// Add refresh page button handler
		if (refreshPageBtn) {
			refreshPageBtn.addEventListener("click", () => {
				// أضف تأثير دوران عند الضغط على الزر
				const icon = refreshPageBtn.querySelector("i");
				if (icon) {
					icon.style.transition = "transform 0.5s";
					icon.style.transform = "rotate(360deg)";
				}

				// إضافة رسالة حالة للإعلام بإعادة التحميل
				addStatusMessage("جاري تحديث الصفحة...", "info");

				// إعادة تحميل الصفحة بعد تأخير قصير (500 مللي ثانية)
				setTimeout(() => {
					window.location.reload();
				}, 500);
			});
		}

		// إخفاء زر التحقق من الرقم لأننا سنتحقق تلقائياً
		if (validateNumberBtn) {
			validateNumberBtn.style.display = "none";
		}
	}

	// دالة جديدة للاستجابة لإدخال رقم الهاتف
	function onRecipientNumberInput() {
		// Clear any previous timeout
		if (phoneInputTimeout) {
			clearTimeout(phoneInputTimeout);
		}

		// Set a new timeout to validate the number after the user stops typing (500 milliseconds)
		phoneInputTimeout = setTimeout(() => {
			validateRecipientNumber();
		}, 500);
	}

	// WhatsApp Connection
	async function initializeWhatsApp() {
		if (isInitializing) return;

		try {
			isInitializing = true;
			// تسجيل وقت بدء التهيئة
			initializationStartTime = Date.now();
			addStatusMessage("جاري بدء الاتصال بواتساب...", "info");

			// Show QR loading
			qrContainer.style.display = "flex";
			qrLoading.style.display = "flex";
			qrCode.style.display = "none";

			// Initialize WhatsApp API
			await fetch(`${API_BASE_URL}/auth/init`, {
				method: "POST",
			});

			// Start polling for status and QR code
			startStatusPolling();
			setTimeout(displayQRCode, 2000);
		} catch (error) {
			isInitializing = false;
			initializationStartTime = null;
			addStatusMessage(`فشل في تهيئة واتساب: ${error.message}`, "error");
			qrContainer.style.display = "none";
		}
	}

	function displayQRCode() {
		try {
			// Display QR code
			qrLoading.style.display = "none";
			qrCode.style.display = "flex";

			// Set QR code image with timestamp to prevent caching
			qrCode.innerHTML = `
                <img 
                    src="${API_BASE_URL}/auth/qrcode.png?t=${Date.now()}" 
                    alt="WhatsApp QR Code"
                    onerror="this.style.display='none'; document.getElementById('qr-loading').style.display='flex';"
                />
            `;

			addStatusMessage(
				"رمز QR جاهز. يرجى المسح بواتساب على هاتفك.",
				"info",
			);
		} catch (error) {
			addStatusMessage(`فشل في عرض رمز QR: ${error.message}`, "error");
			qrLoading.style.display = "flex";
		}
	}

	// إضافة دالة لإعادة ضبط حالة الاتصال عند انتهاء مهلة الاتصال
	function resetConnectionState(showRetryBtn = true) {
		isInitializing = false;
		initializationStartTime = null;
		updateConnectionStatus("disconnected");

		// إخفاء حاوية QR
		qrContainer.style.display = "none";

		// إظهار زر إعادة المحاولة
		if (showRetryBtn) {
			createRetryButton();
		}

		addStatusMessage(
			"انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى",
			"warning",
		);
	}

	// إظهار زر إعادة المحاولة
	function createRetryButton() {
		// التحقق من عدم وجود زر إعادة المحاولة بالفعل
		if (!document.getElementById("retry-connection-btn")) {
			const retryButton = document.createElement("button");
			retryButton.id = "retry-connection-btn";
			retryButton.className = "primary-button";
			retryButton.innerHTML =
				'<i class="fas fa-redo-alt"></i> إعادة المحاولة';
			retryButton.style.marginTop = "10px";

			// إضافة حدث النقر
			retryButton.addEventListener("click", () => {
				// إزالة زر إعادة المحاولة
				retryButton.remove();
				// إعادة بدء الاتصال
				initializeWhatsApp();
			});

			// إضافة الزر بعد أزرار الاتصال
			const connectionActions = document.querySelector(
				".connection-actions",
			);
			if (connectionActions) {
				connectionActions.appendChild(retryButton);
			}
		}
	}

	async function checkConnectionStatus(isInitialLoad = false) {
		try {
			const response = await fetch(`${API_BASE_URL}/auth/status`);
			if (!response.ok) throw new Error("Failed to fetch status");

			const data = await response.json();

			// فحص ما إذا كان قد مر وقت طويل على عملية التهيئة
			if (
				(data.status === "initializing" ||
					data.status === "awaiting_scan") &&
				initializationStartTime
			) {
				const currentTime = Date.now();
				const elapsedTime = currentTime - initializationStartTime;

				// إذا تجاوزت مدة التهيئة الحد الأقصى
				if (elapsedTime > MAX_INITIALIZATION_TIME) {
					// إعادة ضبط حالة الاتصال
					console.log("Initialization timeout, resetting state");
					resetConnectionState();
					return "disconnected";
				}
			}

			// إذا كان التحقق عند بداية تحميل الصفحة وكانت الحالة في وضع التهيئة
			if (
				isInitialLoad &&
				(data.status === "initializing" ||
					data.status === "awaiting_scan")
			) {
				// في حالة إعادة تحميل الصفحة أثناء التهيئة، سنفترض أن التهيئة قد انتهت
				console.log(
					"Page was reloaded during initialization, resetting state",
				);
				resetConnectionState();
				return "disconnected";
			} else {
				updateConnectionStatus(data.status);
				return data.status;
			}
		} catch (error) {
			updateConnectionStatus("error");
			console.error("Error checking connection status:", error);
			return "error";
		}
	}

	function startStatusPolling() {
		// Clear existing interval
		if (statusCheckInterval) {
			clearInterval(statusCheckInterval);
		}

		// Poll every 3 seconds
		statusCheckInterval = setInterval(async () => {
			const status = await checkConnectionStatus();

			if (status === "connected") {
				// If connected, stop polling
				clearInterval(statusCheckInterval);
				isInitializing = false;
				initializationStartTime = null;
				qrContainer.style.display = "none";
				addStatusMessage("تم الاتصال بواتساب بنجاح!", "success");
			} else if (status === "disconnected" || status === "error") {
				// If error or disconnected, stop polling
				clearInterval(statusCheckInterval);
				isInitializing = false;
				initializationStartTime = null;
			}
		}, 3000);

		// إضافة مؤقت لإنهاء التهيئة إذا استمرت لفترة طويلة
		setTimeout(() => {
			if (isInitializing && initializationStartTime) {
				const currentTime = Date.now();
				const elapsedTime = currentTime - initializationStartTime;

				// إذا كانت التهيئة لا تزال جارية بعد الحد الأقصى
				if (elapsedTime > MAX_INITIALIZATION_TIME) {
					// إيقاف الاستطلاع وإعادة ضبط الحالة
					clearInterval(statusCheckInterval);
					resetConnectionState();
				}
			}
		}, MAX_INITIALIZATION_TIME + 1000); // الحد الأقصى + ثانية إضافية
	}

	function updateConnectionStatus(status) {
		switch (status) {
			case "connected":
				connectionStatus.className = "chatter-status online";
				connectionStatus.innerHTML =
					'<span class="status-dot"></span> متصل';
				initWhatsAppBtn.disabled = true;
				logoutWhatsAppBtn.disabled = false;
				sendToWhatsAppBtn.disabled = false;
				isConnected = true;
				break;

			case "disconnected":
				connectionStatus.className = "chatter-status offline";
				connectionStatus.innerHTML =
					'<span class="status-dot"></span> غير متصل';
				initWhatsAppBtn.disabled = false;
				logoutWhatsAppBtn.disabled = true;
				sendToWhatsAppBtn.disabled = true;
				isConnected = false;
				// إخفاء حاوية QR عند قطع الاتصال
				qrContainer.style.display = "none";
				break;

			case "initializing":
			case "awaiting_scan":
				connectionStatus.className = "chatter-status offline";
				connectionStatus.innerHTML =
					'<span class="status-dot"></span> جاري التهيئة...';
				initWhatsAppBtn.disabled = true;
				logoutWhatsAppBtn.disabled = true;
				sendToWhatsAppBtn.disabled = true;
				isConnected = false;
				// تسجيل وقت بدء التهيئة إذا لم يكن موجوداً بالفعل
				if (!initializationStartTime) {
					initializationStartTime = Date.now();
				}
				break;

			default:
				connectionStatus.className = "chatter-status offline";
				connectionStatus.innerHTML =
					'<span class="status-dot"></span> غير متصل';
				initWhatsAppBtn.disabled = false;
				logoutWhatsAppBtn.disabled = true;
				sendToWhatsAppBtn.disabled = true;
				isConnected = false;
		}
	}

	async function logoutWhatsApp() {
		try {
			addStatusMessage("جاري تسجيل الخروج من واتساب...", "info");

			const response = await fetch(`${API_BASE_URL}/auth/logout`, {
				method: "POST",
			});

			if (!response.ok) throw new Error("فشل تسجيل الخروج");

			const data = await response.json();
			if (data.status === "success") {
				updateConnectionStatus("disconnected");
				addStatusMessage("تم تسجيل الخروج من واتساب بنجاح", "success");
			} else {
				throw new Error(data.message || "حدث خطأ غير معروف");
			}
		} catch (error) {
			addStatusMessage(`فشل تسجيل الخروج: ${error.message}`, "error");
		}
	}

	// Cart Management
	function loadCartItems() {
		try {
			// Get cart items from Chrome storage
			chrome.storage.local.get(["cart"], (result) => {
				cartItems = result.cart || [];
				renderCartPreview();
			});
		} catch (error) {
			addStatusMessage(
				`Failed to load cart items: ${error.message}`,
				"error",
			);
			renderCartPreview();
		}
	}

	function renderCartPreview() {
		if (cartItems.length === 0) {
			cartPreview.innerHTML = `
                <div class="empty-cart-preview">
                    <i class="fas fa-shopping-cart"></i>
                    <p>عربة التسوق فارغة</p>
                </div>
            `;
			sendToWhatsAppBtn.disabled = true;
		} else {
			let html = "";

			cartItems.forEach((item) => {
				// Fallback image
				const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
					item.title,
				)}&background=3498db&color=fff&size=40`;

				html += `
                    <div class="cart-preview-item">
                        <img class="preview-item-image" 
                             src="${item.image || fallbackImage}" 
                             alt="${item.title}"
                             onerror="this.onerror=null; this.src='${fallbackImage}'">
                        <div class="preview-item-details">
                            <div class="preview-item-title">${item.title}</div>
                            <div class="preview-item-price">${item.price}</div>
                        </div>
                    </div>
                `;
			});

			cartPreview.innerHTML = html;

			// Enable send button if connected and has items
			sendToWhatsAppBtn.disabled = !isConnected || !currentRecipient;
		}
	}

	// Recipient Validation
	function validateRecipientNumber() {
		const number = recipientNumber.value.trim();

		if (!number) {
			// Clear the current recipient
			currentRecipient = null;
			// Disable send button if the field is empty
			sendToWhatsAppBtn.disabled =
				!isConnected || !currentRecipient || cartItems.length === 0;
			return;
		}

		// Format: countrycode+number@c.us
		// Example: 971555555555@c.us
		const formattedNumber = `${number}@c.us`;

		// تحسين نمط التحقق للتأكد من أن الرقم يحتوي على أرقام فقط وبداية صالحة
		if (!/^\d+@c\.us$/.test(formattedNumber) || number.length < 10) {
			// إضافة فئة CSS للحقل لإظهار أنه غير صالح
			recipientNumber.classList.add("invalid");

			// عرض رسالة في حقل الإدخال نفسه
			recipientNumber.setCustomValidity(
				"رقم غير صالح - استخدم رمز البلد بدون + مثل 971XXXXXXXX",
			);
			recipientNumber.reportValidity();

			currentRecipient = null;
			// تعطيل زر الإرسال
			sendToWhatsAppBtn.disabled = true;
			return;
		}

		// إزالة تنسيق الخطأ
		recipientNumber.classList.remove("invalid");
		recipientNumber.setCustomValidity("");

		currentRecipient = formattedNumber;
		addStatusMessage(`تم تعيين المستلم: ${number}`, "success");

		// تمكين زر الإرسال إذا كان متصلاً ولديه عناصر
		sendToWhatsAppBtn.disabled = !isConnected || cartItems.length === 0;
	}

	// Send to WhatsApp
	async function sendCartToWhatsApp() {
		if (!isConnected) {
			addStatusMessage("يرجى الاتصال بواتساب أولاً", "warning");
			return;
		}

		if (!currentRecipient) {
			addStatusMessage("يرجى التحقق من رقم المستلم أولاً", "warning");
			return;
		}

		if (cartItems.length === 0) {
			addStatusMessage("عربة التسوق فارغة", "warning");
			return;
		}

		try {
			addStatusMessage(
				"جاري تجهيز عناصر العربة للإرسال إلى واتساب...",
				"info",
			);

			// Get intro message
			const introMessage = messageTemplate.value.trim();

			// Prepare messages array
			const messages = [];

			// Add intro message
			if (introMessage) {
				messages.push({
					type: "text",
					body: introMessage,
				});
			}

			// Add each cart item as a message
			cartItems.forEach((item) => {
				// Text message with item details
				messages.push({
					type: "text",
					body: `*${item.title}*\nالسعر: ${item.price}\n${
						item.href ? `الرابط: ${item.href}` : ""
					}`,
				});

				// Image message if image exists
				if (item.image) {
					messages.push({
						type: "image",
						href: item.image,
						caption: item.title,
					});
				}
			});

			// Send messages
			const response = await fetch(`${API_BASE_URL}/messages/send`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					to: currentRecipient,
					messages: messages,
				}),
			});

			if (!response.ok) {
				throw new Error("فشل إرسال الرسائل");
			}

			const data = await response.json();

			if (data.status === "success") {
				addStatusMessage(
					"تم إرسال عناصر العربة إلى واتساب بنجاح!",
					"success",
				);
			} else {
				throw new Error(data.message || "فشل إرسال الرسائل");
			}
		} catch (error) {
			addStatusMessage(
				`فشل إرسال عناصر العربة: ${error.message}`,
				"error",
			);
		}
	}

	// Utility functions
	function addStatusMessage(message, type = "info") {
		const messageElement = document.createElement("div");
		messageElement.className = `status-message ${type}`;

		// Add icon based on type
		let icon = "info-circle";
		if (type === "success") icon = "check-circle";
		if (type === "warning") icon = "exclamation-triangle";
		if (type === "error") icon = "times-circle";

		messageElement.innerHTML = `
            <i class="fas fa-${icon}"></i> ${message}
        `;

		// Add to status messages
		statusMessages.prepend(messageElement);

		// Remove old messages if there are too many
		while (statusMessages.children.length > 5) {
			statusMessages.removeChild(statusMessages.lastChild);
		}
	}
});
