// inject-navbar.js
(async function injectNavbar() {
	const placeholder = document.getElementById("navbar-placeholder");
	if (!placeholder) return;
	try {
		const resp = await fetch("../components/navbar.html");
		if (!resp.ok) throw new Error("Navbar not found");
		const html = await resp.text();
		placeholder.innerHTML = html;
		// تفعيل العنصر النشط حسب الصفحة
		const path = window.location.pathname;
		if (path.includes("/cart/")) {
			document.getElementById("nav-cart")?.classList.add("active");
		} else if (path.includes("/chatter/")) {
			document.getElementById("nav-whatsapp")?.classList.add("active");
		} else if (path.includes("/telegram/")) {
			document.getElementById("nav-telegram")?.classList.add("active");
		}

		// Spinner logic for WhatsApp/Telegram processing (كل خدمة بشكل مستقل)
		function showProcessingSpinner(service) {
			const iconSelector =
				service === "whatsapp"
					? ".fab.fa-whatsapp"
					: ".fab.fa-telegram-plane";
			const icon = placeholder.querySelector(iconSelector);
			if (!icon) return;
			let oldSpinner = icon.parentNode.querySelector(
				".navbar-processing-spinner",
			);
			if (oldSpinner) oldSpinner.remove();
			const spinner = document.createElement("span");
			spinner.className = "navbar-processing-spinner";
			spinner.style.display = "inline-block";
			spinner.style.width = "1.2em";
			spinner.style.height = "1.2em";
			spinner.style.verticalAlign = "middle";
			spinner.style.marginLeft = "2px";
			spinner.style.marginRight = "2px";
			spinner.innerHTML = `<span class="navbar-spinner-circle" style="display:inline-block;width:100%;height:100%;border:2.5px solid #eee;border-top:2.5px solid ${
				service === "whatsapp" ? "#25d366" : "#229ed9"
			};border-radius:50%;animation:navbar-spin 1s ease-out infinite !important;animation-iteration-count:infinite !important;"></span>`;
			icon.style.visibility = "hidden";
			icon.parentNode.insertBefore(spinner, icon);
		}
		function hideProcessingSpinner(service) {
			const iconSelector =
				service === "whatsapp"
					? ".fab.fa-whatsapp"
					: ".fab.fa-telegram-plane";
			const icon = placeholder.querySelector(iconSelector);
			if (!icon) return;
			let oldSpinner = icon.parentNode.querySelector(
				".navbar-processing-spinner",
			);
			if (oldSpinner) oldSpinner.remove();
			icon.style.visibility = "visible";
		}

		// Throttle utility
		function throttle(fn, wait) {
			let lastCall = 0;
			let timeout = null;
			return function throttled(...args) {
				const now = Date.now();
				const remaining = wait - (now - lastCall);
				if (remaining <= 0) {
					if (timeout) {
						clearTimeout(timeout);
						timeout = null;
					}
					lastCall = now;
					fn.apply(this, args);
				} else if (!timeout) {
					timeout = setTimeout(() => {
						lastCall = Date.now();
						timeout = null;
						fn.apply(this, args);
					}, remaining);
				}
			};
		}

		const throttledCheckProcessingFlag = throttle(
			checkProcessingFlag,
			1000,
		);

		function checkProcessingFlag() {
			chrome.storage.local.get(
				["whatsapp_sending_processing", "telegram_sending_processing"],
				(result) => {
					if (result.whatsapp_sending_processing) {
						showProcessingSpinner("whatsapp");
					} else {
						hideProcessingSpinner("whatsapp");
					}
					if (result.telegram_sending_processing) {
						showProcessingSpinner("telegram");
					} else {
						hideProcessingSpinner("telegram");
					}
				},
			);
		}

		// استدعِها مع كل فحص
		function throttledCheckProcessingFlagAndBadge() {
			throttledCheckProcessingFlag();
		}

		chrome.storage.onChanged.addListener((changes, area) => {
			if (
				area === "local" &&
				(changes.whatsapp_sending_processing ||
					changes.telegram_sending_processing)
			) {
				throttledCheckProcessingFlagAndBadge();
			}
		});
		throttledCheckProcessingFlagAndBadge();

		// DOM observer: إذا أُدرجت الأيقونة بعد تحميل الصفحة
		const observer = new MutationObserver(() => {
			throttledCheckProcessingFlagAndBadge();
		});
		observer.observe(placeholder, { childList: true, subtree: true });

		// أضف CSS للسبينر إذا لم يكن موجوداً (مرة واحدة فقط)
		if (!document.getElementById("navbar-spinner-style")) {
			const style = document.createElement("style");
			style.id = "navbar-spinner-style";
			style.textContent = `
			@keyframes navbar-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
			.navbar-spinner-circle {
				animation: navbar-spin 1s ease-out infinite !important;
				animation-iteration-count: infinite !important;
			}
			`;
			document.head.appendChild(style);
		}
	} catch (e) {
		console.warn("Failed to load navbar:", e);
	}
})();
