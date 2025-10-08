"use strict"

const aoa = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]

const [ , [, , b], [ , , c]] = aoa

console.log(b, c) // 6 9