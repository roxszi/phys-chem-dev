
  // // 6. 模型预测
  // console.time("训练预测耗时")
  // console.log("开始用训练后的模型做预测...")
  // // 叠个tf.tidy()，省内存
  // const [testLabelTensor, testPredictTensor] = tf.tidy(() => {
  //   // 测试集数据转为张量
  //   const testDataTensor = dataJsonToTensor2d(testDataset, 2)
  //   // 用训练集的归一化参数进行归一化
  //   const normalizedTestFeatureTensor = testDataTensor.featureTensor
  //     .sub(featureTensor.tensorMin)
  //     .div(featureTensor.tensorMax.sub(featureTensor.tensorMin))
  //   // 预测
  //   const normalizedTestPredictTensor = model.predict(normalizedTestFeatureTensor)
  //   // 对预测结果去归一化
  //   const testPredictTensor = normalizedTestPredictTensor
  //     .mul(labelTensor.tensorMax.sub(labelTensor.tensorMin))
  //     .add(labelTensor.tensorMin)
  //   return [testDataTensor.labelTensor, testPredictTensor]
  // })
  // console.timeEnd("训练预测耗时")

  // // 7. 预测结果的可视化呈现
  // // 先整理数据。叠个tf.tidy()，省内存
  // const [tableArrayA, tableArrayB] = tf.tidy(() => {
  //   // 因为本项目有2个物质，A和B，所以要拆开
  //   const [labelTensorA, labelTensorB] = testLabelTensor.split(2, [1])
  //   const [predictTensorA, predictTensorB] = testPredictTensor.split(2, [1])
  //   // 计算损失：均方误差A
  //   const mseA = tf.metrics.meanSquaredError(labelTensorA, predictTensorA)
  //   // 计算损失：均方误差B
  //   const mseB = tf.metrics.meanSquaredError(labelTensorB, predictTensorB)
  //   // 计算损失：平均绝对误差A
  //   const maeA = tf.metrics.meanAbsoluteError(labelTensorA, predictTensorA)
  //   // 计算损失：平均绝对误差B
  //   const maeB = tf.metrics.meanAbsoluteError(labelTensorB, predictTensorB)
  //   // 计算均值
  //   // tf.arraySync()方法，如果只有一个值，如[5]，则返回5；否则返回一个数组
  //   const mseMeanA = mseA.mean().arraySync()
  //   const mseMeanB = mseB.mean().arraySync()
  //   const maeMeanA = maeA.mean().arraySync()
  //   const maeMeanB = maeB.mean().arraySync()
  //   // 将损失计算结果合并为数组
  //   // tf.concat()方法，直接拼接。[0]轴为特征轴，拼接样品；[1]轴为样本轴，拼接特征
  //   let tableArrayA = labelTensorA.concat(predictTensorA, [1]).concat(maeA.expandDims(1), [1]).concat(mseA.expandDims(1), [1]).arraySync()
  //   tableArrayA.push([null, "均值：", null, maeMeanA, mseMeanA])
  //   let tableArrayB = labelTensorB.concat(predictTensorB, [1]).concat(maeB.expandDims(1), [1]).concat(mseB.expandDims(1), [1]).arraySync()
  //   tableArrayB.push([null, "均值：", null, maeMeanB, mseMeanB])
  //   // 往每行最左侧加一列行序号数组
  //   for (let i = 0; i < tableArrayA.length - 1; i++) {
  //     tableArrayA[i].unshift([i + 1])
  //   }
  //   for (let i = 0; i < tableArrayB.length - 1; i++) {
  //     tableArrayB[i].unshift([i + 1])
  //   }
  //   // 返回数组
  //   return [tableArrayA, tableArrayB]
  // })
  // // A物质训练结果可视化
  // tfvis.render.table(
  //   {
  //     tab: "模型预测",
  //     name: "预测结果：A物质",
  //   }, 
  //   {
  //     headers: [
  //       "样本序号",
  //       "实验测量值",
  //       "模型预测值",
  //       "平均绝对误差",
  //       "均方误差"
  //     ],
  //     values: tableArrayA,
  //   },
  // )
  // // B物质训练结果可视化
  // tfvis.render.table(
  //   {
  //     tab: "模型预测",
  //     name: "预测结果：B物质",
  //   },
  //   {
  //     headers: [
  //       "样本序号",
  //       "实验测量值",
  //       "模型预测值",
  //       "平均绝对误差",
  //       "均方误差"
  //     ],
  //     values: tableArrayB,
  //   },
  // )