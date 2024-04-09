package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/missuo/discord-image/bot"
	"github.com/spf13/viper"
)

func main() {
	// 读取配置文件
	viper.SetConfigFile("config.yaml")
	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("Failed to read config file: %v", err)
	}

	bot.BotToken = viper.GetString("bot.token")
	channelID := viper.GetString("bot.channel_id")
	uploadDir := viper.GetString("upload.temp_dir")
	host := viper.GetString("host")

	// 创建上传目录
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// 启动 bot
	go bot.Run()

	// 创建 Gin 实例
	r := gin.Default()
	r.Static("/static", "./static")
	// 上传图片的 API
	r.POST("/upload", func(c *gin.Context) {
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 生成唯一的文件名
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String(), ext)

		// 保存文件到指定目录
		filePath := filepath.Join(uploadDir, filename)
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 触发机器人发送图片到群组
		message, err := bot.SendImage(channelID, filePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 返回访问图片的 URL
		c.JSON(http.StatusOK, gin.H{"url": fmt.Sprintf("%s/image/%s", host, message.ID)})
	})

	// 访问图片的 API
	r.GET("/image/:id", func(c *gin.Context) {
		messageID := c.Param("id")

		// 查询机器人获取图片的 URL
		url, err := bot.GetImageURL(channelID, messageID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 重定向到图片的 URL
		c.Redirect(http.StatusFound, url)
	})

	// 启动 Gin 服务器
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
