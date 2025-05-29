/**
 * IAAI Cart Extension
 * Handles website interaction and data extraction
 */

// Global variables
let config = null;
let currentDomain = "";

// القائمة التي ستخزن الإشعارات المعلقة
let pendingNotifications = [];
let isShowingNotification = false;

/**
 * Main initialization function
 */
function initialize() {
	try {
		// Determine current domain
		currentDomain = getCurrentDomain();

		// Load configuration
		loadConfig()
			.then(() => {
				console.log(`IAAI Cart: Initialized for ${currentDomain}`);

				// إضافة زر التحديث في رأس الصفحة
				addRefreshButton();

				// استدعاء الدالة المناسبة بناءً على النطاق
				if (currentDomain === "iaai.com") {
					iaai();
				} else if (currentDomain === "ca.iaai.com") {
					ca_iaai();
				} else {
					// استخدام النطاق الافتراضي
					defaultSite();
				}
			})
			.catch((error) => {
				console.error("IAAI Cart: Configuration error", error);
				if (
					error.message &&
					error.message.includes("Extension context invalidated")
				) {
					// امتداد تم إلغاء تفعيله أو إعادة تحميله
					console.log(
						"Extension context invalidated, no action needed",
					);
				}
			});
	} catch (error) {
		console.error("IAAI Cart: Initialization error", error);
	}
}

/**
 * Get current domain from URL
 * @returns {string} Domain name
 */
function getCurrentDomain() {
	const url = window.location.href;
	if (url.includes("ca.iaai.com")) return "ca.iaai.com";
	return "iaai.com";
}

/**
 * Load configuration from JSON file
 * @returns {Promise} Configuration loading promise
 */
async function loadConfig() {
	try {
		// تحقق من صلاحية سياق الامتداد أولا
		if (!chrome.runtime || !chrome.runtime.getURL) {
			throw new Error("Extension context invalidated");
		}

		const response = await fetch(chrome.runtime.getURL("selectors.json"));
		if (!response.ok) {
			throw new Error(`Failed to load selectors: ${response.status}`);
		}

		config = await response.json();
		return config;
	} catch (error) {
		console.error("Error loading selectors:", error);

		// إذا فشل تحميل التكوين، استخدم تكوينًا افتراضيًا بسيطًا
		if (!config) {
			config = {
				domains: {
					default: {
						selectors: {
							itemRows: { selector: "tr, .item" },
							title: { selector: "a, h4" },
							price: { selector: "span" },
							image: { selector: "img" },
						},
					},
				},
			};
		}

		throw error;
	}
}

/**
 * Get configuration for current domain
 * @returns {Object} Domain configuration
 */
function getDomainConfig() {
	if (!config || !config.domains) return null;
	return config.domains[currentDomain] || config.domains.default;
}

/**
 * Handle IAAI.com (US) website
 */
function iaai() {
	console.log("Initializing for IAAI.com (US)");
	setupObserver();
	injectIAAIButtons();
}

/**
 * Handle CA.IAAI.com (Canadian) website
 */
function ca_iaai() {
	console.log("Initializing for CA.IAAI.com (Canadian)");
	setupObserver();
	injectCanadianButtons();
}

/**
 * Handle default site implementation
 */
function defaultSite() {
	console.log("Using default site implementation");
	setupObserver();
	injectButtons();
}

/**
 * Create and set up mutation observer
 */
function setupObserver() {
	const observer = new MutationObserver(() => {
		if (currentDomain === "iaai.com") {
			injectIAAIButtons();
		} else if (currentDomain === "ca.iaai.com") {
			injectCanadianButtons();
		} else {
			injectButtons();
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

/**
 * Inject add buttons into items on IAAI.com (US)
 */
function injectIAAIButtons() {
	const domainConfig = getDomainConfig();
	if (!domainConfig) return;

	// Get item rows using selector from config
	const rowSelector = domainConfig.selectors.itemRows.selector;
	const rows = document.querySelectorAll(rowSelector);

	console.log(`Found ${rows.length} rows for domain ${currentDomain}`);

	// جلب حالة السلة أولاً
	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		rows.forEach((row) => {
			// Only add button if it doesn't exist
			if (!row.querySelector("[data-iaai-cart-btn]")) {
				const button = createAddButton();

				// Insert button as first child
				if (row.firstChild) {
					row.insertBefore(button, row.firstChild);
				} else {
					row.appendChild(button);
				}

				// تحديث حالة الزر فوراً بعد إضافته
				const itemInfo = extractItemInfo(row);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML = '<i class="fas fa-check"></i>';
					button.style.backgroundColor = "#27ae60";
					button.title = "تمت الإضافة إلى السلة";
				}

				// Apply domain-specific styles
				if (domainConfig.styles && domainConfig.styles.buttonPosition) {
					const btnStyles = domainConfig.styles.buttonPosition;
					for (const [property, value] of Object.entries(btnStyles)) {
						row.style[property] = value;
					}
				}
			}
		});
	});
}

/**
 * Inject add buttons into items on CA.IAAI.com (Canadian)
 */
function injectCanadianButtons() {
	const domainConfig = getDomainConfig();
	if (!domainConfig) return;

	const rowSelector = domainConfig.selectors.itemRows.selector;
	const rows = document.querySelectorAll(rowSelector);

	console.log(`Found ${rows.length} even rows for Canadian domain`);

	// جلب حالة السلة أولاً
	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		rows.forEach((evenRow) => {
			const oddRow = evenRow.previousElementSibling;
			if (!oddRow) {
				console.warn("No matching odd row found for even row");
				return;
			}

			if (!evenRow.querySelector("[data-iaai-cart-btn]")) {
				const button = createAddButton();

				// Canadian site specific styles...
				button.style.position = "absolute";
				button.style.top = "50%";
				button.style.left = "10px";
				button.style.transform = "translateY(-50%)";
				button.style.zIndex = "1000";
				evenRow.style.position = "relative";
				button.style.width = "30px";
				button.style.height = "30px";
				button.style.fontSize = "16px";
				button.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
				button.style.backgroundColor = "#3498db";

				if (evenRow.firstChild) {
					evenRow.insertBefore(button, evenRow.firstChild);
				} else {
					evenRow.appendChild(button);
				}

				// تحديث حالة الزر فوراً بعد إضافته
				const itemInfo = extractItemInfo(evenRow);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML = '<i class="fas fa-check"></i>';
					button.style.backgroundColor = "#27ae60";
					button.title = "تمت الإضافة إلى السلة";
				}

				// Row highlighting events...
				const highlightRows = () => {
					oddRow.style.backgroundColor = "#f5f5f5";
					evenRow.style.backgroundColor = "#f5f5f5";
				};

				const resetRowHighlight = () => {
					oddRow.style.backgroundColor = "";
					evenRow.style.backgroundColor = "";
				};

				oddRow.addEventListener("mouseenter", highlightRows);
				oddRow.addEventListener("mouseleave", resetRowHighlight);
				evenRow.addEventListener("mouseenter", highlightRows);
				evenRow.addEventListener("mouseleave", resetRowHighlight);

				evenRow.style.cursor = "pointer";
				oddRow.style.cursor = "pointer";
				evenRow.title = "انقر على + لإضافة العنصر إلى السلة";

				if (domainConfig.styles && domainConfig.styles.buttonPosition) {
					const btnStyles = domainConfig.styles.buttonPosition;
					for (const [property, value] of Object.entries(btnStyles)) {
						if (property !== "display") {
							button.style[property] = value;
						}
					}
				}
			}
		});
	});
}

/**
 * Legacy function to inject buttons into items
 */
function injectButtons() {
	const domainConfig = getDomainConfig();
	if (!domainConfig) return;

	const rowSelector = domainConfig.selectors.itemRows.selector;
	const rows = document.querySelectorAll(rowSelector);

	console.log(`Found ${rows.length} rows for domain ${currentDomain}`);

	// جلب حالة السلة أولاً
	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		rows.forEach((row) => {
			if (!row.querySelector("[data-iaai-cart-btn]")) {
				const button = createAddButton();

				if (currentDomain === "ca.iaai.com") {
					button.style.position = "absolute";
					button.style.top = "50%";
					button.style.left = "10px";
					button.style.transform = "translateY(-50%)";
					button.style.zIndex = "1000";
					row.style.position = "relative";
				}

				if (row.firstChild) {
					row.insertBefore(button, row.firstChild);
				} else {
					row.appendChild(button);
				}

				// تحديث حالة الزر فوراً بعد إضافته
				const itemInfo = extractItemInfo(row);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML = '<i class="fas fa-check"></i>';
					button.style.backgroundColor = "#27ae60";
					button.title = "تمت الإضافة إلى السلة";
				}

				if (domainConfig.styles && domainConfig.styles.buttonPosition) {
					const btnStyles = domainConfig.styles.buttonPosition;
					for (const [property, value] of Object.entries(btnStyles)) {
						if (
							property === "display" &&
							currentDomain === "ca.iaai.com"
						) {
							continue;
						}
						button.style[property] = value;
					}
				}
			}
		});
	});
}

/**
 * Create a button to add items to cart
 * @returns {HTMLElement} Button element
 */
function createAddButton() {
	const button = document.createElement("button");
	button.setAttribute("data-iaai-cart-btn", "");
	button.className = "iaai-cart-btn";
	button.innerHTML = '<i class="fas fa-plus"></i>';
	button.title = "إضافة إلى السلة";

	// تأكد من تحميل Font Awesome
	ensureFontAwesome();

	// إضافة نمط CSS للزر
	const style = document.createElement("style");
	style.textContent = `
		.iaai-cart-btn {
			position: absolute;
			top: 10px;
			right: 10px;
			z-index: 1000;
			width: 35px;
			height: 35px;
			border: none;
			border-radius: 50%;
			background-color: #3498db;
			color: white;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.3s ease;
			box-shadow: 0 2px 5px rgba(0,0,0,0.2);
		}
		
		.iaai-cart-btn:hover:not(:disabled) {
			transform: scale(1.1);
			box-shadow: 0 4px 8px rgba(0,0,0,0.2);
		}
		
		.iaai-cart-btn.in-cart {
			background-color: #27ae60 !important;
			cursor: not-allowed;
			pointer-events: none;
		}
		
		.iaai-cart-btn.in-cart:hover {
			transform: none;
			box-shadow: 0 2px 5px rgba(0,0,0,0.2);
		}
		
		.iaai-cart-btn i {
			font-size: 16px;
		}

		.iaai-cart-btn:disabled {
			opacity: 1 !important;
			background-color: #27ae60 !important;
			cursor: not-allowed;
			pointer-events: none;
		}
	`;
	document.head.appendChild(style);

	// إضافة معالج النقر
	button.addEventListener("click", async (e) => {
		e.preventDefault();
		e.stopPropagation();

		// تجاهل النقر إذا كان الزر معطلاً أو تمت إضافته بالفعل
		if (button.disabled || button.classList.contains("in-cart")) {
			return;
		}

		const row = button.closest(
			getDomainConfig().selectors.itemRows.selector,
		);
		if (!row) return;

		const item = extractItemInfo(row);
		if (!item) return;

		// تغيير حالة الزر فوراً
		const updateButtonState = (isInCart) => {
			button.disabled = isInCart;
			button.classList.toggle("in-cart", isInCart);
			button.innerHTML = isInCart
				? '<i class="fas fa-check"></i>'
				: '<i class="fas fa-plus"></i>';
			button.style.backgroundColor = isInCart ? "#27ae60" : "#3498db";
			button.title = isInCart
				? "تمت الإضافة إلى السلة"
				: "إضافة إلى السلة";
		};

		// تحديث حالة الزر قبل إضافة العنصر
		updateButtonState(true);

		try {
			await addToCart(item);
			// تأكيد حالة الزر بعد نجاح الإضافة
			updateButtonState(true);
		} catch (error) {
			// إعادة الزر إلى حالته الأصلية في حالة الخطأ
			updateButtonState(false);
			console.error("Error adding to cart:", error);
		}
	});

	return button;
}

/**
 * Make sure Font Awesome is loaded
 */
function ensureFontAwesome() {
	if (!document.querySelector('link[href*="font-awesome"]')) {
		const fontAwesome = document.createElement("link");
		fontAwesome.rel = "stylesheet";
		fontAwesome.href =
			"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
		document.head.appendChild(fontAwesome);
	}

	// إضافة خط Cairo العربي إذا لم يكن موجودًا
	if (!document.querySelector('link[href*="Cairo"]')) {
		const cairoFont = document.createElement("link");
		cairoFont.rel = "stylesheet";
		cairoFont.href =
			"https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap";
		document.head.appendChild(cairoFont);
	}
}

/**
 * Extract information from an item row
 * @param {HTMLElement} row The row element
 * @returns {Object} Item information
 */
function extractItemInfo(row) {
	// استدعاء دالة استخراج معلومات العنصر المناسبة بناءً على النطاق
	if (currentDomain === "iaai.com") {
		return extractIAAIItemInfo(row);
	} else if (currentDomain === "ca.iaai.com") {
		return extractCanadianItemInfo(row);
	} else {
		return extractDefaultItemInfo(row);
	}
}

/**
 * Extract information from an item on IAAI.com (US)
 * @param {HTMLElement} row The row element
 * @returns {Object} Item information
 */
function extractIAAIItemInfo(row) {
	const domainConfig = getDomainConfig();
	if (!domainConfig) return createDefaultItem();

	// Generate unique ID
	const itemId = row.getAttribute("data-id") || `item-${Date.now()}`;

	// Get title and href
	const titleInfo = getElementContent(row, domainConfig.selectors.title);
	const title = titleInfo.text;
	let href = titleInfo.href;

	// Find href from any link if not found
	if (!href) {
		const anyLink = row.querySelector("a[href]");
		if (anyLink) href = anyLink.href;
	}

	// Get price
	let price = findIAAIPrice(row, domainConfig.selectors.price);

	// Get image
	const imgElement = row.querySelector(domainConfig.selectors.image.selector);
	const imgSrc =
		imgElement?.src || "https://via.placeholder.com/60?text=IAAI";

	return {
		id: itemId,
		title: title,
		price: price,
		image: imgSrc,
		href: href,
		timestamp: Date.now(),
	};
}

/**
 * Extract information from an item on CA.IAAI.com (Canadian)
 * @param {HTMLElement} row The row element
 * @returns {Object} Item information
 */
function extractCanadianItemInfo(row) {
	const domainConfig = getDomainConfig();
	if (!domainConfig) return createDefaultItem();

	// تسجيل بيانات الصفوف للمساعدة في التصحيح
	console.log("Extracting info from Canadian row:", row);

	// Generate unique ID
	const itemId = row.getAttribute("data-id") || `item-${Date.now()}`;

	// هنا نحصل على الصف الفردي (odd row) الذي يحتوي على العنوان
	const oddRow = row.previousElementSibling;
	if (!oddRow) {
		console.warn("No odd row found for Canadian item:", row);
		return createDefaultItem();
	}

	console.log("Found odd row for Canadian item:", oddRow);

	// استخراج العنوان من أول خلية TD في الصف الفردي
	const firstTdInOddRow = oddRow.querySelector("td:first-child");
	let title = "Unknown Item";
	let href = "";

	if (firstTdInOddRow) {
		// البحث عن الرابط والعنوان داخل الخلية الأولى
		const titleLink = firstTdInOddRow.querySelector("a");
		if (titleLink) {
			title = titleLink.textContent.trim();
			href = titleLink.href;
		} else {
			title = firstTdInOddRow.textContent.trim();
		}
		console.log("Extracted title from first TD in odd row:", title);
	} else {
		console.warn("No first TD found in odd row");
	}

	// استخراج السعر من الخلية الثانية في الصف الزوجي (الصف الحالي)
	const secondTdInEvenRow = row.querySelector("td:nth-child(2)");
	let price = "N/A";
	if (secondTdInEvenRow) {
		price = secondTdInEvenRow.textContent.trim();
		console.log("Extracted price from second TD in even row:", price);
	} else {
		console.warn("No second TD found in even row");
	}

	// استخراج الصورة من الصف الفردي
	const imgElement = oddRow.querySelector("img");
	let imgSrc = "https://via.placeholder.com/60?text=IAAI";
	if (imgElement && imgElement.src) {
		imgSrc = imgElement.src;
		console.log("Found image in odd row:", imgSrc);
	}

	const itemInfo = {
		id: itemId,
		title: title || "Unknown Item",
		price: price,
		image: imgSrc,
		href: href || "",
		timestamp: Date.now(),
	};

	// تسجيل المعلومات النهائية التي تم استخراجها
	console.log("Extracted Canadian item info:", itemInfo);
	return itemInfo;
}

/**
 * Extract information from an item on default/unknown sites
 * @param {HTMLElement} row The row element
 * @returns {Object} Item information
 */
function extractDefaultItemInfo(row) {
	const domainConfig = getDomainConfig();
	if (!domainConfig) return createDefaultItem();

	// Generate unique ID
	const itemId = row.getAttribute("data-id") || `item-${Date.now()}`;

	// Get title and href
	const titleInfo = getElementContent(row, domainConfig.selectors.title);
	const title = titleInfo.text;
	let href = titleInfo.href;

	// Find href from any link if not found
	if (!href) {
		const anyLink = row.querySelector("a[href]");
		if (anyLink) href = anyLink.href;
	}

	// Get price
	let price = findPrice(row, domainConfig.selectors.price);

	// Get image
	const imgElement = row.querySelector(domainConfig.selectors.image.selector);
	const imgSrc =
		imgElement?.src || "https://via.placeholder.com/60?text=IAAI";

	return {
		id: itemId,
		title: title,
		price: price,
		image: imgSrc,
		href: href,
		timestamp: Date.now(),
	};
}

/**
 * Get text and href from an element using selector
 * @param {HTMLElement} container The container element
 * @param {Object} selectorConfig Configuration for the selector
 * @returns {Object} Element content (text and href)
 */
function getElementContent(container, selectorConfig) {
	// Try main selector
	let element = container.querySelector(selectorConfig.selector);

	// Try fallbacks if available
	if (!element && selectorConfig.fallbacks) {
		for (const fallback of selectorConfig.fallbacks) {
			element = container.querySelector(fallback);
			if (element) break;
		}
	}

	// Default values if element not found
	const text = element?.textContent?.trim() || "";
	const href = element?.href || "";

	return { text, href };
}

/**
 * Find price for IAAI.com (US) site
 * @param {HTMLElement} row The row element
 * @param {Object} priceConfig Price selector configuration
 * @returns {string} Formatted price
 */
function findIAAIPrice(row, priceConfig) {
	// Try main price selector on row
	let priceElement = row.querySelector(priceConfig.selector);

	// Try document selector for certain patterns
	if (!priceElement && priceConfig.selector.includes("div:nth-child")) {
		priceElement = document.querySelector(priceConfig.selector);
	}

	// Try fallbacks
	if (!priceElement && priceConfig.fallbacks) {
		for (const fallback of priceConfig.fallbacks) {
			if (fallback.includes(":contains(")) {
				continue;
			}
			priceElement = row.querySelector(fallback);
			if (priceElement) break;
		}
	}

	// Extract and format price
	if (priceElement && priceElement.textContent) {
		const rawText = priceElement.textContent.trim();

		// Find price pattern in text
		const priceMatch = rawText.match(/[\$\£\€]?\s*[\d,]+\.?\d*/);
		if (priceMatch) return priceMatch[0];

		return rawText;
	}

	return "N/A";
}

/**
 * Find price using advanced methods - general function
 * @param {HTMLElement} row The row element
 * @param {Object} priceConfig Price selector configuration
 * @returns {string} Formatted price
 */
function findPrice(row, priceConfig) {
	// Special case for Canadian site - price is in the previous sibling (odd row)
	if (currentDomain === "ca.iaai.com") {
		const domainConfig = getDomainConfig();
		if (domainConfig && domainConfig.selectors.priceRow) {
			// Get the odd row (previous sibling of the even row)
			const priceRow = row.previousElementSibling;
			if (priceRow) {
				// Look for price in the odd row
				let priceElement = null;

				// Try each price selector in the odd row
				if (priceConfig.selector) {
					priceElement = priceRow.querySelector(priceConfig.selector);
				}

				// Try fallbacks
				if (!priceElement && priceConfig.fallbacks) {
					for (const fallback of priceConfig.fallbacks) {
						if (fallback.includes(":contains(")) {
							continue;
						}
						priceElement = priceRow.querySelector(fallback);
						if (priceElement) break;
					}
				}

				// If still not found, try searching for dollar sign
				if (!priceElement) {
					const allCells = priceRow.querySelectorAll("td");
					for (const cell of allCells) {
						if (
							cell.textContent &&
							(cell.textContent.includes("$") ||
								/\d+\.\d{2}/.test(cell.textContent))
						) {
							priceElement = cell;
							break;
						}
					}
				}

				// Extract and format price if found
				if (priceElement && priceElement.textContent) {
					const rawText = priceElement.textContent.trim();
					console.log(
						"Canadian site: Raw price text from odd row:",
						rawText,
					);

					// Find price pattern in text
					const priceMatch = rawText.match(
						/[\$\£\€]?\s*[\d,]+\.?\d*/,
					);
					if (priceMatch) return priceMatch[0];

					return rawText;
				}
			}
		}

		// Fallback if odd row approach fails
		return findCanadianPrice(row) || "N/A";
	}

	// Standard approach for other sites
	// Try main price selector on row
	let priceElement = row.querySelector(priceConfig.selector);

	// Try document selector for certain patterns
	if (!priceElement && priceConfig.selector.includes("div:nth-child")) {
		priceElement = document.querySelector(priceConfig.selector);
	}

	// Try fallbacks
	if (!priceElement && priceConfig.fallbacks) {
		for (const fallback of priceConfig.fallbacks) {
			if (fallback.includes(":contains(")) {
				continue;
			}
			priceElement = row.querySelector(fallback);
			if (priceElement) break;
		}
	}

	// Extract and format price
	if (priceElement && priceElement.textContent) {
		const rawText = priceElement.textContent.trim();

		// Find price pattern in text
		const priceMatch = rawText.match(/[\$\£\€]?\s*[\d,]+\.?\d*/);
		if (priceMatch) return priceMatch[0];

		return rawText;
	}

	return "N/A";
}

/**
 * Special price finder for Canadian site
 * @param {HTMLElement} row The row element (even row)
 * @returns {string|null} Price text or null
 */
function findCanadianPrice(row) {
	// If we're on an even row, check its previous sibling (odd row)
	const priceRow = row.previousElementSibling;

	if (!priceRow) return null;

	console.log("Looking for price in Canadian odd row");

	// First try columns that typically contain price
	// في الموقع الكندي، السعر عادة يكون في أعمدة محددة في الصف الفردي
	const typicalPriceColumns = [6, 5, 7, 4];

	// Check the typical price columns first
	for (const colNum of typicalPriceColumns) {
		const cell = priceRow.querySelector(`td:nth-child(${colNum})`);
		if (cell && cell.textContent) {
			const text = cell.textContent.trim();
			if (text.includes("$") || /\d+\.\d{2}/.test(text)) {
				console.log(`Found price in column ${colNum}:`, text);
				return text;
			}
		}
	}

	// If not found, check all cells in the row for dollar signs
	const allCells = priceRow.querySelectorAll("td");
	for (const cell of allCells) {
		if (cell.textContent) {
			const text = cell.textContent.trim();
			if (text.includes("$") || /\d+\.\d{2}/.test(text)) {
				console.log("Found price in cell:", text);
				return text;
			}
		}
	}

	return null;
}

/**
 * Create default item if extraction fails
 * @returns {Object} Default item
 */
function createDefaultItem() {
	return {
		id: `item-${Date.now()}`,
		title: "Unknown Item",
		price: "N/A",
		image: "https://via.placeholder.com/60?text=IAAI",
		href: "",
		timestamp: Date.now(),
	};
}

/**
 * Add item to cart in storage
 * @param {Object} item Item to add
 * @returns {Promise} Promise that resolves when the item is added
 */
function addToCart(item) {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.local.get(["cart"], function (result) {
				if (chrome.runtime.lastError) {
					console.error(
						"Failed to get cart:",
						chrome.runtime.lastError,
					);
					reject(chrome.runtime.lastError);
					return;
				}

				let cart = result.cart || [];

				// تصفية العناصر المكررة بناءً على الرابط
				cart = cart.filter(
					(existingItem) => existingItem.href !== item.href,
				);

				// إضافة العنصر الجديد
				cart.push(item);

				// حفظ السلة المحدثة
				chrome.storage.local.set({ cart }, function () {
					if (chrome.runtime.lastError) {
						console.error(
							"Failed to save cart:",
							chrome.runtime.lastError,
						);
						reject(chrome.runtime.lastError);
						return;
					}

					// عرض إشعار نجاح
					showNotification("تمت إضافة المركبة إلى السلة");
					resolve();
				});
			});
		} catch (error) {
			console.error("Extension context may be invalidated:", error);
			showNotification("حدث خطأ. يرجى تحديث الصفحة.");
			reject(error);
		}
	});
}

/**
 * Show notification to user
 * @param {string} message Message to display
 */
function showNotification(message) {
	// إضافة الإشعار إلى قائمة الانتظار
	pendingNotifications.push(message);

	// إذا لم تكن هناك إشعارات تُعرض حالياً، ابدأ عرض الإشعارات
	if (!isShowingNotification) {
		processNextNotification();
	}
}

/**
 * معالجة الإشعار التالي في قائمة الانتظار
 */
function processNextNotification() {
	// إذا لم تكن هناك إشعارات معلقة، انتهِ
	if (pendingNotifications.length === 0) {
		isShowingNotification = false;
		return;
	}

	isShowingNotification = true;
	const message = pendingNotifications.shift();

	const notification = document.createElement("div");
	notification.textContent = message;
	notification.style.cssText = `
		position: fixed;
		top: 20px;
		left: 20px;
		background-color: #3a6e9e;
		color: white;
		padding: 10px 15px;
		border-radius: 4px;
		z-index: 10000;
		opacity: 0;
		font-family: Cairo, Arial, sans-serif;
		font-size: 14px;
		box-shadow: 0 2px 10px rgba(0,0,0,0.2);
		transition: opacity 0.3s ease, transform 0.3s ease;
		transform: translateY(-10px);
		direction: rtl;
		text-align: right;
	`;

	document.body.appendChild(notification);

	// Fade in
	setTimeout(() => {
		notification.style.opacity = "1";
		notification.style.transform = "translateY(0)";
	}, 10);

	// Fade out and remove
	setTimeout(() => {
		notification.style.opacity = "0";
		notification.style.transform = "translateY(-10px)";
		setTimeout(() => {
			document.body.removeChild(notification);
			// عرض الإشعار التالي
			processNextNotification();
		}, 300);
	}, 2000);
}

/**
 * إضافة زر التحديث في رأس الصفحة
 */
function addRefreshButton() {
	// البحث عن عنصر الرأس المناسب
	let headerElement =
		document.querySelector("header") ||
		document.querySelector(".header") ||
		document.querySelector(".navbar") ||
		document.querySelector("#header");

	// إذا لم يوجد عنصر رأس محدد، ننشئ واحداً جديداً في أعلى الصفحة
	if (!headerElement) {
		headerElement = document.createElement("div");
		headerElement.className = "iaai-cart-header";
		headerElement.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			background-color: #3a6e9e;
			color: white;
			padding: 10px 15px;
			z-index: 9999;
			display: flex;
			justify-content: space-between;
			align-items: center;
			box-shadow: 0 2px 5px rgba(0,0,0,0.2);
			direction: rtl;
			font-family: Cairo, sans-serif;
		`;
		document.body.insertBefore(headerElement, document.body.firstChild);

		// إضافة العنوان
		const title = document.createElement("h1");
		title.textContent = "عربة IAAI";
		title.style.cssText = `
			margin: 0;
			font-size: 18px;
			font-weight: 500;
			text-align: right;
		`;
		headerElement.appendChild(title);
	}

	// إنشاء زر التحديث
	const refreshButton = document.createElement("button");
	refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> تحديث';
	refreshButton.style.cssText = `
		background-color: transparent;
		border: 1px solid white;
		color: white;
		padding: 5px 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		display: flex;
		align-items: center;
		gap: 5px;
		font-family: Cairo, sans-serif;
	`;

	// إضافة أيقونة Font Awesome إذا لم تكن موجودة بالفعل
	ensureFontAwesome();

	// إضافة حدث النقر لإعادة تحميل الصفحة
	refreshButton.addEventListener("click", () => {
		window.location.reload();
	});

	// أضف تأثير تدوير عند تحويم الماوس
	refreshButton.addEventListener("mouseenter", () => {
		const icon = refreshButton.querySelector("i");
		if (icon) {
			icon.style.transition = "transform 0.5s";
			icon.style.transform = "rotate(180deg)";
		}
	});

	refreshButton.addEventListener("mouseleave", () => {
		const icon = refreshButton.querySelector("i");
		if (icon) {
			icon.style.transform = "rotate(0)";
		}
	});

	// إضافة الزر للرأس
	headerElement.appendChild(refreshButton);
}

/**
 * Update all add buttons based on cart contents
 */
function updateAddButtons() {
	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		document.querySelectorAll("[data-iaai-cart-btn]").forEach((button) => {
			const row = button.closest(
				getDomainConfig().selectors.itemRows.selector,
			);
			if (!row) return;

			const itemInfo = extractItemInfo(row);
			if (!itemInfo) return;

			const isInCart = cartHrefs.has(itemInfo.href);

			button.disabled = isInCart;
			button.classList.toggle("in-cart", isInCart);
			button.innerHTML = isInCart
				? '<i class="fas fa-check"></i>'
				: '<i class="fas fa-plus"></i>';
			button.style.backgroundColor = isInCart ? "#27ae60" : "#3498db";
			button.title = isInCart
				? "تمت الإضافة إلى السلة"
				: "إضافة إلى السلة";
		});
	});
}

// إضافة مستمع للتغييرات في التخزين
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === "local" && changes.cart) {
		updateAddButtons();
	}
});

// تحديث الأزرار عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", updateAddButtons);

// Start the extension
initialize();
