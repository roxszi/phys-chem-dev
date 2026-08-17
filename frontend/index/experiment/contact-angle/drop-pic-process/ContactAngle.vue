<!--
  接触角求解-多算法版
  通过图片处理，得到轮廓数据，然后通过计算拟合最终求解接触角。
  计算机视觉库的实现，以及一些交互的设计思路。
  构建OpenCV.js：https://docs.opencv.ac.cn/4.12.0/d4/da1/tutorial_js_setup.html
  交互主要分4步完成，共5个状态：
  1.  读取图片/上传图片。读取到的图片将直接灰度化，渲染在canvas上。
      此处的交互主要就是上传图片。
      此步骤将保存原图片的Mat对象，以便后续使用。
  2.  裁剪图片为合适的尺寸。裁剪完毕后将裁剪好的图片渲染在canvas上。
      短按控制边框；长按清空已有选框。可以反复多次裁剪。直至点击"完成裁剪"按钮。
      此步骤将覆盖保存Mat图像，即用裁剪后的灰度Mat图像替换原Mat图像。
      同时，也将保存canvas的imageData对象，以便后续使用。
  3.  寻找液滴的最佳轮廓。
      有2个算法（默认的Canny算法更好），调节switch开关以切换。
      Canny算法有2个参数（2个滑轨），阈值化方法有1个参数（1个滑轨）。
      调节滑轨可实时查看轮廓效果（灰度图叠加轮廓线）。
      设置了粗调、细调的切换。切换后可细化/粗化滑轨的范围值。
      长按canvas可清空效果。
      此步骤结束时将保存轮廓数据为坐标数组，然后迭代优化获得椭圆对象。
      然后会将椭圆对象绘制在canvas上，并保存灰度图+拟合椭圆的imageData对象，以便下一步使用。
  4.  寻找基线。
      在第3步叠加imageData基础上寻找基线。
      点击canvas将粗调基线。canvas分左中右3个部分，左右用于调整单边截距，中间用于调整双截距。
      同时设置了左、右调节滑轨，可微调左右截距，并实时查看基线效果。
      此步骤结束时将获得基线的截距。
  5.  计算接触角。此处不用再有复杂交互。
      得到接触角后，将出现结果表格，以及下载按钮，可以以excel表格格式下载数据结果。
 -->

<!--
  特别的注意事项/开发札记：
  这里有一个巨大的坑点，就是计算机的Y轴是以向下为正的。
 -->

<!--
  视图层
 -->
<template><div class="my-column my-gap">

  <!-- 警报框 -->
  <MyNoticeBar theme="info" :title="langRef.FunctionIntroductionTitle">
    <p v-for="(content, index) of langRef.FunctionIntroductionContent" :key="index">
      {{ content }}
    </p>
  </MyNoticeBar>

  <!-- canvas头-步骤1 -->
  <!-- 警报框 -->
  <MyNoticeBar
    v-if="taskStatusRef === 1"
    theme="warning" :title="langRef.StepTitle + '1'"
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
    accept="image/*"
    :max="1"
    theme="image"
    v-model:files="fileArrRef"
    :onChange="onPicChange"
  />

  <!-- canvas头-步骤2 -->
  <!-- 警报框 -->
  <MyNoticeBar
    v-if="taskStatusRef === 2"
    theme="warning" :title="langRef.StepTitle + '2'"
  >
    <p v-for="(content, index) of langRef.Step2Content" :key="index">
      {{ content }}
    </p>
  </MyNoticeBar>

  <!--
    canvas头-步骤3
    这里有一个switch开关，用于切换边缘检测算法。
    Canny算法和阈值化算法。恰好都有2个参数，一主一辅，所以UI是可以统一的。
    （参数调节放在"canvas脚-步骤3"部分了）
    onContourAlgorithmSwitchChange：切换算法时触发。
   -->
  <div
    v-else-if="taskStatusRef === 3"
    class="my-column my-gap"
  >
    <!-- 警报框 -->
    <MyNoticeBar theme="warning" :title="langRef.StepTitle + '3'">
      <p v-for="(content, index) of langRef.Step3Content" :key="index">
        {{ content }}
      </p>
    </MyNoticeBar>

    <!-- 警报框：轮廓算法/边缘检测算法切换开关 -->
    <MyNoticeBar theme="info" :title="langRef.ContourAlgorithmTitle">
      <p v-for="(content, index) of langRef.ContourAlgorithmContent" :key="index">
        <strong>{{ content.strong }}</strong>{{ content.normal }}
      </p>
    </MyNoticeBar>
    <!-- 边缘检测算法切换选框 -->
    <MyRadio
      :onChange="onContourAlgorithmSwitch"
      v-model:value="contourAlgorithmRadioRef"
      :radioContentArr="langRef.ContourAlgorithmArr"
    />

    <!-- 警报框：遮罩 -->
    <MyNoticeBar theme="info" :title="langRef.ContourMaskTitle">
      <p v-for="(content, index) of langRef.ContourMaskContent" :key="index">
        <strong>{{ content.strong }}</strong>{{ content.normal }}
      </p>
    </MyNoticeBar>
    <!-- 遮罩切换选框 -->
    <MyRadio
      v-model:value="contourFilterAlgorithmRadioRef"
      :radioContentArr="langRef.ContourMaskContentArr"
    />

  </div>

  <!-- canvas头-步骤4 -->
  <!-- 警报框 -->
  <MyNoticeBar
    v-else-if="taskStatusRef === 4"
    theme="warning" :title="langRef.StepTitle + '4'"
  >
    <div v-for="(content, index) of langRef.Step4Content" :key="index">
      {{ content }}
    </div>
  </MyNoticeBar>

  <!--
    canvas元素块
    这个一直存在。这是最重要的，从第二步开始，其它的元素块都围绕这个展开
    onCanvasClick：点击canvas时触发。
      步骤2时用于选框；步骤4时用于粗选基线。
    onLongPress：在逻辑层注册，长按canvas时触发。
      步骤2、步骤3时用于清空选框（初始化）。
   -->
  <div style="width: 100%; overflow: hidden">
    <canvas
      v-show="taskStatusRef >= 2"
      ref="canvasRef"
      @click="onCanvasClick"
    ></canvas>
  </div>

  <!--
    canvas脚-步骤2
    主要就是选框裁剪。主要交互放在canvas上了。这里只是按钮。
   -->
  <div
    v-if="taskStatusRef === 2"
    class="my-row my-gap"
  >
    <!-- 裁剪图片 -->
    <MyButton
      @click="onSureRect(false)"
      :block="false"
    >
      {{ langRef.CutPictureButtonText }}
    </MyButton>
    <!-- 裁剪完成 -->
    <MyButton
      @click="onSureRect(true)"
      :block="false" theme="danger"
    >
      {{ langRef.CutPictureCompleteButtonText }}
    </MyButton>
  </div>

  <!--
    canvas脚-步骤3
    主要就是调节滑轨来实现轮廓选择。有按钮来控制滑轨的粗调和细调切换。
    onSlideChange：滑轨变化时触发，用于实时渲染轮廓效果。
    onContourSlideChangeEnd：滑轨变化结束时触发，用于在细调的时候，更新滑轨的可移动范围。
    contourCoarseToggle：切换滑轨的粗调和细调。
    onDetermineContour：最终确定轮廓的按钮事件回调钩子。
   -->
  <div
    v-else-if="taskStatusRef === 3"
    class="my-column"
  >
    <!-- 滑轨：主参数 -->
    <MySlider
      :title="langRef.ContourSliderMainParameterLabelArr[contourAlgorithmRadioRef]"
      :onChange="onSliderChange"
      :onChangeEnd="onSliderChangeEnd"
      v-model:value="thresholdSliderAoaRef[0]![0]"
      :marks="thresholdSliderAoaRef[0]![1]"
      :step="1"
    />
    <!-- 滑轨：辅助参数 -->
    <MySlider
      v-if="contourAlgorithmRadioRef === 0"
      :title="langRef.ContourSliderAuxiliaryParameterLabel"
      :onChange="onSliderChange" :onChangeEnd="onSliderChangeEnd"
      v-model:value="thresholdSliderAoaRef[1]![0]"
      :marks="thresholdSliderAoaRef[1]![1]"
      :step="1"
    />
    <!-- 容器（按钮容器） -->
    <div class="my-row my-gap">
      <!-- 轮廓粗调/细调切换 -->
      <MyButton
        @click="onContourSliderCoarseFineToggle"
        :block="false" :theme="isContourCoarseRef ? 'primary' : 'warning'"
      >
        {{
          isContourCoarseRef
            ? langRef.ContourSliderSwitchFineButtonLabel
            : langRef.ContourSliderSwitchCoarseButtonLabel
        }}
      </MyButton>
      <!-- 确定轮廓 -->
      <MyButton
        @click="onDetermineContour"
        :block="false" theme="danger"
      >
        {{ langRef.ContourDetermineButtonLabel }}
      </MyButton>
    </div>
  </div>

  <!--
    canvas脚-步骤4
    主要就是找基线。点击canvas实现基线粗找，调节滑轨来实现基线细调。
    onSlideChange：滑轨变化时触发，用于实时渲染基线效果。
    没有滑轨变化结束时的触发方法/钩子，因为canvas事件回调钩子会劫持slider的change事件，使其没有end。
    onBackToStep3：返回第3步，这里需要有次功能，以满足找基线时候对轮廓的反复微调。
    onDetermineBaseline：最终确定基线的按钮事件回调钩子。
   -->
  <div
    v-else-if="taskStatusRef === 4"
  >
    <!-- 滑轨：左截距 -->
    {{ langRef.InterceptLeftSliderLabel }}
    <MySlider
      :onChange="onSliderChange"
      :onChangeEnd="onSliderChangeEnd"
      v-model:value="interceptSliderAoaRef[0]![0]"
      :marks="interceptSliderAoaRef[0]![1]"
    />
    <!-- 滑轨：右截距 -->
    {{ langRef.InterceptRightSliderLabel }}
    <MySlider
      :onChange="onSliderChange"
      :onChangeEnd="onSliderChangeEnd"
      v-model:value="interceptSliderAoaRef[1]![0]"
      :marks="interceptSliderAoaRef[1]![1]"
    />
    <!-- 容器（按钮容器） -->
    <div class="my-row my-gap">
      <!-- 返回上一步 -->
      <MyButton
        @click="onBackToStep3"
        :block="false" theme="default"
      >
        {{ langRef.StepBackButtonLabel }}
      </MyButton>
      <!-- 确认基线 -->
      <MyButton
        @click="onDetermineBaseline"
        :block="false" theme="primary"
      >
        {{ langRef.BaselineConfirmButtonLabel }}
      </MyButton>
    </div>
  </div>

  <!--
    canvas脚-步骤5
    数据结果的呈现：数据表格、下载按钮
   -->
  <div
    v-if="resultTableDataRef?.length !== 0"
    class="my-column my-gap"
  >
    <!-- 表格和翻页器容器 -->
    <div>
      <!-- 接触角数据表格 -->
      <div class="my-w100"><table>
        <!-- 表头 -->
        <thead>
          <tr>
            <th v-for="(content, index) of langRef.ResultTableContent" :key="index">
              {{ content }}
            </th>
            <!-- 处理 -->
            <th>{{ langRef.ResultTableProcessingLabel }}</th>
          </tr>
        </thead>
        <!-- 表格体 -->
        <tbody>
          <tr v-for="(resultArr, index) in resultTableDataRef" :key="index">
            <td>{{ resultArr[0] + 1 }}</td>
            <td>{{ resultArr[1] }}</td>
            <td>{{ resultArr[2]?.toFixed(2) }}</td>
            <td>{{ resultArr[3]?.toFixed(2) }}</td>
            <td>{{ resultArr[4]?.toFixed(2) }}</td>
            <td>{{ resultArr[5]?.toFixed(2) }}</td>
            <td>{{ resultArr[6]?.toFixed(2) }}</td>
            <td>{{ resultArr[7]?.toFixed(4) }}</td>
            <td>{{ langRef.FitNatureStrMap[resultArr[8]] ?? resultArr[8] }}</td>
            <!-- 删除按钮 -->
            <td><MyButton
              @click="onDeleteUniResult(resultArr[0])"
              :block="false" theme="danger"
            >
              {{ langRef.ResultTableDeleteButtonLabel }}
            </MyButton></td>
          </tr>
        </tbody>
      </table></div>
      <!-- 分页器 -->
      <t-pagination
        v-model:current="resultTableCurrentPageRef"
        :total="resultRef.length"
        :showFirstAndLastPageBtn="false"
        :showJumper="true"
        :showPageNumber="false"
        :showPageSize="false"
        :showPreviousAndNextBtn="true"
      /><t-divider />
    </div>

    <!-- 容器（按钮容器） -->
    <div class="my-row my-gap">
      <!-- 倒序/正序 -->
      <MyButton
        @click="onReverseResultOrder"
        :block="false" theme="default"
      >
        {{
          isResultReverseRef === false
            ? langRef.ResultTableReverseButtonLabel
            : langRef.ResultTableNormalButtonLabel
        }}
      </MyButton>
      <!-- 下载数据 -->
      <MyButton
        @click="onDownloadResult"
        :block="false" theme="primary"
      >
        {{ langRef.ResultTableExportButtonLabel }}
      </MyButton>
      <!-- 清空数据 -->
      <MyButton
        @click="onDeleteAllResult"
        :block="false" theme="danger"
      >
        {{ langRef.DeleteAllResultButtonLabel }}
      </MyButton>
    </div>
  </div>
</div></template>


<!--
  逻辑层
 -->
<script setup lang="ts">
// 导入VueUse的各类响应式方法
import { useMouseInElement, onLongPress, useThrottleFn } from "@vueuse/core"
// 导入xlsx相关方法
import { aoaMapToWorkbook, downloadXlsx } from "@utils/xlsx.ts"
// 导入OpenCV.js composable
import { useOpenCV } from "@composables/useOpenCV.ts"
// 导入纯算法模块（无UI依赖的纯计算逻辑）
import * as Algorithm from "./ContactAngle-algorithm.ts"
// 导入本组件语言包
import { langDict } from "./ContactAngle-lang.ts"
// 导入组件数据类型
import type {
  // 上传
  UploadFile,
  // 滑轨
  MySliderMarks
} from "@components/types.ts"

// ======================================== 数据类型声明 ========================================

// 引入数据类型
import type { Rect, ColLine, Baseline } from "./types.ts"

/**
 * 接触角业务的全局对象
 * @note canvas的实际宽高在canvasRef.value.width和canvasRef.value.height上
 * @note canvas的显示宽最大值在canvasParentRef.value.clientWidth上，但是这个可能会变化！很坑
 */
interface ContactAngle {
  /** canvas元素块的显示宽度 */
  canvasStyleWidth: number | null
  /** 所上传文件的文件名 */
  filename: string | null
  /** canvas的绘图上下文对象 */
  ctx: CanvasRenderingContext2D | null
  /** canvas元素块的缩放比例：实际/显示 */
  canvasScaling: number
  /** 灰度图Mat对象 */
  matGray: OpenCVMat | null
  /** canvas的图像数据，用于暂存，便于恢复 */
  imageData: ImageData | null
  /** canvas元素块选框 */
  rect: Rect
  /** 轮廓选择时用于过滤的两侧基线 */
  colLine: ColLine
  /**
   * 轮廓选择时用于过滤的底部基线。
   * - 此值应与步骤4滑轨绑定，相对canvas对称（当且仅当步骤4）。
   * - 步骤4的计算应以Ref对象为基准，而不是baseline对象。步骤4的逻辑归集到Ref对象了。
   */
  baseline: Baseline
  /** 基线参考点 */
  baselineReferencePoint: [number, number] | null
  /** 拟合得到的椭圆对象 */
  ellipse: OpenCVEllipse | null
  /** 椭圆拟合的决定系数R² */
  ellipseR2: number | null
  /** 拟合迭代结果的类型 */
  resultType: string | null
}

/** slider参数对象 */
type SliderParamArr = [
  number, MySliderMarks
]
/** 拟合结果类型 */
type FitResult = "迭代收敛" | "迭代达上限" | "有效点不足"
/** 单个数据结果。[文件名, 接触角, 偏差, 左接触角, 右接触角, 基线角度, 拟合R², 拟合结果类型] */
type ResultDatum =[string, number, number, number, number, number, number, FitResult]
/** 带序号的单个数据结果 */
type OrderResultDatum = [number, ...ResultDatum]

// ======================================== 业务内的全局对象 ========================================

/**
 * 任务状态：
 * 1.  未开始，或删除了图片。正在等待读取图片；
 * 2.  读取到了图片。正在选框裁剪图片；
 * 3.  完成了选框，得到了裁剪的图片。正在寻找并确定轮廓；
 * 4.  完成了轮廓寻找，得到了液滴轮廓坐标。正在寻找基线；
 * 5.  完成了基线寻找，得到了基线坐标。正在计算接触角。
 *     其实并不存在状态5，因为计算接触角是最后一步，没有下一步了。
 */
const taskStatusRef = ref(1)
/** 用户上传的文件数组对象 */
const fileArrRef = ref<File[]>([])
/** 
 * 视图层的<canvas>Dom对象
 * canvas加载很慢，需要等，比较好的等待方法是watch监听钩子。
 * 实测nextTick、onMounted都不如watch。
 */
const canvasRef = useTemplateRef("canvasRef")
/** 第三步寻找轮廓的调参数组Ref对象 */
const thresholdSliderAoaRef = ref<SliderParamArr[]>([])
/** 第三步寻找轮廓的调参数组常量对象 */
const thresholdSliderAoaConst: SliderParamArr[] = [
  // 主参数：当前值、marks标记
  [255, [0, 85, 170, 255]],
  // 辅助参数：当前值、marks标记
  [0, [0, 85, 170, 255]],
]
/**
 * 第三步寻找轮廓的算法选框对象
 * @value 0 - Canny算法
 * @value 1 - 阈值化法
 */
const contourAlgorithmRadioRef = ref(0)
/** 第三步寻找轮廓是否是粗调模式 */
const isContourCoarseRef = ref(true)
/** 
 * 第三步寻找轮廓的遮罩算法选框对象
 * @value 0 - 基线遮罩
 * @value 1 - 两边遮罩
 * @value 2 - 中心遮罩
 */
const contourFilterAlgorithmRadioRef = ref(0)
/**
 * 第四步寻找基线的截距
 * 格式：左截距：当前值、marks标记，右截距：当前值、marks标记
 * @note 不能轻易赋值，因为在步骤4，一旦赋值，就会触发绘制基线等回调
 */
const interceptSliderAoaRef = ref<SliderParamArr[]>([])
/** 第五步计算接触角的最终结果数组 */
const resultRef = ref<ResultDatum[]>([])
/** 第五步最终结果表格的页码 */
const resultTableCurrentPageRef = ref(1)
/**
 * 第五步最终结果数据是否倒序显示
 * @value false - 升序
 * @value true - 数据倒置
 */
const isResultReverseRef = ref(false)
/**
 * 第五步最终结果的表格内容
 * @note resultTableDataRef比resultRef多了个序号
 * 可能因版本差异，数组元素数量不足7个，所以用可选链，并需在软件初始化时做验证
 */
const resultTableDataRef = ref<OrderResultDatum[]>([])
/** 接触角业务的全局对象 */
const contactAngleObj: ContactAngle = {
  canvasStyleWidth: null,
  filename: null,
  ctx: null,
  canvasScaling: 0.0,
  matGray: null,
  imageData: null,
  rect: {
    xMax: null,
    yMax: null,
    xMin: null,
    yMin: null,
  },
  colLine: {
    left: null,
    right: null,
  },
  baseline: {
    left: null,
    right: null,
  },
  baselineReferencePoint: null,
  ellipse: null,
  ellipseR2: null,
  resultType: null,
}
// 注册一个<canvas>的响应式鼠标点击监听
const {
  // 鼠标点在<canvas>内部的X坐标、Y坐标
  elementX, elementY,
  // // <canvas>的宽度、高度
  // elementWidth, elementHeight,
  // // 判断鼠标是否在<canvas>外部
  // isOutside,
  // // 停止监听方法
  // stop: stopMouseInElement
} = useMouseInElement(canvasRef)

/**
 * OpenCV.js 加载：单例 composable
 * - OpenCVRef 是 readonly Ref<OpenCV | null>,加载成功后即 ready
 * - ensureOpenCVReady() 幂等：多次调用复用同一 Promise
 */
const { OpenCVRef, ensureOpenCVReady } = useOpenCV()

/** 派生当前语言的响应式语言包（root / en） */
const langRef = useLang(langDict)

// 监听resultRef，实现表格数据resultTableDataRef刷新
watch(
  [resultRef, resultTableCurrentPageRef, isResultReverseRef],
  refreshResultTableData,
  {
    // 立即执行
    immediate: true,
    // 深度监听：2，（1是本体，2是子数组）
    deep: 2
  }
)
// 注册一个对taskStatusRef的监听：
// 任务状态改变时，始终保持canvas滚动到视图中间
watch(taskStatusRef, nextTickFocusOnCanvas)
// 注册一个<canvas>长按的监听钩子
onLongPress(
  // 监听对象：<canvas>
  canvasRef,
  // 回调钩子
  onCanvasLongPress,
  // 配置：长按时间
  // { delay: 500 }
)

// ================================================================================
// 全局钩子
// 生命周期钩子、监听钩子
// ================================================================================

// 生命周期钩子，SSG的SPA化实现，组件挂载后执行
// 用于进行必要的各类初始化操作
onMounted(() => {
  // 渲染加载框
  myLoading(langRef.value.OpenCVLoadingContent)
  // 接下来做一些该WebApp的准备工作
  // 阻止页面刷新和关闭，该方法不能阻止页面前进（跳转）、后退
  window.addEventListener("beforeunload", beforeunloadHandler)
  // 初始化数据结果resultRef
  initResultData()
  // 初始化canvas
  // 如果canvas没有初始化（第一次进入页面）
  if (!canvasRef.value) {
    // 注册一个监听钩子，用于实现canvasRef的初始化监听
    // 解构赋值，得到监听钩子的stop()方法，用于停止监听
    const { stop: stopCanvasWatch } = watch(
      // 监听canvasRef
      canvasRef,
      // 回调
      (newCanvas) => {
        // 得确保新值均不为null，则完成初始化
        if (newCanvas) {
          // 停止监听
          stopCanvasWatch()
          // 获取canvas元素块的2d绘图上下文，赋值给全局对象
          contactAngleObj.ctx = newCanvas.getContext(
            // CanvasRenderingContext2D接口的2D渲染上下文
            "2d",
            // 为频繁读取做优化，但仅Gecko内核（FireFox浏览器）支持
            { willReadFrequently: true }
          )!
        }
      }
    )
  // 如果已经初始化了，则直接赋值
  } else {
    // 获取canvas元素块的2d绘图上下文，赋值给全局对象
    contactAngleObj.ctx = canvasRef.value.getContext(
      // CanvasRenderingContext2D接口的2D渲染上下文
      "2d",
      // 为频繁读取做优化，但仅Gecko内核（FireFox浏览器）支持
      { willReadFrequently: true }
    )!
  }
  // 导入OpenCV.js库
  ensureOpenCVReady().then(() => {
    // 停止加载框
    myLoading(false)
  }).catch(myError)
})

/**
 * 数据初始化
 * 图表上呈现的数据，会强行让数据长度为8
 */
function initResultData() {
  // 数据长度
  const DATA_LENGTH = 8
  // 从localStorage中读取
  const resultDataStr = localStorage.getItem("contactAngleResult")
  // 如果没有数据，直接跳出即可
  if (!resultDataStr) return
  /** 处理数据，将字符串转为JSON对象 */
  const resultDataAoa = JSON.parse(resultDataStr) as ResultDatum[]
  // 数据检查
  if(!dataInitCheck(resultDataAoa)) return
  // 遍历数据
  for (const resultDataArr of resultDataAoa) {
    // 数据检查
    if(!dataInitCheck(resultDataArr)) return
    // 强行初始化数据长度
    resultDataArr.length = DATA_LENGTH
  }
  // 检查完毕，赋值给resultRef
  resultRef.value = resultDataAoa
  /**
   * 数据检查
   * @param dataArr 数据数组
   */
  function dataInitCheck(dataArr: ResultDatum[] | ResultDatum) {
    // 如果数据格式有问题，则清空数据
    if (!Array.isArray(dataArr)) {
      // 清空数据
      localStorage.removeItem("contactAngleResult")
      // 通知
      myMessage(langRef.value.DataInitErrorContent)
      // 返回false
      return false
    } else {
      // 否则返回true
      return true
    }
  }
}

/**
 * 刷新数据呈现
 * @param newResultAoa - 新结果数据
 * @param newResultTablePage - 新页码数据
 * @param newIsResultReverse - 新是否倒序数据
 */
function refreshResultTableData(
  [newResultAoa, newResultTablePage, newIsResultReverse]: [ResultDatum[], number, boolean]
) {
  // 接参数
  const resultAoaLength = newResultAoa.length
  // 如果新数据为空，则清空表格数据
  if (resultAoaLength === 0) {
    // 刷新为空数组
    resultTableDataRef.value = []
    // 直接返回
    return
  }
  // 接参数
  const dataNumberPerPage = 10
  // 初始化起止索引（startIndexRaw必大于等于0）
  const endIndexRaw = newResultTablePage * dataNumberPerPage
  const startIndexRaw = endIndexRaw - dataNumberPerPage
  // 根据是否倒置，计算起止索引
  const [startIndex, endIndex] =
    newIsResultReverse
      ? [
        Math.max(0, (resultAoaLength - endIndexRaw)),
        (resultAoaLength - startIndexRaw)
      ]
      : [
        startIndexRaw,
        Math.min(resultAoaLength, endIndexRaw)
      ]
  // 接收新数据。这一步操作是为了避免原数组长度不足endIndex造成的bug
  const resultTableDataAoaTemp = newResultAoa.slice(startIndex, endIndex)
  /** 建立一个空数组，用于存放处理后的数据 */
  const resultTableDataAoa: OrderResultDatum[] = []
  // 遍历取值 + 补一个原index
  for (let i = 0; i < resultTableDataAoaTemp.length; i++) {
    // 把原index加上，推进新数组里
    resultTableDataAoa.push([(startIndex + i), ...resultTableDataAoaTemp[i]!])
  }
  // 如果是倒序
  if (newIsResultReverse) {
    // 倒序处理
    resultTableDataAoa.reverse()
  }
  // 赋值给表格数据
  resultTableDataRef.value = resultTableDataAoa
}

/**
 * 聚焦canvas
 * 下个DOM渲染周期将canvas滚动到视图中
 */
function nextTickFocusOnCanvas() {
  // 下个渲染周期执行focusOnCanvas()
  nextTick(focusOnCanvas).catch(myError)
  /**
   * 聚焦canvas的内部方法
   */
  function focusOnCanvas() {
    // 接参数
    const canvas = canvasRef.value!
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
 * @param event 页面关闭或刷新事件
 */
function beforeunloadHandler(event: Event) {
  // 阻止默认行为
  event.preventDefault()
  // 取消默认事件：兼容方法
  event.returnValue = false
}

/**
 * 长按<canvas>触发的回调
 * 步骤2、步骤3：清空<canvas>上的标记
 */
function onCanvasLongPress() {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为2或3时
  if ((taskStatus === 2) || (taskStatus === 3)) {
    // 清空canvas上的矩形标记数据
    canvasMarkDataRemove()
    // 恢复canvas原图
    contactAngleObj.ctx!.putImageData(contactAngleObj.imageData!, 0, 0)
  }
}

/**
 * 点击<canvas>触发的回调
 * 步骤2：选框
 * 步骤3：遮罩
 * 步骤4：绘制基线
 */
function onCanvasClick() {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为2时，即选框绘制阶段，则调用选框方法
  if (taskStatus === 2) {
    // 选框（选框可在步骤3复用，所以和绘图解耦了）
    chooseRect()
    // 绘图
    drawRect()
  // 任务进度为3时，即轮廓选择阶段，则调用轮廓过滤方法
  } else if (taskStatus === 3) {
    chooseMask()
  // 任务进度为4时，即基线绘制阶段，则调用基线粗调方法
  } else if (taskStatus === 4) {
    // 基线粗调（基线粗调在步骤3复用，所以和刷新滑块/绘图解耦）
    chooseBaseline()
    // 接参数
    const { baseline } = contactAngleObj
    // 刷新细调滑块（这一步会触发绘图）
    refreshBaselineSlider([baseline.left!, baseline.right!])
  }
}

/**
 * 清空canvas上的各类标记数据
 */
function canvasMarkDataRemove() {
  // 接参数
  const { rect, colLine, baseline } = contactAngleObj
  // 清空选框的X和Y边界值
  rect.xMax = null
  rect.yMax = null
  rect.xMin = null
  rect.yMin = null
  // 清空两侧遮罩的值
  colLine.left = null
  colLine.right = null
  // 清空基线粗调的值
  baseline.left = null
  baseline.right = null
}

/**
 * 设置canvas的绘图上下文ctx
 */
function ctxSetting() {
  // 接参数
  const { ctx, canvasScaling } = contactAngleObj
  if (!ctx) throw new Error("ctx is undefined")
  // 红色笔迹
  ctx.strokeStyle = "red"
  // 线宽：2像素 x 缩放比例
  ctx.lineWidth = 2 * canvasScaling
  // 填充色：灰色
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
}

/**
 * 滑轨调节的事件回调钩子
 * 步骤3：基线粗调 + 细调。此步骤下，用户只能操作滑轨，因此事件全部来源于滑轨。
 * 步骤4：基线细调。此步骤下，用户点击canvas会触发绑定值的修改，也会触发该回调。
 * @note 对于模型绑定，即便是其它操作修改了所绑定的值，也会触发值变化事件的回调。
 */
function onSliderChange() {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为3时，即确定轮廓阶段
  if (taskStatus === 3) {
    // 直接执行节流处理的轮廓查找方法
    chooseContourThrottled().catch(myError)
  // 任务进度为4时，即基线绘制阶段
  } else if (taskStatus === 4) {
    // 直接执行节流的绘制基线方法
    drawBaselineThrottled().catch(myError)
  }
}

/**
 * 调节滑轨操作刚停止的事件回调钩子
 * 步骤3：基线细调。此步骤下，用户只能操作滑轨，因此事件全部来源于滑轨。
 * 步骤4：基线细调，此步骤下，用户点击canvas会触发绑定值的修改，也会触发该回调。
 * @note 步骤4的计算应以Ref对象为基准，而不是baseline对象。步骤4的逻辑归集到Ref对象了。
 */
function onSliderChangeEnd() {
  // 接参数
  const taskStatus = taskStatusRef.value
  // 任务进度为3，且为细调状态
  if ((taskStatus === 3) && (isContourCoarseRef.value === false)) {
    // 调用进度3下的具体刷新滑轨方法
    refreshContourFineSlider()
  // 任务进度为4
  } else if (taskStatus === 4) {
    // 接参数
    const [[userLeftIntercept], [userRightIntercept]] = interceptSliderAoaRef.value as [SliderParamArr, SliderParamArr]
    // 执行滑轨数据刷新方法（会被动触发绘制基线），此处从滑轨取值，本身就是用户视角，无需显示再转为用户视角
    refreshBaselineSlider([userLeftIntercept, userRightIntercept], false)
  }
}

// ================================ 步骤状态的函数方法 ================================

/**
 * @步骤1 传图。该步骤的方法：
 *   0.  taskToStep1 - 任务切换。这个没啥要准备的。
 *   1.  onPicChange - 传图回调
 */

/**
 * 任务进度切换到步骤1
 */
function taskToStep1() {
  taskStatusRef.value = 1
}

/**
 * 图片上传或改变时触发的回调
 * @param event 事件对象
 */
async function onPicChange(event: UploadFile[]) {
  // 如果是清空了照片，则把任务进度切换回1，并直接返回即可
  if (event.length === 0) { 
    taskToStep1()
    return
  }
  // 加载框
  myLoading(langRef.value.PicLoadingContent)
  // 接对象
  const uploadFile = event[0]
  const { ctx } = contactAngleObj
  const cv = OpenCVRef.value
  const canvas = canvasRef.value
  // 验证对象
  if (!uploadFile || !cv || !canvas || !ctx ) throw new Error("object is undefined")
  // 接收文件名
  contactAngleObj.filename = uploadFile.name!
  // 从第一个对象获取文件url
  const fileURL = URL.createObjectURL(uploadFile.raw!)
  // 构造<img>元素
  const imgElement = new Image()
  // 在网页内隐藏<img>元素
  imgElement.style.display = "none"
  // 将图片路径挂载在<img>元素上
  imgElement.src = fileURL
  // 等待图片加载完成
  await imgElement.decode()
  // 读取图片文件为OpenCV的Mat对象
  const matOrigin = cv.imread(imgElement)
  // 读取完毕，销毁图片元素以释放内存
  imgElement.remove()
  // 如果全局灰度图Mat对象存在且有成员对象delete方法，则先删除
  contactAngleObj.matGray?.delete()
  // 初始化全局灰度图Mat对象
  contactAngleObj.matGray = new cv.Mat()
  // 将原始图像Mat转为灰度Mat，赋值给全局灰度图Mat对象
  // “cvtColor”即convert color
  cv.cvtColor(
    // 原图（输入）
    matOrigin,
    // 灰度图（输出）
    contactAngleObj.matGray,
    // 颜色空间转换代码：color：RGBA to gray
    cv.COLOR_RGBA2GRAY,
    // 通道数：0，即自动
    0
  )
  // 将灰度图绘制到canvas上（该步骤后，需恢复canvas的上下文设置）
  cv.imshow(canvas, contactAngleObj.matGray)
  // 释放原图Mat的WASM内存
  matOrigin.delete()
  // 把canvas的原图保存好，以方便恢复
  contactAngleObj.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  // 第一阶段完成，任务进度改为2（该步骤会恢复canvas的上下文设置）
  taskToStep2()
  // 停止加载框
  myLoading(false)
}

/**
 * @步骤2 绘制选框
 *   0.  taskToStep2 - 任务切换
 *   1.  canvasFit - canvas尺寸适应方法
 *   2.  chooseRect - 中转方法 → Algorithm.computeRect（纯算法，已解耦）
 *   3.  drawRect - 绘制选框（OpenCV 绘图，留在 Vue）
 *   4.  onSureRect - 确认选框
 */

/**
 * 任务进度切换到步骤2
 */
function taskToStep2() {
  // 清空canvas上的矩形标记数据
  canvasMarkDataRemove()
  // 任务进度改为2
  taskStatusRef.value = 2
  // 下个DOM周期：调整canvas尺寸以适应屏幕
  nextTick(canvasFit).catch(myError)
}

/**
 * canvas尺寸适应方法：调整canvas的显示宽高
 * canvas在步骤2时，有一个show的变化，需要根据图片大小重新进行缩放，以适应屏幕
 * @note 调整canvasScaling后，需重新设置canvas的绘图上下文设置ctx（画笔粗细）
 */
function canvasFit() {
  // 接参数
  const canvas = canvasRef.value!
  // 接canvas父元素的最大内宽，赋值给全局变量
  contactAngleObj.canvasStyleWidth = canvas.parentElement!.clientWidth
  // 设置canvas的显示宽度
  canvas.style.width = canvas.parentElement!.clientWidth + "px"
  // 以canvas的真实宽度和显示宽度之比，赋值给全局对象的缩放比例变量
  contactAngleObj.canvasScaling = canvas.width / contactAngleObj.canvasStyleWidth
  // 更新canvas的显示高度
  canvas.style.height = canvas.height / contactAngleObj.canvasScaling + "px"
  // 调整宽高后，需重新设置canvas的上下文设置
  ctxSetting()
}

/**
 * 选框方法（中转方法）
 * 用于更新选框的X、Y坐标边界值，赋值给全局rect对象
 * 从 contactAngleObj 和 elementX/Y 中提取参数，调用纯算法 Algorithm.computeRect
 */
function chooseRect() {
  // 接参数
  const { canvasScaling, rect } = contactAngleObj
  const canvas = canvasRef.value!
  // 点击位置的实际坐标
  const clickX = elementX.value * canvasScaling
  const clickY = elementY.value * canvasScaling
  // 调用算法模块的计算选框方法（会直接修改rect对象）
  Algorithm.computeRect({
    clickX, clickY, canvasWidth: canvas.width, canvasHeight: canvas.height, rect
  })
}

/**
 * 绘制选框
 */
function drawRect() {
  // 接参数
  const { ctx, imageData, rect } = contactAngleObj
  const canvas = canvasRef.value!
  // 验证
  if (!ctx || !imageData || !rect) throw new Error("object is undefined")
  // 先对选框进行初始化，去掉上一次的绘制
  ctx.putImageData(imageData, 0, 0)
  // 画一个全canvas遮罩
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // 计算宽高
  const rectWidth = rect.xMax! - rect.xMin!
  const rectHeight = rect.yMax! - rect.yMin!
  // 然后重绘选框中部
  ctx.putImageData(
    imageData, 0, 0,
    rect.xMin!, rect.yMin!, rectWidth, rectHeight
  )
  // 最后直接绘制框
  ctx.strokeRect(rect.xMin!, rect.yMin!, rectWidth, rectHeight)
}

/**
 * "裁剪图片"或"完成裁剪"的回调方法
 * @param isDetermine 是否确定完成裁剪
 */
function onSureRect(isDetermine: boolean) {
  // 接参数
  const { matGray, ctx, rect } = contactAngleObj
  const cv = OpenCVRef.value
  const canvas = canvasRef.value!
  // 验证
  if (!cv || !canvas || !ctx || !matGray) throw new Error("object is undefined")
  // 如果有选框
  if (rect.xMax) {
    // 开始裁剪：确定裁剪区域
    const rectRect = new cv.Rect(
      rect.xMin!,
      rect.yMin!,
      rect.xMax - rect.xMin!,
      rect.yMax! - rect.yMin!
    )
    // 裁剪区域确定好了，可以清空裁剪标记了
    canvasMarkDataRemove()
    // 执行裁剪
    const metCropped = matGray.roi(rectRect)
    // 在canvas上绘制裁剪结果（需记得重新设置ctx）
    cv.imshow(canvas, metCropped)
    // 绘制完成，更新Mat灰度图对象matGray为裁剪后的灰度图Mat对象metCropped
    matGray.delete()
    contactAngleObj.matGray = metCropped
    // 绘制后，更新canvas的显示缩放及高度（此处也会重新设置ctx）
    canvasFit()
    // 把canvas的原图保存好，以方便恢复
    contactAngleObj.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
  // 如果是"完成裁剪"
  if (isDetermine === true) {
    // 则任务状态进展到"3"
    taskToStep3()
  }
}

/**
 * @步骤3 选择轮廓
 * 这一步很重要。有轮廓算法选择、轮廓参数调节（滑轨）、遮罩参数调节，这三个操作。
 * 轮廓参数调节（滑轨）还有粗调/细调切换，遮罩参数调节也有中心遮罩/两边遮罩/基线遮罩切换。
 * 然后在最后“确认轮廓”时，还会有轮廓到椭圆的拟合。
 * 这里的拟合，均先采用快速算法。
 * 业务逻辑思路上设定为：
 *   0.  进入步骤3，初始化各类参数后，先执行一次[选择轮廓]方法，刷新一次轮廓渲染。
 *   1.  切换轮廓算法、调节轮廓参数、切换轮廓参数粗/细调，都会执行[选择轮廓(节流)]方法，刷新一次轮廓渲染。
 *       1.1  切换轮廓参数的粗/细调，会被动触发[选择轮廓(节流)]方法，因为改变了轮廓参数值，被事件监听器监听到。
 *   2.  点击canvas调节遮罩参数，会执行[绘制遮罩]方法，刷新一次遮罩渲染。
 *   3.  点击“确定轮廓”按钮，会执行[确定轮廓]方法，获得椭圆数据。进而绘制椭圆并进入步骤4。
 * 该步骤的方法：
 *   0.  taskToStep3 - 任务切换
 *       0.1  轮廓查找算法切换、粗调/细调切换、遮罩算法切换，恢复默认设置
 *       0.2  初始化调参参数滑轨
 *       0.3  清空遮罩数据
 *       0.4  切换到状态3
 *       0.5  nextTick：用[轮廓绘制]方法刷新一次轮廓渲染
 *   1.  thresholdNumArrRestore - 初始化调参参数滑轨（使用 Algorithm.deepCopyAoa）
 *   2.  chooseContour - 选择轮廓算法（调用 OpenCV 绘图）
 *   3.  getContour - 查找轮廓（OpenCV 绘图）
 *   4.  drawContour - 绘制轮廓（OpenCV 绘图）
 *   5.  chooseMask - 选择遮罩（中转方法 → Algorithm.computeColLine / Algorithm.computeBaseline / Algorithm.computeRect）
 *   6.  drawMask - 绘制遮罩（OpenCV 绘图）
 *   7.  onContourSliderCoarseFineToggle - 轮廓参数粗/细调切换
 *   8.  refreshContourFineSlider - 中转方法 → Algorithm.computeContourFineSliderRange
 *   9.  onDetermineContour - 确定轮廓（中转方法 → Algorithm.filterContourPoints / Algorithm.getEllipse）
 *  10. drawEllipse - 绘制椭圆（OpenCV 绘图）
 */

/**
 * 任务进度切换到步骤3
 *   1.  把各类参数恢复为默认设置
 *   2.  下个DOM周期，调用轮廓查找方法刷新一次轮廓渲染
 */
function taskToStep3() {
  // 轮廓查找算法恢复默认设置
  // contourAlgorithmRadioRef.value = 0
  // 粗调/细调恢复默认设置
  isContourCoarseRef.value = true
  // 中心遮罩/两边遮罩恢复默认设置
  contourFilterAlgorithmRadioRef.value = 0
  // 初始化调参参数滑轨
  thresholdNumArrRestore()
  // 清空遮罩数据
  canvasMarkDataRemove()
  // 切换到状态3
  taskStatusRef.value = 3
  // 下一个DOM周期：用轮廓查找方法刷新一次轮廓渲染
  nextTick(chooseContour).catch(myError)
}

/**
 * 初始化步骤3调参参数滑轨
 * 如果滑轨Ref值为空，则全部初始化
 * 否则保留每个传参的当前值，对范围、步进等初始化
 */
function thresholdNumArrRestore() {
  // 接参数
  const thresholdNumArr = thresholdSliderAoaRef.value
  // 空数组，用于存数据
  const thresholdNumArrTemp = []
  // 直接从滑轨副本赋值即可
  for (let i = 0; i < thresholdSliderAoaConst.length; i++) {
    // 推进数组
    thresholdNumArrTemp.push([
      // value
      thresholdNumArr[i]?.[0] ?? thresholdSliderAoaConst[i]![0],
      // marks
      [...thresholdSliderAoaConst[i]![1]]
    ])
  }
  // 赋值
  thresholdSliderAoaRef.value = thresholdNumArrTemp as SliderParamArr[]
}

/**
 * 选择轮廓
 * 会调用[查找轮廓]和[绘制遮罩]方法
 */
function chooseContour() {
  // 节流的bug防范：只有在"3"任务状态时，才允许执行
  // 这可以防止进入步骤4的瞬间执行此方法，造成canvas不正常的刷新回退
  if (taskStatusRef.value !== 3) { return }
  // 获取轮廓
  const [metVectorContours, metHierarchy] = getContour()
  // 绘制轮廓
  drawContour([metVectorContours, metHierarchy])
  // 绘制完毕，销毁Met对象以释放WASM内存
  metVectorContours?.delete()
  metHierarchy?.delete()
  // 最后绘制遮罩
  drawMask()
}

/**
 * 选择轮廓方法的节流方法
 */
const chooseContourThrottled = useThrottleFn(chooseContour, 500, true)

/**
 * 获取轮廓（OpenCV 绘图）
 *   1.  先用2种算法（中的一个）得到二值化轮廓图
 *   2.  然后根据传参寻找轮廓
 * @returns 轮廓AOA数组和轮廓层次结构
 * @note 返回的2个对象，务必记得在用完后手动删除，否则会一直占用WASM内存
 */
function getContour(): [OpenCVMatVector, OpenCVMat] {
  // 接参数
  const { matGray } = contactAngleObj
  const cv = OpenCVRef.value
  const contourAlgorithmRadio = contourAlgorithmRadioRef.value
  // 验证
  if (!cv || !matGray) throw new Error("object is undefined")
  // 接阈值数组参数
  const [[mainParam], [auxParam]] = thresholdSliderAoaRef.value as [SliderParamArr, SliderParamArr]
  // 初始化一个二值化图的过渡对象
  const matBinary = new cv.Mat()
  // 选框为0，则为Canny算法
  if (contourAlgorithmRadio === 0) {
    // Canny算法，边缘检测，赋值给全局变量matObj.binary
    // 详见：https://docs.opencv.ac.cn/4.12.0/d7/de1/tutorial_js_canny.html
    cv.Canny(
      // 灰度图
      matGray,
      // 输出：二值化Canny边缘检测图
      matBinary,
      // 阈值minVal：辅助参数
      auxParam,
      // 阈值maxVal：主参数
      mainParam,
      // apertureSize，Sobel 算子的孔径大小
      3,
      // L2gradient，是否使用更精确的L2范数计算图像梯度：不启用
      false
    )
  // 选框不为0（即为1），则为Threshold方法
  } else {
    // Threshold算法，将灰度图转为二值化图，赋值给全局变量matObj.binary
    cv.threshold(
      // 灰度图
      matGray,
      // 输出数组（二值化图）
      matBinary,
      // 阈值：主参数
      mainParam,
      // 用于THRESH_BINARY和THRESH_BINARY_INV阈值类型的最大值
      255,
      // 阈值类型
      // 参见：https://docs.opencv.ac.cn/4.12.0/d7/d1b/group__imgproc__misc.html#gaa9e58d2860d4afa658ef70a9b1115576
      cv.THRESH_BINARY_INV
    )
  }
  // 用获得的二值化对象寻找轮廓
  // 初始化轮廓AOA数组metVectorContours
  const metVectorContours = new cv.MatVector()
  // 初始化轮廓层次结构metHierarchy
  const metHierarchy = new cv.Mat()
  // cv.findContours()方法，查找轮廓
  // 详见：https://docs.opencv.org/4.12.0/d5/daa/tutorial_js_contours_begin.html
  cv.findContours(
    // 二值化的Mat图像
    matBinary,
    // 轮廓。AOA的Mat对象数组，即MatVector
    metVectorContours,
    // 轮廓层次结构，即各轮廓间的拓扑关系
    // 如圈形图像会有内轮廓和外轮廓，则内外轮廓间会存在包含与被包含等关系
    // 轮廓层次结构即建立“轮廓树”，以层级化的方式描述轮廓之间的关系
    metHierarchy,
    // 轮廓检索模式
    // RETR_EXTERNAL => retrieval external - 只检索最外层的轮廓
    // cv.RETR_EXTERNAL - 只检索最外面的轮廓
    // cv.RETR_LIST - 检索所有的轮廓，但不创建轮廓的拓扑结构
    // cv.RETR_CCOMP - 检索所有的轮廓，并将它们组织成两级层次结构
    // cv.RETR_TREE - 检索所有的轮廓，并重建完整的轮廓层次结构
    // cv.RETR_FLOODFILL => retrieval flood fill - 使用洪水填充算法
    cv.RETR_LIST,
    // 轮廓近似法
    // CHAIN_APPROX_NONE => chain approx none - 不作近似处理，存储所有轮廓点
    cv.CHAIN_APPROX_NONE
  )
  // 轮廓获取完毕，销毁二值化Mat对象
  matBinary.delete()
  // 返回轮廓AOA数组metVectorContours和轮廓层次结构metHierarchy
  return [metVectorContours, metHierarchy]
}

/**
 * 绘制轮廓（OpenCV 绘图）
 * @param metVectorContours 轮廓AOA数组
 * @param metHierarchy 轮廓层次结构
 * @note 传参的2个对象，务必记得在用完后手动删除，否则会一直占用WASM内存
 */
function drawContour([metVectorContours, metHierarchy]: [OpenCVMatVector, OpenCVMat]) {
  // 接参数
  const { matGray, canvasScaling, ctx } = contactAngleObj
  const cv = OpenCVRef.value
  const canvas = canvasRef.value!
  // 验证
  if (!cv || !matGray || !ctx) throw new Error("object is undefined")
  // 从灰度图拷贝一个原画布，用于绘制轮廓
  const matContoursHandleMat = new cv.Mat()
  matGray.copyTo(matContoursHandleMat)
  // 定义轮廓颜色为白色
  const contoursColor = new cv.Scalar(255, 255, 255)
  // 轮廓粗细
  const contoursThickness = 2 * canvasScaling
  // 在画布上绘制所有轮廓（轮廓索引传参为-1即可）
  cv.drawContours(
    // Mat画布
    matContoursHandleMat,
    // 轮廓组
    metVectorContours,
    // 轮廓索引（-1就是全部）
    -1,
    // 轮廓颜色
    contoursColor,
    // 轮廓线条粗细
    contoursThickness,
    // 轮廓线条类型，维持默认即可
    undefined,
    // 轮廓层次结构
    metHierarchy,
    // 轮廓层数，本次不存在层次结构，维持默认即可
    undefined,
  )
  // 把画布图案绘制在canvas上
  cv.imshow(canvas, matContoursHandleMat)
  // 重新设置ctx，方便用户交互操作
  ctxSetting()
  // 绘制完毕，销毁Met对象以释放WASM内存
  matContoursHandleMat.delete()
  // 把canvas的原图保存好，以方便恢复
  contactAngleObj.imageData = ctx.getImageData(
    0, 0, canvas.width, canvas.height
  )
}

/**
 * 轮廓算法切换的回调钩子
 */
function onContourAlgorithmSwitch() {
  chooseContourThrottled().catch(myError)
}

/**
 * 选择遮罩（中转方法）
 * 根据遮罩种类设置，调用对应的纯算法函数，然后刷新 canvas 并绘制遮罩
 */
function chooseMask() {
  // 接参数
  const { ctx, imageData, canvasScaling, colLine, rect, baseline } = contactAngleObj
  const canvas = canvasRef.value
  const contourFilterAlgorithmRadio = contourFilterAlgorithmRadioRef.value
  // 验证
  if (!canvas || !ctx || !imageData) throw new Error("object is undefined")
  // 点击位置的实际坐标
  const clickX = elementX.value * canvasScaling
  const clickY = elementY.value * canvasScaling
  // 选框值为0：基线遮罩
  if (contourFilterAlgorithmRadio === 0) {
    Algorithm.computeBaseline({
      clickX, clickY, canvasWidth: canvas.width, canvasHeight: canvas.height, baseline
    })
  // 选框值为1：两边遮罩
  } else if (contourFilterAlgorithmRadio === 1) {
    Algorithm.computeColLine({ clickX, canvasWidth: canvas.width, colLine })
  // 选框值为其它（2）：中心遮罩
  } else {
    // 调用算法模块的计算选框方法（会直接修改rect对象）
    Algorithm.computeRect({
      clickX, clickY, canvasWidth: canvas.width, canvasHeight: canvas.height, rect
    })
  }
  // 刷新canvas，去掉之前画的遮罩
  ctx.putImageData(imageData, 0, 0)
  // 绘制遮罩
  drawMask()
}

/**
 * 选线方法
 * @note 会触发绘制基线截距
 */
function chooseBaseline() {
  // 接参数
  const { canvasScaling, baseline } = contactAngleObj
  const canvas = canvasRef.value!
  // 点击位置的实际坐标
  const clickX = elementX.value * canvasScaling
  const clickY = elementY.value * canvasScaling
  // 调用选线算法，就地修改baseline对象
  Algorithm.computeBaseline({
    clickX, clickY,
    canvasWidth: canvas.width, canvasHeight: canvas.height,
    baseline
  })
}

/**
 * 绘制遮罩（OpenCV 绘图）
 */
function drawMask() {
  // 接参数
  const { ctx, colLine, rect, baseline } = contactAngleObj
  const canvas = canvasRef.value
  // 验证
  if (!canvas || !ctx) throw new Error("object is undefined")
  // 左边的线
  if (colLine.left !== null) {
    // 左边阴影区
    ctx.fillRect(0, 0, colLine.left!, canvas.height)
    // 绘制左边线：开始绘制
    ctx.beginPath()
    // 起点坐标
    ctx.moveTo(colLine.left, 0)
    // 终点坐标
    ctx.lineTo(colLine.left, canvas.height)
    // 连线
    ctx.stroke()
  }
  // 右边的线
  if (colLine.right !== null) {
    // 右边阴影区
    ctx.fillRect(colLine.right, 0, canvas.width - colLine.right, canvas.height)
    // 绘制右边线：开始绘制
    ctx.beginPath()
    // 起点坐标
    ctx.moveTo(colLine.right, 0)
    // 终点坐标
    ctx.lineTo(colLine.right, canvas.height)
    // 连线
    ctx.stroke()
  }
  // 中间遮罩区
  if (rect.xMin !== null && rect.xMax !== null && rect.yMin !== null && rect.yMax !== null) {
    // 计算宽高
    const rectW = rect.xMax - rect.xMin
    const rectH = rect.yMax - rect.yMin
    // 中间阴影区
    ctx.fillRect(rect.xMin, rect.yMin, rectW, rectH)
    // 中间线框
    ctx.strokeRect(rect.xMin, rect.yMin, rectW, rectH)
  }
  // 基线遮罩区
  if (baseline.left !== null && baseline.right !== null) {
    // 开始绘制
    ctx.beginPath()
    // 四个点
    ctx.moveTo(0, baseline.left)
    ctx.lineTo(canvas.width, baseline.right)
    ctx.lineTo(canvas.width, canvas.height)
    ctx.lineTo(0, canvas.height)
    // 闭合路径
    ctx.closePath()
    // 填充
    ctx.fill()
    // 绘制基线
    ctx.beginPath()
    // 左上角，左截距点
    ctx.moveTo(0, baseline.left)
    // 右上角，右截距点
    ctx.lineTo(canvas.width, baseline.right)
    // 画线
    ctx.stroke()
  }
}

/**
 * 轮廓粗/细调的切换的回调钩子
 * @note 会被动触发绘制轮廓
 */
function onContourSliderCoarseFineToggle() {
  // 如果目前是细调，则要修改为粗调
  if (isContourCoarseRef.value === false) {
    thresholdNumArrRestore()
  // 如果目前是粗调，要改为细调
  } else {
    // 刷新细调滑块（这一步会触发绘图）
    refreshContourFineSlider()
  }
  // 更新标记
  isContourCoarseRef.value = !isContourCoarseRef.value
}

/**
 * 步骤3里刷新细调滑块的具体方法
 * @note 会触发绘制轮廓
 */
function refreshContourFineSlider() {
  // 接收主参数和辅助参数
  const [[mainParam], [auxParam]] = thresholdSliderAoaRef.value as [SliderParamArr, SliderParamArr]
  // 找主参数的下限：主参数的下限必须不小于0，不大于243
  const mainParamMin = Math.max(0, Math.min(243, (mainParam - 6)))
  // 找辅助参数的下限：辅助参数的下限必须不小于0，不大于243
  const auxParamMin = Math.max(0, Math.min(243, (auxParam - 6)))
  /** 细调的阈值数组 */
  const thresholdNumArrTemp: SliderParamArr[] = [
    // 主参数：当前值、mark标记
    [
      mainParam,
      [mainParamMin, mainParamMin + 4, mainParamMin + 8, mainParamMin + 12]
    ],
    // 辅助参数：当前值、下限、上限、mark标记
    [
      auxParam,
      [auxParamMin, auxParamMin + 4, auxParamMin + 8, auxParamMin + 12]
    ]
  ]
  // 赋值（这一步会触发绘图）
  thresholdSliderAoaRef.value = thresholdNumArrTemp
}

/**
 * 确定轮廓（中转方法）
 * 调用纯算法 Algorithm.filterContourPoints 和 Algorithm.getEllipse
 */
function onDetermineContour() { try {
  // 加载框
  myLoading(langRef.value.ContourFitLoadingContent)
  // 接参数
  const { colLine, rect, baseline } = contactAngleObj
  const cv = OpenCVRef.value as OpenCV
  const { width: canvasWidth, height: canvasHeight } = canvasRef.value!
  // 获取轮廓
  const [metVectorContours, metHierarchy] = getContour()
  // 轮廓层次结构Mat对象不需要，销毁以释放WASM内存
  metHierarchy.delete()
  // 提取轮廓点
  const rawContourPointAoa = Algorithm.getContourPoints({
    metVectorContours, colLine, rect,
    canvasWidth, canvasHeight
  })
  // 轮廓点集合MetVoctor对象用过了，不需要了，销毁以释放WASM内存
  metVectorContours.delete()
  // 过滤轮廓点，获取轮廓点集合P(0)和轮廓点到基线的距离数组
  const {
    contourPointAoa,
    contourPointToBaselineDistanceArr
  } = Algorithm.baselineFilterContourPoints({
    rawContourPointAoa, baseline, canvasWidth, canvasHeight
  })
  // 获取椭圆数据
  const {
    ellipse,
    baselineReferencePoint,
    R2Arr,
    resultType,
    // ...restEllipseObj
  } = Algorithm.getEllipse({ cv, contourPointAoa, contourPointToBaselineDistanceArr })
  // 写回全局对象
  contactAngleObj.ellipse = ellipse
  contactAngleObj.ellipseR2 = R2Arr[R2Arr.length - 1] as number
  contactAngleObj.resultType = resultType
  contactAngleObj.baselineReferencePoint = baselineReferencePoint
  // 绘制椭圆
  drawEllipse()
  // 进入步骤4
  taskToStep4()
  // 关闭加载框
  myLoading(false)
} catch (err) {
  // 关闭加载框
  myLoading(false)
  // 报错处理
  throw new Error("onDetermineContour()报错：", { cause: err })
}}

/**
 * 绘制椭圆（OpenCV 绘图）
 */
function drawEllipse() {
  // 接参数
  const { matGray, canvasScaling, ctx, ellipse } = contactAngleObj
  const cv = OpenCVRef.value
  const canvas = canvasRef.value
  // 验证
  if (!matGray || !canvasScaling || !ctx || !ellipse || !cv || !canvas) throw new Error("drawEllipse()参数错误")
  // 拷贝一个灰度图的原画布Mat对象
  const matEllipseHandle = new cv.Mat()
  matGray.copyTo(matEllipseHandle)
  // 定义椭圆的颜色为白色
  const ellipseColor = new cv.Scalar(255, 255, 255)
  // 轮廓粗细
  const ellipseThickness = 2 * canvasScaling
  // 凑个新的椭圆axes，因为椭圆绘制方法传参需要椭圆主轴尺寸一半的axes
  const ellipseAxes = new cv.Size(
    // width
    ellipse.size.width * 0.5,
    // height
    ellipse.size.height * 0.5
  )
  // 绘制一个椭圆Mat对象
  cv.ellipse(
    // img：Mat对象
    matEllipseHandle,
    // center：椭圆中心点坐标
    ellipse.center,
    // axes：主轴尺寸的一半
    ellipseAxes,
    // angle：椭圆旋转角度（以度为单位）
    ellipse.angle,
    // startAngle：椭圆弧的起始角度（以度为单位）
    0,
    // endAngle：椭圆弧的结束角度（以度为单位）
    360,
    // color：椭圆颜色
    ellipseColor,
    // thickness：椭圆线条粗细，如果为负值，则表示填充椭圆
    ellipseThickness,
    // lineType：线条类型
    cv.LINE_AA
  )
  // 渲染到画布上
  cv.imshow(canvas, matEllipseHandle)
  // 绘制完毕，销毁Mat对象以释放WASM内存
  matEllipseHandle.delete()
  // 恢复ctx设置
  ctxSetting()
  // 把canvas的原图保存好
  contactAngleObj.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/**
 * @步骤4 选择基线
 * 用户有2种交互：点击canvas（粗调，单次）和拖动滑轨（细调，连续）。
 *   粗调：需要手动修改滑轨的值 + 滑轨上下限等，进而触发绘图。
 *   细调：直接修改了滑轨的值（进而触发绘图），但是没有修改上下限，
 *         所以细调停止（changeEnd）的时候要修改上下限，这会进一步触发二次绘图。
 *   绘图触发不可控，所以必然要节流处理。
 * 该步骤还有一个难点：canvas里，零点在左上角，而用户习惯于左下角。
 * 滑轨肯定跟着用户习惯走，所以绘图时需要翻转坐标轴。
 * 该步骤的方法：
 *   0.  taskToStep4 - 初始化方法
 *   1.  initialBaseline - 中转方法 → Algorithm.computeInitialBaseline
 *   2.  drawBaseline - 绘制基线方法（OpenCV 绘图）
 *   3.  refreshBaselineSlider - 中转方法 → Algorithm.computeBaselineSliderRange
 *   4.  onBackToStep3 - 返回步骤3的方法
 *   *.  onDetermineBaseline - 确定基线（中转方法 → Algorithm.calculateContactAngle）
 */

/**
 * 步骤4的初始化方法
 */
function taskToStep4() {
  // 初始化截距数组（在滑轨没加载的情况下，不会触发绘图）
  initialBaseline()
  // 状态机切换到4
  taskStatusRef.value = 4
  // 下个DOM周期：绘制基线
  nextTick(drawBaseline).catch(myError)
}

/**
 * 初始化基线截距的值
 * 会读取椭圆角度、有效轮廓最低点坐标、canvas宽高
 * 以椭圆旋转的角度的tan值来得到初始化的截距
 * 这一截距是视椭圆为“正”的
 */
function initialBaseline() {
  // 接参数
  const { ellipse, baselineReferencePoint, baseline } = contactAngleObj
  const canvas = canvasRef.value
  // 验证
  if (!ellipse || !baselineReferencePoint || !canvas) throw new Error("initialBaseline()参数错误")
  // 如果用户没指定基线，则需要自动计算
  if (baseline.left === null || baseline.right === null) {
    // 拟合得到的椭圆一般来说是“正”的
    // 也就是接近90°的倍数，比如263°、92°等。不会出现极端“歪”的情况，如45°这样
    // 可以先对90°取余，余下的数如果小于45°（92°的情况），则直接用余数
    // 如果余下的数大于45°（263°的情况），则再减90°
    // 取余
    const angleRemainder = ellipse.angle % 90
    // 确定基线角度
    const baselineAngle = (angleRemainder <= 45) ? angleRemainder : (angleRemainder - 90)
    // 确定基线截距
    const baselineIntercept = Math.tan(baselineAngle * Math.PI / 180)
    // 构建了一个方程：y - bp.y = baselineIntercept * (x - bp.x)
    // 把x = 0，x = canvasWidth代入，得到2个y值，即为截距
    const leftIntercept = baselineIntercept * (0 - baselineReferencePoint[0]) + baselineReferencePoint[1]
    const rightIntercept =
      baselineIntercept * (canvas.width - baselineReferencePoint[0]) + baselineReferencePoint[1]
    // 根据赋值刷新滑块（这一步不能触发绘图，因为务必确保此时滑轨组件没加载）
    refreshBaselineSlider([leftIntercept, rightIntercept])
  // 如果用户指定了基线，则直接用用户指定的值
  } else {
    // 根据赋值刷新滑块（这一步不能触发绘图，因为务必确保此时滑轨组件没加载）
    refreshBaselineSlider([baseline.left, baseline.right])
  }
}

/**
 * 步骤4里绘制基线的具体方法（OpenCV 绘图）
 */
function drawBaseline() {
  // 接参数
  const { ctx, imageData } = contactAngleObj
  const [[leftIntercept], [rightIntercept]] = interceptSliderAoaRef.value as [SliderParamArr, SliderParamArr]
  const canvas = canvasRef.value
  // 验证
  if (!ctx || !imageData || !canvas) throw new Error("drawBaseline()参数错误")
  // 计算真正的截距（canvas视角的y值）
  const realLeftY = canvas.height - leftIntercept
  const realRightY = canvas.height - rightIntercept
  // 先恢复原图
  ctx.putImageData(imageData, 0, 0)
  // 然后直接绘图即可
  ctx.beginPath()
  // 起点坐标
  ctx.moveTo(0, realLeftY)
  // 终点坐标
  ctx.lineTo(canvas.width, realRightY)
  // 连线
  ctx.stroke()
}

/**
 * 绘制基线方法的节流方法
 * @note 给drawBaseline做了节流处理，以防止频繁调用
 */
const drawBaselineThrottled = useThrottleFn(drawBaseline, 200, true)

/**
 * 步骤4里刷新滑块数据的具体方法
 * @param leftInterceptRaw 左截距
 * @param rightInterceptRaw 右截距
 * @param isConvertToUser 是否需要转换成用户视角
 * @note baseline对象的值是canvas视角的y值，当使用baseline对象传参时，需要转换成用户视角；
 *       滑轨组件的值是用户视角的y值，当使用滑轨组件传参时，需显式声明不需转换
 * @note 会触发绘制基线截距
 */
function refreshBaselineSlider(
  [leftInterceptRaw, rightInterceptRaw]: [number, number],
  isConvertToUser = true
) {
  // 接参数
  const canvas = canvasRef.value
  // 验证
  if (!canvas) throw new Error("refreshBaselineSlider()参数错误")
  // 把截距改为用户视角，并取整
  const leftIntercept =
    isConvertToUser
      ? Math.round(canvas.height - leftInterceptRaw)
      : Math.round(leftInterceptRaw)
  const rightIntercept =
    isConvertToUser
      ? Math.round(canvas.height - rightInterceptRaw)
      : Math.round(rightInterceptRaw)
  // 根据高计算截距的上下限范围，目前以高的1/15为限度。
  // 截距需能被6整除。所以是除以90。
  // 整除后，乘以2是阶梯的宽度，乘以3是mark的宽度。
  // 除此以外，得确保截距最小单位起码是1。
  const delta = Math.max(Math.floor(canvas.height / 90), 1)
  // 左截距的下限
  const leftParamMin = leftIntercept - (delta * 3)
  // 右截距的下限
  const rightParamMin = rightIntercept - (delta * 3)
  // 细调的阈值数组
  const interceptNumArr: SliderParamArr[] = [
    // 左截距：当前值、下限、上限、mark标记
    [
      leftIntercept,
      [
        leftParamMin, (leftParamMin + (delta * 2)),
        (leftParamMin + (delta * 4)), (leftParamMin + (delta * 6))
      ]
    ],
    // 右截距：当前值、下限、上限、mark标记
    [
      rightIntercept,
      [
        rightParamMin, (rightParamMin + (delta * 2)),
        (rightParamMin + (delta * 4)), (rightParamMin + (delta * 6))
      ]
    ]
  ]
  // 赋值（这一步会触发绘图）
  interceptSliderAoaRef.value = interceptNumArr
}

/**
 * 步骤4里返回上一步的事件回调钩子
 */
function onBackToStep3() {
  // 直接返回上一步即可
  // 不能初始化上一步，如果初始化的话，已有轮廓数据的暂存参数设置就会丢失
  taskStatusRef.value = 3
  // 下一个DOM周期：用轮廓查找方法刷新一次轮廓渲染
  nextTick(chooseContour).catch(myError)
}

/**
 * @步骤5 计算接触角
 * OpenCV.js的椭圆拟合方法：fitEllipse()、fitEllipseAMS()和fitEllipseDirect()：
 *   1.  fitEllipse()：基于最小二乘法拟合旋转矩形，再转换为椭圆参数；无显式椭圆约束；可能输出非椭圆结果。
 *   2.  fitEllipseAMS()：近似均方（Approximate Mean Square, AMS）方法求解，可迭代优化，最小化几何距离误差；
 *       强制满足椭圆判别式（B² - 4AC < 0）；严格保证椭圆解。
 *   3.  fitEllipseDirect()：直接最小二乘法（Direct Least Squares）求解（基于Fitzgibbon 1991的闭式解）。
 *       通过约束（4AC - B² = 1）以消除尺度模糊性；严格保证椭圆解。
 * 详见：https://docs.opencv.ac.cn/4.12.0/d3/dc0/group__imgproc__shape.html
 * 该步骤的方法：
 *   1.  onDetermineBaseline - 确定基线（中转方法 → Algorithm.calculateContactAngle）
 *   2.  onDeleteUniResult - 删除单个接触角结果
 *   3.  onDeleteAllResult - 清空所有接触角结果
 *   4.  onDownloadResult - 下载数据
 */

/**
 * 椭圆方程：
 *   [x / (w/2)]² + [y / (h/2)]² = 1
 *   以 x = r·cosθ ，y = r·sinθ 代入，得：
 *   r²·{[(2·cosθ)/w]²+[(2·sinθ)/h]²} = 1
 * 一些公式：
 *   R² = SSR / SST
 *      = 平方和[(r拟合值 - r均值)²] / 平方和[(r个体值 - r均值)²]
 *   SST = SSR + SSE
 *   平方和[(r个体值 - r均值)²] = 平方和[(r拟合值 - r均值)²] + 平方和[(r个体值 - r拟合值)²]
 */

/**
 * 步骤4-5里确认基线的事件回调钩子
 * 会计算接触角
 */
function onDetermineBaseline() { try {
  // 接截距值
  const [[leftIntercept],[rightIntercept]] = interceptSliderAoaRef.value as [SliderParamArr, SliderParamArr]
  // 接参数
  const { width: canvasWidth, height: canvasHeight } = canvasRef.value as HTMLCanvasElement
  // 接椭圆对象
  const { ellipse } = contactAngleObj
  // 验证
  if (!ellipse || !canvasWidth || !canvasHeight) throw new Error("onDetermineBaseline()参数错误")
  // 计算接触角
  const result = Algorithm.calculateContactAngle({
    ellipse,
    leftIntercept,
    rightIntercept,
    canvasWidth, canvasHeight
  })
  // 将结果写入结果ref对象和本地localStorage
  resultRef.value.push([
    contactAngleObj.filename!,
    result.contactAngleAverage,
    result.contactAngleDeviation,
    result.contactAngleLeft,
    result.contactAngleRight,
    result.interceptAngle,
    contactAngleObj.ellipseR2!,
    contactAngleObj.resultType as FitResult,
  ])
  localStorage.setItem("contactAngleResult", JSON.stringify(resultRef.value))
  // 发个通知
  myDialog(
    langRef.value.ResultDialogContent[0]
      + result.contactAngleAverage.toFixed(2)
      + langRef.value.ResultDialogContent[1],
  )
} catch (err) {
  // 处理纯算法模块抛出的特定错误消息
  if ((err as Error).message === "方程没有2个解") {
    myMessage(langRef.value.ContactErrorMessageContent, "warning")
    return
  }
  // 其它错误直接处理
  throw new Error("onDetermineBaseline()报错", { cause: err })
}}

/**
 * 删除单个数据结果
 * @param resultsIndex 结果的索引
 */
function onDeleteUniResult(resultsIndex: number) {
  // 接参数
  const result = resultRef.value
  // 弹出确认框
  myDialog({
    // 主题：警示
    theme: "danger",
    // 通知内容
    body: langRef.value.DeleteUniResultDialogContent,
    // 确认按钮的文本
    confirmBtn: langRef.value.DeleteResultDialogConfirmBtnLabel,
    // 取消按钮的文本
    cancelBtn: langRef.value.DeleteResultDialogCancelBtnLabel,
    // 确认后的回调
    onConfirmCallBack: () => {
      // 删除result的对应项
      result.splice(resultsIndex, 1)
      // 更新localStorage
      localStorage.setItem("contactAngleResult", JSON.stringify(result))
      // 提示用户
      myMessage(langRef.value.DeleteUniResultMessageContent)
    }
  })
}

/**
 * 删除全部数据结果
 */
function onDeleteAllResult() {
  // 接参数
  const result = resultRef.value
  // 弹出确认框
  myDialog({
    // 主题：警示
    theme: "danger",
    // 通知内容
    body: langRef.value.DeleteAllResultDialogContent,
    // 确认按钮的文本
    confirmBtn: langRef.value.DeleteResultDialogConfirmBtnLabel,
    // 取消按钮的文本
    cancelBtn: langRef.value.DeleteResultDialogCancelBtnLabel,
    // 确认后的回调
    onConfirmCallBack: () => {
      // 删除result的所以项
      result.length = 0
      // 清理localStorage
      localStorage.removeItem("contactAngleResult")
      // 提示用户
      myMessage(langRef.value.DeleteUniResultMessageContent)
    }
  })
}

/**
 * 结果正序/倒序排序的回调
 */
function onReverseResultOrder() {
  // 直接反转即可
  isResultReverseRef.value = !isResultReverseRef.value
}

/**
 * 下载结果
 */
function onDownloadResult() {
  /** 接一个AOA对象，第一个元素是表头，后面是数据 */
  const resultAoa: (string | number)[][] = [[...langRef.value.ResultTableContent]]
  // 填充数据：遍历resultRef.value
  const resultOrigin = resultRef.value
  for (let i = 0; i < resultOrigin.length; i++) {
    // 将代理对象转成普通数组
    const resultArr = [(i + 1), ...resultOrigin[i]!]
    // 将结果数组推入AOA对象
    resultAoa.push(resultArr)
  }
  // 建立工作表文件的Map对象
  const resultMap = new Map()
  // 把数据结果AOA数组加进Map里
  resultMap.set(langRef.value.ResultSheetLabel, resultAoa)
  // AOA数据的Map对象转成xlsx文件
  const workbook = aoaMapToWorkbook(resultMap)
  // 下载xlsx文件
  downloadXlsx(workbook, "contact-angle_data.xlsx")
}

</script>


<!--
  样式层
 -->
<style lang="css" scoped>
/* 让表格内文字居中 */
td, th {
  text-align: center;
  vertical-align: middle;
}
</style>
