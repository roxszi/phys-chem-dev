<!--
  接触角求解
  通过图片处理，得到轮廓数据，然后通过计算拟合最终求解接触角。
  计算机视觉库的实现，以及一些交互的设计思路。
  构建OpenCV.js：https://docs.opencv.ac.cn/4.12.0/d4/da1/tutorial_js_setup.html
  交互主要分4步完成，共5个状态：
  1.  读取图片/上传图片。读取到的图片将直接灰度化，渲染在canvas上。
      此处的交互主要就是上传图片。
      此步骤将保存原图片的Mat对象，以便后续使用。
  2.  裁剪图片为合适的尺寸。裁剪完毕后将裁剪好的图片渲染在canvas上。
      短按控制边框；长按清空已有选框。可以反复多次裁剪。直至点击“完成裁剪”按钮。
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

  <!--
    canvas头-步骤3
    这里有一个switch开关，用于切换边缘检测算法。
    Canny算法和阈值化算法。恰好都有2个参数，一主一辅，所以UI是可以统一的。
    （参数调节放在“canvas脚-步骤3”部分了）
    onContourAlgorithmSwitchChange：切换算法时触发。
   -->
  <mySpace v-else-if="taskStatusRef === 3">
    <!-- 警报框 -->
    <t-alert theme="warning" :title="lang.SetpTitle + '3'">
      <div v-for="(content, index) of lang.Setp3Content" :key="index">
        {{ content }}
      </div>
    </t-alert>

    <!-- 警报框：轮廓算法/边缘检测算法切换开关 -->
    <t-alert theme="info" :title="lang.ContourAlgorithmTitle">
      <div v-for="(content, index) of lang.ContourAlgorithmContent" :key="index">
        <div v-if="content.strong">
          <strong>{{ content.strong }}</strong>{{ content.normal }}
        </div>
        <div v-else>{{ content }}</div>
      </div>
    </t-alert>
    <!-- 边缘检测算法切换开关 -->
    <MySwitch
      @change="onContourAlgorithmSwitch"
      v-model="contourAlgorithmSwitchRef"
      :leftLabel="lang.CannyAlgorithmLabel"
      :rightLabel="lang.ThresholdingMethodLabel"
    />

    <!-- 警报框：遮罩 -->
    <t-alert theme="info" :title="lang.ContourMaskTitle">
      <div v-for="(content, index) of lang.ContourMaskContent" :key="index">
        <div v-if="content.strong">
          <strong>{{ content.strong }}</strong>{{ content.normal }}
        </div>
        <div v-else>{{ content }}</div>
      </div>
    </t-alert>
    <!-- 遮罩切换开关 -->
    <MySwitch
      v-model="contourFilterAlgorithmSwitchRef"
      :leftLabel="lang.ContourMaskSideLabel"
      :rightLabel="lang.ContourMaskCentralLabel"
    />

  </mySpace>

  <!-- canvas头-步骤4 -->
  <!-- 警报框 -->
  <t-alert
    v-else-if="taskStatusRef === 4"
    theme="warning" :title="lang.SetpTitle + '4'"
  >
    <div v-for="(content, index) of lang.Setp4Content" :key="index">
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
    class="center"
  >
    <!-- 裁剪图片 -->
    <myButton
      @click="onSureRect(false)"
      :block="false"
    >
      {{ lang.CutPictureButtonText }}
    </myButton>
    <!-- 裁剪完成 -->
    <myButton
      @click="onSureRect(true)"
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
    contourCoarseToggle：切换滑轨的粗调和细调。
    onDetermineContour：最终确定轮廓的按钮事件回调钩子。
   -->
  <mySpace
    v-else-if="taskStatusRef === 3"
    size="small"
  >
    <!-- 滑轨：主参数 -->
    <div v-if="contourAlgorithmSwitchRef === false">
      {{ lang.ContourSliderMainParameterChangeLabel }}
    </div>
    <div v-else>
      {{ lang.ContourSliderMainParameterValueLabel }}
    </div>
    <t-slider
      @change="onSliderChange" @changeEnd="onSliderChangeEnd"
      v-model="thresholdNumAoaRef[0][0]"
      :min="thresholdNumAoaRef[0][1]" :max="thresholdNumAoaRef[0][2]"
      :marks="thresholdNumAoaRef[0][3]"
      :step="1" :range="false"
      :inputNumberProps="false" :label="true" layout="horizontal"
    /><t-divider />
    <!-- 滑轨：辅助参数 -->
    <mySpace
      v-if="contourAlgorithmSwitchRef === false"
      size="small"
    >
      <div>{{ lang.ContourSliderAuxiliaryParameterLabel }}</div>
      <t-slider
        @change="onSliderChange" @changeEnd="onSliderChangeEnd"
        v-model="thresholdNumAoaRef[1][0]"
        :min="thresholdNumAoaRef[1][1]" :max="thresholdNumAoaRef[1][2]"
        :marks="thresholdNumAoaRef[1][3]"
        :step="1" :range="false"
        :inputNumberProps="false" :label="true" layout="horizontal"
      /><t-divider />
    </mySpace>
    <!-- 容器（按钮容器） -->
    <div class="center">
      <!-- 轮廓粗调/细调切换 -->
      <myButton
        @click="onContourSliderCoarseFineToggle"
        :block="false" :theme="isContourCoarseRef ? 'primary' : 'warning'"
      >
        {{
          isContourCoarseRef
            ? lang.ContourSliderSwitchFineButtonLabel
            : lang.ContourSliderSwitchCoarseButtonLabel
        }}
      </myButton>
      <!-- 确定轮廓 -->
      <myButton
        @click="onDetermineContour"
        :block="false" theme="danger"
      >
        {{ lang.ContourDetermineButtonLabel }}
      </myButton>
    </div>
  </mySpace>

  <!--
    canvas脚-步骤4
    主要就是找基线。点击canvas实现基线粗找，调节滑轨来实现基线细调。
    onSlideChange：滑轨变化时触发，用于实时渲染基线效果。
    没有滑轨变化结束时的触发方法/钩子，因为canvas事件回调钩子会劫持slider的change事件，使其没有end。
    onBackToStep3：返回第3步，这里需要有次功能，以满足找基线时候对轮廓的反复微调。
    onDetermineBaseline：最终确定基线的按钮事件回调钩子。
   -->
  <mySpace
    v-else-if="taskStatusRef === 4"
    size="small"
  >
    <!-- 滑轨：左截距 -->
    <div>{{ lang.InterceptLeftSliderLabel }}</div>
    <t-slider
      @change="onSliderChange" @changeEnd="onSliderChangeEnd"
      v-model="interceptNumAoaRef[0][0]"
      :min="interceptNumAoaRef[0][1]" :max="interceptNumAoaRef[0][2]"
      :marks="interceptNumAoaRef[0][3]"
      :step="1" :range="false"
      :inputNumberProps="false" :label="true" layout="horizontal"
    /><t-divider />
    <!-- 滑轨：右截距 -->
    <div>{{ lang.InterceptRightSliderLabel }}</div>
    <t-slider
      @change="onSliderChange" @changeEnd="onSliderChangeEnd"
      v-model="interceptNumAoaRef[1][0]"
      :min="interceptNumAoaRef[1][1]" :max="interceptNumAoaRef[1][2]"
      :marks="interceptNumAoaRef[1][3]"
      :step="1" :range="false"
      :inputNumberProps="false" :label="true" layout="horizontal"
    /><t-divider />
    <!-- 容器（按钮容器） -->
    <div class="center">
      <!-- 返回上一步 -->
      <myButton
        @click="onBackToStep3"
        :block="false" theme="default"
      >
        {{ lang.StepBackButtonLabel }}
      </myButton>
      <!-- 确认基线 -->
      <myButton
        @click="onDetermineBaseline"
        :block="false" theme="primary"
      >
        {{ lang.BaselineConfirmButtonLabel }}
      </myButton>
    </div>
  </mySpace>

  <!--
    canvas脚-步骤5
    数据结果的呈现：数据表格、下载按钮
   -->
  <mySpace
    v-if="resultRef[0]"
    size="small"
  >
    <!-- 接触角数据 -->
    <div class="center"><table>
      <!-- 表头 -->
      <thead>
        <tr>
          <th v-for="(content, index) of lang.ResultTableContent" :key="index">
            {{ content }}
          </th>
          <!-- 处理 -->
          <th>{{ lang.ResultTableProcessingLabel }}</th>
        </tr>
      </thead>
      <!-- 表格体 -->
      <tbody>
        <tr v-for="(resultArr, resultsIndex) in resultRef" :key="resultsIndex">
          <td>{{ resultsIndex + 1 }}</td>
          <td>{{ resultArr[0] }}</td>
          <td>{{ resultArr[1]?.toFixed(2) }}</td>
          <td>{{ resultArr[2]?.toFixed(2) }}</td>
          <td>{{ resultArr[3]?.toFixed(2) }}</td>
          <td>{{ resultArr[4]?.toFixed(2) }}</td>
          <td>{{ resultArr[5]?.toFixed(2) }}</td>
          <td>{{ resultArr[6]?.toFixed(4) }}</td>
          <!-- 删除按钮 -->
          <td><myButton
            @click="onDeleteUniResult(resultsIndex)"
            :block="false" theme="danger"
          >
            {{ lang.ResultTableDeleteButtonLabel }}
          </myButton></td>
        </tr>
      </tbody>
    </table></div>
    <!-- 容器（按钮容器） -->
    <div class="center">
      <!-- 下载数据 -->
      <myButton
        @click="onDownloadResult"
        :block="false" theme="primary"
      >
        {{ lang.ResultTableExportButtonLabel }}
      </myButton>
      <!-- 清空数据 -->
      <myButton
        @click="onDeleteAllResult"
        :block="false" theme="danger"
      >
        {{ lang.DeleteAllResultButtonLabel }}
      </myButton>
    </div>
  </mySpace>
</MySpace></template>

<!--
  逻辑层
 -->
<script setup>
// 导入VUE的各类响应式方法
import { useTemplateRef, onMounted, onBeforeUnmount, ref, watch, nextTick, shallowRef } from "vue"
// 导入VueUse的各类响应式方法
import { useMouseInElement, onLongPress, useThrottleFn } from "@vueuse/core"
// 导入自有方法
import my from "@/utils/myFunc.js"
// 导入xlsx相关方法
import { aoaMapToWorkbook, downloadXlsx } from "@/utils/app-xlsx.js"
// 导入OpenCV.js加载器
import { loadOpenCV } from "@/utils/opencvLoader.js"
// 导入语言包
import { langAll, useData } from "./ContactAngle-lang.js"

/** 语言包，默认"root"，即中文 @type { import("vue").ShallowRef<Object> }  */
const lang = shallowRef(langAll.root)
/**
 * 任务状态：
 * 1 - 未开始，或删除了图片。正在等待读取图片；
 * 2 - 读取到了图片。正在选框裁剪图片；
 * 3 - 完成了选框，得到了裁剪的图片。正在寻找并确定轮廓；
 * 4 - 完成了轮廓寻找，得到了液滴轮廓坐标。正在寻找基线；
 * 5 - 完成了基线寻找，得到了基线坐标。正在计算接触角。
 *     其实并不存在状态5，因为计算接触角是最后一步，没有下一步了。
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
/** 第三步寻找轮廓的调参数组Ref对象 @type { import("vue").Ref<Number[][]> } */
const thresholdNumAoaRef = ref([])
/** 第三步寻找轮廓的调参数组常量对象 @type { Number[][] } */
const thresholdNumAoaConst = [
  // 主参数：当前值、最小值、最大值、marks标记
  [255, 0, 255, [0, 85, 170, 255]],
  // 辅助参数：当前值、最小值、最大值、marks标记
  [0, 0, 255, [0, 85, 170, 255]]
]
/**
 * 第三步寻找轮廓的算法切换对象
 * @type { import("vue").Ref<Boolean> }
 * @value true - Canny算法
 * @value false - 阈值化法
 */
const contourAlgorithmSwitchRef = ref(false)
/** 第三步寻找轮廓是否是粗调模式 @type { import("vue").Ref<Boolean> } */
const isContourCoarseRef = ref(true)
/** 
 * 第三步寻找轮廓的遮罩算法切换对象
 * @type { import("vue").Ref<Boolean> }
 * @value false - 两边遮罩
 * @value true - 中心遮罩
 */
const contourFilterAlgorithmSwitchRef = ref(false)
/**
 * 第四步寻找基线的截距
 * @type { import("vue").Ref<Number[][]> }
 * 格式：左截距：当前值、最小值、最大值、marks标记，右截距：当前值、最小值、最大值、marks标记
 * @note 不能轻易赋值，因为在步骤4，一旦赋值，就会触发绘制基线等回调
 */
const interceptNumAoaRef = ref([])
/**
 * 第五步计算接触角的最终结果
 * @type { import("vue").Ref<[String, Number, Number, Number, Number, Number, Number][]> }
 * 分别是：文件名、接触角均值、左接触角、右接触角、左右偏差、基线角度、椭圆拟合的决定系数R²
 */
const resultRef = ref([])

/**
 * 接触角业务的全局对象
 * @typedef { Object } ContactAngle
 * @property { import("@techstark/opencv-js") } cv OpenCV.js对象
 * @property { Number } canvasStyleWidth canvas元素块的显示宽度
 * @property { String } filename 所上传文件的文件名
 * @property { CanvasRenderingContext2D } ctx canvas的绘图上下文对象
 * @property { Number } canvasScaling canvas元素块的缩放比例：实际/显示
 * @property { import("@techstark/opencv-js").Mat } matGray 灰度图Mat对象
 * @property { ImageData } imageData canvas的图像数据，用于暂存，便于恢复
 * @property { Rect } rect canvas元素块选框
 * @property { ColLine } colLine 轮廓选择时用于过滤的两侧基线
 * @property { import("@techstark/opencv-js").RotatedRect } ellipseObj 拟合得到的椭圆对象
 * @property { Number } ellipseR2 椭圆拟合的决定系数R²
 * @property { [Number, Number] } baselinePoint 基线参考点
 * @note canvas的实际宽高在canvasRef.value.width和canvasRef.value.height上
 * @note canvas的显示宽最大值在canvasParentRef.value.clientWidth上，但是这个可能会变化！很坑
 */
/**
 * @typedef { Object } Rect canvas元素块选框
 * @property { Number } xMax canvas元素块选框的X坐标大值(亦用于步骤3的遮罩框)
 * @property { Number } yMax canvas元素块选框的Y坐标大值(亦用于步骤3的遮罩框)
 * @property { Number } xMin canvas元素块选框的X坐标小值(亦用于步骤3的遮罩框)
 * @property { Number } yMin canvas元素块选框的Y坐标小值(亦用于步骤3的遮罩框)
 */
/**
 * @typedef { Object } ColLine canvas元素块遮罩线
 * @property { Number } left canvas元素块遮罩线的左侧线X坐标
 * @property { Number } right canvas元素块遮罩线的右侧线X坐标
 */
/** 接触角业务的全局对象 @type { ContactAngle } */
const contactAngleObj = {
  cv: null,
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
  ellipseObj: null,
  ellipseR2: null,
  baselinePoint: null,
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
  // 语言刷新完毕，渲染加载框
  my.loading(lang.value.OpenCVLoadingContent)
  // 接下来做一些该WebApp的准备工作
  // 阻止页面刷新和关闭，该方法不能阻止页面前进（跳转）、后退
  window.addEventListener("beforeunload", beforeunloadHandler)
  // 初始化数据结果resultRef，尝试从localStorage中读取
  resultRef.value = JSON.parse(localStorage.getItem("contactAngleResult")) || []
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
          )
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
    )
  }
  // 导入OpenCV.js库
  // 这是从@techstark/opencv-js库中导入cv对象，原库cv比较大，已改为重构建的OpenCV.js了，故注释掉
  // const cvImportPromise = import("@techstark/opencv-js")
  // // 等待OpenCV.js加载完成
  // cvImportPromise.then((cvReadyPromise) => {
  //   // 动态导入钩子里面仍是个Promise对象，需要再then
  //   cvReadyPromise.default.then((cv) => {
  //     // 赋值给全局变量cv
  //     contactAngleObj.cv = cv
  //     // 停止加载框
  //     my.loading(false)
  //   })
  // })
  loadOpenCV().then((cvReady) => {
    // 赋值给全局变量cv
    contactAngleObj.cv = cvReady
    // 停止加载框
    my.loading(false)
  })
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
 * 长按<canvas>触发的回调
 * 步骤2、步骤3：清空<canvas>上的标记
 */
function onCanvasLongPress() { try {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为2时
  if (taskStatus === 2) {
    // 清空canvas上的矩形标记数据
    canvasRectAndColLineDataRemove()
    // 恢复canvas原图
    contactAngleObj.ctx.putImageData(contactAngleObj.imageData, 0, 0)
  }
} catch (error) {
  my.error("onCanvasLongPress()报错：", error, errorDialog)
}}

/**
 * 点击<canvas>触发的回调
 * 步骤2：选框
 * 步骤3：遮罩
 * 步骤4：绘制基线
 */
function onCanvasClick() { try {
  // console.log(
  //   `canvas点击：
  //   (${ elementX.value * contactAngleObj.canvasScaling.toFixed(1) },
  //   ${ elementY.value * contactAngleObj.canvasScaling.toFixed(1) })`
  // )
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
  // 基线粗调会改变模型绑定的值，进而触发绘制基线方法
  } else if (taskStatus === 4) {
    chooseBaselineCoarse()
  }
} catch (error) {
  my.error("onCanvasClick()报错：", error, errorDialog)
}}

/**
 * 清空canvas上的矩形标记数据
 */
function canvasRectAndColLineDataRemove() {
  // 接参数
  const { rect, colLine } = contactAngleObj
  // 清空选框的X和Y边界值
  rect.xMax = null
  rect.yMax = null
  rect.xMin = null
  rect.yMin = null
  // 清空两侧遮罩的值
  colLine.left = null
  colLine.right = null
}

/**
 * 设置canvas的绘图上下文ctx
 */
function ctxSetting() {
  // 接参数
  const { ctx, canvasScaling } = contactAngleObj
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
function onSliderChange() { try {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为3时，即确定轮廓阶段
  if (taskStatus === 3) {
    // 直接执行节流处理的轮廓查找方法
    chooseContourThrottled()
  // 任务进度为4时，即基线绘制阶段
  } else if (taskStatus === 4) {
    // 直接执行节流的绘制基线方法
    drawBaselineThrottled()
  }
} catch (error) {
  my.error("onSliderChange()报错：", error, errorDialog)
}}

/**
 * 调节滑轨操作刚停止的事件回调钩子
 * 步骤3：基线细调。此步骤下，用户只能操作滑轨，因此事件全部来源于滑轨。
 */
function onSliderChangeEnd() { try {
  // 接参数
  const taskStatus = taskStatusRef.value
  // 任务进度为3，且为细调状态
  if ((taskStatus === 3) && (isContourCoarseRef.value === false)) {
    // 调用进度3下的具体刷新滑轨方法
    refreshContourFineSlider()
  // 任务进度为4
  } else if (taskStatus === 4) {
    // 接参数
    const [[leftIntercept], [rightIntercept]] = interceptNumAoaRef.value
    // 执行滑轨数据刷新方法（会被动触发绘制基线）
    refreshBaselineSlider([leftIntercept, rightIntercept])
  }
} catch (error) {
  my.error("onSliderChangeEnd()报错：", error, errorDialog)
}}

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
  // 接对象
  const { cv, ctx, matGray } = contactAngleObj
  const canvas = canvasRef.value
  // 接收文件名
  contactAngleObj.filename = event[0].name
  // 从第一个对象获取文件url
  const fileURL = URL.createObjectURL(event[0].raw)
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
  if (matGray?.delete) {
    matGray.delete()
  }
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
  contactAngleObj.imageData = ctx.getImageData(
    0, 0, canvas.width, canvas.height
  )
  // 第一阶段完成，任务进度改为2（该步骤会恢复canvas的上下文设置）
  taskToStep2()
  // 停止加载框
  my.loading(false)
} catch (error) {
  // 停止加载框
  my.loading(false)
  // 报错处理
  my.error("onPicChange()报错：", error, errorDialog)
}}

/**
 * @步骤2 绘制选框。该步骤的方法：
 *   0.  taskToStep2 - 任务切换
 *       0.1  清空canvas上的遮罩标记数据
 *       0.2  切换任务进度为2
 *       0.3  nextTick：调整canvas尺寸并重置ctx设置
 *   1.  canvasFit - canvas尺寸适应方法
 *   2.  chooseRect - 计算选框（第3步也有用，因此解耦）
 *   3.  drawRect - 绘制选框
 *   4.  onSureRect - 确认选框（裁剪图片 | 完成裁剪）
 * 此处的选框、清除选框等方法，放在上面的全局canvas监听里了
 */

/**
 * 任务进度切换到步骤2
 *   1.  初始化选框标记rect数据为null
 *   2.  进入步骤2后，调整canvas尺寸并更新ctx
 */
function taskToStep2() {
  // 清空canvas上的矩形标记数据
  canvasRectAndColLineDataRemove()
  // 任务进度改为2
  taskStatusRef.value = 2
  // 下个DOM周期：调整canvas尺寸以适应屏幕
  nextTick(canvasFit).catch((error) => {
    my.error("taskToStep2().nextTick()报错：", error, errorDialog)
  })
}

/**
 * canvas尺寸适应方法：调整canvas的显示宽高
 * canvas在步骤2时，有一个show的变化，需要根据图片大小重新进行缩放，以适应屏幕
 * @note 调整canvasScaling后，需重新设置canvas的绘图上下文设置ctx（画笔粗细）
 */
function canvasFit() {
  // 接参数
  const canvas = canvasRef.value
  // 接canvas父元素的最大内宽，赋值给全局变量
  contactAngleObj.canvasStyleWidth = canvas.parentElement.clientWidth
  // 设置canvas的显示宽度
  canvas.style.width = canvas.parentElement.clientWidth + "px"
  // 以canvas的真实宽度和显示宽度之比，赋值给全局对象的缩放比例变量
  contactAngleObj.canvasScaling = canvas.width / contactAngleObj.canvasStyleWidth
  // 更新canvas的显示高度
  canvas.style.height = canvas.height / contactAngleObj.canvasScaling + "px"
  // 调整宽高后，需重新设置canvas的上下文设置
  ctxSetting()
}

/**
 * 选框方法
 * 用于更新选框的X、Y坐标边界值，赋值给全局rext对象
 */
function chooseRect() {
  // 接参数
  const { canvasScaling, rect } = contactAngleObj
  // 点击位置的实际X、Y坐标
  const realElementX = elementX.value * canvasScaling
  const realElementY = elementY.value * canvasScaling
  // 如果选框X边界未定义，即第一次点击，需记录下选框的左上角坐标
  if (!rect.xMax) {
    /** 画框比例 @const { Number } */
    const RECT_SCALE = 0.5
    // 接canvas
    const canvas = canvasRef.value
    // 计算初始化选框的半宽/半高：四分之一的<canvas>宽高，然后选小的值
    const rectHalfX = Math.min((canvas.width * RECT_SCALE * 0.5), (canvas.height * RECT_SCALE * 0.5))
    // Y轴半高：适当压扁一点
    const rectHalfY = rectHalfX * 2 / 3
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
  // 接下来处理选框X边界已定义的情况，即修改原图
  // 如果恰好点在选框上
  if (
    (realElementX === rect.xMax)
    || (realElementX === rect.xMin)
    || (realElementY === rect.yMax)
    || (realElementY === rect.yMin)
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
  if (realElementX > rect.xMax) {
    rect.xMax = realElementX
  } else if (realElementX < rect.xMin) {
    rect.xMin = realElementX
  } else {
    isInRect++
  }
  // 判断Y点：
  // 同上
  if (realElementY > rect.yMax) {
    rect.yMax = realElementY
  } else if (realElementY < rect.yMin) {
    rect.yMin = realElementY
  } else {
    isInRect++
  }
  // 如果“如果在选框内”的标记isInRect不等于2，即至少x和y有一个在选框外
  if (isInRect !== 2) {
    // 此时选框点已经更新了，所以直接返回即可
    return
  }
  // 接下来处理选框点在选框内（isInRect === 2）的情况
  // 思路：比较斜率。有3个斜率：
  // 1.  参考斜率，即选框自身的斜率rectSlope，也就是矩形框的交叉线。
  //     参考斜率有正负值。求1个即可，另一个加负号，即-rectSlope。
  // 2.  选点针对(rect.xMin, rect.yMin)点的斜率。
  //     该斜率和rectSlope比较，如果大于rectSlope，则说明选点在交叉线的上方，反之在下方。
  // 3.  选点针对(rect.xMax, rect.yMin)点的斜率。
  //     该斜率和-rectSlope比较，如果【小于-rectSlope】，则说明选点在交叉线的上方，反之在下方。
  //     这里要注意负数比较，和“2”的正数比较相反。
  // 参考斜率rectSlope
  const rectSlope = (rect.yMax - rect.yMin)
    / (rect.xMax - rect.xMin)
  // 选点针对(rect.xMin, rect.yMin)点的斜率
  const realElementSlopePositive = (realElementY - rect.yMin)
    / (realElementX - rect.xMin)
  // 选点针对(rect.xMax, rect.yMin)点的斜率（这是个负数）
  const realElementSlopeNegative = (realElementY - rect.yMin)
    / (realElementX - rect.xMax)
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
 */
function drawRect() {
  // 接参数
  const { ctx, imageData, rect } = contactAngleObj
  const canvas = canvasRef.value
  // 先对选框进行初始化，去掉上一次的绘制
  ctx.putImageData(imageData, 0, 0)
  // 画一个全canvas遮罩
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // 计算宽高
  const rectWidth = rect.xMax - rect.xMin
  const rectHeight = rect.yMax - rect.yMin
  // 然后重绘选框中部
  ctx.putImageData(
    imageData, 0, 0,
    rect.xMin, rect.yMin, rectWidth, rectHeight,
  )
  // 最后直接绘制框
  ctx.strokeRect(rect.xMin, rect.yMin, rectWidth, rectHeight)
}

/**
 * “裁剪图片”或“完成裁剪”的回调方法
 * @param { Boolean } isDetermine 是否确定完成裁剪
 */
function onSureRect(isDetermine) { try {
  // 接参数
  const { cv, matGray, ctx, rect } = contactAngleObj
  const canvas = canvasRef.value
  // 如果有选框
  if (rect.xMax) {
    // 开始裁剪：确定裁剪区域
    const rectRect = new cv.Rect(
      rect.xMin,
      rect.yMin,
      rect.xMax - rect.xMin,
      rect.yMax - rect.yMin
    )
    // 裁剪区域确定好了，可以清空裁剪标记了
    canvasRectAndColLineDataRemove()
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
    contactAngleObj.imageData = ctx.getImageData(
      0, 0, canvas.width, canvas.height
    )
  }
  // 如果是“完成裁剪”
  if (isDetermine === true) {
    // 则任务状态进展到“3”
    taskToStep3()
  }
} catch (error) {
  my.error("onSureRect()报错：", error, errorDialog)
}}

/**
 * @步骤3 选择轮廓
 * 这一步很重要。有轮廓算法选择、轮廓参数调节（滑轨）、遮罩参数调节，这三个操作。
 * 轮廓参数调节（滑轨）还有粗调/细调切换，遮罩参数调节也有中心遮罩/两边遮罩切换。
 * 然后在最后“确认轮廓”时，还会有轮廓到椭圆的拟合。
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
 *   1.  thresholdNumAoaRestore - 初始化调参参数滑轨（粗/细调那里也会用到，因此解耦）
 *   2.  chooseContour - 选择轮廓算法。会调用[查找轮廓]和[选择遮罩]方法
 *       2.1  chooseContourThrottled - [选择轮廓(节流)]方法
 *   3.  getContour - 查找轮廓/获取轮廓，会先二值化，然后查找轮廓
 *   4.  drawContour - 绘制轮廓
 *   5.  onContourAlgorithmSwitch - 轮廓算法切换，调用[选择轮廓(节流)]方法
 *   6.  chooseMask - 选择遮罩，会根据遮罩种类设置，调用[chooseColLine]或[chooseRect]方法，
 *       然后调用[绘制遮罩]方法
 *   7.  chooseColLine - 选择左右轮廓过滤线（和第2步的[chooseRect]配合）
 *   8.  drawMask - 绘制遮罩
 *   9.  onContourSliderCoarseFineToggle - 轮廓参数粗/细调切换：
 *       对于转粗调：直接刷新粗调滑块thresholdNumAoaRestore()
 *       对于转细调：刷新细调滑块refreshContourFineSlider()
 *   10. refreshContourFineSlider - 刷新细调滑块
 *   11. onDetermineContour - 确定轮廓，会调用[查找轮廓]方法，
 *       然后依次调用[轮廓过滤]、[获取椭圆]、[绘制椭圆]方法，然后会进入步骤4
 *   12. filterContourPoints - 轮廓过滤，会滤去明显的杂点
 *   13. getEllipse - 迭代获取椭圆对象
 *   14. drawEllipse - 绘制椭圆
 */

/**
 * 任务进度切换到步骤3
 *   1.  把各类参数恢复为默认设置
 *   2.  下个DOM周期，调用轮廓查找方法刷新一次轮廓渲染
 */
function taskToStep3() {
  // 轮廓查找算法恢复默认设置
  contourAlgorithmSwitchRef.value = false
  // 粗调/细调恢复默认设置
  isContourCoarseRef.value = true
  // 中心遮罩/两边遮罩恢复默认设置
  contourFilterAlgorithmSwitchRef.value = false
  // 初始化调参参数滑轨
  thresholdNumAoaRestore()
  // 清空遮罩数据
  canvasRectAndColLineDataRemove()
  // 切换到状态3
  taskStatusRef.value = 3
  // 下一个DOM周期：用轮廓查找方法刷新一次轮廓渲染
  nextTick(chooseContour).catch((error) => {
    my.error("taskToStep3().nextTick()报错：", error, errorDialog)
  })
}

/**
 * 初始化步骤3调参参数滑轨
 * 如果滑轨Ref值为空，则全部初始化
 * 否则保留每个传参的当前值，对范围、步进等初始化
 */
function thresholdNumAoaRestore() {
  // 接参数
  const thresholdNumAoa = thresholdNumAoaRef.value
  // 如果滑轨参数为空，则初始化滑轨参数
  if (thresholdNumAoa.length === 0) {
    // 直接深拷贝一份副本然后赋值即可
    thresholdNumAoaRef.value = structuredClone(thresholdNumAoaConst)
  // 否则，保留每个参数的取值
  } else {
    // 先深拷贝一份参数副本
    const thresholdNumAoaTemp = structuredClone(thresholdNumAoaConst)
    // 用参数副本的第一个值值覆盖
    for (let i = 0; i < thresholdNumAoa.length; i++) {
      thresholdNumAoaTemp[i][0] = thresholdNumAoa[i][0]
    }
    // 赋值
    thresholdNumAoaRef.value = thresholdNumAoaTemp
  }
}

/**
 * 选择轮廓
 * 会调用[查找轮廓]和[绘制遮罩]方法
 */
function chooseContour() {
  // 节流的bug防范：只有在“3”任务状态时，才允许执行
  // 这可以防止进入步骤4的瞬间执行此方法，造成canvas不正常的刷新回退
  if (taskStatusRef.value !== 3) { return }
  // 获取轮廓
  const [metVectorContours, metHierarchy] = getContour()
  // 绘制轮廓
  drawContour([metVectorContours, metHierarchy])
  // 绘制完毕，销毁Met对象以释放WASM内存
  metVectorContours.delete()
  metHierarchy.delete()
  // 最后绘制遮罩
  drawMask()
}

/**
 * 选择轮廓方法的节流方法
 */
const chooseContourThrottled = useThrottleFn(chooseContour, 500, true)

/**
 * 获取轮廓
 *   1.  先用2种算法（中的一个）得到二值化轮廓图
 *   2.  然后根据传参寻找轮廓
 * @returns {[
 *     import("@techstark/opencv-js").MatVector,
 *     import("@techstark/opencv-js").Mat
 *   ]} 轮廓AOA数组metVectorContours和轮廓层次结构metHierarchy
 * @note 返回的2个对象，务必记得在用完后手动删除，否则会一直占用WASM内存
 */
function getContour() {
  // 接参数
  const { cv, matGray } = contactAngleObj
  // 接阈值数组参数
  const [[mainParam], [auxParam]] = thresholdNumAoaRef.value
  // 初始化一个二值化图的过渡对象
  const matBinary = new cv.Mat()
  // 阈值化Threshold算法：true
  if (contourAlgorithmSwitchRef.value === true) {
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
      cv.THRESH_BINARY
    )
  // Canny算法：false
  } else {
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
  }
  // 用获得的二值化对象matBinary寻找轮廓
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
 * 绘制轮廓
 * @param {[
 *     import("@techstark/opencv-js").MatVector,
 *     import("@techstark/opencv-js").Mat
 *   ]} 轮廓AOA数组metVectorContours和轮廓层次结构metHierarchy
 * @note 传参的2个对象，务必记得在用完后手动删除，否则会一直占用WASM内存
 */
function drawContour([metVectorContours, metHierarchy]) {
  // 接参数
  const { cv, matGray, canvasScaling, ctx } = contactAngleObj
  const canvas = canvasRef.value
  // 从灰度图拷贝一个原画布，用于绘制轮廓
  const matContoursHandleMat = new cv.Mat()
  matGray.copyTo(matContoursHandleMat)
  // 定义最小外接圆的颜色为白色
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
  // 把画布图案绘制在canvas上（操作完成后需重置ctx）
  cv.imshow(canvas, matContoursHandleMat)
  // 重置ctx
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
function onContourAlgorithmSwitch() { try {
  // 调用节流处理的选择轮廓方法即可
  chooseContourThrottled()
} catch (error) {
  my.error("onContourAlgorithmSwitch()报错：", error, errorDialog)
}}

/**
 * 选择遮罩
 * 会根据遮罩种类设置，调用[chooseColLine]或[chooseRect]方法
 * 然后刷新canvas图像
 * 最后调用[绘制遮罩]方法
 */
function chooseMask() {
  // 接参数
  const { ctx, imageData } = contactAngleObj
  // 中心遮罩
  if (contourFilterAlgorithmSwitchRef.value) {
    chooseRect()
  // 两边遮罩
  } else {
    chooseColLine()
  }
  // 刷新canvas，去掉之前画的遮罩
  ctx.putImageData(imageData, 0, 0)
  // 绘制遮罩
  drawMask()
}

/**
 * 选线方法。选择轮廓左右两侧的过滤线
 */
function chooseColLine() {
  // 接参数
  const { canvasScaling, colLine } = contactAngleObj
  // 接点击位置的实际X、Y坐标
  const realElementX = elementX.value * canvasScaling
  // 接canvas的半宽
  const canvasWidthHalf = canvasRef.value.width / 2
  // 根据点击位置，判断是左边的线还是右边的线
  // 如果点击位置X坐标小于canvas半宽
  if (realElementX < canvasWidthHalf) {
    // 左边的线
    colLine.left = Math.ceil(realElementX)
  } else {
    // 右边的线
    colLine.right = Math.floor(realElementX)
  }
}

/**
 * 绘制遮罩
 */
function drawMask() {
  // 接参数
  const { ctx, colLine, rect } = contactAngleObj
  const canvas = canvasRef.value
  // 左边的线
  if (colLine.left !== null) {
    // 左边阴影区
    ctx.fillRect(0, 0, colLine.left, canvas.height)
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
  if (rect.xMin !== null) {
    // 计算宽高
    const rectW = rect.xMax - rect.xMin
    const rectH = rect.yMax - rect.yMin
    // 中间阴影区
    ctx.fillRect(rect.xMin, rect.yMin, rectW, rectH)
    // 中间线框
    ctx.strokeRect(rect.xMin, rect.yMin, rectW, rectH)
  }
}

/**
 * 轮廓粗/细调的切换的回调钩子
 * 对于转粗调：直接刷新粗调滑块thresholdNumAoaRestore()
 * 对于转细调：刷新细调滑块refreshContourFineSlider()
 * @note 会被动触发绘制轮廓
 */
function onContourSliderCoarseFineToggle() { try {
  // 如果目前是细调，则要修改为粗调
  if (isContourCoarseRef.value === false) {
    // 刷新粗调滑块（这一步会触发绘图）
    thresholdNumAoaRestore()
  // 如果目前是粗调，要改为细调
  } else {
    // 刷新细调滑块（这一步会触发绘图）
    refreshContourFineSlider()
  }
  // 更新标记
  isContourCoarseRef.value = !isContourCoarseRef.value
} catch (error) {
  my.error("onContourSliderCoarseFineToggle()报错：", error, errorDialog)
}}

/**
 * 步骤3里刷新细调滑块的具体方法
 * @note 会触发绘制轮廓
 */
function refreshContourFineSlider() {
  // 接收主参数和辅助参数
  const [[mainParam], [auxParam]] = thresholdNumAoaRef.value
  // 找主参数的下限：主参数的下限必须不小于0，不大于243
  const mainParamMin = Math.max(0, Math.min(243, (mainParam - 6)))
  // 找辅助参数的下限：辅助参数的下限必须不小于0，不大于243
  const auxParamMin = Math.max(0, Math.min(243, (auxParam - 6)))
  // 细调的阈值数组
  const thresholdNumAoaTemp = [
    // 主参数：当前值、下限、上限、mark标记
    [
      mainParam, mainParamMin, mainParamMin + 12,
      [mainParamMin, mainParamMin + 4, mainParamMin + 8, mainParamMin + 12]
    ],
    // 辅助参数：当前值、下限、上限、mark标记
    [
      auxParam, auxParamMin, auxParamMin + 12,
      [auxParamMin, auxParamMin + 4, auxParamMin + 8, auxParamMin + 12]
    ]
  ]
  // 赋值（这一步会触发绘图）
  thresholdNumAoaRef.value = thresholdNumAoaTemp
}

/**
 * 确定轮廓
 */
function onDetermineContour() { try {
  // 加载框
  my.loading(lang.value.ContourFitLoadingContent)
  // 获取轮廓
  const [metVectorContours, metHierarchy] = getContour()
  // 轮廓层次结构Mat对象不需要，销毁以释放WASM内存
  metHierarchy.delete()
  // 过滤轮廓点，去掉明显的杂点
  const contourPointAoa = filterContourPoints(metVectorContours)
  // 轮廓点集合MetVoctor对象用过了，不需要了，销毁以释放WASM内存
  metVectorContours.delete()
  // 拟合得到椭圆（会把椭圆数据赋值给全局对象）
  getEllipse(contourPointAoa)
  // 绘制椭圆
  drawEllipse()
  // 进入步骤4
  taskToStep4()
  // 关闭加载框
  my.loading(false)
} catch (error) {
  // 关闭加载框
  my.loading(false)
  // 报错处理
  my.error("onDetermineContour()报错：", error, errorDialog)
}}

/**
 * 过滤轮廓点，滤去明显有问题的轮廓点
 * @param { import("@techstark/opencv-js").MatVector } metVectorContours 轮廓点的MatVector对象
 * @returns { [Number, Number][] } 轮廓点AOA数组[x, y][]
 * 从metVectorContours中遍历读取轮廓点，过滤掉1%边框位置的点，剩下的点进行下一步椭圆轮廓迭代。
 */
function filterContourPoints(metVectorContours) {
  /** 过滤线阈值，1%切边 @const { Number } */
  const CANVAS_EDGE_PERCENTAGE = 0.01
  // 接参数
  const { colLine, rect } = contactAngleObj
  const canvas = canvasRef.value
  // 声明一个数组用来接所有轮廓点，即集合P(0)
  const contourPointAoa = []
  // 如果指定了过滤线，宽按过滤线来；否则按canvas宽来
  const canvasWidthMin = colLine.left || Math.ceil(canvas.width * CANVAS_EDGE_PERCENTAGE)
  const canvasHeightMin = Math.ceil(canvas.height * CANVAS_EDGE_PERCENTAGE)
  const canvasWidthMax = colLine.right || Math.floor(canvas.width * (1 - CANVAS_EDGE_PERCENTAGE))
  const canvasHeightMax = Math.floor(canvas.height * (1 - CANVAS_EDGE_PERCENTAGE))
  // 接遮罩框：这里是删除区，所以无值的时候，取值和过滤区要反过来
  const canvasMaskWidthMin = rect.xMin || canvasWidthMax
  const canvasMaskHeightMin = rect.yMin || canvasHeightMax
  const canvasMaskWidthMax = rect.xMax || canvasWidthMin
  const canvasMaskHeightMax = rect.yMax || canvasHeightMin
  // 遍历所有轮廓点
  forEachContour: for (let i = 0; i < metVectorContours.size(); i++) {
    // 挨个获取轮廓
    const metContour = metVectorContours.get(i)
    // 获取坐标
    forEachContourPoint: for (let j = 0; j < metContour.rows; j++) {
      // 接X和Y坐标
      const pointX = metContour.data32S[j * 2]
      const pointY = metContour.data32S[j * 2 + 1]
      // 如果坐标点在边缘1%位置处（或过滤位置处），则忽略
      if (
        (pointX <= canvasWidthMin) || (pointY <= canvasHeightMin)
          || (pointX >= canvasWidthMax) || (pointY >= canvasHeightMax)
        ) {
        // 跳过本次循环
        continue forEachContourPoint
      // 否则，继续检查遮罩：如果不在遮罩范围内
      } else if (
        (pointX < canvasMaskWidthMin) || (pointX > canvasMaskWidthMax)
          || (pointY < canvasMaskHeightMin) || (pointY > canvasMaskHeightMax)
      ) {
        // 直接装箱
        contourPointAoa.push([pointX, pointY])
      }
    }
    // 删除轮廓释放内存
    metContour.delete()
  }
  // 报错检查：轮廓点集合P(0)数据量是否足够
  if (contourPointAoa.length <= 6) {
    // 是，则报错处理
    throw Error(lang.value.ContourFitErrorContent)
  }
  // 最后，返回轮廓点集合P(0)
  return contourPointAoa
}

/**
 * 获取椭圆 - 迭代拟合获得椭圆数据
 * @param { Number[][] } contourPointAoa 椭圆轮廓点的AOA二维数组（x、y坐标为内维）
 * @note 会将ellipseObj、ellipseR2、baselinePoint写入全局对象
 * toleranceValue，容差，[点对拟合圆心的半径r/拟合最近点半径]超过（大于或小于）该阈值，
 *     则将该点排除进“阴性点集”。
 * @HyperParam TOLERANCE_VALUE_INIT，初始容差。
 * @HyperParam TOLERANCE_VALUE_MIN，迭代筛选时候的最小容差。
 * @HyperParam NP_TO_PP_THRESHOLD，阴性点转阳性点的阈值叠加因子，即“复活赛”的难度。
 *     阴性点集的偏离考核需要在容差值的基础上乘以该因子（即容差更小了），符合则复活。
 * @HyperParam ITERATION_WEIGHT，每次迭代的加权因子。
 * @HyperParam R2_THRESHOLD，R²的收敛阈值。
 * @HyperParam ITERATION_COUNT_MAX，最大迭代次数。
 * 算法说明：
 * 1.  以初始点集P0带入椭圆方程，拟合得到椭圆方程F0。
 * 2.  把P0所有点带入椭圆方程F0，并计算R²；
 *     计算每个点到椭圆的距离r；并以F0的拟合圆心为参照，计算该角度（方向）下椭圆半径r'；
 *     以当前容差值（toleranceValue），筛选出容差内的“阳性点集”PP0，和超容差的“阴性点集”NP0。
 * 3.  以“阳性点集”PP0拟合椭圆方程F1，并计算R²；
 *     计算每个点到椭圆的距离r；并以F1的拟合圆心为参照，计算该角度（方向）下椭圆半径r'；
 *     以当前容差值，筛选出容差内的“阳性-正确点集”PT1，和超出容差的“阴性点集”PF1。
 *     以当前容差值*阴性系数，筛选出阴性容差内的“阴性-正确点集”NT1，和超出阴性容差的“阴性-错误点集”NF1。
 *     “阳性-正确点集”PT1 + “阴性-错误点集”NF1 == 新的“阳性点集”PP1
 *     “阳性-错误点集”NT1 + “阴性-正确点集”NF1 == 新的“阴性点集”NP1
 * 4.  重复：“阳性-正确点集”PT1、“阴性-错误点集”NF1，其中之一继续变化。则重复步骤3。
 *     收敛：“阳性-正确点集”PT1、“阴性-错误点集”NF1不再变化。则收紧容差值，然后重复步骤3、4。
 * 5.  若迭代次数达到最大值，或R²超过阈值，或容差值收紧至最小，则停止迭代。
 * 算法细节：
 * 1.  处理轮廓点时，均以当前拟合得到的椭圆划定中心坐标系。即需平移旋转点集以得到新坐标系下的轮廓点数据。
 * 2.  每次迭代，都是以上一轮过滤得到的“阳性点集”进行拟合，并用拟合结果给上一轮的“阴性点集”一个“复活赛”机会，
 *     复活的阴性点集 + 存活的阳性点集，共同作为下一轮的拟合点集。
 * 3.  每次迭代稳定后，即阳性点集、阴性点集均不再变化，则收紧容差值，并重复迭代。
 * 4.  所以相当于有2层迭代。外层是容差值收紧；内层则是阳性/阴性点集的迭代。
 */
function getEllipse(contourPointAoa) {
  // --------设置参数--------
  /** 迭代筛选时候的初始容差 @type { Number } */
  const TOLERANCE_VALUE_INIT = 0.2
  /** 迭代筛选时候的最小容差 @type { Number } */
  const TOLERANCE_VALUE_MIN = 0.001
  /** 阴性点转阳性点的阈值叠加因子，即增加难度 @type { Number } */
  const NP_TO_PP_THRESHOLD = 0.7
  /** 每次迭代的加权因子 @type { Number } */
  const ITERATION_WEIGHT = 0.7
  /** R²的收敛阈值 @type { Number } */
  const R2_THRESHOLD = 0.99
  /** 最大迭代次数 @type { Number } */
  const ITERATION_COUNT_MAX = 100
  // --------计算--------
  // 接参数
  const { cv } = contactAngleObj
  // 从起始值开始接一个迭代筛选时候的容差，也就是阳性点转阴性点的阈值，
  let toleranceValue = TOLERANCE_VALUE_INIT
  // 接阳性点数组、阴性点数组
  const positivePointAoa = contourPointAoa
  const negativePointAoa = []
  // 迭代所得的R²值
  let R2 = null
  // 迭代收敛指针
  let isConverge = false
  // 迭代次数指针
  let iterationCount = 0
  // 椭圆对象
  let ellipse = {}
  // 基线参考点
  let baselinePoint = [0, 0]
  // 迭代：拟合不收敛 且 迭代次数不超过最大迭代次数时执行
  // 迭代需要做的事情：
  // 1.  用positivePointAoa计算得到椭圆方程
  // 2.  根据椭圆方程，筛选出新的positivePointAoa和negativePointAoa
  // 3.  判断是否收敛
  contourPointIterate: while (!isConverge && (iterationCount < ITERATION_COUNT_MAX)) {
    // 开始迭代，迭代次数+1
    iterationCount = iterationCount + 1
    // OpenCV工厂方法，把轮廓坐标点positivePointAoa转为轮廓Mat对象
    const metContourPoints = new cv.matFromArray(
      // rows，行数：双通道，所以行数就是[x, y]作为一个Point的行数
      positivePointAoa.length,
      // cols，列数：1列，即一个Point维度
      1,
      // type，数据类型：CV_32SC2，即32位有符号整数，但是有2个通道（x，y）
      cv.CV_32SC2,
      // array，用于创建Mat对象的数组，即把轮廓坐标点的AOA数组扁平化后传进去
      positivePointAoa.flat(),
    )
    // 获得椭圆对象
    ellipse = cv.fitEllipseAMS(metContourPoints)
    // 删除metContourPoints释放WASM内存
    metContourPoints.delete()
    // 处理椭圆方程，得到新的positivePointAoa和negativePointAoa
    // 新的阳-对、阳-错、阴-对、阴-错数组
    const PTPointAoa = []
    const PFPointAoa = []
    const NTPointAoa = []
    const NFPointAoa = []
    // 声明一个接收统计参数的数组
    const statisticDataArr = []
    let statisticPointRSum = 0
    // 接长轴w、短轴h、以及两者平方乘积/4，以简化后面r的计算公式
    const ellipseW = ellipse.size.width
    const ellipseH = ellipse.size.height
    const ellipseHalfHWSquare = (ellipseW ** 2) * (ellipseH ** 2) / 4
    // 接椭圆中心点坐标
    const ellipseCenterX = ellipse.center.x
    const ellipseCenterY = ellipse.center.y
    // 接椭圆旋转角
    // 轮廓坐标点迁移到标准椭圆坐标系下的话，应该是反过来旋转，也就是逆时针旋转
    const ellipseAngle = - ellipse.angle
    // canvas的椭圆旋转角是顺时针为正的，同时Y向下为正，那么数学公式应该刚好对称可用
    const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
    const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
    // 用椭圆方程来筛选点（阳性）
    // 阳性点的筛选条件
    const maxPosttiveTolerance = 1 + toleranceValue
    const minPosttiveTolerance = 1 - toleranceValue
    /**
     * 内部函数：筛选点
     * 会根据椭圆参数，调整点的相对坐标。然后再筛选
     * @note ellipsePointIterate()内部变量很多，所以这里用到了内部函数来实现一层闭包
     * @param { Number[] } param1 [pointX, pointY] X和Y坐标值
     * @param { Number[][] } PPointAoa 阳性点集
     * @param { Number[][] } NPointAoa 阴性点集
     * @param { Number } minTolerance 最小容差
     * @param { Number } maxTolerance 最大容差
     * @returns { Number[] } [pointR, ellipseR] 返回点半径和椭圆半径
     */
    function pointFilter([pointX, pointY], PPointAoa, NPointAoa, minTolerance, maxTolerance) {
      // 接X和Y坐标值
      // const pointX = positivePointAoa[i][0]
      // const pointY = positivePointAoa[i][1]
      // 去中心化
      const pointXCentered = pointX - ellipseCenterX
      const pointYCentered = pointY - ellipseCenterY
      // 旋转迁移，完成化归
      // x' = xcosθ - ysinθ
      // y' = xsinθ + ycosθ
      const pointXNormalized = pointXCentered * ellipseAngleCos - pointYCentered * ellipseAngleSin
      const pointYNormalized = pointXCentered * ellipseAngleSin + pointYCentered * ellipseAngleCos
      // 计算点的半径
      const pointR = Math.sqrt(pointXNormalized ** 2 + pointYNormalized ** 2)
      // 计算角度（弧度单位）
      const pointRad = Math.atan2(pointYNormalized, pointXNormalized)
      // 通过角度（弧度单位）计算距离椭圆最近的相关点的r
      // r²·{[(cosθ)/(w/2)]²+[(sinθ)/(h/2)]²} = 1
      // => r² = (w² · h² / 4) / [(h · cosθ)² + (w · sinθ)²]
      const ellipseRSquare = ellipseHalfHWSquare /
        (((ellipseH * Math.cos(pointRad)) ** 2) + ((ellipseW * Math.sin(pointRad)) ** 2))
      // 计算椭圆在该方向的半径：r = r² ** 0.5
      const ellipseR = ellipseRSquare ** 0.5
      // 筛选点
      if ((pointR < ellipseR * minTolerance) || (pointR > ellipseR * maxTolerance)) {
        // 不好的点，把初始坐标数据丢进阴性点集
        NPointAoa.push([pointX, pointY])
      } else {
        // 好的点，把初始坐标数据丢进阳性点集
        PPointAoa.push([pointX, pointY])
        // 基线参考点：取y值更大的点（也就是更低的点）
        if (baselinePoint[1] < pointY) {
          baselinePoint = [pointX, pointY]
        }
      }
      // 返回点半径和椭圆半径
      return [pointR, ellipseR]
    }
    // 遍历所有旧的阳性轮廓点
    forEachPositivePoint: for (let i = 0; i < positivePointAoa.length; i++) {
      // 筛选点。对阳性点集来说，阳性点集当中的阳性 == PT，阳性点集当中的阴性 == PF
      const [newPointR, ellipseR] = pointFilter(positivePointAoa[i],
        PTPointAoa, PFPointAoa, minPosttiveTolerance, maxPosttiveTolerance)
      // 把用于统计计算椭圆拟合R²的数值装箱
      statisticDataArr.push([newPointR, ellipseR])
      statisticPointRSum = statisticPointRSum + newPointR
    }
    // 用椭圆方程来筛选点（阴性）
    // 阴性点的筛选条件
    const maxNegativeTolerance = 1 + toleranceValue * NP_TO_PP_THRESHOLD
    const minNegativeTolerance = 1 - toleranceValue * NP_TO_PP_THRESHOLD
    // 遍历所有旧的阴性轮廓点
    // 其实和上面的操作几乎完全相同，只有最后2步不同
    forEachNegativePoint: for (let i = 0; i < negativePointAoa.length; i++) {
      // 筛选点。对阴性点集来说，阴性点集中的阳性 == NF，阴性点集中的阴性 == NT
      // 阴性点不需要统计计算，就不需要返回值了
      pointFilter(negativePointAoa[i],
        NFPointAoa, NTPointAoa, minNegativeTolerance, maxNegativeTolerance)
    }
    // 处理统计数据，获得R²。算法为：
    // R² = 1 - SSE / SST = SSR / SST
    //    = 1 - 平方和[(r拟合值 - r个体值)²] / 平方和[(r个体值 - r均值)²]
    //    = 平方和[(r拟合值 - r均值)²] / 平方和[(r个体值 - r均值)²]
    // 获取数据样本数量、r均值、声明SSR、SST
    const pointLength = statisticDataArr.length
    const pointRAve = statisticPointRSum / pointLength
    let SSR = 0
    let SST = 0
    // 遍历以计算SSR和SST
    for (let i = 0; i < pointLength; i++) {
      // 接newPointR, ellipseR
      const newPointR = statisticDataArr[i][0]
      const ellipseR = statisticDataArr[i][1]
      // SSR
      SSR = SSR + ((ellipseR - pointRAve) ** 2)
      // SST
      SST = SST + ((newPointR - pointRAve) ** 2)
    }
    // 更新R²
    R2 = SSR / SST
    // 看一看当前条件下的迭代是否收敛，即看看错误的数组是否为空
    if ((PFPointAoa.length === 0) && (NFPointAoa.length === 0)) {
      // 如果当前收敛了，就再看看R²是否满足要求，筛选容差还能不能再降
      if ((R2 >= R2_THRESHOLD) || (toleranceValue < TOLERANCE_VALUE_MIN)) {
        // 如果R²达到0.99，或者筛选容差没有下降空间了
        isConverge = true
      // 如果R²不到0.99，同时筛选容差还有下降空间
      } else {
        // 那就上强度
        toleranceValue = toleranceValue * ITERATION_WEIGHT
      }
    // 如果当前没收敛
    } else {
      // 更新阳性、阴性点数组
      positivePointAoa.length = 0
      positivePointAoa.push(...PTPointAoa, ...NFPointAoa)
      negativePointAoa.length = 0
      negativePointAoa.push(...PFPointAoa, ...NTPointAoa)
    }
    // 如果当前迭代没收敛，但是positivePointAoa数组长度小于等于5了，那么还是得强行收敛，否则报错
    if ((isConverge === false) && (positivePointAoa.length <= 5)) {
      // 强行收敛
      isConverge = true
      // 弹窗通知
      my.dialog(lang.value.ContourFitIterationErrorContent)
    }
  }
  // 迭代完毕，把最后一次的R²、椭圆参数返回给全局对象
  contactAngleObj.ellipseR2 = R2
  contactAngleObj.ellipseObj = ellipse
  contactAngleObj.baselinePoint = baselinePoint
}

/**
 * 绘制椭圆
 */
function drawEllipse() {
  // 接参数
  const { cv, matGray, canvasScaling, ctx, ellipseObj } = contactAngleObj
  const canvas = canvasRef.value
  // 拷贝一个灰度图的原画布Mat对象，用于绘制轮廓
  const matEllipseHandle = new cv.Mat()
  matGray.copyTo(matEllipseHandle)
  // 定义椭圆的颜色为白色（8位图，255即为白色）
  const ellipseColor = new cv.Scalar(255, 255, 255)
  // 轮廓粗细
  const ellipseThickness = 2 * canvasScaling
  // 凑个新的椭圆axes，因为椭圆绘制方法传参需要椭圆主轴尺寸一半的axes
  const ellipseAxes = new cv.Size(
    // width
    ellipseObj.size.width * 0.5,
    // height
    ellipseObj.size.height * 0.5
  )
  // 绘制一个椭圆Mat对象
  cv.ellipse(
    // img：Mat对象
    matEllipseHandle,
    // center：椭圆中心点坐标
    ellipseObj.center,
    // axes：主轴尺寸的一半
    ellipseAxes,
    // angle：椭圆旋转角度（以度为单位）
    ellipseObj.angle,
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
  // 渲染椭圆Mat对象到画布上（该步骤操作后要恢复ctx设置）
  cv.imshow(canvas, matEllipseHandle)
  // 绘制完毕，销毁Mat对象以释放WASM内存
  matEllipseHandle.delete()
  // 恢复ctx设置
  ctxSetting()
  // 把canvas的原图保存好，以方便恢复
  contactAngleObj.imageData = ctx.getImageData(
    0, 0, canvas.width, canvas.height
  )
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
 *       0.1  初始化截距Ref数据
 *       0.2  状态机切换到4
 *       0.3  下个DOM周期：绘制基线
 *   1.  initialBaseline - 初始化基线截距的值，并刷新滑块Ref
 *   2.  drawBaseline - 绘制基线方法
 *       2.1  drawBaselineThrottled - 绘制基线方法的节流方法
 *   3.  refreshBaselineSlider - 刷新滑块数据的方法
 *   4.  chooseBaselineCoarse - 粗调基线的方法（点击canvas）
 *   5.  onBackToStep3 - 返回步骤3的方法
 *   *.  onDetermineBaseline - 确定基线的方法。这是步骤5的方法，不过也算是步骤4的结束方法
 *       *.1  calculateContactAngle - 计算接触角的方法
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
  nextTick(drawBaseline).catch((error) => {
    my.error("taskToStep4().nextTick()报错：", error, errorDialog)
  })
}

/**
 * 初始化基线截距的值
 * 会读取椭圆角度、有效轮廓最低点坐标、canvas宽高
 * 以椭圆旋转的角度的tan值来得到初始化的截距
 * 这一截距是视椭圆为“正”的
 */
function initialBaseline() {
  // 接参数
  const { ellipseObj, baselinePoint } = contactAngleObj
  const canvas = canvasRef.value
  // 拟合得到的椭圆一般来说是“正”的
  // 也就是接近90°的倍数，比如263°、92°等。不会出现极端“歪”的情况，如45°这样
  // 可以先对90°取余，余下的数如果小于45°（92°的情况），则直接用余数
  // 如果余下的数大于45°（263°的情况），则再减90°
  // 取余
  const angleRemainder = ellipseObj.angle % 90
  // 确定基线角度
  const baselineAngle = (angleRemainder <= 45) ? angleRemainder : (angleRemainder - 90)
  // 确定基线截距
  const baselineIntercept = Math.tan(baselineAngle * Math.PI / 180)
  // 构建了一个方程：y - bp.y = baselineIntercept * (x - bp.x)
  // 把x = 0，x = canvasWidth代入，得到2个y值，即为截距
  const leftIntercept = baselineIntercept * (0 - baselinePoint[0]) + baselinePoint[1]
  const rightIntercept = baselineIntercept * (canvas.width - baselinePoint[0]) + baselinePoint[1]
  // 转为用户视角的截距
  const userLeftIntercept = canvas.height - leftIntercept
  const userRightIntercept = canvas.height - rightIntercept
  // 根据赋值刷新滑块（这一步不能触发绘图，因为务必确保此时滑轨组件没加载）
  refreshBaselineSlider([userLeftIntercept, userRightIntercept])
}

/**
 * 步骤4里绘制基线的具体方法
 */
function drawBaseline() {
  // 接参数
  const { ctx, imageData } = contactAngleObj
  const [[leftIntercept], [rightIntercept]] = interceptNumAoaRef.value
  const canvas = canvasRef.value
  // 计算真正的截距（canvas视角的y值）
  const realLeftY = canvas.height - leftIntercept
  const realRightY = canvas.height - rightIntercept
  // 先对选框进行初始化
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
 * @param { [Number, Number] } 左截距和右截距数据
 * @note 会触发绘制基线截距
 */
function refreshBaselineSlider([leftInterceptRaw, rightInterceptRaw]) {
  // 接参数
  const canvas = canvasRef.value
  // 把截距取整
  const leftIntercept = Math.round(leftInterceptRaw)
  const rightIntercept = Math.round(rightInterceptRaw)
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
  const interceptNumArr = [
    // 左截距：当前值、下限、上限、mark标记
    [
      leftIntercept, leftParamMin, (leftParamMin + (delta * 6)),
      [
        leftParamMin, (leftParamMin + (delta * 2)),
        (leftParamMin + (delta * 4)), (leftParamMin + (delta * 6))
      ]
    ],
    // 右截距：当前值、下限、上限、mark标记
    [
      rightIntercept, rightParamMin, (rightParamMin + (delta * 6)),
      [
        rightParamMin, (rightParamMin + (delta * 2)),
        (rightParamMin + (delta * 4)), (rightParamMin + (delta * 6))
      ]
    ]
  ]
  // 赋值（这一步会触发绘图）
  interceptNumAoaRef.value = interceptNumArr
}

/**
 * 截距粗调的具体实现方法
 * 把canvas分成3个区域：左区（0.35）、中区（0.30）、右区（0.35）。
 * 中区则直接升降基线；左区和右区则升降各自部分的截距。
 * 这里以用户视角来设置截距值，所以要用canvas.height - realElementY
 * @note 会触发绘制基线截距
 */
function chooseBaselineCoarse() {
  // 接参数
  const { canvasScaling } = contactAngleObj
  const canvas = canvasRef.value
  const [[leftIntercept], [rightIntercept]] = interceptNumAoaRef.value
  // 点击位置的实际X、Y坐标：canvas视角
  const realElementX = elementX.value * canvasScaling
  const realElementY = elementY.value * canvasScaling
  // 转为用户视角Y坐标（X坐标的用户视角和canvas视角是一致的）
  const userElementY = canvas.height - realElementY
  // 左区
  if (realElementX < (canvas.width * 0.35)) {
    // 计算新的左截距
    // (左截距 - 右截距) / (userElementY - 右截距) = canvas.width / (canvas.width - realElementX)
    // 计算公式中，没有除以0的情况，所以不用考虑bug
    const leftInterceptNew =
      canvas.width / (canvas.width - realElementX)
      * (userElementY - rightIntercept)
      + rightIntercept
    // 用左截距和右截距来刷新细调滑块（这一步会触发绘图）
    refreshBaselineSlider([leftInterceptNew, rightIntercept])
  // 右区
  } else if (realElementX > (canvas.width * 0.65)) {
    // 计算右截距
    // (右截距 - 左截距) / (userElementY - 左截距) = canvas.width / realElementX
    // 计算公式中，没有除以0的情况，所以不用考虑bug
    const rightInterceptNew =
      canvas.width / realElementX
      * (userElementY - leftIntercept)
      + leftIntercept
    // 用左截距和右截距来刷新细调滑块（这一步会触发绘图）
    refreshBaselineSlider([leftIntercept, rightInterceptNew])
  // 中区
  } else {
    // 以目前的截距来平移即可
    // 以当前x值计算截距的y值：
    // y - 左截距 = 基线斜率 * (x - 0)
    // 基线斜率 = (右截距 - 左截距) / canvas.width
    const interceptPointY = (rightIntercept - leftIntercept) / canvas.width
      * realElementX + leftIntercept
    // 计算偏移量
    const offsetY =  userElementY - interceptPointY
    // 给左截距和右截距加上偏移量
    const leftInterceptNew = leftIntercept + offsetY
    const rightInterceptNew = rightIntercept + offsetY
    // 直接拿着用户视角的Y坐标来刷新细调滑块（这一步会触发绘图）
    refreshBaselineSlider([leftInterceptNew, rightInterceptNew])
  }
}

/**
 * 步骤4里返回上一步的事件回调钩子
 */
function onBackToStep3() { try {
  // 直接返回上一步即可
  // 不能初始化上一步，如果初始化的话，已有轮廓数据的暂存参数设置就会丢失
  taskStatusRef.value = 3
  // 下一个DOM周期：用轮廓查找方法刷新一次轮廓渲染
  nextTick(chooseContour).catch((error) => {
    my.error("onBackToStep3().nextTick()报错：", error, errorDialog)
  })
} catch (error) {
  my.error("onBackToStep3()报错：", error, errorDialog)
}}

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
 *   1.  onDetermineBaseline - 确定基线，即开始计算接触角
 *   2.  calculateContactAngle - 计算接触角
 *   3.  onDeleteUniResult - 删除单个接触角结果
 *   4.  onClearUniResult - 清空所有接触角结果
 *   5.  onDownloadResult - 下载数据
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
 */
function onDetermineBaseline() { try {
  // 计算接触角
  const contactAngle = calculateContactAngle()
  // 发个通知
  my.dialog(
    lang.value.ResultDialogContent[0]
      + contactAngle.toFixed(2)
      + lang.value.ResultDialogContent[1],
  )
} catch (error) {
  my.error("onDetermineBaseline()报错：", error, errorDialog)
}}

/**
 * 计算接触角
 * @note 会读取contactAngleObj.ellipseObj椭圆对象，interceptNumArrRef截距值，canvasRef画布对象的宽度值
 * 步骤：
 * 1.  把椭圆的2个截距点化归到以标准椭圆为坐标系的坐标内
 * 2.  以2个截距点坐标求解一个 y = ax + b 的方程
 * 3.  y = ax + b 的 y ~ x 关系方程，变换为 r ~ θ 关系的方程
 *     y = r·sinθ；x = r·cosθ
 * 4.  椭圆方程：r²·{[(cosθ)/(w/2)]²+[(sinθ)/(h/2)]²} = 1
 * 5.  解3和4的方程，得到θ（应该有2个解）
 * 6.  由θ得到两边的切线斜率
 *     斜率 = - (1 / tanθ) · (h / w)²
 * 7.  计算两切线斜率和基线截距之间的夹角，即为接触角
 */
function calculateContactAngle() {
  /** 接椭圆对象 @type { import("@techstark/opencv-js").RotatedRect } */
  const ellipse = contactAngleObj.ellipseObj
  // 接canvas
  const canvas = canvasRef.value
  // 接截距值
  const [[leftIntercept], [rightIntercept]] = interceptNumAoaRef.value
  // 先把2个截距点化归到以标准椭圆为坐标系的坐标内
  // 接椭圆中心点坐标
  const ellipseCenterX = ellipse.center.x
  const ellipseCenterY = ellipse.center.y
  // 轮廓坐标点迁移到标准椭圆坐标系下的话，应该是反过来旋转，也就是逆时针旋转
  const ellipseAngle = - ellipse.angle
  // canvas的椭圆旋转角是顺时针为正的，同时Y向下为正，那么数学公式应该刚好对称可用
  const ellipseAngleSin = Math.sin(ellipseAngle * Math.PI / 180)
  const ellipseAngleCos = Math.cos(ellipseAngle * Math.PI / 180)
  // 接截距点坐标
  const interceptPoint1X = 0
  const interceptPoint1Y = canvas.height - leftIntercept
  const interceptPoint2X = canvas.width
  const interceptPoint2Y = canvas.height - rightIntercept
  // 计算一个截距角度。网页以下方为正，所以这里要取反
  const interceptAngle = Math.atan2(
    interceptPoint2Y - interceptPoint1Y,
    interceptPoint2X - interceptPoint1X
  ) * 180 / Math.PI * -1
  // 去中心化
  const interceptPoint1XCentered = interceptPoint1X - ellipseCenterX
  const interceptPoint1YCentered = interceptPoint1Y - ellipseCenterY
  const interceptPoint2XCentered = interceptPoint2X - ellipseCenterX
  const interceptPoint2YCentered = interceptPoint2Y - ellipseCenterY
  // 旋转迁移：
  // x' = x·cosθ - y·sinθ
  // y' = x·sinθ + y·cosθ
  const newInterceptPoint1X = interceptPoint1XCentered * ellipseAngleCos - interceptPoint1YCentered * ellipseAngleSin
  const newInterceptPoint1Y = interceptPoint1XCentered * ellipseAngleSin + interceptPoint1YCentered * ellipseAngleCos
  const newInterceptPoint2X = interceptPoint2XCentered * ellipseAngleCos - interceptPoint2YCentered * ellipseAngleSin
  const newInterceptPoint2Y = interceptPoint2XCentered * ellipseAngleSin + interceptPoint2YCentered * ellipseAngleCos
  // 解方程计算θ
  // 基线截距的方程形式：(y - p1y) / (x - p1x) = (p2y - p1y) / (p2x - p1x)
  // 防止分母为0，则更安全的写法为：(y - p1y) · (p2x - p1x) = (p2y - p1y) · (x - p1x)
  // 令：kx = p2x - p1x；ky = p2y - p1y，则：
  // kx · (y - p1y) = ky · (x - p1x)
  // 又有：x = r · cosθ，y = r · sinθ，则有：
  // kx · (r · sinθ - p1y) = ky · (r · cosθ - p1x)
  // 化简得式①：r · (kx · sinθ - ky · cosθ) = (kx · p1y - ky · p1x)
  // 而椭圆自身方程式②： 4 · r² · [(cosθ / w)² + (sinθ / h)²] = 1
  // r必不为0，则①、②两式联立消除r，然后把sinθ、cosθ合并为cotθ，得：
  // (这里需要考虑θ为0°的情况)
  // 在一个 a · cot²θ + b · cotθ + c = 0 的二次方程中：
  //   a = (p2y - p1y)² - 4 · (p2x · p1y - p1x · p2y)² / w²
  //   b = - 2 · (p2x - p1x) · (p2y - p1y)
  //   c = (p2x - p1x)² - 4 · (p2x · p1y - p1x · p2y)² / h²
  // 这里面，(p2x - p1x)、(p2y - p1y)、(p2x · p1y - p1x · p2y)²都是可复用的
  // 令：
  //   kx = p2x - p1x；
  //   ky = p2y - p1y；
  //   kmix = p2x · p1y - p1x · p2y；
  // 则有：
  //   a = ky² - (2 · kmix / w)²
  //   b = - 2 · kx · ky
  //   c = kx² - (2 · kmix / h)²
  // 接参数，现在要尽可能简化参数名称
  const w = ellipse.size.width
  const h = ellipse.size.height
  const kx = newInterceptPoint2X - newInterceptPoint1X
  const ky = newInterceptPoint2Y - newInterceptPoint1Y
  const kmix = newInterceptPoint2X * newInterceptPoint1Y - newInterceptPoint1X * newInterceptPoint2Y
  const a = (ky ** 2) - ((2 * kmix / w) ** 2)
  const b = - 2 * kx * ky
  const c = (kx ** 2) - ((2 * kmix / h) ** 2)
  // 然后开始解方程
  // 对于 ax² + bx + c = 0 的二次方程：
  // 判别式：Δ = delta = b² - 4ac
  // 求根公式：(-b ± sqrt(delta)) / 2a
  const delta = b ** 2 - (4 * a * c)
  // 如果判别式小于0，则方程无解；等于0，有1个解，都不行
  if (delta <= 0) {
    // 报错
    console.log("方程没有2个解，delta: ", delta)
    my.message({
      type: "error",
      content: lang.value.ContactErrorMessageContent,
      duration: 10000
    })
    throw Error("方程没有2个解")
  // 如果判别式大于0，则方程有2个解
  } else {
    // 获取cot(θ)的2个解
    const cot1 = (- b + Math.sqrt(delta)) / (2 * a)
    const cot2 = (- b - Math.sqrt(delta)) / (2 * a)
    // 计算切线斜率
    // 切线斜率 = - (1 / tanθ) · (h / w)² = - cotθ · (h / w)²
    const slope1 = - cot1 * ((h / w) ** 2)
    const slope2 = - cot2 * ((h / w) ** 2)
    // 基线斜率
    const baselineSlope = ky / kx
    // 基线及切线角度
    const angleTangent1 = Math.atan(slope1) * 180 / Math.PI
    const angleTangent2 = Math.atan(slope2) * 180 / Math.PI
    const angleBaseline = Math.atan(baselineSlope) * 180 / Math.PI
    // 转回原来的坐标系
    // Math.atan()方法返回[-90°, 90°]的弧度值，叠加ellipseAngle后，结果会超过阈值
    // 所以需通过增减180，让结果在[-90°, 90°]之间
    let oldAngleTangent1 = (angleTangent1 - ellipseAngle) % 180
    if (oldAngleTangent1 > 90) {
      oldAngleTangent1 = oldAngleTangent1 - 180
    } else if (oldAngleTangent1 <= -90) {
      oldAngleTangent1 = oldAngleTangent1 + 180
    }
    let oldAngleTangent2 = (angleTangent2 - ellipseAngle) % 180
    if (oldAngleTangent2 > 90) {
      oldAngleTangent2 = oldAngleTangent2 - 180
    } else if (oldAngleTangent2 <= -90) {
      oldAngleTangent2 = oldAngleTangent2 + 180
    }
    let oldAngleBaseline = (angleBaseline - ellipseAngle) % 180
    if (oldAngleBaseline > 90) {
      oldAngleBaseline = oldAngleBaseline - 180
    } else if (oldAngleBaseline <= -90) {
      oldAngleBaseline = oldAngleBaseline + 180
    }
    // 判断接触角是否为钝角
    // 以原始基线而言，其x = 椭圆圆心x时，y是在椭圆圆心上方还是下方？
    // 如果y在椭圆圆心上方（y小于椭圆圆心），则接触角小于90°；
    // 如果y在椭圆圆心下方（y小大于椭圆圆心），则接触角大于90°
    // 基线-圆心计算y
    const baselineEllipseCenterY =
      (interceptPoint2Y - interceptPoint1Y) / interceptPoint2X * ellipseCenterX
        + interceptPoint1Y
    // 用迁移量来判断是否为钝角
    const isContactAngleObtuse = (baselineEllipseCenterY > ellipseCenterY) ? true : false
    // 目前不出意外，基线角度很小。会有一个切线大于90°，一个切线小于90°。需要判断情况：
    // 对于接触角小于90°的情况：
    //   左侧切线角度为负，右侧切线角度为正。
    //   更严谨的说，左侧切线角 < 右侧切线角，未必分正负
    //   左接触角 =  - (左侧切线角度(负) - 基线角度)
    //   右接触角 =  + (右侧切线角度(正) - 基线角度)
    // 对于接触角大于90°的情况：
    //   左侧切线角度为正，右侧切线角度为负：
    //   更严谨的说，左侧切线角 > 右侧切线角，未必分正负
    //   左接触角 = 180 - (左侧切线角度(正) - 基线角度)
    //   右接触角 = 180 - (- (右侧切线角度(负) - 基线角度)) = 180 + (右侧切线角度(负) - 基线角度)
    // 事实上，存在同正同负的情况。
    // 下面开始判断
    let contactAngleLeft
    let contactAngleRight
    // 如果不是钝角
    if (!isContactAngleObtuse) {
      // 以正负大小判断左右：小的是左侧的
      if (oldAngleTangent1 > oldAngleTangent2) {
        // 1 > 2 => 左-2，右-1
        contactAngleLeft = - (oldAngleTangent2 - oldAngleBaseline)
        contactAngleRight = oldAngleTangent1 - oldAngleBaseline
      } else {
        // 2 > 1 => 左-1，右-2
        contactAngleLeft = - (oldAngleTangent1 - oldAngleBaseline)
        contactAngleRight = oldAngleTangent2 - oldAngleBaseline
      }
    // 如果是钝角
    } else {
      // 以正负大小判断左右：小的是右侧的
      if (oldAngleTangent1 > oldAngleTangent2) {
        // 1 > 2 => 左-1，右-2
        contactAngleLeft = 180 - (oldAngleTangent1 - oldAngleBaseline)
        contactAngleRight = 180 + (oldAngleTangent2 - oldAngleBaseline)
      } else {
        // 1 < 2 => 左-2，右-1
        contactAngleLeft = 180 - (oldAngleTangent2 - oldAngleBaseline)
        contactAngleRight = 180 + (oldAngleTangent1 - oldAngleBaseline)
      }
    }
    // 把最终结果修正为(0 ~ 180)的值
    // 在近乎钝角（1个是钝角，1个是锐角）的情况下，会出现接触角为负数的情况，需要修正
    if (contactAngleLeft < 0) {
      contactAngleLeft = contactAngleLeft + 180
    }
    if (contactAngleRight < 0) {
      contactAngleRight = contactAngleRight + 180
    }
    // 可能出现的大于180°的情况(目前还没发现过该bug)
    if (contactAngleLeft > 180) {
      contactAngleLeft = contactAngleLeft - 180
    }
    if (contactAngleRight > 180) {
      contactAngleRight = contactAngleRight - 180
    }
    // 接触角均值
    const contactAngleAverage = (contactAngleLeft + contactAngleRight) / 2
    // 误差/偏差
    const contactAngleDeviation = Math.abs(contactAngleLeft - contactAngleRight)
    // 返回结果给全局对象
    resultRef.value.push([
      // 文件名
      contactAngleObj.filename,
      // 接触角 (°)
      contactAngleAverage,
      // 误差/偏差 (°)
      contactAngleDeviation,
      // 左接触角 (°)
      contactAngleLeft,
      // 右接触角 (°)
      contactAngleRight,
      // 基线角度 (°)
      interceptAngle,
      // 椭圆拟合R²
      contactAngleObj.ellipseR2
    ])
    // 把结果存进本地存储localStorage
    localStorage.setItem("contactAngleResult", JSON.stringify(resultRef.value))
    // 返回接触角均值结果
    return contactAngleAverage
  }
}

/**
 * 删除单个数据结果
 * @param { Number } resultsIndex 结果的索引
 */
function onDeleteUniResult(resultsIndex) { try {
  // 接参数
  const result = resultRef.value
  // 弹出确认框
  my.dialog({
    // 主题：警示
    theme: "danger",
    // 通知内容
    body: lang.value.DeleteUniResultDialogContent,
    // 确认按钮的文本
    confirmBtn: lang.value.DeleteResultDialogConfirmBtnLabel,
    // 取消按钮的文本
    cancelBtn: lang.value.DeleteResultDialogCancelBtnLabel,
    // 确认后的回调
    onConfirmCallBack: () => {
      // 删除result的对应项
      result.splice(resultsIndex, 1)
      // 更新localStorage
      localStorage.setItem("contactAngleResult", JSON.stringify(result))
      // 提示用户
      my.message(lang.value.DeleteUniResultMessageContent)
    }
  })
} catch (error) {
  my.error("onDeleteUniResult()报错：", error, errorDialog)
}}

/**
 * 删除全部数据结果
 */
function onDeleteAllResult() { try {
  // 接参数
  const result = resultRef.value
  // 弹出确认框
  my.dialog({
    // 主题：警示
    theme: "danger",
    // 通知内容
    body: lang.value.DeleteAllResultDialogContent,
    // 确认按钮的文本
    confirmBtn: lang.value.DeleteResultDialogConfirmBtnLabel,
    // 取消按钮的文本
    cancelBtn: lang.value.DeleteResultDialogCancelBtnLabel,
    // 确认后的回调
    onConfirmCallBack: () => {
      // 删除result的所以项
      result.length = 0
      // 清理localStorage
      localStorage.removeItem("contactAngleResult")
      // 提示用户
      my.message(lang.value.DeleteUniResultMessageContent)
    }
  })
} catch (error) {
  my.error("onDeleteAllResult()报错：", error, errorDialog)
}}

/**
 * 下载结果
 */
function onDownloadResult() { try {
  // 接一个AOA对象，第一个元素是表头，后面是数据
  const resultAoa = [[...lang.value.ResultTableContent]]
  // 填充数据：遍历resultRef.value
  const resultOrigin = resultRef.value
  for (let i = 0; i < resultOrigin.length; i++) {
    // 将代理对象转成普通数组
    const resultArr = [(i + 1), ...resultOrigin[i]]
    // 将结果数组推入AOA对象
    resultAoa.push(resultArr)
  }
  // 建立工作表文件的Map对象
  const resultMap = new Map()
  // 把数据结果AOA数组加进Map里
  resultMap.set(lang.value.ResultSheetLabel, resultAoa)
  // AOA数据的Map对象转成xlsx文件
  const workbook = aoaMapToWorkbook(resultMap)
  // 下载xlsx文件
  downloadXlsx(workbook, "contact-angle_data.xlsx")
  // // 对Mac系统的特别关照：如果Mac系统
  // if (window.navigator?.userAgent?.includes("Mac")) {
  //   // 提示用户手动复制表格数据
  //   my.dialog("Mac系统如遇到锁权限情况，请手动复制表格数据。")
  // }
} catch (error) {
  my.error("onDownloadResult()报错：", error, errorDialog)
}}

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
