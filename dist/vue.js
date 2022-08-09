(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

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
      return result;
    };
  });

  class Observer {
    constructor(data) {
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
    observe(value); // 递归对所有对象都进行属性劫持
    Object.defineProperty(target,key, {
      get() {   // 用户取值走get方法
        return value;
      },
      set(newValue) {  // 用户设置值走set方法
        if(newValue === value) return;
        observe(newValue); // 递归对所有对象都进行属性劫持
        value = newValue;
      }
    });
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

  function initState(vm) {
    const opts = vm.$options;
    if(opts.data) {
      initData(vm);
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

  // 模板编译

  const compileToFunction = function(template) {
    // 1.将template转化为ast语法树
    // 2.生成render方法，render方法执行后返回的结果就是虚拟DOM
    console.log(template);
  };

  function initMixin(Vue) {  // 给Vue增加init方法
    Vue.prototype._init = function(options) {
      // vue vm.$options  就是获取用户配置   $表示vue自己的，所有以$开头的都认为是自身属性
      const vm = this;
      vm.$options = options;  // 将用户的选项挂载到实例上

      // 初始化状态
      initState(vm);

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
        if(template) {
          const render = compileToFunction(template);
          ops.render = render;
        }
      }

      ops.render;
    };
  }

  function Vue(options) {  // options  用户选项
    this._init(options);
  }
  initMixin(Vue);  // 扩展init方法

  return Vue;

}));
//# sourceMappingURL=vue.js.map
