// API configuration
const API_BASE_URL = "https://n8n.srv797581.hstgr.cloud/api";

// Queue to store scraping tasks
let scrapingQueue = [];
// Flag to track if scraping is in progress
let isScrapingInProgress = false;

// Initialize scraping state on startup
initScrapingState();

function initScrapingState() {
	chrome.storage.local.get(["scrapeState"], (result) => {
		if (result.scrapeState) {
			// If there's an existing scraping state, resume processing
			if (result.scrapeState.inProgress) {
				resumeScraping(result.scrapeState);
			}
		} else {
			// Initialize empty scrape state
			chrome.storage.local.set({
				scrapeState: {
					inProgress: false,
					pendingItems: [],
					processingItems: {},
				},
			});
		}
	});
}

// Resume scraping if it was in progress when extension was restarted
function resumeScraping(state) {
	if (state.pendingItems && state.pendingItems.length > 0) {
		// Load cart items to find pending items by ID
		chrome.storage.local.get(["cart"], (result) => {
			const cart = result.cart || [];

			// Rebuild queue from pending items
			state.pendingItems.forEach((itemId) => {
				const item = cart.find((cartItem) => cartItem.id == itemId);
				if (item && !item.scraped) {
					scrapingQueue.push(item);
				}
			});

			// Resume processing if there are items in the queue
			if (scrapingQueue.length > 0) {
				processScrapingQueue();
			}
		});
	}
}

// Function to extract vehicle ID from URL
function extractVehicleId(url) {
	if (!url) return null;

	// Extract ID from URL (last part after the last slash)
	const urlParts = url.split("/");
	return urlParts[urlParts.length - 1];
}

// Update scraping state in storage
function updateScrapingState() {
	// Get IDs of items still in queue
	const pendingItemIds = scrapingQueue.map((item) => item.id);

	// Update state in storage
	chrome.storage.local.set({
		scrapeState: {
			inProgress: isScrapingInProgress,
			pendingItems: pendingItemIds,
			lastUpdated: new Date().getTime(),
		},
	});
}

// Function to scrape data for a single item
async function scrapeItemData(item) {
	const vehicleId = extractVehicleId(item.href);

	if (!vehicleId) {
		return {
			id: item.id,
			status: "error",
			error: "لم يتم العثور على معرف المركبة",
		};
	}

	try {
		// Update storage to indicate this item is being processed
		chrome.storage.local.get(["scrapeState"], (result) => {
			const state = result.scrapeState || {
				inProgress: true,
				pendingItems: [],
				processingItems: {},
			};

			// Mark this item as processing
			state.processingItems[item.id] = {
				status: "scraping",
				startTime: new Date().getTime(),
			};

			chrome.storage.local.set({ scrapeState: state });
		});

		// Update UI to show progress (if popup is open)
		chrome.runtime.sendMessage({
			action: "updateScrapeStatus",
			id: item.id,
			status: "scraping",
		});

		// Make API request to scrape vehicle data
		const response = await fetch(
			`${API_BASE_URL}/scrape/vehicle/${vehicleId}`,
		);

		if (!response.ok) {
			throw new Error(`فشل في جمع البيانات: ${response.status}`);
		}

		const { body } = await response.json();

		// Update the item in storage
		chrome.storage.local.get(["cart", "scrapeState"], (result) => {
			const cart = result.cart || [];
			const itemIndex = cart.findIndex(
				(cartItem) => cartItem.id == item.id,
			);

			if (itemIndex !== -1) {
				cart[itemIndex].scraped = true;
				cart[itemIndex].additionalData = body;

				// Save updated cart
				chrome.storage.local.set({ cart: cart });

				// Update scrape state
				const state = result.scrapeState || {};
				if (state.processingItems) {
					// Remove this item from processing
					delete state.processingItems[item.id];
					chrome.storage.local.set({ scrapeState: state });
				}

				// Notify popup if it's open
				chrome.runtime.sendMessage({
					action: "updateScrapeStatus",
					id: item.id,
					status: "success",
					data: body,
				});
			}
		});

		return { id: item.id, status: "success", data: body };
	} catch (error) {
		console.error(`Error scraping data for vehicle ${vehicleId}:`, error);

		// Update storage to indicate this item failed
		chrome.storage.local.get(["scrapeState"], (result) => {
			const state = result.scrapeState || {};
			if (state.processingItems) {
				// Mark as error in processing items
				state.processingItems[item.id] = {
					status: "error",
					error: error.message,
					time: new Date().getTime(),
				};
				chrome.storage.local.set({ scrapeState: state });
			}
		});

		// Notify popup if it's open
		chrome.runtime.sendMessage({
			action: "updateScrapeStatus",
			id: item.id,
			status: "error",
			error: error.message,
		});

		return { id: item.id, status: "error", error: error.message };
	}
}

// Process scraping queue
async function processScrapingQueue() {
	if (isScrapingInProgress || scrapingQueue.length === 0) {
		return;
	}

	isScrapingInProgress = true;

	// Update scraping state in storage with more detailed info
	chrome.storage.local.set({
		scrapeState: {
			inProgress: true,
			pendingItems: scrapingQueue.map((item) => item.id),
			processingItems: {},
			startTime: new Date().getTime(),
			totalItems: scrapingQueue.length,
		},
	});

	while (scrapingQueue.length > 0) {
		const item = scrapingQueue.shift();

		// Update scraping state after removing item from queue
		updateScrapingState();

		await scrapeItemData(item);
	}

	isScrapingInProgress = false;

	// Clear scraping state when done
	chrome.storage.local.set({
		scrapeState: {
			inProgress: false,
			pendingItems: [],
			processingItems: {},
			lastCompleted: new Date().getTime(),
		},
	});

	// Notify popup that all scraping is complete
	chrome.runtime.sendMessage({
		action: "scrapingComplete",
	});
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "scrapeData") {
		// Add items to scraping queue
		const items = message.items || [];

		// Filter out already scraped items
		const unscrapedItems = items.filter((item) => !item.scraped);

		if (unscrapedItems.length > 0) {
			scrapingQueue.push(...unscrapedItems);

			// Start processing the queue
			processScrapingQueue();

			sendResponse({
				status: "started",
				itemsCount: unscrapedItems.length,
			});
		} else {
			sendResponse({ status: "no_items" });
		}

		return true; // Keep the message channel open for async response
	} else if (message.action === "getScrapingStatus") {
		// Return current scraping status with more details
		chrome.storage.local.get(["scrapeState", "cart"], (result) => {
			const cart = result.cart || [];
			const scrapeState = result.scrapeState || {
				inProgress: false,
				pendingItems: [],
				processingItems: {},
			};

			// إضافة حالة debugging
			console.log(
				"Scraping status request received. Current state:",
				scrapeState,
			);

			// أضف معلومات أكثر حول العناصر المعلقة
			if (
				scrapeState.pendingItems &&
				scrapeState.pendingItems.length > 0
			) {
				scrapeState.pendingItemsDetails = scrapeState.pendingItems.map(
					(itemId) => {
						const item = cart.find(
							(cartItem) => cartItem.id == itemId,
						);
						return {
							id: itemId,
							title: item ? item.title : "Unknown",
							scraped: item ? !!item.scraped : false,
						};
					},
				);
			}

			sendResponse({
				isScrapingInProgress: isScrapingInProgress,
				scrapeState: scrapeState,
				timestamp: new Date().getTime(),
			});
		});
		return true;
	}
});

// Keep track of port connections to detect when popup is open
chrome.runtime.onConnect.addListener((port) => {
	if (port.name === "popup") {
		// Popup is opened
		port.onDisconnect.addListener(() => {
			// Popup is closed, but scraping continues in background
		});
	}
});
