<!-- 
  自用选框组件
  其实就是tSwitchRadio的封装
 -->


<!--
  逻辑层
 -->
<script setup lang="ts">
/**
 * 额外实现的v-model双向绑定
 * @property { number } [value = 0] 默认值
 */
const valueModel = defineModel<number>("value", {
  required: false,
  default: 0,
})


interface Props {
  /** 是否块级结构 */
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
  size?: "extra-small" | "small" | "medium" | "large"
  /** 风格 */
  theme?: "default" | "primary" | "danger" | "light"
  /** 变体 */
  variant?: "base" | "outline" | "dashed" | "text"
}

/**
 * 组件传参
 * @property { "small" | "medium" | "large" } [size = "large"] 尺寸
 * @property { string[] } radioContentArr 选框内容
 */
const props = defineProps({
  // 尺寸
  size: {
    type: String,
    required: false,
    default: "medium"
  },
  // 选框内容
  radioContentArr: {
    type: Array,
    required: true,
  }
})

// 额外实现事件：change
const emit = defineEmits(["change"])
/**
 * 选框滑动的事件回调
 * @param { Event } event 事件
 */
function onChange(event) {
  emit("change", event)
}

</script>



<!--
  视图层
 -->
<template>
  <!-- 子元素居中 -->
  <div class="center">
    <!-- 选框组 -->
    <t-radio-group
      v-model:value="valueModel"
      :size="props.size"
      @change="onChange"
    >
      <!-- 遮罩切换单选内容选框内容 -->
      <t-radio-button
        v-for="(radioContent, key) of props.radioContentArr"
        :value="key"
      >
        {{ radioContent }}
      </t-radio-button>
    </t-radio-group>
  </div>
</template>

