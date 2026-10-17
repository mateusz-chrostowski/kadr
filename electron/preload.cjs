const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("movieLibrary", {
  getLibrary: () => ipcRenderer.invoke("library:get"),
  chooseFolder: () => ipcRenderer.invoke("library:choose-folder"),
  openVideo: (videoPath) => ipcRenderer.invoke("library:open-video", videoPath),
  openFolder: (folderPath) => ipcRenderer.invoke("library:open-folder", folderPath)
});
