// 模板编译
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`)  //匹配到的分组为标签名 <xxx

const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配结束标签  </xxx>

const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^\s"'=<>']+)))?/;  // 匹配属性  xxx="xxx"  xxx='xxx' xxx=xxx  第一个分组是属性， 分组三，四，五为值

const startTagClose = /^\s*(\/?)>/;  // 开始标签的结束

// 利用栈形结构构造sat语法书
export function parsHTML(html) {
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
      root = node
    }
    if (currentParent) {
      node.parent = currentParent;
      currentParent.children.push(node)
    }
    stack.push(node);
    currentParent = node; // currentParent为栈中最后一个
    // console.log("开始标签", tag, attrs);
  }
  function chars(text) { // 文本直接放到当前指向的节点中
    text = text.replace(/\s/g, '')
    text && currentParent.children.push({
      type: TEXT_TYPE,
      text,
      parent: currentParent,
    })
    // console.log("文本", text);
  }
  function end(tag) {
    stack.pop(); // 结束标签弹出最后一个
    currentParent = stack[stack.length - 1] // 更新currentParent
    // console.log("结束标签", tag);
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
  return root;
}