// 虚拟54节点变真实节点

import { isSameVnode } from "./index";

export function createElm(vNode) {
    let {tag, data, children, text} = vNode;
    if(typeof tag === 'string') {  // 是标签
        // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了，我们可以直接找到虚拟节点对应的真实节点来修改属性
        vNode.el = document.createElement(tag);
        patchProps(vNode.el,{}, data);
        children.forEach(chlid => {
            vNode.el.appendChild(createElm(chlid))
        })
    } else {
        vNode.el = document.createTextNode(text)
    }
    return vNode.el;
}

export function patchProps(el, oldProps = {}, props= {}) {
    // 老的属性有，新的没有，要删除老的
    let oldStyles = oldProps.style;
    let newStyles = props.style;
    for(let key in oldStyles) {
        if(!newStyles[key]) {
            el.style[key] = ''
        }
    }

    for(let key in oldProps) {
        if(!props[key]) {
            el.removeAttribute(key)
        }
    }
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

export function patch(oldVNode, vNode){
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
        patchVnode(oldVNode, vNode)
    }
}

function patchVnode() {
    // 两个节点不是同一个节点，直接删除老的换上新的，无比对
    // 两个节点是同一个节点（判断节点的tag和节点的key）比较两个节点的属性是否有差异（复用老的节点，将差异属性更新）
    // 节点比较完毕后就需要比较两人的儿子
    if(!isSameVnode(oldVNode, vNode)) {  // 父节点不同，直接替换
        // 用老节点的父级进行替换
        let el = createElm(vNode);
        oldVNode.el.parentNode.replaceChild(el, oldVNode.el)  // replaceChild 实现子节点(对象)的替换。返回被替换对象的引用。 
        return el;
    } 
    // 文本情况，文本我们期望比较一下文本内容
    vNode.el = oldVNode.el; // 复用节点，替换内容
    if(!oldVNode.tag) {
        if(oldVNode.text !== vNode.text) {
            oldVNode.el.textContent = vNode.text  // 新的文本覆盖掉老的
        }
    }
    // 是标签，比对标签属性
    patchProps(el, oldVNode.data, vNode.data)


    // 比较儿子节点
    // 一方有儿子，一方没有儿子，  两方都有儿子

    let oldChildren = oldVNode.children || [];
    let newChildren = vNode.children || [];
    if(oldChildren.length > 0 && newChildren.length > 0) {
        // 都有儿子
        updateChildren(el, oldChildren, newChildren);
    } else if (newChildren.length > 0) {
        // 只有新的有儿子  把虚拟节点变成真实节点挂载到元素上
        mountChildren(el,newChildren);
    } else if (oldChildren.length > 0) {
        // 只有老的有儿子 直接删除
        unMountChildren(el,oldChildren);
    }



    return el
}

function mountChildren(el,newChildren) {
 for(let i = 0; i< newChildren.length; i++) {
    let child = newChildren[i];
    el.appendChild(createElm(child))
 }
}

function unMountChildren() {
    el.innerHTML = ''
}

function updateChildren(el, oldChildren, newChildren) {
    // 优化策略，使用双指针方式比较节点
    let oldStartIndex = 0;
    let newStartIndex = 0;
    let oldEndIndex = oldChildren.length - 1;
    let newEndIndex = newChildren.length - 1;

    let oldStartVnode = oldChildren[0];
    let newStartVnode = newChildren[0];
    let oldEndVnode = oldChildren[oldEndIndex];
    let newEndVnode = oldChildren[newEndIndex];


    function makeIndexBykey(children) {
        let map = {}
        children.forEach((child, index) => {
            map[child.key] = index;
        })
        return map;
    }

    let map = makeIndexBykey(oldChildren);

    while(oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
        // 移动的时候遇到空跳过
        if(!oldStartVnode) {
            oldStartVnode = oldChildren[++oldStartIndex]
        } else if(!oldEndVnode) {
            oldStartVnode = oldChildren[--oldStartIndex]
        }
        // 双方有一方头指针大于尾指针则停止
        // 头指针后移   头头比对
        else if(isSameVnode(oldStartVnode, newStartVnode)) {  // 对比头头是否一样
            patchVnode(oldStartVnode, newStartVnode) // 如果是相同节点，则递归比较子节点
            oldStartVnode = oldChildren[++oldStartIndex];
            newStartVnode = newChildren[++newStartIndex];
        }
        // 尾指针前移  尾尾比对
        else if(isSameVnode(oldEndVnode, newEndVnode)) {  // 对比尾尾是否一样
            patchVnode(oldEndVnode, newEndVnode) // 如果是相同节点，则递归比较子节点
            oldEndVnode = oldChildren[--oldEndIndex];
            newEndVnode = newChildren[--newEndIndex];
        }

        // 交叉比对  尾比头
        else if(isSameVnode(oldEndVnode, newStartVnode)) {  // 对比首尾是否一样
            patchVnode(oldEndVnode, newStartVnode) // 如果是相同节点，则递归比较子节点
            el.insertBefore(oldEndVnode.el, oldStartVnode.el) // 将老的尾巴移动到老的头指针前面  insertBefore具备移动性
            oldEndVnode = oldChildren[--oldEndIndex];
            newStartVnode = newChildren[++newStartIndex];
        }
        // 交叉比对  头比尾
        else if(isSameVnode(oldStartVnode, newEndIndex)) {  // 对比首尾是否一样
            patchVnode(oldStartVnode, newEndIndex) // 如果是相同节点，则递归比较子节点
            el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling) // 将老的头部移动到尾指针后面
            oldStartVnode = oldChildren[++oldStartIndex];
            newEndVnode = newChildren[--oldEndIndex];
        } else {
            // 乱序比对
            let moveIndex = map[newStartVnode.key]; // 如果拿到则说明是要移动的索引
            if(moveIndex !== undefined) {
                let moveVnode = oldChildren[moveIndex]; // 找到对应虚拟节点
                el.insertBefore(oldStartVnode.el, moveVnode.el);
                oldChildren[moveIndex] = undefined; // 标识节点已经移动走了
                patchVnode(moveVnode, newStartVnode); // 比对属性和子节点
            } else {
                el.insertBefore(createElm(newStartVnode), oldStartVnode.el)
            }
            newStartVnode = newChildren[++newStartIndex]
        }
    }
    // 指针停止移动后，newStartIndex <= newEndIndex 为新增的节点
    if(newStartIndex <= newEndIndex){
        for(let i = newStartIndex; i <= newEndIndex; i++) {
            let childEl = createElm(newChildren[i]);
            // 可能是向前追加或向后追加

            let anchon = newChildren[newEndIndex + 1] ? newChildren[newEndIndex + 1].el : null;
            el.insertBefore(childEl, anchon); // anchon为null则会认为是appendChild
        }
    }
    // 指针停止移动后，oldStartIndex <= oldEndIndex 为删除的节点
    if(oldStartIndex <= oldEndIndex) {
        for(let i = oldStartIndex; i <= oldEndIndex; i++) {
            if(oldChildren[i]) {
                let childEl = oldChildren[i].el
                el.removeChild(childEl);
            }
        }
    }
}