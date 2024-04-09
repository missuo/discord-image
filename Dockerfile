FROM golang:1.22 AS builder
WORKDIR /go/src/github.com/missuo/discord-image
COPY main.go ./
COPY bot ./bot
COPY go.mod ./
COPY go.sum ./
RUN go get -d -v ./
RUN CGO_ENABLED=0 go build -a -installsuffix cgo -o discord-image .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /go/src/github.com/missuo/discord-image /app/discord-image
CMD ["/app/discord-image"]