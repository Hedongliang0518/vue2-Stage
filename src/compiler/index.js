// 模板编译
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`)  //匹配到的分组为标签名 <xxx

const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配结束标签  </xxx>

const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^\s"'=<>']+)))?/;  // 匹配属性  xxx="xxx"  xxx='xxx' xxx=xxx  第一个分组是属性， 分组三，四，五为值

const startTagClose = /^\s*(\/?)>/;  // 开始标签的结束

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g     // 表达式{{}}
export const compileToFunction = function(template) {
  // 1.将template转化为ast语法树
  // 2.生成render方法，render方法执行后返回的结果就是虚拟DOM

  let ast = parsHTML(template)
}

function parsHTML(html) {
  const ELEMENT_TYPE = 1;
  const TEXT_TYPE = 3;
  const stack = []; // 用于存放元素的
  let currentParent; // 指向栈中最后一个
  let root;
  // 最终转化为一棵抽象语法树
  // 栈中的最后一个元素就是当前匹配标签的父级
  function createASTElement(tag, attrs) {
    return{
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
      root = node
    }
    stack.push(node);
    currentParent = node;
    console.log("开始标签", tag, attrs);
  }
  function chars(text) {
    console.log("文本", text);
  }
  function end(tag) {
    console.log("结束标签", tag);
  }
  function addvance(n) {
    html = html.substring(n)
  }
  function parsStartTag() {
    const start = html.match(startTagOpen);
    if(start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: []
      }
      // 匹配过的进行删除
      addvance(start[0].length);
      // 如果不是开始标签的结束，就是属性，一直匹配
      let attr,end;
      while(!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        addvance(attr[0].length);
        // 添加属性
        match.attrs.push({name:attr[1], value:attr[3] || attr[4] || attr[5]})
      }
      if(end) {
        addvance(end[0].length)
      }
      return match;
    }
    return false;
  };
  while(html) {
    // 如果textEnd为0，则说明是开始或结束标签，如果大于0，则说明就是文本的结束位置
    let textEnd = html.indexOf('<');  // 如果indexOf中的索引是0，则说明是个标签
    if(textEnd == 0) {
      // 处理开始标签
      const startTagMatch = parsStartTag()
      if(startTagMatch) { // 解析开始标签
        start(startTagMatch.tagName, startTagMatch.attrs)
        continue;
      }
      // 处理结束标签
      let endTagMatch = html.match(endTag);
      if(endTagMatch) {
        end(endTagMatch.tagName)
        addvance(endTagMatch[0].length);
        continue;
      }
    }
    // 处理文本
    if(textEnd > 0) {
      let text = html.substring(0, textEnd)
      if(text) {
        chars(text)
        addvance(text.length)
      }
    }
  }
  console.log("111", html);
}