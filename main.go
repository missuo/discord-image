/*
 * @Author: Vincent Yang
 * @Date: 2024-04-09 03:35:57
 * @LastEditors: Vincent Yang
 * @LastEditTime: 2024-04-09 18:41:40
 * @FilePath: /discord-image/main.go
 * @Telegram: https://t.me/missuo
 * @GitHub: https://github.com/missuo
 *
 * Copyright © 2024 by Vincent, All Rights Reserved.
 */

package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/missuo/discord-image/bot"
	"github.com/spf13/viper"
)

func main() {
	// Read config file
	viper.SetConfigFile("config.yaml")
	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("Failed to read config file: %v", err)
	}

	bot.BotToken = viper.GetString("bot.token")
	channelID := viper.GetString("bot.channel_id")
	uploadDir := viper.GetString("upload.temp_dir")
	proxyUrl := viper.GetString("proxy_url")

	// Make sure the upload directory exists
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Start the bot
	go bot.Run()

	// Create Gin server
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(cors.Default())
	r.Static("/static", "./static")
	// Upload image API
	r.POST("/upload", func(c *gin.Context) {
		host := c.Request.Host
		if proxyUrl != "" {
			host = proxyUrl
		}

		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Rename the uploaded file
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String(), ext)

		// Save the uploaded file
		filePath := filepath.Join(uploadDir, filename)
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Send the image to Discord
		message, err := bot.SendImage(channelID, filePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Return the URL of the uploaded image
		c.JSON(http.StatusOK, gin.H{"url": fmt.Sprintf("https://%s/image/%s", host, message.ID)})
	})

	// Get image API
	r.GET("/image/:id", func(c *gin.Context) {
		messageID := c.Param("id")

		// Get the URL of the image
		url, err := bot.GetImageURL(channelID, messageID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Redirect to the image URL
		c.Redirect(http.StatusFound, url)
	})

	// Run the server
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
