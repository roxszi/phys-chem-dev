<!--
  轮廓-比色法业务
  结合了轮廓识别 + 比色法实现，用于胡影和奚俊婷的化学动力学教学实验
  ---
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

  i18n 说明：
  - 业务文案走 langRef（由 ./OutlineColorimetric-lang.ts + composables/useLang.ts 派生）
  - 数字字面量（0、255、阈值上下限、步长等）不进语言包
  - 内部开发者错误（throw new Error）不翻译
  - 工具调用（myLoading / myMessage / myError）由 composables 自动全局可用，无需 import
-->


<!--
  视图层
-->
<template><div class="my-column my-gap">

  <!-- 警报框：功能简介 -->
  <MyNoticeBar
    :title="langRef.FunctionIntroductionTitle"
    theme="info"
  >
    <p v-for="(content, index) of langRef.FunctionIntroductionContent" :key="index">
      {{ content }}
    </p>
  </MyNoticeBar>

  <!-- canvas头 - 警报框：步骤1 -->
  <MyNoticeBar
    v-if="taskStatusRef === 1"
    :title="langRef.StepTitle + '1'"
    theme="warning"
  >
    <p v-for="(content, index) of langRef.Step1Content" :key="index">
      {{ content }}
    </p>
  </MyNoticeBar>

  <!--
    图片上传
    这个一直都存在，方便用户删除上传的图片
    onPicChange：图片上传、删除时触发。
      上传则处理图片并进入下个流程；
      删除则清空所有数据，回到初始状态（状态1）。
   -->
  <MyUpload
    v-model:files="fileArrRef"
    accept="image/*"
    :max="1"
    theme="image"
    :onChange="onPicChange"
  />

  <!-- canvas头 - 警报框：步骤2 -->
  <MyNoticeBar
    v-if="taskStatusRef === 2"
    :title="langRef.StepTitle + '2'"
    theme="warning"
  >
    <p v-for="(content, index) of langRef.Step2Content" :key="index">
      {{ content }}
    </p>
  </MyNoticeBar>

  <!-- canvas头 - 警报框：步骤3 -->
  <MyNoticeBar
    v-if="taskStatusRef === 3"
    :title="langRef.StepTitle + '3'"
    theme="warning"
  >
    <p v-for="(content, index) of langRef.Step3Content" :key="index">
      {{ content }}
    </p>
  </MyNoticeBar>

  <!--
    canvas元素块
    这个一直存在。这是最重要的，从第二步开始，其它的元素块都围绕这个展开
    onCanvasClick：点击canvas时触发。
      步骤2时用于选框。
   -->
  <div class="my-w100">
    <canvas
      v-show="taskStatusRef >= 2"
      ref="canvasRef"
      @click="onCanvasClick"
    ></canvas>
  </div>

  <!--
    canvas脚 - 步骤2
    主要就是遮罩裁剪。主要交互放在canvas上了。这里只是按钮。
    onSureRect：确定选框并裁剪。
      isFinalize=false 仅预览裁剪；isFinalize=true 进入步骤3
   -->
  <div
    v-if="taskStatusRef === 2"
    class="my-row my-gap"
  >
    <MyButton
      :block="false"
      @click="onSureRect(false)"
    >
      {{ langRef.CutPictureButtonText }}
    </MyButton>
    <MyButton
      :block="false"
      theme="danger"
      @click="onSureRect(true)"
    >
      {{ langRef.CutPictureCompleteButtonText }}
    </MyButton>
  </div>

  <!--
    canvas脚-步骤3
    主要就是调节滑轨来实现轮廓选择。有按钮来控制滑轨的粗调和细调切换。
    onSlideChange：滑轨变化时触发，用于实时渲染轮廓效果。
    onContourSlideChangeEnd：滑轨变化结束时触发，用于在细调的时候，更新滑轨的可移动范围。
    onDetermineContour：最终确定轮廓的按钮事件回调钩子。
   -->
  <div
    v-else-if="taskStatusRef === 3"
    class="my-column"
  >
    <!-- 遍历3个滑轨参数 -->
    <MySlider
      v-for="(thresholdNumArr, index) of thresholdSliderAoaRef"
      :key="index"
      :title="langRef.ThresholdParamsLabel[index]"
      v-model:value="thresholdNumArr[0]"
      :marks="thresholdNumArr[1]"
      :step="thresholdNumArr[2]"
      :onChange="onSlideChange"
    />
    <!-- 按钮：下载数据 -->
    <MyButton
      :block="true"
      theme="danger"
      @click="onDownloadData"
    >
      {{ langRef.DownloadDataButtonLabel }}
    </MyButton>
  </div>

</div>
</template>


<!--
  逻辑层
 -->
<script setup lang="ts">
// 导入VueUse的响应式方法
import { useMouseInElement, useThrottleFn } from "@vueuse/core"
// 导入xlsx相关方法
import { aoaMapToWorkbook, downloadXlsx } from "@utils/xlsx.ts"
// 导入OpenCV.js composable（自带 SIMD/pthreads 探测、singleton、并发去重、fallback 聚合）
import { useOpenCV } from "@composables/useOpenCV.ts"
// 导入本组件语言包
import { langDict } from "./OutlineColorimetric-lang.ts"
// 导入组件数据类型
import type {
  // 上传
  UploadFile, UploadChangeContext,
  // 滑轨
  SliderValue, MySliderMarks
} from "@components/types.ts"

// ==================== 类型声明 ====================

/** 第3步确定轮廓的上下限范围的滑轨传参对象 */
type ThresholdSliderArr = [
  /** 当前值 */
  SliderValue,
  /** marks标记 */
  MySliderMarks,
  /** 步长 */
  number
]

/**
 * canvas 选框 [左|上|右|下] 坐标
 * 初始化为 null，第一次点击后才有值
 */
type Rect = {
  xMin: number | undefined
  yMin: number | undefined
  xMax: number | undefined
  yMax: number | undefined
}

/**
 * 轮廓数据：[面积, 圆心X, 圆心Y, 半径]
 * 是否绘图的标记单独存于 outlineColorimetricObj.drawnContourIndices（Set<number>），
 * 避免元组末尾追加 boolean 字段污染数据语义
 */
type ContourRow = [number, number, number, number]

// ==================== 对象声明 ====================

/**
 * OpenCV.js 加载：单例 composable
 * - OpenCV 是 readonly Ref<OpenCV | null>，加载成功后即 ready
 * - ensureOpenCVReady() 幂等：多次调用复用同一 Promise
 */
const { OpenCVRef, ensureOpenCVReady } = useOpenCV()

/** 派生当前语言的响应式语言包（root / en） */
const langRef = useLang(langDict)

/**
 * 任务状态：
 * 1.  未开始，或删除了图片。正在等待读取图片；
 * 2.  读取到了图片。正在选框裁剪图片；
 * 3.  完成了选框，得到了裁剪的图片。正在寻找并确定轮廓；
 * 4.  完成了轮廓确认，计算RGB。
 *     其实并不存在状态4，因为计算RGB是最后一步，没有下一步了。
 */
const taskStatusRef = ref<1 | 2 | 3>(1)
/** 用户上传的文件数组对象 */
const fileArrRef = ref<UploadFile[]>([])
/**
 * 视图层的<canvas>Dom对象
 * canvas加载很慢，需要等，比较好的等待方法是watch监听钩子。
 * 实测nextTick、onMounted都不如watch。
 */
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvasRef")

/** 第三步确定轮廓的上下限范围数组对象 */
const thresholdSliderAoaRef = ref<ThresholdSliderArr[]>([])

/** 第三步确定轮廓的上下限范围数组对象-常量 */
const thresholdSliderAoaConst: ThresholdSliderArr[] = [
  // 二值化阈值：当前值、marks标记、步长
  [50, [0, 50, 100, 150, 200], 1],
  // 面积位次：当前值（双游标）、marks标记、步长
  [[0, 100], [0, 25, 50, 75, 100], 1],
  // 圆径缩放因子：当前值、marks标记、步长
  [0.5, [0, 0.25, 0.5, 0.75, 1], 0.1]
]

/**
 * 轮廓-比色法业务的全局对象
 * - 非响应式：业务逻辑持有，不进视图层
 */
const outlineColorimetricObj: {
  /** canvas 显示宽度（px） */
  canvasStyleWidth: number | null
  /** 所上传文件的文件名 */
  filename: string | undefined
  /** canvas 2D 绘图上下文 */
  ctx: CanvasRenderingContext2D | null
  /** canvas 元素块的缩放比例：实际/显示 */
  canvasScaling: number
  /** 灰度图 Mat 对象（OpenCV） */
  matGray: OpenCVMat | null
  /** canvas 图像数据，用于 RGB 提取（保留原图色彩） */
  imageData: ImageData | null
  /** canvas 图像位图，用于重绘 */
  imageBitmap: ImageBitmap | null
  /** 选框坐标 */
  rect: Rect
  /** 轮廓数据数组 */
  contourAoa: ContourRow[]
  /** 圆面积排序数组 */
  circleAreaArr: number[]
  /** 当前筛选下"需要绘制/采集数据"的轮廓索引集合 */
  drawnContourIndices: Set<number>
} = {
  canvasStyleWidth: null,
  filename: undefined,
  ctx: null,
  canvasScaling: 0.0,
  matGray: null,
  imageData: null,
  imageBitmap: null,
  rect: {
    xMin: undefined,
    yMin: undefined,
    xMax: undefined,
    yMax: undefined,
  },
  contourAoa: [],
  circleAreaArr: [],
  drawnContourIndices: new Set()
}

// 注册一个<canvas>的响应式鼠标点击监听
const {
  // 鼠标点在<canvas>内部的X坐标、Y坐标
  elementX, elementY,
} = useMouseInElement(canvasRef)

// ==================== 全局钩子 ====================

// 注册一个对taskStatusRef的监听：
// 任务状态改变时，始终保持canvas滚动到视图中间
watch(taskStatusRef, nextTickFocusOnCanvas)

// 生命周期钩子，组件挂载后执行
// 用于进行必要的各类初始化操作
onMounted(() => {
  // 给个加载框
  myLoading(langRef.value.OpenCVLoadingContent)

  // 阻止页面刷新和关闭
  // 该方法不能阻止页面前进（跳转）、后退
  window.addEventListener("beforeunload", beforeunloadHandler)

  // 如果canvas没有初始化（第一次进入页面）
  if (!canvasRef.value) {
    // 注册一个监听钩子，用于实现canvasRef的初始化
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
          // 初始化canvas的绘图上下文对象ctx，赋值给全局对象
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
    // 初始化canvas的绘图上下文对象ctx，赋值给全局对象
    outlineColorimetricObj.ctx = canvasRef.value.getContext(
      // CanvasRenderingContext2D接口的2D渲染上下文
      "2d",
      // 为频繁读取做优化，但仅Gecko内核（FireFox浏览器）支持
      { willReadFrequently: true }
    )
  }
  // 加载 OpenCV.js（幂等：多次调用复用同一 Promise）
  ensureOpenCVReady().then(() => {
    // 停止加载框
    myLoading(false)
  }).catch((error: unknown) => {
    // 停止加载框
    myLoading(false)
    // 报错处理
    errorToast(error)
  })
})

// 生命周期钩子，组件卸载前执行
// 用于进行必要的各类清理操作
onBeforeUnmount(() => {
  // 取消监听：用于阻止页面刷新和关闭
  window.removeEventListener("beforeunload", beforeunloadHandler)
  
  // 释放 OpenCV 灰度图 Mat 的 WASM 线性内存
  // 不显式 delete() 会导致组件销毁后 WASM 内存泄漏（Embind Mat 不受 JS GC 管理）
  outlineColorimetricObj.matGray?.delete()
  // 释放图像位图占用的 GPU 内存
  // ImageBitmap 不受 JS GC 自动 close,必须在卸载前手动 close
  outlineColorimetricObj.imageBitmap?.close()
})

/**
 * 页面关闭、后退或刷新的回调
 * @param event 页面关闭或刷新事件
 */
function beforeunloadHandler(event: BeforeUnloadEvent) {
  // 阻止默认行为
  event.preventDefault()
  // 取消默认事件：兼容方法
  event.returnValue = false
}

/**
 * 错误 toast 提示方法
 * 流程：控制台打印完整错误（保留堆栈，方便 devtools 调试）→ myMessage 弹一个 error 主题的 toast
 *
 * 命名说明：本组件只用 myMessage 做轻量提示，**不弹对话框、不阻塞交互**；
 * 若需要更强反馈（阻塞流程、确认回调），可改用全局 myError 或 myDialog
 */
function errorToast(error: unknown) {
  // 控制台打印完整错误（error 对象会展开 stack）
  console.error(langRef.value.ErrorDialogTitle, error)
  // toast 提示用户：Error 对象用 message 字段，其它类型用 String() 转字符串
  const errorText = (error instanceof Error) ? error.message : String(error)
  myMessage(`${ langRef.value.ErrorDialogTitle }: ${ errorText }`, "error")
}

/**
 * 点击<canvas>触发的回调
 * 步骤2：选框
 */
function onCanvasClick() { try {
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
  errorToast(error)
}}

// ==================== 业务逻辑 ====================

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
 * @param event - 文件数组
 * @param _context - 上下文（add / remove / progress / ...）
 */
async function onPicChange(event: UploadFile[], _context: UploadChangeContext) { try {
  // 如果是清空了照片，则把任务进度切换回1，并直接返回即可
  if (event.length === 0) {
    taskToStep1()
    return
  }
  // 加载框
  myLoading(langRef.value.PicLoadingContent)
  // 接收文件名
  outlineColorimetricObj.filename = event[0]!.name
  // 获取文件的位图数据
  const imageBitmapNew = await window.createImageBitmap(event[0]!.raw!)
  // 关键顺序：先在闭包内锁住旧引用，再 close 旧位图，最后再把新位图挂到全局对象
  // —— 否则在 close 与赋值之间会存在"全局对象指向已 close 的 ImageBitmap" 的中间窗口期，
  // 期间任何 await 后续的同步代码都可能踩到 closed bitmap 抛错
  const imageBitmapOld = outlineColorimetricObj.imageBitmap
  // 关闭旧位图，释放GPU内存
  imageBitmapOld?.close()
  // 把新位图挂到全局对象（替换旧引用）
  outlineColorimetricObj.imageBitmap = imageBitmapNew
  // 第一阶段完成，任务进度改为2
  taskToStep2()
  // 停止加载框
  myLoading(false)
} catch (error: unknown) {
  // 停止加载框
  myLoading(false)
  // 报错处理
  errorToast(error)
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
  nextTick(canvasRestore).catch((error: unknown) => {
    errorToast(error)
  })
}

/**
 * 清空canvas的mask遮罩标记数据
 */
function canvasRectDataRemove() {
  // 清空选框的[上|右|下|左]遮罩边界值
  const rect = outlineColorimetricObj.rect
  rect.xMin = undefined
  rect.yMin = undefined
  rect.xMax = undefined
  rect.yMax = undefined
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
  // 如果canvas或imageBitmap未初始化，则报错
  if (!canvas || !ctx || !imageBitmap) {
    throw new Error("canvas / ctx / imageBitmap 未初始化")
  }
  // 调整canvas的实际宽高：
  // 以图片的原始宽高设定canvas的【实际】宽高，防止图片尺寸和canvas实际尺寸不一致导致的显示问题
  canvas.width = imageBitmap!.width
  canvas.height = imageBitmap!.height
  // 调整canvas的显示高：
  // 接canvas父元素的最大内宽
  const canvasParentClientWidth = canvas.parentElement!.clientWidth
  // 若父容器 clientWidth 为 0
  if (canvasParentClientWidth === 0) {
    // 直接报错
    throw new Error("canvas父元素clientWidth为0")
  }
  // 同步canvas的最大宽度给canvas的【显示宽度】（即父元素的有效宽度）
  outlineColorimetricObj.canvasStyleWidth = canvasParentClientWidth
  canvas.style.width = canvasParentClientWidth + "px"
  // 计算canvas的缩放比例：实际宽度/显示宽度
  const canvasScaling = canvas.width / canvasParentClientWidth
  outlineColorimetricObj.canvasScaling = canvasScaling
  // 设定canvas的显示高度
  canvas.style.height = canvas.height / canvasScaling + "px"
  // 把图片绘制到canvas上
  ctx!.drawImage(imageBitmap!, 0, 0)
  // 设置canvas的绘图上下文
  ctxSetting()
}

/**
 * 设置canvas的绘图上下文ctx
 */
function ctxSetting() {
  // 接ctx及缩放比例相关对象
  const { ctx, canvasScaling } = outlineColorimetricObj
  // 红色笔迹
  ctx!.strokeStyle = "red"
  // 线宽：2像素 x 缩放比例
  ctx!.lineWidth = 2 * canvasScaling
  // 填充色：半透明
  ctx!.fillStyle = "rgba(0, 0, 0, 0.7)"
}

/**
 * 选框方法
 * 用于更新选框的X、Y坐标边界值
 *
 * 算法核心（两次点击后开始生效）：
 * - 第一次点击：以点击位置为中心、RECT_SCALE 比例初始化矩形
 * - 后续点击：
 *   · 任一轴落在选框外 → 对应边界"扩张"到点击位置（选框扩大）
 *   · 两轴都在选框外 → 触发"象限收缩"逻辑（见下）
 *   · 两轴都在选框内 → 用对角线斜率判定点位于哪个象限，把该象限对侧的边收缩到点击位置
 *
 * 注意：
 * - 浮点等于比较（===）已被移除：realElementX/Y 是 elementX.value × canvasScaling 浮点乘积，
 *   几乎不可能精确等于整数 rect.xMin；该分支实际为死代码
 * - 选框宽 / 高为 0 时斜率计算会除零，已加防御
 */
function chooseRect() {
  /** 选框的初始相对尺寸 */
  const RECT_SCALE = 0.8
  // 接遮罩数组、缩放比例
  const { rect, canvasScaling } = outlineColorimetricObj
  // 点击位置的实际X、Y坐标
  const realElementX = elementX.value * canvasScaling
  const realElementY = elementY.value * canvasScaling
  // 如果选框内容未定义，即第一次点击，需记录下选框的坐标
  if ((rect.xMax === undefined) || (rect.yMax === undefined)
    || (rect.xMin === undefined) || (rect.yMin === undefined)) {
    // 接canvas
    const canvas = canvasRef.value!
    // 计算初始化选框的半宽/半高
    const rectHalfX = canvas.width * RECT_SCALE * 0.5
    // Y轴半高：适当压扁一点
    const rectHalfY = canvas.height * RECT_SCALE * 0.5
    // 根据点击位置记录坐标
    rect.xMax = Math.min((realElementX + rectHalfX), canvas.width)
    rect.yMax = Math.min((realElementY + rectHalfY), canvas.height)
    rect.xMin = Math.max((realElementX - rectHalfX), 0)
    rect.yMin = Math.max((realElementY - rectHalfY), 0)
    // 选框边界已更新，直接返回即可
    return
  }
  // === 边框已定义：先扩张 X / Y 方向的边界 ===
  // 计数器：表示"多少个轴的方向还落在选框内"
  // 任一轴越界 → 对应方向边界扩张；最终若 < 2，说明只扩张了一侧，不再走象限收缩
  let isInRectAxes = 0
  if (realElementX < rect.xMin) {
    rect.xMin = realElementX
  } else if (realElementX > rect.xMax) {
    rect.xMax = realElementX
  } else {
    isInRectAxes++
  }
  if (realElementY < rect.yMin) {
    rect.yMin = realElementY
  } else if (realElementY > rect.yMax) {
    rect.yMax = realElementY
  } else {
    isInRectAxes++
  }
  // 只在一侧扩张、或单点抖动 → 直接返回，避免象限收缩破坏选框整体形态
  if (isInRectAxes < 2) {
    return
  }
  // === 两轴都在选框内 → 用对角线斜率判定象限，做象限收缩 ===
  // 防御：选框宽 / 高为 0 时斜率计算会除零
  const rectWidth = rect.xMax - rect.xMin
  const rectHeight = rect.yMax - rect.yMin
  if ((rectWidth === 0) || (rectHeight === 0)) {
    // 直接返回，相当于本次点击无效
    return
  }
  const rectSlope = rectHeight / rectWidth
  const realElementSlopePositive = (realElementY - rect.yMin) / (realElementX - rect.xMin)
  const realElementSlopeNegative = (realElementY - rect.yMin) / (realElementX - rect.xMax)
  // 象限判定：点位于哪个象限，就把那个象限"对侧"的边收缩到点击位置
  if (realElementSlopePositive >= rectSlope) {
    if (realElementSlopeNegative <= -rectSlope) {
      rect.yMax = realElementY
    } else {
      rect.xMin = realElementX
    }
  } else {
    if (realElementSlopeNegative <= -rectSlope) {
      rect.xMax = realElementX
    } else {
      rect.yMin = realElementY
    }
  }
}

/**
 * 绘制选框
 */
function drawRect() {
  // 接对象
  const { rect, ctx, imageBitmap } = outlineColorimetricObj
  // 接canvas对象
  const canvas = canvasRef.value!
  // 接绘制框的宽高
  const rectWidth = rect.xMax! - rect.xMin!
  const rectHeight = rect.yMax! - rect.yMin!
  // 先对canvas进行重绘制，去掉上一次的绘制
  ctx!.drawImage(imageBitmap!, 0, 0)
  // 给一个遮罩
  ctx!.fillRect(0, 0, canvas.width, canvas.height)
  // 重绘选框中部
  ctx!.drawImage(
    imageBitmap!,
    rect.xMin!, rect.yMin!, rectWidth, rectHeight,
    rect.xMin!, rect.yMin!, rectWidth, rectHeight
  )
  // 绘制中间线框
  ctx!.strokeRect(rect.xMin!, rect.yMin!, rectWidth, rectHeight)
}

/**
 * 点击"裁剪图片"按钮的事件回调钩子
 * @param isFinalize 是否完成裁剪（true=进入步骤3，false=仅预览裁剪结果，继续调整选框）
 */
async function onSureRect(isFinalize: boolean) { try {
  // 接选框对象
  const { rect, imageBitmap } = outlineColorimetricObj
  // 接canvas对象
  const canvas = canvasRef.value!
  // 如果有选框
  if (rect.xMax) {
    // 以选框获取新的imageBitmap图像位图元数据
    const imageBitmapNew = await window.createImageBitmap(
      imageBitmap!,
      rect.xMin!, rect.yMin!, (rect.xMax! - rect.xMin!), (rect.yMax! - rect.yMin!)
    )
    // 关键顺序：闭包内的 imageBitmap 已锁住旧引用（来自解构），
    // 先 close 旧位图释放 GPU 内存，再把新位图挂到全局对象；
    // —— 中间不存在"全局对象指向已 close ImageBitmap" 的窗口期
    imageBitmap?.close()
    outlineColorimetricObj.imageBitmap = imageBitmapNew
    // 更新canvas的图像位图元数据后，把图片绘制到canvas上
    canvasRestore()
    // 清空裁剪标记
    canvasRectDataRemove()
  }
  // 如果是"完成裁剪"，则：
  // 1.  备份ImageData
  // 2.  把canvas图像转为灰度图Mat对象
  // 3.  进入下一步
  if (isFinalize === true) {
    // 接绘图上下文ctx对象、cv对象、图片的宽高
    const { ctx, matGray, imageBitmap } = outlineColorimetricObj
    const { width, height } = imageBitmap!
    // OpenCV 必须已加载（onMounted 已 await ensureOpenCVReady）
    const cv = OpenCVRef.value
    if (!cv) {
      throw new Error("OpenCV.js 尚未加载完成")
    }
    // 备份imageData，后面直接读取RGB用
    outlineColorimetricObj.imageData = ctx!.getImageData(0, 0, width, height)
    // 读取图片文件为OpenCV的Mat对象
    const matOrigin = cv.imread(canvas)
    // 如果全局灰度图Mat对象存在且有成员对象delete方法，则先删除
    matGray?.delete()
    // 初始化全局灰度图Mat对象
    const matGrayNew = new cv.Mat()
    // 将原始图像Mat转为灰度Mat，赋值给全局灰度图Mat对象
    cv.cvtColor(
      matOrigin,
      matGrayNew,
      cv.COLOR_RGBA2GRAY,
      0
    )
    outlineColorimetricObj.matGray = matGrayNew
    // 释放原图Mat的WASM内存
    matOrigin.delete()
    // 任务状态进展到"3"
    taskToStep3()
  }
} catch (error: unknown) {
  errorToast(error)
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
  // 把"粗/西调"设置成粗调
  // isContourCoarseRef.value = true
  // 初始化滑轨参数
  thresholdNumRestore()
  // 任务进度改为3
  taskStatusRef.value = 3
  // 下一个DOM周期：用轮廓查找方法刷新一次轮廓渲染
  nextTick(getAndDrawContours).catch((error: unknown) => {
    errorToast(error)
  })
}

/**
 * 聚焦canvas
 * 下个DOM渲染周期将canvas滚动到视图中
 */
function nextTickFocusOnCanvas() {
  nextTick(focusOnCanvas).catch((error: unknown) => {
    errorToast(error)
  })
  /**
   * 聚焦canvas的内部方法
   */
  function focusOnCanvas() {
    // 接参数
    const canvas = canvasRef.value
    if (!canvas) return
    // 滚动到canvas
    canvas.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest"
    })
  }
}

/**
 * 初始化调参参数的滑轨
 * 如果滑轨Ref值为空，则全部初始化；
 * 否则保留每个传参的当前值，对范围、步进等初始化
 */
function thresholdNumRestore() {
  // 接参数
  const thresholdSliderAoa = thresholdSliderAoaRef.value
  // 如果滑轨参数为空，则初始化滑轨参数
  if (thresholdSliderAoa.length === 0) {
    thresholdSliderAoaRef.value = deepCopyAoa(thresholdSliderAoaConst)
  // 否则，保留每个参数的取值
  } else {
    // 先深拷贝一份参数副本
    const thresholdSliderAoaTemp = deepCopyAoa(thresholdSliderAoaConst)
    // 遍历数组
    for (let i = 0; i < thresholdSliderAoa.length; i++) {
      // 对数值进行赋值
      thresholdSliderAoaTemp[i]![0] = thresholdSliderAoa[i]![0]
    }
    // 赋值给滑轨参数
    thresholdSliderAoaRef.value = thresholdSliderAoaTemp
  }
  /** 深拷贝AOA数组 */
  function deepCopyAoa(aoa: ThresholdSliderArr[]): ThresholdSliderArr[] {
    // 初始化临时数组
    const aoaTemp: ThresholdSliderArr[] = []
    // 遍历数组
    for (const arr of aoa) {
      // 值
      const value =
        Array.isArray(arr[0])
          ? [...arr[0]]
          : arr[0]
      // 范围
      const range: MySliderMarks = [...arr[1]]
      // 步进
      const step = arr[2]
      // 推入临时数组
      aoaTemp.push([value, range, step])
    }
    return aoaTemp
  }
}

/**
 * 滑轨调节的事件回调钩子
 * @param paramIndex 参数的 index 序号
 */
function onSlideChange(paramIndex: SliderValue) { try {
  // 如果是第1个滑轨
  if (paramIndex === 0) {
    // 则需要重新获取轮廓数据（leading-only：拖动立即响应）
    getAndDrawContoursLeading()
  // 否则，只需要重新绘制轮廓
  } else {
    drawContoursThrottled()
  }
} catch (error: unknown) {
  errorToast(error)
}}

/**
 * 滑轨 1（二值化阈值）的 leading-only 节流方法
 * - 立即触发：用户拖动滑轨的第一次变化就立刻重算轮廓（不需等 500ms）
 * - 500ms 内不再触发：避免拖动过程中反复重算导致卡顿
 * - 与 trailing-only 不同：trailing 会让"拖动过程中"完全无视觉反馈，必须等用户停下来
 */
const getAndDrawContoursLeading = useThrottleFn(getAndDrawContours, 500, true)

/**
 * 滑轨 2/3（筛选 / 缩放）的 trailing-only 节流方法
 * - 等用户停止拖动 500ms 后再触发最后一次
 * - 拖动过程中无视觉反馈，但避免连续触发 drawContours 全图重绘卡顿
 */
const drawContoursThrottled = useThrottleFn(drawContours, 500, true)

/**
 * 获取轮廓数据并绘制轮廓
 * @note 会调用轮廓绘制drawContours()方法
 */
function getAndDrawContours() {
  // 接二值化参数
  const binaryThresh = (thresholdSliderAoaRef.value[0]![0] as number)
  // 接cv和灰度图Mat对象
  const { matGray } = outlineColorimetricObj
  // OpenCV 必须已加载（步骤2的 onSureRect(true) 已确保）
  const cv = OpenCVRef.value
  if (!cv || !matGray) {
    throw new Error("OpenCV.js 未就绪或灰度图缺失")
  }
  // 初始化二值化的Mat对象
  const matBinary = new cv.Mat()
  cv.threshold(
    matGray,
    matBinary,
    binaryThresh,
    255,
    cv.THRESH_BINARY
  )
  // 初始化轮廓查找的MatVector对象
  const matVectorContours = new cv.MatVector()
  // 初始化轮廓层次结构hierarchy
  const hierarchy = new cv.Mat()
  cv.findContours(
    matBinary,
    matVectorContours,
    hierarchy,
    cv.RETR_EXTERNAL,
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
    // 轮廓的矩：m00 = 轮廓面积
    const { m00: circleArea } = cv.moments(matContour, true)
    // 如果轮廓面积小于等于1，则忽略此轮廓
    if (circleArea <= 1) {
      continue forEachContours
    }
    // 获取该轮廓的最小外接圆。有 center.x, center.y, radius
    const minEnclosingCircle = cv.minEnclosingCircle(matContour)
    // 装箱
    contourAoa.push([
      circleArea,
      minEnclosingCircle.center.x, minEnclosingCircle.center.y,
      minEnclosingCircle.radius,
    ])
    circleAreaArr.push(circleArea)
    // 结束，释放WASM内存
    matContour.delete()
  }
  // 对面积数组进行排序
  circleAreaArr.sort((a, b) => a - b)
  // 结束，释放WASM内存
  matBinary.delete()
  matVectorContours.delete()
  hierarchy.delete()
  // 最后，调用一下绘制轮廓方法
  drawContours()
}

/**
 * 绘制轮廓
 *
 * 数据流：
 * - 先清空 drawnContourIndices（旧的索引集合作废）
 * - 遍历 contourAoa：把符合面积范围的轮廓索引加入 drawnContourIndices，并 ctx.arc + stroke 绘制
 * - drawnContourIndices 供 contourToMatrix 在导出数据时复用，避免重复遍历
 */
function drawContours() {
  // 接参数：面积位次、缩放
  const [
    // 第一行：二值化阈值，没用
    ,
    // 第二行：面积位次，取第一个参数（值为数组）
    [areaPercentOrder],
    // 第三行：缩放
    [scale],
  ] = thresholdSliderAoaRef.value as [ThresholdSliderArr, ThresholdSliderArr, ThresholdSliderArr]
  const [areaPercentOrderMin, areaPercentOrderMax] = areaPercentOrder as [number, number]
  // 接参数：canvas上下文、轮廓数组、圆面积排序数组
  const { ctx, contourAoa, circleAreaArr, drawnContourIndices } = outlineColorimetricObj
  // 轮廓数量
  const circleCount = circleAreaArr.length
  // 位次下取大，上取小
  const circleAreaMinIndex = Math.ceil(circleCount * areaPercentOrderMin / 100)
  const circleAreaMaxIndex = Math.floor(circleCount * areaPercentOrderMax / 100)
  // 获得面积的最小值和最大值
  const circleAreaMin = circleAreaArr[circleAreaMinIndex]
  const circleAreaMax = circleAreaArr[circleAreaMaxIndex]
  // 把此前的轮廓图清空
  canvasRestore()
  // 清空"待绘图索引集合"——本轮筛选结果会重新填充
  drawnContourIndices.clear()
  // 遍历所有轮廓（按索引遍历，与 Set 配套）
  forEachContours: for (let i = 0; i < contourAoa.length; i++) {
    const contour = contourAoa[i]!
    // 若面积不符合条件，则跳过（不入集合、不绘图）
    if ((contour[0] < circleAreaMin!) || (contour[0] > circleAreaMax!)) {
      continue forEachContours
    }
    // 标记为"待绘图"：写入索引集合
    drawnContourIndices.add(i)
    // 开始绘图
    ctx!.beginPath()
    // 圆环
    ctx!.arc(
      contour[1], contour[2],
      (contour[3] * (scale as number)),
      0, (2 * Math.PI)
    )
    // 绘制
    ctx!.stroke()
  }
}

/**
 * 点击"下载数据"按钮的事件回调钩子
 */
function onDownloadData() { try {
  // 把轮廓数组转换成排列好了的矩阵
  const contourMatrixAoaoa = contourToMatrix()
  // 把矩阵化的轮廓数据转换成处理好的RGB结果数据数据
  const resultAoaoa = contourMatrixToRGB(contourMatrixAoaoa)
  // 下载RGB数据
  downloadRGB(resultAoaoa)
} catch (error: unknown) {
  errorToast(error)
}}

/**
 * 把轮廓数组转换成排列好了的矩阵
 * 外维是X，内维是Y
 *
 * 注：仅处理 outlineColorimetricObj.drawnContourIndices 中的轮廓（由 drawContours 写入），
 * 与"是否需要绘图"语义保持一致；不再从元组末尾读取 boolean 字段
 */
function contourToMatrix(): ([number, number, number] | undefined)[][] {
  // 接轮廓数组、缩放参数
  const { contourAoa, drawnContourIndices } = outlineColorimetricObj
  const scale = thresholdSliderAoaRef.value[2]![0] as number
  // 建立X、Y的排序表
  const xAoa: [number, number][] = []
  const yAoa: [number, number][] = []
  // 遍历所有轮廓
  forEachContour1: for (let i = 0; i < contourAoa.length; i++) {
    // 如果不在 drawnContourIndices 中，则跳过（不参与矩阵构建）
    if (!drawnContourIndices.has(i)) {
      continue forEachContour1
    }
    const contour = contourAoa[i]!
    // 获取轮廓的X、Y中心坐标和边界坐标
    const xCenter = contour[1]
    const xLeft = contour[1] - contour[3]
    const xRight = contour[1] + contour[3]
    const yCenter = contour[2]
    const yDown = contour[2] - contour[3]
    const yUp = contour[2] + contour[3]
    // 遍历X轮廓数组
    let xIndex = 0
    while (xIndex < xAoa.length) {
      if ((xCenter >= xAoa[xIndex]![0]) && (xCenter <= xAoa[xIndex]![1])) {
        if (xLeft < xAoa[xIndex]![0]) {
          xAoa[xIndex]![0] = xLeft
        }
        if (xRight > xAoa[xIndex]![1]) {
          xAoa[xIndex]![1] = xRight
        }
        break
      }
      xIndex++
    }
    if (xIndex === xAoa.length) {
      xAoa.push([xLeft, xRight])
    }
    // 遍历Y轮廓数组
    let yIndex = 0
    while (yIndex < yAoa.length) {
      if ((yCenter >= yAoa[yIndex]![0]) && (yCenter <= yAoa[yIndex]![1])) {
        if (yDown < yAoa[yIndex]![0]) {
          yAoa[yIndex]![0] = yDown
        }
        if (yUp > yAoa[yIndex]![1]) {
          yAoa[yIndex]![1] = yUp
        }
        break
      }
      yIndex++
    }
    if (yIndex === yAoa.length) {
      yAoa.push([yDown, yUp])
    }
  }
  // 遍历结束，对xAoa和yAoa进行排序
  xAoa.sort((a, b) => (a[0] - b[0]))
  yAoa.sort((a, b) => (a[0] - b[0]))
  // 构造一个轮廓数据的AOA数组，外围row(Y)，内围col(X)
  const contourMatrixAoa: ([number, number, number] | undefined)[][] = []
  for (let row = 0; row < yAoa.length; row++) {
    contourMatrixAoa.push([])
  }
  // 遍历所有轮廓
  forEachContour2: for (let i = 0; i < contourAoa.length; i++) {
    if (!drawnContourIndices.has(i)) {
      continue forEachContour2
    }
    const contour = contourAoa[i]!
    const xCenter = contour[1]
    const yCenter = contour[2]
    for (let row = 0; row < yAoa.length; row++) {
      if ((yCenter >= yAoa[row]![0]) && (yCenter <= yAoa[row]![1])) {
        for (let col = 0; col < xAoa.length; col++) {
          if ((xCenter >= xAoa[col]![0]) && (xCenter <= xAoa[col]![1])) {
            contourMatrixAoa[row]![col] = [
              contour[1], contour[2], contour[3] * scale
            ]
          }
        }
      }
    }
  }
  return contourMatrixAoa
}

/**
 * 把矩阵化的轮廓数据转换成处理好的RGB结果数据数据
 * @returns 结果矩阵，最外层为 [R-ave, R-sd, G-ave, G-sd, B-ave, B-sd] 的 [][]
 */
function contourMatrixToRGB(contourMatrixAoaoa: ([number, number, number] | undefined)[][]): number[][][] {
  // 接imageData数据，用于提取RGB值
  const { width: imageDataWidth, data: imageDataArray } = outlineColorimetricObj.imageData!
  /** 构建用于输出的数组 */
  const dataAoaoa: number[][][] = []
  // 要有6个维度，因为要分别输出R、G、B，以及相应的SD值
  for (let i = 0; i < 6; i++) {
    dataAoaoa.push([])
  }
  // 遍历所有轮廓数据获取RGB值
  // 遍历每一行
  forEachRow: for (let row = 0; row < contourMatrixAoaoa.length; row++) {
    // 给dataAoaoa的每个维度都添加一个新行
    for (let i = 0; i < 6; i++) {
      dataAoaoa[i]!.push([])
    }
    // 遍历当前行的每一列
    forEachCol: for (let col = 0; col < contourMatrixAoaoa[row]!.length; col++) {
      /** 接轮廓数据 */
      const contourData = contourMatrixAoaoa[row]![col]
      // 如果轮廓数据为空，则跳过
      if (!contourData) {
        continue forEachCol
      }
      // 获取轮廓内所有点的X、Y坐标
      const contourPointAoa = getContourPoints(contourData)
      // 用于接收RGB值的数组
      const uniPointArr: number[][] = [[], [], []]
      // 遍历所有点
      forEachPoint: for (const point of contourPointAoa) {
        // 获取点的X、Y坐标
        const [x, y] = point
        // 获取点的索引
        const index = (y * imageDataWidth + x) * 4
        for (let i = 0; i < 3; i++) {
          uniPointArr[i]!.push(imageDataArray[index + i]!)
        }
      }
      // 遍历计算平均值和标准差
      for (let i = 0; i < uniPointArr.length; i++) {
        const [ave, sd] = aveAndSD(uniPointArr[i]!)
        dataAoaoa[i * 2]![row]![col] = ave
        dataAoaoa[i * 2 + 1]![row]![col] = sd
      }
    }
  }
  return dataAoaoa
}

/**
 * 由轮廓数据获取全部的点
 * @param contourData 轮廓X、Y、半径
 */
function getContourPoints(contourData: [number, number, number]): [number, number][] {
  // 接数据
  const [xCenter, yCenter, radius] = contourData
  // 如果半径小于1，则返回空数组
  if (radius < 1) {
    return []
  }
  // radius平方
  const radiusSquare = radius * radius
  /** 构造一个数组，用于存储轮廓数据，初始化圆点 */
  const contourPointAoa: [number, number][] = [[Math.round(xCenter), Math.round(yCenter)]]
  // 从X开始遍历
  forEachX: for (let xDelta = 1; xDelta <= radius; xDelta++) {
    // 以 x² + y² <= r² 计算出 y 的最大值
    // 计算 y² 的最大值
    const ySquareMax = radiusSquare - xDelta * xDelta
    // 计算 y 的最大值
    const yDeltaMax = Math.sqrt(ySquareMax)
    // 如果 y 的最大值小于1，则跳过
    if (yDeltaMax < 1) {
      continue forEachX
    }
    // 遍历 y
    forEachY: for (let yDelta = 1; yDelta <= yDeltaMax; yDelta++) {
      // 计算坐标点
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
 */
function aveAndSD(arr: number[]): [number, number] {
  let sum = 0
  for (let i = 0; i < arr.length; i++) {
    sum = sum + arr[i]!
  }
  const ave = sum / arr.length
  sum = 0
  for (let i = 0; i < arr.length; i++) {
    sum = sum + (arr[i]! - ave) ** 2
  }
  const sd = Math.sqrt(sum / (arr.length - 1))
  return [ave, sd]
}

/**
 * 下载最终的结果文件
 * @param resultAoaoa 结果矩阵数据
 *
 * 文件名：以源文件名（去掉扩展名）作为前缀，避免多次下载覆盖
 * —— 例如上传 "sample.png"，下载为 "sample_rgb.xlsx"
 */
function downloadRGB(resultAoaoa: number[][][]) {
  // 建立工作表文件的Map对象
  const resultMap = new Map<string, number[][]>()
  // 表格名称
  const sheetNameArr = ["R-Ave", "R-SD", "G-Ave", "G-SD", "B-Ave", "B-SD"]
  for (let i = 0; i < sheetNameArr.length; i++) {
    resultMap.set(sheetNameArr[i]!, resultAoaoa[i]!)
  }
  // AOA数据的Map对象转成xlsx文件
  const workbook = aoaMapToWorkbook(resultMap)
  // 文件名：<源文件名去后缀>_rgb.xlsx；源文件名为空时回落 data_rgb.xlsx
  const sourceFilename = outlineColorimetricObj.filename
  const basename = (sourceFilename !== undefined)
    ? sourceFilename.replace(/\.[^/.]+$/, "")
    : "data"
  // 下载xlsx文件
  downloadXlsx(workbook, `${ basename }_rgb.xlsx`)
}

</script>
