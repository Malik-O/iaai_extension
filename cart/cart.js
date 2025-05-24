document.addEventListener("DOMContentLoaded", () => {
	const cartItems = document.getElementById("cart-items");
	const cartCount = document.getElementById("cart-count");
	const loadingSpinner = document.getElementById("loading-spinner");
	const clearCartBtn = document.getElementById("clear-cart");
	const sendToBtn = document.getElementById("send-to");
	const scrapeDataBtn = document.getElementById("scrape-data");

	// Track scraping state
	let isScraping = false;

	// Establish a connection to the background script
	const port = chrome.runtime.connect({ name: "popup" });

	// Function to render cart items
	function renderCartItems(items) {
		if (items.length === 0) {
			cartItems.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-cart"></i>
                    <p>عربة التسوق فارغة</p>
                    <p class="sub-message">
                        أضف عناصر بالنقر على زر + في قوائم IAAI
                    </p>
                </div>
            `;

			// Disable send button if cart is empty
			sendToBtn.disabled = true;
			scrapeDataBtn.disabled = true;
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
                        <a href="${
							item.href
						}" class="cart-item-title" data-href="${item.href}">${
					item.title
				}</a>
                        <div class="cart-item-price">${item.price}</div>
                        <div class="item-scrape-status" data-id="${item.id}">
                            ${
								item.scraped
									? `<div class="item-scraped-message">
                                <i class="fas fa-check-circle"></i> تم جمع بيانات إضافية
                            </div>`
									: ""
							}
                        </div>
                    </div>
                    <button class="remove-item" data-id="${item.id}">
                        <i class="fas fa-times"></i>
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

			// Add event listeners to item links
			document.querySelectorAll(".cart-item-title").forEach((link) => {
				link.addEventListener("click", (e) => {
					e.preventDefault();
					const url = e.currentTarget.dataset.href;
					if (url) {
						chrome.tabs.create({ url: url });
					}
				});
			});

			// Enable send button if cart has items
			sendToBtn.disabled = false;
			scrapeDataBtn.disabled = false;
		}

		// Update cart count
		cartCount.textContent = items.length;
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

			// Check scraping status after rendering items
			checkScrapingStatus();
		});
	}

	// Function to check scraping status and update UI
	function checkScrapingStatus() {
		chrome.runtime.sendMessage(
			{ action: "getScrapingStatus" },
			(response) => {
				if (response && response.isScrapingInProgress) {
					// Set scraping in progress state
					isScraping = true;
					scrapeDataBtn.disabled = true;

					// Get state from background script
					const state = response.scrapeState;
					if (state) {
						// Update UI for pending items
						if (
							state.pendingItems &&
							state.pendingItems.length > 0
						) {
							state.pendingItems.forEach((itemId) => {
								updateItemScrapingStatus(itemId, "waiting");
							});
						}

						// Update UI for items being processed
						if (state.processingItems) {
							Object.keys(state.processingItems).forEach(
								(itemId) => {
									const itemStatus =
										state.processingItems[itemId];
									updateItemScrapingStatus(
										itemId,
										itemStatus.status,
										itemStatus.error,
									);
								},
							);
						}
					}
				}
			},
		);
	}

	// Update the UI for a specific item's scraping status
	function updateItemScrapingStatus(itemId, status, errorMsg) {
		const statusElement = document.querySelector(
			`.item-scrape-status[data-id="${itemId}"]`,
		);
		if (!statusElement) return;

		if (status === "waiting") {
			statusElement.innerHTML = `
				<div class="item-loading">
					<div class="spinner"></div>
					<span>في انتظار المعالجة...</span>
				</div>
			`;
		} else if (status === "scraping") {
			statusElement.innerHTML = `
				<div class="item-loading">
					<div class="spinner"></div>
					<span>جاري جمع البيانات...</span>
				</div>
			`;
		} else if (status === "success") {
			statusElement.innerHTML = `
				<div class="item-scraped-message">
					<i class="fas fa-check-circle"></i> تم جمع بيانات إضافية
				</div>
			`;
		} else if (status === "error") {
			statusElement.innerHTML = `
				<div class="item-scrape-error">
					<i class="fas fa-exclamation-circle"></i> فشل في جمع البيانات${
						errorMsg ? `: ${errorMsg}` : ""
					}
				</div>
			`;
		}
	}

	// Function to start scraping data
	function startScraping() {
		if (isScraping || currentCartItems.length === 0) return;

		isScraping = true;
		scrapeDataBtn.disabled = true;

		// Update UI for all items that haven't been scraped yet
		currentCartItems.forEach((item) => {
			if (!item.scraped) {
				const statusElement = document.querySelector(
					`.item-scrape-status[data-id="${item.id}"]`,
				);
				if (statusElement) {
					statusElement.innerHTML = `
						<div class="item-loading">
							<div class="spinner"></div>
							<span>في انتظار المعالجة...</span>
						</div>
					`;
				}
			}
		});

		// Send message to background script to start scraping
		chrome.runtime.sendMessage(
			{
				action: "scrapeData",
				items: currentCartItems,
			},
			(response) => {
				console.log("Scraping started in background:", response);

				if (response && response.status === "no_items") {
					// If no items to scrape, re-enable button
					isScraping = false;
					scrapeDataBtn.disabled = false;
				}
			},
		);
	}

	// Listen for messages from background script
	chrome.runtime.onMessage.addListener((message) => {
		if (message.action === "updateScrapeStatus") {
			const { id, status, error, data } = message;

			// Update UI based on status
			updateItemScrapingStatus(id, status, error);

			// Update local cart items if success
			if (status === "success") {
				const itemIndex = currentCartItems.findIndex(
					(item) => item.id == id,
				);
				if (itemIndex !== -1) {
					currentCartItems[itemIndex].scraped = true;
					currentCartItems[itemIndex].additionalData = data;
				}
			}
		} else if (message.action === "scrapingComplete") {
			// All scraping is complete
			isScraping = false;
			scrapeDataBtn.disabled = false;

			// Refresh cart items from storage
			loadCartItems();
		}
	});

	// Event listeners
	clearCartBtn.addEventListener("click", clearCart);

	sendToBtn.addEventListener("click", () => {
		if (currentCartItems.length === 0) {
			alert("عربة التسوق فارغة. الرجاء إضافة عناصر قبل الإرسال.");
			return;
		}

		// Navigate to the chatter page (WhatsApp integration)
		window.location.href = "../chatter/chatter.html";
	});

	scrapeDataBtn.addEventListener("click", startScraping);

	// Load cart items when popup opens
	loadCartItems();
});
