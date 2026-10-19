import { defineConfig } from "@code-altas/ui/config"

export default defineConfig({
  title: "Shareyou",
  description: "面向 JavaScript 与 TypeScript 的实用工具库",
  // Match the actual file name in `docs/public` (case-sensitive on Linux).
  logo: "/Logo.png",
  logoHref: "/docs",
  docs: {
    i18n: {
      defaultLocale: "zh-CN",
      locales: {
        "zh-CN": { label: "简体中文" },
      },
    },
    categories: [
      {
        name: "文档",
        icon: "lucide:book-open",
        slug: "index",
        docs: [
          {
            name: "Shareyou",
            icon: "lucide:sparkles",
            docs: [
              { name: "介绍", slug: "index" },
              { name: "快速开始", slug: "quickstart" },
            ],
          },
          {
            name: "Templater",
            icon: "lucide:braces",
            slug: "templater",
            docs: [
              { name: "介绍", slug: "index" },
              { name: "模板语法", slug: "syntax" },
              {
                name: "分支与格式化",
                slug: "advanced",
                docs: [
                  { name: "概览", slug: "index" },
                  { name: "复数（plural）", slug: "plural" },
                  { name: "序数（ordinal）", slug: "ordinal" },
                  { name: "条件选择（select）", slug: "select" },
                  { name: "偏移量与数量文本", slug: "offset" },
                  { name: "数字格式化", slug: "number" },
                  { name: "日期与时间格式化", slug: "date-time" },
                  { name: "命名格式与 Intl 选项", slug: "presets" },
                  { name: "编译复用与参数契约", slug: "compile" },
                ],
              },
              { name: "类型推导", slug: "typescript" },
              { name: "错误处理", slug: "errors" },
            ],
          },
          {
            name: "i18n",
            icon: "lucide:languages",
            slug: "i18n",
            docs: [
              { name: "介绍", slug: "index" },
              { name: "模板消息与格式化", slug: "messages" },
              { name: "类型生成与检查", slug: "types" },
            ],
          },
        ],
      },
    ],
  },
  header: {
    nav: {
      "/docs": { label: "Docs" },
    },
    github: { url: "https://github.com/overl0ad1ng/shareyou", showStars: true },
  },
  footer: {
    author: { name: "IzayoiKyomu" },
    license: "MIT",
  },
})
