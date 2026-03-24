const waterQualityValue = document.getElementById("waterQualityValue");
const waterSupplyValue = document.getElementById("waterSupplyValue");
const gameArea = document.getElementById("gameArea");
const pathElement = document.getElementById("path");
const wellElement = document.getElementById("well");
const dropletLayer = document.getElementById("dropletLayer");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const retryButton = document.getElementById("retryButton");
const instructionsOverlay = document.getElementById("instructionsOverlay");
const startButton = document.getElementById("startButton");
const openShopButton = document.getElementById("openShopButton");
const closeShopButton = document.getElementById("closeShopButton");
const shopPanel = document.getElementById("shopPanel");
const shopBackdrop = document.getElementById("shopBackdrop");

const WIN_SUPPLY_LITERS = 300;
const POLLUTED_CLICK_RADIUS = 24;

const gameState = {
	waterQuality: 100,
	waterSupplyLiters: 0,
	isGameOver: false,
	isShopOpen: false,
	droplets: [],
	spawnTimerId: null,
	animationFrameId: null,
	lastFrameTime: 0,
	pollutionChance: 0.35
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
		gameState.waterQuality -= 20;
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

function animateDroplets(timestamp) {
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

	gameState.animationFrameId = requestAnimationFrame(animateDroplets);
}

function clearAllDroplets() {
	for (let i = gameState.droplets.length - 1; i >= 0; i -= 1) {
		removeDroplet(gameState.droplets[i]);
	}
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

function startGame() {
	gameState.waterQuality = 100;
	gameState.waterSupplyLiters = 0;
	gameState.isGameOver = false;
	gameState.lastFrameTime = 0;

	clearAllDroplets();
	gameArea.classList.remove("win-celebration");
	updateStats();
	layoutGameObjects();

	overlay.classList.add("hidden");
	instructionsOverlay.classList.add("hidden");

	gameState.spawnTimerId = setInterval(createDroplet, 900);
	gameState.animationFrameId = requestAnimationFrame(animateDroplets);
}

retryButton.addEventListener("click", startGame);
startButton.addEventListener("click", startGame);
gameArea.addEventListener("click", handlePollutedDropClick);
openShopButton.addEventListener("click", openShopMenu);
closeShopButton.addEventListener("click", closeShopMenu);
shopBackdrop.addEventListener("click", closeShopMenu);

window.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && gameState.isShopOpen) {
		closeShopMenu();
	}
});

window.addEventListener("resize", () => {
	layoutGameObjects();
});

layoutGameObjects();
updateStats();
