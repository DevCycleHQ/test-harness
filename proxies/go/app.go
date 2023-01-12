package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	devcycle "github.com/devcyclehq/go-server-sdk"
	"github.com/gorilla/mux"
)

type DataStore = struct {
	clients            map[string]devcycle.DVCClient
	clientAuthContexts map[string]context.Context
	commandResults     map[string]map[string]any
}

var datastore = DataStore{
	make(map[string]devcycle.DVCClient),
	make(map[string]context.Context),
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
	fmt.Printf("Starting Go proxy server at port 3000\n")

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

	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatal(err)
	}
}
