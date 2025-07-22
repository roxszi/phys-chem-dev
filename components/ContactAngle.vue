<!--
  接触角求解
  通过图片处理，得到轮廓数据，然后通过计算拟合最终求解接触角。
  计算机视觉库的实现，以及一些交互的设计思路。
  构建OpenCV.js：https://docs.opencv.ac.cn/4.12.0/d4/da1/tutorial_js_setup.html
  test
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

  <!-- 步骤1：警报框 -->
  <t-alert
    v-if="taskHeadRef === 1"
    theme="warning" title="步骤1"
  >
    首先点击“点击上传图片”读取图片。<br />
    读取到的图片会自动进行灰度化渲染。
  </t-alert>

  <!--
    图片上传
    这个一直都存在
   -->
  <t-upload
    :disabled="false" class="center"
    theme="image" :multiple="false" :draggable="false"
    :showImageFileName="true" :abridgeName="[3, 8]"
    v-model:files="fileArrRef" :autoUpload="false"
    :sizeLimit="{ size: 10, unit: 'MB' }"
    :onChange="onPicChange"
  />



  <!-- 步骤2：警报框 -->
  <t-alert
    v-if="taskHeadRef === 2"
    theme="warning" title="步骤2"
  >
    接下来需要将图片裁剪为合适的尺寸。<br />
    短按可控制边框；长按可清空已有选框。<br />
    可通过下方“裁剪图片”按钮多次裁剪，直到满意后，点击下方“完成裁剪”按钮进入下一步。
  </t-alert>


  <!-- 步骤3：容器 -->
  <mySpace v-else-if="taskHeadRef === 3">
    <!-- 警报框 -->
    <t-alert theme="warning" title="步骤3">
      接下来寻找固体基底及液滴的最佳轮廓。<br />
      调节滑轨可切换灰度值呈现的轮廓效果；长按可清空效果。
    </t-alert>
    <!-- 边缘检测算法切换开关 -->
    <MySwitch
      @change="() => { slideContour(thresholdNumArrRef) }"
      v-model="contourAlgorithmSwitchRef"
      leftLabel="Canny法"
      rightLabel="阈值化法"
    />
  </mySpace>

  <!-- 步骤4：警报框 -->
  <t-alert
    v-else-if="taskHeadRef === 4"
    theme="warning" title="步骤4"
  >
    找基线
  </t-alert>

  <!--
    canvas元素块
    这个一直存在
    这是最重要的，从第二步开始，其它的元素块都围绕这个展开
   -->
  <div style="width:100%;">
    <canvas
      v-show="taskStatusRef >= 2"
      ref="canvasRef"
      @click="onCanvasClick"
    ></canvas>
  </div>

  <!-- 步骤2：容器（按钮容器） -->
  <div
    v-if="taskFootRef === 2"
    class="center"
  >
    <myButton
      @click="(event) => { onSureRect(event, false) }"
      :block="false"
    >
      裁剪图片
    </myButton>
    <myButton
      @click="(event) => { onSureRect(event, true) }"
      :block="false" theme="danger"
    >
      完成裁剪
    </myButton>
  </div>

  <!-- 步骤3：容器 -->
  <mySpace
    v-else-if="taskFootRef === 3"
    size="small"
  >
    <!-- 滑轨：主参数 -->
    <div>主参数：</div>
    <t-slider
      @change="() => { onSlideContour(thresholdNumArrRef, false) }"
      @changeEnd="() => { refreshContourFineSlider(isContourCoarseRef) }"
      :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
      :min="thresholdNumArrRef[2]" :max="thresholdNumArrRef[3]" :step="1" 
      :marks="[thresholdNumArrRef[4], thresholdNumArrRef[5],
        thresholdNumArrRef[6], thresholdNumArrRef[7]]"
      v-model="thresholdNumArrRef[0]"
    /><t-divider />
    <!-- 滑轨：辅助参数 -->
    <div>辅助参数：</div>
    <t-slider
      @change="() => { onSlideContour(thresholdNumArrRef, false) }"
      @changeEnd="() => { refreshContourFineSlider(isContourCoarseRef) }"
      :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
      :min="thresholdNumArrRef[8]" :max="thresholdNumArrRef[9]" :step="1" 
      :marks="[thresholdNumArrRef[10], thresholdNumArrRef[11],
        thresholdNumArrRef[12], thresholdNumArrRef[13]]"
      v-model="thresholdNumArrRef[1]"
    /><t-divider />
    <!-- 容器（按钮容器） -->
    <div class="center">
      <myButton
        @click="contourCoarseToggle"
        :block="false" :theme="isContourCoarseRef ? 'primary' : 'warning'"
      >
        {{ isContourCoarseRef ? "切换细调" : "切换粗调" }}
      </myButton>
      <myButton
        @click="() => { onSlideContour(thresholdNumArrRef, true) }"
        :disabled="(thresholdNumArrRef[0] === 0)"
        :block="false" theme="danger"
      >
        确认轮廓
      </myButton>
    </div>
  </mySpace>

  <!-- 步骤4：容器 -->
  <mySpace
    v-else-if="taskFootRef === 4"
    size="small"
  >
    <!-- 滑轨：左截距 -->
    <div>左截距：</div>
    <t-slider
      @change="() => { onSlideBaseline(thresholdNumArrRef, false) }"
      @changeEnd="() => { refreshBaselineFineSlider() }"
      :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
      :min="interceptNumArrRef[2]" :max="interceptNumArrRef[3]" :step="1" 
      :marks="[interceptNumArrRef[4], interceptNumArrRef[5],
        interceptNumArrRef[6], interceptNumArrRef[7]]"
      v-model="interceptNumArrRef[0]"
    /><t-divider />
    <!-- 滑轨：右截距 -->
    <div>右截距：</div>
    <t-slider
      @change="() => { onSlideBaseline(interceptNumArrRef, false) }"
      @changeEnd="() => { refreshBaselineFineSlider() }"
      :inputNumberProps="false" :label="true" layout="horizontal" :range="false"
      :min="interceptNumArrRef[8]" :max="interceptNumArrRef[9]" :step="1" 
      :marks="[interceptNumArrRef[10], interceptNumArrRef[11],
        interceptNumArrRef[12], interceptNumArrRef[13]]"
      v-model="interceptNumArrRef[1]"
    /><t-divider />
    <!-- 容器（按钮容器） -->
    <div class="center">
      <myButton
        @click="() => { taskStatusRef = 3 }"
        :block="false" theme="default"
      >
        返回上一步
      </myButton>
      <myButton
        @click="() => { onSlideBaseline(interceptNumArrRef, true) }"
        :disabled="(thresholdNumArrRef[0] === 0)"
        :block="false" theme="danger"
      >
        确认基线
      </myButton>
    </div>
  </mySpace>

  <!-- 警报框 -->
  <t-alert
    theme="error"
  >
    这个交互效果有待讨论改进，我想到的一些点：<br />
    1.  滑轨这样是否可以？<br />
    2.  基底线和液滴线要分成2步查找。<br />
    3.  基底线必然要让学生选2点，然后拟合直线。然后可以结合识别到的轮廓线，对基底直线进行微调（微调权重又是个问题）。<br />
    4.  液滴轮廓线方面，选点的交互操作其实很困难啊。我想到都一个实现是：在基底线确定之后，可以纯粹通过滑轨找液滴轮廓——学生调好轮廓后，点击“确定液滴轮廓”，然后软件自动选取基底线上方的轮廓点作为“有效液滴轮廓点”，然后带着一大堆有效轮廓坐标点数据来拟合液滴。不过就怕“基底线上方的轮廓点”这个限制条件有隐患，一个大一点的光晕/噪点，人能看出来，计算机不懂啊，那数据就存在各种隐患了。<br />
    5.  还有没有什么好的交互、算法上的建议？
  </t-alert>

</MySpace></template>

<!--
  逻辑层
 -->
<script setup>
// 导入VUE的各类响应式方法
import { computed, ref, watch } from "vue"
// 导入VueUse的各类响应式方法
import { useParentElement, useMouseInElement, onLongPress, useThrottleFn } from "@vueuse/core"
// 导入自有方法
import my from "@/utils/myFunc.js"
import MySwitch from "./myComponents/MySwitch.vue"

// 一上来就要先调用加载框，防止用户操作
// 等到<canvas>元素块和OpenCV.js都加载完毕后，才能停止加载框
my.loading("正在启动OpenCV.js计算机视觉模块，请稍候...")

/**
 * 任务状态：
 * 1 - 未开始，或删除了图片；
 * 2 - 读取到了图片，正在选框裁剪图片；
 * 3 - 完成了选框，得到了裁剪的图片；
 * @type { import("vue").Ref<Number> }
 */
const taskStatusRef = ref(1)
/** canvas上方的状态遍历条件渲染指针 @type { import("vue").ComputedRef<Number> } */
const taskHeadRef = computed(() => taskStatusRef.value)
/** canvas下方的状态遍历条件渲染指针 @type { import("vue").ComputedRef<Number> } */
const taskFootRef = computed(() => taskStatusRef.value)
/** 用户上传的文件数组对象 @type { import("vue").Ref<File[]> } */
const fileArrRef = ref([])
/** 视图层的<canvas>Dom对象 @type { import("vue").Ref<HTMLCanvasElement> } */
// canvas加载很慢，需要等，比较好的等待方法是watch监听钩子
// nextTick、onMounted都不如watch
const canvasRef = ref(null)
// 接<canvas>的父元素对象，用于计算<canvas>的宽度
/** \<canvas>的父元素对象 @type { import("vue").Ref<HTMLCanvasElement> } */
const canvasParentRef = useParentElement(canvasRef)
/** 
 * 第三步寻找轮廓的上下限范围
 * @type { import("vue").Ref<Number[]> }
 * 第1、2个值分别代表主参数和辅助参数
 * 第3、4个值分别代表主参数的上限/下限
 * 第5、6、7、8个值分别代表主参数的mark标记
 * 第9、10个值分别代表辅助参数的上限/下限
 * 第11、12、13、14个值分别代表辅助参数的mark标记
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
 * 第三步寻找轮廓的算法
 * @type { import("vue").Ref<Boolean> }
 * @value true - Canny算法
 * @value false - 阈值化法
 */
const contourAlgorithmSwitchRef = ref(false)
/** 是否是轮廓粗调模式 @type { import("vue").Ref<Boolean> } */
const isContourCoarseRef = ref(true)
/**
 * 第四步寻找基线的截距
 * @type { import("vue").Ref<Number[]> }
 * 第1、2个值分别为左、右截距
 * 第3、4个值分别为左截距的下限/上限
 * 第5、6、7、8个值分别为左截距的mark标记
 * 第9、10个值分别为右截距的下限/上限
 * 第11、12、13、14个值分别为右截距的mark标记
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
 * @property { import("@techstark/opencv-js").Mat } matContour 灰度图Mat对象
 * @property { ImageData } imageDataContour canvas的图像数据
 * @property { Number } rectXmax canvas元素块选框的X坐标大值
 * @property { Number } rectYmax canvas元素块选框的Y坐标大值
 * @property { Number } rectXmin canvas元素块选框的X坐标小值
 * @property { Number } rectYmin canvas元素块选框的Y坐标小值
 * @note canvas的实际宽高在canvasRef.value.width和canvasRef.value.height上
 * @note canvas的显示宽高在canvasRef.value.style.width和canvasRef.value.style.height上(String + px)
 * @note canvas的显示宽最大值在canvasParentRef.value.clientWidth上
 */
/** 接触角业务的全局对象 @type { ContactAngle } */
const contactAngleObj = {
  cv: null,
  ctx: null,
  canvasScaling: 0.0,
  matGray: null,
  imageDataGray: null,
  matContour: null,
  imageDataContour: null,
  rectXmax: null,
  rectYmax: null,
  rectXmin: null,
  rectYmin: null,
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
// 注册一个<canvas>长按的监听钩子
onLongPress(
  // 监听对象：<canvas>
  canvasRef,
  // 回调
  onCanvasLongPress,
  // 配置：长按时间
  // { delay: 800 }
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
 * 图片上传或改变时触发的回调
 * @param { Array<T> } event 事件对象
 * @note 会读取全局对象contactAngleObj的<canvas>宽度对象canvasWidth
 * @note 会写入全局对象contactAngleObj的<canvas>高度对象canvasHeight
 * @note 会写入全局对象contactAngleObj的灰度图Mat对象matGray
 */
async function onPicChange(event) { try {
  // 如果是清空了照片，则把任务进度切换回1，并直接返回即可
  if (event.length === 0) { 
    taskStatusRef.value = 1
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
  taskStatusRef.value = 2
  // 停止加载框
  my.loading(false)
} catch (error) {
  // 停止加载框
  my.loading(false)
  // 报错处理
  console.log("onPicChange()方法出错：", error)
  my.dialog({
    theme: "danger",
    header: "读取照片报错",
    body: error.message
  })
}}

/**
 * 长按<canvas>触发的回调
 * 本质上就是清空<canvas>上的标记
 */
function onCanvasLongPress(event) {
  if (taskStatusRef.value < 2) {
    return
  } else if (taskStatusRef.value === 2) {
    // 清空选框的X和Y边界值
    contactAngleObj.rectXmax = null
    contactAngleObj.rectYmax = null
    contactAngleObj.rectXmin = null
    contactAngleObj.rectYmin = null
    // 恢复canvas原图
    contactAngleObj.ctx.putImageData(contactAngleObj.imageDataGray, 0, 0)
  } else {
    // 恢复canvas原图
    contactAngleObj.ctx.putImageData(contactAngleObj.imageDataGray, 0, 0)
  }
}

/**
 * 点击<canvas>触发的回调
 */
function onCanvasClick(event) {
  // 任务进度为2时，即选框绘制阶段，则调用选框方法
  if (taskStatusRef.value === 2) { chooseRect() }
}

/**
 * 选框方法
 */
function chooseRect() { try {
  // 点击位置的实际X、Y坐标
  const realElementX = elementX.value * contactAngleObj.canvasScaling
  const realElementY = elementY.value * contactAngleObj.canvasScaling
  // 如果选框X边界未定义，即第一次点击，记录下选框的左上角坐标
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
  // 报错处理
  console.log("chooseRect()方法出错：", error)
  my.dialog({
    theme: "danger",
    header: "选框报错",
    body: error.message
  })
}}

/**
 * 点击“裁剪图片”或“完成裁剪”触发的回调
 * @param { Boolean } [isDetermine = false] 是否确定裁剪
 */
function onSureRect(event, isDetermine = false) { try {
  // 如果没有选框
  if (!contactAngleObj.rectXmax) {
    // 如果是点击“完成裁剪”，则执行下一步
    if (isDetermine) {
      // 任务状态进展到“3”
      taskStatusRef.value = 3
    }
    // 直接跳过
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
  onCanvasLongPress()
  // 执行裁剪
  let cropped = contactAngleObj.matGray.roi(rect)
  // 在<canvas>上绘制裁剪结果
  contactAngleObj.cv.imshow(canvasRef.value, cropped)
  // 绘制完成，更新contactAngleObj.matGray为cropped
  contactAngleObj.matGray.delete()
  contactAngleObj.matGray = cropped
  cropped = null
  // 绘制后，需要更新<canvas>的显示缩放及宽高
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
    taskStatusRef.value = 3
  }
} catch (error) {
  // 报错处理
  console.log("onSureRect()方法出错：", error)
  my.dialog({
    theme: "danger",
    header: "裁剪报错",
    body: error.message
  })
}}

/**
 * 设置canvas的绘图上下文ctx
 */
function ctxSetting() {
  // 红色笔迹
  contactAngleObj.ctx.strokeStyle = "red"
  // 线宽：2像素 x 缩放比例
  contactAngleObj.ctx.lineWidth = 2 * contactAngleObj.canvasScaling
}

/**
 * 绘制选框
 * @note 会调用全局对象contactAngleObj的ctx
 * @note 会读取全局变量contactAngleObj的rectXmax、rectYmax、rectXmin、rectYmin
 */
function drawRect() {
  // 先对选框进行初始化
  contactAngleObj.ctx.putImageData(contactAngleObj.imageDataGray, 0, 0)
  // 然后直接绘图即可
  contactAngleObj.ctx.strokeRect(
    contactAngleObj.rectXmin,
    contactAngleObj.rectYmin,
    contactAngleObj.rectXmax - contactAngleObj.rectXmin,
    contactAngleObj.rectYmax - contactAngleObj.rectYmin
  )
}

/**
 * 选择轮廓的事件钩子
 * @note 给chooseContour做了防抖处理，以防止频繁调用
 */
const onSlideContour = useThrottleFn(slideContour, 500, true)
/**
 * 选择轮廓的回调方法
 * @param { Number[] } thresholdNumArr 阈值数组
 * @param { Boolean } [isDetermine = false] 是否确定轮廓
 * 先用2种算法（中的一个）得到二值化轮廓图：
 * 1.  以阈值化法Threshold算法实现的轮廓查找
 * 2.  以Canny算法实现的轮廓查找
 * 然后寻找轮廓、处理轮廓
 */
function slideContour(thresholdNumArr, isDetermine = false) { try {
  // 初始化一个二值化图的过渡对象
  let matBinary = new contactAngleObj.cv.Mat()
  // 阈值化Threshold算法：true
  if (contourAlgorithmSwitchRef.value) {
    // Threshold算法，将灰度图转为二值化图，赋值给全局变量matObj.binary
    contactAngleObj.cv.threshold(
      // 灰度图
      contactAngleObj.matGray,
      // 输出数组（二值化图）
      matBinary,
      // 阈值：主参数
      thresholdNumArr[0],
      // 用于THRESH_BINARY和THRESH_BINARY_INV阈值类型的最大值，即辅助参数
      thresholdNumArr[1],
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
      thresholdNumArr[1],
      // 阈值maxVal：主参数
      thresholdNumArr[0],
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
  // 报错处理
  console.log("slideContour()方法出错：", error)
  my.dialog({
    theme: "danger",
    header: "轮廓查找操作报错",
    body: error.message
  })
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
  if (isDetermine) { try {
    // 加载框
    my.loading("正在存储轮廓坐标...")
    // 所有轮廓点的数组
    const allContourPoints = []
    // 用于收集所有轮廓点的最小值，先用canvas的高度初始化（即最大值）
    let minY = canvasRef.value.height
    // 遍历所有轮廓点
    for (let i = 0; i < metVectorContours.size(); i++) {
      // 挨个获取轮廓
      const contour = metVectorContours.get(i)
      for (let j = 0; j < contour.rows; j++) {
        // 接X和Y坐标
        const pointX = contour.data32S[j * 2]
        const pointY = contour.data32S[j * 2 + 1]
        // 装箱
        allContourPoints.push([pointX, pointY])
        // 如果y坐标小于minY，则更新minY
        if (pointY < minY) { minY = pointY }
      }
      // 删除轮廓释放内存
      contour.delete()
    }
    console.log("allContourPoints", allContourPoints)
    console.log("minY", minY)
    // 状态机切换到4
    // taskStatusRef.value = 4
    // 停止加载框
    my.loading(false)
  } catch (error) {
    // 停止加载框
    my.loading(false)
    // 报错处理
    console.log("makeContour()方法isDetermine分支出错：", error)
    my.dialog({
      theme: "danger",
      header: "存储轮廓坐标操作报错",
      body: error.message
    })
  }}
  // 完毕，销毁相关对象以回收内存
  // 销毁轮廓AOA数组
  metVectorContours.delete()
  // 销毁轮廓层次结构
  metHierarchy.delete()
  // 销毁画布
  contoursHandleMat.delete()
} catch (error) {
  // 报错处理
  console.log("makeContour()方法出错：", error)
  throw Error(error)
}}

/**
 * 轮廓粗细调的切换
 */
function contourCoarseToggle() {
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
    thresholdNumArrRef.value = thresholdNumArr
    // 更新标记：则切换为粗调
    isContourCoarseRef.value = true
  // 如果目前是粗调，要改为细调
  } else {
    // 刷新细调滑块
    refreshContourFineSlider()
    // 更新标记：切换为细调
    isContourCoarseRef.value = false
  }
}

/**
 * 刷新细调滑块
 * @param { Boolean } [isContourCoarse = false] 是否是粗调。如果是粗调，则直接退出
 */
function refreshContourFineSlider(isContourCoarse = false) { try {
  // 如果目前是粗调状态，则直接返回即可
  if (isContourCoarse === true) {
    return
  }
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
  thresholdNumArrRef.value = thresholdNumArr
} catch (error) {
  throw Error(error)
}}

/**
 * 设置截距的回调方法
 * @param { Number[] } baselineNumArr 阈值数组
 * @param { Boolean } [isDetermine = false] 是否确定轮廓
 * 截距直接就是细调模式，通过点击canvas来粗调，然后用滑块来细调
 */
function slideBaseline(baselineNumArr, isDetermine = false) { try {




} catch (error) {
  // 报错处理
  console.log("slideBaseline()方法出错：", error)
  my.dialog({
    theme: "danger",
    header: "截距设置操作报错",
    body: error.message
  })
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
