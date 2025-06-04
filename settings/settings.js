// سأجلب البيانات من towing.json وأعرضها في الجدول
async function fetchTowingData() {
	// تحقق أولاً من وجود بيانات في localStorage
	const local = localStorage.getItem("towingData");
	if (local) {
		try {
			return JSON.parse(local);
		} catch (e) {}
	}
	// إذا لم توجد بيانات محلية، جلبها من الملف
	const response = await fetch("../towing.json");
	const json = await response.json();
	return json;
}

function jsonToTableData(json) {
	if (!json.length) return { headers: [], rows: [] };
	const headers = Object.keys(json[0]);
	// إضافة عمود Shipping Price وعمود total
	const newHeaders = [...headers, "Shipping Price", "total"];
	// جلب أسعار الشحن من localStorage
	let shippingPrices = {};
	try {
		const local = localStorage.getItem("shippingPrices");
		if (local) shippingPrices = JSON.parse(local);
	} catch {}
	const rows = json.map((obj) => {
		const baseRow = newHeaders.map((h) =>
			obj[h] !== undefined ? obj[h] : "",
		);
		// أضف قيمة الشحن حسب المنطقة
		const region = obj["Region"] || "";
		const shippingValue =
			shippingPrices[region] !== undefined
				? Math.round(shippingPrices[region] / 4)
				: "";
		baseRow[headers.length] = shippingValue;
		// حساب المجموع
		const towing = Number(obj["Towing"]);
		const shipping = Number(shippingValue);
		const total =
			(!isNaN(towing) ? towing : 0) + (!isNaN(shipping) ? shipping : 0);
		baseRow[headers.length + 1] = total;
		return baseRow;
	});
	return { headers: newHeaders, rows };
}

// ألوان افتراضية لكل منطقة
const regionColors = {
	Georgia: "#e3f6fd",
	"New Jersey": "#fceabb",
	Texas: "#d4fc79",
	California: "#fbc2eb",
	Washington: "#b5fffc",
	"": "#f7f7f7", // للصفوف بدون منطقة
};

function getRegionColor(region) {
	return regionColors[region] || "#f7f7f7";
}

let showRegionColors = true;

// قائمة ألوان جاهزة للاختيار
const colorOptions = [
	"#e3f6fd",
	"#fceabb",
	"#d4fc79",
	"#fbc2eb",
	"#b5fffc",
	"#ffd6e0",
	"#c2ffd8",
	"#ffe082",
	"#b2baff",
	"#ffb2b2",
];
// المناطق المخفية
let hiddenRegions = new Set();

// تحميل الألوان من localStorage إذا وجدت
function loadRegionColors() {
	try {
		const saved = localStorage.getItem("regionColors");
		if (saved) {
			const parsed = JSON.parse(saved);
			Object.assign(regionColors, parsed);
		}
	} catch (e) {}
}
// حفظ الألوان في localStorage
function saveRegionColors() {
	try {
		localStorage.setItem("regionColors", JSON.stringify(regionColors));
	} catch (e) {}
}

function renderRegionColorControls(regions) {
	const controls = document.getElementById("region-color-controls");
	controls.innerHTML = `
		<div class="top-controls">
			<div style="display:flex;align-items:center;gap:18px;flex:1;">
				<div class="region-colors-list${showRegionColors ? "" : " hide-regions"}">
					${regions
						.map((region) => {
							const color =
								regionColors[region] || colorOptions[0];
							const isHidden = hiddenRegions.has(region);
							return `
							<span class="region-color-item">
								<button class="color-circle" data-region="${region}" style="background:${color};border:${
								color === "#fff" ? "1px solid #ccc" : "none"
							};"></button>
								<span class="region-label${
									isHidden ? " region-label-hidden" : ""
								}" data-region="${region}" style="cursor:pointer;user-select:none;${
								isHidden
									? "text-decoration:line-through;opacity:0.5;"
									: ""
							}">${region}</span>
							</span>
						`;
						})
						.join("")}
				</div>
			</div>
			<button id="open-shipping-popup" class="shipping-btn">Shipping</button>
		</div>
	`;
	// تفعيل color picker
	controls.querySelectorAll(".color-circle").forEach((btn) => {
		btn.onclick = (e) => {
			e.stopPropagation();
			const region = btn.getAttribute("data-region");
			let menu = document.getElementById(`color-options-${region}`);
			// إذا لم تكن القائمة موجودة، أنشئها
			if (!menu) {
				menu = document.createElement("div");
				menu.className = "color-options";
				menu.id = `color-options-${region}`;
				menu.style.display = "block";
				menu.style.position = "absolute";
				menu.style.top = "32px";
				menu.style.left = "0";
				menu.style.zIndex = "10";
				menu.style.background = "#fff";
				menu.style.padding = "6px 8px";
				menu.style.borderRadius = "10px";
				menu.style.boxShadow = "0 2px 8px #0001";
				menu.innerHTML = colorOptions
					.map(
						(opt) =>
							`<div class="color-opt" data-region="${region}" data-color="${opt}" style="width:22px;height:22px;border-radius:50%;background:${opt};margin:4px;display:inline-block;cursor:pointer;border:${
								opt ===
								(regionColors[region] || colorOptions[0])
									? "2px solid #2176ae"
									: "2px solid #fff"
							};"></div>`,
					)
					.join("");
				btn.parentElement.appendChild(menu);
			} else {
				menu.style.display =
					menu.style.display === "block" ? "none" : "block";
			}
			// إغلاق كل القوائم الأخرى
			controls.querySelectorAll(".color-options").forEach((el) => {
				if (el !== menu) el.style.display = "none";
			});
			// تفعيل اختيار اللون
			menu.querySelectorAll(".color-opt").forEach((opt) => {
				opt.onclick = (ev) => {
					const color = opt.getAttribute("data-color");
					regionColors[region] = color;
					saveRegionColors();
					btn.style.background = color;
					menu.style.display = "none";
					rerenderTableWithColors();
				};
			});
		};
	});
	// إغلاق القائمة عند الضغط خارجها
	document.addEventListener(
		"click",
		function hideMenus(e) {
			if (!e.target.classList.contains("color-circle")) {
				controls
					.querySelectorAll(".color-options")
					.forEach((el) => (el.style.display = "none"));
			}
		},
		{ once: true },
	);
	// تفعيل تأثير line-through عند الضغط على اسم المنطقة
	controls.querySelectorAll(".region-label").forEach((label) => {
		label.onclick = () => {
			const region = label.getAttribute("data-region");
			if (hiddenRegions.has(region)) {
				hiddenRegions.delete(region);
				label.classList.remove("region-label-hidden");
				label.style.textDecoration = "";
				label.style.opacity = "";
			} else {
				hiddenRegions.add(region);
				label.classList.add("region-label-hidden");
				label.style.textDecoration = "line-through";
				label.style.opacity = "0.5";
			}
			rerenderTableWithColors();
		};
	});
	// تفعيل popup shipping بعد رسم أدوات التحكم (مباشرة هنا)
	const json = window._lastTowingJson;
	setupShippingPopup(regions);
}

function rerenderTableWithColors() {
	// إعادة رسم الجدول مع الألوان الجديدة
	const json = window._lastTowingJson;
	const data = jsonToTableData(json);
	renderTable(data);
}

function renderTable({ headers, rows }) {
	const headerRow = document.getElementById("table-header-row");
	headerRow.innerHTML = headers
		.map((h, idx) => {
			if (h.toLowerCase().includes("mileage")) {
				return `<th style="position:relative;">
				${h}
			</th>`;
			}
			return `<th>${h}</th>`;
		})
		.join("");
	const body = document.getElementById("table-body");
	const towingColIndex = headers.findIndex(
		(h) => h.toLowerCase() === "towing",
	);
	const regionColIndex = headers.findIndex(
		(h) => h.toLowerCase() === "region",
	);
	body.innerHTML = rows
		.map((row, i) => {
			const region = row[regionColIndex] || "";
			if (hiddenRegions.has(region)) return "";
			const regionClass = `region-${region.replace(/\s+/g, "-")}`;
			const rowColor = showRegionColors ? getRegionColor(region) : "";
			return (
				`<tr class="${regionClass}" style="background:${rowColor}">` +
				row
					.map((cell, j) => {
						if (j === towingColIndex) {
							return `<td class="towing-cell" data-row="${i}" data-col="${j}" style="background:${rowColor};position:relative;cursor:pointer;transition:background 0.18s;">
								<span class="towing-value">${cell}</span>
							</td>`;
						} else {
							return `<td data-row="${i}" data-col="${j}">${cell}</td>`;
						}
					})
					.join("") +
				"</tr>"
			);
		})
		.join("");
	// تفعيل محرر القيم عند الضغط على الخلية
	document.querySelectorAll(".towing-cell").forEach((td) => {
		td.onclick = function (e) {
			e.stopPropagation();
			// لا تفتح محرر إذا كان هناك محرر مفتوح بالفعل
			if (td.querySelector(".towing-popup")) return;
			const currentValue = td.querySelector(".towing-value").textContent;
			// إزالة أي popup آخر
			document
				.querySelectorAll(".towing-popup")
				.forEach((p) => p.remove());
			// إنشاء popup
			const popup = document.createElement("div");
			popup.className = "towing-popup";
			// تصميم popup عصري فوق الخلية مع سهم
			popup.style.position = "absolute";
			popup.style.top = "-60px";
			popup.style.left = "50%";
			popup.style.transform = "translateX(-50%)";
			popup.style.background = "#fff";
			popup.style.border = "none";
			popup.style.borderRadius = "14px";
			popup.style.boxShadow = "0 4px 18px #2176ae22, 0 1.5px 6px #0001";
			popup.style.padding = "14px 18px 12px 18px";
			popup.style.zIndex = "100";
			popup.style.display = "flex";
			popup.style.alignItems = "center";
			popup.style.gap = "12px";
			popup.style.minWidth = "120px";
			popup.style.minHeight = "40px";
			popup.style.transition = "box-shadow 0.2s";
			// سهم صغير أسفل popup
			popup.innerHTML = `
				<input type="number" class="towing-input" value="${currentValue}" style="width:80px;padding:7px 10px;border-radius:7px;border:1.5px solid #e3eaf1;font-size:16px;outline:none;background:#fafdff;box-shadow:0 1px 2px #2176ae09;transition:border 0.2s;" />
				<button class="towing-save-btn" style="padding:7px 22px;background:#2176ae;color:#fff;border:none;border-radius:7px;font-size:16px;font-weight:500;cursor:pointer;box-shadow:0 1px 4px #2176ae11;transition:background 0.18s,box-shadow 0.18s;">Save</button>
				<div style='position:absolute;left:50%;bottom:-12px;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:12px solid #fff;filter:drop-shadow(0 2px 4px #2176ae22);'></div>
			`;
			td.appendChild(popup);
			// تأثير hover للزر
			const saveBtn = popup.querySelector(".towing-save-btn");
			saveBtn.onmouseover = function () {
				saveBtn.style.background = "#1761a0";
				saveBtn.style.boxShadow = "0 2px 8px #2176ae22";
			};
			saveBtn.onmouseout = function () {
				saveBtn.style.background = "#2176ae";
				saveBtn.style.boxShadow = "0 1px 4px #2176ae11";
			};
			// تأثير focus للانبت
			const input = popup.querySelector(".towing-input");
			input.onfocus = function () {
				input.style.border = "1.5px solid #2176ae";
			};
			input.onblur = function () {
				input.style.border = "1.5px solid #e3eaf1";
			};
			// حفظ القيمة الجديدة
			saveBtn.onclick = function (ev) {
				ev.stopPropagation(); // منع أي تداخل أحداث
				const newValue = input.value;
				td.querySelector(".towing-value").textContent = newValue;
				// تحديث البيانات في window._lastTowingJson ثم حفظها في localStorage
				const rowIdx = parseInt(td.getAttribute("data-row"));
				const colIdx = parseInt(td.getAttribute("data-col"));
				if (
					window._lastTowingJson &&
					window._lastTowingJson[rowIdx] &&
					headers[colIdx] === "Towing"
				) {
					window._lastTowingJson[rowIdx]["Towing"] = Number(newValue);
					saveTowingDataToLocal(window._lastTowingJson);
				}
				// إزالة popup من الخلية فقط (وليس من كل الصفحة)
				if (td.contains(popup)) td.removeChild(popup);
			};
			// إغلاق عند الضغط خارج النافذة
			setTimeout(() => {
				document.addEventListener(
					"click",
					function closePopup(ev) {
						if (!popup.contains(ev.target)) popup.remove();
					},
					{ once: true },
				);
			}, 50);
			// فوكس تلقائي للانبت
			input.focus();
		};
	});
}

function saveTable() {
	const table = document.getElementById("towing-table");
	const headers = Array.from(table.querySelectorAll("thead th")).map(
		(th) => th.textContent,
	);
	const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
		Array.from(tr.querySelectorAll("td")).map((td) => td.textContent),
	);
	const csv = [headers.join(",")]
		.concat(rows.map((r) => r.join(",")))
		.join("\n");
	alert("Saved!\n\n" + csv);
	// يمكنك هنا حفظ البيانات في التخزين المحلي أو إرسالها للخلفية
}

// Shipping popup logic
const SHIPPING_STORAGE_KEY = "shippingRegions";
function getShippingRegions(regions, pricesObj) {
	// استخدم الأسعار من الملف إذا وجدت
	return regions.map((region) => ({
		region,
		value:
			pricesObj && pricesObj[region] !== undefined
				? pricesObj[region]
				: "",
	}));
}

function setupShippingPopup(regions) {
	// إزالة أي حدث سابق
	const btn = document.getElementById("open-shipping-popup");
	if (!btn) return;
	btn.onclick = function () {
		renderShippingPopup(regions);
		document.getElementById("shipping-popup").style.display = "flex";
	};
	const closeBtn = document.getElementById("close-shipping-popup");
	if (closeBtn) {
		closeBtn.onclick = function () {
			document.getElementById("shipping-popup").style.display = "none";
		};
	}
}

// قراءة أسعار الشحن من ملف shipping_prices.json عند أول تحميل فقط
async function fetchShippingPrices() {
	let prices = {};
	try {
		// إذا كانت موجودة في localStorage استخدمها
		const local = localStorage.getItem("shippingPrices");
		if (local) {
			prices = JSON.parse(local);
		} else {
			// وإلا اقرأ من الملف وحدث localStorage
			const res = await fetch("../shipping_prices.json");
			prices = await res.json();
			localStorage.setItem("shippingPrices", JSON.stringify(prices));
		}
	} catch {
		prices = {};
	}
	return prices;
}

// تحديث أسعار الشحن في localStorage فقط
function updateShippingPrices(prices) {
	localStorage.setItem("shippingPrices", JSON.stringify(prices));
}

async function renderShippingPopup(regions) {
	const list = document.getElementById("shipping-list");
	const pricesObj = await fetchShippingPrices();
	const data = getShippingRegions(regions, pricesObj);
	list.innerHTML = data
		.map(
			(r, i) => `
		<div style="display:flex;align-items:center;margin-bottom:12px;gap:12px;">
			<span style="min-width:110px;font-size:16px;font-weight:500;color:#2176ae;">${
				r.region
			}</span>
			<input type="number" class="shipping-value" data-idx="${i}" value="${
				r.value || ""
			}" placeholder="Shipping price" style="width:120px;font-size:16px;font-weight:600;border:1px solid #e3eaf1;border-radius:6px;outline:none;padding:7px 10px;background:#fafdff;transition:border 0.2s;" />
		</div>
	`,
		)
		.join("");
	// تفعيل تغيير القيمة
	list.querySelectorAll(".shipping-value").forEach((inp) => {
		inp.oninput = function () {
			data[+inp.dataset.idx].value = inp.value;
		};
	});
	// حفظ عند الضغط على زر الحفظ
	document.getElementById("save-shipping-btn").onclick = function () {
		// تحديث القيم من الحقول
		list.querySelectorAll(".shipping-value").forEach((inp) => {
			data[+inp.dataset.idx].value = inp.value;
		});
		// بناء كائن الأسعار
		const newPrices = {};
		data.forEach((r) => {
			newPrices[r.region] = Number(r.value) || 0;
		});
		updateShippingPrices(newPrices);
		document.getElementById("shipping-popup").style.display = "none";
	};
}

// حفظ بيانات السحب في localStorage
function saveTowingDataToLocal(json) {
	try {
		localStorage.setItem("towingData", JSON.stringify(json));
	} catch (e) {}
}

// دالة لتحميل بيانات shipping_prices.json و towing.json وتخزينها في localStorage إذا لم تكن موجودة
async function initializeDataToLocalStorage() {
	// تحميل بيانات الشحن
	if (!localStorage.getItem("shippingPrices")) {
		try {
			const res = await fetch("../shipping_prices.json");
			const shippingJson = await res.json();
			// تحويل بيانات الشحن إلى كائن {region: value}
			const regionShipping = {};
			for (const row of shippingJson) {
				if (row.Region && row.Towing !== undefined) {
					regionShipping[row.Region] = Number(row.Towing);
				}
			}
			localStorage.setItem(
				"shippingPrices",
				JSON.stringify(regionShipping),
			);
		} catch (e) {}
	}
	// تحميل بيانات السحب
	if (!localStorage.getItem("towingData")) {
		try {
			const res = await fetch("../towing.json");
			const towingJson = await res.json();
			localStorage.setItem("towingData", JSON.stringify(towingJson));
		} catch (e) {}
	}
}

// مكون البحث عن location وإظهار المجموع
function renderLocationTotalComponent(json) {
	// إذا كان موجود مسبقًا لا تضف مرتين
	if (document.getElementById("location-total-box")) return;
	const container = document.createElement("div");
	container.id = "location-total-box";
	container.style.display = "flex";
	container.style.alignItems = "center";
	container.style.justifyContent = "flex-start";
	container.style.gap = "18px";
	container.style.margin = "0 0 28px 0";
	container.style.padding = "18px 22px";
	container.style.background = "#fafdff";
	container.style.borderRadius = "14px";
	container.style.boxShadow = "0 2px 12px #2176ae11";
	container.style.maxWidth = "480px";
	container.style.position = "relative";

	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Enter location (city or auction)...";
	input.style.flex = "1";
	input.style.padding = "10px 16px";
	input.style.fontSize = "17px";
	input.style.border = "1.5px solid #e3eaf1";
	input.style.borderRadius = "8px";
	input.style.outline = "none";
	input.style.background = "#fff";
	input.style.transition = "border 0.2s";
	input.onfocus = function () {
		input.style.border = "1.5px solid #2176ae";
	};
	input.onblur = function () {
		input.style.border = "1.5px solid #e3eaf1";
	};

	const btn = document.createElement("button");
	btn.textContent = "Get Total";
	btn.style.padding = "10px 24px";
	btn.style.background = "linear-gradient(90deg, #2176ae 60%, #2980b9 100%)";
	btn.style.color = "#fff";
	btn.style.border = "none";
	btn.style.borderRadius = "8px";
	btn.style.fontSize = "16px";
	btn.style.fontWeight = "600";
	btn.style.cursor = "pointer";
	btn.style.boxShadow = "0 1px 4px #2176ae11";
	btn.style.transition = "background 0.18s,box-shadow 0.18s";
	btn.onmouseover = function () {
		btn.style.background =
			"linear-gradient(90deg, #2980b9 60%, #2176ae 100%)";
		btn.style.boxShadow = "0 2px 8px #2176ae22";
	};
	btn.onmouseout = function () {
		btn.style.background =
			"linear-gradient(90deg, #2176ae 60%, #2980b9 100%)";
		btn.style.boxShadow = "0 1px 4px #2176ae11";
	};

	const result = document.createElement("div");
	result.style.fontSize = "18px";
	result.style.fontWeight = "600";
	result.style.color = "#2176ae";
	result.style.marginLeft = "18px";
	result.style.minWidth = "120px";
	result.style.textAlign = "center";

	function searchAndShowTotal() {
		const val = input.value.trim().toLowerCase();
		if (!val) {
			result.textContent = "";
			return;
		}
		// ابحث عن الصف المناسب (city أو auction location)
		const row = json.find(
			(r) =>
				(r.City && r.City.toLowerCase() === val) ||
				(r["Auction Location"] &&
					r["Auction Location"].toLowerCase() === val),
		);
		if (!row) {
			result.textContent = "Not found";
			result.style.color = "#e74c3c";
			return;
		}
		// جلب أسعار الشحن من localStorage
		let shippingPrices = {};
		try {
			const local = localStorage.getItem("shippingPrices");
			if (local) shippingPrices = JSON.parse(local);
		} catch {}
		const region = row["Region"] || "";
		const shippingValue =
			shippingPrices[region] !== undefined
				? Math.round(shippingPrices[region] / 4)
				: 0;
		const towing = Number(row["Towing"]);
		const total =
			(!isNaN(towing) ? towing : 0) +
			(!isNaN(shippingValue) ? shippingValue : 0);
		result.textContent = `Total: $${total}`;
		result.style.color = "#2176ae";
	}

	btn.onclick = searchAndShowTotal;
	input.onkeydown = function (e) {
		if (e.key === "Enter") searchAndShowTotal();
	};

	container.appendChild(input);
	container.appendChild(btn);
	container.appendChild(result);

	// أضف المكون أعلى الصفحة
	const settingsContainer = document.querySelector(".settings-container");
	settingsContainer.insertBefore(container, settingsContainer.firstChild);
}

// في بداية DOMContentLoaded بعد تحميل البيانات
window.addEventListener("DOMContentLoaded", async () => {
	await initializeDataToLocalStorage();
	loadRegionColors();
	const json = await fetchTowingData();
	window._lastTowingJson = json;
	renderLocationTotalComponent(json);
	const data = jsonToTableData(json);
	// استخراج المناطق الفريدة
	const regions = [...new Set(json.map((r) => r.Region).filter(Boolean))];
	// إضافة مكان التحكم بالألوان
	let controlsDiv = document.getElementById("region-color-controls");
	if (!controlsDiv) {
		controlsDiv = document.createElement("div");
		controlsDiv.id = "region-color-controls";
		controlsDiv.style.margin = "0 0 18px 0";
		document
			.querySelector(".settings-container")
			.insertBefore(
				controlsDiv,
				document.querySelector(".table-responsive"),
			);
	}
	renderRegionColorControls(regions);
	renderTable(data);
});
