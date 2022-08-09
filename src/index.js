import { initMixin } from "./init"
function Vue(options) {  // options  用户选项
  this._init(options)
}
initMixin(Vue)  // 扩展init方法

export default Vue