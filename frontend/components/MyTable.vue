<!-- 
  自用表格组件
  TDesign表格组件效率低，我自己组装了一个AOA二维数组驱动的轻量表格组件
  ---
  设计要点：
  - 数据源是 titleArr[] 数组，以及 dataAoa[][] 二维数组
  - 序号列组件内置，为 1, 2, 3... 自增
  - 操作列通过 #actions slot 暴露行级数据（dataArrIndex）
  - 直接继承了 VitePress 的表格基础样式
  ---
  AOA 约定结构：
  - dataArr 为一行数据，与 titleArr 长度一致
  - 多行 dataArr 数据组成 dataAoa 二维数组
-->


<!--
  逻辑层
-->
<script setup lang="ts">

/** 行标记内容：是否激活。未激活的数据将增加<del></del>删除号 */
type IsActive = boolean
/** 本组件的传参数据类型 */
interface MyTableProps {
  /** 表格标题（数据列） */
  titleArr: (string | number)[]
  /** 表格数据内容（AOA二维数组） */
  dataAoa: (string | number)[][]
  /** 表格行数据标记 */
  rowMarkAoa?: [IsActive][]
}
/** 组件传参 */
const props = defineProps<MyTableProps>()

/** 本组件的插槽契约数据类型 */
interface MyTableSlots {
  /**
   * #actions 插槽
   * @prop rowIndex 当前行索引
   * @prop rowMarkArr 当前行数据标记
   */
  actions(props: {
    rowIndex: number
    rowMarkArr?: [boolean]
  }): void
}

/** slots透传 */
const slots = defineSlots<MyTableSlots>()

/** 是否存在#actions的Ref对象 */
const isActionsSlotsRef = computed(() => !!slots.actions)

/** 是否有数据的Ref对象 */
const isDataRef = computed(() => (props.dataAoa.length !== 0))

</script>


<!--
  视图层
-->
<template>
  <!-- 强行继承“.vp-doc”样式类 -->
  <div class="vp-doc">
    <table>
      <!-- 表头 -->
      <thead v-if="props.titleArr.length">
        <!-- 表头只有1行 -->
        <tr>
          <!-- 序号 -->
          <th scope="col">
            #
          </th>
          <!-- 标题内容 -->
          <th
            v-for="(title, titleIndex) in props.titleArr" :key="`th-${ titleIndex }`"
            scope="col"
          >
            {{ title }}
          </th>
          <!-- 操作列：仅在传了 #actions slot，且存在数据时渲染 -->
          <th
            v-if="isActionsSlotsRef && isDataRef"
            scope="col"
          >
            ≡
          </th>
        </tr>
      </thead>
      <!-- 内容：存在数据时渲染 -->
      <tbody v-if="isDataRef">
        <!-- 内容行 -->
        <tr v-for="(dataArr, dataArrIndex) in props.dataAoa" :key="dataArrIndex">
          <!-- 序号：组件内置，自增 -->
          <td scope="row">
            {{ dataArrIndex + 1 }}
          </td>
          <!-- 内容：失活 -->
          <template v-if="props.rowMarkAoa?.[dataArrIndex]?.[0] === false">
            <td v-for="(data, dataIndex) in dataArr" :key="dataIndex">
              <del>{{ data }}</del>
            </td>
          </template>
          <!-- 内容：其它（激活） -->
          <template v-else>
            <td v-for="(data, dataIndex) in dataArr" :key="dataIndex">
              {{ data }}
            </td>
          </template>
          <!-- 操作：仅在传了 #actions slot 时渲染 -->
          <td v-if="isActionsSlotsRef">
            <slot
              name="actions"
              :rowIndex="dataArrIndex"
              :rowMarkArr="props.rowMarkAoa?.[dataArrIndex]"
            />
          </td>
        </tr>
      </tbody>
      <!-- 内容：无数据时渲染 -->
      <tbody v-else>
        <tr>
          <td :colspan="props.titleArr.length + 1">
            暂无数据
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
