import Displayable from './Displayable';
import BoundingRect from '../core/BoundingRect';
import * as zrUtil from '../core/util';
import * as imageHelper from './helper/image';

import Clip from '../animation/Clip';

// /**
//  * 动画主控制器
//  * @config duration(1000) 动画间隔
//  * @config delay(0) 动画延迟时间
//  * @config loop(true)
//  * @config onframe
//  * @config ondestroy(optional)
//  * @config onrestart(optional)
//  *
//  * TODO pause
//  */
/**
 * @alias zrender/graphic/Sprite
 * @extends module:zrender/graphic/Displayable
 * @constructor
 * @param {Object} opts
 */
function ZSprite(opts) {
    var _this = this;
    Displayable.call(this, opts);
    ['pause', 'resume'].forEach(function (method) {
        _this[method] = function () {
            return _this._clip && _this._clip[method]();
        };
    });
    this.isPaused = function () {
        return !!_this._clip && _this._clip._paused;
    };
}

ZSprite.prototype = {

    constructor: ZSprite,
    type: 'sprite',
    setClip: function (config) {
        //TODO:重新设置Clip属性
        if (config) {
            var _this = this;
                Object.keys(config).forEach(function (key) {
                    _this.style[key] = config[key];
                });
                this.style.duration = config.duration;
                this._clip._needsRemove = true;
                this.initClip.call(this, this.style, this._image);
        }
        return this;
    },
    initClip: function (style, image) {
        var zr = this.__zr;
        var full_width = image.width;
        var full_height = image.height;
        var dir = style.direction || 'x';
        var padding_size = (dir === 'y') ? style.padding_y : style.padding_x;
            // If automatic generation is specified
        var length_full = (dir === 'y') ? full_height : full_width;
        var length_cropped = (dir === 'y') ? style.h : style.w;
            // Set the full source image dimensions

        var numFrames = Math.floor((length_full - padding_size * 2) / length_cropped);
        style.gap = style.gap || 0;
        style.duration = style.duration || 1000;
        style.life = numFrames * style.duration;
        style.numFrames = numFrames;

        var frameIndex = 0;
        var _clip = this._clip = new Clip({
            loop: style.loop,
            gap: style.gap,
            life: style.life,
            delay: style.delay,
            target: this,
            onframe: function (target, percent) {
                var life = target.style.life;
                var duration = target.style.duration;
                var life = target.style.life;
                var numFrames = target.style.numFrames;
                var index = ((life * percent) / duration) ^ 0;
                if (index !== frameIndex) {
                    frameIndex = Math.min(index, numFrames - 1);
                    target.setStyle('frame', frameIndex);
                }
            }
        });
        this._clip.getClips = function () {
            return [_clip];
        };

            if (!this.autoplay) {
                this._clip.pause();
            }
            // If animate after added to the zrender
            zr && zr.animation.addAnimator(this._clip);
            this.loaded = true;
            zrUtil.isFunction(this.onload) && this.onload();
    },
    brush: function (ctx, prevEl) {
        var style = this.style;
        var src = style.image;

        // Must bind each time
        style.bind(ctx, this, prevEl);

        style.offset_x = style.offset_x || 0;
        style.offset_y = style.offset_y || 0;
        style.padding_x = style.padding_x || 0;
        style.padding_y = style.padding_y || 0;
        style.numFrames = style.numFrames || 0;
        style.frame = style.frame || 0;

        this.autoplay = style.autoplay === true;

        this._image = imageHelper.createOrUpdateImage(
            src,
            this._image,
            this,
            this.initClip.bind(this, style)
            );

        if (!this._image || !imageHelper.isImageReady(this._image)) {
            return;
        }

        // 设置transform
        this.setTransform(ctx);
        if (this.loaded) {
            // console.log('call brush::::', style.frame);
            this._draw(ctx, style);
        }
        // Draw rect text
        if (style.text != null) {
            // Only restore transform when needs draw text.
            this.restoreTransform(ctx);
            this.drawRectText(ctx, this.getBoundingRect());
        }
    },
    _draw: function (ctx, style) {
        // var _this = this
        var x = style.x || 0;
        var y = style.y || 0;

        // If the image has not been loaded or the sprite has no frames, the frame size must be 0 (for clipChildren feature).
        var fw = style.w;
        var fh = style.h;
        var frameIndex = style.frame;
        var dir = style.direction || 'x';
        var padding_size = (dir === 'y') ? style.padding_y : style.padding_x;
        var frame = {
            x: padding_size + style.offset_x + (frameIndex * (dir === 'x' ? style.w : 0)),
            y: padding_size + style.offset_y + (frameIndex * (dir === 'y' ? style.h : 0))
        };
        if (frameIndex > style.numFrames) {
            // Do clip with an empty path
            if (this.clipChildren) {
                ctx.beginPath();
                ctx.rect(x, y, 0, 0);
                ctx.closePath();
                ctx.clip();
            }
            return this;
        }
        // Draw the current sprite part
        ctx.drawImage(this._image, frame.x, frame.y, fw, fh, x, y, fw, fh);
        if (this.strokeWidth > 0) {
            ctx.lineWidth = this.strokeWidth;
            ctx.strokeStyle = this.strokeColor;
            ctx.strokeRect(x, y, fw, fh);
        }
    },
    getBoundingRect: function () {
        var style = this.style;
        if (!this._rect) {
            this._rect = new BoundingRect(style.x || 0, style.y || 0, style.w || 0, style.h || 0);
        }
        return this._rect;
    }
};
zrUtil.inherits(ZSprite, Displayable);

export default ZSprite;