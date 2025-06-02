/**
 * IAAI Cart Extension
 * Handles website interaction and data extraction
 */

console.log(
	"IAAI Cart: content.js script started execution for",
	window.location.href,
);

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
				} else if (currentDomain === "copart.com") {
					copart();
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
	if (url.includes("copart.com")) return "copart.com";
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
 * Handle Copart.com website
 */
function copart() {
	console.log("IAAI Cart: copart() function called for copart.com"); // Debug log
	setupObserver();
	injectCopartButtons();
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
		} else if (currentDomain === "copart.com") {
			injectCopartButtons();
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

	const rowSelector = domainConfig.selectors.itemRows.selector;
	const rows = document.querySelectorAll(rowSelector);

	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		rows.forEach((row) => {
			const imageCell = row.querySelector(
				".table-cell--image.js-intro-Thumbnail",
			);

			if (imageCell && !imageCell.querySelector("[data-iaai-cart-btn]")) {
				const button = createAddButton();
				imageCell.appendChild(button);

				const itemInfo = extractIAAIItemInfo(row);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML =
						'تمت الإضافة <i class="fas fa-check"></i>';
					button.title = "تمت الإضافة إلى السلة";
				}
			} else if (
				!imageCell &&
				!row.querySelector("[data-iaai-cart-btn]")
			) {
				const button = createAddButton();
				if (row.firstChild) {
					row.insertBefore(button, row.firstChild);
				} else {
					row.appendChild(button);
				}
				const itemInfo = extractIAAIItemInfo(row);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML =
						'تمت الإضافة <i class="fas fa-check"></i>';
					button.title = "تمت الإضافة إلى السلة";
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

	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		rows.forEach((secondRowOfPair) => {
			const actualFirstRow = secondRowOfPair.previousElementSibling;

			if (!actualFirstRow) {
				console.warn(
					"IAAI Cart (Canadian): No previous sibling found for a presumed second row. Skipping.",
					secondRowOfPair,
				);
				return;
			}

			const imageCell = actualFirstRow.querySelector("td:nth-child(2)");

			if (imageCell && !imageCell.querySelector("[data-iaai-cart-btn]")) {
				const button = createAddButton(actualFirstRow, secondRowOfPair);
				imageCell.appendChild(button);

				const itemInfo = extractCanadianItemInfo(
					actualFirstRow,
					secondRowOfPair,
				);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML =
						'تمت الإضافة <i class="fas fa-check"></i>';
					button.title = "تمت الإضافة إلى السلة";
				}

				const highlightRows = () => {
					actualFirstRow.style.backgroundColor = "#f5f5f5";
					secondRowOfPair.style.backgroundColor = "#f5f5f5";
				};
				const resetRowHighlight = () => {
					actualFirstRow.style.backgroundColor = "";
					secondRowOfPair.style.backgroundColor = "";
				};
				actualFirstRow.addEventListener("mouseenter", highlightRows);
				actualFirstRow.addEventListener(
					"mouseleave",
					resetRowHighlight,
				);
				secondRowOfPair.addEventListener("mouseenter", highlightRows);
				secondRowOfPair.addEventListener(
					"mouseleave",
					resetRowHighlight,
				);
			} else if (
				!imageCell &&
				!actualFirstRow.querySelector("[data-iaai-cart-btn]") &&
				!secondRowOfPair.querySelector("[data-iaai-cart-btn]")
			) {
				const button = createAddButton();
				button.style.position = "absolute";
				button.style.top = "50%";
				button.style.left = "10px";
				button.style.transform = "translateY(-50%)";
				button.style.zIndex = "1000";
				button.style.width = "30px";
				button.style.height = "30px";
				button.style.fontSize = "16px";

				if (actualFirstRow && actualFirstRow.firstChild) {
					actualFirstRow.insertBefore(
						button,
						actualFirstRow.firstChild,
					);
				} else if (secondRowOfPair.firstChild) {
					secondRowOfPair.insertBefore(
						button,
						secondRowOfPair.firstChild,
					);
				} else if (actualFirstRow) {
					actualFirstRow.appendChild(button);
				} else {
					secondRowOfPair.appendChild(button);
				}

				const itemInfo = extractCanadianItemInfo(
					actualFirstRow,
					secondRowOfPair,
				);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML =
						'تمت الإضافة <i class="fas fa-check"></i>';
					button.title = "تمت الإضافة إلى السلة";
				}
			}
		});
	});
}

/**
 * Inject add buttons into items on Copart.com
 */
function injectCopartButtons() {
	console.log("IAAI Cart: injectCopartButtons() called for copart.com"); // Debug log

	// Define Copart-specific selectors directly here for robustness
	const copartSelectors = {
		itemRows: { selector: "tr.p-selectable-row[data-lotnumber]" },
		title: { selector: "span.search_result_lot_detail" },
		price: { selector: "span.currencyAmount" },
		image: { selector: "td:nth-child(1) img" },
		// href can be derived or found in links like td:nth-child(2) a[href*="/lot/"]
	};

	const rowSelector = copartSelectors.itemRows.selector;
	const rows = document.querySelectorAll(rowSelector);
	console.log(
		"IAAI Cart (Copart): Found " +
			rows.length +
			" item rows using selector: " +
			rowSelector,
	); // Debug log

	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		rows.forEach((row) => {
			console.log("IAAI Cart (Copart): Processing row:", row); // Debug log
			const imageCell = row.querySelector("td:nth-child(1)"); // Image is usually in the first td

			if (imageCell) {
				console.log("IAAI Cart (Copart): Found image cell:", imageCell); // Debug log
				if (!imageCell.querySelector("[data-iaai-cart-btn]")) {
					const button = createAddButton();
					// Styling for Copart button placement
					imageCell.style.position = "relative";
					button.style.position = "absolute";
					button.style.bottom = "5px";
					button.style.right = "5px";
					// button.style.width = "auto"; // Let button size naturally or set specific small size
					// button.style.padding = "5px 8px"; // Adjust padding
					// button.style.fontSize = "12px"; // Adjust font size

					imageCell.appendChild(button);
					console.log(
						"IAAI Cart (Copart): Appended button to image cell.",
						button,
					); // Debug log

					const itemInfo = extractCopartItemInfo(
						row,
						copartSelectors,
					); // Pass local copartSelectors
					if (itemInfo && cartHrefs.has(itemInfo.href)) {
						button.disabled = true;
						button.classList.add("in-cart");
						button.innerHTML =
							'تمت الإضافة <i class="fas fa-check"></i>';
						button.title = "تمت الإضافة إلى السلة";
					}
				}
			} else {
				console.warn(
					"IAAI Cart (Copart): Could not find image cell in row:",
					row,
				); // Debug log
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

	chrome.storage.local.get(["cart"], (result) => {
		const cart = result.cart || [];
		const cartHrefs = new Set(cart.map((item) => item.href));

		rows.forEach((row) => {
			let imageCell = row.querySelector(".table-cell--image");
			if (currentDomain === "iaai.com" && !imageCell) {
				imageCell = row.querySelector(
					".table-cell--image.js-intro-Thumbnail",
				);
			}

			if (imageCell && !imageCell.querySelector("[data-iaai-cart-btn]")) {
				const button = createAddButton();
				imageCell.appendChild(button);

				const itemInfo = extractItemInfo(row);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML =
						'تمت الإضافة <i class="fas fa-check"></i>';
					button.title = "تمت الإضافة إلى السلة";
				}
			} else if (
				!imageCell &&
				!row.querySelector("[data-iaai-cart-btn]")
			) {
				const button = createAddButton();
				if (currentDomain === "ca.iaai.com") {
					button.style.position = "absolute";
					button.style.top = "50%";
					button.style.left = "10px";
					button.style.transform = "translateY(-50%)";
					button.style.zIndex = "1000";
					button.style.width = "30px";
				}
				if (row.firstChild) {
					row.insertBefore(button, row.firstChild);
				} else {
					row.appendChild(button);
				}
				const itemInfo = extractItemInfo(row);
				if (itemInfo && cartHrefs.has(itemInfo.href)) {
					button.disabled = true;
					button.classList.add("in-cart");
					button.innerHTML =
						'تمت الإضافة <i class="fas fa-check"></i>';
					button.title = "تمت الإضافة إلى السلة";
				}
			}
		});
	});
}

/**
 * Create a button to add items to cart
 * @returns {HTMLElement} Button element
 */
function createAddButton(rowForExtraction1 = null, rowForExtraction2 = null) {
	const button = document.createElement("button");
	button.setAttribute("data-iaai-cart-btn", "");
	button.className = "iaai-cart-btn";
	button.innerHTML = 'أضف إلى السلة <i class="fas fa-cart-plus"></i>';
	button.title = "إضافة إلى السلة";

	// Debug: Log which domain this button is being created for in context
	console.log("IAAI Cart: createAddButton called for domain:", currentDomain);

	if (rowForExtraction1) {
		console.log(
			"IAAI Cart: createAddButton WITH specific rows for domain:",
			currentDomain,
			{
				row1: rowForExtraction1,
				row2: rowForExtraction2,
			},
		);
		button.setAttribute("data-created-with-rows", "true");
	} else {
		console.log(
			"IAAI Cart: createAddButton WITHOUT specific rows for domain:",
			currentDomain,
		);
		button.setAttribute("data-created-with-rows", "false");
	}

	ensureFontAwesome();

	button.addEventListener("click", async (e) => {
		console.log(
			"IAAI Cart: Add button CLICKED on domain:",
			currentDomain,
			"Event target:",
			e.target,
		);

		e.preventDefault();
		e.stopPropagation();

		if (button.disabled || button.classList.contains("in-cart")) {
			console.log(
				"IAAI Cart: Button click ignored (disabled or already in cart).",
			);
			return;
		}

		let item;
		let effectiveRowForExtraction;
		const domainConfigForListener = getDomainConfig(); // Get current domain config for listener context

		console.log(
			"IAAI Cart: Evaluating extraction logic for domain:",
			currentDomain,
		);

		if (
			currentDomain === "ca.iaai.com" &&
			rowForExtraction1 &&
			rowForExtraction1.nodeType === Node.ELEMENT_NODE
		) {
			console.log(
				"IAAI Cart (Canadian): Using provided rows for extraction in click listener.",
				{ row1: rowForExtraction1, row2: rowForExtraction2 },
			);
			item = extractCanadianItemInfo(
				rowForExtraction1,
				rowForExtraction2,
			);
			effectiveRowForExtraction = rowForExtraction2; // Or the more relevant row
		} else {
			console.log(
				"IAAI Cart: Using button.closest() for domain:",
				currentDomain,
				"(was rowForExtraction1 not valid or not Canadian site?)",
			);
			let itemRowSelector;
			if (currentDomain === "copart.com") {
				// Use robust Copart selector directly for consistency
				itemRowSelector = "tr.p-selectable-row[data-lotnumber]";
				console.log(
					"IAAI Cart (Copart): Using direct selector for closest():",
					itemRowSelector,
				);
			} else if (
				domainConfigForListener &&
				domainConfigForListener.selectors &&
				domainConfigForListener.selectors.itemRows
			) {
				itemRowSelector =
					domainConfigForListener.selectors.itemRows.selector;
				console.log(
					"IAAI Cart (Other): Using selector from domain config for closest():",
					itemRowSelector,
				);
			} else {
				console.error(
					"IAAI Cart: Cannot determine itemRowSelector for button.closest() on domain:",
					currentDomain,
				);
				updateButtonState(false);
				return;
			}

			const row = button.closest(itemRowSelector);
			effectiveRowForExtraction = row;
			console.log(
				"IAAI Cart: Result of button.closest() with selector '" +
					itemRowSelector +
					"':",
				effectiveRowForExtraction,
			);

			if (!effectiveRowForExtraction) {
				console.error(
					"IAAI Cart: Could not find parent row for button using closest(). Selector might be incorrect or button misplaced.",
					button,
					"Used selector:",
					itemRowSelector,
				);
				updateButtonState(false); // Re-enable button if extraction failed this early
				return;
			}
			// Extract item info based on the identified row and current domain
			console.log(
				"IAAI Cart: Attempting to extract item info for domain:",
				currentDomain,
				"from row:",
				effectiveRowForExtraction,
			);
			item = extractItemInfo(effectiveRowForExtraction); // extractItemInfo handles domain-specific calls
		}

		console.log("IAAI Cart: Extracted item info in click listener:", item);
		if (
			!item ||
			!item.id ||
			item.title === "Unknown Item" ||
			!item.href ||
			item.href.startsWith("#item-")
		) {
			console.error(
				"IAAI Cart: Failed to extract valid item info in click listener (ID, Title, or Href missing/default).",
				{
					extractedItem: item,
					effectiveRow: effectiveRowForExtraction,
				},
			);
			updateButtonState(false); // Re-enable button if extraction failed
			return;
		}

		const updateButtonState = (isInCart) => {
			button.disabled = isInCart;
			button.classList.toggle("in-cart", isInCart);
			button.innerHTML = isInCart
				? 'تمت الإضافة <i class="fas fa-check"></i>' // Updated in-cart text
				: 'أضف إلى السلة <i class="fas fa-cart-plus"></i>';
			button.title = isInCart
				? "تمت الإضافة إلى السلة"
				: "إضافة إلى السلة";
		};

		updateButtonState(true);

		try {
			await addToCart(item);
			console.log(
				"IAAI Cart: Item added to cart successfully (in click listener):",
				item,
			);
			updateButtonState(true);
		} catch (error) {
			updateButtonState(false);
			console.error(
				"IAAI Cart: Error adding to cart (in click listener):",
				error,
				"Item was:",
				item,
			);
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
		// For Canadian site, extractCanadianItemInfo expects two rows.
		// This generic extractItemInfo is usually called from updateAddButtons
		// which might pass only one row. We need to be careful here.
		// The injectCanadianButtons is the primary place where extractCanadianItemInfo
		// is called with two rows.
		// If called with one row, we try to get the sibling.
		// This part needs to be reviewed for ca.iaai.com logic carefully.
		// The original call was extractCanadianItemInfo(row) which is not right as it expects two args.
		// For now, I'll keep the new logic from the previous step which tries to find siblings.
		if (row && row.nextElementSibling) {
			return extractCanadianItemInfo(row, row.nextElementSibling);
		} else if (row && row.previousElementSibling) {
			return extractCanadianItemInfo(row.previousElementSibling, row);
		}
		console.warn(
			"IAAI Cart (Canadian): extractItemInfo called with insufficient row context for pair. Trying with single row (may be incomplete).",
		);
		return extractCanadianItemInfo(row, null); // Or a more robust fallback.
	} else if (currentDomain === "copart.com") {
		// Use robust, locally defined selectors for Copart when called from generic extractItemInfo
		const copartSelectors = {
			itemRows: { selector: "tr.p-selectable-row[data-lotnumber]" },
			title: { selector: "span.search_result_lot_detail" },
			price: { selector: "span.currencyAmount" },
			image: { selector: "td:nth-child(1) img" },
		};
		return extractCopartItemInfo(row, copartSelectors);
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
 * @param {HTMLElement} actualFirstRow The first row of the pair
 * @param {HTMLElement} actualSecondRow The second row of the pair
 * @returns {Object} Item information
 */
function extractCanadianItemInfo(actualFirstRow, actualSecondRow) {
	const domainConfig = getDomainConfig();
	if (!domainConfig) {
		console.error(
			"IAAI Cart: Canadian domain config not found for extraction.",
		);
		return createDefaultItem();
	}

	console.log(
		"IAAI Cart (Canadian): Starting extraction with corrected row order.",
		{
			firstRow: actualFirstRow, // This should now be the TR with title/image
			secondRow: actualSecondRow, // This should be the TR with VIN/Price etc.
		},
	);

	let itemId = "";
	let title = "Unknown Item";
	let href = "";
	let imgSrc = "https://via.placeholder.com/60?text=IAAI";
	let price = "N/A";
	let vin = "";
	let stockNumber = "";

	// --- Extract from actualFirstRow (expected to have Title and Image) ---
	if (actualFirstRow) {
		const titleElement = actualFirstRow.querySelector(
			"td[colspan='4'] a.stockLinkHeader",
		);
		console.log(
			"IAAI Cart (Canadian): Title Element (from actualFirstRow):",
			titleElement,
		);
		if (titleElement) {
			title = titleElement.textContent.trim();
			console.log("IAAI Cart (Canadian): Extracted Title:", title);
			const onclickAttr = titleElement.getAttribute("onclick");
			console.log(
				"IAAI Cart (Canadian): Onclick Attribute:",
				onclickAttr,
			);
			if (onclickAttr) {
				const match = onclickAttr.match(/showVehicleDetails\((\d+)\)/);
				if (match && match[1]) {
					stockNumber = match[1];
					href = `https://ca.iaai.com/Vehicles/VehicleDetails?itemid=${stockNumber}`;
					itemId = stockNumber;
					console.log(
						"IAAI Cart (Canadian): Extracted stockNumber from onclick:",
						stockNumber,
						"href:",
						href,
						"itemId:",
						itemId,
					);
				}
			}
			if (!href && titleElement.href && titleElement.href !== "#") {
				href = titleElement.href;
				console.log(
					"IAAI Cart (Canadian): Href from titleElement.href:",
					href,
				);
			}
		}

		const imgElement = actualFirstRow.querySelector(
			"td:nth-child(2) img.gridImageStyle",
		);
		console.log(
			"IAAI Cart (Canadian): Image Element (from actualFirstRow):",
			imgElement,
		);
		if (imgElement) {
			imgSrc = imgElement.src;
			console.log(
				"IAAI Cart (Canadian): Extracted Image Source:",
				imgSrc,
			);
			if (!itemId && imgElement.id) {
				const match = imgElement.id.match(/img_(\d+)/);
				if (match && match[1]) {
					if (!stockNumber) stockNumber = match[1];
					if (!itemId) itemId = match[1];
					console.log(
						"IAAI Cart (Canadian): ID from image (itemId):",
						itemId,
						"stockNumber from image:",
						stockNumber,
					);
				}
			}
		}
	} else {
		console.warn(
			"IAAI Cart (Canadian): actualFirstRow is null or undefined.",
		);
	}

	// --- Extract from actualSecondRow (expected to have VIN, Stock#, Price) ---
	if (actualSecondRow) {
		const vinElement = actualSecondRow.querySelector(
			"td:nth-child(1) > div:nth-child(1) > span",
		);
		console.log(
			"IAAI Cart (Canadian): VIN Element (from actualSecondRow):",
			vinElement,
		);
		if (vinElement) {
			vin = vinElement.textContent.replace("VIN #: ", "").trim();
			console.log("IAAI Cart (Canadian): Extracted VIN:", vin);
		}

		if (!stockNumber) {
			const stockElement = actualSecondRow.querySelector(
				"td:nth-child(1) > div:nth-child(2) > span > a",
			);
			console.log(
				"IAAI Cart (Canadian): Stock Element (from actualSecondRow):",
				stockElement,
			);
			if (stockElement) {
				stockNumber = stockElement.textContent.trim();
				console.log(
					"IAAI Cart (Canadian): Extracted stockNumber from actualSecondRow:",
					stockNumber,
				);
				if (!itemId) itemId = stockNumber;
				if (!href && stockNumber) {
					href = `https://ca.iaai.com/Vehicles/VehicleDetails?itemid=${stockNumber}`;
					console.log(
						"IAAI Cart (Canadian): Href from actualSecondRow stockNumber:",
						href,
					);
				}
			}
		}

		const highPrebidElement = actualSecondRow.querySelector(
			"span[id^='highprebid_']",
		);
		console.log(
			"IAAI Cart (Canadian): High Prebid Element (from actualSecondRow):",
			highPrebidElement,
		);
		if (highPrebidElement) {
			price = highPrebidElement.textContent.trim();
			console.log(
				"IAAI Cart (Canadian): Extracted Price (High Prebid):",
				price,
			);
		} else {
			console.log(
				"IAAI Cart (Canadian): High Prebid element not found, searching for other price indicators.",
			);
			const priceLikeElements = Array.from(
				actualSecondRow.querySelectorAll("td"),
			);
			for (const cell of priceLikeElements) {
				const cellText = cell.textContent.trim();
				if (
					cellText.includes("$") ||
					cellText.toLowerCase().includes("cad")
				) {
					console.log(
						"IAAI Cart (Canadian): Found cell with price indicator:",
						cellText,
					);
					const priceMatch = cellText.match(
						/[\$\£\€CAD\s]*[\d,]+\.?\d+/,
					);
					if (priceMatch) {
						price = priceMatch[0].trim();
						console.log(
							"IAAI Cart (Canadian): Extracted Price (Fallback):",
							price,
						);
						break;
					}
				}
			}
		}
	} else {
		console.warn(
			"IAAI Cart (Canadian): actualSecondRow is null or undefined.",
		);
	}

	if (!itemId) {
		itemId = `item-${Date.now()}`;
		console.log(
			"IAAI Cart (Canadian): itemId not found, generated fallback:",
			itemId,
		);
	}
	if (!href) {
		href = `#item-${itemId}`;
		console.log(
			"IAAI Cart (Canadian): href was empty, generated fallback:",
			href,
		);
	}

	const itemInfo = {
		id: itemId,
		title: title,
		price: price,
		image: imgSrc,
		href: href,
		timestamp: Date.now(),
		vin: vin,
		stockNumber: stockNumber,
	};

	console.log("IAAI Cart (Canadian): Final Extracted Item Info:", itemInfo);
	return itemInfo;
}

/**
 * Extract information from an item on Copart.com
 * @param {HTMLElement} row The row element
 * @param {Object} selectors The selectors for Copart (passed to avoid redefining or relying on global config structure immediately)
 * @returns {Object} Item information
 */
function extractCopartItemInfo(row, selectors) {
	console.log(
		"IAAI Cart: extractCopartItemInfo() called for row:",
		row,
		"with selectors:",
		selectors,
	); // Debug log
	const lotNumber = row.getAttribute("data-lotnumber");
	const itemId = lotNumber || `item-${Date.now()}`;

	let title = "Unknown Item";
	let href = "";

	const titleLinkElement = row.querySelector(
		`${selectors.title.selector} a, a ${selectors.title.selector}, td:nth-child(2) a[href*="/lot/"]`,
	);
	const titleSpanElement = row.querySelector(selectors.title.selector);

	if (titleLinkElement && titleLinkElement.textContent.trim()) {
		title = titleLinkElement.textContent.trim();
		href = titleLinkElement.href;
	} else if (titleSpanElement && titleSpanElement.textContent.trim()) {
		title = titleSpanElement.textContent.trim();
		// Try to find href from a parent or sibling 'a' or construct it
		const link = row.querySelector('td:nth-child(2) a[href*="/lot/"]');
		if (link) {
			href = link.href;
		}
	}

	if (!href && lotNumber) {
		// Attempt to construct href if not found directly from a link but lotNumber exists
		const firstLinkInRow = row.querySelector('a[href*="/lot/"]');
		if (firstLinkInRow) {
			//Try to get base path from existing link and append lotNumber if structure is consistent
			const basePathMatch = firstLinkInRow.href.match(
				/(.+\/lot\/)(\d+)(\/.*)?/,
			);
			if (basePathMatch && basePathMatch[1]) {
				href = `${basePathMatch[1]}${lotNumber}`;
			} else {
				href = `/lot/${lotNumber}`; // Fallback generic path
			}
		} else {
			href = `/lot/${lotNumber}`; // Fallback generic path
		}
	}

	let price = "N/A";
	const priceElement = row.querySelector(selectors.price.selector);
	if (priceElement && priceElement.textContent) {
		price = priceElement.textContent.trim();
	}

	let imgSrc = "https://via.placeholder.com/60?text=Copart";
	const imgElement = row.querySelector(selectors.image.selector);
	if (imgElement && imgElement.src) {
		imgSrc = imgElement.src;
	}

	// Ensure href is a full URL if it's a relative path
	if (href && !href.startsWith("http") && !href.startsWith("#")) {
		try {
			href = new URL(href, window.location.origin).href;
		} catch (e) {
			console.error(
				"IAAI Cart (Copart): Error creating full URL for href",
				href,
				e,
			);
			href = `#item-${itemId}`; // fallback if URL creation fails
		}
	}

	if (!href) {
		// Final fallback for href
		href = `#item-${itemId}`;
	}

	const extracted = {
		id: itemId,
		title: title,
		price: price,
		image: imgSrc,
		href: href,
		timestamp: Date.now(),
	};
	console.log("IAAI Cart (Copart): Extracted item info:", extracted); // Debug log
	return extracted;
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
	notification.className = "iaai-cart-notification"; // Add a class for styling via style.css
	notification.textContent = message;

	document.body.appendChild(notification);

	// Fade in - these can remain as they are dynamic style changes based on state
	setTimeout(() => {
		notification.style.opacity = "1";
		notification.style.transform = "translateY(0)";
	}, 10);

	// Fade out and remove
	setTimeout(() => {
		notification.style.opacity = "0";
		notification.style.transform = "translateY(-10px)";
		setTimeout(() => {
			if (document.body.contains(notification)) {
				// Check if still in body
				document.body.removeChild(notification);
			}
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
		headerElement.className = "iaai-cart-header"; // Use class for styling
		document.body.insertBefore(headerElement, document.body.firstChild);

		// إضافة العنوان
		const title = document.createElement("h1");
		title.className = "iaai-cart-header-title"; // Use class for styling
		title.textContent = "عربة IAAI";
		headerElement.appendChild(title);
	}

	// إنشاء زر التحديث
	const refreshButton = document.createElement("button");
	refreshButton.className = "iaai-cart-refresh-button"; // Use class for styling
	refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> تحديث';

	// إضافة أيقونة Font Awesome إذا لم تكن موجودة بالفعل
	ensureFontAwesome();

	// إضافة حدث النقر لإعادة تحميل الصفحة
	refreshButton.addEventListener("click", () => {
		window.location.reload();
	});

	// أضف تأثير تدوير عند تحويم الماوس - this can remain JS controlled or moved to CSS :hover
	// For simplicity, let's keep JS control for this specific dynamic animation if it's complex
	// Or, better, move to CSS :hover if it's just a transform.
	// Let's assume it will be moved to CSS :hover for .iaai-cart-refresh-button i {}
	refreshButton.addEventListener("mouseenter", () => {
		const icon = refreshButton.querySelector("i");
		if (icon) {
			// icon.style.transition = "transform 0.5s"; // This should be in CSS
			// icon.style.transform = "rotate(180deg)"; // This should be in CSS :hover
		}
	});

	refreshButton.addEventListener("mouseleave", () => {
		const icon = refreshButton.querySelector("i");
		if (icon) {
			// icon.style.transform = "rotate(0)"; // This should be in CSS
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
				? 'تمت الإضافة <i class="fas fa-check"></i>' // Updated in-cart text
				: 'أضف إلى السلة <i class="fas fa-cart-plus"></i>';
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
