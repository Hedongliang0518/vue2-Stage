import Dep from "./dep";

let id = 0;

// 每个属性有一个dep，属性就是被观察者，watcher就是观察者，属性变化了会通知观察者来更新
// 观察者模式

// 当我们创建渲染watcher的时候，我们会把当前的渲染watcher放到Dep.target上
// 调用_render方法
class Watcher {  // 不同组件有不同的watcher
    constructor(vm, fn) {
        this.id = id++;

        this.getter = fn; // 调用这个函数就会发生取值操作

        this.deps = []; // watcher记录dep；如组件卸载，清除所有的响应式数据，实现计算属性和清理工作

        this.depsId = new Set();
        
        this.get()
    }

    addDep(dep) {  // 一个组件对应多个属性，重复属性不用记录
        let id = dep.id;
        if(!this.depsId.has(id)){
            this.deps.push(dep);
            this.depsId.add(id);
            dep.addSub(this);  // watcher已经记住了dep而且去重，此时让dep也记住watcher
        }
    }

    get() {
        Dep.target = this; // 静态属性，将组件挂载到dep全局上
        this.getter(); // 触发_render方法，会去vm上取值，
        Dep.target = null; // 渲染完毕后置空，避免vm.xxx取值也进行依赖收集
    }

    update() {
        queueWatcher(this); // 把当前的watcher暂存起来
    }
    
    run() {
        console.log(("updata"));
        this.get()
    }

    
}

let queue = [];
let has = {};
let pending = false; // 防抖
function queueWatcher(watcher) {
    const id = watcher.id;
    if(!has[id]) {
        queue.push(watcher);
        has[id] = true;
        // 不管updata执行多少次，但是最终刷新操作只执行一次
        if(!pending) {
            nextTick(flushSchedulerQueue,0)
            pending = true;

        }
    }
}
// 异步更新导致用户取值取到不是最新值
function flushSchedulerQueue() {
    let flushQueue = queue.slice(0)
    queue = [];
    has = {};
    pending = false;
    flushQueue.forEach(q => q.run()); 
}

let callbacks = []
let waiting = false;

function flushCallbacks() {
    let cbs = callbacks.splice(0);
    waiting = false;
    callbacks = [];
    cbs.forEach(cb => cb());
}

let timerFunc;
if(Promise) {
    timerFunc = () => {
        Promise.resolve().then(flushCallbacks)
    }
} else if(MutationObserver) {
    let observe = new MutationObserver(flushCallbacks) // 这里传入的回调是异步执行
    let textNode = document.createTextNode(1)
    observe.observe(textNode, {
        characterData: true
    });
    timerFunc = () => {
        textNode.textContent = 2
    }
} else if (setImmediate) {
    timerFunc = () => {
        setImmediate(flushCallbacks)
    }
} else {
    timerFunc = () => {
        setTimeout(flushCallbacks)
    }
}
// 异步批处理 使用队列(使用变量控制开异步)
// nextTick不是创建一个异步任务，而是将这个任务维护到了队列中
// 没有直接使用某个api，采用优雅降级的方式
// 先采用promise（IE不兼容），MutationObserver(微任务，H5的api)，setImmediate(ie专属)，setTimeout
export function nextTick(cb) {
    callbacks.push(cb); // 维护nextTick的calback方法
    if(!waiting) {
        timerFunc()
    }
    waiting = true;
}

// 需要给每个属性增加一个dep，目的是收集watcher（让属性收集他所依赖的watcher）
// 一个组件n个属性对应n的dep，对应一个watcher
// 一个属性可以对应多个组件，一个dep对应多个watcher
// 多对多的关系
export default Watcher