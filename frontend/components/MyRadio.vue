<!--
  自用选框组件
  其实就是tSwitchRadio的封装
-->


<!--
  逻辑层
 -->
<script setup lang="ts">
/** 本组件的传参数据类型 */
interface MyRadioProps {
  /** 尺寸 */
  size?: "small" | "medium" | "large"
  /** 选框内容 */
  radioContentArr?: string[]
  /** 选框值改变的事件回调 */
  onChange?: (checked: boolean, context: { event: Event }) => void
}

/** 组件传参 */
const props = withDefaults(defineProps<MyRadioProps>(), {
  size: "medium",
  onChange: () => {}
})

/** 值双向绑定 */
const valueModel = defineModel<number>("value", { default: 0 })
</script>


<!--
  视图层
 -->
<template>
  <!-- 子元素居中 -->
  <div class="my-column my-center">
    <!-- 选框组 -->
    <t-radio-group
      v-model:value="valueModel"
      :size="props.size"
      :onchange="onChange"
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
