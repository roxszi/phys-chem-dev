/**
 * 前端自用插件
 * myLoading、myDialog、myMessage、myError、myWait
 */

// 导入TDesign插件
import { LoadingPlugin, DialogPlugin, MessagePlugin } from "tdesign-mobile-vue"
// 导入数据类型
import type { LoadingInstance } from "tdesign-mobile-vue"

/**
 * 全局对象
 * 为防止内存泄漏，全局只有一个Loading实例
 * 通过import导入时，会全局共享同一个实例
 */
const myPluginObj: {
  loadingInstance: LoadingInstance | undefined,
} = {
  loadingInstance: undefined,
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
      delay: 500,
      // 一次完整动画的周期（毫秒）
      duration: 1000,
      // 是否全屏
      fullscreen: true,
      // 是否用默认加载指示符
      indicator: true,
      // 是否继承父类颜色
      inheritColor: false,
      // 对齐方式 "horizontal" | "vertical"
      layout: "vertical",
      // 是否加载中
      loading: true,
      // 是否暂停动画
      pause: false,
      // 是否反向旋转
      reverse: false,
      // 尺寸 "20px"
      size: "20%",
      // 文案
      text: text,
      // 主题类型 "circular" | "spinner" | "dots"
      theme: "circular"
    })
  }
}


/** 对话框的传参的数据类型 */
interface MyDialogParam {
  /** 标题 */
  title?: string
  /** 内容 */
  content: string
  /** 确认按钮的文字内容 */
  confirmBtn?: string
  /** 取消按钮的文字内容 */
  cancelBtn?: string
  /** 确认回调 */
  onConfirmCallBack?: ((context: { e: MouseEvent }) => void)
}
/**
 * 对话框
 * @param myDialogParam 参数
 */
export function myDialog(myDialogParam: MyDialogParam | string) {
  // 根据传参类型，创建参数对象
  /** 传参对象 */
  const paramObj: MyDialogParam =
    (typeof myDialogParam === "string")
      // 传参为字符串时：
      ? {
        title: undefined,
        content: myDialogParam,
        confirmBtn: "确认",
        cancelBtn: undefined,
        onConfirmCallBack: undefined,
        // onCancelCallBack: undefined,
      }
      // 传参为对象时：
      : {
        title: myDialogParam.title,
        content: myDialogParam.content,
        confirmBtn: myDialogParam.confirmBtn ?? "确认",
        // 取消按钮要独立处理：如果没有确认回调，那就不用显示了
        cancelBtn: (!myDialogParam.onConfirmCallBack)
          ? undefined
          : (myDialogParam.cancelBtn ?? "取消")
          ,
        onConfirmCallBack: myDialogParam.onConfirmCallBack,
        // onCancelCallBack: undefined,
      }
  // 创建对话框实例
  DialogPlugin.show({
    /** 操作栏 */
    // actions: Array<ButtonProps>
    /** 多按钮排列方式 - "horizontal" | "vertical" */
    buttonLayout: "vertical",
    /** 取消按钮的文字内容 */
    cancelBtn: paramObj.cancelBtn,
    /** 是否显示关闭小叉叉 */
    closeBtn: false,
    /** 点击蒙层时是否触发关闭事件 */
    closeOnOverlayClick: false,
    /** 确认按钮的文字内容 */
    confirmBtn: paramObj.confirmBtn,
    /** 通知内容 */
    content: paramObj.content,
    /** 是否在关闭弹框的时候销毁子元素 */
    destroyOnClose: true,
    /** 防止滚动穿透 */
    preventScrollThrough: true,
    /** 是否显示遮罩层 */
    showOverlay: true,
    /** 标题 */
    title: paramObj.title,
    /** 是否显示 */
    visible: true,
    /** 宽度 */
    width: "auto",
    // 取消回调
    // onCancel: undefined,
    // 确认回调
    onConfirm: paramObj.onConfirmCallBack,
  })
}


/**
 * 提示框
 * @param content 内容
 * @param theme 对话框风格
 */
export function myMessage(
  content: string,
  theme: ("info" | "success" | "warning" | "error") = "info"
) {
  // 调用TDesign的MessagePlugin方法
  MessagePlugin[theme]({
    /** 对齐方式 - "left" | "center" */
    align: "center",
    /** 关闭按钮 */
    closeBtn: false,
    /** 内容 */
    content: content,
    /** 显示时长，毫秒 */
    duration: 1500,
    // /** 多条消息间的间距，string | number | boolean */
    // gap: 12,
    /** 图标 */
    icon: true,
    // /** 链接 */
    // link: {},
    // /** 跑马灯效果 */
    // marquee: {},
    /** 是否仅显示1条信息 */
    /** 偏移量，相对于placement的偏移量。[ 上下空出偏移量, 左右空出偏移量 ] */
    offset: [undefined, "10%"],
    single: false,
    /** 是否显示 */
    visible: true,
    defaultVisible: true,
  })
}


/**
 * 报错处理方法
 * @param errorText 报错文案
 * @param errorObj 报错对象
 * @param callBack 回调函数
 */
export function myError(
  errorText: string = "程序报错",
  errorObj: Error,
  callBack?: Function
) {
  // 先在控制台打印错误信息
  console.log(errorText, errorObj)
  // 如果有回调，则执行回调（回调的第一个参数是错误对象）
  if (callBack) {
    callBack(errorObj)
  // 否则，直接抛出错误
  } else {
    throw new Error(errorText, { cause: errorObj })
  }
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
