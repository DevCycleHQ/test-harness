package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"sync"
	"syscall"
	"time"

	devcycle "github.com/devcyclehq/go-server-sdk/v2"
	lbproxy "github.com/devcyclehq/local-bucketing-proxy"
	"github.com/gorilla/mux"
)

var proxyInstances = make(map[string]*lbproxy.ProxyInstance)
var proxyMutex = &sync.Mutex{}

func main() {
	r := mux.NewRouter()
	r.Handle("/client", panicHandler(clientHandler)).Methods("POST")
	r.Handle("/close/{clientId}", panicHandler(shutdownClient)).Methods("POST")
	http.Handle("/", r)

	server := &http.Server{Addr: ":8000", Handler: nil}

	sigHandler := make(chan os.Signal, 1)
	signal.Notify(sigHandler, os.Interrupt, syscall.SIGTERM, syscall.SIGHUP)
	go func() {
		sig := <-sigHandler
		log.Printf("Received %s signal, shutting down server", sig)
		if err := server.Shutdown(context.Background()); err != nil {
			log.Fatal(err)
		}
	}()

	log.Printf("Sidecar manager listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		if err == http.ErrServerClosed {
			return
		}
		log.Fatal(err)
	}
}

type clientRequestBodyOptions struct {
	ConfigCDNURI            string `json:"configCDNURI"`
	EventsAPIURI            string `json:"eventsAPIURI"`
	ConfigPollingIntervalMS int64  `json:"configPollingIntervalMS"`
	EventFlushIntervalMS    int64  `json:"eventFlushIntervalMS"`
}

type clientRequestBody struct {
	ClientId string                   `json:"clientId"`
	SdkKey   string                   `json:"sdkKey,omitempty"`
	Options  clientRequestBodyOptions `json:"options"`
}

type clientResponseBody struct {
	Message    string `json:"message,omitempty"`
	AsyncError string `json:"asyncError,omitempty"`
	Exception  string `json:"exception,omitempty"`
}

func clientHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("Sidecar manager received client request: %v %v", r.Method, r.RequestURI)
	var reqBody clientRequestBody
	var res clientResponseBody
	err := json.NewDecoder(r.Body).Decode(&reqBody)
	log.Printf("Sidecar manager received client body: %v", reqBody)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	} else if reqBody.ClientId == "" {
		http.Error(w, "Invalid request: missing clientId", http.StatusBadRequest)
		return
	}
	proxyInstance := lbproxy.ProxyInstance{
		UnixSocketPath:    fmt.Sprintf("/tmp/%s.sock", reqBody.ClientId),
		UnixSocketEnabled: true,
		SDKKey:            reqBody.SdkKey,
		PlatformData: devcycle.PlatformData{
			SdkType:         "server",
			SdkVersion:      "1.0.0",
			PlatformVersion: "",
			DeviceModel:     "",
			Platform:        "PHP",
			Hostname:        "test-harness",
		},
		SDKConfig: lbproxy.SDKConfig{
			EventFlushIntervalMS:    time.Duration(reqBody.Options.EventFlushIntervalMS * 1000000),
			ConfigPollingIntervalMS: time.Duration(reqBody.Options.ConfigPollingIntervalMS * 1000000),
			ConfigCDNURI:            reqBody.Options.ConfigCDNURI,
			EventsAPIURI:            reqBody.Options.EventsAPIURI,
		},
	}

	instance, err := lbproxy.NewBucketingProxyInstance(proxyInstance)
	if err != nil {
		res.Exception = err.Error()
		w.WriteHeader(http.StatusOK)
	} else {
		proxyMutex.Lock()
		defer proxyMutex.Unlock()
		proxyInstances[reqBody.ClientId] = instance
		res.Message = "success"

		w.Header().Set("Content-Type", "application/json")
		w.Header().Add("Location", "client/"+reqBody.ClientId)
		w.WriteHeader(http.StatusCreated)
	}

	json.NewEncoder(w).Encode(res)
}

func shutdownClient(w http.ResponseWriter, r *http.Request) {
	log.Printf("Sidecar manager received close request: %v %v", r.Method, r.RequestURI)

	proxyMutex.Lock()
	defer proxyMutex.Unlock()
	params := mux.Vars(r)
	clientId := params["clientId"]
	if proxyInstance, ok := proxyInstances[clientId]; ok {
		err := proxyInstance.Close()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]any{"message": "error", "statusCode": http.StatusOK})
		} else {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{"message": "success", "statusCode": http.StatusOK})
		}
		return
	}

	w.WriteHeader(http.StatusNotFound)
	json.NewEncoder(w).Encode(map[string]any{"message": "client not found", "statusCode": http.StatusNotFound})
}

func panicHandler(handler http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic recovered by proxy: %v", err)
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(ErrorResponse{
					Exception: fmt.Sprintf("Unhandled panic: %v", err),
					Stack:     string(debug.Stack()),
				})
			}
		}()
		handler(w, r)
	})
}

type ErrorResponse struct {
	AsyncError string `json:"asyncError,omitempty"`
	Exception  string `json:"exception,omitempty"`
	Stack      string `json:"stack"`
}
