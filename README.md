[![GitHub Workflow][1]](https://github.com/missuo/discord-image/actions)
[![Go Version][2]](https://github.com/missuo/discord-image/blob/main/go.mod)
[![Docker Pulls][3]](https://hub.docker.com/r/missuo/discord-image)

[1]: https://img.shields.io/github/actions/workflow/status/missuo/discord-image/release.yaml?logo=github
[2]: https://img.shields.io/github/go-mod/go-version/missuo/discord-image?logo=go
[3]: https://img.shields.io/docker/pulls/missuo/discord-image?logo=docker

# Discord Image

A powerful image hosting and file sharing service built with Discord Bot technology.

**Note: Deployment requires a Discord Bot Token. You'll need to create a Discord application and bot to obtain this token. Please refer to Discord's official documentation for setup instructions.**

## Features

- **File size limits based on Discord tier:**
  - Free users: 10MB
  - Discord Nitro Basic: 50MB
  - Discord Nitro: 500MB
- **Permanent storage** - Files never expire
- **Upload management** - View upload history and delete files
- **Multi-format support** - Images, videos, and other file types
- **Custom proxy support** - Configure custom proxy URLs for better accessibility
- **Server-friendly** - Automatic file cleanup option to save server disk space
- **Self-hosted** - Private deployment for enhanced security and control

## Live Demo

Try the live demo at these endpoints:
- Cloudflare CDN: [https://dc.missuo.ru](https://dc.missuo.ru)
- EdgeOne CDN: [https://dc.deeeee.de](https://dc.deeeee.de)

*Note: The demo configuration includes `proxy_url` and `auto_delete` settings for optimal performance in mainland China.*

![Demo Screenshot](./screenshot/image.png)

For technical details about the implementation, read the blog post: [https://missuo.me/posts/discord-file-sharing/](https://missuo.me/posts/discord-file-sharing/)

## Quick Start with Docker

```bash
mkdir discord-image && cd discord-image
wget -O compose.yaml https://raw.githubusercontent.com/missuo/discord-image/main/compose.yaml
nano compose.yaml  # Edit configuration
docker compose up -d
```

### Nginx Reverse Proxy Configuration

```nginx
location / {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header REMOTE-HOST $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_http_version 1.1;
} 
```

## Configuration

### Configuration File

**Important:** Do not change the `bot_token` after initial setup, as this may invalidate existing file links.

```yaml
bot:
  token: "" # Discord bot token
  channel_id: "" # Target channel ID

upload:
  temp_dir: "uploads" # Temporary directory for file storage

proxy_url: example.com # Custom proxy URL for cdn.discordapp.com (optional)
auto_delete: true # Auto-delete files from server after upload
```

### Docker Environment Variables

For Docker deployments, use these environment variables instead of the configuration file:

```yaml
services:
  discord-image:
    image: ghcr.io/missuo/discord-image
    ports:
      - "8080:8080"
    environment:
      - BOT_TOKEN=your_bot_token
      - CHANNEL_ID=your_channel_id
      - UPLOAD_DIR=/app/uploads
      - PROXY_URL=your_proxy_url  # Optional
      - AUTO_DELETE=true
    volumes:
      - ./uploads:/app/uploads
```

### Configuration Notes

- **proxy_url**: Optional setting for accessing Discord CDN from mainland China. If not needed, leave unset.
- **auto_delete**: Saves server disk space by removing files after successful upload to Discord.

## Setting Up Proxy URL (Optional)

**Only required for mainland China access. Skip this section if not applicable.**

### Nginx Proxy Configuration

```nginx
location / {
    proxy_pass https://cdn.discordapp.com;
    proxy_set_header Host cdn.discordapp.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header REMOTE-HOST $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_http_version 1.1;
}
```

### Alternative: Cloudflare Workers

You can also deploy the proxy using serverless solutions like Cloudflare Workers. Community contributions for Workers configurations are welcome via PR.

## Related Projects

- [missuo/Telegraph-Image-Hosting](https://github.com/missuo/Telegraph-Image-Hosting)

## License

AGPL-3.0