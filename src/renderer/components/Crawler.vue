<template>
  <div id="container">
    <el-form ref="form" :model="form" label-width="80px">
      <el-form-item label="用户Id">
        <el-input v-model="form.userId"
                  placeholder="请输入Id"
                  style="width: 95%"
                  clearable>
        </el-input>
      </el-form-item>
      <el-form-item label="发表时间">
        <el-col :span="11">
          <el-date-picker type="date" placeholder="开始日期" v-model="form.date1"
                          style="width: 100%;"></el-date-picker>
        </el-col>
        <el-col class="line" :span="2">-</el-col>
        <el-col :span="11">
          <el-date-picker type="date" placeholder="结束日期" v-model="form.date2"
                          style="width: 100%;"></el-date-picker>
        </el-col>
      </el-form-item>
      <el-form-item>
        <el-button id="submitBtn" type="primary" @click="onSubmit" :disabled="btnDisabledStatus">立即下载</el-button>
      </el-form-item>
    </el-form>

    <div id="crawl-list" v-if="showCrawlList">
      <span v-text="crawlListText"></span>
    </div>
    <div id="process-bar" v-if="showProcessBar">
      <el-progress
          :text-inside="true"
          :percentage="$data.downloadPercent"
          :stroke-width="22"
          :color="processBarColor"
      ></el-progress>
    </div>
  </div>
</template>

<style scoped>
#container {
  margin-top: 20px;
}

#submitBtn {
  margin-left: -80px;
}

#process-bar {
  width: 85%;
  margin-left: 42px;
  margin-top: 15px;
}

</style>

<script>
const {ipcRenderer} = window.require('electron')

export default {
  name: 'Crawler',
  data() {
    return {
      form: {
        userId: '',
        date1: '',
        date2: ''
      },
      crawlListLength: 0,
      downloaded: 0,
      downloadPercent: 0,
      showCrawlList: false,
      btnDisabledStatus: false,
      showProcessBar: false,
      processBarColor: '#5cb87a',
      crawlListText: ''
    }
  },
  mounted: function () {
    this.listenAddCrawlList();
    this.listenDownloadList();
    this.listenDownloadCanceled();
  },
  methods: {
    onSubmit() {
      this.downloaded = 0;

      // Check valid
      if (this.form.date1.getTime() > this.form.date2.getTime()) {
        let temp = this.form.date1;
        this.form.date1 = this.form.date2;
        this.form.date2 = temp;
      }

      this.form.date2.setHours(23, 59, 59, 999);

      ipcRenderer.send('crawl-list', this.form.userId, this.form.date1, this.form.date2)
      if (!this.showCrawlList) {
        this.showCrawlList = true
      }
      if (!this.btnDisabledStatus) {
        this.btnDisabledStatus = true;
      }
    },
    listenAddCrawlList() {
      let that = this
      ipcRenderer.on('crawl-list-add', function (e, pageIndex, mainListLength) {
        that.crawlListLength = mainListLength;
        that.crawlListText = '目前扫描' + pageIndex + "页，预计下载图片" + mainListLength + "张！"
      })
    },
    listenDownloadList() {
      let that = this
      that.downloaded = 0
      ipcRenderer.on('crawl-download', function () {
        if (!that.showProcessBar) {
          that.showProcessBar = true
        }
        that.downloaded++;
        that.downloadPercent = Number((that.downloaded / that.crawlListLength * 100).toFixed(2))

        // 下载完成
        console.log(that.downloaded, that.crawlListLength)

        if (that.downloaded === that.crawlListLength) {
          that.btnDisabledStatus = false;
          that.downloaded = 0;
          that.crawlListText = '下载已完成';
        }
      })
    },
    listenDownloadCanceled() {
      let that = this
      ipcRenderer.on('crawl-download-canceled', function () {
        that.btnDisabledStatus = false;
        that.downloaded = 0;
      })
    }
  },
};
</script>
