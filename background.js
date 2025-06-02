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

		const { data: body } = await response.json();

		// Update the item in storage
		chrome.storage.local.get(["cart", "scrapeState"], (result) => {
			const cart = result.cart || [];
			const itemIndex = cart.findIndex(
				(cartItem) => cartItem.id == item.id,
			);

			if (itemIndex !== -1) {
				// Mark as scraped
				cart[itemIndex].scraped = true;
				// Append scraped data directly to the cart item object
				Object.assign(cart[itemIndex], body);
				// Keep additionalData for backward compatibility
				cart[itemIndex].additionalData = body;
				console.log({ body });
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
	} else if (message.action === "sendTelegramMessages") {
		handleSendTelegramMessages(message.payload, sender.tab.id);
		sendResponse({ status: "processing" }); // Acknowledge receipt
		return true; // Indicates that the response will be sent asynchronously
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

async function handleSendTelegramMessages(payload, tabId) {
	const { recipient, introMessage, cartItems } = payload;
	const TG_API_BASE_URL_BG = "https://n8n.srv797581.hstgr.cloud/api"; // Ensure API_BASE_URL is correct here

	// Define propertyMapping (same as in telegram.js)
	const propertyMapping = {
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

	let allSentSuccessfully = true;

	try {
		if (introMessage) {
			const introRes = await fetch(
				`${TG_API_BASE_URL_BG}/telegram/send`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						username: recipient,
						text: introMessage,
					}),
				},
			);
			if (!introRes.ok) allSentSuccessfully = false;
		}

		for (const [index, item] of cartItems.entries()) {
			if (index > 0) {
				await fetch(`${TG_API_BASE_URL_BG}/telegram/send`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						username: recipient,
						text: "〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n",
					}),
				});
			}

			let messageText = `🚗 *${item.title}*\n\n`;
			if (
				item.price &&
				item.price !== "$0" &&
				item.price !== "0" &&
				item.price !== "$0.00"
			) {
				messageText += `💵 *السعر:* ${item.price}\n`;
			}

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
			messageText += "\n";
			if (item.additionalData) {
				const processedKeys = new Set(mainProps);
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

			const textRes = await fetch(`${TG_API_BASE_URL_BG}/telegram/send`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: recipient,
					text: messageText,
				}),
			});
			if (!textRes.ok) allSentSuccessfully = false;

			if (item.image) {
				const imgRes = await fetch(
					`${TG_API_BASE_URL_BG}/telegram/sendMedia`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: recipient,
							mediaUrl: item.image,
							caption: "",
						}),
					},
				);
				if (!imgRes.ok) allSentSuccessfully = false;
			}

			const processImagesBG = async (images) => {
				if (Array.isArray(images)) {
					for (const imgUrl of images.slice(0, 5)) {
						try {
							const res = await fetch(
								`${TG_API_BASE_URL_BG}/telegram/sendMedia`,
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
							if (!res.ok) allSentSuccessfully = false;
						} catch (err) {
							console.warn(
								"BG: Failed to send additional image:",
								err,
							);
							allSentSuccessfully = false;
						}
					}
				}
			};

			if (item.additionalData) {
				await processImagesBG(item.additionalData.images);
				await processImagesBG(item.additionalData.additionalImages);
			}
			await processImagesBG(item.additionalImages);

			if (index < cartItems.length - 1)
				await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		chrome.runtime.sendMessage({
			action: "telegramSendStatus",
			type: allSentSuccessfully ? "success" : "warning",
			message: allSentSuccessfully
				? "تم إرسال جميع العناصر بنجاح إلى تيليجرام! ✨"
				: "تم إرسال بعض العناصر بنجاح، ولكن فشل إرسال البعض الآخر.",
			allSent: allSentSuccessfully,
		});
	} catch (error) {
		chrome.runtime.sendMessage({
			action: "telegramSendStatus",
			type: "error",
			message: `فشل إرسال العناصر إلى تيليجرام: ${error.message}`,
			allSent: false,
		});
	}
}
