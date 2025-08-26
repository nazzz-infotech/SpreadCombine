import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  saveFile: (data, options) => ipcRenderer.invoke("save_file", data, options),
  openFolder: (path) => ipcRenderer.invoke("open_folder", path),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", {
      ...electronAPI,  // keep the default electron toolkit API
      ...api           // add your custom saveFile
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // fallback if contextIsolation = false
  window.electron = { ...electronAPI, ...api };
}