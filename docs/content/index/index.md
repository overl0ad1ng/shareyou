---
title: Shareyou
description: 面向 JavaScript 和 TypeScript 开发的实用工具库。
---

## 关于 Shareyou

写项目时，总有一些逻辑会一遍遍用到。Shareyou 把这些逻辑整理成独立的工具包，分享给有同样需求的开发者。

每个工具解决一个具体问题，提供明确的输入、返回值和错误处理方式。对于 TypeScript 项目，类型提示和参数推导也是接口的一部分。

## 一个入口，按需选择

统一入口包 `@shareyou/core` 汇总所有已实现的工具，通过 `shareyou.xxx()` 调用：

```ts
import shareyou from "@shareyou/core";

const text = shareyou.templater("你好，{{name:string}}。", {
  name: "Shareyou",
});
// 你好，Shareyou。
```

需要翻译时，用 `shareyou.i18n(options)` 创建实例，再通过 `i18n.t(key, values)` 读取文案：

```ts
import shareyou from "@shareyou/core";

const i18n = shareyou.i18n({
  locale: "en",
  messages: {
    en: {
      cart: "{{#plural count}}{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}",
    },
  },
});

i18n.t("cart", { count: 3 });
// 3 items
```

`shareyou.i18n` 与独立包导出的 `createI18n` 是同一个工厂函数，可以按项目习惯任选一种写法。

也可以从统一入口导入单个函数，或只安装对应的独立包。两种方式使用相同的函数实现与类型声明。

```ts
import { templater } from "@shareyou/core";

const text = templater("{{count:number!}} 条新消息", { count: 3 });
// 3 条新消息
```

## 当前提供的工具

| 工具 | 用途 | 独立包 |
| --- | --- | --- |
| [Templater](/docs/templater/) | 字符串插值，支持模板参数类型推导和运行时检查 | `@shareyou/templater` |
| [i18n](/docs/i18n/) | 基于 Templater 的翻译、语言回退、格式化与参数类型生成 | `@shareyou/i18n` |

统一入口目前包含 Templater 和 i18n。Logger、Errors 等工具属于后续规划，当前版本不提供这些接口。

## 开始使用

[快速开始](/docs/quickstart) 介绍安装方式、统一入口和独立包的用法。

- [Templater 文档](/docs/templater/)：占位符语法、类型推导、分支与格式化、错误处理。
- [i18n 文档](/docs/i18n/)：语言资源、回退顺序、消息格式化与参数类型生成。
