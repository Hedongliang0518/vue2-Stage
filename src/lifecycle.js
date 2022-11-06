// 组件挂载

import Watcher from "./observe/watcher";
import { createElementVNode, createTextVNode } from "./vdom/index";

function createElm(vNode) {
    let {tag, data, children, text} = vNode;
    if(typeof tag === 'string') {  // 是标签
        // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了，我们可以直接找到虚拟节点对应的真实节点来修改属性
        vNode.el = document.createElement(tag);
        patchProps(vNode.el, data);
        children.forEach(chlid => {
            vNode.el.appendChild(createElm(chlid))
        })
    } else {
        vNode.el = document.createTextNode(text)
    }
    return vNode.el;
}

function patchProps(el, props) {
    for(let key in props) {
        if(key === 'style') {
            for(let styleName in props.style){
                el.style[styleName] = props.style[styleName]
            }
        } else {
            el.setAttribute(key, props[key])
        }
    }
}

function patch(oldVNode, vNode){
    // 初次渲染
    const isRealElement = oldVNode.nodeType; //nodeType是dom原生方法
    if(isRealElement) {
        const elm = oldVNode; // 获取真实元素
        const parentElm = elm.parentNode;  // 拿到父元素
        let newElm = createElm(vNode) // 拿到新的真实dom
        parentElm.insertBefore(newElm, elm.extSibling); // 将新节点插入老节点下方，在删除老节点，避免位置变化
        parentElm.removeChild(elm); // 删除老节点
        return newElm;
    } else {
        // diff算法
    }
}

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