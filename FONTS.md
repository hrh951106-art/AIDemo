# 项目字体配置说明

## 概述

本项目使用本地 Web 字体文件，确保在内网环境和生产环境中无需依赖外部字体服务即可正常显示。

## 字体文件位置

```
public/fonts/
├── AlibabaPuHuiTi-3-Regular.woff2    (292 KB) - 常规字重
├── AlibabaPuHuiTi-3-Medium.woff2     (292 KB) - 中等字重
├── AlibabaPuHuiTi-3-Bold.woff2       (292 KB) - 粗体字重
├── JetBrainsMono-Regular.woff2       (90 KB)  - 等宽字体（常规）
└── JetBrainsMono-Bold.woff2          (92 KB)  - 等宽字体（粗体）
```

**总大小**: 约 1.06 MB

## 使用的字体

### 1. 阿里巴巴普惠体 3.0 (Alibaba PuHuiTi 3)

**用途**: 主要无衬线字体，用于正文、标题等所有文本显示

**特点**:
- ✅ 完全开源免费，商业友好
- ✅ 由阿里巴巴设计，专为现代数字界面优化
- ✅ 支持简体中文、繁体中文、英文、日文、韩文
- ✅ 字形完整，包含 112,140 个汉字
- ✅ 可读性强，适合屏幕显示
- ✅ 使用 WOFF2 格式，文件压缩率高

**授权**: SIL Open Font License 1.1（免费商用）

**字重**:
- Regular (400) - 常规文本
- Medium (500) - 强调文本
- Bold (700) - 标题和重要内容

**官方仓库**: https://github.com/alibabafont/alibabapuhuiti-3

---

### 2. JetBrains Mono

**用途**: 等宽字体，用于代码、数字、数据展示

**特点**:
- ✅ 由 JetBrains 开发，专为编程设计
- ✅ 完全开源免费
- ✅ 支持连字（ligatures）特性
- ✅ 优化了数字和符号的可读性
- ✅ 适合显示数据、时间、代码片段

**授权**: SIL Open Font License 1.1（免费商用）

**字重**:
- Regular (400) - 代码和数字
- Bold (700) - 强调代码

**官网**: https://www.jetbrains.com/lp/mono/

---

## 字体回退方案（Font Stack）

### 无衬线字体
```css
'Alibaba PuHuiTi', -apple-system, BlinkMacSystemFont,
"PingFang SC", "Microsoft YaHei", "Segoe UI", "Roboto",
"Helvetica Neue", Arial, "Noto Sans SC", sans-serif
```

**加载优先级**:
1. **Alibaba PuHuiTi** (本地 Web 字体) - 优先使用
2. -apple-system (macOS/iOS 系统字体)
3. PingFang SC (苹果中文)
4. Microsoft YaHei (微软雅黑)
5. Segoe UI (Windows 10/11)
6. 其他系统字体作为回退

### 等宽字体
```css
'JetBrains Mono', "SF Mono", "Menlo", "Monaco",
"Courier New", "Consolas", "Liberation Mono", monospace
```

**加载优先级**:
1. **JetBrains Mono** (本地 Web 字体) - 优先使用
2. SF Mono (macOS 等宽字体)
3. Menlo/Monaco (macOS 老款)
4. Consolas (Windows)
5. Courier New (通用)

---

## 性能优化

### font-display: swap
所有字体使用 `font-display: swap` 策略：

```css
font-display: swap;
```

**效果**:
- ✅ 文本立即显示（使用系统字体）
- ✅ Web 字体加载完成后自动切换
- ✅ 避免不可见文本闪烁（FOIT）
- ⚠️ 可能会有字体闪烁（FOS），但体验更好

### WOFF2 格式
- ✅ 比 TTF/OTF 小 30-50%
- ✅ 浏览器支持率高（现代浏览器全支持）
- ✅ 解压缩速度快

### unicode-range
为阿里巴巴普惠体定义了 Unicode 范围：

```css
unicode-range: U+0020-007E, U+4E00-9FA5;
```

**效果**:
- 只在显示英文或中文时加载字体
- 其他语言字符直接使用系统字体
- 减少不必要的字体加载

---

## 浏览器兼容性

| 浏览器 | WOFF2 支持 | font-display |
|--------|-----------|--------------|
| Chrome 36+ | ✅ | ✅ |
| Firefox 67+ | ✅ | ✅ |
| Safari 10+ | ✅ | ✅ |
| Edge 14+ | ✅ | ✅ |
| IE 11 | ❌ | ❌ |

**不支持 WOFF2 的浏览器**: 会自动回退到系统字体

---

## 字体加载性能

### 首次访问
1. **HTML 加载**: 立即显示文本（使用系统字体）
2. **字体发现**: 浏览器解析 CSS，发现 @font-face
3. **字体下载**: 并行下载字体文件（约 1-2 秒，取决于网络）
4. **字体应用**: 加载完成后切换到 Web 字体

### 后续访问
- ✅ 浏览器缓存命中，字体文件从缓存加载
- ✅ 几乎瞬间完成，无需重新下载

---

## 如何使用

### 在 Tailwind CSS 中使用

```tsx
<!-- 无衬线字体（默认） -->
<div className="font-sans">默认文本</div>

<!-- 等宽字体 -->
<code className="font-mono">代码片段</code>

<!-- 字重 -->
<h1 className="font-bold">粗体标题</h1>
<p className="font-medium">中等字重</p>
<span className="font-normal">常规字重</span>
```

### 自定义组件中使用

```tsx
// 使用 Tailwind 类名
<Button className="font-sans font-medium">按钮</Button>

// 或者使用内联样式（不推荐）
<div style={{ fontFamily: 'var(--font-sans)' }}>文本</div>
```

---

## 添加新字体

如需添加新的 Web 字体：

### 1. 准备字体文件

推荐使用WOFF2格式：

```bash
# 转换工具
npm install -g ttf2woff2

# 转换 TTF → WOFF2
ttf2woff2 input.ttf > output.woff2
```

### 2. 放置字体文件

```bash
cp output.woff2 public/fonts/
```

### 3. 添加 @font-face 声明

在 `src/app/globals.css` 中添加：

```css
@font-face {
  font-family: 'YourFontName';
  src: url('/fonts/YourFontName.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### 4. 更新字体栈

```css
@theme inline {
  --font-sans: 'YourFontName', 'Alibaba PuHuiTi', -apple-system, ...;
}
```

---

## 字体优化建议

### 当前配置已优化的方面

✅ 使用 WOFF2 压缩格式
✅ 设置 font-display: swap
✅ 定义 unicode-range
✅ 提供完善的回退方案
✅ 字体文件按需加载

### 可进一步优化（如需要）

1. **子集化字体**
   ```bash
   # 只保留常用汉字（减少 50%+ 文件大小）
   pyftsubset AlibabaPuHuiTi-3-Regular.woff2 \
     --unicode-file=common-chinese.txt \
     --output-file=AlibabaPuHuiTi-3-Regular-Subset.woff2
   ```

2. **使用字体加载API**
   ```javascript
   // 在页面加载前预加载字体
   <link rel="preload" href="/fonts/AlibabaPuHuiTi-3-Regular.woff2" as="font" type="font/woff2" crossorigin>
   ```

3. **临界CSS内联**
   - 将 @font-face 声明内联到 HTML
   - 减少渲染阻塞

---

## 常见问题

### Q: 为什么有些文字没有使用阿里巴巴普惠体？

**A**: 可能原因：
1. 字符不在 Unicode 范围内（生僻字、特殊符号）
2. 字重不匹配（只有 400/500/700）
3. 浏览器不支持 WOFF2（IE11）

解决：检查是否为常用汉字，或更新浏览器

### Q: 字体文件太大影响加载速度？

**A**: 实际影响很小：
- 首次加载约 1-2 秒（使用 swap 不影响显示）
- 后续访问使用缓存，瞬间加载
- 如需优化，可以子集化字体文件

### Q: 可以替换为其他字体吗？

**A**: 完全可以！只需：
1. 替换 `public/fonts/` 中的字体文件
2. 更新 `globals.css` 中的 @font-face
3. 保持文件名一致或修改引用路径

### Q: 生产环境如何部署？

**A**: 无需特殊配置：
- ✅ 字体文件在 public/ 目录，Next.js 自动处理
- ✅ 构建时会优化字体文件的缓存策略
- ✅ 完全离线可用，适合内网环境

---

## 字体授权信息

### 阿里巴巴普惠体 3.0
- **授权类型**: SIL Open Font License 1.1
- **商业使用**: ✅ 允许
- **修改**: ✅ 允许
- **分发**: ✅ 允许
- **详细说明**: https://scripts.sil.org/OFL

### JetBrains Mono
- **授权类型**: SIL Open Font License 1.1
- **商业使用**: ✅ 允许
- **修改**: ✅ 允许
- **分发**: ✅ 允许
- **详细说明**: https://github.com/JetBrains/JetBrainsMono#license

---

## 更新日志

**2025-02-27**
- ✅ 添加阿里巴巴普惠体 3.0 (Regular/Medium/Bold)
- ✅ 添加 JetBrains Mono (Regular/Bold)
- ✅ 配置字体加载和回退方案
- ✅ 设置 font-display: swap
- ✅ 定义 Unicode 范围优化
- ✅ 测试构建通过

---

## 相关资源

- [阿里巴巴普惠体 GitHub](https://github.com/alibabafont/alibabapuhuiti-3)
- [JetBrains Mono 官网](https://www.jetbrains.com/lp/mono/)
- [WOFF2 格式说明](https://www.w3.org/TR/WOFF2/)
- [font-display 详细指南](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [字体性能优化最佳实践](https://web.dev/optimize-webfont-loading/)
