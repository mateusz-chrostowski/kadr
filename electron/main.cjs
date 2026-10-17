const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let mainWindow;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".bmp"]);
const VIDEO_EXTS = new Set([".mkv", ".mp4", ".avi", ".mov", ".wmv", ".m4v", ".webm", ".mpeg", ".mpg", ".ts"]);

function configPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

async function readSettings() {
  try { return JSON.parse(await fs.readFile(configPath(), "utf8")); }
  catch { return {}; }
}

async function saveSettings(settings) {
  await fs.mkdir(path.dirname(configPath()), { recursive: true });
  await fs.writeFile(configPath(), JSON.stringify(settings, null, 2), "utf8");
}

async function readText(filePath) {
  try {
    // UTF-8 is the standard. BOM is removed if present.
    return (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "").trim();
  } catch { return ""; }
}

async function listDir(dir) {
  try { return await fs.readdir(dir, { withFileTypes: true }); }
  catch { return []; }
}

async function scanLibrary(rootDir) {
  const movies = [];
  let nextId = 1;

  async function walk(dir) {
    const entries = await listDir(dir);
    const files = entries.filter(e => e.isFile()).map(e => e.name);
    const subdirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    const imageFiles = files.filter(name => IMAGE_EXTS.has(path.extname(name).toLowerCase()));
    const textFiles = files.filter(name => path.extname(name).toLowerCase() === ".txt");
    const videoFiles = files.filter(name => VIDEO_EXTS.has(path.extname(name).toLowerCase()));

    // A folder is a movie entry if it has a description, a cover, or a video.
    if (dir !== rootDir && (imageFiles.length || textFiles.length || videoFiles.length)) {
      const folderName = path.basename(dir);
      const normalized = s => s.toLowerCase().replace(/[\s_-]+/g, "");
      const coverName = imageFiles.find(n => ["cover", "poster", "okladka", "okładka", "folder"].includes(normalized(path.parse(n).name)))
        || imageFiles.find(n => normalized(path.parse(n).name) === normalized(folderName))
        || imageFiles[0];
      const descriptionName = textFiles.find(n => ["opis.txt", "description.txt", "info.txt", "plot.txt"].includes(n.toLowerCase()))
        || textFiles[0];
      const videoName = videoFiles.find(n => normalized(path.parse(n).name) === normalized(folderName)) || videoFiles[0];

      let coverDataUrl = null;
      let coverPath = null;
      if (coverName) {
        coverPath = path.join(dir, coverName);
        try {
          const bytes = await fs.readFile(coverPath);
          const ext = path.extname(coverName).toLowerCase();
          const mime = ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".bmp": "image/bmp" })[ext] || "application/octet-stream";
          coverDataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
        } catch {}
      }

      const descriptionPath = descriptionName ? path.join(dir, descriptionName) : null;
      const description = descriptionPath ? await readText(descriptionPath) : "";
      const fullVideoPath = videoName ? path.join(dir, videoName) : null;
      movies.push({
        id: String(nextId++),
        title: folderName,
        folderPath: dir,
        coverPath,
        coverDataUrl,
        description,
        descriptionPath,
        videoPath: fullVideoPath,
        videoName: videoName || null,
        files: files.length
      });
    }

    for (const subdir of subdirs.sort((a, b) => a.localeCompare(b, "pl"))) {
      await walk(path.join(dir, subdir));
    }
  }

  await walk(rootDir);
  return movies.sort((a, b) => a.title.localeCompare(b.title, "pl", { sensitivity: "base" }));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#0b0d12",
    title: "Moja Biblioteka Filmów",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("library:get", async () => {
  const settings = await readSettings();
  let rootDir = settings.rootDir;
  if (!rootDir) {
    const defaultVideos = path.join(app.getPath("videos"), "Filmy");
    try {
      const stat = await fs.stat(defaultVideos);
      if (stat.isDirectory()) rootDir = defaultVideos;
    } catch {}
  }
  if (!rootDir) return { rootDir: null, movies: [], needsFolder: true };
  try {
    const stat = await fs.stat(rootDir);
    if (!stat.isDirectory()) throw new Error("To nie jest folder.");
    return { rootDir, movies: await scanLibrary(rootDir), needsFolder: false };
  } catch (error) {
    return { rootDir, movies: [], needsFolder: true, error: error.message };
  }
});

ipcMain.handle("library:choose-folder", async () => {
  const settings = await readSettings();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Wybierz główny folder biblioteki filmów",
    defaultPath: settings.rootDir || app.getPath("videos"),
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const rootDir = result.filePaths[0];
  await saveSettings({ ...settings, rootDir });
  return { rootDir, movies: await scanLibrary(rootDir), needsFolder: false };
});

ipcMain.handle("library:open-video", async (_event, videoPath) => {
  if (!videoPath || typeof videoPath !== "string") return { error: "Nie znaleziono pliku wideo." };
  try {
    await fs.access(videoPath);
    const error = await shell.openPath(videoPath);
    return error ? { error } : { ok: true };
  } catch {
    return { error: "Plik wideo nie istnieje lub jest niedostępny." };
  }
});

ipcMain.handle("library:open-folder", async (_event, folderPath) => {
  if (!folderPath || typeof folderPath !== "string") return { error: "Nie znaleziono folderu." };
  try {
    await fs.access(folderPath);
    await shell.openPath(folderPath);
    return { ok: true };
  } catch {
    return { error: "Folder nie istnieje lub jest niedostępny." };
  }
});
