"use strict"

/**
 * @接触角测量模块的语言包
 */

// 从VitePress导出用户数据方法，便于在运行时实现多语言切换
export { useData } from "vitepress"

// 定义并导出语言包
const root = {}
const en = {}
export const langAll = { root, en }

// ----语言包内容----

root.FunctionIntroductionTitle = "功能简介"
en.FunctionIntroductionTitle = "Function Introduction"

root.FunctionIntroductionContent = "检查并调用设备的各类传感器，以辅助完成设备垂直校准操作。"
en.FunctionIntroductionContent = "Check and call the various sensors of the device to assist in the vertical calibration of the device."

root.CallSensorButtonLabel = "调用传感器"
en.CallSensorButtonLabel = "Call Sensor"

root.MotionSensorIntroductionTitle = "运动传感器"
en.MotionSensorIntroductionTitle = "Motion Sensor"

root.MotionSensorIntroductionContent = [
  "运动传感器可捕捉设备在X、Y、Z三个方向的加速度分量。",
  "确保Y方向的分量尽可能最大。",
  "确保Z方向的分量尽可能接近或略微大于0。"
]
en.MotionSensorIntroductionContent = [
  "The motion sensor can capture the acceleration components of the device in the X, Y, and Z directions.",
  "Ensure that the Y-axis component is as large as possible.",
  "Ensure that the Z-axis component is as close to or slightly greater than 0."
]

root.OrientationSensorIntroductionTitle = "方向传感器"
en.OrientationSensorIntroductionTitle = "Orientation Sensor"

root.OrientationSensorIntroductionContent = [
  "方向传感器可捕捉设备在alpha、beta、gamma三个轴面上的旋转角度。",
  "确保beta轴的角度尽可能接近或略微小于90°。"
]
en.OrientationSensorIntroductionContent = [
  "The orientation sensor can capture the rotation angles of the device on the alpha, beta, and gamma axes.",
  "Ensure that the angle of the beta axis is as close to or slightly less than 90°."
]

root.OperationSuggestionIntroductionTitle = "操作建议"
en.OperationSuggestionIntroductionTitle = "Operation Suggestion"

root.OperationSuggestionGeomagneticIntroductionContent = "您的设备配备有地磁传感器，可获得地磁校准的方向感应数据。建议您使用方向感应数据进行垂直校准。"
en.OperationSuggestionGeomagneticIntroductionContent = "Your device is equipped with a geomagnetic sensor, which can obtain the direction of the data for magnetic calibration. It is recommended that you use the direction of the data for vertical calibration."

root.OperationSuggestionNonGeomagneticIntroductionContent = "在设备同时配备有重力传感器和运动传感器时，建议以重力感应数据为主、以方向感应数据为辅，进行垂直校准。"
en.OperationSuggestionNonGeomagneticIntroductionContent = "When the device is equipped with both gravity sensors and motion sensors, it is recommended to use gravity sensor data as the main data and direction sensor data as the auxiliary data for vertical calibration."

root.GravityTableHead = [
  "重力感应 (m/s²)",
  "方向感应 (°)"
]
en.GravityTableHead = [
  "Gravity Sensor (m/s²)",
  "Orientation Sensor (°)"
]

root.GravityTableData = [
  ["X方向:", "Y方向:", "Z方向:"],
  ["Alpha轴:", "Beta轴:", "Gamma轴:"]
]
en.GravityTableData = [
  ["X-axis:", "Y-axis:", "Z-axis:"],
  ["Alpha axis:", "Beta axis:", "Gamma axis:"]
]

root.GeomagneticLabel = "地磁传感器"
en.GeomagneticLabel = "Geomagnetic Sensor"

root.SupportedLabel = "支持"
en.SupportedLabel = "Supported"

root.NotSupportedLabel = "不支持"
en.NotSupportedLabel = "Not Supported"

root.NotSupportedAllLabel = "传感器不支持，请更换手机。"
en.NotSupportedAllLabel = "The sensor is not supported, please change the phone."

root.EndButtonLabel = "结束校准"
en.EndButtonLabel = "End Calibration"

// --------------------------

root.ErrorDialogTitle = "程序报错"
en.ErrorDialogTitle = "Program Error"

root.ErrorDialogContent = "欢迎向软件开发人员（13611580728 司承运）主动告知此bug，以便及时修复。"
en.ErrorDialogContent = "Welcome to inform the software development personnel (+8613611580728 SI_Cheng-Yun) of this bug actively so that it can be repaired in time. "
