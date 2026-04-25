"use strict"


const a = {
  name: "a",
  age: 20,
  marks: [1, 2, 3],
  sayHi() {
    console.log(`Hi, my name is ${this.name} and I am ${this.age} years old.`)
  }
}


const b = { ...a }

b.marks = [...a.marks]

b.marks.push(4)


console.log(b)
console.log(a)