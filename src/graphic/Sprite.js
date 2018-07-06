
import Displayable from './Displayable';
import BoundingRect from '../core/BoundingRect';
import * as zrUtil from '../core/util';
import * as imageHelper from './helper/image';

// /**
//  * 动画主控制器
//  * @config startIndex(0) 开始位置
//  * @config endIndex(0) 结束位置
//  * @config duration(1000) 动画间隔
//  * @config delay(0) 动画延迟时间
//  * @config loop(true)
//  * @config gap(0) 循环的间隔时间
//  * @config onframe
//  * @config ondestroy(optional)
//  * @config onrestart(optional)
//  *
//  * TODO pause
//  */
function isNumber(value){
    return typeof value === 'number' && value === value
}

function Clip(config) {
    var conf = config || {}
    // { loop, startIndex, endIndex, duration, delay, gap, onframe, ondestroy, onrestart }
    this.onframe = conf.onframe || zrUtil.noop
    this.ondestroy = conf.ondestroy || zrUtil.noop
    this.onrestart = conf.onrestart || zrUtil.noop

    this._duration = conf.duration || 1000
    this._doneList = []
    this._onframeList = []
    this._initialized = false
    // 延时
    this._delay = conf.delay || 0
    // 是否循环
    this._loop = !!(conf.loop)
    this._gap = conf.gap || 0

    this._startIndex = isNumber(conf.startIndex) ? conf.startIndex : 0
    this._endIndex =  isNumber(conf.endIndex) ? conf.endIndex : 0
    this._index = 0

    this._pausedTime = 0
    this._paused = false
    this._nextTime = 0
    this._needRestart = false
  }
Clip.prototype = {

    constructor: Clip,
    setConfig:function(config){
        /**
         * @config startIndex(0) 开始位置
         * @config endIndex(0) 结束位置
         * @config duration(1000) 动画间隔
         */
        if(config.hasOwnProperty('startIndex') && isNumber(config.startIndex)){
            this._startIndex = config.startIndex
            this._needRestart = true
        }
        if(config.hasOwnProperty('endIndex') && isNumber(config.endIdnex)){
            this._endIndex = config.endIndex
            this._needRestart = true
        }
        if(config.hasOwnProperty('duration')&& isNumber(config.duration)){
            this._duration = config.duration
        }
        
    },
    /**
     * 开始执行动画
     * @return {module:zrender/animation/Animator}
     */
    start:function() {
        if (!this._frameCount || this._startIndex >= this._frameCount - 1) {
             return this._doneCallback()
        }
        return this
    },
    /**
     * @return {Array.<module:zrender/animation/Clip>}
     */
    getClips:function() {
        return [this]
    },
    /**
     *
     * @param {*} globalTime Animation 运行时间
     * @param {*} deltaTime 两次调用的时间差
     */
    step:function(globalTime, deltaTime) {
        // Set startTime on first step, or _startTime may has milleseconds different between clips
        // PENDING
        if (!this._initialized) {
            this._startTime = globalTime + this._delay
            this._index = this._startIndex + 1
            this._nextTime = this._startTime + this._duration
            this._initialized = true
        }
        if(this._needRestart){
            this._needRestart = false
            this.restart(globalTime)
            return 
        }
        if (this._paused) {
            this._pausedTime += deltaTime
            return
        }

        if (globalTime - this._pausedTime >= this._nextTime) {
            this.onframe(this._index)
            this._index = this._index + 1
            // 如果帧全部播放完
            if (this._index > this._endIndex) {
                if (this._loop) {
                    this.restart(globalTime)
                    // 重新开始周期
                    // 抛出而不是直接调用事件直到 stage.update 后再统一调用这些事件
                    return 'restart'
                }

                // 动画完成将这个控制器标识为待删除
                // 在Animation.update中进行批量删除
                this._needsRemove = true
                return 'destroy'
            } else {
                this._nextTime = this._nextTime + this._duration
            }
        }

        return null
    },

    restart:function(globalTime) {
        this._startTime = globalTime + this._gap
        this._pausedTime = 0
        this._needsRemove = false
        this._index = this._startIndex
        this._nextTime = this._duration + this._startTime// 上一帧保留时间 + 开始时间
    },

    pause:function() {
        this._paused = true
    },

    resume:function() {
        this._paused = false
    },
    isPaused:function() {
        return !!this._paused
    },

    _doneCallback:function() {
        var doneList = this._doneList
        var len = doneList.length
        for (var i = 0; i < len; i++) {
            doneList[i].call(this)
        }
    },
    fire:function(eventType, arg) {
        eventType = 'on' + eventType
        if (this[eventType]) {
            this[eventType](arg)
        }
    }
}

/**
 * @alias zrender/graphic/Sprite 
 * @extends module:zrender/graphic/Displayable
 * @constructor
 * @param {Object} opts
 */
function ZSprite(opts) {
    Displayable.call(this, opts);
}

ZSprite.prototype = {

    constructor: ZSprite,
    type: 'sprite',
    /**
     * 
     */
    setClip:function(config){
        //TODO:重新设置Clip属性
        config && this._clip.setConfig(config)
        return this
    },
    brush: function(ctx, prevEl) {
        var style = this.style
        var src = style.image
        var zr = this.__zr
        var _this = this
        // Must bind each time
        style.bind(ctx, this, prevEl)

        style.offset_x = style.offset_x || 0
        style.offset_y = style.offset_y || 0
        style.padding_x = style.padding_x || 0
        style.padding_y = style.padding_y || 0
        style.numFrames = style.numFrames || 0
        style.frame = style.frame || 0

        this.autoplay = this.clip.autoplay === true

        var image = this._image = imageHelper.createOrUpdateImage(
        src,
        this._image,
        this,
        function(image) {
            // Set the full source image dimensions
            _this.full_width = image.width
            _this.full_height = image.height
            var dir = style.direction || 'x'
            var padding_size = (dir === "y") ? style.padding_y : style.padding_x
            // If automatic generation is specified
            var length_full = (dir === "y") ? _this.full_height : _this.full_width
            var length_cropped = (dir === "y") ? style.h : style.w
            style.numFrames = style.numFrames > 0 ? style.numFrames : Math.floor((length_full - padding_size * 2)/ length_cropped)
            _this._clip = new Clip({
                loop: _this.clip.loop,
                startIndex: _this.clip.startIndex || 0,
                endIndex: _this.clip.endIdnex || style.numFrames - 1,
                duration: _this.clip.duration,
                onframe: function(frameIndex) {
                    _this.setStyle('frame',frameIndex)
                }
            })
            _this.autoplay && _this._clip.start()
            // If animate after added to the zrender
            zr && zr.animation.addAnimator(_this._clip)
            _this.loaded = true
            zrUtil.isFunction(_this.onload) && _this.onload()
        })

        if (!image || !imageHelper.isImageReady(image)) {
            return
        }

        // 设置transform
        this.setTransform(ctx)
        if (this.loaded) {
            // console.log('call brush::::', style.frame, this.frames)
            this._draw(ctx, style)
        }
        // Draw rect text
        if (style.text != null) {
            // Only restore transform when needs draw text.
            this.restoreTransform(ctx)
            this.drawRectText(ctx, this.getBoundingRect())
        }
    },
    _draw: function(ctx, style) {
        // var _this = this
        var x = style.x || 0
        var y = style.y || 0

        // If the image has not been loaded or the sprite has no frames, the frame size must be 0 (for clipChildren feature).
        var fw = style.w
        var fh = style.h
        var frameIndex = style.frame
        var dir = style.direction || 'x'
        var padding_size = (dir === "y") ? style.padding_y : style.padding_x
        var frame = {
            x: padding_size + style.offset_x + (frameIndex * (dir === "x" ? style.w : 0)),
            y: padding_size + style.offset_y + (frameIndex * (dir === "y" ? style.h : 0))
        }
        if (frameIndex > style.numFrames) {
            // Do clip with an empty path
            if (this.clipChildren) {
                ctx.beginPath()
                ctx.rect(x, y, 0, 0)
                ctx.closePath()
                ctx.clip()
            }
            return this
        }
        // Draw the current sprite part
        ctx.drawImage(this._image, frame.x, frame.y, fw, fh, x, y, fw, fh)
        if (this.strokeWidth > 0) {
            ctx.lineWidth = this.strokeWidth
            ctx.strokeStyle = this.strokeColor
            ctx.strokeRect(x, y, fw, fh)
        }
    },
    getBoundingRect:function() {
        var style = this.style
        if (!this._rect) {
            this._rect = new BoundingRect( style.x || 0, style.y || 0, style.w || 0, style.h || 0)
        }
        return this._rect
    }
}
zrUtil.inherits(ZSprite, Displayable);

export default ZSprite
