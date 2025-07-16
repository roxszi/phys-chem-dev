<!--
  计算机视觉库的实现
 -->

<!--
  视图层
 -->
<template>


  <!-- 警告框 -->
  <t-alert
    :icon="null"
    message="这是告警框"
    theme="warning"
    :title="null"
    :max-line="2"
  />


  <!-- Dialog对话框 -->
  <MyButton
    @click="my.dialog('这是Dialog对话框')"
  >
    Dialog
  </MyButton>

  <!-- Message 全局提示 -->
  <MyButton
    @click="my.loading()"
  >
    Loading
  </MyButton>

  <!-- Message 全局提示 -->
  <MyButton
    @click="my.message('这是Message全局提示')"
  >
    Message
  </MyButton>


  <!-- Drawer 抽屉 -->
  <div>
    <MyButton @click="drawerVisible = true">
      打开Drawer抽屉侧边栏
    </MyButton>
    <t-drawer
      v-model:visible="drawerVisible"
      mode="overlay"
      placement="right"
      size="80%"
      header="抽屉哦"
      :footer="true"
      :cancelBtn="`关闭`" :confirmBtn="null"
      :closeBtn="false"
      :closeOnOverlayClick="false"
      :destroyOnClose="false"
      drawerClassName="drawer"
      :zIndex="9999"
      :showOverlay="true"
    >
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
      This is a Drawer<br />This is a Drawer<br />This is a Drawer<br />
    </t-drawer>
  </div>

    <div>读照片。</div>

    <t-upload
      v-model:files="fileArr"
      accept="image/*"
      :multiple="false"
      :disabled="false"
      :draggable="true"
      :showImageFileName="true"
      :showThumbnail="true"
      :sizeLimit="1000"
      status="success"
      theme="image"
      tips="请上传图片文件哈哈哈"
      :abridgeName="[10, 7]"
      :action="null"
      :autoUpload="false"
      :allowUploadDuplicateFile="false"
      :onRemove="() => { console.log('删掉了') }"
      :onChange="() => { console.log('上传成功：', fileArr) }"
    />

    <div width="100%">
      <canvas
        ref="canvasRef"
        @click="(event) => { onCanvasClick(event) }"
        style="border:solid"
      ></canvas>
    </div>



</template>

<!--
  逻辑层
 -->
<script setup>
import { ref, useTemplateRef, onMounted, inject } from "vue"
import { useParentElement, useMouseInElement } from '@vueuse/core'
// 也可以不导入，导入是为了方便类型注释调试
// import { MessagePlugin, NotifyPlugin, DialogPlugin } from 'tdesign-vue-next'

// 依赖注入
const my = inject("my")

// 侧边栏
const drawerVisible = ref(false)
// 文件
const fileArr = ref([])

const canvasRef = useTemplateRef("canvasRef")
const canvasParentRef = useParentElement(canvasRef)
const {
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  isOutside
} = useMouseInElement(canvasRef)

onMounted(() => {
  console.log('组件挂载')
  const canvasWidth = canvasParentRef.value.clientWidth
  // 更新canvas的宽度和高度
  canvasRef.value.width = canvasWidth
  canvasRef.value.height = canvasWidth / 4 * 3
  console.log("canvasRef.value: ", canvasRef.value)
  

})

function onCanvasClick(event) {
  // console.log("点击了画布：", event)
  if (isOutside.value) {
    console.log("点击了画布外部")
  } else {
    const point = {
      x: elementX.value / elementWidth.value,
      // width: elementWidth.value,
      y: elementY.value / elementHeight.value,
      // height: elementHeight.value
    }
    console.log("点击了画布内部：", point)
  }
}

const data = [
  { index: 1, key1: "x", value1: "xx", key2: "y", value2: "yy" },
  { index: 2, key1: "x", value1: isOrientationSupported, key2: "y", value2: "yy" },
  { index: 3, key1: "x", value1: "xx", key2: "y", value2: "yy" },
]
const columns = [
  { title: "大表头1", align: "center", children: [
    { colKey: "key1", title: "key1", className: "String", align: "center" },
    { colKey: "value1", title: "value1", className: "String", align: "center" },
  ] },
  { title: "大表头2", align: "center", children: [
    { colKey: "key2", title: "key2", className: "String", align: "center" },
    { colKey: "value2", title: "value2", className: "String", align: "center" },
  ] },
]


</script>
