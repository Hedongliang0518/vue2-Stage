export function createElementVNode(vm, tag, data = {},...children) {  // h()  _c()
    if (data == null) data = {};
    let key = data.key;
    if(key) {
        delete data.key;
    }
    return vNode(vm,tag,key,data,children)
}

export function createTextVNode(vm, text) {  // _v()
    return vNode(vm,undefined, undefined, undefined, undefined, text)
}
// ast做的是语法层面的转化，他描述的是语法本身(描述语言本身，js，css，html)
// 但是虚拟dom，描述的是dom元素，可以增加一些自定义属性
function vNode(vm,tag,key,data,children,text) {
    return {
        vm,
        tag,
        key,
        data,
        children,
        text,
    }
}

export function isSameVnode(oldVnode, newVnode) {
    return oldVnode.tag === newVnode.tag && oldVnode.key === newVnode.key
}