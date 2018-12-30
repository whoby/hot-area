/**
 * @create  :  2017/08/16
 * @author  :  wangwb
 * @desc    :  图片热区插件
 * @e.g.    :  输出热区areas: [{url:'http://...', target:'_blank', coords:[x1, y1, x2, y2]}]
 */

function HotArea(opts) {
    this.opts = $.extend(true, {
        bgImg: '',
        areas: [],
        callback: null // 数据回传函数
    }, opts);

    // 全局画布对象
    this.$canvas = null;

    // 是否有改动标识，用于误操作提示
    this.isModified = false;

    this.init();
}

HotArea.prototype = {
    // 初始化弹窗
    init: function() {
        var self = this;

        if (!this.opts.bgImg) {
            return;
        }

        var canvasImg = new Image();
        canvasImg.src = this.opts.bgImg;

        // 获取图片尺寸，以初始化弹窗及画布
        canvasImg.onload = function() {
            var canvasW = this.width,
                canvasH = this.height,
                $popup = $(
                    '<div class="canvas-wrap" onselectstart="return false">' +
                    '   <div class="rule ruleV" style="height:' + canvasH + 'px;"></div>' +
                    '   <div class="rule ruleH"></div>' +
                    '   <div id="canvas"></div>' +
                    '</div>'
                );

            // 设置全局对象
            self.$canvas = $popup.find('#canvas');
            // 初始化画面图层
            self.initCanvas(canvasW, canvasH);
            // 绑定画布绘画事件
            self.drawEvent();

            // 渲染弹窗（先渲染画布，方便窗口准确定位）
            var dialog = window.dialog({
                title: '热区图片',
                content: $popup,
                button: [{
                    value: '保存',
                    autofocus: true,
                    callback: function() {
                        return self.onSaveCanvas();
                    }
                }],
                cancelValue: '取消',
                cancel: function() {
                    return self.onCancelCanvas();
                }
            });
            dialog.showModal();
        };
    },

    // 初始化画布
    initCanvas: function(canvasW, canvasH) {
        var self = this,
            props = {
                width: canvasW,
                height: canvasH,
                background: 'url(' + this.opts.bgImg + ')'
            };

        this.$canvas.css(props);

        // 回显图层数据
        if (this.opts.areas) {
            // 热区坐标转换成画布参数
            this.opts.areas = this.dataTransfer(this.opts.areas, 'init');

            this.opts.areas.forEach(function(item) {
                var $curLayer = self.renderLayer(item.props);
                $curLayer.data({
                    url: item.url,
                    target: item.target
                });

                $curLayer.find('.handle, .layer-tip').removeClass('hide');

                self.dragEvent($curLayer);
                self.bindEvent($curLayer);
            });
        }
    },

    // 绘画图层
    drawEvent: function() {
        var self = this,
            drawing = false,
            $curLayer = null,
            canvasOffset = {},
            props = {};

        // 按下鼠标
        this.$canvas.mousedown(function(e) {
            if (drawing) {
                return;
            }
            drawing = true;

            // 当canvas在弹窗内，需实时取才准确
            canvasOffset = self.$canvas.offset();
            props = {
                left: e.clientX - canvasOffset.left,
                top: e.clientY - canvasOffset.top,
                width: 0,
                height: 0
            };

            $curLayer = self.renderLayer(props);
        });

        // 移动鼠标绘画
        this.$canvas.mousemove(function(e) {
            if (drawing) {
                props.width = e.clientX - props.left - canvasOffset.left;
                props.height = e.clientY - props.top - canvasOffset.top;

                self.renderLayer(props, $curLayer);
            }
        });

        // 收起鼠标结束绘画
        this.$canvas.mouseup(function(e) {
            if (drawing) {
                if (props.width < 12 || props.height < 12) {
                    $curLayer.remove();
                } else {
                    $curLayer.find('.handle, .layer-tip').removeClass('hide');

                    self.isModified = true;
                    self.dragEvent($curLayer);
                    self.bindEvent($curLayer);
                }

                drawing = false;
            }
        });
    },

    // 渲染图层
    renderLayer: function(props, $layer) {
        $layer = $layer || null;

        if (!$layer) {
            var idx = +new Date() + Math.floor(Math.random() * 900 + 100),
                html = [];

            html.push(
                '<div id="drag-' + idx + '" data-url="" data-target="" class="drag">',
                '    <span class="handle NE hide"></span>',
                '    <span class="handle NN hide"></span>',
                '    <span class="handle NW hide"></span>',
                '    <span class="handle WW hide"></span>',
                '    <span class="handle EE hide"></span>',
                '    <span class="handle SW hide"></span>',
                '    <span class="handle SS hide"></span>',
                '    <span class="handle SE hide"></span>',
                '    <span class="layer-tip hide">双击设置链接</span>',
                '    <span class="layer-close"></span>',
                '</div>'
            );

            $layer = $(html.join(''));
            this.$canvas.append($layer);
        }

        // 添加文字垂直距中
        props.lineHeight = props.height + 'px';
        $layer.css(props);

        return $layer;
    },

    // 画布层拖拽
    dragEvent: function($curLayer) {
        var self = this,
            $drag = $curLayer;

        $drag.mouseover(function() {
                $(this).find('.layer-close').show();
            })
            .mouseout(function() {
                $(this).find('.layer-close').hide();
            })
            .click(function(e) {
                e.stopPropagation();
            })
            .drag('start', function(ev, dd) {
                dd.attr = $(ev.target).prop('className');
                dd.width = $(this).width();
                dd.height = $(this).height();

                // 限制移动区域
                dd.limit = {
                    top: 0,
                    left: 0,
                    bottom: self.$canvas.outerHeight() - $(this).outerHeight(),
                    right: self.$canvas.outerWidth() - $(this).outerWidth()
                };
            })
            .drag(function(ev, dd) {
                var props = {};
                if (dd.attr.indexOf('E') > -1) {
                    props.width = Math.max(16, dd.width + dd.deltaX);
                }
                if (dd.attr.indexOf('S') > -1) {
                    props.height = Math.max(16, dd.height + dd.deltaY);
                }
                if (dd.attr.indexOf('W') > -1) {
                    props.width = Math.max(16, dd.width - dd.deltaX);
                    props.left = dd.originalX + dd.width - props.width;
                }
                if (dd.attr.indexOf('N') > -1) {
                    props.height = Math.max(16, dd.height - dd.deltaY);
                    props.top = dd.originalY + dd.height - props.height;
                }
                if (dd.attr.indexOf('drag') > -1) {
                    props.top = dd.offsetY;
                    props.left = dd.offsetX;
                }

                // 限制移动区域
                if (props.top) {
                    props.top = Math.min(dd.limit.bottom, Math.max(dd.limit.top, props.top));
                }

                if (props.left) {
                    props.left = Math.min(dd.limit.right, Math.max(dd.limit.left, props.left));
                }

                self.isModified = true;
                self.renderLayer(props, $(this));
            }, {
                relative: true
            });
    },

    // 其它事件
    bindEvent: function($curLayer) {
        var self = this;

        // 删除图层
        $curLayer.find('.layer-close').click(function() {
            $(this).closest('.drag').remove();
        });

        // 编辑图层
        $curLayer.dblclick(function(e) {
            // 获取初始数据
            var url = $(this).data('url') || '',
                target = $(this).data('target') || '',
                width = $(this).width(),
                height = $(this).height();

            var $html = $(
                '<div class="edit-area">' +
                '   <div class="row"><label>链接：</label><input type="text" name="url" value="' + url + '" placeholder="http://" class="input-text"></div>' +
                '   <div class="row"><label>尺寸：</label><span>宽 <input type="text" name="width" value="' + width + '" class="input-text short"> px，</span><span>高 <input type="text" name="height" value="' + height + '" class="input-text short"> px</span></div>' +
                '   <div class="row"><label></label><input type="checkbox" name="target"' + (target == '_blank' ? ' checked' : '') + '> 新窗口打开</div>' +
                '</div>'
            );

            var dialog = window.dialog({
                title: '编辑热区',
                content: $html,
                button: [{
                    value: '确定',
                    autofocus: true,
                    callback: function() {
                        return self.onSaveArea($curLayer, $html);
                    }
                }, {
                    value: '取消',
                    callback: function() {
                        return true;
                    }
                }]
            });

            dialog.show();
        });
    },

    // 保存单个热区
    onSaveArea: function($curLayer, $form) {
        var url = $.trim($form.find('input[name=url]').val());
        if (!url) {
            alert('你还没有填写热区链接');
            return false;
        }

        // 保存链接属性
        $curLayer.data({
            url: $form.find('input[name=url]').val(),
            target: $form.find('input[name=target]').is(':checked') ? '_blank' : '_self'
        });

        // 重绘图层宽高
        this.renderLayer({
            width: $form.find('input[name=width]').val(),
            height: $form.find('input[name=height]').val()
        }, $curLayer);

        this.isModified = true;
    },

    // 坐标与热区数据转换
    dataTransfer: function(data, flag) {
        var arr = [];

        if (flag == 'init') {
            data.forEach(function(item) {
                var props = {
                    left: item.coords[0],
                    top: item.coords[1],
                    width: item.coords[2] - item.coords[0],
                    height: item.coords[3] - item.coords[1]
                };

                arr.push({
                    url: item.url,
                    target: item.target,
                    props: props
                });
            });

        } else {
            data.forEach(function(item) {
                var x1 = item.props.left,
                    y1 = item.props.top,
                    x2 = item.props.left + item.props.width,
                    y2 = item.props.top + item.props.height;

                arr.push({
                    url: item.url,
                    target: item.target,
                    coords: [x1, y1, x2, y2]
                });
            });
        }

        return arr;
    },

    // 保存所有热区
    onSaveCanvas: function(opts) {
        var areas = [],
            allHasUrl = true;

        this.$canvas.find('.drag').each(function(index, item) {
            var url = $(item).data('url');
            if (!url) {
                allHasUrl = false;
                return false;
            }

            areas.push({
                url: $(item).data('url'),
                target: $(item).data('target'),
                props: {
                    top: $(item).position().top,
                    left: $(item).position().left,
                    width: $(item).width(),
                    height: $(item).height()
                }
            });
        });

        if (!allHasUrl) {
            window.alert('部分热区还未设置url链接，请检查');
            return false;
        }

        if (!areas.length) {
            window.alert('当前无热区保存，请先创建图片热区');
            return false;
        }

        // 转换数据
        areas = this.dataTransfer(areas);

        // 通过回调将处理后的数据回传
        if (this.opts.callback) {
            this.opts.callback(areas);
        }
    },

    // 画布关闭或取消事件
    onCancelCanvas: function() {
        if (this.isModified && !window.confirm('当前图片热区有修改未保存，确定要退出？')) {
            return false;
        }

        return true;
    }
};