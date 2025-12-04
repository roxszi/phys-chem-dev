/**
 * 全局类型声明文件
 */

// VUE的Ref类型，作为全局类名
type Ref<T = any> = import("vue").Ref<T>

// TDesign的命名空间
namespace TDesign {
  // 加载框实例
  type LoadingInstance = import("tdesign-vue-next").LoadingInstance
  // 对话框实例
  type DialogInstance = import("tdesign-vue-next").DialogInstance
  // 上传文件
  type UploadFile = import("tdesign-vue-next").UploadFile
}

// 将OpenCV模块的整个命名空间的数据类型作为一个别名为“CV”的类型
type CV = typeof import("@techstark/opencv-js")

// 将OpenCV模块的命名空间
namespace CV {
  // Mat对象
  type Mat = import("@techstark/opencv-js").Mat
  // MatVector对象
  type MatVector = import("@techstark/opencv-js").MatVector
  // 椭圆对象
  type Ellipse = import("@techstark/opencv-js").RotatedRect
}

