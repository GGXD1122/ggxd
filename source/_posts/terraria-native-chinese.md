---
title: 我用Codex汉化了国际版Terraria1.4.5.8.6！
tags:
  - Terraria
  - Android
  - 中文适配
categories:
  - 折腾记录
abbrlink: Terraria-Native-Chinese
date: 2026-09-18 13:30:00
ai: true
---

最近我用 Codex 给 Terraria 安卓国际版 1.4.5.8.6 补上了“简体中文”选项。用的是游戏自带的中文资源，可以直接在设置里切换，也能记住选择。折腾一圈，总算把改配置这件事变成了点一下菜单。

<!-- more -->

## 先看效果

这是我录的演示。目前做好的功能都已实测运行正常，中文菜单、语言切换和重启保持也专门确认过。

<div style="position:relative;width:100%;aspect-ratio:16/9;margin:1.5rem 0;overflow:hidden;background:#000">
<iframe src="https://player.bilibili.com/player.html?isOutside=true&aid=117286279121666&bvid=BV1pAeG6bE4V&cid=41974828374&p=1&autoplay=0" title="Terraria 国际版简体中文方案视频演示" loading="lazy" scrolling="no" frameborder="0" allow="fullscreen; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
</div>

[在哔哩哔哩观看视频](https://www.bilibili.com/video/BV1pAeG6bE4V/)

<img src="/assets/terraria-native-chinese/language-menu.webp" alt="简体中文作为独立选项出现在 Terraria 原生语言菜单里" width="1600" height="720" style="width:100%;height:auto">

原来的语言都还在，现在多了一个可以直接选的“简体中文”。

## 从 1.3 时代的改配置说起

手机版 1.3 发布后，玩家就发现，修改配置文件可以让游戏显示内置中文。但那时词库还不完整，有些内容会变成 `***`。也有人做汉化补丁来补足文本，不过往往需要等官方更新后再适配，没办法每次都跟着官方版本一起发布。

后来版本慢慢迭代，内置中文越来越完善，星号也少了。很多玩家仍然愿意改配置：**游戏包不用动，签名和资源也还是官方的那一套。** 这个优点确实实在。

所以，这次我想解决的是中文的使用入口。既然改配置已经能调用中文，能不能把它直接放回游戏的语言菜单里？

## 让 Codex 把中文入口补回来

我把安装包交给 Codex，沿着配置里的语言设置往下查。结果确认，游戏既有中文文本，也有对应的语言逻辑，缺的是菜单列表里的那一项。

接下来就是补回简体中文，再让它继续使用游戏原来的切换和保存流程。这一版还加了默认中文：没有保存过语言设置时用中文，已经选过其他语言就保留原来的选择。

这样做，不用另外维护一套译文，也不占用英语等其他语言的位置。对玩家来说，使用这个版本后，直接打开设置选中文就行。

<img src="/assets/terraria-native-chinese/main-menu.webp" alt="切换为简体中文后的 Terraria 主菜单" width="1600" height="720" style="width:100%;height:auto">

不过，这和改配置仍有一个区别：**我的方案修改了安装包，需要重新签名；改配置可以保留官方原包。** 如果你更在意原包不变，改配置依然是很好的选择。我做这个版本，主要是想让中文切换更方便。

## 做出来之后

这套方案先适配了 1.4.5.8.5，更新到 1.4.5.8.6 时，又重新定位了一遍。它还不能做到官方一更新就自动跟上，新版本仍然需要适配和测试。

这次 Codex 帮我完成了分析、修改、打包和检查，也把过程整理成了能继续复用的工程。游戏原有素材和文本保持不变，没有另外加入代码库或权限。比起只得到一个成品，我更满意的是下次更新时，有完整的记录可以接着做。

目前版本最低支持 Android 6.0。安装前记得备份角色和世界；修改版与官方版签名不同，遇到无法覆盖安装的情况，别急着卸载原游戏。

对我来说，这次最开心的就是看到“简体中文”真的出现在设置里。以前要翻文件、改数值，现在终于能在游戏里点一下了。

一起玩 Terraria，或者交流使用体验，欢迎来群里聊聊。

<p><a href="https://qm.qq.com/q/2DQ9H7V5aE" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:0.4em;max-width:100%"><span class="iconfont-archer" aria-hidden="true" style="font-size:1.5em;line-height:1;flex-shrink:0">&#xe61d;</span><span>加入 QQ 群：Terraria交流群</span></a></p>
