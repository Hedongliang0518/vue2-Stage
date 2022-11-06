import { newArrayProto } from './array'
import Dep from "./dep"
class Observer {
  constructor(data) {
    // 给每个对象都增加收集功能
    this.dep = new Dep()
    // 将Observer实例赋到data自定义属性上。在劫持数组方法时拿到observeArray进行观测;也给数据加了一个标识,如果数据有__ob__,则说明改数据被劫持过了。
    data.__ob__ = this;
    // 给对象添加__ob__属性后，循环的时候会再次循环__ob__，形成死循环；将__ob__变成不可枚举
    Object.defineProperty(data,'__ob__',{
      value:this,
      enumerable: false,   // 将__ob__变成不可枚举的（循环的时候无法获取）
    });
    // 如果是数组，重写数组方法，7个变异方法(能改变原数组)
    if(Array.isArray(data)) {
      // 保留数组原有特性，重写部分原型链方法
      data.__proto__ = newArrayProto;
      // 数组中引用类型也要进行劫持
      this.observeArray(data)
    } else {
      // Object.defineProperty只能劫持已经存在的属性，新增或删除的是不知道的（vue2bug，为此单独写一些api，如$set,$delete）
      this.walk(data)
    }
  }
  // 循环对象，对属性依次劫持
  walk(data) {
    // 重新定义属性，相当于重写，性能瓶颈
    Object.keys(data).forEach(key => defineReactive(data, key, data[key]))
  }
  // 观测数组每一项
  observeArray(data) {
    data.forEach(item => observe(item))
  }
}

// 对数据做响应式处理  闭包
export function defineReactive(target, key, value) {
  let childOb = observe(value) // 递归对所有对象都进行属性劫持 childOb.dep用来收集依赖
  let dep = new Dep(); // 给每个属性添加dep，做依赖收集
  Object.defineProperty(target,key, {
    get() {   // 用户取值走get方法
      // 页面渲染的时候会调用render函数，进行取值，依赖收集，没渲染的则不触发getter
      if(Dep.target) {
        dep.depend(); // 让这个属性的收集器记住当前的watcher
        if(childOb) {
          childOb.dep.depend(); // 让数组和对象本身也能实现依赖收集
          if(Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value;
    },
    set(newValue) {  // 用户设置值走set方法
      if(newValue === value) return;
      observe(newValue) // 递归对所有对象都进行属性劫持
      value = newValue;

      dep.notifi(); // 通知更新
    }
  })
}


function dependArray(value) {
  for(let i = 0; i < value.length; i++) {
    let current = value[i];
    current.__ob__ && current.__ob__.dep.depend();
    if(Array.isArray(current)) {
      dependArray(current)
    }
  }
}

export function observe(data) {
  // 对对象进行劫持
  if(typeof data !== 'object' || data == null) {
    return;  // 只对对象进行劫持
  }
  // 数据被劫持过了，直接返回data.__ob__
  if(data.__ob__ instanceof Observer) {
    return data.__ob__;
  }
  // 如果一个对象已经被劫持过，则不需要再进行劫持（判断是否被劫持过，新增一个实例来进行判断）
  return new Observer(data);
}