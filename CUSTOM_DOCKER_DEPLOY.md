# 自定义版本 Docker 部署

这套部署方式会用 GitHub 中的当前源码构建自定义镜像，并只替换 `new-api` 应用容器。现有的 `./data`、`./logs`、PostgreSQL 卷和 Redis 容器保持不变。

## 1. 发布镜像

将代码推送到 GitHub 的 `main` 分支后，Actions 中的 `Publish custom Docker image` 会自动构建：

```text
ghcr.io/jintuikuan/new-api:latest
```

第一次构建完成后，在 GitHub 仓库的 Packages 设置中将该容器包设为 Public。若保持 Private，需要先在服务器执行 `docker login ghcr.io`。

## 2. 第一次切换

在服务器原来的部署目录中操作。这个目录应当仍包含正在使用的 `docker-compose.yml`、`.env`、`data` 和 `logs`，不要新建另一套数据目录。

把仓库中的以下两个文件放到该目录：

```text
docker-compose.custom.yml
update-new-api.sh
```

然后执行：

```bash
chmod +x update-new-api.sh
./update-new-api.sh
```

脚本会依次拉取新镜像、备份 PostgreSQL 和 `./data`、停止应用、仅重建 `new-api` 服务并检查健康状态。失败时会尝试恢复刚才运行的镜像。

## 3. 后续一键更新

每次把新代码推送到 `main` 并等待 GitHub Actions 构建完成后，在服务器原部署目录执行：

```bash
./update-new-api.sh
```

备份保存在 `./backups`。更新过程不执行 `docker compose down`、`docker compose down -v` 或删除卷的命令。

如果生产环境使用外部 MySQL 或外部 PostgreSQL，Compose 中的卷仍会保留，但数据库备份应继续使用该外部数据库原有的备份策略。

