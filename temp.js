"use strict"

// const a = Math.cos(60 * Math.PI / 180)

const res = await fetch("https://atomgit.com/cpuer/yaoda-admin")
const data = await res.text()
console.log("data: ", data)
