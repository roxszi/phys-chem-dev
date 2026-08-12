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

<script setup lang="ts">
// 导入数据类型
import type { UploadFile, UploadChangeContext } from "tdesign-mobile-vue"
// 导出数据类型
export type { UploadFile, UploadChangeContext } from "tdesign-mobile-vue"

/** 组件传参 */
interface MyUploadProps {
  /**
   * 接收的文件 MIME / 后缀，如 "image/*"。不填则默认接收全部
   * 详见1：https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/input/file
   * 详见2：https://www.w3schools.com/tags/att_input_accept.asp
   */
  accept?: string
  /** 上传按钮文字 */
  addContent?: string
  /** 最多文件数（默认 1：单文件场景） */
  max?: number
  /** 是否禁用（默认false） */
  disabled?: boolean
  /** 文件变更回调 */
  onChange?: (files: UploadFile[], context: UploadChangeContext) => void
}

/** 组件传参 */
const props = withDefaults(defineProps<MyUploadProps>(), {
  addContent: "+",
  max: 1,
  disabled: false,
})

/** 文件内容双向绑定 */
const filesModel = defineModel<UploadFile[]>("files", { required: true })

/** 是否多选 */
const isMultipleComputed = computed(() => (props.max !== 1))

</script>


<!--
  视图层
-->
<template>
  <!-- t-upload 实现 -->
  <t-upload
    v-model:files="filesModel"
    :autoUpload="false"
    :disabled="props.disabled"
    :multiple="isMultipleComputed"
    theme="list"
    :max="props.max"
    :accept="props.accept"
    :onChange="props.onChange"
  >
    <!-- 插槽：“添加”内容 -->
    <template #addContent>
      <!-- 以button实现添加按钮 -->
      <MyButton :disabled="props.disabled">
        {{ props.addContent }}
      </MyButton>
    </template>
  </t-upload>
</template>
