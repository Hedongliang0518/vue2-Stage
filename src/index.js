import { initGloablApi } from "./gloablAPI"
import { initMixin } from "./init"
import { initLifeCycle } from "./lifecycle"
import { initStateMixin } from "./state"
import {compileToFunction} from './compiler/index';

function Vue(options) {  // options  用户选项
  this._init(options)
}
initMixin(Vue)  // 扩展init方法
initLifeCycle(Vue) // vm._upDate  vm._render
initGloablApi(Vue) // mixin方法  (全局api)
initStateMixin(Vue); // nextTick   watch

// =================================虚拟dom前后对比=================

let render1 = compileToFunction(`<div>{{name}}</div>`)


let vm1 = new Vue({data:{name: '1111'}})
let preVdom = render1.call(vm1)

let render2 = compileToFunction(`<span>{{name}}</span>`)


let vm2 = new Vue({data:{name: '222'}})
let nextVdom = render2.call(vm2)
console.log(preVdom, nextVdom);
export default Vue