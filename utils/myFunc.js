"use strict"

/**
 * 插件
 */

// 引入TDesign插件
import { LoadingPlugin, DialogPlugin, MessagePlugin } from "tdesign-vue-next"

/**
 * @全局对象
 * 为防止内存泄漏，全局只有一个Loading实例、Dialog实例
 * 通过import导入时，会全局共享同一个实例
 * @typedef { Object } MyPluginObj
 * @property { import("tdesign-vue-next").LoadingInstance | Null } loadingInstance Loading实例
 * @property { import("tdesign-vue-next").DialogInstance | Null } dialogInstance Dialog实例
 */
const myPluginObj = {
  loadingInstance: null,
  dialogInstance: null,
  test: 1
}


/**
 * “加载中”
 * @param { String | Boolean } [text = "加载中..."] 文案
 * @note 会读写全局对象myPluginObj.loadingInstance
 */
export function myLoading(text = "加载中...") {
  // 如果已有Loading实例，则先关闭
  if (myPluginObj.loadingInstance) {
    myPluginObj.loadingInstance.hide()
  }
  // 如果传参不是false，则创建Loading实例
  if (text !== false) {
    // 创建Loading实例，赋值给全局对象
    myPluginObj.loadingInstance = LoadingPlugin({
      // 延迟
      delay: 0,
      // 是否全屏
      fullscreen: true,
      // 加载指示符
      indicator: true,
      // 是否继承父类颜色
      inheritColor: false,
      // 是否加载中
      loading: true,
      // 是否防穿透
      preventScrollThrough: true,
      // 是否显示遮罩层
      showOverlay: true,
      // 尺寸
      size: "large",
      // 文案
      text: text,
      // 层级
      zIndex: 3500
    })
  }
}

/**
 * 对话框
 * @param { Object | String } paramObj 参数对象
 * @param { String } [paramObj.theme = "info"] 对话框风格：default/info/warning/danger/success
 * @param { String } [paramObj.header] 标题
 * @param { String } [paramObj.body] 内容
 * @param { String | Null } [paramObj.confirmBtn] 确认按钮文字
 * @param { String | Null } [paramObj.cancelBtn = null] 取消按钮文字
 * @param { Function } [paramObj.onConfirmCallBack = () => { }] 确认回调
 * @note 会读写全局对象myPluginObj.loadingInstance
 */
export function myDialog(paramObj) {
  // 如果已有dialog实例，则先关闭并销毁
  if (myPluginObj.dialogInstance) {
    myPluginObj.dialogInstance.destroy()
  }
  // 如果传参是字符串，则直接赋值给body
  if (typeof paramObj === "string") {
    paramObj = { body: paramObj }
  }
  // 解构赋值获取传参
  const {
    theme = "info",
    header,
    body,
    confirmBtn,
    onConfirmCallBack = () => { },
  } = paramObj
  // 取消按钮要独立处理：如果没有确认回调，那就不用显示了
  const cancelBtn = paramObj.onConfirmCallBack
    ? paramObj.cancelBtn || undefined
    : null
  // 创建对话框实例，赋值给全局对象
  myPluginObj.dialogInstance = DialogPlugin({
    // 对话框模式：模态框
    mode: "modal",
    // 位置：居中
    placement: "center",
    // 主题：信息
    theme: theme,
    // 关闭按钮：不显示
    closeBtn: false,
    // 关闭即销毁
    destroyOnClose: true,
    // 对话框标题
    header: header,
    // 对话框内容
    body: body,
    // 页脚内容，即按钮
    footer: true,
    // 确认按钮文字
    confirmBtn: confirmBtn,
    // 确认按钮loading状态
    confirmLoading: false,
    // 回车即确认
    confirmOnEnter: true,
    // 取消按钮文字
    cancelBtn: cancelBtn,
    // 取消回调
    // onCancel: undefined,
    // 确认回调
    onConfirm: () => {
      // 回调传参
      onConfirmCallBack()
      // 销毁对话框
      myPluginObj.dialogInstance.destroy()
    },
    // 点击蒙层
    // onOverlayClick: undefined
  })
}


/**
 * 提示框
 * @param { Object | String } paramObj 参数对象
 * @param { String } [paramObj.theme = "info"] 对话框风格：info/success/warning/error/question/loading
 * @param { Boolean } [paramObj.closeBtn = false] 是否显示关闭按钮
 * @param { String } paramObj.content 内容
 * @param { Number } [paramObj.duration = 1500] 显示时长
 */
export function myMessage(paramObj) {
  // 如果传参是字符串，则直接赋值给content
  if (typeof paramObj === "string") {
    paramObj = { content: paramObj }
  }
  // 解构赋值获取传参
  const {
    theme = "info",
    closeBtn = false,
    content,
    duration = 1500
  } = paramObj
  // 调用TDesign的MessagePlugin方法
  MessagePlugin(
    // 组件风格
    theme,
    {
      // 关闭按钮
      closeBtn: closeBtn,
      // 内容
      content: content,
      // 图标
      icon: true,
      // 位置：居中
      placement: "center",
    },
    // 显示时长
    duration
  )
}


// 声明一个等待方法
async function wait(ms) {
  // 以Promise对象强行异步等待
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}


/**
 * 默认导出。这里的全局导出会把“my”前缀去掉
 * @prop { Function } loading 全局加载
 * @prop { Function } dialog 全局对话框
 * @prop { Function } message 全局提示
 */
export default {
  loading: myLoading,
  dialog: myDialog,
  message: myMessage,
}
