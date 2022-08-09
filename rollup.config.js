// rollup 默认到处一个对象，作为配置文件
import babel from "rollup-plugin-babel"
import resolve from '@rollup/plugin-node-resolve'
export default {
  input: './src/index.js', // 入口
  output: {
    file: './dist/vue.js',  // 出口
    name: 'Vue', // lobal.Vue
    format: "umd", // 打包规范
    sourcemap: true, // 希望可以调试源代码
  },
  Plugins: [
    babel({
      exclude: 'node_modules/**'   // 排除第三方依赖包文件
    }),
    resolve()
  ]
}