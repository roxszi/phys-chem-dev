"use strict"

const aoa = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]

const aoaSplice = aoa.slice(1, 3)

console.log("aoaSplice1: ", aoaSplice) // [ [ 4, 5, 6 ], [ 7, 8, 9 ] ]

aoaSplice.reverse()

console.log("aoaSplice2: ", aoaSplice) // [ [ 7, 8, 9 ], [ 4, 5, 6 ] ]

console.log("aoa: ", aoa)