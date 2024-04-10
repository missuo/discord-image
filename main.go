/*
 * @Author: Vincent Yang
 * @Date: 2024-04-09 03:35:57
 * @LastEditors: Vincent Yang
 * @LastEditTime: 2024-04-09 20:28:44
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
	"regexp"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/missuo/discord-image/bot"
	"github.com/spf13/viper"
)

func main() {
	// Set default values for configuration
	viper.SetDefault("bot.token", "")
	viper.SetDefault("bot.channel_id", "")
	viper.SetDefault("upload.temp_dir", "uploads")
	viper.SetDefault("proxy_url", "")
	viper.SetDefault("auto_delete", true)

	// Read configuration from environment variables
	viper.AutomaticEnv()

	viper.BindEnv("bot.token", "BOT_TOKEN")
	viper.BindEnv("bot.channel_id", "CHANNEL_ID")
	viper.BindEnv("upload.temp_dir", "UPLOAD_DIR")
	viper.BindEnv("proxy_url", "PROXY_URL")
	viper.BindEnv("auto_delete", "AUTO_DELETE")

	// Read configuration from config.yaml if it exists
	viper.SetConfigFile("config.yaml")
	if err := viper.ReadInConfig(); err == nil {
		log.Println("Using config file:", viper.ConfigFileUsed())
	}

	botToken := viper.GetString("bot.token")
	channelID := viper.GetString("bot.channel_id")
	uploadDir := viper.GetString("upload.temp_dir")
	proxyUrl := viper.GetString("proxy_url")
	autoDelete := viper.GetBool("auto_delete")

	// Make sure the required configuration values are set
	if botToken == "" {
		log.Fatal("BOT_TOKEN environment variable or bot.token in config.yaml is not set")
	}
	if channelID == "" {
		log.Fatal("CHANNEL_ID environment variable or bot.channel_id in config.yaml is not set")
	}

	bot.BotToken = botToken

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

	r.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// Upload image API
	r.POST("/upload", func(c *gin.Context) {
		host := c.Request.Host
		ipPortRegex := regexp.MustCompile(`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?$`)
		var linkPrefix string
		if ipPortRegex.MatchString(host) {
			linkPrefix = "http://" + host
		} else {
			linkPrefix = "https://" + host
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
		c.JSON(http.StatusOK, gin.H{"url": fmt.Sprintf("%s/file/%s", linkPrefix, message.ID)})
	})

	// API for accessing images
	r.GET("/file/:id", func(c *gin.Context) {
		messageID := c.Param("id")

		// Query the bot to get the image URL
		url, err := bot.GetImageURL(channelID, messageID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if proxyUrl != "" {
			url = strings.Replace(url, "https://cdn.discordapp.com", "https://"+proxyUrl, 1)
		}

		// Redirect to the image URL
		c.Redirect(http.StatusFound, url)
	})

	// Start Gin server
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
