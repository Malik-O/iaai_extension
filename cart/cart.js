document.addEventListener("DOMContentLoaded", () => {
	const cartItems = document.getElementById("cart-items");
	const cartCount = document.getElementById("cart-count");
	const loadingSpinner = document.getElementById("loading-spinner");
	const clearCartBtn = document.getElementById("clear-cart");
	const sendToBtn = document.getElementById("send-to");

	// Establish a connection to the background script
	const port = chrome.runtime.connect({ name: "popup" });

	// Function to render cart items
	function renderCartItems(items) {
		if (items.length === 0) {
			cartItems.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-cart"></i>
                    <p>سلة المركبات فارغة</p>
                    <p class="sub-message">
                        أضف مركبات بالنقر على زر + في قوائم IAAI
                    </p>
                </div>
            `;

			// Disable send button if cart is empty
			sendToBtn.disabled = true;
		} else {
			cartItems.innerHTML = "";

			items.forEach((item) => {
				const itemElement = document.createElement("div");
				itemElement.classList.add("cart-item");
				itemElement.dataset.id = item.id;

				// Create a fallback image URL in case the provided one doesn't work
				const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
					item.title,
				)}&background=3498db&color=fff&size=60`;

				itemElement.innerHTML = `
                    <div class="cart-item-image-container">
                        <img src="${item.image || fallbackImage}" 
                             alt="${item.title}" 
                             class="cart-item-image"
                             onerror="this.onerror=null; this.src='${fallbackImage}'">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-title">
                            <a href="${
								item.href
							}" target="_blank" rel="noopener noreferrer">${
					item.title
				}</a>
                        </div>
                        <div class="cart-item-badges">
                            ${renderSendBadges(item)}
                        </div>
                        <div class="cart-item-meta">
                            <div class="cart-item-price">${item.price}</div>
                        </div>
                    </div>
                    <button class="remove-item" data-id="${
						item.id
					}" title="إزالة من السلة">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;

				cartItems.appendChild(itemElement);
			});

			// Add event listeners to remove buttons
			document.querySelectorAll(".remove-item").forEach((button) => {
				button.addEventListener("click", (e) => {
					const id = e.currentTarget.dataset.id;
					removeItemFromCart(id);
				});
			});

			// تمكين زر الإرسال إذا كانت السلة تحتوي على عناصر
			sendToBtn.disabled = false;
		}

		// Update cart count
		cartCount.textContent = items.length;
	}

	// دالة لعرض الشارات الخاصة بالإرسال عبر تيليجرام وواتساب
	function renderSendBadges(item) {
		let badges = "";
		// تيليجرام
		if (
			Array.isArray(item["sent-via-telegram"]) &&
			item["sent-via-telegram"].length > 0
		) {
			item["sent-via-telegram"].forEach((e) => {
				if (e.username) {
					const dateStr = e.time ? formatDateTime(e.time) : "";
					badges += `
						<span class="send-badge tg-badge badge-tooltip-container">
							<i class="fab fa-telegram-plane"></i> <span class='badge-number'>${e.username}</span>
							<span class="badge-tooltip">${dateStr}</span>
						</span>
					`;
				}
			});
		}
		// واتساب
		if (
			Array.isArray(item["sent-via-whatsapp"]) &&
			item["sent-via-whatsapp"].length > 0
		) {
			item["sent-via-whatsapp"].forEach((e) => {
				if (e.username) {
					const dateStr = e.time ? formatDateTime(e.time) : "";
					badges += `
						<span class="send-badge wa-badge badge-tooltip-container">
							<i class="fab fa-whatsapp"></i> <span class='badge-number'>${e.username}</span>
							<span class="badge-tooltip">${dateStr}</span>
						</span>
					`;
				}
			});
		}
		return badges;
	}

	// دالة لتنسيق التاريخ والوقت بشكل جميل
	function formatDateTime(dateString) {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return "";
		// مثال: 2024-06-07 14:30
		const y = date.getFullYear();
		const m = (date.getMonth() + 1).toString().padStart(2, "0");
		const d = date.getDate().toString().padStart(2, "0");
		const h = date.getHours().toString().padStart(2, "0");
		const min = date.getMinutes().toString().padStart(2, "0");
		return `${y}-${m}-${d} ${h}:${min}`;
	}

	// Function to remove item from cart
	function removeItemFromCart(id) {
		const updatedItems = currentCartItems.filter((item) => item.id != id);
		currentCartItems = updatedItems;
		renderCartItems(updatedItems);

		// Save to storage
		chrome.storage.local.set({ cart: updatedItems });
	}

	// Function to clear cart
	function clearCart() {
		currentCartItems = [];
		renderCartItems([]);

		// Save to storage
		chrome.storage.local.set({ cart: [] });
	}

	// Load data from storage
	let currentCartItems = [];

	function loadCartItems() {
		loadingSpinner.style.display = "flex";
		cartItems.style.display = "none";

		// Load from Chrome storage
		chrome.storage.local.get(["cart"], (result) => {
			currentCartItems = result.cart || [];
			renderCartItems(currentCartItems);

			loadingSpinner.style.display = "none";
			cartItems.style.display = "block";
		});
	}

	// Event listeners
	clearCartBtn.addEventListener("click", clearCart);

	sendToBtn.addEventListener("click", () => {
		if (currentCartItems.length === 0) {
			alert("سلة المركبات فارغة. الرجاء إضافة مركبات قبل الإرسال.");
			return;
		}

		// Navigate to the chatter page (WhatsApp integration)
		window.location.href = "../chatter/chatter.html";
	});

	// Load cart items when popup opens
	loadCartItems();
});
