package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
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
	json.NewEncoder(w).Encode(res)
}

func main() {
	log.Print("Starting Go proxy server at port 3000")

	r := mux.NewRouter()

	r.HandleFunc("/helloworld", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("/helloworld called")
		fmt.Fprintf(w, "Hello!")
	})

	r.HandleFunc("/spec", specHandler).Methods("GET")
	r.HandleFunc("/client", clientHandler).Methods("POST")
	r.HandleFunc("/command/{location}/{id}", locationCommandHandler).Methods("POST")
	r.HandleFunc("/client/{id}", clientCommandHandler).Methods("POST")

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
