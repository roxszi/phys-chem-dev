<!-- 
  自用抽屉组件
  其实就是tDrawer的封装，但是做了修改
  tDrawer的有用区只有“sidebar”区，可是是“sidebar”区没有“slot”插槽，所以封装一下
 -->

<!--
  逻辑层
 -->
<script setup lang="ts">
/** 双相绑定传参：visible */
const visibleModel = defineModel<boolean>("visible", { default: false })

/** 本组件的传参数据类型 */
interface MyDrawerProps {
  /** 标题 */
  title?: string
  /** 按钮文字 */
  buttonText?: string
}

/** 组件传参 */
const props = withDefaults(defineProps<MyDrawerProps>(), {
  /** 按钮文字 */
  buttonText: "关闭抽屉"
})

</script>


<!--
  视图层
 -->
<template>
<!-- t-drawer实现 -->
<t-drawer v-model:visible="visibleModel">

  <!-- 标题文字 -->
  <template #title>{{ props.title }}</template>

  <!-- <h3 class="t-drawer__title">📈 拟合数据</h3> -->

  <!-- 内容区 -->
  <div class="my-drawer">
    <slot></slot>
  </div>

  <!-- 页脚 -->
  <template #footer>
    <MyButton
      :block="false"
      variant="outline"
      size="small"
      @click="visibleModel = false"
    >
      {{ props.buttonText }}
    </MyButton>
  </template>

</t-drawer>
</template>
