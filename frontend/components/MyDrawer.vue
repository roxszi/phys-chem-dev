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
  /** 标题内容 */
  title?: string
  /** 底部按钮文字 */
  buttonText?: string
  /** 是否在父组件呈现 */
  isAttached?: boolean
  /** 尺寸 */
  size?: string
  /** 是否可拖动 */
  isSizeDraggable?: boolean
}

/** 组件传参 */
const props = withDefaults(defineProps<MyDrawerProps>(), {
  buttonText: "关闭抽屉",
  isAttached: false,
  size: "80%",
  isSizeDraggable: false,
})

</script>


<!--
  视图层
 -->
<template>
  <!-- t-drawer实现 -->
  <t-drawer
    v-model:visible="visibleModel"
    :showInAttachedElement="props.isAttached"
    :size="props.size"
    :sizeDraggable="props.isSizeDraggable"
    :cancelBtn="null"
    :closeBtn="false"
    :closeOnEscKeydown="false"
    :closeOnOverlayClick="true"
    :confirmBtn="null"
    :destroyOnClose="false"
    :lazy="true"
    mode="overlay"
    placement="right"
    :preventScrollThrough="true"
    :showOverlay="true"
  >
    <!-- 标题文字 -->
    <template #header>{{ props.title }}</template>
    <!-- 主体内容 -->
    <template #body>
      <!-- <h3 class="t-drawer__title">📈 拟合数据</h3> -->
      <!-- 内容容器 -->
      <div class="my-drawer">
        <slot />
      </div>
    </template>
    <!-- 页脚 -->
    <template #footer>
      <!-- “关闭抽屉”按钮 -->
      <MyButton
        :ghost="true"
        size="large"
        @click="(visibleModel = false)"
      >
        {{ props.buttonText }}
      </MyButton>
    </template>
  </t-drawer>
</template>
