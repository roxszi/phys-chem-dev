<!--
  andor数据文件合并：asc文件转为xlsx文件
 -->

<!--
  视图层
-->
<template>

  <!--
    读取数据文件夹按钮及容器
    onChange：图片上传、删除时触发。
   -->
  <MyButton
    :disabled="isGetFoldRef"
    :loading="isBtnLoadingRef"
    size="large"
    :theme="isGetFoldRef ? 'success' : 'primary'"
    @click="onButtonClicked"
  >
    {{ isGetFoldRef ? `一键导出${ fileCountsRef }个数据` : "挂载文件夹" }}
  </MyButton>

</template>

<!-- 逻辑层 -->
<script setup>
// 导入vue的框架方法
import { ref } from "vue"
// 导入自有方法
import my from "@/utils/myFunc.js"
// 引入各类方法
import { aoaTranspose, aoaMapToWorkbook, downloadXlsx } from "@/utils/app-xlsx.js"

// Ref状态：是否读取到文件夹
const isGetFoldRef = ref(false)
// Ref状态：读取到的有效文件数量
const fileCountsRef = ref(0)
// Ref状态：是否显示按钮加载圈
const isBtnLoadingRef = ref(false)
/**
 * Andor数据文件合并业务的数据对象
 * @typedef { object } AndorAscsToXlsx
 * @property { string[] } projectObj.fileNameArr (有效)文件名数组
 * @property { FileSystemFileHandle[] } projectObj.fileHandleArr 文件句柄数组
 */
/** Andor数据文件合并业务的数据对象 @type { AndorAscsToXlsx } */
const andorAscsToXlsxObj = {
  fileNameArr: null,
  fileHandleArr: null
}

/**
 * 按钮被按下的回调
 * 根据是否读取到文件夹，决定调用哪个函数
 */
function onButtonClicked() { try {
  // 接参数
  const isGetFold = isGetFoldRef.value
  // 若读取到了文件夹，则调用“导出excel”函数
  if (isGetFold) {
    ascsToXlsx()
  // 若没读取到文件夹，则调用“读取数据文件夹”函数
  } else {
    readDataDirectory()
  }
} catch (error) {
  console.error("onButtonClicked()报错: ", error)
  // 关闭加载动画
  isBtnLoadingRef.value = false
  // 直接对话框报错
  my.dialog({
    theme: "danger",
    header: "读取数据报错",
    body: error
  })
}}

/**
 * 读取(.asc)数据文件夹
 * 内容为各类.asc文件，但是可能混有别的文件，所以要筛
 * @note 会读写projectObj的fileNameArr和fileHandleArr
 */
async function readDataDirectory() {
  // 显示按钮加载动画
  isBtnLoadingRef.value = true
  // 先清零旧的file数据
  andorAscsToXlsxObj.fileNameArr = null
  andorAscsToXlsxObj.fileHandleArr = null
  // 建个空数组，用来装文件名和句柄内容
  const fileNameArr = []
  const fileHandleArr = []
  // 打开文件夹，返回句柄。句柄成员对象：kind、name
  // @ts-ignore
  const dirHandle = await window.showDirectoryPicker()
  // 处理句柄，得到异步迭代器
  const asyncIter = dirHandle.entries()
  // 异步迭代
  forEachFile: for await (const [fileName, fileHandle] of asyncIter) {
    // 按“.”拆分，提取最后一个，即为文件扩展名
    const fileNameExt = fileName.split(".").slice(-1)[0]
    // 检查扩展名是否是"asc"
    if (fileNameExt != "asc") {
      // 不是，则直接跳过本次遍历
      continue forEachFile
    }
    // 是，则构造文件名。先看看前一个扩展名有没有“sif”
    const fileNameSecExt = fileName.split(".").slice(-2, -1)[0]
    // 有则去掉sif，没有就不用去了，然后合并拼凑文件名
    const fileNamePure = (fileNameSecExt === "sif")
      ? fileName.split(".").slice(0, -2).join(".")
      : fileName.split(".").slice(0, -1).join(".")
    // 推入文件名数组
    fileNameArr.push(fileNamePure)
    // 文件句柄也推进句柄数组
    fileHandleArr.push(fileHandle)
  }
  // 搞定，检查一下文件数量
  const fileNameArrLength = fileNameArr.length
  // 如果文件数量为0，则提示用户重新选择文件夹
  if (fileNameArrLength === 0) {
    // 提示失败
    my.dialog({
      theme: "warning",
      header: "读取失败",
      body: "所选的文件夹里找不到有效的.asc数据文件。"
    })
  // 如果文件数量不为0，则提示用户成功读取
  } else {
    // 把文件对象输出到项目全局对象
    andorAscsToXlsxObj.fileNameArr = fileNameArr
    andorAscsToXlsxObj.fileHandleArr = fileHandleArr
    // 更新Ref状态
    fileCountsRef.value = fileNameArrLength
    isGetFoldRef.value = true
    // 提示成功
    my.dialog({
      theme: "success",
      header: "读取成功",
      body: `获得有效数据文件 ${ fileNameArrLength } 个，可一键导出。`
    })
  }
  // 关闭加载动画
  isBtnLoadingRef.value = false
}

/**
 * 读取(.asc)数据文件夹
 * 内容为各类.asc文件，但是可能混有别的文件，所以要筛
 */
async function ascsToXlsx() {
  // 显示按钮加载动画
  isBtnLoadingRef.value = true
  // 从项目全局接文件对象
  const fileNameArr = andorAscsToXlsxObj.fileNameArr
  const fileHandleArr = andorAscsToXlsxObj.fileHandleArr
  // 新建一个数组用来装数据
  const fileDataAoa = []
  // 遍历文件
  for (let i = 0; i < fileNameArr.length; i++) {
    // 从句柄获取文件
    const file = await fileHandleArr[i].getFile()
    // 从文件获取text数据
    const fileText = await file.text()
    // 按换行拆分成数组
    const lineBreakReg = new RegExp(/\r?\n/)
    const fileTextArr = fileText.split(lineBreakReg)
    // 如果数组最后一个元素为空，则删掉
    if (!fileTextArr.slice(-1)[0]) {
      fileTextArr.splice(-1)
    }
    // 准备拆分数组内的tab空格
    const tabReg = new RegExp(/\t/)
    // 新建一个AOA数组用来装每个文件的数据
    // 第一个Arr是X轴数据，先把X装进去
    const fileDataUniAoa = []
    // 这里需要注意，有的文件可能只有1列Y数据，还有的文件可能有多列Y数据
    // 所以要判断一下，用第一行数据来判断
    const fileDataFristLineArr = fileTextArr[0].split(tabReg)
    // 如果数组最后一个元素为空，则删掉
    if (!fileDataFristLineArr.slice(-1)[0]) {
      fileDataFristLineArr.splice(-1)
    }
    // 装X
    fileDataUniAoa[0] = ["X", fileDataFristLineArr[0]]
    // 遍历装Y数据
    for (let k = 1; k < fileDataFristLineArr.length; k++) {
      // 装Y
      fileDataUniAoa[k] = [fileNameArr[i], fileDataFristLineArr[k]]
    }
    // 第一行搞定，数据结构也搞定了，接下来继续处理
    // 遍历文件Text化的字符串数组
    for (let j = 1; j < fileTextArr.length; j++) {
      // 按tab拆分成数组，内容就是X和Y数据
      const fileDataUniArr = fileTextArr[j].split(tabReg)
      // 遍历装X和Y数据
      for (let k = 0; k < fileDataUniAoa.length; k++) {
        // 装X和Y
        fileDataUniAoa[k].push(fileDataUniArr[k])
      }
    }
    // 数据数组装箱
    fileDataAoa.push(...fileDataUniAoa)
  }
  // 处理完毕，构造AoaMap
  const fileDataAoaMap = new Map()
  // Key是“rawData”，Value是转置后的原始数据
  fileDataAoaMap.set("rawData", aoaTranspose(fileDataAoa))
  // 构造Excel工作簿
  const workbook = aoaMapToWorkbook(fileDataAoaMap)
  // 关闭按钮加载动画
  isBtnLoadingRef.value = false
  // 下载Excel文件
  downloadXlsx(workbook, "andor-data.xlsx")
}

</script>
