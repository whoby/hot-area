### 图片热区插件

#### 1. 说明：
用户通过鼠标拖拽创建热区大小，并可以调整、编辑热区大小、链接等属性，最终输出前台用户需要的图片数据。

#### 2. 用法（可多例）

```js
var opts = {
    bgImg: '',
    areas: [],
    elem: '',
    callback: function(data) {
        console.log(data);
    }
};

new HotArea(opts);
```