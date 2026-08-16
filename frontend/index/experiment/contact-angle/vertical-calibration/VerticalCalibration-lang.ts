/**
 * 垂直校准组件 · 语言包
 * ---
 * 词条结构：扁平键 + 每条 `{ root, en }` 中英成对
 * - 键名用语义命名，不复制中文原文（改中文文案不必动键名）
 * - 参数符号 / 单位 / 数字 不进入语言包（如 0、255、50%、0.5）
 * - 内部开发者错误不翻译（throw new Error 类）
 * - 加第三语言（如 ja）：每条词条新增 ja 字段即可，TypeScript 会精确指出哪些未补齐
 *
 * 消费侧：const langRef = useLang(langDict) → 模板 / script 里 langRef.Xxx 即可
 */

export const langDict = {

  // ================================ 功能简介 ================================

  /** 功能简介标题 */
  FunctionIntroductionTitle: {
    root: "功能简介",
    en: "Function Introduction",
  },
  /** 功能简介正文 */
  FunctionIntroductionContent: {
    root: "检查并调用设备的各类传感器，以辅助完成设备垂直校准操作。",
    en: "Check and call the various sensors of the device to assist in the vertical calibration of the device.",
  },

  // ================================ 传感器说明 ================================

  /** 调用传感器按钮文字 */
  CallSensorButtonLabel: {
    root: "调用传感器",
    en: "Call Sensor",
  },

  /** 重力感应标题 */
  MotionSensorIntroductionTitle: {
    root: "运动传感器",
    en: "Motion Sensor",
  },
  /** 重力感应说明（数组：每行一项） */
  MotionSensorIntroductionContent: {
    root: [
      "运动传感器可捕捉设备在X、Y、Z三个方向的加速度分量。",
      "确保Y方向的分量尽可能最大。",
      "确保Z方向的分量尽可能接近或略微大于0。",
    ],
    en: [
      "The motion sensor can capture the acceleration components of the device in the X, Y, and Z directions.",
      "Ensure that the Y-axis component is as large as possible.",
      "Ensure that the Z-axis component is as close to or slightly greater than 0.",
    ],
  },

  /** 方向感应标题 */
  OrientationSensorIntroductionTitle: {
    root: "方向传感器",
    en: "Orientation Sensor",
  },
  /** 方向感应说明 */
  OrientationSensorIntroductionContent: {
    root: [
      "方向传感器可捕捉设备在alpha、beta、gamma三个轴面上的旋转角度。",
      "确保beta轴的角度尽可能接近或略微小于90°。",
    ],
    en: [
      "The orientation sensor can capture the rotation angles of the device on the alpha, beta, and gamma axes.",
      "Ensure that the angle of the beta axis is as close to or slightly less than 90°.",
    ],
  },

  // ================================ 操作建议 ================================

  /** 操作建议标题 */
  OperationSuggestionIntroductionTitle: {
    root: "操作建议",
    en: "Operation Suggestion",
  },
  /** 操作建议正文：配备地磁传感器时 */
  OperationSuggestionGeomagneticIntroductionContent: {
    root: "您的设备配备有地磁传感器，可获得地磁校准的方向感应数据。建议您使用方向感应数据进行垂直校准。",
    en: "Your device is equipped with a geomagnetic sensor, which can obtain the direction of the data for magnetic calibration. It is recommended that you use the direction of the data for vertical calibration.",
  },
  /** 操作建议正文：无地磁传感器，但有重力和运动传感器 */
  OperationSuggestionNonGeomagneticIntroductionContent: {
    root: "在设备同时配备有重力传感器和运动传感器时，建议以重力感应数据为主、以方向感应数据为辅，进行垂直校准。",
    en: "When the device is equipped with both gravity sensors and motion sensors, it is recommended to use gravity sensor data as the main data and direction sensor data as the auxiliary data for vertical calibration.",
  },

  // ================================ 数据表格 ================================

  /** 表格表头 */
  GravityTableHead: {
    root: [
      "重力感应 (m/s²)",
      "方向感应 (°)",
    ],
    en: [
      "Gravity Sensor (m/s²)",
      "Orientation Sensor (°)",
    ],
  },
  /** 表格数据标签（X/Y/Z + α/β/γ） */
  GravityTableData: {
    root: [
      ["X", "Y", "Z"],
      ["α", "β", "γ"],
    ],
    en: [
      ["X", "Y", "Z"],
      ["α", "β", "γ"],
    ],
  },
  /** 地磁传感器标签 */
  GeomagneticLabel: {
    root: "地磁传感器",
    en: "Geomagnetic Sensor",
  },
  /** 支持标签 */
  SupportedLabel: {
    root: "支持",
    en: "Supported",
  },
  /** 不支持标签 */
  NotSupportedLabel: {
    root: "不支持",
    en: "Not Supported",
  },
  /** 完全不支持传感器时的提示 */
  NotSupportedAllLabel: {
    root: "传感器不支持，请更换手机。",
    en: "The sensor is not supported, please change the phone.",
  },

  // ================================ 结束 ================================

  /** 结束校准按钮文字 */
  EndButtonLabel: {
    root: "结束校准",
    en: "End Calibration",
  },

  // ================================ 错误 ================================

  /** 错误对话框标题 */
  ErrorDialogTitle: {
    root: "程序报错",
    en: "Program Error",
  },
  /** 错误对话框正文 */
  ErrorDialogContent: {
    root: "欢迎向软件开发人员（13611580728 司承运）主动告知此bug，以便及时修复。",
    en: "Welcome to inform the software development personnel (+8613611580728 SI_Cheng-Yun) of this bug actively so that it can be repaired in time.",
  },
}