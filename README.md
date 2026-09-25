# 组织架构 WebGL 视图

关于页以 `public/about/architecture.png` 为层级圆圈背景。three.js / WebGL 按同一半径把公司组织数据标在对应圆圈层上。

## 运行

```bash
npm install
npm run dev
```

打开本地地址即可查看。拖拽可轻微转动，滚轮可缩放，点击圆圈上的名称可查看职责和上下级。

## 对齐背景图

圆圈半径写在 `src/data/organization.js` 的 `rings` 中，取值是相对图片半宽的比例（`0` 为圆心，`1` 为边缘）。

更换 `public/about/architecture.png` 后，调整这些半径，使节点重新落在图中的圆环上，然后重新生成参考图或直接替换图片：

```bash
npm run generate:architecture
```

组织单元、上下级和职责也在同一数据文件中维护。
