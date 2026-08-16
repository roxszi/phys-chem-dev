<!--
  垂直校准组件 Vertical Calibration
  用于校准手机设备的垂直方向。最优的垂直方向是垂直 + 微微前倾（微微俯视）。实现思路为：
  1.  使用VueUse的运动传感器方法useDeviceMotion()实现重力感应
      使用VueUse的方向传感器方法useDeviceOrientation()实现方向感应
      方向传感器如果支持地磁传感器，也会调用地磁传感器
  2.  如果有地磁，则优先方向
      如果无地磁，但是有方向和重力，则优先重力，辅以方向
      如果无地磁，方向和重力也只有其一，那么就有啥用啥

  i18n 说明：
  - 业务文案走 langRef（由 ./VerticalCalibration-lang.ts + composables/useLang.ts 派生）
  - 数字字面量（0、255、阈值上下限、步长等）不进语言包
  - 内部开发者错误（throw new Error）不翻译
  - 全局工具（myLoading / myMessage / myError / myDialog / myWait）由 unplugin-auto-import 自动注入，无需 import
-->


<!--
  视图层
 -->
<template>

<!-- 布局模板容器。条件渲染：默认无权限时渲染 -->
<div v-if="!permissionGranted" class="my-column">

  <!-- 警报框 -->
  <MyNoticeBar :title="langRef.FunctionIntroductionTitle" theme="info">
    <p>{{ langRef.FunctionIntroductionContent }}</p>
  </MyNoticeBar>

  <MyButton @click="ensurePermissions">
    {{ langRef.CallSensorButtonLabel }}
  </MyButton>

</div>

<!-- 布局模板容器。条件渲染：有权限时渲染 -->
<div v-else class="my-column">

  <!-- 重力感应警报框 -->
  <MyNoticeBar
    v-if="isMotionSupported"
    :title="langRef.MotionSensorIntroductionTitle"
    theme="info"
  >
    <p
      v-for="(content, index) of langRef.MotionSensorIntroductionContent"
      :key="index"
    >
      {{ content }}
    </p>
  </MyNoticeBar>

  <!-- 方向感应警报框 -->
  <MyNoticeBar
    v-if="isOrientationSupported"
    :title="langRef.OrientationSensorIntroductionTitle"
    theme="info"
  >
    <p
      v-for="(content, index) of langRef.OrientationSensorIntroductionContent"
      :key="index"
    >
      {{ content }}
    </p>
  </MyNoticeBar>

  <!-- 操作建议警报框：有地磁传感器 -->
  <MyNoticeBar
    v-if="isGeomagneticSupported"
    :title="langRef.OperationSuggestionIntroductionTitle"
    theme="warning"
  >
    <p>{{ langRef.OperationSuggestionGeomagneticIntroductionContent }}</p>
  </MyNoticeBar>

  <!-- 操作建议警报框：无地磁传感器，但有重力传感器和运动传感器 -->
  <MyNoticeBar
    v-else-if="isMotionSupported && isOrientationSupported"
    :title="langRef.OperationSuggestionIntroductionTitle"
    theme="warning"
  >
    <p>{{ langRef.OperationSuggestionNonGeomagneticIntroductionContent }}</p>
  </MyNoticeBar>

  <!-- 重力感应数据 -->
  <div class="my-column my-center">
    <table ref="tableRef">
      <!-- 表头 -->
      <thead>
        <tr>
          <th :colspan="2">{{ langRef.GravityTableHead[0] }}</th>
          <th :colspan="2">{{ langRef.GravityTableHead[1] }}</th>
        </tr>
      </thead>
      <!-- 表格体 -->
      <tbody>
        <tr>
          <td>{{ langRef.GravityTableData[0]![0] }}</td>
          <td>{{ accelerationThrottled?.x === null ? "N/A" : accelerationThrottled?.x.toFixed(1) }}</td>
          <td>{{ langRef.GravityTableData[1]?.[0] }}</td>
          <td>{{ orientationAlphaThrottled === null ? "N/A" : orientationAlphaThrottled.toFixed(1) }}</td>
        </tr>
        <tr>
          <td>{{ langRef.GravityTableData[0]![1] }}</td>
          <td>{{ accelerationThrottled?.y === null ? "N/A" : accelerationThrottled?.y.toFixed(1) }}</td>
          <td>{{ langRef.GravityTableData[1]?.[1] }}</td>
          <td>{{ orientationBetaThrottled === null ? "N/A" : orientationBetaThrottled.toFixed(1) }}</td>
        </tr>
        <tr>
          <td>{{ langRef.GravityTableData[0]![2] }}</td>
          <td>{{ accelerationThrottled?.z === null ? "N/A" : accelerationThrottled?.z.toFixed(1) }}</td>
          <td>{{ langRef.GravityTableData[1]?.[2] }}</td>
          <td>{{ orientationGammaThrottled === null ? "N/A" : orientationGammaThrottled.toFixed(1) }}</td>
        </tr>
        <!-- 地磁传感器 -->
        <tr v-if="isGeomagneticSupported">
          <th :colspan="2">{{ langRef.GeomagneticLabel }}</th>
          <td :colspan="2">{{ isGeomagneticSupported ? langRef.SupportedLabel : langRef.NotSupportedLabel }}</td>
        </tr>
        <!-- 备注 -->
        <tr v-if="isNotSupportedAllRef">
          <th :colspan="4">{{ langRef.NotSupportedAllLabel }}</th>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 结束校准按钮 -->
  <MyButton @click="permissionGranted = false">
    {{ langRef.EndButtonLabel }}
  </MyButton>

</div>

</template>


<!--
  逻辑层
 -->
<script setup lang="ts">
// 导入VueUse的运动传感器和方向传感器
import { useDeviceMotion, useDeviceOrientation, refThrottled } from "@vueuse/core"
// 导入本组件语言包
import { langDict } from "./VerticalCalibration-lang.ts"

// 派生当前语言的响应式语言包（root / en）
const langRef = useLang(langDict)

// 解构接收运动感应的各类数据
const {
  // 是否有权限：默认都是false
  // 以此作为v-if条件渲染的依据，因此不能放在onMounted()中
  permissionGranted,
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
const accelerationThrottled = refThrottled(acceleration, 500)
const orientationAlphaThrottled = refThrottled(orientationAlpha, 500)
const orientationBetaThrottled = refThrottled(orientationBeta, 500)
const orientationGammaThrottled = refThrottled(orientationGamma, 500)

// 获取表格引用
const tableRef = useTemplateRef("tableRef")
// “是否其实并不支持”标记
const isNotSupportedAllRef = shallowRef(false)

// 获取硬件权限后，保持数据表格滚动到视图中间
watch(permissionGranted, watchPermissionGrantedHandle)

/**
 * 获取硬件权限后：
 * 1.  更新“是否支持”标记
 * 2.  保持数据表格滚动到视图中间
 */
function watchPermissionGrantedHandle(newPermissionGrantedValue: boolean) {
  // 如果权限为false，则不执行
  if (!newPermissionGrantedValue) { return }
  // 更新“是否其实并不支持”标记
  if (
      (acceleration.value?.x === null)
      && (acceleration.value?.y === null)
      && (acceleration.value?.z === null)
      && (orientationAlpha.value === null)
      && (orientationBeta.value === null)
      && (orientationGamma.value === null)
  ) {
    isNotSupportedAllRef.value = true
  } else {
    isNotSupportedAllRef.value = false
  }
  // 下个渲染周期执行focusOnTable()
  nextTick(focusOnTable)
  /**
   * 聚焦table的内部方法
   */
  function focusOnTable() {
    // 滚动到table
    tableRef.value!.scrollIntoView({
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
/* 让表格内文字居中（与 .vp-doc th, td 全局样式对齐，scoped 兜底防止 vp-doc 未加载） */
td, th {
  text-align: center;
  vertical-align: middle;
}
</style>