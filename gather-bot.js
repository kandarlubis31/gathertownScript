const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// ===== KONFIGURASI =====
const CONFIG = {
  gatherUrl: "https://app.gather.town/app/meSyF1PWGYwPMrbF/pustekinfo",
  startTime: "09:00",
  endTime: "15:00",
  moveInterval: 5, // menit
  checkInterval: 2, // menit
  userDataDir: "./gather-chrome-data",
  logFile: "gather-bot.log",
  maxLogSize: 2 * 1024 * 1024, // 2 MB
  playerName: "Aulia Iskandar Lubis",
  maxRetries: 3,
  timeout: 120000, // 2 menit
};

// ===== FUNGSI UTILITAS =====
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
  const timestamp = new Date().toLocaleString("id-ID");
  const msg = `[${timestamp}] ${message}`;
  console.log(msg);

  try {
    if (
      fs.existsSync(CONFIG.logFile) &&
      fs.statSync(CONFIG.logFile).size > CONFIG.maxLogSize
    ) {
      const backupFile = CONFIG.logFile.replace(
        ".log",
        `-${Date.now()}.bak.log`
      );
      fs.renameSync(CONFIG.logFile, backupFile);
      log(`Log file di-rotate ke ${backupFile}`);
    }
    fs.appendFileSync(CONFIG.logFile, msg + "\n");
  } catch (err) {
    console.error("Gagal menulis log:", err.message);
  }
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWithinWorkingHours() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTime(CONFIG.startTime);
  const endMinutes = parseTime(CONFIG.endTime);

  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

async function waitUntilStartTime() {
  while (!isWithinWorkingHours()) {
    const now = new Date().toLocaleTimeString("id-ID");
    log(`⏰ Belum waktunya (sekarang ${now}). Tunggu 1 menit...`);
    await sleep(60000);
  }
  log("✅ Jam kerja dimulai!");
}

function getRandomMovement() {
  const movements = ["w", "a", "s", "d"];
  return movements[Math.floor(Math.random() * movements.length)];
}

// ===== FUNGSI UNTUK MENONAKTIFKAN MIC & KAMERA =====
async function disableMediaPermissions(page) {
  log("🔇 Menonaktifkan permintaan mic dan kamera...");

  try {
    // Cek apakah ada tombol mic yang aktif
    const micButtons = await page.$$(
      'button[aria-label*="microphone"], button[aria-label*="Mic"]'
    );
    for (const micBtn of micButtons) {
      const isActive = await micBtn.evaluate((el) => {
        return (
          el.getAttribute("aria-pressed") === "true" ||
          el.classList.contains("active") ||
          el.querySelector(".active") !== null
        );
      });

      if (isActive) {
        await micBtn.click();
        log("🎙️ Microphone berhasil dimatikan");
        await sleep(1000);
      }
    }

    // Cek apakah ada tombol kamera yang aktif
    const camButtons = await page.$$(
      'button[aria-label*="camera"], button[aria-label*="Cam"]'
    );
    for (const camBtn of camButtons) {
      const isActive = await camBtn.evaluate((el) => {
        return (
          el.getAttribute("aria-pressed") === "true" ||
          el.classList.contains("active") ||
          el.querySelector(".active") !== null
        );
      });

      if (isActive) {
        await camBtn.click();
        log("📷 Kamera berhasil dimatikan");
        await sleep(1000);
      }
    }
  } catch (err) {
    log(`⚠️ Gagal menonaktifkan mic/kamera: ${err.message}`);
  }
}

// ===== FUNGSI UNTUK KLIK JOIN =====
async function clickJoinButton(page) {
  log("🔍 Mencari tombol Join...");

  try {
    // Tunggu tombol Join muncul dengan berbagai selector
    await page.waitForFunction(
      () => {
        // Cari tombol dengan teks "Join" dan atribut type="submit"
        const buttons = Array.from(
          document.querySelectorAll('button[type="submit"]')
        );
        return buttons.some((btn) => btn.textContent.trim() === "Join");
      },
      { timeout: CONFIG.timeout }
    );

    // Klik tombol Join dengan berbagai cara
    const joinClicked = await page.evaluate(() => {
      // Cara 1: Berdasarkan teks dan atribut
      const submitButtons = Array.from(
        document.querySelectorAll('button[type="submit"]')
      );
      const joinButton = submitButtons.find(
        (btn) => btn.textContent.trim() === "Join"
      );

      if (joinButton) {
        joinButton.click();
        return true;
      }

      // Cara 2: Berdasarkan atribut kind="primary"
      const primaryButtons = Array.from(
        document.querySelectorAll('button[kind="primary"]')
      );
      const primaryJoinButton = primaryButtons.find(
        (btn) => btn.textContent.trim() === "Join"
      );

      if (primaryJoinButton) {
        primaryJoinButton.click();
        return true;
      }

      // Cara 3: Berdasarkan teks saja
      const allButtons = Array.from(document.querySelectorAll("button"));
      const textJoinButton = allButtons.find(
        (btn) => btn.textContent.trim() === "Join"
      );

      if (textJoinButton) {
        textJoinButton.click();
        return true;
      }

      return false;
    });

    if (joinClicked) {
      log("🟢 Tombol Join berhasil diklik!");

      // Tunggu hingga canvas muncul (tanda sudah masuk ruangan)
      log("🎮 Menunggu Gather space load...");
      await page.waitForSelector("canvas", { timeout: CONFIG.timeout });
      log("✅ Berhasil masuk ke Gather space!");

      // Pastikan mic dan kamera mati setelah masuk
      await disableMediaPermissions(page);

      return true;
    }
  } catch (err) {
    log(`⚠️ Gagal klik tombol Join: ${err.message}`);
  }

  return false;
}

// ===== BOT UTAMA =====
async function runGatherBot() {
  let browser;
  let page;
  let retryCount = 0;

  try {
    log("🚀 Menjalankan Gather Bot...");
    log(`Jam kerja: ${CONFIG.startTime} - ${CONFIG.endTime}`);
    log(`Pengguna: ${CONFIG.playerName}`);
    log(`Menggunakan profil: ${CONFIG.userDataDir}`);

    if (!isWithinWorkingHours()) {
      await waitUntilStartTime();
    }

    browser = await puppeteer.launch({
      headless: false,
      userDataDir: CONFIG.userDataDir,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--auto-select-desktop-capture-source=Entire screen",
        "--mute-audio",
        "--disable-gpu", // Hemat GPU
        "--disable-dev-shm-usage", // Hemat memory
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI,BlinkGenPropertyTrees",
      ],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set permission untuk mic dan kamera
    const context = browser.defaultBrowserContext();
    await context.overridePermissions("https://app.gather.town", [
      "microphone",
      "camera",
      "notifications",
    ]);

    log("🌐 Membuka halaman Gather...");
    await page.goto(CONFIG.gatherUrl, {
      waitUntil: "networkidle2",
      timeout: CONFIG.timeout,
    });

    // Tunggu halaman termuat
    await sleep(3000);

    // Coba klik tombol Join
    const joinSuccess = await clickJoinButton(page);

    if (!joinSuccess) {
      log("❌ Gagal menemukan tombol Join. Mencoba reload...");
      await page.reload({ waitUntil: "networkidle2" });
      await sleep(3000);

      // Coba lagi setelah reload
      const retryJoinSuccess = await clickJoinButton(page);
      if (!retryJoinSuccess) {
        throw new Error("Gagal menemukan tombol Join setelah reload");
      }
    }

    let moveCounter = 0;
    const moveIntervalMs = CONFIG.moveInterval * 60000;
    const checkIntervalMs = CONFIG.checkInterval * 60000;

    // Fungsi untuk gerakan karakter
    async function moveCharacter() {
      if (!isWithinWorkingHours()) {
        log("🏁 Waktu kerja selesai. Menutup bot...");
        await browser.close();
        process.exit(0);
      }

      try {
        const canvasExists = await page.$("canvas");
        if (!canvasExists) {
          log("⚠️ Canvas tidak ditemukan! Mencoba reload...");
          await page.reload({ waitUntil: "networkidle2" });
          await page.waitForSelector("canvas", { timeout: 60000 });
          log("✅ Halaman berhasil di-reload");

          // Pastikan mic dan kamera tetap mati setelah reload
          await disableMediaPermissions(page);
        }

        const movement = getRandomMovement();
        await page.bringToFront();
        await page.keyboard.down(movement);
        await sleep(200);
        await page.keyboard.up(movement);
        moveCounter++;
        log(`🚶 Gerakan #${moveCounter}: "${movement.toUpperCase()}"`);
      } catch (err) {
        log(`⚠️ Gagal gerak: ${err.message}`);
      }
    }

    // Fungsi untuk mencegah idle
    async function preventIdle() {
      try {
        await page.mouse.move(
          640 + Math.random() * 10,
          360 + Math.random() * 10
        );
      } catch (err) {
        log(`⚠️ Mouse move gagal: ${err.message}`);
      }
    }

    // Set interval untuk gerakan
    const moveInterval = setInterval(moveCharacter, moveIntervalMs);
    const idleInterval = setInterval(preventIdle, 60000);

    // Set interval untuk status report
    setInterval(async () => {
      const now = new Date().toLocaleTimeString("id-ID");
      log(`✅ Status: Online | ${now} | Total gerak: ${moveCounter}`);
    }, checkIntervalMs);

    // Gerakan pertama setelah 15 detik
    setTimeout(moveCharacter, 15000);

    // Handle browser close
    browser.on("disconnected", () => {
      clearInterval(moveInterval);
      clearInterval(idleInterval);
      log("Browser tertutup, membersihkan interval...");
    });
  } catch (err) {
    log(`❌ ERROR: ${err.message}`);
    if (browser) await browser.close();

    retryCount++;
    if (retryCount <= CONFIG.maxRetries) {
      log(
        `🔄 Mencoba lagi dalam 5 menit... (Percobaan ${retryCount}/${CONFIG.maxRetries})`
      );
      setTimeout(runGatherBot, 5 * 60 * 1000);
    } else {
      log("❌ Maksimum percobaan tercapai. Bot berhenti.");
      process.exit(1);
    }
  }
}

// ===== INISIASI BOT =====
log("=========================================");
log("     🧠 GATHER AUTO ONLINE BOT STARTED   ");
log("=========================================");
runGatherBot();

// ===== HANDLE EXIT =====
process.on("SIGINT", async () => {
  log("👋 Dihentikan oleh user (Ctrl+C)");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  log(`💥 Uncaught Exception: ${err.message}`);
  log("🔄 Restart dalam 5 menit...");
  setTimeout(runGatherBot, 5 * 60 * 1000);
});

process.on("unhandledRejection", (reason, promise) => {
  log(`💥 Unhandled Rejection at: ${promise} reason: ${reason}`);
  log("🔄 Restart dalam 5 menit...");
  setTimeout(runGatherBot, 5 * 60 * 1000);
});
