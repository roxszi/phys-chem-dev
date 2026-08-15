<!--
  自用表格组件（t-table 封装版）
  ---
  与 MyTable 的取舍：
  - 简单数据展示（如拟合结果、参数表）→ 优先用 MyTable
    - 原生 <table>，性能更好（无 t-table 内部计算开销）
    - 通过 .vp-doc 父容器继承 VitePress 的表格样式（自动跟版本升级）
  - 需要 t-table 高级特性时 → 用 MyTTable
    - 虚拟滚动（大数据集场景）
    - 列排序 / 过滤 / 多列合并
    - 斑马纹 / 边框 / hover 高亮等 t-table 内置样式
    - 缺点：t-table 内部用 scoped CSS 隔离样式，**不继承** VitePress 表格样式

  设计要点：
  - 数据源是 titleArr[] 数组，以及 dataAoa[][] 二维数组
  - 序号列组件内置（isNeedIndex 控制是否显示，默认 true）
  - 操作列通过 #actions slot 暴露行级数据（rowIndex）
  - 用 watch(props, deep: true) 桥接 props → t-table columns/data 浅层 ref
    （浅层 ref 不追踪内部字段变化，必须整体替换 .value；deep: true 覆盖父组件原地 mutate 子数组/leaf 数字 cell 的场景）

  AOA 约定结构：
  - dataArr 为一行数据，与 titleArr 长度一致
  - 多行 dataArr 数据组成 dataAoa 二维数组
-->


<!--
  逻辑层
-->
<script setup lang="ts">
/** 本组件的传参数据类型 */
interface MyTableProps {
  /** 是否需要列序号 */
  isNeedIndex?: boolean
  /** 表格标题（数据列） */
  titleArr: (string | number)[]
  /** 表格数据内容（AOA二维数组） */
  dataAoa: (string | number)[][]
}
/** 组件传参 */
const props = defineProps<MyTableProps>()

// ======== 组装数据 ========

const option = shallowRef(buildData())

// 监听回调
// 桥接 props → option：浅层 ref 不会追踪内部字段变化，必须整体替换 `.value`。
// 直接 watch(props, ...) 让 Vue 自动追踪 props 所有嵌套字段；
// `deep: true` 覆盖父组件原地 mutate 子数组 / leaf 数字 cell 的场景。
watch(
  props,
  () => {
    option.value = buildData()
  },
  { deep: true },
)


/**
 * 构建数据
 * - 会闭包读取props以构建t-table可用的数据格式
 */
function buildData() {
  // 接传参
  const { isNeedIndex = true, titleArr, dataAoa } = props
  /** 列数据 */
  const columns =
    isNeedIndex
      ? [{
        colKey: "index",
        title: "#",
        align: "center",
      }]
      : []
  /** 数据列数 */
  const n = Math.min(
    titleArr.length,
    (dataAoa[0]?.length ?? 0)
  )
  if (n === 0) {
    return { columns, data: [] }
  }
  // 遍历赋值：每一列的信息
  for (let i = 0; i < n; i++) {
    columns.push({
      colKey: (i + 1).toString(),
      title: titleArr[i]!.toString(),
      align: "center",
    })
  }
  /** 数据内容 */
  const data = []
  // 遍历赋值data
  for (let i = 0; i < props.dataAoa.length; i++) {
    /** 每一行的数据对象 */
    const datum = 
      isNeedIndex
        ? {
          index: i + 1
        }
        : {}
    // 遍历赋值datum内容
    for (let j = 0; j < n; j++) {
      // @ts-ignore
      datum[(j + 1).toString()] = props.dataAoa[i]![j]
    }
    data.push(datum)
  }
  return { columns, data }
}

</script>


<!--
  视图层
-->
<template>
  <t-table
    :bordered="true"
    :stripe="true"
    tableLayout="auto"
    :rowKey="option.columns[0]?.colKey ?? 'index'"
    :data="option.data"
    :columns="option.columns"
    cellEmptyContent="暂无数据"
  />
</template>
