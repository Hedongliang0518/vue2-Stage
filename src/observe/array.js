// 重写数组中部分方法

// 获取数组的原型
let oldArrayProto = Array.prototype;
// newArrayProto.__proto__ === oldArrayProto
export let newArrayProto = Object.create(oldArrayProto)
// 找到所有变异方法
let methods = [
  'pop',
  'push',
  'unshift',
  'shift',
  'reverse',
  'sort',
  'splice'
]

methods.forEach( method => {
  newArrayProto[method] = function(...args) {   // 重写数组方法
    const result = oldArrayProto[method].call(this, ...args)   // 内部调用原来的方法，函数劫持，切片编程, 谁调用方法this指向谁
    // 对新增的数据再次进行劫持
    let inserted;
    let ob = this.__ob__;
    switch(method) {
      case 'push':
      case 'unshift':
        inserted = args;
        break
      case 'splice':
        inserted = args.slice(2)  // arr.splice(0,1,{},{})    第一个参数位置。第二个参数个数，后面为新增参数slice(2)获取。
      }
      // 对新增数组进行观测
      if(inserted) {
        // 观测数组新增的每一项
        ob.observeArray(inserted)
      }
      ob.dep.notifi();
    return result;
  }
})