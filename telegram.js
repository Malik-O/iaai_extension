// Create toast container if it doesn't exist
let toastContainer = document.getElementById("tg-toast-container");
if (!toastContainer) {
	toastContainer = document.createElement("div");
	toastContainer.id = "tg-toast-container";
	document.body.appendChild(toastContainer);

	// Add CSS for toast container
	const style = document.createElement("style");
	style.textContent = \`
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
	\`;
	document.head.appendChild(style);
}

// Add toast to container

// Add styles for search results container
const style = document.createElement("style");
style.textContent = \`
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
\`;
document.head.appendChild(style);

// DOM Elements

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
	toast.className = \`toast-notification \${type}\`;

	// Add icon based on type
	let icon = "info-circle";
	if (type === "success") icon = "check-circle";
	if (type === "warning") icon = "exclamation-triangle";
	if (type === "error") icon = "times-circle";

	toast.innerHTML = \`
		<div class="toast-icon"><i class="fas fa-\${icon}"></i></div>
		<div class="toast-content">\${message}</div>
		<button class="toast-close"><i class="fas fa-times"></i></button>
	\`;

	// Create toast container if it doesn't exist
	let toastContainer = document.getElementById("tg-toast-container");
	if (!toastContainer) {
		toastContainer = document.createElement("div");
		toastContainer.id = "tg-toast-container";
		document.body.appendChild(toastContainer);
		// Removed style injection from here
	}

	// Add toast to container
	toastContainer.appendChild(toast);

	let html = '<div class="cart-items-container">';

	items.forEach((item, index) => {
		const fallbackImage = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(
			item.title,
		)}&background=229ed9&color=fff&size=48\`;

		html += \`
			<div class="cart-item" data-item-id="\${index}">
				<div class="cart-item-image">
					<img src="\${item.image || fallbackImage}" 
						 alt="\${item.title}"
						 onerror="this.onerror=null; this.src='\${fallbackImage}'">
				</div>
				<div class="cart-item-details">
					<div class="cart-item-title">\${item.title}</div>
					<div class="cart-item-price">\${item.price || "السعر غير متوفر"}</div>
					\${item.variant ? \`<div class="cart-item-variant">\${item.variant}</div>\` : ""}
					\${
						item.quantity
							? \`<div class="cart-item-quantity">الكمية: \${item.quantity}</div>\`
							: ""
					}
					\${
						item.additionalData?.vin
							? \`<div class="cart-item-vin">رقم الهيكل: \${item.additionalData.vin}</div>\`
							: ""
					}
				</div>
				<button class="remove-cart-item" onclick="removeCartItem(\${index})" title="إزالة من العربة">
					<i class="fas fa-times"></i>
				</button>
			</div>
		\`;
	});

	html += "</div>";
	cartPreview.innerHTML = html;

	// Add the styles for cart preview
	const style = document.createElement("style");
	style.textContent = \`
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
	\`;
	document.head.appendChild(style);
}

// Add these new functions for cart management

// Helper: show/hide loading overlay
function showLoading(message = "جاري المعالجة...") {
	let overlay = document.getElementById("tg-loading-overlay");
	if (!overlay) {
		overlay = document.createElement("div");
		overlay.id = "tg-loading-overlay";
		overlay.innerHTML = \`<div class="spinner" style="margin-bottom:16px;"></div><div style="font-size:18px;color:#229ed9;font-weight:500;">\${message}</div>\`;
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
		fetch(\`\${TG_API_BASE_URL}/telegram/init-session\`, {
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
				fetch(\`\${TG_API_BASE_URL}/telegram/init-session\`, {
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
					\`\${TG_API_BASE_URL}/telegram/start-init\`,
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
	authSection.innerHTML = \`
		<div class="tg-auth-inputs code-step">
			<div class="floating-input-container">
				<input type="text" id="tg-phone-code" placeholder=" " autocomplete="off" />
				<label for="tg-phone-code">رمز التحقق</label>
			</div>
			<button id="tg-complete-init" class="primary-button">
				<i class="fab fa-telegram-plane"></i> إكمال التهيئة
			</button>
		</div>
	\`;
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
					\`\${TG_API_BASE_URL}/telegram/complete-init\`,
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
// Variables are already declared at the top

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
			\`\${TG_API_BASE_URL}/telegram/contacts\`,
		);
		if (!response.ok) {
			throw new Error(\`خطأ في الاتصال: \${response.status}\`);
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
						? \`\${user.firstName}\${
								user.lastName ? " " + user.lastName : ""
						  }\`
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
				\`تم تحميل \${tgAllContacts.length} من جهات الاتصال والمحادثات بنجاح ✨\`,
				"success",
			);
		} else {
			addStatusMessage("لم نتمكن من تحميل البيانات", "error");
		}
	} catch (error) {
		hideLoading();
		addStatusMessage(
			\`حدث خطأ أثناء تحميل البيانات: \${error.message}\`,
			"error",
		);
	}
}

function tgHandleSearchInput(e) {
	const searchTerm = e.target.value.trim().toLowerCase(); // Convert to lowercase for case-insensitive search
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
			// Optionally show a message if search term is too short
			// addStatusMessage("يرجى كتابة حرفين على الأقل للبحث", "info");
			tgShowNoResultsYet(); // Or just show the 'start typing' message
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
		searchResultsContainer.innerHTML = \`
			<div class="no-results-found">
				<i class="fas fa-search"></i>
				<p>لم يتم العثور على نتائج</p>
			</div>\`;
		return;
	}

	// Group items by type
	const groups = {
		contact: { title: "جهات الاتصال", icon: "user", items: [] },
		channel: { title: "القنوات", icon: "broadcast-tower", items: [] },
		group: { title: "المجموعات", icon: "users", items: [] }, // for megagroups
		chat: { title: "المحادثات", icon: "comments", items: []} // for basic groups / other chats
	};

	items.forEach((item) => {
		let typeKey = item.type;
		if (item.type === 'channel' && item.isMegagroup) {
			typeKey = 'group'; // Treat megagroups as groups
		} else if (item.type !== 'contact' && item.type !== 'channel') {
			typeKey = 'chat'; // Catch-all for other chat types if any
		}
		
		if (groups[typeKey]) {
			groups[typeKey].items.push(item);
		}
	});

	let html = '<div class="search-results-inner">';

	// Render each section
	Object.entries(groups).forEach(([typeKey, group]) => {
		if (group.items.length > 0) {
			html += \`
				<div class="result-section">
					<div class="section-header">
						<i class="fas fa-\${group.icon}"></i>
						<span>\${group.title}</span>
						<span class="count">\${group.items.length}</span>
					</div>
					<div class="section-items">\`;

			group.items.forEach((item) => {
				const fallbackImage = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(
					item.name,
				)}&background=229ed9&color=fff&size=48\`;

				let subtitle = "";
				if (item.type === "contact") {
					subtitle = item.phone || item.username || "";
				} else {
					subtitle = item.username || (item.participantsCount ? \`\${item.participantsCount} عضو\` : '');
				}

				let badges = "";
				if (item.isVerified) {
					badges +=
						'<span class="badge verified" title="موثق"><i class="fas fa-check-circle"></i></span>';
				}
				if (item.isPremium && item.type === "contact") { // Premium usually applies to users
					badges +=
						'<span class="badge premium" title="مميز"><i class="fas fa-star"></i></span>';
				}

				html += \`
					<div class="result-item \${item.type}" data-id="\${item.id}" data-type="\${item.type}" data-is-megagroup="\${item.isMegagroup || false}">
						<div class="item-avatar">
							<img src="\${item.image || fallbackImage}" 
								 alt="\${item.name}"
								 onerror="this.src='\${fallbackImage}'">
							\${
								item.type !== "contact"
									? \`<span class="type-indicator"><i class="fas fa-\${groups[typeKey]?.icon || 'user'}"></i></span>\`
									: ""
							}
						</div>
						<div class="item-info">
							<div class="item-name">
								\${item.name}
								\${badges}
							</div>
							<div class="item-subtitle">\${subtitle}</div>
						</div>
					</div>\`;
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
	// Removed style injection for tg-search-styles
}

function tgHandleContactSelection(e) {
	const contactElement = e.currentTarget;
	const typeAttribute = contactElement.dataset.type;
	const id = contactElement.dataset.id;
	const isMegagroup = contactElement.dataset.isMegagroup === 'true';

	let actualType = typeAttribute;
	if (typeAttribute === 'channel' && isMegagroup) {
		actualType = 'group'; // Treat megagroup as 'group' for recipient object
	}


	const name = contactElement
		.querySelector(".item-name")
		.textContent.trim();
	const subtitleElement = contactElement.querySelector(".item-subtitle");
	const subtitle = subtitleElement ? subtitleElement.textContent.trim() : "";
	
	const image = contactElement.querySelector("img").src;
	const isVerified =
		contactElement.querySelector(".badge.verified") !== null;
	const isPremium =
		contactElement.querySelector(".badge.premium") !== null;
	
	const phone = (actualType === 'contact' && /^\+?\d/.test(subtitle))
		? subtitle.replace(/[^\d+]/g, "") // Keep '+' for international numbers
		: null;
	const username = (actualType !== 'contact' || !phone) ? subtitle : null;


	tgCurrentRecipient = {
		id: id,
		type: actualType, // Use actualType
		name: name,
		subtitle: subtitle, // Store original subtitle for display
		image: image,
		isNew:
			actualType === "contact" && // Use actualType
			contactElement.classList.contains("new-number"),
		isVerified: isVerified,
		isPremium: isPremium,
		username: username,
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
		searchContainer.style.display = "none"; // This should hide the input and results
	}
	
	// Show the selected recipient container
	const selectedRecipientDiv = document.getElementById("tg-selected-recipient");
	if(selectedRecipientDiv) selectedRecipientDiv.style.display = "block";


	// Clear and blur search input
	const searchInput = document.getElementById("tg-contact-search");
	if (searchInput) {
		searchInput.value = "";
		searchInput.blur();
		const clearSearchBtn = document.getElementById("tg-clear-search");
		if(clearSearchBtn) clearSearchBtn.style.display = "none";
	}

	// Update send button state
	tgToggleSendButtonState();
}

function tgRenderSelectedRecipient(recipient) {
	const selectedRecipientContainer = document.getElementById(
		"tg-selected-recipient",
	);
	if (!selectedRecipientContainer) return;

	selectedRecipientContainer.style.display = "block"; 
	selectedRecipientContainer.style.width = "100%"; 

	// Get the appropriate icon based on type
	let typeIcon = "user";
	let typeLabel = "مستخدم";
	if (recipient.type === "channel") {
		typeIcon = "broadcast-tower";
		typeLabel = "قناة";
	} else if (recipient.type === "group") {
		typeIcon = "users";
		typeLabel = "مجموعة";
	} else if (recipient.type === "chat") { // Handle 'chat' type if used
		typeIcon = "comments";
		typeLabel = "محادثة";
	}


	// Create badges HTML
	let badges = "";
	if (recipient.isVerified) {
		badges +=
			'<span class="badge verified" title="موثق"><i class="fas fa-check-circle"></i></span>';
	}
	if (recipient.isPremium && recipient.type === 'contact') { // Premium usually for contacts
		badges +=
			'<span class="badge premium" title="مميز"><i class="fas fa-star"></i></span>';
	}
	
	const fallbackImage = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(recipient.name)}&background=229ed9&color=fff&size=48\`;

	selectedRecipientContainer.innerHTML = \`
		<div class="selected-recipient \${recipient.type}">
			<div class="selected-recipient-content">
				<div class="selected-recipient-avatar">
					<img src="\${recipient.image || fallbackImage}" alt="\${recipient.name}" 
						 onerror="this.onerror=null; this.src='\${fallbackImage}'">
					<span class="type-indicator"><i class="fas fa-\${typeIcon}"></i></span>
				</div>
				<div class="selected-recipient-details">
					<div class="selected-recipient-name">
						\${recipient.name}
						\${badges}
					</div>
					<div class="selected-recipient-subtitle">\${recipient.subtitle || recipient.phone || recipient.username || ''}</div>
					<div class="selected-recipient-type">\${typeLabel}</div>
				</div>
				<button class="remove-recipient" id="tg-remove-recipient">
					<i class="fas fa-times"></i>
				</button>
			</div>
		</div>
	\`;

	// Update the styles for the selected recipient
	// Removed style injection for tg-selected-recipient

	// Add click handler for remove button
	document
		.getElementById("tg-remove-recipient")
		?.addEventListener("click", tgRemoveSelectedRecipient);
}

function tgRemoveSelectedRecipient() {
	tgCurrentRecipient = null;
	const selectedRecipientDiv = document.getElementById("tg-selected-recipient");
	if (selectedRecipientDiv) {
		selectedRecipientDiv.style.display = "none";
		selectedRecipientDiv.innerHTML = "";
	}
	
	const searchContainer = document.querySelector(".contact-search-container");
	if(searchContainer) searchContainer.style.display = "block"; // Show search input again
	
	const searchInput = document.getElementById("tg-contact-search");
	if (searchInput) {
		searchInput.value = "";
		// searchInput.focus(); // Optionally focus
	}
	const clearSearchBtn = document.getElementById("tg-clear-search");
	if(clearSearchBtn) clearSearchBtn.style.display = "none";

	tgShowNoResultsYet(); // Show initial message in results area
	tgToggleSendButtonState();
}

function tgShowNoResults() { // Renamed from tgShowNoResults to avoid conflict if any
	const searchResultsContainer =
		document.getElementById("tg-search-results");
	if (searchResultsContainer) { // Check if element exists
		searchResultsContainer.innerHTML = \`<div class="no-results-found"><i class="fas fa-search"></i><p>لم يتم العثور على نتائج لتيليجرام</p></div>\`;
	}
}

function tgShowNoResultsYet() {
	const searchResultsContainer =
		document.getElementById("tg-search-results");
	if (searchResultsContainer) { // Check if element exists
		searchResultsContainer.innerHTML = \`<div class="no-results-yet"><p>ابدأ الكتابة للبحث في جهات اتصال تيليجرام</p></div>\`;
		searchResultsContainer.style.display = 'block'; // Ensure it's visible
	}
}

function tgShowMessage(message) { // Renamed from tgShowMessage to avoid conflict
	const searchResultsContainer =
		document.getElementById("tg-search-results");
	if (searchResultsContainer) { // Check if element exists
		searchResultsContainer.innerHTML = \`<div class="no-results-yet"><p>\${message}</p></div>\`;
	}
}


function tgFormatPhone(phone) {
	if (!phone) return "";
	let cleanPhone = phone.replace(/[^\d+]/g, ""); // Keep '+'
	if (cleanPhone.startsWith('+')) {
		// Basic formatting for international numbers, can be improved
		if (cleanPhone.length > 11) return \`\${cleanPhone.slice(0,4)} \${cleanPhone.slice(4,7)} \${cleanPhone.slice(7)}\`;
	} else {
		// Basic formatting for local numbers
		if (cleanPhone.length > 8) return \`\${cleanPhone.slice(0,3)} \${cleanPhone.slice(3,6)} \${cleanPhone.slice(6)}\`;
	}
	return phone; // Return original if no specific formatting applies
}


function tgGroupContactsByFirstLetter(contacts) {
	const groups = {};
	const arabicLetters = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");
	contacts.forEach((contact) => {
		if (!contact.name) return; // Skip if name is undefined
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
	// Order: Arabic, English, Numbers, Symbols
	arabicLetters.forEach((letter) => {
		if (groups[letter]) sortedGroups[letter] = groups[letter];
	});
	for (let i = 65; i <= 90; i++) { // A-Z
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
	if (!searchResultsContainer) return;
	searchResultsContainer.style.display = "block";
	
	const cleanedInputPhone = phoneNumber.replace(/[^\d+]/g, ""); // Keep '+'
	const existingContact = tgAllContacts.find(
		(contact) => contact.phone && contact.phone.replace(/[^\d+]/g, "") === cleanedInputPhone,
	);

	if (existingContact) {
		tgRenderSearchResults([existingContact]);
	} else {
		const formattedPhone = tgFormatPhone(cleanedInputPhone); // Format the cleaned number
		searchResultsContainer.innerHTML = \`
			<div class="new-number-option">
				<div class="new-number-header"><i class="fas fa-plus-circle"></i><span>إضافة رقم جديد لتيليجرام</span></div>
				<div class="contact-item tg-contact-item new-number" 
					 data-phone="\${cleanedInputPhone}" 
					 data-name="جهة اتصال جديدة (\${formattedPhone})" 
					 data-id="\${cleanedInputPhone}"
					 data-type="contact"> 
					<div class="contact-avatar"><div class="avatar-placeholder"><i class="fas fa-user-plus"></i></div></div>
					<div class="contact-info">
						<div class="contact-name">جهة اتصال جديدة</div>
						<div class="contact-phone">\${formattedPhone}</div>
					</div>
					<div class="contact-type new">جديد</div>
				</div>
			</div>
		\`;
		const newNumberElement = document.querySelector(".new-number");
		if (newNumberElement) {
			newNumberElement.addEventListener("click", tgHandleContactSelection);
		}
	}
}

// Helper to check Telegram connection status
function isConnected() {
	return !!localStorage.getItem("telegram_session");
}

// API_BASE_URL is already defined at the top

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

		// No need to show status messages here as they can be annoying
		// Status messages are better shown on actual send attempt or connection change
	}
}

// Telegram Contact Search Specific Initializations
if (tgContactSearchInput) {
	tgContactSearchInput.addEventListener("input", tgHandleSearchInput);
	tgContactSearchInput.addEventListener("focus", () => {
		if (tgSearchResultsContainer && !tgCurrentRecipient) { // Only show if no recipient is selected
			tgSearchResultsContainer.style.display = "block";
			if (tgContactSearchInput.value.length === 0) {
					tgShowNoResultsYet(); // Show "start typing" if input is empty on focus
			} else {
					tgHandleSearchInput({target: tgContactSearchInput}); // Re-trigger search if there's text
			}
		}
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
	const searchSection = document.getElementById("tg-recipient-section"); // Main search section
	if (
		tgSearchResultsContainer &&
		searchSection && !searchSection.contains(e.target) // Check if click is outside the entire search section
	) {
		tgSearchResultsContainer.style.display = "none";
	}
});

if (sendToTelegramBtn) {
	sendToTelegramBtn.addEventListener("click", sendCartToTelegram);
}
	
// Initial UI setup
if (isConnected()) {
	setConnectedUI(true); // This will also call tgFetchContacts
} else {
	setConnectedUI(false); // This will show "offline" and "start typing"
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
	
	showLoading("جاري إرسال الرسائل..."); // Show loading overlay

	try {
		addStatusMessage("جاري تجهيز العناصر للإرسال...", "info");
		
		const recipientIdentifier = tgCurrentRecipient.username || tgCurrentRecipient.phone || tgCurrentRecipient.id;
		if (!recipientIdentifier) {
			throw new Error("معرف المستلم غير صالح.");
		}


		// Get intro message
		const introMessageElement = document.getElementById("message-template");
		const introMessage = introMessageElement ? introMessageElement.value.trim() : "";

		// Send intro message if exists
		if (introMessage) {
			const introResponse = await fetch(
				\`\${TG_API_BASE_URL}/telegram/send\`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						username: recipientIdentifier, // Use determined identifier
						text: introMessage,
					}),
				},
			);

			if (!introResponse.ok) {
				const errorData = await introResponse.json().catch(() => ({}));
				throw new Error(\`فشل في إرسال الرسالة الافتتاحية: \${errorData.message || introResponse.statusText}\`);
			}
		}

		// Process each cart item
		for (const [index, item] of tgCartItems.entries()) {
			// Send divider between items
			if (index > 0) {
				await fetch(\`\${TG_API_BASE_URL}/telegram/send\`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						username: recipientIdentifier,
						text: "〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\\n",
					}),
				});
				await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for divider
			}

			// Create detailed message text
			let messageText = \`🚗 *\${item.title || 'Unknown Vehicle'}*\n\n\`;

			// Function to process and add a property to the message
			const addProperty = (key, value) => {
				if (
					value && value.toString().trim() && // Check if value is not empty after trim
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
						messageText += \`\${emoji} *\${arabic}:* \${value}\n\`;
						return true;
					}
					return false; // No mapping found, but value existed
				}
				return false; // Value was empty or N/A
			};

			// Process main properties first
			const mainProps = [
				"price", "vin", "odometer", "primaryDamage", "secondaryDamage", "estRetailValue",
				"engine", "transmission", "drive", "fuel", "color", "keys",
				"vehicleType", "vehicle", "lotNumber", "itemNumber", "stockNumber", 
				"titleStatus", "titleState"
			];
			
			// Add known direct item properties
			mainProps.forEach((propKey) => {
				if (item[propKey]) addProperty(propKey, item[propKey]);
			});


			// Process additionalData, ensuring mapped properties are prioritized
			if (item.additionalData) {
				const processedInAdditional = new Set();

				// First, iterate through propertyMapping to ensure order and add mapped additionalData
				for (const mapKey in propertyMapping) {
					if (item.additionalData[mapKey] && !mainProps.includes(mapKey)) {
						if (addProperty(mapKey, item.additionalData[mapKey])) {
							processedInAdditional.add(mapKey);
						}
					}
				}
				
				// Then, iterate remaining additionalData keys that weren't mapped or direct item props
				for (const key in item.additionalData) {
					if (!mainProps.includes(key) && !processedInAdditional.has(key)) {
						// Try to add it, even if not in mainProps (it might be in propertyMapping under a different variation)
						// Or, if you want to only add mapped properties, you can skip this.
						// For now, let's attempt to add it if a mapping exists.
						addProperty(key, item.additionalData[key]);
					}
				}
			}


			// Send text message
			const textResponse = await fetch(
				\`\${TG_API_BASE_URL}/telegram/send\`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						username: recipientIdentifier,
						text: messageText.trim() ? messageText : item.title, // Fallback if text is empty
					}),
				},
			);
			await new Promise(resolve => setTimeout(resolve, 200)); // Small delay

			if (!textResponse.ok) {
				const errorData = await textResponse.json().catch(() => ({}));
				console.warn(\`فشل في إرسال تفاصيل العنصر "\${item.title}": \${errorData.message || textResponse.statusText}\`);
				// Don't throw, continue with other items/images but log the error
				addStatusMessage(\`فشل جزئي: لم يتم إرسال تفاصيل "\${item.title}"\`, "warning");
			}

			// Send main image
			if (item.image) {
				try {
					const mainImgRes = await fetch(\`\${TG_API_BASE_URL}/telegram/sendMedia\`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipientIdentifier,
							mediaUrl: item.image,
							caption: item.title || "", // Add caption to main image
						}),
					});
					if (!mainImgRes.ok) {
							const errorData = await mainImgRes.json().catch(() => ({}));
							console.warn(\`فشل في إرسال الصورة الرئيسية لـ "\${item.title}": \${errorData.message || mainImgRes.statusText}\`);
							addStatusMessage(\`تحذير: فشل في إرسال الصورة الرئيسية لـ "\${item.title}"\`, "warning");
					}
					await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay after media
				} catch (error) {
					addStatusMessage(
						\`تحذير: فشل في إرسال الصورة الرئيسية لـ "\${item.title}": \${error.message}\`,
						"warning",
					);
				}
			}

			// Process additional images (from multiple possible locations in item object)
			const imagesToSend = new Set();
			const addImagesToSet = (imgArray) => {
				if (Array.isArray(imgArray)) {
					imgArray.forEach(imgUrl => {
						if (imgUrl && typeof imgUrl === 'string') imagesToSend.add(imgUrl);
					});
				} else if (imgUrl && typeof imgUrl === 'string') { // Handle if it's a single string
					imagesToSend.add(imgUrl)
				}
			};

			addImagesToSet(item.additionalImages); // Common array name
			if (item.additionalData) {
				addImagesToSet(item.additionalData.images);
				addImagesToSet(item.additionalData.additionalImages);
				addImagesToSet(item.additionalData.image_links); // Another possible name
				addImagesToSet(item.additionalData.imageLinks); 
			}
			
			let sentImageCount = 0;
			for (const imgUrl of Array.from(imagesToSend)) {
				if (sentImageCount >= 4) break; // Limit to 4 additional images (total 5 with main)
				if (imgUrl === item.image) continue; // Skip if it's the same as main image

				try {
					const addImgRes = await fetch(
						\`\${TG_API_BASE_URL}/telegram/sendMedia\`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								username: recipientIdentifier,
								mediaUrl: imgUrl,
								caption: "", // No caption for additional images to keep it clean
							}),
						},
					);
					if (!addImgRes.ok) {
							const errorData = await addImgRes.json().catch(() => ({}));
							console.warn(\`فشل في إرسال صورة إضافية لـ "\${item.title}": \${errorData.message || addImgRes.statusText}\`);
					} else {
						sentImageCount++;
					}
					await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay after media
				} catch (error) {
					console.warn(
						\`Failed to send additional image for "\${item.title}":\`,
						error,
					);
				}
			}
			

			// Add delay between items if not the last one
			if (index < tgCartItems.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Main delay between full items
			}
		}

		hideLoading(); // Hide loading overlay
		addStatusMessage("تم إرسال جميع العناصر بنجاح! ✨", "success");
	} catch (error) {
		hideLoading(); // Hide loading overlay
		addStatusMessage(\`فشل في إرسال العناصر: \${error.message}\`, "error");
	}
}

// Add listener for messages from background script or other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "telegramSendStatus") {
		addStatusMessage(message.message, message.type);
		if (message.allSent) {
			const sendBtn = document.getElementById("send-to-telegram");
			if (sendBtn) sendBtn.disabled = false; 
		}
		sendResponse({status: "received"}); // Acknowledge
	} else if (message.action === "cartUpdated") { // Listen for cart updates
		tgLoadCartItems(); // Reload cart items and update UI
		sendResponse({status: "cart_reloaded"});
	}
	return true; // Keep channel open for async response if needed by other listeners
});