/*
 * @Author: Vincent Yang
 * @Date: 2024-04-09 03:35:57
 * @LastEditors: Vincent Young
 * @LastEditTime: 2024-04-09 15:45:00
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
	// Read configuration file
	viper.SetConfigFile("config.yaml")
	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("Failed to read config file: %v", err)
	}
	bot.BotToken = viper.GetString("bot.token")
	channelID := viper.GetString("bot.channel_id")
	uploadDir := viper.GetString("upload.temp_dir")
	proxyUrl := viper.GetString("proxy_url")
	autoDelete := viper.GetBool("auto_delete")

	// Create upload directory
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Start bot
	go bot.Run()

	// Create Gin instance
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(cors.Default())
	r.Static("/static", "./static")

	// API for uploading images
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

		// Check if the image size exceeds 25MB
		if file.Size > 25*1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Image size exceeds the maximum limit of 25MB"})
			return
		}

		// Generate a unique filename
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String(), ext)

		// Save the file to the specified directory
		filePath := filepath.Join(uploadDir, filename)
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Trigger the bot to send the image to the group
		message, err := bot.SendImage(channelID, filePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Delete the uploaded image if auto_delete is true
		if autoDelete {
			os.Remove(filePath)
		}

		// Return the URL to access the image
		c.JSON(http.StatusOK, gin.H{"url": fmt.Sprintf("https://%s/image/%s", host, message.ID)})
	})

	// API for accessing images
	r.GET("/image/:id", func(c *gin.Context) {
		messageID := c.Param("id")

		// Query the bot to get the image URL
		url, err := bot.GetImageURL(channelID, messageID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Redirect to the image URL
		c.Redirect(http.StatusFound, url)
	})

	// Start Gin server
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
