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
	"syscall"

	devcycle "github.com/devcyclehq/go-server-sdk/v2"
	"github.com/gorilla/mux"
)

type DataStore = struct {
	clients        map[string]*devcycle.DVCClient
	commandResults map[string]map[string]any
}

var datastore = DataStore{
	make(map[string]*devcycle.DVCClient),
	map[string]map[string]any{
		"variable":     make(map[string]any),
		"allVariables": make(map[string]any),
		"allFeatures":  make(map[string]any),
		"track":        make(map[string]any),
	},
}

func specHandler(w http.ResponseWriter, r *http.Request) {
	res := struct {
		Name         string   `json:"name"`
		Version      string   `json:"version"`
		Capabilities []string `json:"capabilities"`
	}{
		"Go",
		"", // TODO add branch name or SDK version here
		[]string{"EdgeDB", "LocalBucketing", "CloudBucketing"},
	}
	fmt.Println("/spec called")
	_ = json.NewEncoder(w).Encode(res)
}

func main() {
	log.Print("Starting Go proxy server at port 3000")
	log.Printf("Native bucketing: %v", devcycle.NATIVE_SDK)

	r := mux.NewRouter()

	r.HandleFunc("/helloworld", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("/helloworld called")
		fmt.Fprintf(w, "Hello!")
	})

	r.HandleFunc("/spec", specHandler).Methods("GET")
	r.Handle("/client", panicHandler(clientHandler)).Methods("POST")
	r.Handle("/command/{location}/{id}", panicHandler(locationCommandHandler)).Methods("POST")
	r.Handle("/client/{id}", panicHandler(clientCommandHandler)).Methods("POST")

	http.Handle("/", r)

	server := &http.Server{Addr: ":3000", Handler: nil}

	sigHandler := make(chan os.Signal, 1)
	signal.Notify(sigHandler, os.Interrupt, syscall.SIGTERM, syscall.SIGHUP)
	go func() {
		sig := <-sigHandler
		log.Printf("Received %s signal, shutting down server", sig)
		if err := server.Shutdown(context.Background()); err != nil {
			log.Fatal(err)
		}
	}()

	if err := server.ListenAndServe(); err != nil {
		if err == http.ErrServerClosed {
			return
		}
		log.Fatal(err)
	}
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
