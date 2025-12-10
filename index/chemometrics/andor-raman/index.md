# Andor拉曼光谱数据处理助手

> [!warning] 受限于Andor数据文件的闭源编码格式，该功能需分2步完成：
> 
> 1.  将Andor拉曼光谱仪的`.sif`数据文件转为txt化的`.asc`文档文件。
> 
> 2.  一键将大量`.asc`数据文档文件合并导出为一个excel表格文件。

## 第一步：处理.sif文件

1.  下载脚本文件：<a href="/assets/andorSifsToAscs.pgm" download="andorSifsToAscs.pgm">andorSifsToAscs.pgm</a>

2.  将想要转换格式的`.sif`文件统一放进一个文件夹内；

3.  将本`.pgm`脚本文件也放进`.sif`文件夹内；

4.  在Andor SOLIS软件里，"File" - "Run Program By Filename"，选择本`.pgm`脚本文件运行，即可批量生成`.asc`文件。
详细说明见下“数据文件合并”。

## 第二步：数据文件合并

1.  直接读取上一步得到`.asc`文件的**文件夹**即可。（会自动过滤`.sif`等其它无关文件）

2.  一键下载excel文件，即所有`.asc`文件合并后的excel表格。

<!-- 功能模块 -->
<AndorAscsToXlsx />

## 其它

本来想“一站式”解决问题的，但Andor的sif文件有自己的编码，外部解码转码的工作量很大，所以想到用Andor自己提供的接口来实现转码，也就是所写的`.pgm`脚本文件。

但是Andor脚本接口是闭源的，功能实现非常有限，要用Andor脚本来实现一键批量转excel的话太繁琐了。所以又写了本WebApp，来实现`.asc`文件一键汇总为Excel表格的功能。

第一步的`.pgm`脚本文件功能很简单，就是读取`.sif`，另存`.asc`。感兴趣的同学可以用文本文档打开`.pgm`脚本文件查看注释或修改脚本。

本WebApp的功能也很简单，挂载文件夹之后，获取文件夹内的文件句柄，根据文件扩展名过滤。然后就是以句柄获取文件内容 + 转为excel格式等操作。感兴趣的同学可以从 [关于](/about/) 那里查看源码。
