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
      有2个算法（其实默认的Canny算法更好），调节switch开关以切换。
      每个算法都2个参数（2个滑轨），调节滑轨可实时查看轮廓效果（灰度图叠加轮廓线）。
      设置了粗调、细调的切换。可更改滑轨的范围值。
      长按canvas可清空效果。
      此步骤结束时将保存轮廓数据为坐标数组。在遍历提取轮廓数组时，会找到y坐标最小值。
      并保存叠加图的imageData对象，以便下一步使用。
  4.  寻找基线。
      在第3步叠加imageData基础上寻找基线。先以上一步得到的y坐标最小值绘制平直线。
      设置左、右调节滑轨，可微调左右截距，并实时查看基线效果。
      此步骤结束时将获得基线的截距。
  5.  计算接触角。此处不用再有交互。
 -->

<!--
  版权说明：
  使用了 Apache-2.0 许可的 @techstark/opencv-js 库
 -->

<!--
  视图层
 -->
<template><MySpace>

  <!-- 警报框 -->
  <t-alert
    theme="info" title="功能简介"
  >
    1.  点击读取图片文件。读取的图片文件将直接灰度化。<br />
    2.  裁剪图片为合适的尺寸。短按控制边框；长按清空已有选框。<br />
    3.  选择基底线、液滴边缘线。
  </t-alert>

  <!-- canvas头-步骤1 -->
  <!-- 警报框 -->
  <t-alert
    v-if="taskStatusRef === 1"
    theme="warning" title="步骤1"
  >
    首先点击“点击上传图片”读取图片。<br />
    读取到的图片会自动进行灰度化渲染。
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
    theme="warning" title="步骤2"
  >
    接下来需要将图片裁剪为合适的尺寸。<br />
    点击/触控图片，短按可控制边框；长按可清空已有选框。<br />
    可通过下方“裁剪图片”按钮多次裁剪，直到满意后，点击下方“完成裁剪”按钮进入下一步。
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
    <t-alert theme="warning" title="步骤3">
      接下来寻找液滴的最佳轮廓。<br />
      推荐Canny算法，效果更好。对于一些特殊情况的液滴照片，也可以尝试传统的阈值化算法。<br />
      调节滑轨可调整参数并查看轮廓效果；长按可清空效果。
    </t-alert>
    <!-- 边缘检测算法切换开关 -->
    <MySwitch
      @change="onContourAlgorithmSwitchChange"
      v-model="contourAlgorithmSwitchRef"
      leftLabel="Canny法"
      rightLabel="阈值化法"
    />
    <!-- 警报框 -->
    <t-alert
      v-if="contourAlgorithmSwitchRef === false"
      theme="info"
    >
      Canny算法是一种多阶段的边缘检测算法，由John F. Canny提出。其原理为计算图像中像素色阶变化的梯度及方向，得到“边缘”图案。然后通过给定的两个阈值参数以筛选出合适的轮廓。<br />
      主参数：亦称“高阈值”，所有色阶变化高于此参数的边缘，都将被认定为“轮廓”。<br />
      辅助参数：亦称“低阈值”，对于色阶变化小于“高阈值”、但与轮廓相连的边缘而言，若其色阶变化大于“低阈值”，则也将被认定为轮廓的一部分。以此确保轮廓的完整性。
    </t-alert>
    <!-- 警报框 -->
    <t-alert
      v-else
      theme="info"
    >
      阈值化是一种传统的二值化处理方法。其原理为将图像中的像素色阶值与所给定的阈值进行比较，大于阈值的像素值将被设定为“白色”，小于阈值的像素值将被设定为“黑色”。然后将黑白之间的边界线认定为轮廓。<br />
      主参数：亦称“阈值”，所有色阶值高于此参数的像素，都将被认定为“白色”。
    </t-alert>
  </mySpace>

  <!-- canvas头-步骤4 -->
  <!-- 警报框 -->
  <t-alert
    v-else-if="taskStatusRef === 4"
    theme="warning" title="步骤4"
  >
    接下来寻找固体基底与液滴接触的“基线”。<br />
    点击/触控图片以粗调基线位置；调节滑轨以细调。
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
    主要就是选框裁剪。主要交互放在canvas上了。这里只是按钮。
    onSureRect：确定选框并裁剪。
    onDetermineRect：最终确定裁剪并进入下一步。
   -->
  <div
    v-if="taskStatusRef === 2"
    class="center"
  >
    <myButton
      @click="onSureRect"
      :block="false"
    >
      裁剪图片
    </myButton>
    <myButton
      @click="onDetermineRect"
      :block="false" theme="danger"
    >
      完成裁剪
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
    <div v-if="contourAlgorithmSwitchRef === false">主参数（G色阶变化）：</div>
    <div v-else>主参数（G色阶值）：</div>
    <t-slider
      @change="onSlideChange"
      @changeEnd="onContourSlideChangeEnd"
      :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
      :min="thresholdNumArrRef[2]" :max="thresholdNumArrRef[3]" :step="1" 
      :marks="[thresholdNumArrRef[4], thresholdNumArrRef[5],
        thresholdNumArrRef[6], thresholdNumArrRef[7]]"
      v-model="thresholdNumArrRef[0]"
    /><t-divider />
    <!-- 滑轨：辅助参数 -->
    <mySpace
      v-if="contourAlgorithmSwitchRef === false"
      size="small"
    >
      <div>辅助参数（G色阶变化）：</div>
      <t-slider
        @change="onSlideChange"
        @changeEnd="onContourSlideChangeEnd"
        :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
        :min="thresholdNumArrRef[8]" :max="thresholdNumArrRef[9]" :step="1"
        :marks="[thresholdNumArrRef[10], thresholdNumArrRef[11],
          thresholdNumArrRef[12], thresholdNumArrRef[13]]"
        v-model="thresholdNumArrRef[1]"
      /><t-divider />
    </mySpace>
    <!-- 容器（按钮容器） -->
    <div class="center">
      <myButton
        @click="contourCoarseToggle"
        :block="false" :theme="isContourCoarseRef ? 'primary' : 'warning'"
      >
        {{ isContourCoarseRef ? "切换细调" : "切换粗调" }}
      </myButton>
      <myButton
        @click="onDetermineContour"
        :disabled="(thresholdNumArrRef[0] === 0)"
        :block="false" theme="danger"
      >
        确认轮廓
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
    <div>左截距（px）：</div>
    <t-slider
      :onChange="onSlideChange" :onchangeEnd="null"
      :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
      :min="interceptNumArrRef[2]" :max="interceptNumArrRef[3]" :step="1" 
      :marks="[interceptNumArrRef[4], interceptNumArrRef[5],
        interceptNumArrRef[6], interceptNumArrRef[7]]"
      v-model="interceptNumArrRef[0]"
    /><t-divider />
    <!-- 滑轨：右截距 -->
    <div>右截距（px）：</div>
    <t-slider
      :onChange="onSlideChange" :onchangeEnd="null"
      :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
      :min="interceptNumArrRef[8]" :max="interceptNumArrRef[9]" :step="1" 
      :marks="[interceptNumArrRef[10], interceptNumArrRef[11],
        interceptNumArrRef[12], interceptNumArrRef[13]]"
      v-model="interceptNumArrRef[1]"
    /><t-divider />
    <!-- 容器（按钮容器） -->
    <div class="center">
      <myButton
        @click="onBackToStep3"
        :block="false" theme="default"
      >
        返回上一步
      </myButton>
      <myButton
        @click="onDetermineBaseline"
        :disabled="(thresholdNumArrRef[0] === 0)"
        :block="false" theme="danger"
      >
        确认基线
      </myButton>
    </div>
  </mySpace>
</MySpace></template>


<!--
  逻辑层
 -->
<script setup>
// 导入VUE的各类响应式方法
import { ref, watch } from "vue"
// 导入VueUse的各类响应式方法
import { useParentElement, useMouseInElement, onLongPress, useThrottleFn } from "@vueuse/core"
// 导入自有方法
import my from "@/utils/myFunc.js"

// 一上来就要先调用加载框，防止用户操作
// 等到<canvas>元素块和OpenCV.js都加载完毕后，才能停止加载框
my.loading("正在启动OpenCV.js计算机视觉模块，请稍候...")

/**
 * 任务状态：
 * 1 - 未开始，或删除了图片。正在等待读取图片；
 * 2 - 读取到了图片。正在选框裁剪图片；
 * 3 - 完成了选框，得到了裁剪的图片。正在寻找并确定轮廓；
 * 4 - 完成了轮廓寻找，得到了液滴轮廓坐标。正在寻找基线；
 * 5 - 完成了基线寻找，得到了基线坐标。正在计算接触角。
 * @type { import("vue").Ref<Number> }
 */
const taskStatusRef = ref(1)
/** 用户上传的文件数组对象 @type { import("vue").Ref<File[]> } */
const fileArrRef = ref([])
/** 
 * 视图层的<canvas>Dom对象
 * @type { import("vue").Ref<HTMLCanvasElement> }
 * canvas加载很慢，需要等，比较好的等待方法是watch监听钩子。
 * 实测nextTick、onMounted都不如watch。
 */
const canvasRef = ref(null)
/**
 * 视图层<canvas>的父元素对象
 * @type { import("vue").Ref<HTMLCanvasElement> }
 * 用于计算<canvas>的宽度的。
 */
const canvasParentRef = useParentElement(canvasRef)
/**
 * 第三步寻找轮廓的上下限范围数组对象对象
 * @type { import("vue").Ref<Number[]> }
 * 第1、2个值分别代表主参数和辅助参数；
 * 第3、4个值分别代表主参数的上限/下限；
 * 第5、6、7、8个值分别代表主参数的mark标记；
 * 第9、10个值分别代表辅助参数的上限/下限；
 * 第11、12、13、14个值分别代表辅助参数的mark标记。
 */
const thresholdNumArrRef = ref([
  // 主参数和辅助参数
  0, 0,
  // 主参数的下限/上限
  0, 255,
  // 主参数的mark标记
  0, 85, 170, 255,
  // 辅助参数的下限/上限
  0, 255,
  // 辅助参数的mark标记
  0, 85, 170, 255
])
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
 * 第四步寻找基线的截距
 * @type { import("vue").Ref<Number[]> }
 * 第1、2个值分别为左、右截距；
 * 第3、4个值分别为左截距的下限/上限；
 * 第5、6、7、8个值分别为左截距的mark标记；
 * 第9、10个值分别为右截距的下限/上限；
 * 第11、12、13、14个值分别为右截距的mark标记。
 * @note 不能轻易赋值，因为在步骤4，一旦赋值，就会触发绘制基线等回调
 */
const interceptNumArrRef =  ref([0, 0])

/**
 * 接触角业务的全局对象
 * @typedef { Object } ContactAngle
 * @property { import("@techstark/opencv-js") } cv OpenCV.js对象
 * @property { CanvasRenderingContext2D } ctx canvas的绘图上下文对象
 * @property { Number } canvasScaling canvas元素块的缩放比例：实际/显示
 * @property { import("@techstark/opencv-js").Mat } matGray 灰度图Mat对象
 * @property { ImageData } imageDataGray 灰度图的canvas的图像数据
 * @property { Number } rectXmax canvas元素块选框的X坐标大值
 * @property { Number } rectYmax canvas元素块选框的Y坐标大值
 * @property { Number } rectXmin canvas元素块选框的X坐标小值
 * @property { Number } rectYmin canvas元素块选框的Y坐标小值
 * @property { ImageData } imageDataContour 轮廓图的canvas的图像数据
 * @property { Number[][] } contourPointAoa 轮廓点坐标数组
 * @property { Number } contourYMin 轮廓点Y坐标的最小值
 * @note canvas的实际宽高在canvasRef.value.width和canvasRef.value.height上
 * @note canvas的显示宽高在canvasRef.value.style.width和canvasRef.value.style.height上(String + "px")
 * @note canvas的显示宽最大值在canvasParentRef.value.clientWidth上
 */
/** 接触角业务的全局对象 @type { ContactAngle } */
const contactAngleObj = {
  cv: null,
  ctx: null,
  canvasScaling: 0.0,
  matGray: null,
  imageDataGray: null,
  rectXmax: null,
  rectYmax: null,
  rectXmin: null,
  rectYmin: null,
  imageDataContour: null,
  contourPointAoa: [],
  contourYMin: null,
}

/**
 * @全局监听钩子
 */

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

// 注册一个<canvas>长按的监听钩子
onLongPress(
  // 监听对象：<canvas>
  canvasRef,
  // 回调钩子
  onCanvasLongPress,
  // 配置：长按时间
  // { delay: 500 }
)

// 注册一个监听钩子，用于实现canvasRef和canvasParentRef的初始化
// 解构赋值，得到监听钩子的stop()方法，用于停止监听
const { stop: stopWatch } = watch(
  // 监听：canvasRef和canvasParentRef
  [canvasRef, canvasParentRef],
  // 回调
  (newValue) => {
    // 结构得到canvasRef和canvasParentRef的新值
    const [newCanvasRef, newCanvasParentRef] = newValue
    // 得确保新值均不为null，则完成初始化
    if (newCanvasRef && newCanvasParentRef) {
      // 停止监听
      stopWatch()
      // 同步canvas的最大宽度给canvas的【显示宽度】（即父元素的有效宽度）
      canvasRef.value.style.width = canvasParentRef.value.clientWidth + "px"
      // 第二步：导入OpenCV.js库
      const cvImportPromise = import("@techstark/opencv-js")
      // 等待OpenCV.js加载完成
      cvImportPromise.then((cvReadyPromise) => {
        // 动态导入钩子里面仍是个Promise对象，需要再then
        cvReadyPromise.default.then((cv) => {
          // 赋值给全局变量cv
          contactAngleObj.cv = cv
          // 停止加载框
          my.loading(false)
        })
      })
    }
  }
)

/**
 * 长按<canvas>触发的回调
 * 步骤2、步骤3：清空<canvas>上的标记
 */
function onCanvasLongPress(event) { try {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为2时
  if (taskStatus === 2) {
    // 清空canvas上的矩形标记数据
    canvasRectDataRemove()
    // 恢复canvas原图
    contactAngleObj.ctx.putImageData(contactAngleObj.imageDataGray, 0, 0)
  } else if (taskStatus === 3) {
    // 恢复canvas原图
    contactAngleObj.ctx.putImageData(contactAngleObj.imageDataGray, 0, 0)
  }
} catch (error) {
  console.log("onCanvasLongPress()报错：", error)
  errorDialog()
}}

/**
 * 点击<canvas>触发的回调
 * 步骤2：选框
 * 步骤4：绘制基线
 */
function onCanvasClick(event) { try {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为2时，即选框绘制阶段，则调用选框方法
  if (taskStatus === 2) {
    chooseRect()
  // 任务进度为4时，即基线绘制阶段，则调用基线粗调方法
  // 基线粗调会改变模型绑定的值，进而触发绘制基线方法
  } else if (taskStatus === 4) {
    chooseBaseline()
  }
} catch (error) {
  console.log("onCanvasClick()报错：", error)
  errorDialog()
}}

/**
 * 清空canvas上的矩形标记数据
 */
function canvasRectDataRemove() { try {
  // 清空选框的X和Y边界值
  contactAngleObj.rectXmax = null
  contactAngleObj.rectYmax = null
  contactAngleObj.rectXmin = null
  contactAngleObj.rectYmin = null
} catch (error) {
  console.log("canvasRectDataRemove()报错：", error)
  throw Error(error)
}}

/**
 * 设置canvas的绘图上下文ctx
 */
function ctxSetting() { try {
  // 红色笔迹
  contactAngleObj.ctx.strokeStyle = "red"
  // 线宽：2像素 x 缩放比例
  contactAngleObj.ctx.lineWidth = 2 * contactAngleObj.canvasScaling
} catch (error) {
  console.log("ctxSetting()报错：", error)
  throw Error(error)
}}

/**
 * 滑轨调节的事件回调钩子
 * 步骤3：基线粗调 + 细调。此步骤下，用户只能操作滑轨，因此事件全部来源于滑轨。
 * 步骤4：基线细调。此步骤下，用户点击canvas会触发绑定值的修改，也会触发该回调。
 * @note 对于模型绑定，即便是其它操作修改了所绑定的值，也会触发值变化事件的回调。
 */
function onSlideChange(event) { try {
  // 获取任务进度
  const taskStatus = taskStatusRef.value
  // 任务进度为3时，即确定轮廓阶段
  if (taskStatus === 3) {
    // 直接执行防抖处理的轮廓查找方法
    slideContourThrottled(false)
  // 任务进度为4时，即基线绘制阶段
  } else if (taskStatus === 4) {
    // 直接执行防抖处理的基线绘制方法
    drawBaselineThrottled()
  }
} catch (error) {
  console.log("onSlideChange()报错：", error)
  errorDialog()
}}

/**
 * 调节滑轨操作刚停止的事件回调钩子
 * 步骤3：基线细调。此步骤下，用户只能操作滑轨，因此事件全部来源于滑轨。
 */
function onContourSlideChangeEnd(event) { try {
  // 任务进度为3，且为细调状态
  if ((taskStatusRef.value === 3) && (isContourCoarseRef.value === false)) {
    // 调用进度3下的具体刷新滑轨方法
    refreshContourFineSlider()
  }
} catch (error) {
  console.log("onContourSlideChangeEnd()报错：", error)
  errorDialog()
}}

/**
 * 报错的通知方法
 * 这个就不进行外部try...catch了
 */
function errorDialog() {
  // 直接对话框报错
  my.dialog({
    theme: "danger",
    header: "报错",
    body: "请联系软件开发人员"
  // 链式调用catch，防止出错
  }).catch((error) => {
    console.log("errorDialog()报错：", error)
  })
}

/**
 * @步骤1 传图
 */

/**
 * 任务进度切换到步骤1
 */
function taskToStep1() { try {
  taskStatusRef.value = 1
} catch (error) {
  console.log("taskToStep1()报错：", error)
  throw Error(error)
}}

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
  my.loading("正在读取照片...")
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
  // // 以图片的原始宽高设定canvas的实际宽高
  // canvasRef.value.width = imgElement.naturalWidth
  // canvasRef.value.height = imgElement.naturalHeight
  // 计算canvas的缩放比例：实际宽度/显示宽度
  contactAngleObj.canvasScaling = imgElement.naturalWidth / canvasParentRef.value.clientWidth
  // 设定canvas的显示高度
  canvasRef.value.style.height = imgElement.naturalHeight / contactAngleObj.canvasScaling + "px"
  // 读取图片文件为OpenCV的Mat对象
  const matOrigin = contactAngleObj.cv.imread(imgElement)
  // 读取完毕，销毁图片元素以释放内存
  // imgElement对象在该方法声明周期结束后会被GC自动回收
  imgElement.remove()
  // 如果全局灰度图Mat对象存在且有成员对象delete方法，则先删除
  if (contactAngleObj.matGray?.delete) { contactAngleObj.matGray.delete() }
  // 初始化全局灰度图Mat对象
  contactAngleObj.matGray = new contactAngleObj.cv.Mat()
  // 将原始图像Mat转为灰度Mat，赋值给全局灰度图Mat对象
  // “cvtColor”即convert color
  contactAngleObj.cv.cvtColor(
    // 原图（输入）
    matOrigin,
    // 灰度图（输出）
    contactAngleObj.matGray,
    // 颜色空间转换代码：color：RGBA to gray
    contactAngleObj.cv.COLOR_RGBA2GRAY,
    // 通道数：0，即自动
    0
  )
  // 将灰度图绘制到canvas上
  contactAngleObj.cv.imshow(canvasRef.value, contactAngleObj.matGray)
  // 释放原图Mat的WASM内存
  matOrigin.delete()
  // 接下来为绘制选框做准备
  // 获取canvas的绘图上下文对象ctx
  contactAngleObj.ctx = canvasRef.value.getContext(
    // CanvasRenderingContext2D接口的2D渲染上下文
    "2d",
    // 为频繁读取做优化。仅Gecko内核（FireFox浏览器）支持，就不再专门设置了
    // { willReadFrequently: true },
  )
  // 对ctx做简要设置并保存设置
  ctxSetting()
  // 把canvas的原图保存好，以方便恢复
  contactAngleObj.imageDataGray = contactAngleObj.ctx.getImageData(
    0, 0, canvasRef.value.width, canvasRef.value.height
  )
  // 第一阶段完成，任务进度改为2
  taskToStep2()
  // 停止加载框
  my.loading(false)
} catch (error) {
  // 停止加载框
  my.loading(false)
  // 报错处理
  console.log("onPicChange()方法出错：", error)
  errorDialog()
}}

/**
 * @步骤2 绘制选框
 * 此处的选框、清除选框等方法，放在上面的全局canvas监听里了
 */

/**
 * 任务进度切换到步骤2
 */
function taskToStep2() { try {
  taskStatusRef.value = 2
} catch (error) {
  console.log("taskToStep2()方法出错：", error)
  throw Error(error)
}}

/**
 * 选框方法
 */
function chooseRect() { try {
  // 点击位置的实际X、Y坐标
  const realElementX = elementX.value * contactAngleObj.canvasScaling
  const realElementY = elementY.value * contactAngleObj.canvasScaling
  // 如果选框X边界未定义，即第一次点击，需记录下选框的左上角坐标
  if (!contactAngleObj.rectXmax) {
    // 接<canvas>宽高
    const canvasWidth = canvasRef.value.width
    const canvasHeight = canvasRef.value.height
    // 计算初始化选框的半宽/半高：四分之一的<canvas>宽高，然后选小的值
    const rectHalfX = Math.min((canvasWidth / 4), (canvasHeight / 4))
    // Y轴半高：适当压扁一点
    const rectHalfY = rectHalfX * 2 / 3
    // 根据点击位置记录坐标
    // rectXmax：点击位置X坐标 + 选框半宽，有可能大于<canvas>宽，则取两者小值
    contactAngleObj.rectXmax = Math.min((realElementX + rectHalfX), canvasWidth)
    // rectYmax原理同上
    contactAngleObj.rectYmax = Math.min((realElementY + rectHalfY), canvasHeight)
    // rectXmin：点击位置X坐标 - 选框半宽，有可能小于零，则取两者大值
    contactAngleObj.rectXmin = Math.max((realElementX - rectHalfX), 0)
    // rectYmin原理同上
    contactAngleObj.rectYmin = Math.max((realElementY - rectHalfY), 0)
    // 绘图
    drawRect()
    // 返回
    return
  }
  // 接下来处理选框X边界已定义的情况，即修改原图
  // 如果恰好点在选框上
  if (
    (realElementX === contactAngleObj.rectXmax)
    || (realElementX === contactAngleObj.rectXmin)
    || (realElementY === contactAngleObj.rectYmax)
    || (realElementY === contactAngleObj.rectYmin)
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
  if (realElementX > contactAngleObj.rectXmax) {
    contactAngleObj.rectXmax = realElementX
  } else if (realElementX < contactAngleObj.rectXmin) {
    contactAngleObj.rectXmin = realElementX
  } else {
    isInRect++
  }
  // 判断Y点：
  // 同上
  if (realElementY > contactAngleObj.rectYmax) {
    contactAngleObj.rectYmax = realElementY
  } else if (realElementY < contactAngleObj.rectYmin) {
    contactAngleObj.rectYmin = realElementY
  } else {
    isInRect++
  }
  // 如果“如果在选框内”的标记isInRect不等于2，则说明点击位置在选框外
  if (isInRect !== 2) {
    // 此时选框点已经更新了，所以直接绘图即可
    drawRect()
    // 返回
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
  const rectSlope = (contactAngleObj.rectYmax - contactAngleObj.rectYmin)
    / (contactAngleObj.rectXmax - contactAngleObj.rectXmin)
  // 选点针对(rectXmin, rectYmin)点的斜率
  const realElementSlopePositive = (realElementY - contactAngleObj.rectYmin)
    / (realElementX - contactAngleObj.rectXmin)
  // 选点针对(rectXmax, rectYmin)点的斜率（这是个负数）
  const realElementSlopeNegative = (realElementY - contactAngleObj.rectYmin)
    / (realElementX - contactAngleObj.rectXmax)
  // 判断点的位置
  if (realElementSlopePositive >= rectSlope) {
    if (realElementSlopeNegative <= -rectSlope) {
      // 选点在交叉线的上方，rectYmax往下缩
      contactAngleObj.rectYmax = realElementY
    } else {
      // 选点在交叉线的左边，rectXmin往右缩
      contactAngleObj.rectXmin = realElementX
    }
  } else {
    if (realElementSlopeNegative <= -rectSlope) {
      // 选点在交叉线的右边，rectXmax往左缩
      contactAngleObj.rectXmax = realElementX
    } else {
      // 选点在交叉线的下方，rectYmin往上缩
      contactAngleObj.rectYmin = realElementY
    }
  }
  // 绘图
  drawRect()
  // 返回
  return
} catch (error) {
  console.log("chooseRect()方法出错：", error)
  throw Error(error)
}}

/**
 * 绘制选框
 * @note 会调用全局对象contactAngleObj的ctx
 * @note 会读取全局变量contactAngleObj的rectXmax、rectYmax、rectXmin、rectYmin
 */
function drawRect() { try {
  // 先对选框进行初始化
  contactAngleObj.ctx.putImageData(contactAngleObj.imageDataGray, 0, 0)
  // 然后直接绘图即可
  contactAngleObj.ctx.strokeRect(
    contactAngleObj.rectXmin,
    contactAngleObj.rectYmin,
    contactAngleObj.rectXmax - contactAngleObj.rectXmin,
    contactAngleObj.rectYmax - contactAngleObj.rectYmin
  )
} catch (error) {
  console.log("drawRect()方法出错：", error)
  throw Error(error)
}}

/**
 * 点击“裁剪图片”按钮的事件回调钩子
 */
function onSureRect(event) { try {
  // 直接执行裁剪方法
  sureRect(false)
} catch (error) {
  console.log("onSureRect()方法出错：", error)
  errorDialog()
}}

/**
 * 点击“确定裁剪”按钮的事件回调钩子
 */
function onDetermineRect(event) { try {
  // 直接执行裁剪方法，并确定完成裁剪
  sureRect(true)
} catch (error) {
  console.log("onDetermineRect()方法出错：", error)
  errorDialog()
}}

/**
 * “裁剪图片”或“完成裁剪”的具体方法
 * @param { Boolean } [isDetermine = false] 是否确定完成裁剪
 */
function sureRect(isDetermine = false) { try {
  // 如果没有选框
  if (!contactAngleObj.rectXmax) {
    // 如果是“完成裁剪”，则直接进入下一步即可
    if (isDetermine === true) {
      // 选框数据初始化
      canvasRectDataRemove()
      // 任务状态进展到“3”
      taskStatusRef.value = 3
    }
    // 直接返回即可
    return
  }
  // 根据新的选框尺寸更新<canvas>的显示尺寸
  const canvasNewWidth = contactAngleObj.rectXmax - contactAngleObj.rectXmin
  const canvasNewHeight = contactAngleObj.rectYmax - contactAngleObj.rectYmin
  // 开始裁剪：确定定义裁剪区域
  const rect = new contactAngleObj.cv.Rect(
    contactAngleObj.rectXmin,
    contactAngleObj.rectYmin,
    canvasNewWidth,
    canvasNewHeight
  )
  // 清空裁剪标记
  canvasRectDataRemove()
  // 执行裁剪
  let cropped = contactAngleObj.matGray.roi(rect)
  // 在<canvas>上绘制裁剪结果
  contactAngleObj.cv.imshow(canvasRef.value, cropped)
  // 绘制完成，更新contactAngleObj.matGray为cropped
  contactAngleObj.matGray.delete()
  contactAngleObj.matGray = cropped
  cropped = null
  // 绘制后，需要更新<canvas>的显示缩放及宽高
  // 从<canvas>父元素获取<canvas>的显示宽度
  canvasRef.value.style.width = canvasParentRef.value.clientWidth + "px"
  // 计算新的缩放比例
  contactAngleObj.canvasScaling = canvasNewWidth / canvasParentRef.value.clientWidth
  // 更新<canvas>的显示高
  canvasRef.value.style.height = canvasNewHeight / contactAngleObj.canvasScaling + "px"
  // 更新完成，恢复绘图上下文ctx设置
  ctxSetting()
  // 把canvas的原图保存好，以方便恢复
  contactAngleObj.imageDataGray = contactAngleObj.ctx.getImageData(
    0, 0, canvasRef.value.width, canvasRef.value.height
  )
  // 如果是点击“完成裁剪”，则执行下一步
  if (isDetermine) {
    // 任务状态进展到“3”
    taskToStep3()
  }
} catch (error) {
  console.log("sureRect()方法出错：", error)
  throw Error(error)
}}

/**
 * @步骤3 选择轮廓
 */

/**
 * 任务进度切换到步骤3
 */
function taskToStep3() { try {
  // 初始化一些数据
  // 粗调
  isContourCoarseRef.value = true
  // 参数
  thresholdNumArrRef.value = [
    // 主参数和辅助参数
    0, 0,
    // 主参数的下限/上限
    0, 255,
    // 主参数的mark标记
    0, 85, 170, 255,
    // 辅助参数的下限/上限
    0, 255,
    // 辅助参数的mark标记
    0, 85, 170, 255
  ]
  // 算法
  contourAlgorithmSwitchRef.value = false
  // 切换到状态3
  taskStatusRef.value = 3
} catch (error) {
  console.log("taskToStep3()方法出错：", error)
  throw Error(error)
}}

/**
 * 寻找轮廓算法的切换算法事件钩子
 */
function onContourAlgorithmSwitchChange(event) { try {
  // 直接调用轮廓查找方法，刷新一次轮廓渲染即可
  slideContour(false)
} catch (error) {
  console.log("onContourAlgorithmSwitchChange()方法出错：", error)
  errorDialog()
}}

/**
 * 点击“确定轮廓”按钮的事件回调钩子
 */
function onDetermineContour(event) { try {
  // 直接执行轮廓查找方法，并确定完成轮廓查找
  slideContour(true)
} catch (error) {
  console.log("onDetermineContour()方法出错：", error)
  errorDialog()
}}

/**
 * 选择轮廓方法的防抖方法
 * @note 给slideContour做了防抖处理，以防止频繁调用
 */
const slideContourThrottled = useThrottleFn(slideContour, 500, true)

/**
 * 选择轮廓的具体回调方法
 * @param { Boolean } [isDetermine = false] 是否确定轮廓
 * 先用2种算法（中的一个）得到二值化轮廓图：
 * 1.  以阈值化法Threshold算法实现的轮廓查找
 * 2.  以Canny算法实现的轮廓查找
 * 然后寻找轮廓、处理轮廓
 * @note 会读取thresholdNumArrRef
 */
function slideContour(isDetermine = false) { try {
  // 防抖的bug防范：只有在“3”任务状态时，才允许执行
  // 这可以防止进入步骤4的瞬间执行此方法，造成canvas不正常的刷新回退
  if (taskStatusRef.value !== 3) { return }
  // 接阈值数组的前2个参数
  const mainParam = thresholdNumArrRef.value[0]
  const auxParam = thresholdNumArrRef.value[1]
  // 初始化一个二值化图的过渡对象
  let matBinary = new contactAngleObj.cv.Mat()
  // 阈值化Threshold算法：true
  if (contourAlgorithmSwitchRef.value === true) {
    // Threshold算法，将灰度图转为二值化图，赋值给全局变量matObj.binary
    contactAngleObj.cv.threshold(
      // 灰度图
      contactAngleObj.matGray,
      // 输出数组（二值化图）
      matBinary,
      // 阈值：主参数
      mainParam,
      // 用于THRESH_BINARY和THRESH_BINARY_INV阈值类型的最大值
      255,
      // 阈值类型
      contactAngleObj.cv.THRESH_BINARY
    )
  // Canny算法：false
  } else {
    // Canny算法，边缘检测，赋值给全局变量matObj.binary
    // 详见：https://docs.opencv.ac.cn/4.12.0/d7/de1/tutorial_js_canny.html
    contactAngleObj.cv.Canny(
      // 灰度图
      contactAngleObj.matGray,
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
  // 获取并处理-绘制轮廓数据
  makeContour(matBinary, isDetermine)
  // 销毁二值化对象
  matBinary.delete()
} catch (error) {
  console.log("slideContour()方法出错：", error)
  errorDialog()
}}

/**
 * 寻找并处理轮廓
 * @param { import("@techstark/opencv-js").Mat } matBinary 二值化的Mat图像
 * @param { Boolean } [isDetermine = false] 是否确定轮廓
 * @note 专门被调用的
 */
function makeContour(matBinary, isDetermine = false) { try {
  // 先寻找轮廓
  // 初始化轮廓AOA数组metVectorContours
  let metVectorContours = new contactAngleObj.cv.MatVector()
  // 初始化轮廓层次结构metHierarchy
  let metHierarchy = new contactAngleObj.cv.Mat()
  // cv.findContours()方法，查找轮廓
  // 详见：https://docs.opencv.org/4.12.0/d5/daa/tutorial_js_contours_begin.html
  contactAngleObj.cv.findContours(
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
    contactAngleObj.cv.RETR_LIST,
    // 轮廓近似法
    // CHAIN_APPROX_NONE => chain approx none - 不作近似处理，存储所有轮廓点
    contactAngleObj.cv.CHAIN_APPROX_NONE
  )
  // 然后开始处理轮廓数据
  // 拷贝一个原画布，用于绘制轮廓
  let contoursHandleMat = new contactAngleObj.cv.Mat()
  contactAngleObj.matGray.copyTo(contoursHandleMat)
  // 定义最小外接圆的颜色为白色（8位图，255即为白色）
  const contoursColor = new contactAngleObj.cv.Scalar(255)
  // 轮廓粗细
  const contoursThickness = 2 * contactAngleObj.canvasScaling
  // 在画布上绘制所有轮廓（轮廓索引传参为-1即可）
  contactAngleObj.cv.drawContours(
    // Mat画布
    contoursHandleMat,
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
  contactAngleObj.cv.imshow(canvasRef.value, contoursHandleMat)
  // 如果确定了轮廓
  if (isDetermine === true) {
    // 提取轮廓点数据
    contourPointsToAoa(metVectorContours)
    // canvas保存一下方便后面恢复
    contactAngleObj.imageDataContour = contactAngleObj.ctx.getImageData(
      0, 0, canvasRef.value.width, canvasRef.value.height
    )
    // 状态机切换到4
    taskToStep4()
  }
  // 完毕，销毁相关对象以回收内存
  // 销毁轮廓AOA数组
  metVectorContours.delete()
  // 销毁轮廓层次结构
  metHierarchy.delete()
  // 销毁画布
  contoursHandleMat.delete()
} catch (error) {
  console.log("makeContour()方法出错：", error)
  throw Error(error)
}}

/**
 * 把轮廓点数组转换为AOA数组
 * @param { import("@techstark/opencv-js").MatVector } metVectorContours OpenCV的轮廓AOA数组对象
 */
function contourPointsToAoa(metVectorContours) { try {
  // 加载框
  my.loading("正在存储轮廓坐标...")
  // 声明一个数组用来接所有轮廓点
  const contourPointAoa = []
  // 用于收集所有轮廓点的纵坐标最小值，先用canvas的高度初始化（即最大值）
  let contourYMin = canvasRef.value.height
  // 遍历所有轮廓点
  for (let i = 0; i < metVectorContours.size(); i++) {
    // 挨个获取轮廓
    const contour = metVectorContours.get(i)
    for (let j = 0; j < contour.rows; j++) {
      // 接X和Y坐标
      const pointX = contour.data32S[j * 2]
      const pointY = contour.data32S[j * 2 + 1]
      // 装箱
      contourPointAoa.push([pointX, pointY])
      // 如果y坐标小于minY，则更新minY
      if (pointY < contourYMin) { contourYMin = pointY }
    }
    // 删除轮廓释放内存
    contour.delete()
  }
  // 把所有轮廓点数组、yMin存入全局变量
  contactAngleObj.contourPointAoa = contourPointAoa
  contactAngleObj.contourYMin = contourYMin
  // 停止加载框
  my.loading(false)
} catch (error) {
  // 停止加载框
  my.loading(false)
  // 报错处理
  console.log("contourPointsToAoa()方法出错：", error)
  throw Error(error)
}}

/**
 * 轮廓粗细调的切换
 * @note 会触发绘制轮廓
 */
function contourCoarseToggle() { try {
  // 如果目前是细调，则要修改为粗调
  if (isContourCoarseRef.value === false) {
    // 粗调的阈值数组
    const thresholdNumArr = [
      // 主参数和辅助参数
      thresholdNumArrRef.value[0], thresholdNumArrRef.value[1],
      // 主参数的下限/上限
      0, 255,
      // 主参数的mark标记
      0, 85, 170, 255,
      // 辅助参数的下限/上限
      0, 255,
      // 辅助参数的mark标记
      0, 85, 170, 255
    ]
    // 赋值
    // （这一步会触发绘图）
    thresholdNumArrRef.value = thresholdNumArr
    // 更新标记：则切换为粗调
    isContourCoarseRef.value = true
  // 如果目前是粗调，要改为细调
  } else {
    // 刷新细调滑块
    // （这一步会触发绘图）
    refreshContourFineSlider()
    // 更新标记：切换为细调
    isContourCoarseRef.value = false
  }
} catch (error) {
  console.log("contourCoarseToggle()方法出错：", error)
  throw Error(error)
}}

/**
 * 刷新步骤3里细调滑块的具体方法
 * @note 会触发绘制轮廓
 */
function refreshContourFineSlider() { try {
  // 接收主参数和辅助参数
  const mainParam = thresholdNumArrRef.value[0]
  const auxParam = thresholdNumArrRef.value[1]
  // 找主参数的下限：主参数的下限必须不小于0，不大于243
  const mainParamMin = Math.max(0,
    Math.min(243, (mainParam - 6))
  )
  // 找辅助参数的下限：辅助参数的下限必须不小于0，不大于243
  const auxParamMin = Math.max(0,
    Math.min(243, (auxParam - 6))
  )
  // 细调的阈值数组
  const thresholdNumArr = [
    // 主参数和辅助参数
    mainParam, auxParam,
    // 主参数的下限/上限
    mainParamMin, mainParamMin + 12,
    // 主参数的mark标记
    mainParamMin, mainParamMin + 4, mainParamMin + 8, mainParamMin + 12,
    // 辅助参数的下限/上限
    auxParamMin, auxParamMin + 12,
    // 辅助参数的mark标记
    auxParamMin, auxParamMin + 4, auxParamMin + 8, auxParamMin + 12,
  ]
  // 赋值
  // （这一步会触发绘图）
  thresholdNumArrRef.value = thresholdNumArr
} catch (error) {
  console.log("refreshContourFineSlider()方法出错：", error)
  throw Error(error)
}}

/**
 * @步骤4
 * @note 因为模板绑定，所以interceptNumArrRef.value一旦改变，就会触发绘图
 * 用户有2种交互：点击canvas（粗调，单次）和拖动滑轨（细调，连续）。
 * 粗调：修改滑轨的值 + 滑轨上下限等，进而触发绘图。
 * 细调：
 *   连续：修改滑轨的值，进而触发绘图。
 *   单次：因为操作canvas，所以滑轨的change状态一直是被劫持的，没有end。
 * 所以肯定会触发绘图，那就不用再考虑绘图了。
 */

/**
 * 步骤4的初始化方法
 * 步骤4的难点就在于：【canvas里，原点在左上角】
 *   因为滑轨仍然要和用户思维统一，所以仅在绘制时把坐标轴翻转一下即可
 */
function taskToStep4() { try {
  // 接收轮廓的纵坐标最小值
  const contourYMin = contactAngleObj.contourYMin || 0
  // canvas初始化
  ctxSetting()
  // 状态机切换到4
  taskStatusRef.value = 4
  // 用轮廓的纵坐标最小值来初始化细调滑块
  // （这一步会触发绘图）
  refreshBaselineFineSlider(contourYMin, contourYMin)
} catch (error) {
  console.log("taskToStep4()方法出错：", error)
  throw Error(error)
}}

/**
 * 步骤4里刷新滑块的具体方法
 * @param { Number } [leftInterceptValue] 左截距
 * @param { Number } [rightInterceptValue] 右截距
 * @note 会触发绘制基线截距
 */
function refreshBaselineFineSlider(leftInterceptValue, rightInterceptValue) { try {
  // 接收左截距和右截距
  const leftIntercept =
    leftInterceptValue
      ? Math.floor(leftInterceptValue)
      : interceptNumArrRef.value[0]
  const rightIntercept =
    rightInterceptValue
      ? Math.floor(rightInterceptValue)
      : interceptNumArrRef.value[1]
  // 接canvas高
  const canvasHeight = canvasRef.value.height
  // 根据高计算截距的上下限范围，目前以高的1/15为限度。
  // 截距需能被6整除。所以是除以90。
  // 整除后，乘以2是阶梯的宽度，乘以3是mark的宽度。
  // 除此以外，得确保截距最小单位起码是1。
  const delta = Math.max(Math.floor(canvasHeight / 90), 1)
  // 找左截距的下限：左截距的下限必须不小于0，不大于canvas的高度
  const leftParamMin = Math.max(0,
    Math.min(canvasHeight, (leftIntercept - (delta * 3)))
  )
  // 找右截距的下限：右截距的下限必须不小于0，不大于canvas的高度
  const rightParamMin = Math.max(0,
    Math.min(canvasHeight, (rightIntercept - (delta * 3)))
  )
  // 细调的阈值数组
  const interceptNumArr = [
    // 左截距和右截距
    leftIntercept, rightIntercept,
    // 左截距的下限/上限
    leftParamMin, leftParamMin + (delta * 6),
    // 左截距的mark标记
    leftParamMin, leftParamMin + (delta * 2),
    leftParamMin + (delta * 4), leftParamMin + (delta * 6),
    // 右截距的下限/上限
    rightParamMin, rightParamMin + (delta * 6),
    // 右截距的mark标记
    rightParamMin, rightParamMin + (delta * 2),
    rightParamMin + (delta * 4), rightParamMin + (delta * 6),
  ]
  // 赋值
  // 这一步会触发绘图
  interceptNumArrRef.value = interceptNumArr
} catch (error) {
  console.log("refreshBaselineFineSlider()方法出错：", error)
  throw Error(error)
}}

/**
 * 截距粗调的具体实现方法
 * 把canvas分成3个区域：左区（0.35）、中区（0.30）、右区（0.35）。
 * 中区则直接升降基线；左区和右区则升降各自部分的截距。
 * @note 会触发绘制基线截距
 */
function chooseBaseline() { try {
  // 点击位置的实际X、Y坐标：canvas视角
  const realElementX = elementX.value * contactAngleObj.canvasScaling
  const realElementY = elementY.value * contactAngleObj.canvasScaling
  // 接收canvas宽度和高度
  const canvasWidth = canvasRef.value.width
  const canvasHeight = canvasRef.value.height
  // 转为用户视角Y坐标（X坐标的用户视角和canvas视角是一致的）
  const userElementY = canvasHeight - realElementY
  // 左区
  if (realElementX < (canvasWidth * 0.35)) {
    // 接目前的右截距
    const rightIntercept = interceptNumArrRef.value[1]
    // 计算左截距
    // (左截距 - 右截距) / (userElementY - 右截距) = canvasWidth / (canvasWidth - realElementX)
    // 计算公式中，没有除以0的情况，所以不用考虑bug
    const leftIntercept =
      canvasWidth / (canvasWidth - realElementX)
      * (userElementY - rightIntercept)
      + rightIntercept
    // 用左截距和右截距来刷新细调滑块
    // （这一步会触发绘图）
    refreshBaselineFineSlider(leftIntercept, rightIntercept)
  // 右区
  } else if (realElementX > (canvasWidth * 0.65)) {
    // 接目前的左截距
    const leftIntercept = interceptNumArrRef.value[0]
    // 计算右截距
    // (右截距 - 左截距) / (userElementY - 左截距) = canvasWidth / realElementX
    // 计算公式中，没有除以0的情况，所以不用考虑bug
    const rightIntercept =
      canvasWidth / realElementX
      * (userElementY - leftIntercept)
      + leftIntercept
    // 用左截距和右截距来刷新细调滑块
    // （这一步会触发绘图）
    refreshBaselineFineSlider(leftIntercept, rightIntercept)
  // 中区
  } else {
    // 直接拿着用户视角的Y坐标来刷新细调滑块
    // （这一步会触发绘图）
    refreshBaselineFineSlider(userElementY, userElementY)
  }
} catch (error) {
  console.log("chooseBaseline()方法出错：", error)
  throw Error(error)
}}

/**
 * 绘制基线方法的防抖方法
 * @note 给drawBaseline做了防抖处理，以防止频繁调用
 */
const drawBaselineThrottled = useThrottleFn(drawBaseline, 200, true)

/**
 * 步骤4里绘制基线的具体方法
 */
function drawBaseline() { try {
  // 接收左截距和右截距
  const leftIntercept = interceptNumArrRef.value[0]
  const rightIntercept = interceptNumArrRef.value[1]
  // 接canvas宽度和高度
  const canvasWidth = canvasRef.value.width
  const canvasHeight = canvasRef.value.height
  // 计算真正的截距（canvas视角的y值）
  const leftY = canvasHeight - leftIntercept
  const rightY = canvasHeight - rightIntercept
  // 先对选框进行初始化
  contactAngleObj.ctx.putImageData(contactAngleObj.imageDataContour, 0, 0)
  // 然后直接绘图即可
  contactAngleObj.ctx.beginPath()
  // 起点坐标
  contactAngleObj.ctx.moveTo(0, leftY)
  // 终点坐标
  contactAngleObj.ctx.lineTo(canvasWidth, rightY)
  // 连线
  contactAngleObj.ctx.stroke()
} catch (error) {
  console.log("drawBaseline()方法出错：", error)
  throw Error(error)
}}

/**
 * 步骤4里返回上一步的事件回调钩子
 */
function onBackToStep3(event) { try {
  // 直接返回上一步即可
  // 不能初始化上一步，如果初始化的话，已有轮廓数据的暂存参数设置就会丢失
  taskStatusRef.value = 3
} catch (error) {
  console.log("onBackToStep3()方法出错：", error)
  throw Error(error)
}}

/**
 * 步骤4里确认基线的事件回调钩子
 */
function onDetermineBaseline(event) { try {
  // 接收左截距和右截距
  const leftIntercept = interceptNumArrRef.value[0]
  const rightIntercept = interceptNumArrRef.value[1]
  // 接收轮廓点数组
  const contourPointAoa = contactAngleObj.contourPointAoa
  // 发个通知
  const dialogString =
    `已成功获取液滴数据。
    轮廓数据点 ${ contourPointAoa.length } 个。
    基线左、右截距分别为：${ leftIntercept } px，${ rightIntercept } px。
    后续功能敬请期待！`
  my.dialog(dialogString)
} catch (error) {
  console.log("onDetermineBaseline()方法出错：", error)
  errorDialog()
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
