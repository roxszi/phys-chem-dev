"use strict"

/**
 * @临时脚本文件
 */

const temp = {
  root: {
    name: "root",
    children: 123
  },
  test: function() { console.log(this) }
}

const a = [temp.test, "2", "3"]

// temp.test()

a[0]()
