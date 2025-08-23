package main

import (
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"

	devcycle "github.com/devcyclehq/go-server-sdk/v2"
	"github.com/gin-gonic/gin"
)

// ProxyInstance represents a local proxy instance configuration
type ProxyInstance struct {
	UnixSocketPath    string
	UnixSocketEnabled bool
	HTTPEnabled       bool
	HTTPPort          int
	SDKKey            string
	PlatformData      devcycle.PlatformData
	SDKConfig         SDKConfig
	LogFile           string
	dvcClient         *devcycle.Client
	server            *http.Server
	listener          net.Listener
}

// SDKConfig holds the SDK configuration options
type SDKConfig struct {
	EventFlushIntervalMS            int64
	ConfigPollingIntervalMS         int64
	ConfigCDNURI                    string
	EventsAPIURI                    string
	DisableAutomaticEventLogging    bool
	DisableCustomEventLogging       bool
	MaxEventQueueSize               int
	FlushEventQueueSize             int
}

// Default sets default values for SDKConfig
func (s *SDKConfig) Default() {
	if s.EventFlushIntervalMS == 0 {
		s.EventFlushIntervalMS = 10000
	}
	if s.ConfigPollingIntervalMS == 0 {
		s.ConfigPollingIntervalMS = 10000
	}
	if s.MaxEventQueueSize == 0 {
		s.MaxEventQueueSize = 2000
	}
	if s.FlushEventQueueSize == 0 {
		s.FlushEventQueueSize = 1000
	}
}

// BuildDevCycleOptions builds the DevCycle options without the UseDebugWASM field
func (i *ProxyInstance) BuildDevCycleOptions() *devcycle.Options {
	options := devcycle.Options{
		EnableEdgeDB:                  i.SDKConfig.DisableAutomaticEventLogging,
		DisableAutomaticEventLogging:  i.SDKConfig.DisableAutomaticEventLogging,
		DisableCustomEventLogging:     i.SDKConfig.DisableCustomEventLogging,
		MaxEventQueueSize:             i.SDKConfig.MaxEventQueueSize,
		FlushEventQueueSize:           i.SDKConfig.FlushEventQueueSize,
		ConfigCDNURI:                  i.SDKConfig.ConfigCDNURI,
		EventsAPIURI:                  i.SDKConfig.EventsAPIURI,
		Logger:                        nil,
		// NOTE: UseDebugWASM field removed - this is the fix for the latest SDK compatibility
		AdvancedOptions: devcycle.AdvancedOptions{
			OverridePlatformData: &i.PlatformData,
		},
	}
	options.CheckDefaults()
	return &options
}

// Default sets default values for ProxyInstance
func (i *ProxyInstance) Default() {
	i.SDKConfig.Default()
	if i.HTTPEnabled && i.HTTPPort == 0 {
		i.HTTPPort = 8080
	}
	if i.LogFile == "" {
		i.LogFile = "/tmp/proxy.log"
	}
}

// NewBucketingProxyInstance creates a new proxy instance with updated SDK compatibility
func NewBucketingProxyInstance(instance *ProxyInstance) (*ProxyInstance, error) {
	instance.Default()
	
	gin.DisableConsoleColor()
	logFile, err := os.OpenFile(instance.LogFile, os.O_CREATE|os.O_APPEND|os.O_RDWR, 0666)
	if err != nil {
		return nil, fmt.Errorf("error opening log file: %s", err)
	}
	mw := io.MultiWriter(os.Stdout, logFile)
	log.SetOutput(mw)
	gin.DefaultWriter = mw

	options := instance.BuildDevCycleOptions()
	client, err := devcycle.NewClient(instance.SDKKey, options)
	if err != nil {
		return nil, fmt.Errorf("error creating DevCycle client: %s", err)
	}
	instance.dvcClient = client

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Add basic health endpoint
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Create server
	server := &http.Server{Handler: r}
	instance.server = server

	// Start Unix socket if enabled
	if instance.UnixSocketEnabled && instance.UnixSocketPath != "" {
		// Remove existing socket file if it exists
		os.Remove(instance.UnixSocketPath)
		
		listener, err := net.Listen("unix", instance.UnixSocketPath)
		if err != nil {
			return nil, fmt.Errorf("error creating Unix socket: %s", err)
		}
		instance.listener = listener

		// Start server in goroutine
		go func() {
			if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
				log.Printf("Unix socket server error: %v", err)
			}
		}()
	}

	return instance, nil
}

// Close shuts down the proxy instance
func (i *ProxyInstance) Close() error {
	if i.dvcClient != nil {
		i.dvcClient.Close()
	}
	if i.server != nil {
		if err := i.server.Close(); err != nil {
			return err
		}
	}
	if i.listener != nil {
		if err := i.listener.Close(); err != nil {
			return err
		}
	}
	if i.UnixSocketPath != "" {
		os.Remove(i.UnixSocketPath)
	}
	return nil
}