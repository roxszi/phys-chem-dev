<!-- 
  自用选框组件
  其实就是tSwitchRadio的封装
 -->


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


<!--
  逻辑层
 -->
<script setup>
/**
 * 组件传参
 * @property { Number } [value = 0] 默认值
 * @property { String } [size = "large"] 尺寸。可选值：small、medium、large
 * @property { String[] } radioContentArr 选框内容
 */
const props = defineProps({
  // 值：需要实现双向绑定
  // 通过props传入的值是只读的，需要再额外实现v-model
  value: {
    type: Number,
    required: false,
    default: 0,
  },
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

// 额外实现v-model
const valueModel = defineModel({
  // 先以同数据类型（Number类型）的值初始化
  default: 0
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
