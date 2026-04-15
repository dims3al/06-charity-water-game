const waterQualityValue = document.getElementById("waterQualityValue");
const waterSupplyValue = document.getElementById("waterSupplyValue");
const gameArea = document.getElementById("gameArea");
const pathElement = document.getElementById("path");
const wellElement = document.getElementById("well");
const dropletLayer = document.getElementById("dropletLayer");
const turretsLayer = document.getElementById("turretsLayer");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const retryButton = document.getElementById("retryButton");
const instructionsOverlay = document.getElementById("instructionsOverlay");
const easyButton = document.getElementById("easyButton");
const normalButton = document.getElementById("normalButton");
const hardButton = document.getElementById("hardButton");
const openShopButton = document.getElementById("openShopButton");
const closeShopButton = document.getElementById("closeShopButton");
const shopPanel = document.getElementById("shopPanel");
const shopBackdrop = document.getElementById("shopBackdrop");
const purchaseTurretButton = document.getElementById("purchaseTurretButton");
const turretStatus = document.getElementById("turretStatus");
const selectedTurretArea = document.getElementById("selectedTurretArea");
const draggableTurret = document.getElementById("draggableTurret");
const purchaseBarrierButton = document.getElementById("purchaseBarrierButton");
const barrierStatus = document.getElementById("barrierStatus");
const selectedBarrierArea = document.getElementById("selectedBarrierArea");
const draggableBarrier = document.getElementById("draggableBarrier");

const WIN_SUPPLY_LITERS = 300;
const POLLUTED_CLICK_RADIUS = 24;
const BARRIER_WIDTH = 18;
const BARRIER_HEIGHT = 120;
const BARRIER_DURABILITY = 8;

// Difficulty settings
const difficultySettings = {
	easy: {
		pollutionChance: 0.25,
		spawnInterval: 1200,
		damagePerPolluted: 15
	},
	normal: {
		pollutionChance: 0.35,
		spawnInterval: 900,
		damagePerPolluted: 20
	},
	hard: {
		pollutionChance: 0.50,
		spawnInterval: 650,
		damagePerPolluted: 25
	}
};

const gameState = {
	waterQuality: 100,
	waterSupplyLiters: 0,
	isGameOver: false,
	isShopOpen: false,
	droplets: [],
	spawnTimerId: null,
	animationFrameId: null,
	lastFrameTime: 0,
	pollutionChance: 0.35,
	spawnInterval: 900,
	damagePerPolluted: 20,
	difficulty: "normal",
	turretPurchased: false,
	barrierPurchased: false,
	turrets: [],
	barriers: [],
	projectiles: [],
	draggedTurret: null,
	draggedBarrier: null,
	turretCost: 50,
	barrierCost: 80,
	isTurretDragReady: false,
	isBarrierDragReady: false
};

function openShopMenu() {
	gameState.isShopOpen = true;
	shopPanel.classList.add("open");
	shopPanel.setAttribute("aria-hidden", "false");
	shopBackdrop.classList.remove("hidden");
}

function closeShopMenu() {
	gameState.isShopOpen = false;
	shopPanel.classList.remove("open");
	shopPanel.setAttribute("aria-hidden", "true");
	shopBackdrop.classList.add("hidden");
}

function updateStats() {
	waterQualityValue.textContent = `${Math.max(0, gameState.waterQuality)}%`;
	waterSupplyValue.textContent = `${gameState.waterSupplyLiters} L`;
}

function getPathMetrics() {
	const mapWidth = gameArea.clientWidth;
	const mapHeight = gameArea.clientHeight;

	const pathHeight = Math.max(60, Math.min(96, mapHeight * 0.18));
	const pathLeft = 20;
	const pathWidth = Math.max(200, mapWidth - 140);
	const pathTop = (mapHeight - pathHeight) / 2;

	return {
		left: pathLeft,
		top: pathTop,
		width: pathWidth,
		height: pathHeight,
		right: pathLeft + pathWidth,
		centerY: pathTop + pathHeight / 2
	};
}

function layoutGameObjects() {
	const path = getPathMetrics();

	pathElement.style.left = `${path.left}px`;
	pathElement.style.top = `${path.top}px`;
	pathElement.style.width = `${path.width}px`;
	pathElement.style.height = `${path.height}px`;

	const wellSize = 70;
	const wellLeft = Math.min(gameArea.clientWidth - wellSize - 10, path.right + 10);
	const wellTop = path.centerY - wellSize / 2;

	wellElement.style.left = `${wellLeft}px`;
	wellElement.style.top = `${wellTop}px`;
}

function createDroplet() {
	if (gameState.isGameOver) {
		return;
	}

	const path = getPathMetrics();
	const isPolluted = Math.random() < gameState.pollutionChance;

	const dropletElement = document.createElement("div");
	dropletElement.className = `droplet ${isPolluted ? "polluted" : "good"}`;

	const droplet = {
		element: dropletElement,
		x: path.left + 12,
		y: path.top + 12 + Math.random() * (path.height - 24),
		radius: 12,
		speed: 100 + Math.random() * 60,
		isPolluted
	};

	gameState.droplets.push(droplet);
	dropletLayer.appendChild(dropletElement);
}

function purchaseTurret() {
	if (gameState.waterSupplyLiters >= gameState.turretCost && !gameState.turretPurchased) {
		gameState.waterSupplyLiters -= gameState.turretCost;
		gameState.turretPurchased = true;
		turretStatus.textContent = "Purchased! Drag to place on map";
		turretStatus.classList.add("purchased");
		purchaseTurretButton.disabled = true;
		purchaseTurretButton.textContent = "Already Purchased";
		selectedTurretArea.classList.remove("hidden");
		updateStats();
		setupDraggableTurret();
	}
}

function purchaseBarrier() {
	if (gameState.waterSupplyLiters >= gameState.barrierCost && !gameState.barrierPurchased) {
		gameState.waterSupplyLiters -= gameState.barrierCost;
		gameState.barrierPurchased = true;
		barrierStatus.textContent = "Purchased! Drag to place on map";
		barrierStatus.classList.add("purchased");
		purchaseBarrierButton.disabled = true;
		purchaseBarrierButton.textContent = "Already Purchased";
		selectedBarrierArea.classList.remove("hidden");
		updateStats();
		setupDraggableBarrier();
	}
}

function createTurret(x, y) {
	const turretElement = document.createElement("div");
	turretElement.className = "turret placed";
	turretElement.style.left = `${x}px`;
	turretElement.style.top = `${y}px`;
	turretElement.innerHTML = '<div>🛡️</div>';

	const turret = {
		element: turretElement,
		x: x,
		y: y,
		radius: 20,
		shootRange: 150,
		shootCooldown: 0,
		shootInterval: 500
	};

	gameState.turrets.push(turret);
	turretsLayer.appendChild(turretElement);
	return turret;
}

function createBarrier(x, y) {
	const barrierElement = document.createElement("div");
	barrierElement.className = "barrier";
	barrierElement.style.left = `${x}px`;
	barrierElement.style.top = `${y}px`;
	barrierElement.textContent = `${BARRIER_DURABILITY}`;

	const barrier = {
		element: barrierElement,
		x,
		y,
		width: BARRIER_WIDTH,
		height: BARRIER_HEIGHT,
		durability: BARRIER_DURABILITY
	};

	gameState.barriers.push(barrier);
	turretsLayer.appendChild(barrierElement);
	return barrier;
}

function removeBarrier(barrier) {
	const barrierIndex = gameState.barriers.indexOf(barrier);
	if (barrierIndex >= 0) {
		gameState.barriers.splice(barrierIndex, 1);
	}

	if (barrier.element.parentNode) {
		barrier.element.parentNode.removeChild(barrier.element);
	}
}

function shootProjectile(turret, targetX, targetY) {
	const projectileElement = document.createElement("div");
	projectileElement.className = "turret-projectile";
	projectileElement.style.left = `${turret.x}px`;
	projectileElement.style.top = `${turret.y}px`;

	const angle = Math.atan2(targetY - turret.y, targetX - turret.x);
	const speed = 300; // pixels per second

	const projectile = {
		element: projectileElement,
		x: turret.x,
		y: turret.y,
		vx: Math.cos(angle) * speed,
		vy: Math.sin(angle) * speed,
		radius: 5
	};

	gameState.projectiles.push(projectile);
	turretsLayer.appendChild(projectileElement);
	return projectile;
}

function findNearestDroplet(turret) {
	let closestDroplet = null;
	let closestDistance = Infinity;

	for (let i = 0; i < gameState.droplets.length; i += 1) {
		const droplet = gameState.droplets[i];

		// Only shoot polluted droplets
		if (!droplet.isPolluted) {
			continue;
		}

		const dx = droplet.x - turret.x;
		const dy = droplet.y - turret.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance <= turret.shootRange && distance < closestDistance) {
			closestDroplet = droplet;
			closestDistance = distance;
		}
	}

	return closestDroplet;
}

function updateTurrets(deltaTimeSeconds) {
	for (let i = 0; i < gameState.turrets.length; i += 1) {
		const turret = gameState.turrets[i];

		// Update cooldown
		if (turret.shootCooldown > 0) {
			turret.shootCooldown -= deltaTimeSeconds;
		}

		// Find nearest polluted droplet
		if (turret.shootCooldown <= 0) {
			const target = findNearestDroplet(turret);
			if (target) {
				shootProjectile(turret, target.x, target.y);
				turret.shootCooldown = turret.shootInterval / 1000;
			}
		}
	}
}

function updateProjectiles(deltaTimeSeconds) {
	for (let i = gameState.projectiles.length - 1; i >= 0; i -= 1) {
		const projectile = gameState.projectiles[i];

		// Move projectile
		projectile.x += projectile.vx * deltaTimeSeconds;
		projectile.y += projectile.vy * deltaTimeSeconds;

		projectile.element.style.left = `${projectile.x}px`;
		projectile.element.style.top = `${projectile.y}px`;

		// Check collision with droplets
		let hitDroplet = null;
		for (let j = 0; j < gameState.droplets.length; j += 1) {
			const droplet = gameState.droplets[j];
			if (!droplet.isPolluted) {
				continue;
			}

			const dx = projectile.x - droplet.x;
			const dy = projectile.y - droplet.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < projectile.radius + droplet.radius) {
				hitDroplet = droplet;
				break;
			}
		}

		// Remove projectile if hit or out of bounds
		if (hitDroplet) {
			removeDroplet(hitDroplet);
			if (projectile.element.parentNode) {
				projectile.element.parentNode.removeChild(projectile.element);
			}
			gameState.projectiles.splice(i, 1);
		} else if (projectile.x < -20 || projectile.x > gameArea.clientWidth + 20 ||
			projectile.y < -20 || projectile.y > gameArea.clientHeight + 20) {
			if (projectile.element.parentNode) {
				projectile.element.parentNode.removeChild(projectile.element);
			}
			gameState.projectiles.splice(i, 1);
		}
	}
}

function updateBarrierCollisions() {
	for (let i = gameState.barriers.length - 1; i >= 0; i -= 1) {
		const barrier = gameState.barriers[i];
		const barrierTop = barrier.y;
		const barrierBottom = barrier.y + barrier.height;
		const barrierLeft = barrier.x;
		const barrierRight = barrier.x + barrier.width;

		for (let j = gameState.droplets.length - 1; j >= 0; j -= 1) {
			const droplet = gameState.droplets[j];

			if (!droplet.isPolluted) {
				continue;
			}

			const isInsideBarrierX = droplet.x + droplet.radius >= barrierLeft && droplet.x - droplet.radius <= barrierRight;
			const isInsideBarrierY = droplet.y + droplet.radius >= barrierTop && droplet.y - droplet.radius <= barrierBottom;

			if (isInsideBarrierX && isInsideBarrierY) {
				removeDroplet(droplet);
				barrier.durability -= 1;
				barrier.element.textContent = `${Math.max(0, barrier.durability)}`;

				if (barrier.durability <= 0) {
					removeBarrier(barrier);
					break;
				}
			}
		}
	}
}

function handlePollutedDropClick(event) {
	if (gameState.isGameOver) {
		return;
	}

	const areaRect = gameArea.getBoundingClientRect();
	const clickX = event.clientX - areaRect.left;
	const clickY = event.clientY - areaRect.top;

	let closestDrop = null;
	let closestDistance = Infinity;

	// Use a larger radius than the visual circle so polluted drops are easier to click.
	for (let i = 0; i < gameState.droplets.length; i += 1) {
		const droplet = gameState.droplets[i];

		if (!droplet.isPolluted) {
			continue;
		}

		const dx = clickX - droplet.x;
		const dy = clickY - droplet.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance <= POLLUTED_CLICK_RADIUS && distance < closestDistance) {
			closestDrop = droplet;
			closestDistance = distance;
		}
	}

	if (closestDrop) {
		removeDroplet(closestDrop);
	}
}

function removeDroplet(droplet) {
	const index = gameState.droplets.indexOf(droplet);

	if (index >= 0) {
		gameState.droplets.splice(index, 1);
	}

	if (droplet.element.parentNode) {
		droplet.element.parentNode.removeChild(droplet.element);
	}
}

function handleDropletReachedWell(droplet) {
	if (droplet.isPolluted) {
		gameState.waterQuality -= gameState.damagePerPolluted;
	} else {
		gameState.waterSupplyLiters += 10;
	}

	updateStats();
	removeDroplet(droplet);

	if (gameState.waterQuality <= 0) {
		endGame(false);
		return;
	}

	if (gameState.waterSupplyLiters >= WIN_SUPPLY_LITERS) {
		endGame(true);
	}
}

function animateFrame(timestamp) {
	if (gameState.isGameOver) {
		return;
	}

	if (!gameState.lastFrameTime) {
		gameState.lastFrameTime = timestamp;
	}

	const deltaTimeSeconds = (timestamp - gameState.lastFrameTime) / 1000;
	gameState.lastFrameTime = timestamp;

	const wellLeft = wellElement.offsetLeft;

	// Move each droplet from left to right and check if it reached the well.
	for (let i = gameState.droplets.length - 1; i >= 0; i -= 1) {
		const droplet = gameState.droplets[i];
		droplet.x += droplet.speed * deltaTimeSeconds;

		droplet.element.style.left = `${droplet.x}px`;
		droplet.element.style.top = `${droplet.y}px`;

		if (droplet.x + droplet.radius >= wellLeft) {
			handleDropletReachedWell(droplet);
		}
	}

	// Update turrets and projectiles
	updateTurrets(deltaTimeSeconds);
	updateProjectiles(deltaTimeSeconds);
	updateBarrierCollisions();

	gameState.animationFrameId = requestAnimationFrame(animateFrame);
}

function clearAllDroplets() {
	for (let i = gameState.droplets.length - 1; i >= 0; i -= 1) {
		removeDroplet(gameState.droplets[i]);
	}
}

function clearAllTurrets() {
	for (let i = gameState.turrets.length - 1; i >= 0; i -= 1) {
		const turret = gameState.turrets[i];
		if (turret.element.parentNode) {
			turret.element.parentNode.removeChild(turret.element);
		}
	}
	gameState.turrets = [];
}

function clearAllBarriers() {
	for (let i = gameState.barriers.length - 1; i >= 0; i -= 1) {
		const barrier = gameState.barriers[i];
		if (barrier.element.parentNode) {
			barrier.element.parentNode.removeChild(barrier.element);
		}
	}
	gameState.barriers = [];
}

function clearAllProjectiles() {
	for (let i = gameState.projectiles.length - 1; i >= 0; i -= 1) {
		const projectile = gameState.projectiles[i];
		if (projectile.element.parentNode) {
			projectile.element.parentNode.removeChild(projectile.element);
		}
	}
	gameState.projectiles = [];
}

function endGame(didWin) {
	gameState.isGameOver = true;

	clearInterval(gameState.spawnTimerId);
	cancelAnimationFrame(gameState.animationFrameId);

	if (didWin) {
		gameArea.classList.add("win-celebration");
		overlayTitle.textContent = "You Win!";
		overlayText.textContent = "You protected the well and reached 300 L. Play again?";
	} else {
		overlayTitle.textContent = "Game Over";
		overlayText.textContent = "The polluted water lowered quality to zero. Retry?";
	}

	overlay.classList.remove("hidden");
}

function setDifficulty(difficulty) {
	gameState.difficulty = difficulty;
	const settings = difficultySettings[difficulty];
	gameState.pollutionChance = settings.pollutionChance;
	gameState.spawnInterval = settings.spawnInterval;
	gameState.damagePerPolluted = settings.damagePerPolluted;

	// Update button states
	easyButton.classList.remove("selected");
	normalButton.classList.remove("selected");
	hardButton.classList.remove("selected");

	if (difficulty === "easy") {
		easyButton.classList.add("selected");
	} else if (difficulty === "normal") {
		normalButton.classList.add("selected");
	} else if (difficulty === "hard") {
		hardButton.classList.add("selected");
	}
}

function startGame() {
	gameState.waterQuality = 100;
	gameState.waterSupplyLiters = 0;
	gameState.isGameOver = false;
	gameState.lastFrameTime = 0;
	gameState.turretPurchased = false;
	gameState.barrierPurchased = false;
	gameState.draggedTurret = null;
	gameState.draggedBarrier = null;

	clearAllDroplets();
	clearAllTurrets();
	clearAllBarriers();
	clearAllProjectiles();

	// Reset turret purchase UI
	turretStatus.textContent = "Not purchased";
	turretStatus.classList.remove("purchased");
	purchaseTurretButton.disabled = false;
	purchaseTurretButton.textContent = "Purchase";
	selectedTurretArea.classList.add("hidden");
	barrierStatus.textContent = "Not purchased";
	barrierStatus.classList.remove("purchased");
	purchaseBarrierButton.disabled = false;
	purchaseBarrierButton.textContent = "Purchase";
	selectedBarrierArea.classList.add("hidden");

	gameArea.classList.remove("win-celebration");
	updateStats();
	layoutGameObjects();

	overlay.classList.add("hidden");
	instructionsOverlay.classList.add("hidden");

	gameState.spawnTimerId = setInterval(createDroplet, gameState.spawnInterval);
	gameState.animationFrameId = requestAnimationFrame(animateFrame);
}

function setupDraggableTurret() {
	if (gameState.isTurretDragReady) {
		return;
	}

	gameState.isTurretDragReady = true;

	let isDragging = false;
	let offsetX = 0;
	let offsetY = 0;

	draggableTurret.addEventListener("mousedown", (e) => {
		isDragging = true;
		const rect = draggableTurret.getBoundingClientRect();
		offsetX = e.clientX - rect.left;
		offsetY = e.clientY - rect.top;
		draggableTurret.style.opacity = "0.7";
	});

	document.addEventListener("mousemove", (e) => {
		if (!isDragging || !gameState.turretPurchased) {
			return;
		}

		const gameAreaRect = gameArea.getBoundingClientRect();
		const x = e.clientX - gameAreaRect.left - offsetX;
		const y = e.clientY - gameAreaRect.top - offsetY;

		// Allow dragging only within game area bounds
		if (x >= 0 && x <= gameAreaRect.width - 40 && y >= 0 && y <= gameAreaRect.height - 40) {
			draggableTurret.style.position = "fixed";
			draggableTurret.style.left = `${e.clientX - offsetX}px`;
			draggableTurret.style.top = `${e.clientY - offsetY}px`;
			draggableTurret.style.pointerEvents = "none";
		}
	});

	document.addEventListener("mouseup", (e) => {
		if (!isDragging) {
			return;
		}

		isDragging = false;
		draggableTurret.style.opacity = "1";
		draggableTurret.style.position = "relative";
		draggableTurret.style.left = "0";
		draggableTurret.style.top = "0";
		draggableTurret.style.pointerEvents = "auto";

		const gameAreaRect = gameArea.getBoundingClientRect();
		const x = e.clientX - gameAreaRect.left - offsetX;
		const y = e.clientY - gameAreaRect.top - offsetY;

		// Place turret only if dropped within game area
		if (x >= 0 && x <= gameAreaRect.width - 40 && y >= 0 && y <= gameAreaRect.height - 40) {
			createTurret(x, y);
			gameState.turretPurchased = false;
			selectedTurretArea.classList.add("hidden");
		}
	});
}

function setupDraggableBarrier() {
	if (gameState.isBarrierDragReady) {
		return;
	}

	gameState.isBarrierDragReady = true;

	let isDragging = false;
	let offsetX = 0;
	let offsetY = 0;

	draggableBarrier.addEventListener("mousedown", (e) => {
		isDragging = true;
		const rect = draggableBarrier.getBoundingClientRect();
		offsetX = e.clientX - rect.left;
		offsetY = e.clientY - rect.top;
		draggableBarrier.style.opacity = "0.7";
	});

	document.addEventListener("mousemove", (e) => {
		if (!isDragging || !gameState.barrierPurchased) {
			return;
		}

		const gameAreaRect = gameArea.getBoundingClientRect();
		const x = e.clientX - gameAreaRect.left - offsetX;
		const y = e.clientY - gameAreaRect.top - offsetY;

		// Allow dragging only within game area bounds
		if (x >= 0 && x <= gameAreaRect.width - BARRIER_WIDTH && y >= 0 && y <= gameAreaRect.height - BARRIER_HEIGHT) {
			draggableBarrier.style.position = "fixed";
			draggableBarrier.style.left = `${e.clientX - offsetX}px`;
			draggableBarrier.style.top = `${e.clientY - offsetY}px`;
			draggableBarrier.style.pointerEvents = "none";
		}
	});

	document.addEventListener("mouseup", (e) => {
		if (!isDragging) {
			return;
		}

		isDragging = false;
		draggableBarrier.style.opacity = "1";
		draggableBarrier.style.position = "relative";
		draggableBarrier.style.left = "0";
		draggableBarrier.style.top = "0";
		draggableBarrier.style.pointerEvents = "auto";

		const gameAreaRect = gameArea.getBoundingClientRect();
		const x = e.clientX - gameAreaRect.left - offsetX;
		const y = e.clientY - gameAreaRect.top - offsetY;

		// Place barrier only if dropped within game area
		if (x >= 0 && x <= gameAreaRect.width - BARRIER_WIDTH && y >= 0 && y <= gameAreaRect.height - BARRIER_HEIGHT) {
			createBarrier(x, y);
			gameState.barrierPurchased = false;
			selectedBarrierArea.classList.add("hidden");
		}
	});
}

// Event listeners
retryButton.addEventListener("click", startGame);
easyButton.addEventListener("click", () => {
	setDifficulty("easy");
	startGame();
});
normalButton.addEventListener("click", () => {
	setDifficulty("normal");
	startGame();
});
hardButton.addEventListener("click", () => {
	setDifficulty("hard");
	startGame();
});
gameArea.addEventListener("click", handlePollutedDropClick);
openShopButton.addEventListener("click", openShopMenu);
closeShopButton.addEventListener("click", closeShopMenu);
shopBackdrop.addEventListener("click", closeShopMenu);
purchaseTurretButton.addEventListener("click", purchaseTurret);
purchaseBarrierButton.addEventListener("click", purchaseBarrier);

window.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && gameState.isShopOpen) {
		closeShopMenu();
	}
});

window.addEventListener("resize", () => {
	layoutGameObjects();
});

// Initialize difficulty to normal
setDifficulty("normal");
layoutGameObjects();
updateStats();
