# 像素小镇 · 团队展示页

一个星露谷风格的像素小镇网页：把团队成员按性格放进不同场景（图书馆、工坊、广场、湖畔、酒馆、小屋、车站），点击小人聊天、看名片。纯静态，无构建步骤、无第三方脚本。

## 运行

```bash
python3 -m http.server 8000
```

打开 http://localhost:8000 。

## 数据

- `data/data.sample.js`：仓库自带的**虚构示例数据**，结构与真实数据一致。
- `data/data.js`：真实成员数据，**不进仓库**（见 `.gitignore`）。存在时优先加载，否则回退到示例数据。
- 部署：`.github/workflows/pages.yml` 在构建时从仓库 Secret `TOWN_DATA_GZ` 还原 `data/data.js`：

```bash
gzip -c data/data.js | base64 | gh secret set TOWN_DATA_GZ
```

## 素材

美术素材来自 Kenney（CC0），见 `CREDITS.md`。
