(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

    const starts = {};
    const LIFECYE = ['beforeCreate', 'created'];
    LIFECYE.forEach(hook => {
        starts[hook] = function (p, c) {
            if (c) {
                if (p) {
                    return p.concat(c)
                } else {
                    return [c]
                }
            } else {
                return p;
            }
        };
    });
    function mergeOptions(parent, child) {
        const options = {};
        for (let key in parent) {
            mergeField(key);
        }

        for (let key in child) {
            if (!parent.hasOwnProperty(key)) {
                mergeField(key);
            }
        }

        function mergeField(key) {
            // 策略模式减少ifelse
            if (starts[key]) {
                options[key] = starts[key](parent[key], child[key]);
            } else {
                options[key] = child[key] || parent[key];
            }
        }

        return options;
    }

    function initGloablApi(Vue) {
        Vue.options = {};

        Vue.mixin = function (mixin) {
            // 将用户选项和全局options合并
            this.options = mergeOptions(this.options, mixin);
            return this;
        };
    }

    let id$1 = 0;
    class Dep {
        constructor() {
            this.id = id$1++; // 属性的dep要收集watcher
            this.subs = []; // 存放当前属性对应的watcher
        }

        depend() {
            // 这里不希望放置重复的watcher  dep -> watcher
            // watcher记录dep
            Dep.target.addDep(this); // 让watcher记住dept
        }

        addSub(watcher) {
            this.subs.push(watcher);
        }

        notifi() {
            this.subs.forEach(watcher => watcher.update()); // 通知watcher要更新
        }
    }
    Dep.target = null;

    let stark = [];
    function pushTarget(watcher) {
        stark.push(watcher);
        Dep.target = watcher;
    }

    function popTarget(watcher) {
        stark.pop();
        Dep.target = stark[stark.length - 1];
    }

    // 重写数组中部分方法

    // 获取数组的原型
    let oldArrayProto = Array.prototype;
    // newArrayProto.__proto__ === oldArrayProto
    let newArrayProto = Object.create(oldArrayProto);
    // 找到所有变异方法
    let methods = [
      'pop',
      'push',
      'unshift',
      'shift',
      'reverse',
      'sort',
      'splice'
    ];

    methods.forEach( method => {
      newArrayProto[method] = function(...args) {   // 重写数组方法
        const result = oldArrayProto[method].call(this, ...args);   // 内部调用原来的方法，函数劫持，切片编程, 谁调用方法this指向谁
        // 对新增的数据再次进行劫持
        let inserted;
        let ob = this.__ob__;
        switch(method) {
          case 'push':
          case 'unshift':
            inserted = args;
            break
          case 'splice':
            inserted = args.slice(2);  // arr.splice(0,1,{},{})    第一个参数位置。第二个参数个数，后面为新增参数slice(2)获取。
          }
          // 对新增数组进行观测
          if(inserted) {
            // 观测数组新增的每一项
            ob.observeArray(inserted);
          }
          ob.dep.notifi();
        return result;
      };
    });

    class Observer {
      constructor(data) {
        // 给每个对象都增加收集功能
        this.dep = new Dep();
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
          this.observeArray(data);
        } else {
          // Object.defineProperty只能劫持已经存在的属性，新增或删除的是不知道的（vue2bug，为此单独写一些api，如$set,$delete）
          this.walk(data);
        }
      }
      // 循环对象，对属性依次劫持
      walk(data) {
        // 重新定义属性，相当于重写，性能瓶颈
        Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
      }
      // 观测数组每一项
      observeArray(data) {
        data.forEach(item => observe(item));
      }
    }

    // 对数据做响应式处理  闭包
    function defineReactive(target, key, value) {
      let childOb = observe(value); // 递归对所有对象都进行属性劫持 childOb.dep用来收集依赖
      let dep = new Dep(); // 给每个属性添加dep，做依赖收集
      Object.defineProperty(target,key, {
        get() {   // 用户取值走get方法
          // 页面渲染的时候会调用render函数，进行取值，依赖收集，没渲染的则不触发getter
          if(Dep.target) {
            dep.depend(); // 让这个属性的收集器记住当前的watcher
            if(childOb) {
              childOb.dep.depend(); // 让数组和对象本身也能实现依赖收集
              if(Array.isArray(value)) {
                dependArray(value);
              }
            }
          }
          return value;
        },
        set(newValue) {  // 用户设置值走set方法
          if(newValue === value) return;
          observe(newValue); // 递归对所有对象都进行属性劫持
          value = newValue;

          dep.notifi(); // 通知更新
        }
      });
    }


    function dependArray(value) {
      for(let i = 0; i < value.length; i++) {
        let current = value[i];
        current.__ob__ && current.__ob__.dep.depend();
        if(Array.isArray(current)) {
          dependArray(current);
        }
      }
    }

    function observe(data) {
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

    let id = 0;

    // 每个属性有一个dep，属性就是被观察者，watcher就是观察者，属性变化了会通知观察者来更新
    // 观察者模式

    // 当我们创建渲染watcher的时候，我们会把当前的渲染watcher放到Dep.target上
    // 调用_render方法
    class Watcher {  // 不同组件有不同的watcher
        constructor(vm, exprOrFn, options, cb) {
            this.id = id++;

            this.renderWatcher = options;  // 是同一个渲染watcher

            if(typeof exprOrFn === 'string' ) {  // 如果是字符串转变成函数
                this.getter = function() {
                    return vm[exprOrFn]
                };
            } else {
                this.getter = exprOrFn; // 调用这个函数就会发生取值操作
            }

            this.user = options.user; // 标识是否是用户自己的watcher


            this.deps = []; // watcher记录dep；如组件卸载，清除所有的响应式数据，实现计算属性和清理工作

            this.depsId = new Set();
            this.vm = vm;

            this.cb = cb;

            this.lazy = options.lazy;
            this.dirty = this.lazy;  // 缓存值（是否脏值）
            
            this.value = this.lazy ? undefined : this.get(); // 存储老值
        }

        addDep(dep) {  // 一个组件对应多个属性，重复属性不用记录
            let id = dep.id;
            if(!this.depsId.has(id)){
                this.deps.push(dep);
                this.depsId.add(id);
                dep.addSub(this);  // watcher已经记住了dep而且去重，此时让dep也记住watcher
            }
        }

        evaluate() {
           this.value = this.get(); // 获取到用户函数的返回值，并且标识为脏值
           this.dirty = false;
        }

        get() {
            // Dep.target = this; // 静态属性，将组件挂载到dep全局上
            pushTarget(this); // 静态属性，将组件挂载到dep全局上
            let value = this.getter.call(this.vm); // 触发_render方法，会去vm上取值，
            // Dep.target = null; // 渲染完毕后置空，避免vm.xxx取值也进行依赖收集
            popTarget(); // 渲染完毕后置空，避免vm.xxx取值也进行依赖收集
            return value;
        }

        update() {
            // 如果是计算属性 依赖的值发生变化，就标识计算属性是脏值
            if(this.lazy) {
                this.dirty = true;
            }
            queueWatcher(this); // 把当前的watcher暂存起来
        }

        depend() {
            let i = this.deps.length;
            while(i--) {
                this.deps[i].depend(); // 让计算属性watcher收集渲染watcher
            }
        }
        
        run() {
            let oldVal = this.value;
            let newVal = this.get();
            if(this.user) {
                this.cb(newVal, oldVal);
            }
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
                nextTick(flushSchedulerQueue);
                pending = true;

            }
        }
    }
    // 异步更新导致用户取值取到不是最新值
    function flushSchedulerQueue() {
        let flushQueue = queue.slice(0);
        queue = [];
        has = {};
        pending = false;
        flushQueue.forEach(q => q.run()); 
    }

    let callbacks = [];
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
            Promise.resolve().then(flushCallbacks);
        };
    } else if(MutationObserver) {
        let observe = new MutationObserver(flushCallbacks); // 这里传入的回调是异步执行
        let textNode = document.createTextNode(1);
        observe.observe(textNode, {
            characterData: true
        });
        timerFunc = () => {
            textNode.textContent = 2;
        };
    } else if (setImmediate) {
        timerFunc = () => {
            setImmediate(flushCallbacks);
        };
    } else {
        timerFunc = () => {
            setTimeout(flushCallbacks);
        };
    }
    // 异步批处理 使用队列(使用变量控制开异步)
    // nextTick不是创建一个异步任务，而是将这个任务维护到了队列中
    // 没有直接使用某个api，采用优雅降级的方式
    // 先采用promise（IE不兼容），MutationObserver(微任务，H5的api)，setImmediate(ie专属)，setTimeout
    function nextTick(cb) {
        callbacks.push(cb); // 维护nextTick的calback方法
        if(!waiting) {
            timerFunc();
        }
        waiting = true;
    }

    function initState(vm) {
      const opts = vm.$options;
      if(opts.data) {
        initData(vm);
      }
      if(opts.computed) {
        initComputed(vm);
      }
      if(opts.watch) {
        initWatch(vm);
      }
    }

    function initData(vm) {
      let data = vm.$options.data;  // data可能是函数或者对象
      data = typeof data === 'function' ? data.call(vm) : data;
      vm._data= data;
      // 数据放在实例上，进行观测
      observe(data);

      //将vm._data用vm代理
      for(let key in data) {
        proxy(vm, '_data', key);
      }
    }

    function proxy(vm, target, key) {
      Object.defineProperty(vm, key, {
        get() {
          return vm[target][key]
        },
        set(newValue) {
          vm[target][key] = newValue;
        }
      });
    }

    function initComputed(vm) {
      const computed = vm.$options.computed;
      const watchers = vm._computedWatchers = {};  // 将计算属性watcher保存到vm上
      for(let key in computed) {
        let userDef = computed[key];
        // 监控计算属性get的变化
        const fn = typeof userDef === "function" ? userDef : userDef.get;
        // 将属性和watcher对应起来
        watchers[key] = new Watcher(vm, fn, {lazy: true});
        defineComputed(vm, key, userDef);
      }
    }

    function defineComputed(target, key, userDef) {
      typeof userDef === "function" ? userDef : userDef.get;
      const setter = userDef.set || (()=>{});
      Object.defineProperty(target, key, {
        get: createComputedGetter(key),
        set: setter
      });
    }


    // 检测是否要执行getter
    // 计算属性不会自己收集依赖，让自己依赖的属性去收集waatcher
    function createComputedGetter(key) {
      return function() {
        const watcher = this._computedWatchers[key];
        if(watcher.dirty) {
          watcher.evaluate(); // 求值后，dirty变为false，走缓存
        }
        if(Dep.target) {
          // 如果dep。target存在，说明计算属性出栈后还有渲染watcher  应该让计算属性watcher里面的属性也去收集上层的watcher
          watcher.depend();
        }
        return watcher.value;
      }
    }


    function initWatch(vm) {
      let watch = vm.$options.watch;
      for(let key in watch) {  //字符串/数组/函数
        const handler = watch[key];
        if(Array.isArray(handler)) {
          for(let i = 0; i < handler.length; i ++ ) {
            createwatcher(vm,key,handler[i]);
          }
        } else {
          createwatcher(vm,key,handler);
        }
      }
    }

    function createwatcher(vm,key,handler) {
      if(typeof handler === 'string' ) {
        handler = vm[handler];
      }
      return vm.$watch(key, handler)
    }

    function initStateMixin(Vue) {
      Vue.prototype.$nextTick = nextTick;
      Vue.prototype.$watch = function(exprOrFn, cb) {
      // 值变化了，直接执行cb函数
      new Watcher(this, exprOrFn, {user: true}, cb);
      };
    }

    // 模板编译
    const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
    const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
    const startTagOpen = new RegExp(`^<${qnameCapture}`);  //匹配到的分组为标签名 <xxx

    const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配结束标签  </xxx>

    const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^\s"'=<>']+)))?/;  // 匹配属性  xxx="xxx"  xxx='xxx' xxx=xxx  第一个分组是属性， 分组三，四，五为值

    const startTagClose = /^\s*(\/?)>/;  // 开始标签的结束

    // 利用栈形结构构造sat语法书
    function parsHTML(html) {
      const ELEMENT_TYPE = 1; // 元素类型
      const TEXT_TYPE = 3; // 文本类型
      const stack = []; // 用于存放元素的
      let currentParent; // 指向栈中最后一个
      let root;
      // 最终转化为一棵抽象语法树
      // 栈中的最后一个元素就是当前匹配标签的父级
      function createASTElement(tag, attrs) {
        return {
          tag,
          type:ELEMENT_TYPE,
          children: [],
          attrs,
          parent: null,
        }
      }

      function start(tag, attrs) {
        let node = createASTElement(tag, attrs); // 创建一个ast节点
        if (!root) {   // 看一下是否是空树
          root = node;
        }
        if (currentParent) {
          node.parent = currentParent;
          currentParent.children.push(node);
        }
        stack.push(node);
        currentParent = node; // currentParent为栈中最后一个
        // console.log("开始标签", tag, attrs);
      }
      function chars(text) { // 文本直接放到当前指向的节点中
        text = text.replace(/\s/g, '');
        text && currentParent.children.push({
          type: TEXT_TYPE,
          text,
          parent: currentParent,
        });
        // console.log("文本", text);
      }
      function end(tag) {
        stack.pop(); // 结束标签弹出最后一个
        currentParent = stack[stack.length - 1]; // 更新currentParent
        // console.log("结束标签", tag);
      }
      function addvance(n) {
        html = html.substring(n);
      }
      function parsStartTag() {
        const start = html.match(startTagOpen);
        if(start) {
          const match = {
            tagName: start[1], // 标签名
            attrs: []
          };
          // 匹配过的进行删除
          addvance(start[0].length);
          // 如果不是开始标签的结束，就是属性，一直匹配
          let attr,end;
          while(!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
            addvance(attr[0].length);
            // 添加属性
            match.attrs.push({name:attr[1], value:attr[3] || attr[4] || attr[5]});
          }
          if(end) {
            addvance(end[0].length);
          }
          return match;
        }
        return false;
      }  while(html) {
        // 如果textEnd为0，则说明是开始或结束标签，如果大于0，则说明就是文本的结束位置
        let textEnd = html.indexOf('<');  // 如果indexOf中的索引是0，则说明是个标签
        if(textEnd == 0) {
          // 处理开始标签
          const startTagMatch = parsStartTag();
          if(startTagMatch) { // 解析开始标签
            start(startTagMatch.tagName, startTagMatch.attrs);
            continue;
          }
          // 处理结束标签
          let endTagMatch = html.match(endTag);
          if(endTagMatch) {
            end(endTagMatch.tagName);
            addvance(endTagMatch[0].length);
            continue;
          }
        }
        // 处理文本
        if(textEnd > 0) {
          let text = html.substring(0, textEnd);
          if(text) {
            chars(text);
            addvance(text.length);
          }
        }
      }
      return root;
    }

    // 模版引擎的实现原理，with + new Function
    const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;     // 表达式{{}}
    // 拼接属性
    function genProps(attrs) {
      let str = '';
      for(let i = 0; i < attrs.length; i ++) {
        let attr = attrs[i];
        if(attr.name === 'style') {
          // color: 'red' => {color: 'red'}
          let obj = {};
          attr.value.split(";").forEach(item => {
            let [key, value] = item.split(":");
            obj[key] = value;
          });
          attr.value = obj;
        }
        str += `${attr.name}: ${JSON.stringify(attr.value)},`;
      }
      return `{${str.slice(0, -1)}}`
    }
    // 拼接子元素
    function genChildren(children) {
      if(children) {
        return children.map(child => gen(child)).join(',')
      }
    }
    function gen(node) {
      if(node.type === 1) { // 如果是元素
        return codegen(node);
      } else { // 文本
        let text = node.text;
        if(!defaultTagRE.test(text)){ // 是否是纯文本
          return `_v(${JSON.stringify(text)})`
        } else {
          let tokens = [];
          let match;
          let lastIndex = 0;
          defaultTagRE.lastIndex = 0;
          while(match = defaultTagRE.exec(text)) {
            let index = match.index;
            if(index > lastIndex) {
              tokens.push(JSON.stringify(text.slice(lastIndex, index)));
            }
            tokens.push(`_s(${match[1].trim()})`);
            lastIndex = index + match[0].length;
          }
          if (lastIndex < text.length) {
            tokens.push(JSON.stringify(text.slice(lastIndex)));
          }
          return `_v(${tokens.join("+")})`
        }
      }
    }
    // sast拼接字符串 _c创建文本  _v创建文本  _s JSON.stringfy()
    function codegen(ast) {
      let children = genChildren(ast.children);
      let code = (`_c('${ast.tag}', ${
    ast.attrs.length > 0 ? genProps(ast.attrs) : 'null'
  }${
    ast.children.length ? `,${children}` : ''
  })`);
      return code;
    }

    const compileToFunction = function(template) {
      // 1.将template转化为ast语法树
      // 2.生成render方法，render方法执行后返回的结果就是虚拟DOM

      let ast = parsHTML(template);
      let code = codegen(ast);
      code = `with(this){return ${code}}`; // with语法，this是谁就在谁上面取
      let render = new Function(code); // 根据代码生成render函数
      return render;
    };

    function createElementVNode(vm, tag, data = {},...children) {  // h()  _c()
        if (data == null) data = {};
        let key = data.key;
        if(key) {
            delete data.key;
        }
        return vNode$1(vm,tag,key,data,children)
    }

    function createTextVNode(vm, text) {  // _v()
        return vNode$1(vm,undefined, undefined, undefined, undefined, text)
    }
    // ast做的是语法层面的转化，他描述的是语法本身(描述语言本身，js，css，html)
    // 但是虚拟dom，描述的是dom元素，可以增加一些自定义属性
    function vNode$1(vm,tag,key,data,children,text) {
        return {
            vm,
            tag,
            key,
            data,
            children,
            text,
        }
    }

    function isSameVnode(oldVnode, newVnode) {
        return oldVnode.tag === newVnode.tag && oldVnode.key === newVnode.key
    }

    // 虚拟54节点变真实节点

    function createElm(vNode) {
        let {tag, data, children, text} = vNode;
        if(typeof tag === 'string') {  // 是标签
            // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了，我们可以直接找到虚拟节点对应的真实节点来修改属性
            vNode.el = document.createElement(tag);
            patchProps(vNode.el,{}, data);
            children.forEach(chlid => {
                vNode.el.appendChild(createElm(chlid));
            });
        } else {
            vNode.el = document.createTextNode(text);
        }
        return vNode.el;
    }

    function patchProps(el, oldProps = {}, props= {}) {
        // 老的属性有，新的没有，要删除老的
        let oldStyles = oldProps.style;
        let newStyles = props.style;
        for(let key in oldStyles) {
            if(!newStyles[key]) {
                el.style[key] = '';
            }
        }

        for(let key in oldProps) {
            if(!props[key]) {
                el.removeAttribute(key);
            }
        }
        for(let key in props) {
            if(key === 'style') {
                for(let styleName in props.style){
                    el.style[styleName] = props.style[styleName];
                }
            } else {
                el.setAttribute(key, props[key]);
            }
        }
    }

    function patch(oldVNode, vNode){
        // 初次渲染
        const isRealElement = oldVNode.nodeType; //nodeType是dom原生方法
        if(isRealElement) {
            const elm = oldVNode; // 获取真实元素
            const parentElm = elm.parentNode;  // 拿到父元素
            let newElm = createElm(vNode); // 拿到新的真实dom
            parentElm.insertBefore(newElm, elm.extSibling); // 将新节点插入老节点下方，在删除老节点，避免位置变化
            parentElm.removeChild(elm); // 删除老节点
            return newElm;
        } else {
            // diff算法
            patchVnode();
        }
    }

    function patchVnode() {
        // 两个节点不是同一个节点，直接删除老的换上新的，无比对
        // 两个节点是同一个节点（判断节点的tag和节点的key）比较两个节点的属性是否有差异（复用老的节点，将差异属性更新）
        // 节点比较完毕后就需要比较两人的儿子
        if(!isSameVnode(oldVNode, vNode)) {  // 父节点不同，直接替换
            // 用老节点的父级进行替换
            let el = createElm(vNode);
            oldVNode.el.parentNode.replaceChild(el, oldVNode.el);  // replaceChild 实现子节点(对象)的替换。返回被替换对象的引用。 
            return el;
        } 
        // 文本情况，文本我们期望比较一下文本内容
        vNode.el = oldVNode.el; // 复用节点，替换内容
        if(!oldVNode.tag) {
            if(oldVNode.text !== vNode.text) {
                oldVNode.el.textContent = vNode.text;  // 新的文本覆盖掉老的
            }
        }
        // 是标签，比对标签属性
        patchProps(el, oldVNode.data, vNode.data);


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
            unMountChildren(el);
        }



        return el
    }

    function mountChildren(el,newChildren) {
     for(let i = 0; i< newChildren.length; i++) {
        let child = newChildren[i];
        el.appendChild(createElm(child));
     }
    }

    function unMountChildren() {
        el.innerHTML = '';
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
            let map = {};
            children.forEach((child, index) => {
                map[child.key] = index;
            });
            return map;
        }

        let map = makeIndexBykey(oldChildren);

        while(oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
            // 移动的时候遇到空跳过
            if(!oldStartVnode) {
                oldStartVnode = oldChildren[++oldStartIndex];
            } else if(!oldEndVnode) {
                oldStartVnode = oldChildren[--oldStartIndex];
            }
            // 双方有一方头指针大于尾指针则停止
            // 头指针后移   头头比对
            else if(isSameVnode(oldStartVnode, newStartVnode)) {  // 对比头头是否一样
                patchVnode(); // 如果是相同节点，则递归比较子节点
                oldStartVnode = oldChildren[++oldStartIndex];
                newStartVnode = newChildren[++newStartIndex];
            }
            // 尾指针前移  尾尾比对
            else if(isSameVnode(oldEndVnode, newEndVnode)) {  // 对比尾尾是否一样
                patchVnode(); // 如果是相同节点，则递归比较子节点
                oldEndVnode = oldChildren[--oldEndIndex];
                newEndVnode = newChildren[--newEndIndex];
            }

            // 交叉比对  尾比头
            else if(isSameVnode(oldEndVnode, newStartVnode)) {  // 对比首尾是否一样
                patchVnode(); // 如果是相同节点，则递归比较子节点
                el.insertBefore(oldEndVnode.el, oldStartVnode.el); // 将老的尾巴移动到老的头指针前面  insertBefore具备移动性
                oldEndVnode = oldChildren[--oldEndIndex];
                newStartVnode = newChildren[++newStartIndex];
            }
            // 交叉比对  头比尾
            else if(isSameVnode(oldStartVnode, newEndIndex)) {  // 对比首尾是否一样
                patchVnode(); // 如果是相同节点，则递归比较子节点
                el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling); // 将老的头部移动到尾指针后面
                oldStartVnode = oldChildren[++oldStartIndex];
                newEndVnode = newChildren[--oldEndIndex];
            } else {
                // 乱序比对
                let moveIndex = map[newStartVnode.key]; // 如果拿到则说明是要移动的索引
                if(moveIndex !== undefined) {
                    let moveVnode = oldChildren[moveIndex]; // 找到对应虚拟节点
                    el.insertBefore(oldStartVnode.el, moveVnode.el);
                    oldChildren[moveIndex] = undefined; // 标识节点已经移动走了
                    patchVnode(); // 比对属性和子节点
                } else {
                    el.insertBefore(createElm(newStartVnode), oldStartVnode.el);
                }
                newStartVnode = newChildren[++newStartIndex];
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
                    let childEl = oldChildren[i].el;
                    el.removeChild(childEl);
                }
            }
        }
    }

    // 组件挂载

    function initLifeCycle(Vue) {
        Vue.prototype._update = function(vNode) {
            // patch既有初始化的功能，又有更新的逻辑
            const vm = this;
            const el = vm.$el;
            vm.$el = patch(el, vNode);
        };
        // _c('div',{}, ...children)
        Vue.prototype._c = function() {
            return createElementVNode(this, ...arguments)
        };
        // _v(text)
        Vue.prototype._v = function() {
            return createTextVNode(this, ...arguments)
        };
        Vue.prototype._s = function(value) {
            if(typeof value !== 'object') return value
            return JSON.stringify(value)
        };
        Vue.prototype._render = function() {
            // 当渲染的时候会去实例中取值，我们就可以将属性和视图绑定在一起
            const vm = this;
            return vm.$options.render.call(vm);
        };
    }

    function mountComponent(vm, el) {  //这里的的el是通过querySelector处理过的
        vm.$el = el;
        // 1.调用render方法，生成虚拟dom

        const updateComponent = () => {
            vm._update(vm._render());  // vm.$options.render();返回虚拟节点
        };

        new Watcher(vm, updateComponent, true); // true标识渲染watcher
        // 2.根据虚拟dom生成真实dom
        // 3.插入到el元素中
    }


    // vue核心流程
    // 1.创造了响应式数据
    // 2.将模版转化为ast语法树
    // 3.将ast语法树转化为render函数； 后续每次数据更新可以只执行render函数，无需再次执行转化过程；render函数会产生虚拟节点（使用响应式数据）
    // 4.根据创建的虚拟节点创造真实dom

    function callHook(vm, hook) {  // 调用钩子函数
        const handlers = vm.$options[hook];
        if(handlers) {
            handlers.forEach(handler => handler.call(vm));
        }
    }

    function initMixin(Vue) {  // 给Vue增加init方法
      Vue.prototype._init = function(options) {
        // vue vm.$options  就是获取用户配置   $表示vue自己的，所有以$开头的都认为是自身属性
        const vm = this;
        // 我们定义的全局指令和过滤器都会挂载到实例上
        vm.$options = mergeOptions(this.constructor.options, options);  // 将用户的选项与全局的合并挂载到实例上

        callHook(vm, 'beforeCreate');
        // 初始化状态
        initState(vm);
        callHook(vm, 'created');
        if(options.el) {
          vm.$mount(options.el);
        }
      };
      Vue.prototype.$mount = function(el) {
        const vm = this;
        el = document.querySelector(el);
        let ops = vm.$options;
        if(!ops.render) {    // 判断用户是否写了render函数
          let template;
          if(!ops.template && el) {   //没有render判断是否写了template,没有template但是有el， 采用外部的template
            template = el.outerHTML;
          } else {
            if(el) {   //  有template就用传入的template
              template = ops.template;
            }
          }
          // 获取到模板后，对模板进行编译
          if(template && el) {
            const render = compileToFunction(template);
            ops.render = render;
          }
        }

        mountComponent(vm, el);
        ops.render;
      };
    }

    function Vue(options) {  // options  用户选项
      this._init(options);
    }
    initMixin(Vue);  // 扩展init方法
    initLifeCycle(Vue); // vm._upDate  vm._render
    initGloablApi(Vue); // mixin方法  (全局api)
    initStateMixin(Vue); // nextTick   watch

    // =================================虚拟dom前后对比=================

    let render1 = compileToFunction(`<div>{{name}}</div>`);


    let vm1 = new Vue({data:{name: '1111'}});
    let preVdom = render1.call(vm1);

    let render2 = compileToFunction(`<span>{{name}}</span>`);


    let vm2 = new Vue({data:{name: '222'}});
    let nextVdom = render2.call(vm2);
    console.log(preVdom, nextVdom);

    return Vue;

}));
//# sourceMappingURL=vue.js.map
