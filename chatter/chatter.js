document.addEventListener("DOMContentLoaded", () => {
	// API configuration
	const API_BASE_URL = "http://localhost:3000"; // Change this to your WhatsApp API server URL

	// DOM Elements
	const connectionStatus = document.getElementById("connection-status");
	const initWhatsAppBtn = document.getElementById("init-whatsapp");
	const logoutWhatsAppBtn = document.getElementById("logout-whatsapp");
	const qrContainer = document.getElementById("qr-container");
	const qrLoading = document.getElementById("qr-loading");
	const qrCode = document.getElementById("qr-code");
	const cartPreview = document.getElementById("cart-preview");
	const messageTemplate = document.getElementById("message-template");
	const sendToWhatsAppBtn = document.getElementById("send-to-whatsapp");
	const statusMessages = document.getElementById("status-messages");
	const refreshPageBtn = document.getElementById("refresh-page");
	const recipientNumber = document.getElementById("recipient-number");

	// DOM Elements for contact search
	const contactSearchInput = document.getElementById("contact-search");
	const clearSearchBtn = document.getElementById("clear-search");
	const searchResultsContainer = document.getElementById("search-results");
	const selectedRecipientContainer =
		document.getElementById("selected-recipient");

	// State
	let isConnected = false;
	let isInitializing = false;
	let currentRecipient = null;
	let cartItems = [];
	let qrCheckInterval;
	let statusCheckInterval;
	let phoneInputTimeout;
	let searchTimeout;
	let allContacts = []; // Store all contacts data
	let filteredContacts = []; // Store filtered contacts based on search

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
		sendToWhatsAppBtn.addEventListener("click", sendCartToWhatsApp);

		// Contact search event listeners
		if (contactSearchInput) {
			contactSearchInput.addEventListener("input", handleSearchInput);
			contactSearchInput.addEventListener("focus", showSearchResults);
		}

		if (clearSearchBtn) {
			clearSearchBtn.addEventListener("click", clearSearch);
		}

		// Close search results when clicking outside
		document.addEventListener("click", (e) => {
			if (
				!e.target.closest(".contact-search-container") &&
				!e.target.closest(".search-results-container")
			) {
				hideSearchResults();
			}
		});

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

		// عند الاتصال، سنقوم بجلب جهات الاتصال
		if (isConnected) {
			fetchContacts();
		}
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
		const statusDot = document.querySelector(".status-dot");
		const statusText = document.querySelector("#connection-status");

		// تحديث حالة الاتصال بناءً على الحالة المستلمة
		switch (status) {
			case "connected":
				// تحديث عنصر حالة الاتصال بالكامل
				connectionStatus.className = "chatter-status online";
				connectionStatus.innerHTML =
					'<span class="status-dot"></span> متصل';

				// تحديث نقطة الحالة بعد إعادة إنشائها
				const newStatusDot =
					connectionStatus.querySelector(".status-dot");
				if (newStatusDot) {
					newStatusDot.className = "status-dot connected";
				}

				isConnected = true;
				isInitializing = false;
				initializationStartTime = null;

				// تعطيل زر الاتصال وتفعيل زر قطع الاتصال
				initWhatsAppBtn.disabled = true;
				logoutWhatsAppBtn.disabled = false;

				// إخفاء حاوية QR عند الاتصال
				qrContainer.style.display = "none";

				// إيقاف فحص QR عند الاتصال
				if (qrCheckInterval) {
					clearInterval(qrCheckInterval);
				}

				// فحص الاتصال كل 30 ثانية للحفاظ على الجلسة
				if (statusCheckInterval) {
					clearInterval(statusCheckInterval);
					statusCheckInterval = setInterval(
						checkConnectionStatus,
						30000,
					);
				}

				addStatusMessage("تم الاتصال بواتساب بنجاح!", "success");

				// جلب جهات الاتصال عند الاتصال بنجاح
				fetchContacts();

				// تحديث حالة زر الإرسال
				sendToWhatsAppBtn.disabled =
					!currentRecipient || cartItems.length === 0;
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

			// تمكين زر الإرسال إذا كان متصلاً ولديه مستلم
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

			// Add each cart item as a detailed message
			cartItems.forEach((item, index) => {
				// Add divider between items
				if (index > 0) {
					messages.push({
						type: "text",
						body: "〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n",
					});
				}

				// Create a comprehensive message with all available data
				let detailedMessage = `*${item.title}*\n`;

				// Only show price if it's not $0
				if (
					item.price &&
					item.price !== "$0" &&
					item.price !== "0" &&
					item.price !== "$0.00"
				) {
					detailedMessage += `💵 *السعر:* ${item.price}\n`;
				}

				// Define property mapping for translations and emojis
				const propertyMapping = {
					// Primary Properties
					actualCashValue: {
						arabic: "القيمة النقدية الفعلية",
						emoji: "💰",
					},
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
					estRetailValue: {
						arabic: "القيمة التجارية المقدرة",
						emoji: "💰",
					},
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

				// Process standard properties and variants
				const processProperty = (key, arabicLabel, emoji) => {
					// Check direct property first
					if (item[key]) {
						detailedMessage += `${emoji} *${arabicLabel}:* ${item[key]}\n`;
						return true;
					}
					// Then check in additionalData if it exists
					else if (item.additionalData && item.additionalData[key]) {
						detailedMessage += `${emoji} *${arabicLabel}:* ${item.additionalData[key]}\n`;
						return true;
					}
					return false;
				};

				// Track processed properties to avoid duplicates
				const processedProps = new Set();

				// First try direct properties with our predefined mapping
				for (const [propKey, mapValue] of Object.entries(
					propertyMapping,
				)) {
					if (
						processProperty(
							propKey,
							mapValue.arabic,
							mapValue.emoji,
						)
					) {
						processedProps.add(propKey.toLowerCase());
					}
				}

				// Then check for English variant keys in additionalData
				if (item.additionalData) {
					for (const [key, value] of Object.entries(
						item.additionalData,
					)) {
						// Skip if it's not a string/number/boolean or is already processed or is additional images
						if (
							typeof value === "object" ||
							value === null ||
							key === "additionalImages" ||
							key === "images" ||
							processedProps.has(
								key.toLowerCase().replace(/\s+/g, ""),
							)
						)
							continue;

						// Try to find translation in our mapping
						const normalizedKey = key
							.toLowerCase()
							.replace(/\s+/g, "");
						let found = false;

						// Look for matching property in our mapping
						for (const [propKey, mapValue] of Object.entries(
							propertyMapping,
						)) {
							if (propKey.toLowerCase() === normalizedKey) {
								detailedMessage += `${mapValue.emoji} *${mapValue.arabic}:* ${value}\n`;
								processedProps.add(normalizedKey);
								found = true;
								break;
							}
						}

						if (!found) {
							// If no translation found, make the key more readable
							let arabicKey = key
								.replace(/([A-Z])/g, " $1")
								.trim()
								.replace(/_/g, " ");
							detailedMessage += `ℹ️ *${arabicKey}:* ${value}\n`;
						}
					}
				}

				// Send the detailed text message
				messages.push({
					type: "text",
					body: detailedMessage,
				});

				// Send the main image if available
				if (item.image) {
					messages.push({
						type: "image",
						href: item.image,
					});
				}

				// Function to process and send images
				const processImages = (imageArray) => {
					if (!Array.isArray(imageArray) || imageArray.length === 0)
						return;

					// Calculate how many images to include (all except last two)
					const numImagesToInclude = Math.max(
						0,
						imageArray.length - 2,
					);

					// Only process if we have images to send
					if (numImagesToInclude > 0) {
						// Get all images except the last two
						const imagesToSend = imageArray.slice(
							0,
							numImagesToInclude,
						);

						imagesToSend.forEach((imgUrl) => {
							if (imgUrl) {
								messages.push({
									type: "image",
									href: imgUrl,
								});
							}
						});
					}
				};

				// Process images from different possible sources
				if (item.additionalData) {
					// Check additionalData.images first
					if (item.additionalData.images) {
						processImages(item.additionalData.images);
					}
					// Then check additionalData.additionalImages
					if (item.additionalData.additionalImages) {
						processImages(item.additionalData.additionalImages);
					}
				}
				// Check item.additionalImages as fallback
				if (item.additionalImages) {
					processImages(item.additionalImages);
				}
			});

			// Send messages
			const response = await fetch(`${API_BASE_URL}/messages/send`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					to: currentRecipient?.id || currentRecipient?.phone,
					messages: messages,
				}),
			});

			if (!response.ok) {
				throw new Error("فشل إرسال الرسائل");
			}

			const data = await response.json();

			if (data.status === "success") {
				addStatusMessage(
					"تم إرسال عناصر العربة بكافة التفاصيل إلى واتساب بنجاح!",
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
		// Add state management variables if they don't exist
		if (!window.toastQueue) window.toastQueue = [];
		if (!window.isShowingToast) window.isShowingToast = false;

		// إذا كان هناك إشعار نشط حالياً، قم بإزالته واستبداله بالإشعار الجديد
		const toastContainer = document.getElementById("toast-container");
		if (window.isShowingToast && toastContainer) {
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
				window.toastQueue = [];
			}
		}

		// Add message to the queue
		window.toastQueue.push({ message, type });

		// Process queue immediately
		processNextToast();
	}

	// Process next toast in queue
	function processNextToast() {
		// If queue is empty, we're done
		if (window.toastQueue.length === 0) {
			window.isShowingToast = false;
			return;
		}

		// Set flag that we're showing a toast
		window.isShowingToast = true;

		// Get next toast from queue
		const { message, type } = window.toastQueue.shift();

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
		let toastContainer = document.getElementById("toast-container");
		if (!toastContainer) {
			toastContainer = document.createElement("div");
			toastContainer.id = "toast-container";
			document.body.appendChild(toastContainer);

			// Add CSS for toast container
			const style = document.createElement("style");
			style.textContent = `
				#toast-container {
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
					border-right: 4px solid #3498db;
				}
				.toast-notification.info .toast-icon {
					color: #3498db;
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
					#toast-container {
						right: 10px;
						left: 10px;
						bottom: 10px;
					}
					
					.toast-notification {
						min-width: auto;
						max-width: none;
						width: 100%;
					}
				}
			`;
			document.head.appendChild(style);
		}

		// Add toast to container
		toastContainer.appendChild(toast);

		// Add click event for close button
		const closeBtn = toast.querySelector(".toast-close");
		if (closeBtn) {
			closeBtn.addEventListener("click", () => {
				toast.classList.remove("show");
				toast.classList.add("hide");

				setTimeout(() => {
					if (toastContainer.contains(toast)) {
						toastContainer.removeChild(toast);
					}
					// Process next toast
					processNextToast();
				}, 500);
			});
		}

		// Trigger animation
		setTimeout(() => {
			toast.classList.add("show");

			// Set timeout to remove toast
			setTimeout(() => {
				// Only auto-remove if still in DOM (user might have clicked close)
				if (
					document.body.contains(toast) &&
					!toast.classList.contains("hide")
				) {
					toast.classList.remove("show");
					toast.classList.add("hide");

					// Remove toast after animation
					setTimeout(() => {
						if (toastContainer.contains(toast)) {
							toastContainer.removeChild(toast);
						}
						// Process next toast
						processNextToast();
					}, 500);
				}
			}, 5000);
		}, 10);

		// Update status messages section (for backward compatibility)
		const statusMessagesDiv = document.getElementById("status-messages");
		if (statusMessagesDiv) {
			const messageElement = document.createElement("div");
			messageElement.className = `status-message ${type}`;
			messageElement.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;

			statusMessagesDiv.prepend(messageElement);

			// Keep only last 5 messages
			while (statusMessagesDiv.children.length > 5) {
				statusMessagesDiv.removeChild(statusMessagesDiv.lastChild);
			}
		}
	}

	// Contact Search Functions
	async function fetchContacts() {
		try {
			const response = await fetch(`${API_BASE_URL}/messages/chats`);

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = await response.json();

			if (data && data.status === "success" && data.chats) {
				// تحويل البيانات إلى الشكل المطلوب لعرضها
				allContacts = data.chats.map((chat) => {
					const contact = chat.contact || {};
					const isGroup = chat.id && chat.id.server === "g.us";

					return {
						id: chat.id?._serialized || "",
						name:
							contact.name ||
							contact.pushname ||
							(isGroup ? "مجموعة بدون اسم" : "جهة اتصال"),
						phone: chat.id?.user || "",
						image: contact.profilePicThumbObj?.imgFull || null,
						isGroup: isGroup,
						lastSeen: chat.t ? new Date(chat.t * 1000) : null,
					};
				});

				console.log("تم تحميل جهات الاتصال:", allContacts.length);
				addStatusMessage(
					`تم تحميل ${allContacts.length} من جهات الاتصال`,
					"success",
				);
			}
		} catch (error) {
			console.error("Error fetching contacts:", error);
			addStatusMessage(
				`فشل في تحميل جهات الاتصال: ${error.message}`,
				"error",
			);
		}
	}

	function handleSearchInput(e) {
		const searchTerm = e.target.value.trim();

		// إظهار أو إخفاء زر المسح
		if (searchTerm.length > 0) {
			clearSearchBtn.classList.add("visible");
		} else {
			clearSearchBtn.classList.remove("visible");
		}

		// إلغاء المؤقت السابق إذا وجد
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// إنشاء مؤقت جديد للبحث بعد توقف المستخدم عن الكتابة
		searchTimeout = setTimeout(() => {
			// إذا كان النص يبدو كرقم هاتف (يحتوي على أرقام فقط)
			if (/^\d+$/.test(searchTerm) && searchTerm.length >= 8) {
				// عرض خيار إضافة رقم جديد
				showNewNumberOption(searchTerm);
			}
			// البحث فقط إذا كان طول النص > 1
			else if (searchTerm.length > 1) {
				filterContacts(searchTerm);
			} else if (searchTerm.length === 0) {
				// إذا كان حقل البحث فارغًا، لا تظهر نتائج البحث
				showNoResultsYet();
			} else {
				// إذا كان الحرف واحدًا فقط، أظهر رسالة للمستخدم
				showMessage("يرجى كتابة حرفين على الأقل للبحث");
			}
		}, 300);
	}

	function filterContacts(searchTerm) {
		searchTerm = searchTerm.toLowerCase();

		if (!allContacts.length) {
			showMessage(
				"لا توجد جهات اتصال متاحة. تأكد من الاتصال بواتساب أولاً.",
			);
			return;
		}

		// تصفية جهات الاتصال حسب النص المدخل
		filteredContacts = allContacts.filter((contact) => {
			// البحث في الاسم
			const nameMatch = contact.name.toLowerCase().includes(searchTerm);

			// البحث في رقم الهاتف
			const phoneMatch = contact.phone.toLowerCase().includes(searchTerm);

			return nameMatch || phoneMatch;
		});

		// عرض النتائج
		renderSearchResults(filteredContacts);
	}

	function renderSearchResults(contacts) {
		// تنشيط حاوية نتائج البحث
		searchResultsContainer.classList.add("active");

		if (!contacts || contacts.length === 0) {
			showNoResults();
			return;
		}

		// تنظيم جهات الاتصال حسب الحروف الأبجدية
		const contactsByLetter = groupContactsByFirstLetter(contacts);

		// إنشاء HTML لعرض النتائج
		let resultsHTML = "";

		// إضافة كل مجموعة حرفية
		Object.entries(contactsByLetter).forEach(([letter, contactsGroup]) => {
			resultsHTML += `<div class="alphabet-group">
				<div class="alphabet-group-header">${letter}</div>`;

			contactsGroup.forEach((contact) => {
				// تحديد الصورة الرمزية
				let avatarHTML = "";
				if (contact.image) {
					avatarHTML = `<img src="${contact.image}" alt="${contact.name}" />`;
				} else {
					// استخدام أول حرف من الاسم لصورة رمزية افتراضية
					const initial = contact.name.charAt(0).toUpperCase();
					avatarHTML = `<div class="avatar-placeholder">${initial}</div>`;
				}

				// تحديد نوع جهة الاتصال (شخص أو مجموعة)
				const typeClass = contact.isGroup ? "group" : "person";
				const typeLabel = contact.isGroup ? "مجموعة" : "شخص";

				// إضافة عنصر جهة اتصال
				resultsHTML += `
					<div class="contact-item" data-id="${contact.id}" data-phone="${
					contact.phone
				}" data-name="${contact.name}" data-image="${
					contact.image || ""
				}">
						<div class="contact-avatar">
							${avatarHTML}
						</div>
						<div class="contact-info">
							<div class="contact-name">${contact.name}</div>
							<div class="contact-phone">${formatPhone(contact.phone)}</div>
						</div>
						<div class="contact-type ${typeClass}">${typeLabel}</div>
					</div>
				`;
			});

			resultsHTML += "</div>";
		});

		// تحديث محتوى حاوية النتائج
		searchResultsContainer.innerHTML = resultsHTML;

		// إضافة مستمعات الأحداث للنقر على جهات الاتصال
		document.querySelectorAll(".contact-item").forEach((item) => {
			item.addEventListener("click", handleContactSelection);
		});
	}

	function handleContactSelection(e) {
		console.log("handleContactSelection==============");
		const contactElement = e.currentTarget;
		const contactId = contactElement.dataset.id;
		const contactPhone = contactElement.dataset.phone;
		const contactName = contactElement.dataset.name;
		const contactImage = contactElement.dataset.image || "";

		// إنشاء كائن للمستلم المختار
		currentRecipient = {
			id: contactId,
			phone: contactPhone,
			name: contactName,
			image: contactImage,
		};

		// تحديث واجهة المستخدم
		renderSelectedRecipient(currentRecipient);

		// تحديث حقل إدخال الرقم إذا كان موجوداً
		if (recipientNumber) {
			recipientNumber.value = contactPhone;
		}

		// إخفاء حاوية نتائج البحث
		hideSearchResults();

		// إلغاء تنشيط حقل البحث
		if (contactSearchInput) {
			contactSearchInput.blur();
		}

		// إخفاء قسم البحث بالكامل
		document.querySelector(".contact-search-container").style.display =
			"none";

		// تمكين زر الإرسال إذا كان متصلاً ولديه عناصر
		sendToWhatsAppBtn.disabled = !isConnected || cartItems.length === 0;
	}

	function renderSelectedRecipient(recipient) {
		// إظهار حاوية المستلم المختار
		selectedRecipientContainer.classList.add("active");

		// تحديد الصورة الرمزية
		let avatarHTML = "";
		if (recipient.image) {
			avatarHTML = `<img src="${recipient.image}" alt="${recipient.name}" />`;
		} else if (recipient.isNew) {
			// صورة رمزية مختلفة للمستخدمين الجدد
			avatarHTML = `<div class="avatar-placeholder new-contact"><i class="fas fa-user-plus"></i></div>`;
		} else {
			const initial = recipient.name.charAt(0).toUpperCase();
			avatarHTML = `<div class="avatar-placeholder">${initial}</div>`;
		}

		// إضافة فئة للمستلمين الجدد
		const newContactClass = recipient.isNew ? "new-contact" : "";

		// إنشاء HTML للمستلم المختار
		selectedRecipientContainer.innerHTML = `
			<div class="selected-recipient ${newContactClass}">
				<div class="selected-recipient-avatar">
					${avatarHTML}
				</div>
				<div class="selected-recipient-details">
					<div class="selected-recipient-name">${recipient.name}</div>
					<div class="selected-recipient-phone">${formatPhone(recipient.phone)}</div>
					${recipient.isNew ? '<div class="recipient-new-badge">جديد</div>' : ""}
				</div>
				<button class="remove-recipient" id="remove-recipient">
					<i class="fas fa-times"></i>
				</button>
			</div>
		`;

		// إضافة مستمع حدث لزر الإزالة
		const removeBtn = document.getElementById("remove-recipient");
		if (removeBtn) {
			removeBtn.addEventListener("click", removeSelectedRecipient);
		}
	}

	function removeSelectedRecipient() {
		// إزالة المستلم الحالي
		currentRecipient = null;

		// إخفاء حاوية المستلم المختار
		selectedRecipientContainer.classList.remove("active");
		selectedRecipientContainer.innerHTML = "";

		// مسح حقل إدخال الرقم إذا كان موجوداً
		if (recipientNumber) {
			recipientNumber.value = "";
		}

		// إظهار قسم البحث مرة أخرى
		document.querySelector(".contact-search-container").style.display =
			"flex";

		// مسح حقل البحث
		contactSearchInput.value = "";
		clearSearchBtn.classList.remove("visible");

		// تعطيل زر الإرسال
		sendToWhatsAppBtn.disabled = true;
	}

	function showSearchResults() {
		searchResultsContainer.classList.add("active");
	}

	function hideSearchResults() {
		searchResultsContainer.classList.remove("active");
	}

	function clearSearch() {
		contactSearchInput.value = "";
		clearSearchBtn.classList.remove("visible");
		showNoResultsYet();
		contactSearchInput.focus();
	}

	function showNoResults() {
		searchResultsContainer.innerHTML = `
			<div class="no-results-found">
				<i class="fas fa-search"></i>
				<p>لم يتم العثور على نتائج</p>
			</div>
		`;
	}

	function showNoResultsYet() {
		searchResultsContainer.innerHTML = `
			<div class="no-results-yet">
				<p>ابدأ الكتابة للبحث في جهات الاتصال</p>
			</div>
		`;
	}

	function showMessage(message) {
		searchResultsContainer.innerHTML = `
			<div class="no-results-yet">
				<p>${message}</p>
			</div>
		`;
	}

	function formatPhone(phone) {
		// أنماط مختلفة لعرض الأرقام
		if (!phone) return "";

		// إزالة أي + من بداية الرقم إن وجدت
		let cleanPhone = phone.replace(/^\+/, "");

		if (cleanPhone.length > 8) {
			// تنسيق دولي مع إضافة علامة +
			if (cleanPhone.length >= 11) {
				// تنسيق للأرقام الطويلة (مثل: +971 55 555 5555)
				return `+${cleanPhone.slice(0, 3)} ${cleanPhone.slice(
					3,
					5,
				)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
			} else if (cleanPhone.length >= 10) {
				// تنسيق متوسط الطول (مثل: +966 55 555 555)
				return `+${cleanPhone.slice(0, 3)} ${cleanPhone.slice(
					3,
					5,
				)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
			} else {
				// تنسيق للأرقام القصيرة نسبياً
				return `+${cleanPhone.slice(0, 2)} ${cleanPhone.slice(
					2,
					5,
				)} ${cleanPhone.slice(5)}`;
			}
		}

		// إرجاع الرقم كما هو بدون تنسيق إذا كان قصيراً
		return phone;
	}

	function groupContactsByFirstLetter(contacts) {
		const groups = {};

		// مصفوفة للحروف العربية
		const arabicLetters =
			"أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي".split(
				" ",
			);

		contacts.forEach((contact) => {
			// استخدام أول حرف من اسم جهة الاتصال
			let firstChar = contact.name.charAt(0).toUpperCase();

			// تحديد المجموعة المناسبة
			let group;

			// التحقق إذا كان الحرف الأول عربي
			if (arabicLetters.some((letter) => firstChar === letter)) {
				group = firstChar;
			}
			// التحقق من الأحرف الإنجليزية
			else if (/[A-Za-z]/.test(firstChar)) {
				group = firstChar.toUpperCase();
			}
			// إذا كان رقم
			else if (/[0-9]/.test(firstChar)) {
				group = "123";
			}
			// أي شيء آخر
			else {
				group = "#";
			}

			// إنشاء المجموعة إذا لم تكن موجودة
			if (!groups[group]) {
				groups[group] = [];
			}

			// إضافة جهة الاتصال إلى المجموعة المناسبة
			groups[group].push(contact);
		});

		// ترتيب المجموعات أبجديًا
		const sortedGroups = {};

		// إضافة المجموعات حسب الترتيب المطلوب

		// الأحرف العربية أولاً
		arabicLetters.forEach((letter) => {
			if (groups[letter]) {
				sortedGroups[letter] = groups[letter];
			}
		});

		// ثم الأحرف الإنجليزية
		for (let i = 65; i <= 90; i++) {
			const letter = String.fromCharCode(i);
			if (groups[letter]) {
				sortedGroups[letter] = groups[letter];
			}
		}

		// ثم الأرقام
		if (groups["123"]) {
			sortedGroups["123"] = groups["123"];
		}

		// ثم أي شيء آخر
		if (groups["#"]) {
			sortedGroups["#"] = groups["#"];
		}

		return sortedGroups;
	}

	// دالة جديدة لعرض خيار إضافة رقم جديد
	function showNewNumberOption(phoneNumber) {
		// تنشيط حاوية نتائج البحث
		searchResultsContainer.classList.add("active");

		// فلترة جهات الاتصال للتحقق مما إذا كان الرقم موجودًا بالفعل
		const existingContact = allContacts.find(
			(contact) => contact.phone === phoneNumber,
		);

		if (existingContact) {
			// إذا كان الرقم موجوداً، اعرض جهة الاتصال فقط
			renderSearchResults([existingContact]);
		} else {
			// تنسيق الرقم للعرض
			const formattedPhone = formatPhone(phoneNumber);

			// إنشاء HTML لخيار إضافة رقم جديد
			searchResultsContainer.innerHTML = `
				<div class="new-number-option">
					<div class="new-number-header">
						<i class="fas fa-plus-circle"></i>
						<span>إضافة رقم جديد</span>
					</div>
					<div class="contact-item new-number" data-phone="${phoneNumber}">
						<div class="contact-avatar">
							<div class="avatar-placeholder">
								<i class="fas fa-user-plus"></i>
							</div>
						</div>
						<div class="contact-info">
							<div class="contact-name">جهة اتصال جديدة</div>
							<div class="contact-phone">${formattedPhone}</div>
						</div>
						<div class="contact-type new">جديد</div>
					</div>
				</div>
			`;

			// إضافة مستمع حدث للنقر على الرقم الجديد
			document
				.querySelector(".new-number")
				.addEventListener("click", handleNewNumberSelection);
		}
	}

	// دالة جديدة للتعامل مع اختيار رقم جديد
	function handleNewNumberSelection(e) {
		const contactElement = e.currentTarget;
		const phoneNumber = contactElement.dataset.phone;

		// إنشاء كائن للمستلم الجديد
		currentRecipient = {
			id: `${phoneNumber}@c.us`,
			phone: phoneNumber,
			name: `جهة اتصال جديدة (${phoneNumber})`,
			image: "",
			isNew: true,
		};

		// تحديث واجهة المستخدم
		renderSelectedRecipient(currentRecipient);

		// تحديث حقل إدخال الرقم
		recipientNumber.value = phoneNumber;

		// إخفاء حاوية نتائج البحث
		hideSearchResults();

		// إلغاء تنشيط حقل البحث
		if (contactSearchInput) {
			contactSearchInput.blur();
		}

		// إخفاء قسم البحث بالكامل
		document.querySelector(".contact-search-container").style.display =
			"none";

		// التحقق من صحة الرقم
		validateRecipientNumber();
	}
});
