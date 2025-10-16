<!--
  轮廓-比色法业务
  结合了轮廓识别 + 比色法实现，用于胡影和奚俊婷的化学动力学教学实验
  计算机视觉库的实现，以及一些交互的设计思路。
  构建OpenCV.js：https://docs.opencv.ac.cn/4.12.0/d4/da1/tutorial_js_setup.html
  交互主要分3步完成，共4个状态：
  1.  读取图片/上传图片。读取到的图片将渲染到<img>/canvas上。
      此处的交互主要就是上传图片。
      此步骤将保存原图片的Mat对象，以便后续使用。
  2.  裁剪图片为合适的尺寸。裁剪完毕后将裁剪好的图片渲染在canvas上。
  3.  调参。
      3.1 二值化阈值。阈值化方法的参数。
      3.2 圆径缩放因子 (Diameter scaling factor)。用于调整轮廓实际采样的圆径大小。
      3.3 近圆度 (Circularity)。[轮廓面积] ÷ [最小外接圆面积]，用于筛选近圆形轮廓。
      3.4 面积位次 (AreaOrder)。用于筛选轮廓面积。
  4.  数据导出。此处不用再有复杂交互。
 -->

<!-- 视图层 -->
<template><MySpace>

  <!-- 警报框 -->
  <t-alert theme="info" :title="lang.FunctionIntroductionTitle">
    <div v-for="(content, index) of lang.FunctionIntroductionContent" :key="index">
      {{ content }}
    </div>
  </t-alert>

  <!-- canvas头-步骤1 -->
  <!-- 警报框 -->
  <t-alert
    v-if="taskStatusRef === 1"
    theme="warning" :title="lang.SetpTitle + '1'"
  >
    <div v-for="(content, index) of lang.Setp1Content" :key="index">
      {{ content }}
    </div>
  </t-alert>

  <!--
    图片上传
    这个一直都存在，方便用户删除上传的图片
    onPicChange：图片上传、删除时触发。
      上传则处理图片并进入下个流程；
      删除则清空所有数据，回到初始状态（状态1）。
   -->
  <t-upload
    :disabled="false" class="center"
    theme="image" :multiple="false" :draggable="false"
    :showImageFileName="true" :abridgeName="[3, 8]"
    v-model:files="fileArrRef" :autoUpload="false"
    :sizeLimit="{ size: 10, unit: 'MB' }"
    :onChange="onPicChange"
  />

  <!-- canvas头-步骤2 -->
  <!-- 警报框 -->
  <t-alert
    v-if="taskStatusRef === 2"
    theme="warning" :title="lang.SetpTitle + '2'"
  >
    <div v-for="(content, index) of lang.Setp2Content" :key="index">
      {{ content }}
    </div>
  </t-alert>

  <!-- canvas头-步骤3 -->
  <!-- 警报框 -->
  <t-alert
    v-if="taskStatusRef === 3"
    theme="warning" :title="lang.SetpTitle + '3'"
  >
    <div v-for="(content, index) of lang.Setp3Content" :key="index">
      {{ content }}
    </div>
  </t-alert>

  <!--
    canvas元素块
    这个一直存在。这是最重要的，从第二步开始，其它的元素块都围绕这个展开
    onCanvasClick：点击canvas时触发。
      步骤2时用于选框；步骤4时用于粗选基线。
    onLongPress：在逻辑层注册，长按canvas时触发。
      步骤2、步骤3时用于清空选框（初始化）。
   -->
  <div style="width:100%;">
    <canvas
      v-show="taskStatusRef >= 2"
      ref="canvasRef"
      @click="onCanvasClick"
    ></canvas>
  </div>

  <!--
    canvas脚-步骤2
    主要就是遮罩裁剪。主要交互放在canvas上了。这里只是按钮。
    onSureRect：确定选框并裁剪。
   -->
  <div
    v-if="taskStatusRef === 2"
    class="center"
  >
    <!-- 按钮：裁剪图片 -->
    <myButton
      @click="onSureRect(false)"
      data-is-determine-str="false"
      :block="false"
    >
      {{ lang.CutPictureButtonText }}
    </myButton>
    <!-- 按钮：裁剪完成 -->
    <myButton
      @click="onSureRect(true)"
      data-is-determine-str="true"
      :block="false" theme="danger"
    >
      {{ lang.CutPictureCompleteButtonText }}
    </myButton>
  </div>

  <!--
    canvas脚-步骤3
    主要就是调节滑轨来实现轮廓选择。有按钮来控制滑轨的粗调和细调切换。
    onSlideChange：滑轨变化时触发，用于实时渲染轮廓效果。
    onContourSlideChangeEnd：滑轨变化结束时触发，用于在细调的时候，更新滑轨的可移动范围。
    onDetermineContour：最终确定轮廓的按钮事件回调钩子。
   -->
  <mySpace
    v-else-if="taskStatusRef === 3"
    size="small"
  >
    <!-- 遍历3个参数 -->
    <mySpace
      v-for="(thresholdNumArr, index) of thresholdNumAoaRef" :key="index"
      size="small"
    >
      <div>{{ lang.ThresholdParamsLabel[index] }}</div>
      <t-slider
        @change="onSlideChange(index)"
        v-model="thresholdNumArr[0]" :range="thresholdNumArr[4]"
        :min="thresholdNumArr[1]" :max="thresholdNumArr[2]"
        :step="thresholdNumArr[5]" :marks="thresholdNumArr[3]"
        :inputNumberProps="false" :label="true" layout="horizontal"
      /><t-divider />
    </mySpace>
    <!-- 按钮：下载数据 -->
    <myButton
      @click="onDownloadData"
      :block="true" theme="danger"
    >
      {{ lang.DownloadDataButtonLabel }}
    </myButton>
  </mySpace>

</MySpace></template>


<!--
  逻辑层
 -->
<script setup>
// 导入VUE的各类响应式方法
import { useTemplateRef, onMounted, onBeforeUnmount, ref, shallowRef, watch, nextTick } from "vue"
// 导入VueUse的各类响应式方法
import { useMouseInElement, useThrottleFn } from "@vueuse/core"
// 导入自有方法
import my from "@/utils/myFunc.js"
// 导入xlsx相关方法
import { aoaMapToWorkbook, downloadXlsx } from "@/utils/app-xlsx.js"
// 导入OpenCV.js加载器
import { loadOpenCV } from "@/utils/opencvLoader.js"
// 导入语言包
import { langAll, useData } from "./OutlineColorimetric-lang.js"

/** 语言包，默认"root"，即中文 @type { import("vue").ShallowRef<Object> }  */
const lang = shallowRef(langAll.root)
/**
 * 任务状态：
 * 1 - 未开始，或删除了图片。正在等待读取图片；
 * 2 - 读取到了图片。正在选框裁剪图片；
 * 3 - 完成了选框，得到了裁剪的图片。正在寻找并确定轮廓；
 * 4 - 完成了轮廓确认，计算RGB。
 *     其实并不存在状态4，因为计算RGB是最后一步，没有下一步了。
 * @type { import("vue").Ref<Number> }
 */
const taskStatusRef = ref(1)
/** 用户上传的文件数组对象 @type { import("vue").Ref<File[]> } */
const fileArrRef = ref([])
/** 
 * 视图层的<canvas>Dom对象
 * @type { import("vue").ShallowRef<HTMLCanvasElement> }
 * canvas加载很慢，需要等，比较好的等待方法是watch监听钩子。
 * 实测nextTick、onMounted都不如watch。
 */
const canvasRef = useTemplateRef("canvasRef")
/**
 * 第三步确定轮廓的上下限范围数组对象
 * @type { import("vue").Ref<Number[][]> }
 */
const thresholdNumAoaRef = ref([])
/**
 * 第三步确定轮廓的上下限范围数组对象-常量
 * @type { [Boolean, Number][] }
 */
const thresholdNumAoaConst = [
  // 二值化阈值：当前值、最小值、最大值、marks标记、是否range、步长
  [50, 0, 255, [0, 85, 170, 255], false, 1],
  // // 近圆度：当前值、最小值、最大值、marks标记、是否range、步长
  // [[0.0, 1.0], 0, 1, [0, 0.25, 0.5, 0.75, 1], true, 0.01],
  // 面积位次：当前值、最小值、最大值、marks标记、是否range、步长
  [[0, 100], 0, 100, [0, 25, 50, 75, 100], true, 1],
  // 圆径缩放因子：当前值、最小值、最大值、marks标记、是否range、步长
  [0.5, 0, 1, [0, 0.25, 0.5, 0.75, 1], false, 0.1]
]
/** 第三步确认轮廓是否是粗调模式 @type { import("vue").Ref<Boolean> } */
const isContourCoarseRef = ref(true)

/**
 * @typedef { Object } ContactAngle 轮廓-比色法业务的全局对象
 * @property { import("@techstark/opencv-js") } cv OpenCV.js对象
 * @property { Number } canvasStyleWidth canvas元素块的显示宽度
 * @property { String } filename 所上传文件的文件名
 * @property { CanvasRenderingContext2D } ctx canvas的绘图上下文对象
 * @property { Number } canvasScaling canvas元素块的缩放比例：实际/显示
 * @property { import("@techstark/opencv-js").Mat } matGray 灰度图Mat对象
 * @property { ImageData } imageData canvas的图像数据，用于暂存，便于恢复
 * @property { ImageBitmap } imageBitmap canvas的图像位图元数据，用于暂存，便于恢复
 * @property { Rect } rect canvas元素块遮罩框的[左|上|右|下]坐标
 * @property { Number[][] } contourAoa 轮廓数据数组。[近圆率, 面积, 圆心X, 圆心Y, 半径, 绘图标记]
 * @property { Number[] } circleAreaArr 面积位次数组
 * @note canvas的实际宽高在canvasRef.value.width和canvasRef.value.height上
 * @note canvas的显示宽最大值在canvasParentRef.value.clientWidth上，但是这个可能会变化！很坑
 */
/**
 * @typedef { Object } Rect canvas元素块遮罩框的[左|上|右|下]坐标
 * @property { Number } xMin canvas元素块遮罩框的左坐标
 * @property { Number } yMin canvas元素块遮罩框的上坐标
 * @property { Number } xMax canvas元素块遮罩框的右坐标
 * @property { Number } yMax canvas元素块遮罩框的下坐标
 */
/** 轮廓-比色法业务的全局对象 @type { ContactAngle } */
const outlineColorimetricObj = {
  cv: null,
  canvasStyleWidth: null,
  filename: null,
  ctx: null,
  canvasScaling: 0.0,
  matGray: null,
  imageData: null,
  imageBitmap: null,
  rect: {
    xMin: null,
    yMin: null,
    xMax: null,
    yMax: null,
  },
  contourAoa: [],
  circleAreaArr: []
}

// 注册一个<canvas>的响应式鼠标点击监听
const {
  // 鼠标点在<canvas>内部的X坐标、Y坐标
  elementX, elementY,
} = useMouseInElement(canvasRef)

/**
 * @全局钩子 生命周期钩子、监听钩子
 */

// 生命周期钩子，SSG的SPA化实现，组件挂载后执行
// 用于进行必要的各类初始化操作
onMounted(() => {
  // 语言刷新。获取当前语言
  const localeIndexValue = useData().localeIndex.value
  // 如果当前语言不是默认语言
  if (localeIndexValue !== "root") {
    // 则以当前语言刷新语言包
    lang.value = langAll[localeIndexValue]
  }
  // 给个加载框
  my.loading(lang.value.OpenCVLoadingContent)
  // 用于阻止页面刷新和关闭
  // 该方法不能阻止页面前进（跳转）、后退
  window.addEventListener("beforeunload", beforeunloadHandler)
  // 如果canvas没有初始化（第一次进入页面）
  if (!canvasRef.value) {
    // 注册一个监听钩子，用于实现canvasRef和canvasParentRef的初始化
    // 解构赋值，得到监听钩子的stop()方法，用于停止监听
    const { stop: stopCanvasWatch } = watch(
      // 监听：canvasRef
      canvasRef,
      // 回调
      (newCanvas) => {
        // 得确保新值均不为null，则完成初始化
        if (newCanvas) {
          // 停止监听
          stopCanvasWatch()
          // 初始化canvas的绘图上下文对象ctx，赋值给全局对象contactAngleObj
          outlineColorimetricObj.ctx = newCanvas.getContext(
            // CanvasRenderingContext2D接口的2D渲染上下文
            "2d",
            // 为频繁读取做优化，但仅Gecko内核（FireFox浏览器）支持
            { willReadFrequently: true }
          )
        }
      }
    )
  // 如果canvas已经初始化（刷新页面），则直接初始化
  } else {
    // 初始化canvas的绘图上下文对象ctx，赋值给全局对象contactAngleObj
    outlineColorimetricObj.ctx = canvasRef.value.getContext(
      // CanvasRenderingContext2D接口的2D渲染上下文
      "2d",
      // 为频繁读取做优化，但仅Gecko内核（FireFox浏览器）支持
      { willReadFrequently: true }
    )
  }
  // 导入OpenCV.js库
  loadOpenCV().then((cvReady) => {
    // 赋值给全局变量cv
    outlineColorimetricObj.cv = cvReady
    // 停止加载框
    my.loading(false)
  })
  // 注册一个对taskStatusRef的监听：
  // 任务状态改变时，始终保持canvas滚动到视图中间
  watch(taskStatusRef, nextTickFocusOnCanvas)
})

/**
 * 聚焦canvas
 * 下个DOM渲染周期将canvas滚动到视图中
 */
function nextTickFocusOnCanvas() {
  // 下个渲染周期执行focusOnCanvas()
  nextTick(focusOnCanvas).catch((error) => {
    my.error("nextTickFocusOnCanvas()报错：", error, errorDialog)
  })
  /**
   * 聚焦canvas的内部方法
   */
  function focusOnCanvas() {
    // 接参数
    const canvas = canvasRef.value
    // 滚动到canvas
    canvas.scrollIntoView({
      // 平滑滚动
      behavior: "smooth",
      // 垂直中心对齐
      block: "center",
      // 水平就近对齐
      inline: "nearest"
    })
  }
}

// 生命周期钩子，组件卸载前执行
// 用于进行必要的各类初始化操作
onBeforeUnmount(() => {
  // 取消监听：用于阻止页面刷新和关闭
  window.removeEventListener("beforeunload", beforeunloadHandler)
})

/**
 * 页面关闭、后退或刷新的回调
 * @param { Event } event 页面关闭或刷新事件
 */
function beforeunloadHandler(event) {
  // 阻止默认行为
  event.preventDefault()
  // 取消默认事件：兼容方法
  event.returnValue = false
}

/**
 * 报错的通知方法
 * 这是个统一化的报错通知，这个就不进行外部try...catch了
 */
function errorDialog(error) {
  // 直接对话框报错
  my.dialog({
    theme: "danger",
    header: lang.value.ErrorDialogTitle,
    body: lang.value.ErrorDialogContent + error
  })
}

/**
 * 点击<canvas>触发的回调
 * 步骤2：选框
 */
function onCanvasClick() { try {
  // console.log(
  //   `canvas点击：
  //   (${ elementX.value * outlineColorimetricObj.canvasScaling.toFixed(1) },
  //   ${ elementY.value * outlineColorimetricObj.canvasScaling.toFixed(1) })`
  // )
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 如果任务进度为2，则调用选框遮罩相关方法
  if (taskStatus === 2) {
    // 选框
    chooseRect()
    // 绘图
    drawRect()
  }
} catch (error) {
  my.error("onCanvasClick()报错：", error, errorDialog)
}}

/**
 * @步骤1 传图
 */

/**
 * 任务进度切换到步骤1
 */
function taskToStep1() {
  // 任务进度切换到步骤1
  taskStatusRef.value = 1
}

/**
 * 图片上传或改变时触发的回调
 * @param { Array<T> } event 事件对象
 * @note 会读取全局对象contactAngleObj的<canvas>宽度对象canvasWidth
 * @note 会写入全局对象contactAngleObj的<canvas>高度对象canvasHeight
 * @note 会写入全局对象contactAngleObj的灰度图Mat对象matGray
 */
async function onPicChange(event) { try {
  // 如果是清空了照片，则把任务进度切换回1，并直接返回即可
  if (event.length === 0) {
    taskToStep1()
    return
  }
  // 加载框
  my.loading(lang.value.PicLoadingContent)
  // 接参数
  const { imageBitmap } = outlineColorimetricObj
  // 接收文件名
  outlineColorimetricObj.filename = event[0].name
  // 获取文件的位图数据
  const imageBitmapNew = await window.createImageBitmap(event[0].raw)
  // 清空之前的位图文件的数据，释放GPU内存
  imageBitmap?.close()
  // 赋值给全局对象contactAngleObj的位图对象imageBitmap
  outlineColorimetricObj.imageBitmap = imageBitmapNew
  // 第一阶段完成，任务进度改为2
  taskToStep2()
  // 停止加载框
  my.loading(false)
} catch (error) {
  // 停止加载框
  my.loading(false)
  // 报错处理
  my.error("onPicChange()方法出错：", error, errorDialog)
}}

/**
 * @步骤2 裁剪图片
 * 此处的选框方法，放在上面的全局canvas监听里了
 */

/**
 * 任务进度切换到步骤2
 */
function taskToStep2() {
  // 清空canvas上的矩形标记数据
  canvasRectDataRemove()
  // 任务进度改为2
  taskStatusRef.value = 2
  // 下个渲染周期，绘制canvas
  nextTick(canvasRestore).catch((error) => {
    my.error("taskToStep2().nextTick()报错：", error, errorDialog)
  })
}

/**
 * 清空canvas的mask遮罩标记数据
 */
function canvasRectDataRemove() {
  // 清空选框的[上|右|下|左]遮罩边界值
  const rect = outlineColorimetricObj.rect
  rect.xMin = null
  rect.yMin = null
  rect.xMax = null
  rect.yMax = null
}

/**
 * 以imageBitmap恢复canvas
 * @note 会同时根据canvas父级元素的内宽刷新canvas的宽
 * @note 会同时根据imageBitmap尺寸修改canvas的实际宽高、以及显示高
 */
function canvasRestore() {
  // 获取对象
  const canvas = canvasRef.value
  const { ctx, imageBitmap } = outlineColorimetricObj
  // 调整canvas的实际宽高：
  // 以图片的原始宽高设定canvas的【实际】宽高，防止图片尺寸和canvas实际尺寸不一致导致的显示问题
  canvas.width = imageBitmap.width
  canvas.height = imageBitmap.height
  // 调整canvas的显示高：
  // 接canvas父元素的最大内宽
  const canvasParentClientWidth = canvas.parentElement.clientWidth
  // 同步canvas的最大宽度给canvas的【显示宽度】（即父元素的有效宽度）
  outlineColorimetricObj.canvasStyleWidth = canvasParentClientWidth
  canvas.style.width = canvasParentClientWidth + "px"
  // 计算canvas的缩放比例：实际宽度/显示宽度
  const canvasScaling = canvas.width / canvasParentClientWidth
  outlineColorimetricObj.canvasScaling = canvasScaling
  // 设定canvas的显示高度
  canvas.style.height = canvas.height / canvasScaling + "px"
  // 把图片绘制到canvas上
  ctx.drawImage(imageBitmap, 0, 0)
  // 设置canvas的绘图上下文
  ctxSetting()
}

/**
 * 以canvas父元素宽度为依据，使canvas进行尺寸自适应
 */
function canvasFit() {
  // 接参数
  const canvas = canvasRef.value
  // 接canvas父元素的最大内宽
  const canvasParentClientWidth = canvas.parentElement.clientWidth
  // canvas父元素的最大内宽赋值给全局变量
  outlineColorimetricObj.canvasStyleWidth = canvasParentClientWidth
  // 设置canvas的显示宽度
  canvas.style.width = canvasParentClientWidth + "px"
}

/**
 * 设置canvas的绘图上下文ctx
 */
function ctxSetting() {
  // 接ctx及缩放比例相关对象
  const { ctx, canvasScaling } = outlineColorimetricObj
  // 红色笔迹
  ctx.strokeStyle = "red"
  // 线宽：2像素 x 缩放比例
  ctx.lineWidth = 2 * canvasScaling
  // 填充色：半透明
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
}

/**
 * 选框方法
 * 用于更新选框的X、Y坐标边界值
 */
function chooseRect() {
  /** 选框的初始相对尺寸 @const { Number } */
  const RECT_SCALE = 0.8
  // 接遮罩数组、缩放比例
  const { rect, canvasScaling } = outlineColorimetricObj
  // 点击位置的实际X、Y坐标
  const realElementX = elementX.value * canvasScaling
  const realElementY = elementY.value * canvasScaling
  // 如果选框X边界未定义，即第一次点击，需记录下选框的坐标
  if (!rect.xMax) {
    // 接canvas
    const canvas = canvasRef.value
    // 计算初始化选框的半宽/半高
    const rectHalfX = canvas.width * RECT_SCALE * 0.5
    // Y轴半高：适当压扁一点
    const rectHalfY = canvas.height * RECT_SCALE * 0.5
    // 根据点击位置记录坐标
    // rectXmax：点击位置X坐标 + 选框半宽，有可能大于<canvas>宽，则取两者小值
    rect.xMax = Math.min((realElementX + rectHalfX), canvas.width)
    // rectYmax原理同上
    rect.yMax = Math.min((realElementY + rectHalfY), canvas.height)
    // rectXmin：点击位置X坐标 - 选框半宽，有可能小于零，则取两者大值
    rect.xMin = Math.max((realElementX - rectHalfX), 0)
    // rectYmin原理同上
    rect.yMin = Math.max((realElementY - rectHalfY), 0)
    // 选框边界已更新，直接返回即可
    return
  }
  // 接下来处理边框已定义的情况。如果恰好点在选框上
  if (
    (realElementX === rect.xMin) || (realElementX === rect.xMax)
      || (realElementY === rect.yMin) || (realElementY === rect.yMax)
  ) {
    // 则不做任何处理，直接返回
    return
  }
  // 如果点击位置在选框外
  // 先声明一个“是否在选框内”的标记，初始化为0
  let isInRect = 0
  // 判断X点：
  // 如果点击位置在框外（X值比框X坐标的最大值更大，或比X坐标最小值更小），则替换最大/最小值
  // 否则，即点击位置在选框内，isInRect加1
  if (realElementX < rect.xMin) {
    rect.xMin = realElementX
  } else if (realElementX > rect.xMax) {
    rect.xMax = realElementX
  } else {
    isInRect++
  }
  // 判断Y点：
  // 同上
  if (realElementY < rect.yMin) {
    rect.yMin = realElementY
  } else if (realElementY > rect.yMax) {
    rect.yMax = realElementY
  } else {
    isInRect++
  }
  // 如果“如果在选框内”的标记isInRect小于2，即至少x和y有一个在选框外
  if (isInRect < 2) {
    // 此时选框点已经更新了，所以直接返回即可
    return
  }
  // 接下来处理选框点在选框内（isInRect === 2）的情况
  // 思路：比较斜率。有3个斜率：
  // 1.  参考斜率，即选框自身的斜率rectSlope，也就是矩形框的交叉线。
  //     参考斜率有正负值。求1个即可，另一个加负号，即-rectSlope。
  // 2.  选点针对(rectXmin, rectYmin)点的斜率。
  //     该斜率和rectSlope比较，如果大于rectSlope，则说明选点在交叉线的上方，反之在下方。
  // 3.  选点针对(rectXmax, rectYmin)点的斜率。
  //     该斜率和-rectSlope比较，如果【小于-rectSlope】，则说明选点在交叉线的上方，反之在下方。
  //     这里要注意负数比较，和“2”的正数比较相反。
  // 参考斜率rectSlope
  const rectSlope = (rect.yMax - rect.yMin) / (rect.xMax - rect.xMin)
  // 选点针对(rect.xMin, rect.yMin)点的斜率
  const realElementSlopePositive = (realElementY - rect.yMin) / (realElementX - rect.xMin)
  // 选点针对(rect.xMax, rect.yMin)点的斜率（这是个负数）
  const realElementSlopeNegative = (realElementY - rect.yMin) / (realElementX - rect.xMax)
  // 判断点的位置
  if (realElementSlopePositive >= rectSlope) {
    if (realElementSlopeNegative <= -rectSlope) {
      // 选点在交叉线的上方，rectYmax往下缩
      rect.yMax = realElementY
    } else {
      // 选点在交叉线的左边，rectXmin往右缩
      rect.xMin = realElementX
    }
  } else {
    if (realElementSlopeNegative <= -rectSlope) {
      // 选点在交叉线的右边，rectXmax往左缩
      rect.xMax = realElementX
    } else {
      // 选点在交叉线的下方，rectYmin往上缩
      rect.yMin = realElementY
    }
  }
  // 选框边界更新完毕，返回
  return
}

/**
 * 绘制选框
 * @note 会调用全局对象contactAngleObj的ctx、rect
 * @note 会读取全局对象canvasRef的height、width
 */
function drawRect() {
  // 接对象
  const { rect, ctx, imageBitmap } = outlineColorimetricObj
  // 接canvas对象
  const canvas = canvasRef.value
  // 接绘制框的宽高
  const rectWidth = rect.xMax - rect.xMin
  const rectHeight = rect.yMax - rect.yMin
  // 先对canvas进行重绘制，去掉上一次的绘制
  ctx.drawImage(imageBitmap, 0, 0)
  // 给一个遮罩
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // 重绘选框中部
  ctx.drawImage(
    imageBitmap,
    rect.xMin, rect.yMin, rectWidth, rectHeight,
    rect.xMin, rect.yMin, rectWidth, rectHeight
  )
  // 绘制中间线框
  ctx.strokeRect(rect.xMin, rect.yMin, rectWidth, rectHeight)
}

/**
 * 点击“裁剪图片”按钮的事件回调钩子
 * @param { Boolean } isDetermine 是否确定裁剪
 */
async function onSureRect(isDetermine) { try {
  // 接选框对象
  const { rect, imageBitmap } = outlineColorimetricObj
  // 接canvas对象
  const canvas = canvasRef.value
  // 如果有选框
  if (rect.xMax) {
    // 以选框获取新的imageBitmap图像位图元数据
    const imageBitmapNew = await window.createImageBitmap(
      imageBitmap,
      rect.xMin, rect.yMin, (rect.xMax - rect.xMin), (rect.yMax - rect.yMin)
    )
    // 更新全局canvas的图像位图元数据
    imageBitmap?.close()
    outlineColorimetricObj.imageBitmap = imageBitmapNew
    // 更新canvas的图像位图元数据后，把图片绘制到canvas上
    canvasRestore()
    // 清空裁剪标记
    canvasRectDataRemove()
  }
  // 如果是“完成裁剪”，则：
  // 1.  备份ImageData
  // 2.  把canvas图像转为灰度图Mat对象
  // 3.  进入下一步
  if (isDetermine === true) {
    // 接绘图上下文ctx对象、cv对象、图片的宽高
    const { ctx, cv, matGray, imageBitmap: { width, height } } = outlineColorimetricObj
    // 备份imageData，后面直接读取RGB用
    outlineColorimetricObj.imageData = ctx.getImageData(0, 0, width, height)
    // 读取图片文件为OpenCV的Mat对象
    const matOrigin = cv.imread(canvas)
    // 如果全局灰度图Mat对象存在且有成员对象delete方法，则先删除
    matGray?.delete()
    // 初始化全局灰度图Mat对象
    outlineColorimetricObj.matGray = new cv.Mat()
    // 将原始图像Mat转为灰度Mat，赋值给全局灰度图Mat对象
    // “cvtColor”即convert color
    cv.cvtColor(
      // 原图（输入）
      matOrigin,
      // 灰度图（输出）
      outlineColorimetricObj.matGray,
      // 颜色空间转换代码：color：RGBA to gray
      cv.COLOR_RGBA2GRAY,
      // 通道数：0，即自动
      0
    )
    // 释放原图Mat的WASM内存
    matOrigin.delete()
    // 任务状态进展到“3”
    taskToStep3()
  }
} catch (error) {
  my.error("onSureRect()方法出错：", error, errorDialog)
}}

/**
 * @步骤3 选择轮廓
 * 4个滑轨，第1个滑轨要获取轮廓数据
 * 后3个滑轨只是对轮廓数据的筛选处理
 */

/**
 * 任务进度切换到步骤3
 */
function taskToStep3() {
  // 把“粗/西调”设置成粗调
  isContourCoarseRef.value = true
  // 初始化滑轨参数
  thresholdNumRestore()
  // 任务进度改为3
  taskStatusRef.value = 3
  // 下一个DOM周期：用轮廓查找方法刷新一次轮廓渲染
  nextTick(getAndDrawContours).catch((error) => {
    my.error("taskToStep3().nextTick()报错：", error, errorDialog)
  })
}

/**
 * 初始化调参参数的滑轨
 * 如果滑轨Ref值为空，则全部初始化；
 * 否则保留每个传参的当前值，对范围、步进等初始化
 */
function thresholdNumRestore() {
  // 接参数
  const thresholdNumAoa = thresholdNumAoaRef.value
  // 如果滑轨参数为空，则初始化滑轨参数
  if (thresholdNumAoa.length === 0) {
    // 直接深拷贝一份副本然后赋值即可
    thresholdNumAoaRef.value = deepCopyAoa(thresholdNumAoaConst)
  // 否则，保留每个参数的取值
  } else {
    // 先深拷贝一份参数副本
    const thresholdNumAoaTemp = deepCopyAoa(thresholdNumAoaConst)
    // 用参数副本的第一个值值覆盖
    for (let i = 0; i < thresholdNumAoa.length; i++) {
      thresholdNumAoaTemp[i][0] = thresholdNumAoa[i][0]
    }
    // 赋值
    thresholdNumAoaRef.value = thresholdNumAoaTemp
  }
  /**
   * 深拷贝AOA数组
   * @param aoa AOA二维数组
   */
  function deepCopyAoa(aoa) {
    // 深拷贝AOA数组
    const aoaTemp = []
    // 遍历每一行
    for (let i = 0; i < aoa.length; i++) {
      // 推进新数组
      aoaTemp.push([...aoa[i]])
    }
    // 返回新数组
    return aoaTemp
  }
}

/**
 * 滑轨调节的事件回调钩子
 * 步骤3：基线调节。此步骤下，用户只能操作滑轨，因此事件全部来源于滑轨。
 * @param { Number } paramIndex 参数的index序号
 */
function onSlideChange(paramIndex) { try {
  // 如果是第1个滑轨
  if (paramIndex === 0) {
    // 则需要重新获取轮廓数据
    getAndDrawContoursThrottled()
  // 否则，只需要重新绘制轮廓
  } else {
    drawContoursThrottled()
  }
} catch (error) {
  my.error("onSlideChange()报错：", error, errorDialog)
}}

/**
 * 选择轮廓方法的防抖方法
 * @note 给getContours做了防抖处理，以防止频繁调用
 */
const getAndDrawContoursThrottled = useThrottleFn(getAndDrawContours, 500, true)

/**
 * 绘制轮廓方法的防抖方法
 * @note 给drawContours做了防抖处理，以防止频繁调用
 */
const drawContoursThrottled = useThrottleFn(drawContours, 500, true)

/**
 * 获取轮廓数据并绘制轮廓
 * @note 会调用轮廓绘制drawContours()方法
 */
function getAndDrawContours() {
  // 接二值化参数
  const binaryThresh = thresholdNumAoaRef.value[0][0]
  // 接cv和灰度图Mat对象
  const { cv, matGray } = outlineColorimetricObj
  // 初始化二值化的Mat对象
  const matBinary = new cv.Mat()
  // 将灰度图转为二值化图
  cv.threshold(
    // 输入：灰度图matGray
    matGray,
    // 输出：二值化图matBinary
    matBinary,
    // 阈值
    binaryThresh,
    // 用于THRESH_BINARY和THRESH_BINARY_INV阈值类型的最大值
    255,
    // 阈值类型
    cv.THRESH_BINARY
  )
  // 初始化轮廓查找的MatVector对象
  const matVectorContours = new cv.MatVector()
  // 初始化轮廓层次结构hierarchy
  const hierarchy = new cv.Mat()
  // cv.findContours()方法，查找轮廓
  // 详见：https://docs.opencv.org/4.10.0/d5/daa/tutorial_js_contours_begin.html
  cv.findContours(
    // 二值化的Mat图像
    matBinary,
    // 轮廓。AOA的Mat对象数组，即MatVector
    matVectorContours,
    // 轮廓层次结构，即各轮廓间的拓扑关系
    // 如圈形图像会有内轮廓和外轮廓，则内外轮廓间会存在包含与被包含等关系
    // 轮廓层次结构即建立“轮廓树”，以层级化的方式描述轮廓之间的关系
    hierarchy,
    // 轮廓检索模式
    // RETR_EXTERNAL => retrieval external - 只检索最外层的轮廓
    cv.RETR_EXTERNAL,
    // cv.RETR_LIST,
    // 轮廓近似法
    // CHAIN_APPROX_NONE => chain approx none - 不作近似处理，存储所有轮廓点
    // CHAIN_APPROX_SIMPLE => chain approx simple - 压缩水平、垂直和对角线方向的轮廓，只保留该方向的终点坐标
    // cv.CHAIN_APPROX_NONE
    cv.CHAIN_APPROX_SIMPLE
  )
  // 获取轮廓的数量
  const contourSize = matVectorContours.size()
  // 用于装箱的对象：轮廓数组、圆面积
  const { contourAoa, circleAreaArr } = outlineColorimetricObj
  // 初始化，清空数组
  contourAoa.length = 0
  circleAreaArr.length = 0
  // 遍历所有轮廓
  forEachContours: for (let i = 0; i < contourSize; i++) {
    // 获取轮廓
    const matContour = matVectorContours.get(i)
    // 轮廓的矩（moments）
    // 1. 空间矩（Spatial Moments）
    //   m00：零阶矩，[轮廓面积]，即轮廓或点的总数（如果是图像，则为非零像素的总数）
    //   m10, m01：一阶矩，分别表示轮廓或点的质心的row/W和col/H坐标（需除以m00）
    //   m20, m11, m02：二阶矩，用于描述轮廓或点的分布
    // 2. 中心矩（Central Moments）
    //   mu20, mu11, mu02：二阶中心矩，描述了轮廓或点相对于其质心的分布
    //   mu30, mu21, mu12, mu03：三阶中心矩，用于描述轮廓或点的对称性
    // 3. 归一化中心矩（Normalized Central Moments）
    //   nu20, nu11, nu02：二阶归一化中心矩
    //   nu30, nu21, nu12, nu03：三阶归一化中心矩
    //   归一化中心矩用于描述轮廓或点的形状，这些矩是尺度不变的
    const { m00: circleArea } = cv.moments(matContour, true)
    // 如果轮廓面积小于等于1，则忽略此轮廓
    if (circleArea <= 1) {
      continue forEachContours
    }
    // 获取该轮廓的最小外接圆。有center.x, center.y, radius
    const minEnclosingCircle = cv.minEnclosingCircle(matContour)
    // 计算轮廓的近圆率
    const circularity = circleArea / ((minEnclosingCircle.radius ** 2) * Math.PI)
    // 装箱
    contourAoa.push([
      circularity,
      circleArea,
      minEnclosingCircle.center.x, minEnclosingCircle.center.y,
      minEnclosingCircle.radius,
    ])
    circleAreaArr.push(circleArea)
    // 结束，释放WASM内存
    matContour.delete()
  }
  // 对面积数组进行排序
  circleAreaArr.sort()
  // 结束，释放WASM内存
  matBinary.delete()
  matVectorContours.delete()
  hierarchy.delete()
  // 最后，调用一下绘制轮廓方法
  drawContours()
}

/**
 * 绘制轮廓
 */
function drawContours() {
  // 接参数：近圆率、面积位次、缩放
  const [ ,
    // [[circularityMin, circularityMax]],
    [[areaPercentOrderMin, areaPercentOrderMax]],
    [scale]
  ] = thresholdNumAoaRef.value

  // const [circularityMin, circularityMax] = thresholdNumAoaRef.value[1][0]
  // const [areaPercentOrderMin, areaPercentOrderMax] = thresholdNumAoaRef.value[1][0]
  // const scale = thresholdNumAoaRef.value[2][0]
  // 接参数：canvas上下文、轮廓数组、近圆率、圆面积
  const { ctx, contourAoa, circleAreaArr } = outlineColorimetricObj
  // 轮廓数量
  const circleCount = circleAreaArr.length
  // 位次下取小，又不能小于0
  const circleAreaMinIndex = Math.max(
    Math.floor(circleCount * areaPercentOrderMin / 100), 0
  )
  // 位次上取大，又不能大于数组长度
  const circleAreaMaxIndex = Math.min(
    Math.ceil(circleCount * areaPercentOrderMax / 100), (circleCount - 1)
  )
  // 获得面积的最小值和最大值
  const circleAreaMin = circleAreaArr[circleAreaMinIndex]
  const circleAreaMax = circleAreaArr[circleAreaMaxIndex]
  // 把此前的轮廓图清空
  canvasRestore()
  // 遍历所有轮廓
  forEachContours: for (const contour of contourAoa) {
    // 若不符合条件，则跳过
    if (
      // (contour[0] < circularityMin) || (contour[0] > circularityMax)
      (contour[1] < circleAreaMin) || (contour[1] > circleAreaMax)
    ) {
      // 标记为false，表示不绘图
      contour[5] = false
      continue forEachContours
    // 否则绘图
    } else {
      // 标记为true，表示绘图
      contour[5] = true
      // 开始绘图
      ctx.beginPath()
      // 圆环
      ctx.arc(
        contour[2], contour[3],
        (contour[4] * scale),
        0, (2 * Math.PI)
      )
      // 绘制
      ctx.stroke()
    }
  }
}

/**
 * 点击“下载数据”按钮的事件回调钩子
 */
function onDownloadData() { try {
  // 把轮廓数组转换成排列好了的矩阵
  const contourMatrixAoaoa = contourToMatrix()
  // 把矩阵化的轮廓数据转换成处理好的RGB结果数据数据
  const resultAoaoa = contourMatrixToRGB(contourMatrixAoaoa)
  // 下载RGB数据
  downloadRGB(resultAoaoa)
} catch (error) {
  my.error("onDownloadData()报错：", error, errorDialog)
}}

/**
 * 把轮廓数组转换成排列好了的矩阵
 * 外维是X，内维是Y
 * @returns { Number[][][] } 矩阵，[x, y, 缩放后的半径][][]
 */
function contourToMatrix() {
  // 接轮廓数组
  const { contourAoa } = outlineColorimetricObj
  // 接缩放参数
  const scale = thresholdNumAoaRef.value[2][0]
  // 建立X、Y的排序表
  const xAoa = []
  const yAoa = []
  // 遍历所有轮廓
  forEachContour1: for (const contour of contourAoa) {
    // 如果不绘图，则跳过
    if (contour[5] === false) {
      continue forEachContour1
    }
    // 获取轮廓的X、Y中心坐标和边界坐标
    const xCenter = contour[2]
    const xLeft = contour[2] - contour[4]
    const xRight = contour[2] + contour[4]
    const yCenter = contour[3]
    const yDown = contour[3] - contour[4]
    const yUp = contour[3] + contour[4]
    // 遍历X轮廓数组
    const xAoaLength = xAoa.length
    let xIndex = 0
    forEachXAoa: while (xIndex < xAoaLength) {
      // 如果X中心坐标在X轮廓数组的范围内
      if ((xCenter >= xAoa[xIndex][0]) && (xCenter <= xAoa[xIndex][1])) {
        // 则刷新该数组的范围
        if (xLeft < xAoa[xIndex][0]) {
          xAoa[xIndex][0] = xLeft
        }
        if (xRight > xAoa[xIndex][1]) {
          xAoa[xIndex][1] = xRight
        }
        // 然后就可以跳出循环了
        break forEachXAoa
      }
      // 否则，继续遍历
      xIndex++
    }
    // 遍历结束，看看xIndex是否等于xAoaLength
    if (xIndex === xAoaLength) {
      // 如果等于，则说明没有找到匹配的X范围，则新增一个X范围
      xAoa.push([xLeft, xRight])
    }
    // 遍历Y轮廓数组
    const yAoaLength = yAoa.length
    let yIndex = 0
    forEachYAoa: while (yIndex < yAoaLength) {
      // 如果Y中心坐标在Y轮廓数组的范围内
      if ((yCenter >= yAoa[yIndex][0]) && (yCenter <= yAoa[yIndex][1])) {
        // 则刷新该数组的范围
        if (yDown < yAoa[yIndex][0]) {
          yAoa[yIndex][0] = yDown
        }
        if (yUp > yAoa[yIndex][1]) {
          yAoa[yIndex][1] = yUp
        }
        // 然后就可以跳出循环了
        break forEachYAoa
      }
      // 否则，继续遍历
      yIndex++
    }
    // 遍历结束，看看yIndex是否等于yAoaLength
    if (yIndex === yAoaLength) {
      // 如果等于，则说明没有找到匹配的Y范围，则新增一个Y范围
      yAoa.push([yDown, yUp])
    }
  }
  // 遍历结束，对xAoa和yAoa进行排序
  xAoa.sort((a, b) => (a[0] - b[0]))
  yAoa.sort((a, b) => (a[0] - b[0]))
  // X、Y表处理完毕，下面对轮廓数据进行排序
  // 构造一个轮廓数据的AOA数组，外围row(Y)，内围col(X)
  const contourMatrixAoa = []
  // 有多少Y，就应该有多少行
  for (let row = 0; row < yAoa.length; row++) {
    contourMatrixAoa.push([])
  }
  // 遍历所有轮廓
  forEachContour2: for (const contour of contourAoa) {
    // 如果不绘图，则跳过
    if (contour[5] === false) {
      continue forEachContour2
    }
    // 获取x点、y点
    const xCenter = contour[2]
    const yCenter = contour[3]
    // 遍历所有行(Y轴)
    for (let row = 0; row < yAoa.length; row++) {
      // 看看y中心点是否在Y轴范围内
      if ((yCenter >= yAoa[row][0]) && (yCenter <= yAoa[row][1])) {
        // 如果在，则遍历当前行row的所有列col(X轴)
        for (let col = 0; col < xAoa.length; col++) {
          // 看看x中心点是否在X轴范围内
          if ((xCenter >= xAoa[col][0]) && (xCenter <= xAoa[col][1])) {
            // 如果在，则把轮廓数据添加到该位置：x、y、缩放后的半径
            contourMatrixAoa[row][col] = [
              contour[2], contour[3], contour[4] * scale
            ]
          }
        }
      }
    }
  }
  // 返回轮廓矩阵数据
  return contourMatrixAoa
}

/**
 * 把矩阵化的轮廓数据转换成处理好的RGB结果数据数据
 * @param { Number[][][] } contourMatrixAoaoa 矩阵，[x, y, 缩放后的半径][][]
 * @returns { Number[][][] } 结果矩阵，最外层为[R-ave, R-sd, G-ave, G-sd, B-ave, B-sd]的[][]
 */
function contourMatrixToRGB(contourMatrixAoaoa) {
  // 接imageData数据，用于提取RGB值
  const { width: imageDataWidth, data: imageDataArray } = outlineColorimetricObj.imageData
  // 构建用于输出的数组
  const dataAoaoa = []
  // 要有6个维度，因为要分别输出R、G、B，以及相应的SD值
  for (let i = 0; i < 6; i++) {
    dataAoaoa.push([])
  }
  // 遍历所有轮廓数据获取RGB值
  // 遍历每一行
  forEachRow: for (let row = 0; row < contourMatrixAoaoa.length; row++) {
    // 给dataAoaoa的每个维度都添加一个新行
    for (let i = 0; i < 6; i++) {
      dataAoaoa[i].push([])
    }
    // 遍历当前行的每一列
    forEachCol: for (let col = 0; col < contourMatrixAoaoa[row].length; col++) {
      // 接轮廓数据
      const contourData = contourMatrixAoaoa[row][col]
      // 如果轮廓数据为空，则跳过
      if (!contourData) {
        continue forEachCol
      }
      // 获取轮廓内所有点的X、Y坐标
      const contourPointAoa = getContourPoints(contourData)
      // 用于接收RGB值的数组
      const uniPointArr = [[], [], []]
      // 遍历所有点
      forEachPoint: for (const point of contourPointAoa) {
        // 获取点的X、Y坐标
        const [x, y] = point
        // 获取点的索引
        const index = (y * imageDataWidth + x) * 4
        for (let i = 0; i < 3; i++) {
          // 获取点的RGB值
          uniPointArr[i].push(imageDataArray[index + i])
        }
      }
      // 遍历计算平均值和标准差
      for (let i = 0; i < uniPointArr.length; i++) {
        // 计算平均值和标准差
        const [ave, sd] = aveAndSD(uniPointArr[i])
        // 把平均值和标准差存入dataAoaoa
        dataAoaoa[i * 2][row][col] = ave
        dataAoaoa[i * 2 + 1][row][col] = sd
      }
    }
  }
  // 输出dataAoaoa
  return dataAoaoa
}

/**
 * 由轮廓数据获取全部的点
 * @param { [number, number, number] } contourData 轮廓X、Y、半径
 * @returns { [number, number][] } 轮廓数据[x, y][]
 */
function getContourPoints(contourData) {
  // 接数据
  const [xCenter, yCenter, radius] = contourData
  // radius平方
  const radiusSquare = radius * radius
  // 构造一个数组，用于存储轮廓数据，初始化圆点
  const contourPointAoa = [[Math.round(xCenter), Math.round(yCenter)]]
  forEachX: for (let xDelta = 1; xDelta <= radius; xDelta++) {
    forEachY: for (let yDelta = 1; yDelta <= radius; yDelta++) {
      // 计算距离平方
      const distanceSquare = xDelta * xDelta + yDelta * yDelta
      // 如果该点在半径外，即距离大于半径
      if (distanceSquare > radiusSquare) {
        // 弃去这一轮，直接回到大遍历
        continue forEachY
      }
      // 如果该点在半径内，则计算坐标点
      const xPossitive = Math.round(xCenter + xDelta)
      const yPossitive = Math.round(yCenter + yDelta)
      const xNegative = Math.round(xCenter - xDelta)
      const yNegative = Math.round(yCenter - yDelta)
      // 推进框里
      contourPointAoa.push(
        [xPossitive, yPossitive],
        [xPossitive, yNegative],
        [xNegative, yPossitive],
        [xNegative, yNegative],
      )
    }
  }
  // 返回轮廓点数据
  return contourPointAoa
}

/**
 * 计算平均值和标准差
 * @param { Number[] } arr 数组
 * @returns { Number[2] } 平均值和标准差
 */
function aveAndSD(arr) {
  // 加和
  let sum = 0
  // 遍历求加和
  for (let i = 0; i < arr.length; i++) {
    sum = sum + arr[i]
  }
  // 算平均值
  const ave = sum / arr.length
  // 清空加和
  sum = 0
  // 遍历求方差
  for (let i = 0; i < arr.length; i++) {
    sum = sum + (arr[i] - ave)**2
  }
  // 算标准差
  const sd = Math.sqrt(sum / (arr.length - 1))
  // 返回平均值和标准差
  return [ave, sd]
}

/**
 * 下载最终的结果文件
 * @param { Number[][][] } resultAoaoa 结果矩阵数据，[R-ave, G-ave, B-ave, A-ave, R-sd, G-sd, B-sd, A-sd][][][]
 */
function downloadRGB(resultAoaoa) {
  // 建立工作表文件的Map对象
  const resultMap = new Map()
  // 表格名称
  const sheetNameArr = ["R-Ave", "R-SD", "G-Ave", "G-SD", "B-Ave", "B-SD"]
  // 遍历表格名称
  for (let i = 0; i < sheetNameArr.length; i++) {
    // 把数据存入Map对象
    resultMap.set(sheetNameArr[i], resultAoaoa[i])
  }
  // AOA数据的Map对象转成xlsx文件
  const workbook = aoaMapToWorkbook(resultMap)
  // 下载xlsx文件
  downloadXlsx(workbook, "data.xlsx")
}

</script>