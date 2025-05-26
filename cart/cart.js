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
                    <p>سلة المركبات فارغة</p>
                    <p class="sub-message">
                        أضف مركبات بالنقر على زر + في قوائم IAAI
                    </p>
                </div>
            `;

			// Disable send button if cart is empty
			sendToBtn.disabled = true;
			scrapeDataBtn.disabled = true;

			// إخفاء قسم جمع البيانات عندما تكون السلة فارغة
			document.querySelector(".data-collection-header").style.display =
				"none";
		} else {
			cartItems.innerHTML = "";

			// التحقق ما إذا كان هناك عناصر لم يتم جمعها بعد
			const hasUnscrapedItems = items.some((item) => !item.scraped);

			// إظهار أو إخفاء قسم جمع البيانات استناداً إلى وجود عناصر لم يتم جمعها بعد
			const dataCollectionHeader = document.querySelector(
				".data-collection-header",
			);
			if (hasUnscrapedItems) {
				dataCollectionHeader.style.display = "flex";
				scrapeDataBtn.disabled = false;

				// تحديث نص الزر ليظهر عدد العناصر التي تحتاج للجمع
				const unscrapedCount = items.filter(
					(item) => !item.scraped,
				).length;
				scrapeDataBtn.innerHTML = `
					<span class="item-count">${unscrapedCount}</span>
					<i class="fas fa-search-plus"></i>
					جمع بيانات إضافية للمركبات
				`;
			} else {
				dataCollectionHeader.style.display = "none";
				scrapeDataBtn.disabled = true;
			}

			items.forEach((item) => {
				const itemElement = document.createElement("div");
				itemElement.classList.add("cart-item");
				itemElement.dataset.id = item.id;

				// Create a fallback image URL in case the provided one doesn't work
				const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
					item.title,
				)}&background=3498db&color=fff&size=60`;

				// تحقق مما إذا كان العنصر يحتوي على بيانات إضافية
				let additionalDataHtml = "";
				if (item.scraped) {
					additionalDataHtml = `
						<button class="toggle-additional-data" data-id="${item.id}">
							<i class="fas fa-chevron-down"></i> عرض البيانات الإضافية
						</button>
						<div class="additional-data additional-data-hidden" id="additional-data-${item.id}">
							<div class="additional-data-header">
								<i class="fas fa-info-circle"></i> البيانات الإضافية:
							</div>
							<div class="additional-data-content">`;

					// مصفوفة لتعيين المفاتيح العربية وأولوية العرض
					const keysToShow = [
						{ key: "vehicleType", label: "نوع المركبة" },
						{ key: "vehicleMake", label: "الشركة المصنعة" },
						{ key: "vehicleModel", label: "الموديل" },
						{ key: "vehicleYear", label: "سنة الصنع" },
						{ key: "odometer", label: "عداد المسافات" },
						{ key: "fuelType", label: "نوع الوقود" },
						{ key: "engine", label: "المحرك" },
						{ key: "transmission", label: "ناقل الحركة" },
						{ key: "color", label: "اللون" },
						{ key: "damage", label: "الضرر" },
						{ key: "location", label: "الموقع" },
					];

					// تقسيم مفاتيح البيانات إلى مجموعتين وعرضها
					let displayCount = 0;
					const maxDisplay = 6; // الحد الأقصى للبيانات المعروضة في القائمة المختصرة

					// تحويل المفاتيح الإنجليزية إلى مسميات عربية
					const labelMap = {};
					keysToShow.forEach(({ key, label }) => {
						labelMap[key] = label;
					});

					for (const { key, label } of keysToShow) {
						if (item[key] && displayCount < maxDisplay) {
							// تنسيق بعض البيانات
							let value = item[key];
							if (
								key === "odometer" &&
								typeof value === "number"
							) {
								value = value.toLocaleString() + " كم";
							} else if (
								key === "vehicleYear" &&
								typeof value === "number"
							) {
								value = value.toString();
							}

							additionalDataHtml += `<div class="data-item"><span class="data-label">${label}:</span> ${value}</div>`;
							displayCount++;
						}
					}

					// عرض عدد البيانات الإضافية المتوفرة
					const totalDataCount = Object.keys(item).filter(
						(key) =>
							![
								"id",
								"title",
								"price",
								"href",
								"image",
								"scraped",
								"additionalData",
							].includes(key) &&
							item[key] !== null &&
							item[key] !== undefined,
					).length;

					const remainingCount = totalDataCount - displayCount;

					// إضافة زر لعرض جميع البيانات
					additionalDataHtml += `
							</div>
							<button class="view-all-data" data-id="${item.id}">
								<i class="fas fa-list-ul"></i> عرض ${
									remainingCount > 0
										? `${remainingCount}+ من البيانات الإضافية`
										: "كل البيانات"
								}
							</button>
						</div>
					`;
				}

				itemElement.innerHTML = `
                    <div class="cart-item-image-container">
                        <img src="${item.image || fallbackImage}" 
                             alt="${item.title}" 
                             class="cart-item-image"
                             onerror="this.onerror=null; this.src='${fallbackImage}'">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.title}</div>
                        
                        <div class="cart-item-meta">
                            <div class="cart-item-price">${item.price}</div>
                            <div class="item-scrape-status" data-id="${
								item.id
							}">
                                ${
									item.scraped
										? `<div class="item-scraped-message">
                                            <i class="fas fa-check-circle"></i> تم جمع البيانات
                                          </div>`
										: ""
								}
                            </div>
                        </div>
                        
                        ${additionalDataHtml}
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

			// إضافة مستمعي أحداث لأزرار "عرض كل البيانات"
			document.querySelectorAll(".view-all-data").forEach((button) => {
				button.addEventListener("click", (e) => {
					const id = e.currentTarget.getAttribute("data-id");
					// استخدام المتغير currentCartItems مباشرة بدلاً من الاستعلام من التخزين
					const item = currentCartItems.find(
						(item) => item.id === id,
					);
					if (item) {
						showAllData(item);
					}
				});
			});

			// إضافة مستمعي أحداث لأزرار تبديل البيانات الإضافية
			document
				.querySelectorAll(".toggle-additional-data")
				.forEach((button) => {
					button.addEventListener("click", (e) => {
						const id = e.currentTarget.getAttribute("data-id");
						const additionalData = document.getElementById(
							`additional-data-${id}`,
						);

						// تبديل حالة الظهور للبيانات الإضافية
						additionalData.classList.toggle(
							"additional-data-hidden",
						);

						// تبديل أيقونة الزر وتحديث النص
						if (
							additionalData.classList.contains(
								"additional-data-hidden",
							)
						) {
							e.currentTarget.innerHTML =
								'<i class="fas fa-chevron-down"></i> عرض البيانات الإضافية';
							e.currentTarget.classList.remove("active");
						} else {
							e.currentTarget.innerHTML =
								'<i class="fas fa-chevron-up"></i> إخفاء البيانات الإضافية';
							e.currentTarget.classList.add("active");

							// تحريك السكرول لإظهار البيانات الإضافية
							setTimeout(() => {
								additionalData.scrollIntoView({
									behavior: "smooth",
									block: "nearest",
								});
							}, 100);
						}
					});
				});

			// تمكين زر الإرسال إذا كانت السلة تحتوي على عناصر
			sendToBtn.disabled = false;
		}

		// Update cart count
		cartCount.textContent = items.length;
	}

	// وظيفة لعرض جميع البيانات الإضافية
	function showAllData(item) {
		// إنشاء نافذة منبثقة لعرض جميع البيانات
		const modal = document.createElement("div");
		modal.classList.add("data-modal");

		let allDataHtml = '<div class="data-modal-content">';
		allDataHtml += `<span class="close-modal">&times;</span>`;
		allDataHtml += `<h3>${item.title}</h3>`;

		// اظهار السعر وصورة للمركبة في النافذة المنبثقة
		const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
			item.title,
		)}&background=3498db&color=fff&size=150`;

		allDataHtml += `
			<div class="modal-vehicle-preview">
				<div class="modal-vehicle-image">
					<img src="${item.image || fallbackImage}" alt="${item.title}" 
						 onerror="this.onerror=null; this.src='${fallbackImage}'">
				</div>
				<div class="modal-vehicle-price">${item.price}</div>
				<div class="modal-vehicle-link-info">
					<i class="fas fa-info-circle"></i> مركبة من موقع IAAI
				</div>
			</div>
			<div class="all-data-list">
		`;

		// الخصائص الأساسية التي لا نريد عرضها في البيانات الإضافية
		const excludeKeys = [
			"id",
			"title",
			"price",
			"href",
			"image",
			"scraped",
			"additionalData",
		];

		// تجميع البيانات من كائن العنصر مباشرة
		const displayedData = {};

		// عرض الخصائص من الكائن الأصلي أولاً
		for (const [key, value] of Object.entries(item)) {
			if (
				!excludeKeys.includes(key) &&
				value !== null &&
				value !== undefined &&
				typeof value !== "object"
			) {
				displayedData[key] = value;
			}
		}

		// ترجمة المصطلحات التقنية الشائعة
		const translations = {
			vehicleType: "نوع المركبة",
			vehicleMake: "الشركة المصنعة",
			vehicleModel: "الموديل",
			vehicleYear: "سنة الصنع",
			odometer: "عداد المسافات",
			engine: "المحرك",
			fuelType: "نوع الوقود",
			transmission: "ناقل الحركة",
			color: "اللون",
			damage: "الضرر",
			location: "الموقع",
			driveType: "نظام الدفع",
			cylinder: "عدد الإسطوانات",
			body: "نوع الهيكل",
			doors: "عدد الأبواب",
			airbags: "الوسائد الهوائية",
			keys: "المفاتيح",
			notes: "ملاحظات",
			vin: "رقم الهيكل VIN",
		};

		// تنظيم البيانات في مجموعات للعرض
		const organizeData = {
			"معلومات المركبة الأساسية": [
				"vehicleType",
				"vehicleMake",
				"vehicleModel",
				"vehicleYear",
				"vin",
			],
			"المواصفات الفنية": [
				"engine",
				"transmission",
				"fuelType",
				"odometer",
				"cylinder",
				"driveType",
			],
			"معلومات الحالة": [
				"damage",
				"color",
				"body",
				"doors",
				"airbags",
				"keys",
			],
			"معلومات المزاد": [
				"auctionDate",
				"location",
				"lot",
				"stock",
				"sellerName",
			],
		};

		// تنسيق بعض قيم البيانات
		const formatDataValue = (key, value) => {
			if (typeof value !== "string" && typeof value !== "number") {
				return value;
			}

			value = String(value);

			if (key === "odometer") {
				// تنسيق عداد المسافات
				const numValue = parseInt(value.replace(/,/g, "").match(/\d+/));
				if (!isNaN(numValue)) {
					return numValue.toLocaleString() + " كم";
				}
			} else if (
				key.toLowerCase().includes("date") ||
				key.toLowerCase().includes("time")
			) {
				// تنسيق التواريخ
				try {
					const date = new Date(value);
					if (!isNaN(date.getTime())) {
						return new Intl.DateTimeFormat("ar-EG", {
							year: "numeric",
							month: "long",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						}).format(date);
					}
				} catch (e) {}
			}

			return value;
		};

		// عرض البيانات المنظمة في مجموعات
		for (const [category, keys] of Object.entries(organizeData)) {
			let categoryHasData = false;
			let categoryHtml = `<div class="data-category"><h4>${category}</h4><div class="category-items">`;

			for (const key of keys) {
				if (displayedData[key]) {
					categoryHasData = true;
					const translatedKey = translations[key] || key;
					const formattedValue = formatDataValue(
						key,
						displayedData[key],
					);

					categoryHtml += `<div class="all-data-item"><span class="data-label">${translatedKey}:</span> ${formattedValue}</div>`;

					// حذف المفتاح من القائمة الرئيسية لتجنب التكرار
					delete displayedData[key];
				}
			}

			categoryHtml += `</div></div>`;

			if (categoryHasData) {
				allDataHtml += categoryHtml;
			}
		}

		// عرض أي بيانات إضافية لم يتم تصنيفها
		if (Object.keys(displayedData).length > 0) {
			allDataHtml += `<div class="data-category"><h4>معلومات إضافية</h4><div class="category-items">`;
			for (const [key, value] of Object.entries(displayedData)) {
				const translatedKey = translations[key] || key;
				const formattedValue = formatDataValue(key, value);
				allDataHtml += `<div class="all-data-item"><span class="data-label">${translatedKey}:</span> ${formattedValue}</div>`;
			}
			allDataHtml += `</div></div>`;
		}

		allDataHtml += "</div></div>";
		modal.innerHTML = allDataHtml;

		document.body.appendChild(modal);

		// إضافة تأثير زوم للصورة
		const modalImg = modal.querySelector(".modal-vehicle-image img");
		if (modalImg) {
			modalImg.addEventListener("mouseover", () => {
				modalImg.style.transform = "scale(1.1)";
			});

			modalImg.addEventListener("mouseout", () => {
				modalImg.style.transform = "scale(1)";
			});
		}

		// إغلاق النافذة المنبثقة عند النقر على زر الإغلاق أو خارج النافذة
		const closeBtn = modal.querySelector(".close-modal");
		closeBtn.addEventListener("click", () => {
			modal.classList.add("modal-closing");
			setTimeout(() => {
				document.body.removeChild(modal);
			}, 300);
		});

		window.addEventListener("click", (e) => {
			if (e.target === modal) {
				modal.classList.add("modal-closing");
				setTimeout(() => {
					document.body.removeChild(modal);
				}, 300);
			}
		});

		// تأثير ظهور تدريجي للنافذة المنبثقة
		setTimeout(() => {
			modal.classList.add("modal-active");
		}, 10);
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

		// إخفاء قسم جمع البيانات عند تفريغ السلة
		document.querySelector(".data-collection-header").style.display =
			"none";
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

		// حساب عدد العناصر التي يجب جمع بياناتها
		const unscrapedItems = currentCartItems.filter((item) => !item.scraped);
		if (unscrapedItems.length === 0) return;

		isScraping = true;
		scrapeDataBtn.disabled = true;

		// تحديث نص الزر لإظهار أن الجمع قيد التقدم
		scrapeDataBtn.innerHTML = `
			<div class="spinner"></div>
			<span>جاري جمع البيانات</span>
		`;

		// إضافة فئة CSS للإشارة إلى حالة الجمع
		scrapeDataBtn.classList.add("is-scraping");

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
					scrapeDataBtn.classList.remove("is-scraping");

					// إعادة نص الزر إلى الحالة الأصلية
					const remainingUnscraped = currentCartItems.filter(
						(item) => !item.scraped,
					).length;
					if (remainingUnscraped > 0) {
						scrapeDataBtn.innerHTML = `
							<span class="item-count">${remainingUnscraped}</span>
							<i class="fas fa-search-plus"></i>
							جمع بيانات إضافية للمركبات
						`;
					}
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
					// دمج البيانات المستخرجة مباشرة في كائن عنصر السلة
					Object.assign(currentCartItems[itemIndex], data);
					// الاحتفاظ بالبيانات في خاصية additionalData للتوافق مع الإصدارات السابقة
					currentCartItems[itemIndex].additionalData = data;

					// التحقق مما إذا كانت جميع العناصر قد تم جمعها
					const hasUnscrapedItems = currentCartItems.some(
						(item) => !item.scraped,
					);
					if (!hasUnscrapedItems) {
						// إخفاء قسم جمع البيانات إذا تم جمع جميع البيانات
						document.querySelector(
							".data-collection-header",
						).style.display = "none";
					} else {
						// تحديث عدد العناصر المتبقية
						const unscrapedCount = currentCartItems.filter(
							(item) => !item.scraped,
						).length;
						scrapeDataBtn.innerHTML = `
							<span class="item-count">${unscrapedCount}</span>
							<i class="fas fa-search-plus"></i>
							جمع بيانات إضافية للمركبات
						`;
					}
				}
			}
		} else if (message.action === "scrapingComplete") {
			// All scraping is complete
			isScraping = false;
			scrapeDataBtn.disabled = false;
			scrapeDataBtn.classList.remove("is-scraping");

			// Refresh cart items from storage
			loadCartItems();
		}
	});

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

	scrapeDataBtn.addEventListener("click", startScraping);

	// Load cart items when popup opens
	loadCartItems();
});
