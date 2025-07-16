<!-- 
  MySpace组件
  其实就是tSpace的封装
 -->


<!--
  视图层
 -->
<template>
  <!-- TDeSign布局 -->
  <t-space
    align="center"
    direction="vertical"
    :breakLine="false"
    size="medium"
    style="width: 100%;"
  >
    <!-- 插槽 -->
    <slot></slot>
  </t-space>
</template>


<!--
  逻辑层
 -->
<script setup>
</script>
