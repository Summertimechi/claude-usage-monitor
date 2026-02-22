const { Tray, nativeImage, screen, Menu, app } = require('electron');
const path = require('path');

let tray = null;

function createTray(popupWindow, { getOpenAtLogin, setOpenAtLogin } = {}) {
  const assetsDir = path.join(__dirname, '..', '..', 'assets');
  let icon;

  if (process.platform === 'darwin') {
    // Usage bar chart icon — macOS auto-colors for light/dark mode
    icon = nativeImage.createFromPath(path.join(assetsDir, 'UsageTemplate.png'));
    icon.setTemplateImage(true);
  } else {
    icon = nativeImage.createFromPath(path.join(assetsDir, 'icon-win.ico'));
  }

  tray = new Tray(icon);
  tray.setToolTip('Claude Usage Monitor');

  function buildContextMenu() {
    return Menu.buildFromTemplate([
      { label: 'Show Monitor', click: () => showPopup(popupWindow) },
      { label: 'Refresh Now', click: () => {
        try {
          if (popupWindow && !popupWindow.isDestroyed()) {
            popupWindow.webContents.send('trigger-refresh');
          }
        } catch { /* ignore */ }
      }},
      { type: 'separator' },
      { label: 'Launch at Login', type: 'checkbox', checked: getOpenAtLogin ? getOpenAtLogin() : false, click: (menuItem) => {
        if (setOpenAtLogin) setOpenAtLogin(menuItem.checked);
      }},
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
  }

  const contextMenu = buildContextMenu();

  if (process.platform === 'darwin') {
    tray.on('click', (event, bounds) => {
      togglePopup(popupWindow, bounds);
    });
    tray.on('right-click', () => {
      tray.popUpContextMenu(contextMenu);
    });
  } else {
    tray.setContextMenu(contextMenu);
    tray.on('click', (event, bounds) => {
      togglePopup(popupWindow, bounds);
    });
  }

  return tray;
}

function showPopup(popupWindow) {
  try {
    if (!popupWindow || popupWindow.isDestroyed()) return;
    const trayBounds = tray.getBounds();
    positionAndShow(popupWindow, trayBounds);
  } catch { /* window destroyed */ }
}

function togglePopup(popupWindow, trayBounds) {
  try {
    if (!popupWindow || popupWindow.isDestroyed()) return;

    if (popupWindow.isVisible()) {
      popupWindow.hide();
      return;
    }

    positionAndShow(popupWindow, trayBounds);
  } catch { /* window destroyed mid-operation */ }
}

function positionAndShow(popupWindow, trayBounds) {
  if (!popupWindow || popupWindow.isDestroyed()) return;

  const { width: winWidth, height: winHeight } = popupWindow.getBounds();
  let x, y;

  if (process.platform === 'darwin') {
    x = Math.round(trayBounds.x + trayBounds.width / 2 - winWidth / 2);
    y = Math.round(trayBounds.y + trayBounds.height);
  } else {
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    x = Math.round(trayBounds.x + trayBounds.width / 2 - winWidth / 2);
    y = Math.round(display.workArea.y + display.workArea.height - winHeight);
  }

  popupWindow.setPosition(x, y, false);
  popupWindow.show();
  popupWindow.focus();
}

module.exports = { createTray };
