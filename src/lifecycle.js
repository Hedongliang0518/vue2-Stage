// 组件挂载

import Watcher from "./observe/watcher";
import { createElementVNode, createTextVNode } from "./vdom/index";
import { patch } from "./vdom/patch";

export function initLifeCycle(Vue) {
    Vue.prototype._update = function(vNode) {
        // patch既有初始化的功能，又有更新的逻辑
        const vm = this;
        const el = vm.$el;
        vm.$el = patch(el, vNode)
    }
    // _c('div',{}, ...children)
    Vue.prototype._c = function() {
        return createElementVNode(this, ...arguments)
    }
    // _v(text)
    Vue.prototype._v = function() {
        return createTextVNode(this, ...arguments)
    }
    Vue.prototype._s = function(value) {
        if(typeof value !== 'object') return value
        return JSON.stringify(value)
    }
    Vue.prototype._render = function() {
        // 当渲染的时候会去实例中取值，我们就可以将属性和视图绑定在一起
        const vm = this;
        return vm.$options.render.call(vm);
    }
}

export function mountComponent(vm, el) {  //这里的的el是通过querySelector处理过的
    vm.$el = el;
    // 1.调用render方法，生成虚拟dom

    const updateComponent = () => {
        vm._update(vm._render());  // vm.$options.render();返回虚拟节点
    }

    new Watcher(vm, updateComponent, true) // true标识渲染watcher
    // 2.根据虚拟dom生成真实dom
    // 3.插入到el元素中
}


// vue核心流程
// 1.创造了响应式数据
// 2.将模版转化为ast语法树
// 3.将ast语法树转化为render函数； 后续每次数据更新可以只执行render函数，无需再次执行转化过程；render函数会产生虚拟节点（使用响应式数据）
// 4.根据创建的虚拟节点创造真实dom

export function callHook(vm, hook) {  // 调用钩子函数
    const handlers = vm.$options[hook];
    if(handlers) {
        handlers.forEach(handler => handler.call(vm))
    }
}