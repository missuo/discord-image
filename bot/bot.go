/*
 * @Author: Vincent Yang
 * @Date: 2024-04-09 03:36:13
 * @LastEditors: Vincent Yang
 * @LastEditTime: 2024-04-10 18:08:24
 * @FilePath: /discord-image/bot/bot.go
 * @Telegram: https://t.me/missuo
 * @GitHub: https://github.com/missuo
 *
 * Copyright © 2024 by Vincent, All Rights Reserved.
 */
package bot

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bwmarrin/discordgo"
)

var (
	BotToken string
	Discord  *discordgo.Session
)

func Run() {
	discord, err := discordgo.New("Bot " + BotToken)
	if err != nil {
		log.Fatalf("Failed to create Discord session: %v", err)
	}
	Discord = discord

	err = discord.Open()
	if err != nil {
		log.Fatalf("Failed to open the Discord session: %v", err)
	}
	defer discord.Close()

	fmt.Println("Bot running...")

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	fmt.Println("Bot is shutting down...")
	os.Exit(0)
}

// SendImage sends an file to a Discord channel
func SendImage(channelID, filename string) (*discordgo.Message, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	message, err := Discord.ChannelMessageSendComplex(channelID, &discordgo.MessageSend{
		Files: []*discordgo.File{
			{
				Name:   filename,
				Reader: file,
			},
		},
	})
	if err != nil {
		return nil, err
	}

	return message, nil
}

// GetImageURL returns the latest URL of an file in a Discord message
func GetImageURL(channelID, messageID string) (string, error) {
	message, err := Discord.ChannelMessage(channelID, messageID)
	if err != nil {
		return "", err
	}

	if len(message.Attachments) > 0 {
		return message.Attachments[0].URL, nil
	}

	return "", fmt.Errorf("image not found")
}
