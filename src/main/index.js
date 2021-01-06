'use strict'

/* global __static */
import {app, BrowserWindow, ipcMain, dialog} from 'electron'
import installExtension, {VUEJS_DEVTOOLS} from 'electron-devtools-installer'
import request from 'request'
import util from 'util'
import path from 'path'
import fs from 'fs'
import {formatDate} from "element-ui/src/utils/date-util";

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

async function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 450,
    height: 650,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  await regCrawlList();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  await createWindow()
})
// app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

const getPromise = util.promisify(request.get);
const isDevelopment = process.env.NODE_ENV !== 'production'

let mainList = []

function regCrawlList() {
  ipcMain.on('crawl-list', async (e, userId, startDate, endDate) => {
    // re-init list
    mainList = []
    // crawl-index
    let pageIndex = 1;
    // 防封，分析一次页面休息+1S
    const interval = 1000;

    // 获取全部url
    while (await getAllImageUrl(userId, startDate, endDate, pageIndex, e.sender) > 0) {
      console.log('分析微博：' + pageIndex);
      pageIndex++;
      await sleep(interval);
    }

    // 获取完毕，触发下载
    handleList(mainList, e.sender)
  })
}

async function getAllImageUrl(userId, startDate, endDate, page, sender) {
  let url = "https://m.weibo.cn/api/container/getIndex?count=25&page=" + page + "&containerid=" + userIdToContainerId(userId);

  let cards = [];
  let lastCreateAt = new Date();
  await getPromise(url).then((value) => {
    console.log(value.body)
    let jsonObj = JSON.parse(value.body);
    cards = jsonObj.data.cards;
    for (let i = 0; i < cards.length; i++) {
      let mblog = cards[i].mblog;
      if (mblog != null) {
        lastCreateAt = mblog.created_at.toString()
        lastCreateAt = getDate(transWeiboDateStrToTimeStamp(lastCreateAt))
        if (!checkDate(lastCreateAt, startDate, endDate)) {
          console.log(lastCreateAt, startDate, endDate)
          continue;
        }
        let pics = mblog.pics;
        if (pics != null) {
          for (let j = 0; j < pics.length; j++) {
            let large = pics[j].large;
            if (large != null) {
              let iUrl = large.url
              mainList.push({
                "url": iUrl,
                "date": formatDate(lastCreateAt),
              })
            }
          }
        }
      }
    }
    sender.send('crawl-list-add', page, mainList.length)
  })

  // 如果最后一个微博已经小于开始，可直接退出；
  return cards.length === 0 ? 0 : ((new Date(lastCreateAt)).getTime() >= (new Date(startDate)).getTime());
}

function handleList(urlList, sender) {
  // 去重
  urlList = Array.from(new Set(urlList))

  // 空数组直接取消下载
  if (urlList.length === 0) {
    sender.send('crawl-download-canceled')
  }

  dialog
      .showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']}, async (filePaths, bookMarks) => {
        let savePathPrefix = filePaths[0]

        console.log(savePathPrefix)
        if (savePathPrefix == null || savePathPrefix === "") {
          return
        }
        for (let i = 0; i < urlList.length; i++) {
          let imgPath = path.join(savePathPrefix, (i + 1) + '_' + urlList[i].date + getSuffix(urlList[i].url));
          await sleep(1000)
          downloadAndSave(urlList[i].url, imgPath, sender)
        }
      });
}

function checkDate(checkDate, startDate, endDate) {
  return checkDate.getTime() >= (new Date(startDate)).getTime() && checkDate.getTime() <= (new Date(endDate)).getTime();
}

function getDate(dateTimestamp) {
  return new Date(dateTimestamp);
}

function transWeiboDateStrToTimeStamp(weiboDateStr) {
  console.log("translate before: " + weiboDateStr)
  if (weiboDateStr == null || "" === weiboDateStr) {
    return 0;
  }
  if (weiboDateStr.search("秒前") >= 0) {
    weiboDateStr = weiboDateStr.replace("秒前", "");
    let second = parseInt(weiboDateStr);
    return new Date().getTime() - second * 1000;
  }
  if (weiboDateStr.search("分钟前") >= 0) {
    weiboDateStr = weiboDateStr.replace("分钟前", "");
    let minite = parseInt(weiboDateStr);
    return new Date().getTime() - minite * 1000 * 60;
  }
  if (weiboDateStr.search("小时前") >= 0) {
    weiboDateStr = weiboDateStr.replace("小时前", "");
    let hours = parseInt(weiboDateStr);
    return new Date().getTime() - hours * 1000 * 3600;
  }
  if (weiboDateStr.search("昨天") >= 0) {
    return new Date().getTime() - 1000 * 60 * 60 * 24
  }
  if (weiboDateStr.search('-') >= 0) {
    if (!weiboDateStr.startsWith("20")) {
      let year = new Date().getFullYear();
      weiboDateStr = year + "-" + weiboDateStr;
    }
    try {
      return parseDate(weiboDateStr).getTime();
    } catch (e) {
      return 0;
    }
  }
  return 0;
}

function parseDate(input, format) {
  format = format || 'yyyy-mm-dd'; // default format
  let parts = input.match(/(\d+)/g),
      i = 0, fmt = {};
  // extract date-part indexes from the format
  format.replace(/(yyyy|dd|mm)/g, function (part) {
    fmt[part] = i++;
  });

  return new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']]);
}

function getSuffix(iUrl) {
  if (!iUrl.substring(iUrl.lastIndexOf("/")).includes(".")) {
    return ".jpg";
  }
  try {
    return iUrl.substring(iUrl.lastIndexOf("."));
  } catch (e) {
    // default
    console.error(e)
  }
  return ".jpg";
}

function downloadAndSave(fileUrl, targetSavePath, sender) {
  let out = fs.createWriteStream(targetSavePath);
  request({
    method: 'GET', uri: fileUrl
  }).on('end', function () {
    sender.send('crawl-download', fileUrl)
  }).pipe(out);
}

function userIdToContainerId(userId) {
  if (userId === null) {
    return "0";
  }
  return "107603" + userId;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
