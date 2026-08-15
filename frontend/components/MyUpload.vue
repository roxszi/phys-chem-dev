<!--
  自用上传组件
  基于 tdesign-mobile-vue 的 t-upload 自封
  ---
  设计思路：
  - 只暴露"传图/传文件"必需字段：accept、files(v-model)、onChange、sizeLimit、max
  - 屏蔽业务侧不需要的复杂配置：draggable、showImageFileName、abridgeName、format、
    beforeUpload、requestMethod、headers 等 —— 业务用不到就一律不暴露，避免 API 污染
  - 默认 autoUpload=false：本项目不连后端，文件只本地读取
-->


<!--
  逻辑层
-->
<script setup lang="ts">
// 导入数据类型
import type { UploadFile, UploadChangeContext, SizeLimitObj } from "tdesign-vue-next"
// 导出数据类型
export type { UploadFile, UploadChangeContext } from "tdesign-vue-next"

/** 本组件的传参数据类型 */
interface MyUploadProps {
  /** 文件名缩略长度，如 [3, 8] 表示文件名长度为 3-8 之间时缩略显示 */
  abridgeName?: number[]
  /**
   * 接收的文件 MIME / 后缀，如 "image/*"。不填则默认接收全部
   * 详见1：https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/input/file
   * 详见2：https://www.w3schools.com/tags/att_input_accept.asp
   */
  accept?: string
  /** 组件样式 */
  theme: "image" | "file-input" | "custom"
  /** 提示文字 */
  tips?: string
  /** 最多文件数（默认 1：单文件场景） */
  max?: number
  /** 最大尺寸，单位 MB */
  sizeLimit?: number
  /** 是否禁用（默认false） */
  disabled?: boolean
  /** 文件变更回调 */
  onChange?: (files: UploadFile[], context: UploadChangeContext) => void
}

/** 组件传参 */
const props = withDefaults(defineProps<MyUploadProps>(), {
  abridgeName: () => [3, 8],
  accept: "*",
  max: 1,
  disabled: false,
})

/** 文件内容双向绑定 */
const filesModel = defineModel<UploadFile[]>("files", { required: true })

/** 是否多选 */
const isMultipleComputed = computed(() => (props.max !== 1))

/** 最大尺寸 */
const sizeLimitComputed = computed(() => (
  props.sizeLimit
  ? { size: props.sizeLimit, unit: "MB", message: `文件大小不超过 ${props.sizeLimit} MB` } as SizeLimitObj
  : undefined
))

/** 文件类型主题字典 */
const themeDict: Record<string, ("image" | "file-input" | "custom")> = {
  "image": "image",
  "file": "file-input",
  "custom": "custom",
}

</script>


<!--
  视图层
-->
<template>
  <!-- t-upload 实现 -->
  <t-upload
    v-model:files="filesModel"
    :abridgeName="props.abridgeName"
    :accept="props.accept"
    :autoUpload="false"
    :disabled="props.disabled"
    :draggable="false"
    :max="props.max"
    :multiple="isMultipleComputed"
    :showImageFileName="true"
    :sizeLimit="sizeLimitComputed"
    :theme="themeDict[props.theme]"
    :tips="props.tips"
    :onChange="props.onChange"
  >
    <!-- 插槽 -->
    <slot />
  </t-upload>
</template>
