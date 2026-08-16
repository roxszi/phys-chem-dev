/**
 * 前端自用插件
 * myLoading、myDialog、myMessage、myError、myWait
 */

// 导入TDesign插件
import { LoadingPlugin, DialogPlugin, MessagePlugin } from "tdesign-vue-next"
// 导入数据类型
import type { LoadingInstance, DialogInstance } from "tdesign-vue-next"

/**
 * 全局对象
 * 为防止内存泄漏，全局只有一个Loading实例
 * 通过import导入时，会全局共享同一个实例
 */
const myPluginObj: {
  loadingInstance: LoadingInstance | undefined,
  dialogInstance: DialogInstance | undefined
} = {
  loadingInstance: undefined,
  dialogInstance: undefined
}


/**
 * “加载中”
 * @param text 文案
 * @note 会读写全局对象myPluginObj.loadingInstance
 */
export function myLoading(text?: (string | false)) {
  // 如果已有Loading实例，则先关闭
  myPluginObj.loadingInstance?.hide()
  // 如果传参不是false，则创建Loading实例
  if (text !== false) {
    // 创建Loading实例，赋值给全局对象
    myPluginObj.loadingInstance = LoadingPlugin({
      // 延迟（毫秒）
      delay: 300,
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
      size: "20%",
      // 文案
      text: text,
      // 层级
      zIndex: 3500
    })
  }
}


/** 对话框的传参的数据类型 */
interface MyDialogParam {
  /** 对话框风格，默认info */
  theme?: "default" | "info" | "warning" | "danger" | "success"
  /** 标题 */
  header?: string
  /** 内容 */
  body: string
  /** 确认按钮的文字内容 */
  confirmBtn?: string
  /** 取消按钮的文字内容 */
  cancelBtn?: string
  /** 确认回调 */
  onConfirmCallBack?: ((context: { e: MouseEvent | KeyboardEvent }) => void)
}
/**
 * 对话框
 * @param myDialogParam 参数
 */
export function myDialog(myDialogParam: MyDialogParam | string) {
  // 如果已有dialog实例，则先关闭并销毁
  myPluginObj.dialogInstance?.destroy()
  // 如果传参是字符串，则直接赋值给body
  if (typeof myDialogParam === "string") {
    myDialogParam = { body: myDialogParam }
  }
  // 解构赋值获取传参
  const {
    theme = "info",
    header,
    body,
    confirmBtn = undefined,
    onConfirmCallBack = () => { },
  } = myDialogParam
  // 取消按钮要独立处理：如果没有确认回调，那就不用显示了
  const cancelBtn =
    myDialogParam.onConfirmCallBack
      ? myDialogParam.cancelBtn
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
    onConfirm: (context) => {
      // 回调传参
      onConfirmCallBack(context)
      // 销毁对话框
      myPluginObj.dialogInstance?.destroy()
    },
    // 点击蒙层
    // onOverlayClick: undefined
  })
}


/**
 * 提示框
 * @param content 内容
 * @param theme 对话框风格
 */
export function myMessage(
  content: string,
  theme: ("info" | "success" | "warning" | "error" | "loading") = "info"
) {
  // 调用TDesign的MessagePlugin方法
  MessagePlugin(
    // 组件风格
    theme,
    {
      // 关闭按钮
      closeBtn: false,
      // 内容
      content: content,
      // 图标
      icon: true,
      // 位置：居中
      placement: "center",
    },
    // 显示时长
    1500
  )
}


/**
 * 报错处理方法
 * @param err 错误内容
 * @param _instance vue实例
 * @param info 错误信息
 * @note 对于异步Promise错误，要用 `.catch(myError)` 捕获处理
 */
export function myError(err: unknown, _instance?: unknown, info?: string) {
  // 打印错误信息
  console.error(`【程序报错】\n报错消息：${ info }\n报错内容：${ err }`)
  // 标题
  const header = "程序报错"
  // 内容
  const body =
    (info === undefined)
      ? `请截图并联系司承运：${ err }`
      : `请截图并联系司承运：[${ info }] - ${ err }`
  // 显式报错
  DialogPlugin({
    // 对话框模式：模态框
    mode: "modal",
    // 位置：居中
    placement: "center",
    // 主题：信息
    theme: "danger",
    // 关闭按钮：不显示
    closeBtn: false,
    // 关闭即销毁
    destroyOnClose: true,
    // 对话框标题
    header: header,
    // 对话框内容
    body: body,
    // 页脚内容，即按钮
    footer: false,
    // 回车即确认
    confirmOnEnter: false
  })
  // 如果有加载框，就关闭
  myLoading(false)
}


/**
 * 等待方法
 * @param ms 等待时间，单位为毫秒
 */
export async function myWait(ms: number) {
  // 以Promise对象强行异步等待
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
