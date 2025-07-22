<!-- 
  自用按钮开关组件
  其实就是tSwitch的封装
 -->


<!--
  视图层
 -->
<template>
  <!-- 子元素居中 -->
  <div class="center">
    <!-- 把左右文字、开关融合成一个子元素 -->
    <div>
      {{ props.leftLabel }}
      <t-switch
        v-model="valueModel"
        @change="onChange"
        :defaultValue="props.defaultValue"
        :disabled="props.disabled"
        :loading="props.loading"
        :size="props.size"
        :label="props.switchLabel"
      />
      {{ props.rightLabel }}
    </div>
  </div>
</template>

<!--
  逻辑层
 -->
<script setup>
/**
 * i18n
 */
// import { useData } from "vitepress"
// const { lang, localeIndex } =  useData()
// console.log("localeIndex：", localeIndex.value)

/**
 * 组件传参
 * @property { Boolean } [value = false] 默认值
 * @property { Boolean } [disabled = false] 是否禁用
 * @property { Boolean } [loading = false] 是否加载中
 * @property { String } [size = "large"] 尺寸。可选值：small、medium、large
 * @property { String } [LeftLabel = undefined] 左标签
 * @property { String } [RightLabel = undefined] 右标签
 * @property { String } [switchLabel = undefined] 开关标签
 */
const props = defineProps({
  // 值：需要实现双向绑定
  // 通过props传入的值是只读的，需要再额外实现v-model
  value: {
    type: Boolean,
    required: false,
    default: false,
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    required: false,
    default: false
  },
  // 是否加载中
  loading: {
    type: Boolean,
    required: false,
    default: false
  },
  // 尺寸
  size: {
    type: String,
    required: false,
    default: "large"
  },
  // 左标签
  leftLabel: {
    type: String,
    required: false,
    default: undefined
  },
  // 右标签
  rightLabel: {
    type: String,
    required: false,
    default: undefined
  },
  // 开关标签
  switchLabel: {
    type: String,
    required: false,
    default: undefined
  },
})

// 额外实现v-model
const valueModel = defineModel({
  // 先以同数据类型（Boolean类型）的值初始化
  default: false
})
// 把接收到的传参赋值（如有）
if (props.value) {
  valueModel.value = props.value
}

// 额外实现事件：change
const emit = defineEmits(["change"])
function onChange(event) {
  emit("change", event)
}


</script>
