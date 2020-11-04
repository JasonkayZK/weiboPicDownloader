## weibo-pic-downloader

<p align="center">
<image src="./public/Logo.png" width="320px" height="310px"></image>
    <div style="text-align:center; margin:0 auto">
        一个使用Electron-Vue + ElementUI构建的免登录下载微博图片的桌面爬虫应用；
    </div>
</p>

### 安装方法

**① 压缩包方式安装**

下载右侧对应平台的Release包，解压缩即可；

**② 源码编译**

克隆本项目：

```bash
git clone git@github.com:JasonkayZK/weiboPicDownloader.git
```

使用yarn或npm安装依赖：

```bash
npm install
或
yarn install
```

编译本项目：

```bash
# win平台：
npm run electron:build -- --win nsis
# mac平台：
npm run electron:build -- --mac
# linux平台：
npm run electron:build -- --linux deb
```

更多编译选项，见：

>   Vue CLI Plugin Electron Builder官方文档：
>
>   [Vue CLI Plugin Electron Builder](https://nklayman.github.io/vue-cli-plugin-electron-builder/)

### 更多说明

本项目采用MIT许可，大家可以在本代码的基础之上自由的做二次开发！

觉得好用的可以点个star鸭~

相关博文：

-   [手把手教你使用Electron开发新浪微博免登录图片下载器](https://jasonkayzk.github.io/2020/11/04/%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E4%BD%BF%E7%94%A8Electron%E5%BC%80%E5%8F%91%E6%96%B0%E6%B5%AA%E5%BE%AE%E5%8D%9A%E5%85%8D%E7%99%BB%E5%BD%95%E5%9B%BE%E7%89%87%E4%B8%8B%E8%BD%BD%E5%99%A8/)

