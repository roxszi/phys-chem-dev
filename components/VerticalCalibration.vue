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
    theme="info" title="功能简介"
  >
    检查并调用设备的各类传感器，以辅助完成设备垂直校准操作。
  </t-alert>

  <MyButton @click="ensurePermissions">
    调用传感器
  </MyButton>

</MySpace>

<!-- 布局模板容器。条件渲染：有权限时渲染 -->
<MySpace v-else>

  <!-- 重力感应警报框 -->
  <t-alert
    v-if="isMotionSupported"
    theme="info" title="重力感应"
  >
    重力传感器可捕捉设备在X、Y、Z三个方向的加速度分量。<br />
    确保Y方向的分量尽可能最大。<br />
    确保Z方向的分量尽可能接近或略微大于0。
  </t-alert>

  <!-- 方向感应警报框 -->
  <t-alert
    v-if="isOrientationSupported"
    theme="info" title="方向感应"
  >
    运动传感器可捕捉设备在alpha、beta、gamma三个轴面上的旋转角度。<br />
    确保beta轴的角度尽可能接近或略微小于90°。
  </t-alert>

  <!-- 操作建议警报框：有地磁传感器 -->
  <t-alert
    v-if="isGeomagneticSupported"
    theme="warning" title="操作建议"
  >
    您的设备配备有地磁传感器，可获得地磁校准的方向感应数据。建议您使用方向感应数据进行垂直校准。
  </t-alert>

  <!-- 操作建议警报框：无地磁传感器，但有重力传感器和运动传感器 -->
  <t-alert
    v-else-if="isMotionSupported && isOrientationSupported"
    theme="warning" title="操作建议"
  >
    在设备同时配备有重力传感器和运动传感器时，建议以重力感应数据为主、以方向感应数据为辅，进行垂直校准。
  </t-alert>

  <!-- 重力感应数据 -->
  <div class="center"><table>
    <!-- 表头 -->
    <thead>
      <tr>
        <th :colspan="2">重力感应 (m/s²)</th>
        <th :colspan="2">方向感应 (°)</th>
      </tr>
    </thead>
    <!-- 表格体 -->
    <tbody>
      <tr>
        <td>X方向:</td>
        <td>{{ acceleration.x === null ? 0 : acceleration.x.toFixed(1) }}</td>
        <td>alpha轴:</td>
        <td>{{ orientationAlpha === null ? 0 : orientationAlpha.toFixed(1) }}</td>
      </tr>
      <tr>
        <td>Y方向:</td>
        <td>{{ acceleration.y === null ? 0 : acceleration.y.toFixed(1) }}</td>
        <td>beta轴:</td>
        <td>{{ orientationBeta === null ? 0 : orientationBeta.toFixed(1) }}</td>
      </tr>
      <tr>
        <td>Z方向:</td>
        <td>{{ acceleration.z === null ? 0 : acceleration.z.toFixed(1) }}</td>
        <td>gamma轴:</td>
        <td>{{ orientationGamma === null ? 0 : orientationGamma.toFixed(1) }}</td>
      </tr>
      <!-- 地磁传感器 -->
      <tr v-if="isGeomagneticSupported">
        <th :colspan="2">地磁传感器</th>
        <td :colspan="2">{{ isGeomagneticSupported ? "支持" : "不支持" }}</td>
      </tr>
    </tbody>
  </table></div>

  <!-- 结束校准按钮 -->
  <MyButton @click="permissionGranted = false">
    结束校准
  </MyButton>

</MySpace>

</template>


<!--
  逻辑层
 -->
<script setup>
// 从vueuse库导入运动传感器和方向传感器
import { useDeviceMotion, useDeviceOrientation } from "@vueuse/core"

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