# New API Monitor Android

独立的 Android 监控客户端，首页打开 New API 使用日志，提供“日志、分组、渠道、刷新、设置”快捷入口。

默认服务地址为 `https://newapi.heywsf.com`，如需切换实例可点击“设置”。登录状态会由 WebView 保留。点击“分组”进入使用日志并定位到渠道分组管理区域，可一键启用或禁用已保存的渠道分组。

## 构建

```bash
./gradlew assembleDebug
```

APK 输出：`app/build/outputs/apk/debug/app-debug.apk`
