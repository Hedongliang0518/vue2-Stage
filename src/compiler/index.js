// 模版引擎的实现原理，with + new Function
import { parsHTML } from "./parse";
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g     // 表达式{{}}
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
      })
      attr.value = obj;
    }
    str += `${attr.name}: ${JSON.stringify(attr.value)},`
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
          tokens.push(JSON.stringify(text.slice(lastIndex, index)))
        }
        tokens.push(`_s(${match[1].trim()})`)
        lastIndex = index + match[0].length;
      }
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)))
      }
      return `_v(${tokens.join("+")})`
    }
  }
}
// sast拼接字符串 _c创建文本  _v创建文本  _s JSON.stringfy()
function codegen(ast) {
  let children = genChildren(ast.children)
  let code = (`_c('${ast.tag}', ${
    ast.attrs.length > 0 ? genProps(ast.attrs) : 'null'
  }${
    ast.children.length ? `,${children}` : ''
  })`)
  return code;
}

export const compileToFunction = function(template) {
  // 1.将template转化为ast语法树
  // 2.生成render方法，render方法执行后返回的结果就是虚拟DOM

  let ast = parsHTML(template)
  let code = codegen(ast);
  code = `with(this){return ${code}}`; // with语法，this是谁就在谁上面取
  let render = new Function(code); // 根据代码生成render函数
  return render;
}
