'use strict'

import {app, protocol, BrowserWindow, ipcMain, dialog} from 'electron'
import {createProtocol} from 'vue-cli-plugin-electron-builder/lib'
import installExtension, {VUEJS_DEVTOOLS} from 'electron-devtools-installer'
import request from 'request'
import util from 'util'
import path from 'path'
import fs from 'fs'

const getPromise = util.promisify(request.get);
const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    {scheme: 'app', privileges: {secure: true, standard: true}}
])

let mainList = []

async function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 450,
        height: 650,
        webPreferences: {
            nodeIntegration: true
        }
    })

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
        if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }

    await regCrawlList();
}

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
    console.log(url);

    let cards = [];
    await getPromise(url).then((value) => {
        console.log(value.body)
        let jsonObj = JSON.parse(value.body);
        cards = jsonObj.data.cards;
        for (let i = 0; i < cards.length; i++) {
            let mblog = cards[i].mblog;
            if (mblog != null) {
                let createAt = mblog.created_at.toString()
                if (!checkDate(createAt, startDate, endDate)) {
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
                                "date": createAt,
                            })
                        }
                    }
                }
            }
        }
        sender.send('crawl-list-add', page, mainList.length)
    })

    // return cards.length;
    return 0;
}

function handleList(urlList, sender) {
    // 去重
    urlList = Array.from(new Set(urlList))

    dialog
        .showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
        .then(async res => {
            let savePathPrefix = res.filePaths[0]
            if (savePathPrefix == null || savePathPrefix === "") {
                return
            }
            for (let i = 0; i < urlList.length; i++) {
                let imgPath = path.join(savePathPrefix, (i + 1) + '_' + urlList[i].date + getSuffix(urlList[i].url));
                await sleep(1000)
                downloadAndSave(urlList[i].url, imgPath, sender)
            }
        })
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

function checkDate(checkDate, startDate, endDate) {
    // console.log(checkDate, startDate, endDate)
    return true
}

function transWeiboDateStrToTimeStamp(weiboDateStr) {
    if (weiboDateStr == null || "".equals(weiboDateStr)) {
        return 0;
    }
    if (weiboDateStr.contains("秒前")) {
        weiboDateStr = weiboDateStr.replace("秒前", "");
        let second = Integer.valueOf(weiboDateStr);
        return System.currentTimeMillis() - second * 1000;
    }
    if (weiboDateStr.contains("分钟前")) {
        weiboDateStr = weiboDateStr.replace("分钟前", "");
        let second = Integer.valueOf(weiboDateStr);
        return System.currentTimeMillis() - second * 1000 * 60;
    }
    if (weiboDateStr.contains("小时前")) {
        weiboDateStr = weiboDateStr.replace("小时前", "");
        let second = Integer.valueOf(weiboDateStr);
        return System.currentTimeMillis() - second * 1000 * 3600;
    }
    if (weiboDateStr.contains("昨天")) {
        let yesterdayTimestamp = new Date(System.currentTimeMillis() - 1000 * 60 * 60 * 24);
        let simpleDateFormat = new SimpleDateFormat("yyyyMMdd");
        let yesterday = simpleDateFormat.format(yesterdayTimestamp);
        weiboDateStr = weiboDateStr.replace("昨天", yesterday);
        let sDateFormat = new SimpleDateFormat("yyyyMMdd HH:mm");
        try {
            let date = sDateFormat.parse(weiboDateStr);
            return date.getTime();
        } catch (e) {
            return 0;
        }
    }
    if (weiboDateStr.contains("-")) {
        if (!weiboDateStr.startsWith("20")) {
            let year = new Date().getYear() + 1900;
            weiboDateStr = year + "-" + weiboDateStr;
        }
        let sDateFormat = new SimpleDateFormat("yyyy-MM-dd");
        try {
            let date = sDateFormat.parse(weiboDateStr);
            return date.getTime();
        } catch (e) {
            return 0;
        }
    }
    return 0;
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

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

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
    createWindow()
})

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
