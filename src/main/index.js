import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import path, { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { fileURLToPath } from "url";
import { dirname } from "path";
const fs = require("fs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: "SpreadCombine",
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../resources/icon.png'), // Adjust path as needed,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]).then(() => {
      mainWindow.setTitle("SpreadCombine");
    });
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.nazzzinfotech");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  ipcMain.handle("save_file", async (_event, data, options) => {
    const { title = "Save", filter } = options || {};

    try {
      const filePath = dialog.showSaveDialogSync({
        title,
        filters: filter,
      });

      if (filePath) {
        fs.writeFileSync(filePath, data);
        return { success: true, filePath };
      } else {
        return { success: false, message: "File saving cancelled" };
      }
    } catch (error) {
      console.error(error);
      return { success: false, message: `Error saving file: ${error.message}` };
    }
  });

  ipcMain.handle("open_folder", async (_event, folderPath) => {
    try {
      if (!folderPath) {
        throw new Error("No folder path provided");
      }
      const result = await shell.openPath(folderPath);
      if (result) {
        // shell.openPath returns a string if there's an error
        throw new Error(result);
      }
      return { success: true };
    } catch (error) {
      console.error("Error in open_folder:", error);
      return { success: false, message: error.message };
    }
  });

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
