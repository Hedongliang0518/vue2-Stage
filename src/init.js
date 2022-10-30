
import { initState } from './state'
import { compileToFunction } from './compiler/index'
import { callHook, mountComponent } from './lifecycle';
import { mergeOptions } from "./utils"

export function initMixin(Vue) {  // 给Vue增加init方法
  Vue.prototype._init = function(options) {
    // vue vm.$options  就是获取用户配置   $表示vue自己的，所有以$开头的都认为是自身属性
    const vm = this;
    // 我们定义的全局指令和过滤器都会挂载到实例上
    vm.$options = mergeOptions(this.constructor.options, options);  // 将用户的选项与全局的合并挂载到实例上

    callHook(vm, 'beforeCreate')
    // 初始化状态
    initState(vm)
    callHook(vm, 'created')
    if(options.el) {
      vm.$mount(options.el)
    }
  }
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
        const render = compileToFunction(template)
        ops.render = render;
      }
    }

    mountComponent(vm, el)
    ops.render;
  }
}

