import { initGloablApi } from "./gloablAPI"
import { initMixin } from "./init"
import { initLifeCycle } from "./lifecycle"
import { nextTick } from "./observe/watcher"
function Vue(options) {  // options  用户选项
  this._init(options)
}
Vue.prototype.$nextTick = nextTick
initMixin(Vue)  // 扩展init方法
initLifeCycle(Vue)
initGloablApi(Vue) // mixin方法

export default Vue