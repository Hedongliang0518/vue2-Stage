import Dep from "./observe/dep.js";
import { observe } from "./observe/index.js";
import Watcher from "./observe/watcher.js";

export function initState(vm) {
  const opts = vm.$options;
  if(opts.data) {
    initData(vm)
  }
  if(opts.computed) {
    initComputed(vm)
  }
}

function initData(vm) {
  let data = vm.$options.data;  // data可能是函数或者对象
  data = typeof data === 'function' ? data.call(vm) : data
  vm._data= data;
  // 数据放在实例上，进行观测
  observe(data)

  //将vm._data用vm代理
  for(let key in data) {
    proxy(vm, '_data', key)
  }
}

function proxy(vm, target, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[target][key]
    },
    set(newValue) {
      vm[target][key] = newValue
    }
  })
}

function initComputed(vm) {
  const computed = vm.$options.computed;
  const watchers = vm._computedWatchers = {};  // 将计算属性watcher保存到vm上
  for(let key in computed) {
    let userDef = computed[key];
    // 监控计算属性get的变化
    const fn = typeof userDef === "function" ? userDef : userDef.get;
    // 将属性和watcher对应起来
    watchers[key] = new Watcher(vm, fn, {lazy: true})
    defineComputed(vm, key, userDef);
  }
}

function defineComputed(target, key, userDef) {
  const getter = typeof userDef === "function" ? userDef : userDef.get;
  const setter = userDef.set || (()=>{});
  Object.defineProperty(target, key, {
    get: createComputedGetter(key),
    set: setter
  })
}


// 检测是否要执行getter
// 计算属性不会自己收集依赖，让自己依赖的属性去收集waatcher
function createComputedGetter(key) {
  return function() {
    const watcher = this._computedWatchers[key]
    if(watcher.dirty) {
      watcher.evaluate() // 求值后，dirty变为false，走缓存
    }
    if(Dep.target) {
      // 如果dep。target存在，说明计算属性出栈后还有渲染watcher  应该让计算属性watcher里面的属性也去收集上层的watcher
      watcher.depend();
    }
    return watcher.value;
  }
}