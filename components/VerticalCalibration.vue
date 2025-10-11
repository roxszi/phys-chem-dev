<!--
  垂直校准组件 Vertical Calibration
  用于校准手机设备的垂直方向。最有的垂直方向是垂直 + 微微前倾（微微俯视）。实现思路为：
  1.  使用VueUse的运动传感器方法useDeviceMotion()实现重力感应
      使用VueUse的方向传感器方法useDeviceOrientation()实现方向感应
      方向传感器如果支持地磁传感器，也会调用地磁传感器
  2.  如果有地磁，则优先方向
      如果无地磁，但是有方向和重力，则优先重力，辅以方向
      如果无地磁，方向和重力也只有其一，那么就有啥用啥
 -->

<!--
  视图层
 -->
<template>

<!-- 布局模板容器。条件渲染：默认无权限时渲染 -->
<MySpace v-if="!permissionGranted">

  <!-- 警报框 -->
  <t-alert
    theme="info" :title="lang.FunctionIntroductionTitle"
  >
    {{ lang.FunctionIntroductionContent }}
  </t-alert>

  <MyButton @click="ensurePermissions">
    {{ lang.CallSensorButtonLabel }}
  </MyButton>

</MySpace>

<!-- 布局模板容器。条件渲染：有权限时渲染 -->
<MySpace v-else>

  <!-- 重力感应警报框 -->
  <t-alert
    v-if="isMotionSupported"
    theme="info" :title="lang.MotionSensorIntroductionTitle"
  >
    <div v-for="(content, index) of lang.MotionSensorIntroductionContent" :key="index">
      {{ content }}
    </div>
  </t-alert>

  <!-- 方向感应警报框 -->
  <t-alert
    v-if="isOrientationSupported"
    theme="info" :title="lang.OrientationSensorIntroductionTitle"
  >
    <div v-for="(content, index) of lang.OrientationSensorIntroductionContent" :key="index">
      {{ content }}
    </div>
  </t-alert>

  <!-- 操作建议警报框：有地磁传感器 -->
  <t-alert
    v-if="isGeomagneticSupported"
    theme="warning" :title="lang.OperationSuggestionIntroductionTitle"
  >
    {{ lang.OperationSuggestionGeomagneticIntroductionContent }}
  </t-alert>

  <!-- 操作建议警报框：无地磁传感器，但有重力传感器和运动传感器 -->
  <t-alert
    v-else-if="isMotionSupported && isOrientationSupported"
    theme="warning" :title="lang.OperationSuggestionIntroductionTitle"
  >
    {{ lang.OperationSuggestionNonGeomagneticIntroductionContent }}
  </t-alert>

  <!-- 重力感应数据 -->
  <div class="center">
    <table ref="tableRef">
      <!-- 表头 -->
      <thead>
        <tr>
          <th :colspan="2">{{ lang.GravityTableHead[0] }}</th>
          <th :colspan="2">{{ lang.GravityTableHead[1] }}</th>
        </tr>
      </thead>
      <!-- 表格体 -->
      <tbody>
        <tr>
          <td>{{ lang.GravityTableData[0][0] }}</td>
          <td>{{ accelerationThrottled.x === null ? "N/A" : accelerationThrottled.x.toFixed(1) }}</td>
          <td>{{ lang.GravityTableData[1][0] }}</td>
          <td>{{ orientationAlphaThrottled === null ? "N/A" : orientationAlphaThrottled.toFixed(1) }}</td>
        </tr>
        <tr>
          <td>{{ lang.GravityTableData[0][1] }}</td>
          <td>{{ accelerationThrottled.y === null ? "N/A" : acceleration.y.toFixed(1) }}</td>
          <td>{{ lang.GravityTableData[1][1] }}</td>
          <td>{{ orientationBetaThrottled === null ? "N/A" : orientationBeta.toFixed(1) }}</td>
        </tr>
        <tr>
          <td>{{ lang.GravityTableData[0][2] }}</td>
          <td>{{ accelerationThrottled.z === null ? "N/A" : acceleration.z.toFixed(1) }}</td>
          <td>{{ lang.GravityTableData[1][2] }}</td>
          <td>{{ orientationGammaThrottled === null ? "N/A" : orientationGamma.toFixed(1) }}</td>
        </tr>
        <!-- 地磁传感器 -->
        <tr v-if="isGeomagneticSupported">
          <th :colspan="2">{{ lang.GeomagneticLabel }}</th>
          <td :colspan="2">{{ isGeomagneticSupported ? lang.SupportedLabel : lang.NotSupportedLabel }}</td>
        </tr>
        <!-- 备注 -->
        <tr
          v-if="
            (accelerationThrottled.x === null)
              && (accelerationThrottled.y === null)
              && (accelerationThrottled.z === null)
              && (orientationAlphaThrottled === null)
              && (orientationBetaThrottled === null)
              && (orientationGammaThrottled === null)
          "
        >
          <th :colspan="4">{{ lang.NotSupportedAllLabel }}</th>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 结束校准按钮 -->
  <MyButton @click="permissionGranted = false">
    {{ lang.EndButtonLabel }}
  </MyButton>

</MySpace>

</template>


<!--
  逻辑层
 -->
<script setup>
// 从vue库导入生命周期钩子
import { onMounted, shallowRef, watch, nextTick } from "vue"
// 从vueuse库导入运动传感器和方向传感器
import { useDeviceMotion, useDeviceOrientation, refThrottled } from "@vueuse/core"
// 导入自有方法
import my from "@/utils/myFunc.js"
// 导入语言包
import { langAll, useData } from "./VerticalCalibration-lang.js"

/** 语言包，默认"root"，即中文 @type { import("vue").ShallowRef<Object> }  */
const lang = shallowRef(langAll.root)

// 解构接收运动感应的各类数据
const {
  // 是否有权限：默认都是false
  // 以此作为v-if条件渲染的依据，因此不能放在onMounted()中
  permissionGranted,
  // 是否需要请求权限
  // requirePermissions: isRequirePermissions,
  // 请求权限方法
  ensurePermissions,
  // 设备是否支持重力感应
  isSupported: isMotionSupported,
  // 设备在X、Y、Z三轴上的加速度（含重力加速度）
  // x：手机左右的加速度，左为正
  // y：手机垂直的加速度，正立为正
  // z：手机躺平的加速度，躺平（俯视）为正
  accelerationIncludingGravity: acceleration,
} = useDeviceMotion()

// 解构接收方向感应的各类数据
// 方向感应事实上也需要请求权限，但是VueUse在useDeviceOrientation这里没集成
// 所以依赖useDeviceMotion的ensurePermissions()方法
const {
  // 设备是否支持方向感应
  isSupported: isOrientationSupported,
  // 是否支持绝对方向（磁力计）
  // 亦即设备是否支持/配备使用地磁传感器获取绝对方向
  isAbsolute: isGeomagneticSupported,
  // 方向感应：Z轴（XY平面）
  alpha: orientationAlpha,
  // 方向感应：X轴（YZ平面）
  beta: orientationBeta,
  // 方向感应：Y轴（XZ平面）
  gamma: orientationGamma,
} = useDeviceOrientation()

// 节流处理
const accelerationThrottled = refThrottled(acceleration, 1000)
const orientationAlphaThrottled = refThrottled(orientationAlpha, 1000)
const orientationBetaThrottled = refThrottled(orientationBeta, 1000)
const orientationGammaThrottled = refThrottled(orientationGamma, 1000)

// 获取表格引用
const tableRef = shallowRef(null)

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

// 生命周期钩子，SSG的SPA化实现，组件挂载后执行
// 用于进行必要的各类初始化操作
onMounted(() => { try {
  // 语言刷新。获取当前语言
  const localeIndexValue = useData().localeIndex.value
  // 如果当前语言不是默认语言
  if (localeIndexValue !== "root") {
    // 则以当前语言刷新语言包
    lang.value = langAll[localeIndexValue]
  }

  // 获取硬件权限后，保持数据表格滚动到视图中间
  watch(permissionGranted, nextTickFocusOnTable)
} catch (error) {
  my.error("onMounted()报错：", error, errorDialog)
}})

/**
 * 获取硬件权限后，保持数据表格滚动到视图中间
 */
function nextTickFocusOnTable(newPermissionGrantedValue) {
  // 如果权限为false，则不执行
  if (!newPermissionGrantedValue) { return }
  // 下个渲染周期执行focusOnCanvas()
  nextTick(focusOnTable).catch((error) => {
    my.error("nextTickFocusOnCanvas()报错：", error, errorDialog)
  })
  /**
   * 聚焦table的内部方法
   */
  function focusOnTable() {
    // 接参数
    const table = tableRef.value
    // 滚动到canvas
    table.scrollIntoView({
      // 平滑滚动
      behavior: "smooth",
      // 垂直中心对齐
      block: "center",
      // 水平就近对齐
      inline: "nearest"
    })
  }
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