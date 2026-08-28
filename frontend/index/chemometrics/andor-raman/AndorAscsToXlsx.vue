<!--
  andor数据文件合并：asc文件转为xlsx文件
 -->

<!--
  视图层
 -->
<template>

  <!-- 读取数据文件夹 / 下载的按钮 -->
  <MyDownload
    :buffer="xlsxArrayBufferRef"
    name="andor-data.xlsx"
    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    :loading="isBtnLoadingRef"
    size="large"
    :theme="isGetFoldRef ? 'success' : 'primary'"
    @click="onButtonClicked"
  >
    {{ isGetFoldRef ? `一键导出${ fileCountsRef }个数据` : "挂载文件夹" }}
  </MyDownload>

</template>

<!-- 逻辑层 -->
<script setup lang="ts">
// 引入各类方法
import { aoaTranspose, aoaMapToXlsxArrayBuffer } from "@utils/xlsx.js"

/** Ref状态：是否读取到文件夹 */
const isGetFoldRef = shallowRef(false)
/** Ref状态：读取到的有效文件数量 */
const fileCountsRef = shallowRef(0)
/** Ref状态：是否显示按钮加载圈 */
const isBtnLoadingRef = shallowRef(false)
/** Ref状态：xlsx数据的ArrayBuffer对象 */
const xlsxArrayBufferRef = shallowRef<ArrayBuffer | null>(null)

/**
 * 按钮被按下的回调
 * 根据是否读取到文件夹，决定调用哪个函数
 */
async function onButtonClicked() { try {
  // 若还没读取到文件夹，则读取文件夹开启主业务
  if (!isGetFoldRef.value) {
    await main()
  }
} catch (err) {
  // 关闭加载动画
  isBtnLoadingRef.value = false
  // 如果错误是AbortError，直接返回即可
  if ((err as Error).name === "AbortError") return
  // 控制台打印错误信息
  console.error("onButtonClicked()报错: ", err)
  // 对话框报错
  myDialog({
    header: "读取数据报错",
    body: (err as Error).toString()
  })
}}

/**
 * 主业务
 */
async function main() {
  // 显示按钮加载动画
  isBtnLoadingRef.value = true
  // 缓一缓，确保加载动画开始
  await nextTick()
  // 读取数据文件夹，获得文件名数组、句柄数组
  const { fileNameArr, fileHandleArr, fileNameArrLength } = await readDataDirectory()
  // 获得xlsx的ArrayBuffer对象，赋值给Ref状态
  xlsxArrayBufferRef.value = await ascsToXlsxBuffer(fileNameArr, fileHandleArr)
  // 更新Ref状态
  fileCountsRef.value = fileNameArrLength
  isGetFoldRef.value = true
  // 提示成功
  myDialog({
    header: "读取成功",
    body: `获得有效数据文件 ${ fileNameArrLength } 个，可一键导出。`
  })
  // 关闭加载动画
  isBtnLoadingRef.value = false
}


/**
 * 读取(.asc)数据文件夹
 * @returns 文件名数组、句柄数组
 */
async function readDataDirectory() {
  // 建个空数组，用来装文件名和句柄内容
  const fileNameArr: string[] = []
  const fileHandleArr: FileSystemFileHandle[] = []
  // 打开文件夹，返回句柄。句柄成员对象：kind、name
  const dirHandle = await window.showDirectoryPicker()
  // 处理句柄，得到异步迭代器
  const asyncIter = dirHandle.entries()
  // 异步迭代
  forEachFile: for await (const [fileName, fileHandle] of asyncIter) {
    // 跳过文件夹
    if (fileHandle.kind === "directory") {
      continue forEachFile
    }
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
  // 如果文件数量为0，则报错
  if (fileNameArrLength === 0) {
    throw new Error("文件夹里没有有效的.asc数据文件。")
  }
  // 返回文件名数组、句柄数组
  return { fileNameArr, fileHandleArr, fileNameArrLength }
}

/**
 * 读取(.asc)数据文件夹为xlsx Buffer
 */
async function ascsToXlsxBuffer(fileNameArr:string[], fileHandleArr: FileSystemFileHandle[]) {
  // 检查文件是否存在
  if (
    !fileNameArr
    || !fileHandleArr
    || fileNameArr.length === 0
    || fileHandleArr.length === 0
  ) {
    // 文件读取Ref恢复
    isGetFoldRef.value = false
    // 提示失败
    throw new Error("文件对象不存在，请重新挂载文件夹。")
  }
  // 以Promise.all遍历文件获取uniAOA数据数组
  const fileDataAoaoa = await Promise.all(
    // 遍历文件名数组
    fileNameArr.map(async (name, i) => {
      // 从句柄获取文件
      const file = await fileHandleArr[i]!.getFile()
      // 解析文件获取数据
      const fileDataUniAoa = await parseAndorFile(file, name)
      // 返回数据
      return fileDataUniAoa
    })
  )
  // 把数据展平一个维度，即获得数据AOA
  const fileDataAoa = fileDataAoaoa.flat(1)
  // 处理完毕，构造AoaMap
  const fileDataAoaMap = new Map()
  // Key是“rawData”，Value是转置后的原始数据
  fileDataAoaMap.set("rawData", aoaTranspose(fileDataAoa))
  // 转为xlsx的ArrayBuffer对象
  const dataArrayBuffer = aoaMapToXlsxArrayBuffer(fileDataAoaMap)
  // 返回ArrayBuffer对象
  return dataArrayBuffer
}

/**
 * 解析Andor的.sif文件
 * @returns 单个文件的AOA数组
 */
async function parseAndorFile(file: File, fileName: string) {
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
  // 这里需要注意，除了必然存在的X数据外，有的文件可能只有1列Y数据，还有的文件可能有多列Y数据
  // 所以要判断一下，用第一行数据来判断
  const fileDataFristLineArr = fileTextArr[0]!.split(tabReg)
  // 如果数组最后一个元素为空，则删掉
  if (!fileDataFristLineArr.slice(-1)[0]) {
    fileDataFristLineArr.splice(-1)
  }
  // 装X数据
  fileDataUniAoa[0] = ["X", fileDataFristLineArr[0]]
  // 装Y数据
  // 如果只有1列Y数据
  if (fileDataFristLineArr.length === 2) {
    // 则直接装
    fileDataUniAoa[1] = [fileName, fileDataFristLineArr[1]]
  } else {
    // 否则遍历装Y数据
    for (let k = 1; k < fileDataFristLineArr.length; k++) {
      fileDataUniAoa[k] = [`${ fileName }-${ k }`, fileDataFristLineArr[k]]
    }
  }
  // 第一行搞定，数据结构也搞定了，接下来继续处理
  // 遍历文件Text化的字符串数组
  for (let j = 1; j < fileTextArr.length; j++) {
    // 按tab拆分成数组，内容就是X和Y数据
    const fileDataUniArr = fileTextArr[j]!.split(tabReg)
    // 遍历装X和Y数据
    for (let k = 0; k < fileDataUniAoa.length; k++) {
      // 装X和Y
      fileDataUniAoa[k]!.push(fileDataUniArr[k])
    }
  }
  // 返回AOA
  return fileDataUniAoa
}

</script>
