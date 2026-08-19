<!-- 
  下载按钮组件
  是对tButton的二次封装，同时支持下载功能
 -->

<!--
  逻辑层
 -->
<script setup lang="ts">
/** 本组件的传参数据类型 */
interface MyDownloadProps {
  /** 要下载的ArrayBuffer */
  buffer: ArrayBuffer | null
  /** 下载文件名 */
  name: string
  /** 文件的MIME类型 */
  mime: string
  /** 是否块级结构。块级将占满一行，并默认适用上下margin */
  block?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否镂空 */
  ghost?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 按钮形状 */
  shape?: "rectangle" | "square" | "round" | "circle"
  /** 按钮尺寸 */
  size?: "small" | "medium" | "large"
  /** 风格 */
  theme?: "default" | "primary" | "danger" | "warning" | "success"
  /** 变体 */
  variant?: "base" | "outline" | "dashed" | "text"
}

/** 组件传参 */
const props = withDefaults(defineProps<MyDownloadProps>(), {
  block: true,
  disabled: false,
  ghost: false,
  loading: false,
  shape: "round",
  size: "medium",
  theme: "primary",
  variant: "base"
})

/** 样式类 */
const classStrRef = computed(() => {
  if (props.block) { return "my-margin" }
  else { return "" }
})

/** 下载链接url的ref对象 */
const herfRef = ref<string>("")

// 监听：当buffer变化时，释放旧的URL对象，建立新的URL对象
watch(
  // 监听对象：props.buffer
  () => props.buffer,
  // 回调
  (newBuffer) => {
    // 释放旧的URL对象
    revokeURL(herfRef.value)
    // 如果新的buffer存在，则生成新的URL对象
    if (newBuffer) {
      herfRef.value = URL.createObjectURL(new Blob([newBuffer], { type: props.mime }))
    }
  },
  // 立即执行一次
  { immediate: true }
)

// 组件卸载时，释放URL对象
onBeforeUnmount(() => {
  revokeURL(herfRef.value)
})

/** 卸载url资源 */
function revokeURL(url: string) {
  // 如果url存在，则释放url
  if (url) {
    URL.revokeObjectURL(url)
  }
}
</script>


<!--
  视图层
 -->
<template>
  <t-button
    :class="classStrRef"
    :block="props.block"
    :disabled="props.disabled"
    :ghost="props.ghost"
    :href="herfRef"
    :download="props.name"
    :loading="props.loading"
    :shape="props.shape"
    :size="props.size"
    :theme="props.theme"
    type="button"
    :variant="props.variant"
  >
    <!-- 插槽 -->
    <slot />
  </t-button>
</template>
