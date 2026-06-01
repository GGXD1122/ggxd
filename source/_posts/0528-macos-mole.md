---
title: macOS安装部署Mole工具教程
tags:
  - macOS
  - Mole
  - Homebrew
  - 清理工具
categories:
  - 教程
abbrlink: macOS-Mole
date: 2026-05-28 04:44:37
ai: true
---

# macOS安装部署Mole工具教程

Mole 是一个面向 macOS 的系统清理、应用卸载、磁盘分析和状态监控工具。简单理解，它可以帮你清理缓存、找大文件、卸载 App 残留、查看系统状态，也可以清理开发项目里的 `node_modules`、`build`、`dist` 等占空间文件。

这篇文章按小白流程写，尽量每一步都说明“输入什么、看到什么、下一步做什么”。第一次使用时不要急着确认删除，先用预览模式看一遍。

---

## 安装前准备

先打开 macOS 自带的“终端”。

可以按 `Command + 空格` 打开聚焦搜索，输入“终端”，回车打开。

打开后先确认系统里有没有 Homebrew：

```bash
brew --version
```

如果能看到版本号，例如 `Homebrew 4.x.x`，说明已经安装好了。

如果提示 `command not found: brew`，说明还没有安装 Homebrew，需要先安装 Homebrew 后再继续。

Homebrew 是 macOS 上常用的软件包管理器，后面安装 Mole 会用到它。

---

## 使用Homebrew安装

推荐使用 Homebrew 安装 Mole，后续更新和卸载都比较方便。

在终端输入：

```bash
brew install mole
```

等待安装完成后，检查 Mole 是否可用：

```bash
mo --version
```

如果能正常显示版本号，说明安装成功。

如果提示 `command not found: mo`，可以关闭终端重新打开一次，再执行：

```bash
mo --version
```

如果还是不行，检查 Homebrew 是否安装正常：

```bash
brew doctor
```

---

## 使用官方脚本安装

如果不想使用 Homebrew，也可以用官方脚本安装。

在终端输入：

```bash
curl -fsSL https://raw.githubusercontent.com/tw93/mole/main/install.sh | bash
```

如果想安装指定版本，可以这样写：

```bash
curl -fsSL https://raw.githubusercontent.com/tw93/mole/main/install.sh | bash -s 1.17.0
```

脚本安装适合不想配置 Homebrew 的情况。

不过小白建议优先使用 `brew install mole`，因为 Homebrew 更容易管理版本。

---

## 第一次运行

安装完成后，输入：

```bash
mo
```

正常情况下会出现 Mole 的交互菜单。

菜单操作方式：

- 使用方向键上下移动
- 按回车进入选项
- 按 `q` 或者 `Ctrl + C` 退出
- 也可以使用 `h/j/k/l` 进行移动

---

## 安全预览

清理工具一定要先预览。

第一次不要直接运行 `mo clean`，先运行：

```bash
mo clean --dry-run
```

`--dry-run` 的意思是只扫描和预览，不真正删除文件。

你可以先看看它准备清理哪些内容，例如浏览器缓存、系统日志、开发工具缓存、临时文件等。

如果想看更详细的扫描日志：

```bash
mo clean --dry-run --debug
```

如果预览结果里有看不懂的项目，不要急着确认，先跳过。

---

## 正式清理

确认预览结果没问题后，再执行正式清理：

```bash
mo clean
```

执行过程中如果需要管理员权限，系统可能会要求输入 Mac 密码。

输入密码时终端不会显示任何字符，这是正常现象。输入完成后按回车即可。

清理完成后，Mole 会显示释放了多少空间。

---

## 卸载应用

如果要卸载某个 App，并顺便清理残留文件，使用：

```bash
mo uninstall
```

这个功能适合卸载已经不需要的软件。

它通常会查找：

- App 本体
- 配置文件
- 缓存文件
- 日志文件
- Launch Agent
- Application Support 残留

建议先预览：

```bash
mo uninstall --dry-run
```

确认要卸载的软件没有选错，再执行正式卸载。

---

## 分析磁盘占用

如果只是想看看硬盘空间都被什么占用了，可以使用：

```bash
mo analyze
```

这个功能更适合找大文件。

它会用可视化方式显示磁盘占用，可以帮助判断是下载文件、视频、缓存还是项目目录占空间。

如果只想分析外接硬盘，可以指定路径：

```bash
mo analyze /Volumes
```

---

## 查看系统状态

查看 CPU、内存、磁盘、网络、电池等状态：

```bash
mo status
```

这个命令不会清理文件，只是查看系统状态。

适合在电脑卡顿、风扇转速高、内存吃紧时看一下大概情况。

---

## 项目目录清理

如果经常写代码，`mo purge` 比较实用。

它会扫描常见项目目录中的构建产物，例如：

- `node_modules`
- `target`
- `.build`
- `build`
- `dist`
- `venv`

先预览：

```bash
mo purge --dry-run
```

确认没问题后再清理：

```bash
mo purge
```

如果你的项目不在默认目录，可以配置扫描路径：

```bash
mo purge --paths
```

也可以手动编辑配置文件：

```bash
~/.config/mole/purge_paths
```

示例内容：

```bash
~/Projects
~/GitHub
~/Documents/Code
```

这样 Mole 就会优先扫描这些目录。

---

## 清理安装包

如果下载目录里有很多 `.dmg`、`.pkg`、`.zip` 安装包，可以使用：

```bash
mo installer
```

先预览：

```bash
mo installer --dry-run
```

这个功能适合清理下载过但已经安装完成的软件安装包。

---

## 白名单配置

如果有些缓存、项目或者优化项不希望被 Mole 处理，可以加入白名单。

清理白名单：

```bash
mo clean --whitelist
```

优化白名单：

```bash
mo optimize --whitelist
```

小白可以简单理解为：不确定能不能删的东西，就先放进白名单。

---

## 启用Touch ID授权sudo

如果 Mac 支持 Touch ID，可以让 sudo 授权更方便。

执行：

```bash
mo touchid
```

也可以明确执行：

```bash
mo touchid enable
```

恢复默认：

```bash
mo touchid disable
```

这个功能不是必须的，只是让输入管理员密码变得更方便。

---

## 更新和卸载

更新 Mole：

```bash
mo update
```

如果是脚本安装，可以尝试更新到 main 分支的开发版：

```bash
mo update --nightly
```

一般用户不建议长期使用开发版，稳定版更适合日常使用。

卸载 Mole：

```bash
mo remove
```

卸载前也可以先预览：

```bash
mo remove --dry-run
```

如果是 Homebrew 安装，也可以用：

```bash
brew uninstall mole
```

---

## 图形界面版本

如果不喜欢终端，也可以安装 Mole 的 Mac App 图形界面版本。

Homebrew 安装方式：

```bash
brew install --cask mole-app
```

图形界面适合可视化查看磁盘占用、应用更新、启动项管理和状态面板。

命令行版本更适合快速维护和脚本化使用。

如果完全没有终端基础，可以优先尝试图形界面版本。

---

## 使用建议

第一次使用时，所有清理、卸载、项目产物清理都先加 `--dry-run`。

执行 `mo clean` 或 `mo uninstall` 前，建议关闭正在使用的软件，尤其是浏览器、设计软件、开发工具。

如果某些路径没有权限，可以到 macOS 设置中给终端或 Mole 授予“完全磁盘访问权限”。

操作日志可以查看：

```bash
~/Library/Logs/mole/operations.log
```

如果清理后发现某个软件重新打开变慢，一般是缓存被清掉后重新生成，属于正常情况。

如果不确定某一项是否安全，宁可先不清理。

---

## 小白推荐流程

第一次使用可以按这个顺序：

1. 安装 Mole
2. 执行 `mo --version`
3. 执行 `mo`
4. 执行 `mo clean --dry-run`
5. 看清楚预览结果
6. 没问题再执行 `mo clean`
7. 想找大文件再执行 `mo analyze`
8. 想卸载软件再执行 `mo uninstall --dry-run`

记住一句话：先预览，再确认。

---

## 参考

- [Mole GitHub](https://github.com/tw93/mole)
- [Mole 官方文档](https://mole.fit/)
- [Homebrew Mole Formula](https://formulae.brew.sh/formula/mole)

---

本文由 Codex 自动整理、编写并发布。

---
